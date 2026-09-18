/**
 * Prompt G-1: LLM-summarize required requirement-info fields per scenario.
 *
 *   npx tsx internal-review-copilot/scripts/extract-scene-requirement-fields.ts
 *   npx tsx internal-review-copilot/scripts/extract-scene-requirement-fields.ts --skip-llm
 *
 * Writes `_runs/20260914_scene_requirement_fields/` (does not modify scenario cards).
 * To write fields onto cards, use apply-requirement-fields.ts.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { callChat, extractFirstJsonObject, resolveLlmConfig } from "../lib/llm-client.ts";
import type { ScenarioCard } from "../lib/scenario-cards.ts";

const DATE_FROM = "2026-04-21";
const DATE_TO = "2026-09-03";
const MAX_SAMPLES = 20;
const MIN_SAMPLES_FOR_LLM = 3;
const MIN_SAMPLES_FOR_SUGGEST = 5;
const GENERIC_FIELD_RE = /^(上架|关闭异常|计费|费用|仓库操作|异常处理|处理方式)$/;

const SYSTEM_PROMPT = `你是增值审核需求分析专家。下面是同一个场景的多条客户需求描述。
请分析这些需求描述的共性，总结出这个场景**必须包含的关键信息要素**。

输出 JSON：
{
  "sceneKey": "...",
  "sceneName": "...",
  "requiredInfoFields": [
    {
      "field": "处理范围",
      "description": "需要知道处理多少件/箱/包裹，或者是整单处理",
      "frequency": "90%的历史单都提到了",
      "examples": ["264箱", "整单", "3个异常单涉及的14个包裹"],
      "required": true
    }
  ],
  "optionalInfoFields": [
    {
      "field": "标签贴法",
      "description": "是否随机贴（单SKU时）还是按对应关系贴",
      "frequency": "40%",
      "examples": ["随机贴即可", "按对应关系"],
      "required": false
    }
  ]
}

规则：
- 必填：大约 ≥70% 的历史单都提到；可选：大约 30%–70%。
- 不要列「上架」「关闭异常」「计费」这类几乎所有场景都有的通用信息。
- 只列这个场景独有的或特别重要的信息要素。
- field 用短中文语义名，不要用正则。
- examples 必须从下面的历史需求原文里摘，不要编造。
- frequency 写成百分比或「约 X% 的历史单提到了」，要能对应你看到的样本比例。`;

interface InfoField {
  field: string;
  description: string;
  frequency: string;
  examples: string[];
  required: boolean;
}

interface SceneLlmResult {
  sceneKey: string;
  sceneName: string;
  requiredInfoFields: InfoField[];
  optionalInfoFields: InfoField[];
}

interface SampleRow {
  orderNo: string;
  requirementDescription: string;
  requirementBackground: string;
  textLen: number;
}

interface SceneWork {
  sceneKey: string;
  sceneName: string;
  omsSceneCode: string;
  fileName: string;
  category: string;
  existingHints: string[];
  sopHint: string;
  approvedOrderCount: number;
  samples: SampleRow[];
  skipReason: string;
  llm?: SceneLlmResult;
  llmError?: string;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseCsvFixed(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.length));
}

function csvObjects(path: string): Record<string, string>[] {
  const rows = parseCsvFixed(readFileSync(path, "utf8"));
  const header = rows[0] || [];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";
    return obj;
  });
}

function mdCell(value: string): string {
  return String(value || "")
    .replace(/\|/g, "/")
    .replace(/\n/g, " ")
    .trim();
}

function clip(text: string, max = 420): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function normalizeName(s: string): string {
  return String(s || "")
    .replace(/\\/g, "")
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function isRealOmsCode(code: string): boolean {
  const c = code.trim();
  if (!c) return false;
  if (/pending/i.test(c)) return false;
  if (/^[A-Z_]+$/.test(c) && !/^\d/.test(c)) {
    // aliases like INBOUND_DESTORY_BF_SHELVE / INSTOCK_SPLIT_SKU: keep if atoms match
    return true;
  }
  return true;
}

function extractSopSnippet(kb: string, card: ScenarioCard): string {
  const hints = (card.sopTemplateHints || []).filter(Boolean).join("；");
  const sceneNorm = normalizeName(card.sceneName).replace(/^【入库】|^【库内】|^【出库】/, "");
  const headings = [...kb.matchAll(/^#{2,3}\s+(.+)$/gm)];
  let best = "";
  for (let i = 0; i < headings.length; i++) {
    const title = normalizeName(headings[i][1] || "").replace(/（\d+条）$/, "");
    if (!sceneNorm || sceneNorm.length < 4) continue;
    if (!title.includes(sceneNorm) && !sceneNorm.includes(title.replace(/^###?\d+\.?/, ""))) continue;
    const start = headings[i].index || 0;
    const end = i + 1 < headings.length ? headings[i + 1].index || kb.length : kb.length;
    const block = kb.slice(start, end);
    const tmpl = block.match(/标准SOP模板[\s\S]{0,80}```[\s\S]*?```/);
    best = (tmpl ? tmpl[0] : block).replace(/```/g, "").replace(/\s+/g, " ").trim();
    if (best.length > 80) break;
  }
  const fromKb = clip(best, 1400);
  if (fromKb && hints) return `${fromKb}\n（场景卡提示：${hints}）`;
  return fromKb || hints || "（知识库未找到对应标准步骤）";
}

function cleanFields(list: unknown, required: boolean): InfoField[] {
  if (!Array.isArray(list)) return [];
  const out: InfoField[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    const field = String(rec.field || "").trim();
    if (!field || GENERIC_FIELD_RE.test(field)) continue;
    const examples = Array.isArray(rec.examples)
      ? rec.examples.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
      : [];
    out.push({
      field,
      description: String(rec.description || "").trim(),
      frequency: String(rec.frequency || "").trim(),
      examples,
      required,
    });
  }
  return out;
}

function frequencyPct(freq: string): number | null {
  const m = String(freq || "").match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function reclassifyByFrequency(llm: SceneLlmResult): SceneLlmResult {
  const seen = new Set<string>();
  const required: InfoField[] = [];
  const optional: InfoField[] = [];
  for (const field of [...llm.requiredInfoFields, ...llm.optionalInfoFields]) {
    const key = field.field;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const pct = frequencyPct(field.frequency);
    const req = pct == null ? field.required : pct >= 70;
    const next = { ...field, required: req };
    (req ? required : optional).push(next);
  }
  return { ...llm, requiredInfoFields: required, optionalInfoFields: optional };
}

async function analyzeScene(work: SceneWork): Promise<SceneLlmResult> {
  const config = resolveLlmConfig();
  const lines = work.samples.map((row, i) => {
    const rd = clip(row.requirementDescription, 380);
    const bg = clip(row.requirementBackground, 220);
    const extra = bg && bg !== rd ? `\n   背景：${bg}` : "";
    return `${i + 1}. ${row.orderNo}：${rd || "（需求描述为空）"}${extra}`;
  });
  const user = [
    `场景：${work.sceneName}`,
    `sceneKey：${work.sceneKey}`,
    `SOP 标准步骤（参考）：${clip(work.sopHint, 1400)}`,
    "",
    `以下是该场景的 ${work.samples.length} 条历史需求描述（已审核通过，优先选描述较长的）：`,
    "",
    ...lines,
    "",
    "请总结哪些信息是这个场景必须有的（≥70% 的历史单都提到了），哪些是可选的（30%-70%）。",
    "不要列「上架」这种几乎所有场景都有的通用信息。只列这个场景独有的或特别重要的信息要素。",
  ].join("\n");
  const raw = await callChat(
    config,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    { jsonMode: true, maxTokens: 2200, temperature: 0.2 },
  );
  const jsonText = extractFirstJsonObject(raw) || raw;
  const parsed = JSON.parse(jsonText) as SceneLlmResult;
  return reclassifyByFrequency({
    sceneKey: work.sceneKey,
    sceneName: work.sceneName,
    requiredInfoFields: cleanFields(parsed.requiredInfoFields, true),
    optionalInfoFields: cleanFields(parsed.optionalInfoFields, false),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function mainSyncPrepare(): { outDir: string; works: SceneWork[]; skipLlm: boolean } {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const cacheDir = resolve(projectRoot, arg("oms-cache") || "_runs/20260909_inbound_scene_probe/_oms_cache");
  const cardsDir = resolve(projectRoot, arg("cards") || "internal-review-copilot/knowledge/scenario-cards");
  const kbPath = resolve(
    projectRoot,
    arg("kb") || "workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md",
  );
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260914_scene_requirement_fields");
  const skipLlm = hasFlag("skip-llm");

  const atomsPath = join(cacheDir, "atoms.csv");
  const attrsPath = join(cacheDir, "attrs_submit.csv");
  const ordersPath = join(cacheDir, "orders.csv");
  if (!existsSync(atomsPath) || !existsSync(attrsPath) || !existsSync(ordersPath)) {
    throw new Error(`OMS 缓存不完整: ${cacheDir}`);
  }

  const kb = existsSync(kbPath) ? readFileSync(kbPath, "utf8") : "";
  const cards = readdirSync(cardsDir)
    .filter((name) => name.endsWith(".json"))
    .map((fileName) => {
      const raw = JSON.parse(readFileSync(join(cardsDir, fileName), "utf8")) as ScenarioCard;
      return { ...raw, fileName };
    });

  const approved = new Set(
    csvObjects(ordersPath)
      .filter((row) => String(row.is_audit_through || "").toUpperCase() === "Y")
      .map((row) => row.order_no),
  );

  const atomsByCode = new Map<string, Array<{ atomId: string; orderNo: string; sceneName: string }>>();
  for (const row of csvObjects(atomsPath)) {
    const code = (row.scene_overview_code || "").trim();
    if (!code) continue;
    const list = atomsByCode.get(code) || [];
    list.push({
      atomId: row.atom_id,
      orderNo: row.order_no,
      sceneName: row.scene_overview_name || "",
    });
    atomsByCode.set(code, list);
  }

  const textByAtom = new Map<string, { rd: string; beor: string; orderNo: string }>();
  for (const row of csvObjects(attrsPath)) {
    if ((row.input_node || "SUBMIT") !== "SUBMIT") continue;
    const key = row.attribute_key;
    if (key !== "VAS_ATTR_REL_RD" && key !== "BEOR") continue;
    const atomId = row.va_atom_id;
    const prev = textByAtom.get(atomId) || { rd: "", beor: "", orderNo: row.order_no };
    const val = (row.attribute_value || "").trim();
    if (key === "VAS_ATTR_REL_RD" && val) prev.rd = val;
    if (key === "BEOR" && val) prev.beor = val;
    prev.orderNo = row.order_no;
    textByAtom.set(atomId, prev);
  }

  const works: SceneWork[] = [];
  for (const card of cards) {
    const code = (card.omsSceneCode || "").trim();
    const existingHints = card.requiredRequirementHints || [];
    const sopHint = extractSopSnippet(kb, card);
    if (!code || !isRealOmsCode(code)) {
      works.push({
        sceneKey: card.sceneKey,
        sceneName: card.sceneName,
        omsSceneCode: code,
        fileName: card.fileName,
        category: card.category || "",
        existingHints,
        sopHint,
        approvedOrderCount: 0,
        samples: [],
        skipReason: "无 OMS 码，待补充",
      });
      continue;
    }
    const sceneAtoms = (atomsByCode.get(code) || []).filter((a) => approved.has(a.orderNo));
    const byOrder = new Map<string, SampleRow>();
    for (const atom of sceneAtoms) {
      const texts = textByAtom.get(atom.atomId);
      const rd = texts?.rd || "";
      const beor = texts?.beor || "";
      if (!rd && !beor) continue;
      const prev = byOrder.get(atom.orderNo);
      const next: SampleRow = {
        orderNo: atom.orderNo,
        requirementDescription: rd || prev?.requirementDescription || "",
        requirementBackground: beor || prev?.requirementBackground || "",
        textLen: 0,
      };
      next.textLen = (next.requirementDescription + next.requirementBackground).length;
      const better = !prev || next.textLen > prev.textLen;
      if (better) byOrder.set(atom.orderNo, next);
    }
    const ranked = [...byOrder.values()].sort((a, b) => b.textLen - a.textLen);
    const samples = ranked.slice(0, MAX_SAMPLES);
    let skipReason = "";
    if (sceneAtoms.length === 0) skipReason = "缓存中无已审通过单，待补充";
    else if (samples.length < MIN_SAMPLES_FOR_LLM) skipReason = `已审需求样本不足（${samples.length} < ${MIN_SAMPLES_FOR_LLM}），待补充`;
    works.push({
      sceneKey: card.sceneKey,
      sceneName: card.sceneName,
      omsSceneCode: code,
      fileName: card.fileName,
      category: card.category || "",
      existingHints,
      sopHint,
      approvedOrderCount: new Set(sceneAtoms.map((a) => a.orderNo)).size,
      samples,
      skipReason,
    });
  }

  works.sort((a, b) => a.sceneName.localeCompare(b.sceneName, "zh"));
  mkdirSync(join(outDir, "per-scene"), { recursive: true });
  mkdirSync(join(outDir, "prompts"), { recursive: true });
  return { outDir, works, skipLlm };
}

function loadWorksFromOut(outDir: string, base: SceneWork[]): SceneWork[] {
  return base.map((work) => {
    const path = join(outDir, "per-scene", `${work.sceneKey}.json`);
    if (!existsSync(path)) return work;
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      skipReason?: string;
      llmError?: string;
      requiredInfoFields?: InfoField[];
      optionalInfoFields?: InfoField[];
    };
    const llm = reclassifyByFrequency({
      sceneKey: work.sceneKey,
      sceneName: work.sceneName,
      requiredInfoFields: cleanFields(raw.requiredInfoFields, true),
      optionalInfoFields: cleanFields(raw.optionalInfoFields, false),
    });
    const hasFields = llm.requiredInfoFields.length + llm.optionalInfoFields.length > 0;
    return {
      ...work,
      skipReason: raw.skipReason || work.skipReason,
      llmError: raw.llmError || "",
      llm: hasFields ? llm : undefined,
    };
  });
}

function writeReports(outDir: string, works: SceneWork[], skipLlm: boolean): void {
  for (const w of works) {
    if (w.llm) w.llm = reclassifyByFrequency(w.llm);
  }
  const analyzed = works.filter((w) => w.llm && !w.skipReason);
  const pending = works.filter((w) => w.skipReason);
  const failed = works.filter((w) => w.llmError);

  const summaryLines = [
    "# 各场景需求关键信息统计",
    "",
    "## 统计口径",
    "",
    `- 数据窗口：${DATE_FROM} ~ ${DATE_TO}`,
    "- 只取已审核通过的单（`orders.is_audit_through = Y`）",
    "- 来源：`_runs/20260909_inbound_scene_probe/_oms_cache/` 的 `atoms.csv` + `attrs_submit.csv` + `orders.csv`",
    `- 每场景分析最多 ${MAX_SAMPLES} 条（优先选需求描述+背景最长的）`,
    "- 必填判断：≥ 70% 的历史样本提到了（由 LLM 按语义归纳，再用频率数字回写：<70% 降为可选）",
    "- 通用信息（上架 / 关闭异常 / 计费）不列入",
    "- 无 OMS 码或样本不足的场景标注「待补充」，不强行分析",
    skipLlm ? "- **本次为 --skip-llm 抽样预览，尚未跑 LLM**" : `- LLM 分析成功 ${analyzed.length} 个场景，失败 ${failed.length} 个，待补充 ${pending.length} 个`,
    "",
    "## 汇总表",
    "",
    "| 场景 | OMS码 | 已审单数 | 分析样本 | 必填信息 | 可选信息 | 备注 |",
    "|------|-------|---------|---------|---------|---------|------|",
  ];
  for (const w of works) {
    const req = (w.llm?.requiredInfoFields || []).map((f) => f.field).join("、") || "—";
    const opt = (w.llm?.optionalInfoFields || []).map((f) => f.field).join("、") || "—";
    summaryLines.push(
      `| ${mdCell(w.sceneName)} | ${mdCell(w.omsSceneCode || "—")} | ${w.approvedOrderCount} | ${w.samples.length} | ${mdCell(req)} | ${mdCell(opt)} | ${mdCell(w.skipReason || w.llmError || "")} |`,
    );
  }

  writeFileSync(join(outDir, "requirement-fields-all.md"), `${summaryLines.join("\n")}\n`, "utf8");

  const suggest: string[] = [
    "# 场景卡更新建议（需求完整性字段）",
    "",
    "以下场景卡建议新增 requiredInfoFields。",
    "未标注的场景没有足够数据，暂不更新。",
    "",
    "**本文件只是建议，未自动修改场景卡。**",
    "",
    "## 建议更新的场景卡",
    "",
  ];
  const toSuggest = analyzed.filter(
    (w) => w.samples.length >= MIN_SAMPLES_FOR_SUGGEST && (w.llm?.requiredInfoFields.length || 0) > 0,
  );
  if (!toSuggest.length) {
    suggest.push(skipLlm ? "（尚未跑 LLM）\n" : "（没有达到建议门槛的场景）\n");
  }
  for (const w of toSuggest) {
    suggest.push(`### ${w.sceneKey}`);
    suggest.push("");
    suggest.push(`场景：${w.sceneName}  \nOMS 码：${w.omsSceneCode}  \n已审单 ${w.approvedOrderCount}，分析样本 ${w.samples.length}`);
    suggest.push("");
    suggest.push("当前 requiredRequirementHints:");
    if (w.existingHints.length) {
      for (const h of w.existingHints) suggest.push(`  - ${JSON.stringify(h)}`);
    } else {
      suggest.push("  - （无）");
    }
    suggest.push("");
    suggest.push("建议新增 requiredInfoFields:");
    for (const f of w.llm?.requiredInfoFields || []) {
      suggest.push(`  - ${f.field} — ${f.frequency || "必填"}。${f.description}`);
      if (f.examples.length) suggest.push(`    例：${f.examples.map((e) => `「${e}」`).join("、")}`);
    }
    const opts = w.llm?.optionalInfoFields || [];
    if (opts.length) {
      suggest.push("");
      suggest.push("可选信息（不必写入必填）：");
      for (const f of opts) suggest.push(`  - ${f.field} — ${f.frequency || "可选"}。${f.description}`);
    }
    suggest.push("");
  }
  if (pending.length) {
    suggest.push("## 待补充（本次不更新场景卡）");
    suggest.push("");
    for (const w of pending) {
      suggest.push(`- ${w.sceneKey}（${w.sceneName}）：${w.skipReason}`);
    }
    suggest.push("");
  }
  writeFileSync(join(outDir, "card-update-suggestions.md"), `${suggest.join("\n")}\n`, "utf8");

  for (const w of works) {
    const payload = {
      generatedAt: new Date().toISOString(),
      dateFrom: DATE_FROM,
      dateTo: DATE_TO,
      sceneKey: w.sceneKey,
      sceneName: w.sceneName,
      omsSceneCode: w.omsSceneCode,
      fileName: w.fileName,
      category: w.category,
      approvedOrderCount: w.approvedOrderCount,
      sampleCount: w.samples.length,
      skipReason: w.skipReason || "",
      llmError: w.llmError || "",
      existingHints: w.existingHints,
      requiredInfoFields: w.llm?.requiredInfoFields || [],
      optionalInfoFields: w.llm?.optionalInfoFields || [],
      samples: w.samples.map((s) => ({
        orderNo: s.orderNo,
        requirementDescription: s.requirementDescription,
        requirementBackground: s.requirementBackground,
      })),
    };
    writeFileSync(join(outDir, "per-scene", `${w.sceneKey}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  const index = {
    generatedAt: new Date().toISOString(),
    dateFrom: DATE_FROM,
    dateTo: DATE_TO,
    skipLlm,
    analyzed: analyzed.length,
    pending: pending.length,
    failed: failed.length,
    scenes: works.map((w) => ({
      sceneKey: w.sceneKey,
      omsSceneCode: w.omsSceneCode,
      approvedOrderCount: w.approvedOrderCount,
      sampleCount: w.samples.length,
      skipReason: w.skipReason,
      llmError: w.llmError || "",
      required: (w.llm?.requiredInfoFields || []).map((f) => f.field),
    })),
  };
  writeFileSync(join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const { outDir, works: prepared, skipLlm } = mainSyncPrepare();
  const reclassifyOnly = hasFlag("reclassify");
  const works = reclassifyOnly ? loadWorksFromOut(outDir, prepared) : prepared;
  const todo = works.filter((w) => !w.skipReason);
  console.log(`scenes=${works.length} llmCandidates=${todo.length} skip=${works.length - todo.length} out=${outDir}`);
  if (!skipLlm && !reclassifyOnly) {
    let i = 0;
    for (const w of todo) {
      i += 1;
      const maxTry = 3;
      for (let attempt = 1; attempt <= maxTry; attempt++) {
        try {
          console.log(`[${i}/${todo.length}] ${w.sceneKey} samples=${w.samples.length} try=${attempt}`);
          w.llm = await analyzeScene(w);
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          w.llmError = msg;
          console.warn(`  fail ${w.sceneKey}: ${msg.slice(0, 180)}`);
          if (attempt < maxTry) await sleep(1500 * attempt);
        }
      }
      writeReports(outDir, works, false);
      await sleep(400);
    }
  }
  writeReports(outDir, works, skipLlm && !reclassifyOnly);
  const ok = works.filter((w) => w.llm && w.llm.requiredInfoFields.length > 0).length;
  console.log(`done analyzedWithRequired=${ok} out=${outDir}`);
  if (!skipLlm && !reclassifyOnly && ok < 20) {
    console.warn(`验收：至少 20 个场景有 requiredInfoFields，当前 ${ok}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
