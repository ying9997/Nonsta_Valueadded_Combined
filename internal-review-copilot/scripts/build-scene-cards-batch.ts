/**
 * Batch-generate scenario cards from the SOP knowledge base (§2.1–§2.33 inbound,
 * §3.1–§3.43 instock). Existing 6 cards are never overwritten.
 *
 * Usage:
 *   npx tsx internal-review-copilot/scripts/build-scene-cards-batch.ts \
 *     --sop workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md \
 *     --oms-codes _runs/20260911_oms_scene_code_map/scene_overview_code_map.json \
 *     --existing internal-review-copilot/knowledge/scenario-cards/ \
 *     --out _runs/20260911_batch_scene_cards \
 *     [--install] [--concurrency 4] [--limit N] [--remap-oms]
 *
 * --remap-oms：不跑 LLM，只按同类别（入库/库内/出库）重配 omsSceneCode 并回写已有生成卡。
 * 原 6 张人工卡永不改。
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import {
  callChat,
  extractFirstJsonObject,
  resolveLlmConfig,
  sanitizeJsonish,
  type LlmConfig,
} from "../lib/llm-client.ts";
import {
  clearScenarioCardsCache,
  loadScenarioCards,
  type ScenarioCard,
} from "../lib/scenario-cards.ts";

const SOP_REL = "workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md";

const GENERIC_STRONG = new Set([
  "上架",
  "处理",
  "仓库",
  "异常",
  "客户",
  "操作",
  "关闭异常",
  "增值",
  "关闭异常单",
  "仓库操作",
  "按要求处理",
  "包裹条码",
  "商品条码",
  "新入库单",
  "入库单",
  "包裹标签",
  "异常单",
  "补贴标签",
  "重新上架",
]);

/** Stable sceneKey seeds from the task spec + remaining SOP titles. */
const SCENE_KEY_SEED: Record<string, string> = {
  "2.1": "inbound_label_identify",
  "2.2": "inbound_batch_identify_relabel_barcode",
  "2.3": "inbound_aplus_direct_shelve",
  "2.4": "inbound_parcel_cross_warehouse_transfer",
  "2.5": "inbound_package_exception_relabel_shelving",
  "2.6": "inbound_self_pickup_before_shelve",
  "2.7": "inbound_photo_hold",
  "2.8": "inbound_product_quality_inspection",
  "2.9": "inbound_unclaimed_goods_relabel_shelve",
  "2.10": "inbound_forecast_sku_mismatch",
  "2.11": "inbound_reshelve_change_wi_keep_sku",
  "2.12": "inbound_third_party_merchandise_barcode",
  "2.13": "inbound_split_return_order",
  "2.14": "inbound_bulk_return_new_inbound",
  "2.15": "inbound_transparent_label",
  "2.16": "inbound_unpack_shelve",
  "2.17": "inbound_collect_sn",
  "2.18": "inbound_pre_shelve_inventory_identify",
  "2.19": "inbound_kit_then_shelve",
  "2.20": "inbound_sku_mgmt_cross_warehouse_b",
  "2.21": "inbound_remove_label",
  "2.22": "inbound_destroy_before_shelve",
  "2.23": "inbound_provide_inbound_video",
  "2.24": "inbound_replace_winit_packaging",
  "2.25": "inbound_replace_custom_packaging",
  "2.26": "inbound_winit_fault_multi_action",
  "2.27": "inbound_identify_sku_relabel_parcel",
  "2.28": "inbound_basic_3pl_winit_kit",
  "2.29": "inbound_expedited_inbound",
  "2.30": "inbound_anker_combine_carton",
  "2.31": "inbound_serialized_sn_handling",
  "2.32": "inbound_unsigned_not_received_proof",
  "2.33": "inbound_package_barcode_batch_relabel",
  "3.1": "instock_ownership_transfer",
  "3.2": "instock_audit_inventory",
  "3.3": "instock_good_defective_inspection",
  "3.4": "instock_procure_packaging_materials",
  "3.5": "instock_split_sku",
  "3.6": "instock_product_kitting",
  "3.7": "instock_photo_video",
  "3.8": "instock_measure_identify_dims_weight",
  "3.9": "instock_relabel_change_sku",
  "3.10": "instock_inventory_freeze_unfreeze",
  "3.11": "instock_cancel_self_pickup_outbound",
  "3.12": "instock_exception_rephoto",
  "3.13": "instock_nonstandard_charge",
  "3.14": "instock_exception_to_defective_shelve",
  "3.15": "instock_remove_cover_label",
  "3.16": "instock_appearance_identify_label",
  "3.17": "instock_replace_custom_packaging",
  "3.18": "instock_replace_mfg_date_label",
  "3.19": "instock_defective_to_good",
  "3.20": "instock_change_sku_defective_shelve",
  "3.21": "instock_aplus_parcel_relabel_shelve",
  "3.22": "instock_specified_position_label",
  "3.23": "instock_identify_photo_then_destroy",
  "3.24": "instock_rework_reshelve",
  "3.25": "instock_inventory_destroy",
  "3.26": "instock_collect_sn",
  "3.27": "instock_procure_packaging_bambu",
  "3.28": "instock_ownership_transfer_relabel",
  "3.29": "instock_damaged_repack_reshelve",
  "3.30": "instock_unbox_identify_change_sku",
  "3.31": "instock_winit_pack_offline_ship",
  "3.32": "instock_sn_mgmt_change_reshelve",
  "3.33": "instock_identify_then_relabel_shelve",
  "3.34": "instock_cancel_self_pickup_need_wi",
  "3.35": "instock_instructional_label_photo",
  "3.36": "instock_void_outbound_after_pack",
  "3.38": "instock_reinforce",
  "3.39": "instock_add_remove_accessories",
  "3.40": "instock_inter_warehouse_transfer",
  "3.41": "instock_inter_warehouse_transfer_anker",
  "3.42": "instock_good_to_defective_shelve",
  "3.43": "instock_carton_to_each",
};

const SKIP_SECTIONS = new Set(["2.1", "2.3", "2.5", "2.7", "2.12", "2.33"]);

/** SOP 名 ≠ OMS 名、但业务确认可对上的同类别别名。禁止跨 入库/库内/出库。 */
const OMS_ALIASES: Record<string, { code?: string; nameIncludes?: string; note: string }> = {
  "2.16": { nameIncludes: "上架前拆包装", note: "SOP拆包/拆箱上架 ≈ OMS上架前拆包装" },
  "2.17": { nameIncludes: "上架前采集条码", note: "SOP收集SN码 ≈ OMS上架前采集条码" },
  "2.21": { code: "20260302", note: "入库清除标签 → 【入库】覆盖/清除标签，不用无前缀「清除标签」" },
  "3.13": { nameIncludes: "IT改数收费", note: "SOP非标收费 ≈ OMS IT改数收费" },
  "3.23": { nameIncludes: "辨识后贴标上架+销毁", note: "SOP辨识拍照后销毁 ≈ OMS辨识后贴标上架+销毁" },
  "3.38": { nameIncludes: "商品包装加固", note: "SOP库内加固 ≈ OMS商品包装加固" },
  "3.40": { nameIncludes: "库间调拨", note: "SOP库内仓间调拨 ≈ OMS库间调拨" },
};

const SIGNAL_SYSTEM = `你是万邑通增值审核知识专家。请从以下 SOP 场景描述中提取场景卡信息。

输出 JSON：
{
  "positiveSignals": {
    "strong": ["该场景独有的、一看就知道是这个场景的关键词，3-8个"],
    "weak": ["多个场景共有但仍有倾向性的关键词，3-6个"]
  },
  "negativeSignals": {
    "hard": ["出现就绝对不是这个场景的词，3-6个"],
    "soft": ["出现时倾向不是这个场景但不绝对的词，2-4个"]
  },
  "boundaryRules": ["和相邻场景怎么区分的规则，2-4条"],
  "requiredRequirementHints": ["客户需求描述应该包含的三要素：处理对象、动作、去向"],
  "sopTemplateHints": ["SOP 应该包含的关键步骤，3-5个"]
}

注意：
- strong 信号词应该是这个场景独有的，不要放"上架""处理""仓库""异常""客户""关闭异常单"这种几乎所有场景都有的词
- 信号词必须能在 SOP 模板或场景名中找到依据，不要凭空编造
- negativeSignals 参考相邻场景，列出会导致误判的词
- boundaryRules 要写清楚"和 XX 场景的区别是 YY"`;

interface SopSection {
  sectionNumber: string;
  sceneName: string;
  category: "inbound" | "instock";
  sopTemplate: string;
  sopSteps: string[];
  caseCount: number | null;
  notes: string;
  thin: boolean;
}

interface OmsRow {
  sceneOverviewCode: string;
  sceneOverviewName: string;
  group?: string;
}

interface OmsMatch {
  code: string;
  name: string;
  kind: "exact" | "fuzzy" | "alias" | "pending_oms_code";
  alias?: string;
  note?: string;
}

interface LlmSignals {
  positiveSignals: { strong: string[]; weak: string[] };
  negativeSignals: { hard: string[]; soft: string[] };
  boundaryRules: string[];
  requiredRequirementHints: string[];
  sopTemplateHints: string[];
  llmFailed?: boolean;
}

interface BuiltCard {
  card: ScenarioCard;
  section: SopSection;
  oms: OmsMatch;
  skipped: boolean;
  skipReason?: string;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function unescapeMd(text: string): string {
  return text
    .replace(/\\([.\\+*?()[\]{}|^$])/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\\-/g, "-")
    .trim();
}

function stripCategoryPrefix(name: string): string {
  return name.replace(/^【(?:入库|库内|出库)】\s*/, "").trim();
}

function rowCategory(row: OmsRow): "inbound" | "instock" | "outbound" | "other" {
  const group = String(row.group || "");
  if (group === "F-001" || group === "A" || group === "B" || group === "inbound") return "inbound";
  if (group === "instock" || group === "outbound" || group === "other") return group;
  const name = row.sceneOverviewName || "";
  if (name.startsWith("【入库】")) return "inbound";
  if (name.startsWith("【库内】")) return "instock";
  if (name.startsWith("【出库】")) return "outbound";
  return "other";
}

function rowsForCategory(rows: OmsRow[], category: "inbound" | "instock"): OmsRow[] {
  return rows.filter((row) => rowCategory(row) === category);
}

function normalizeName(raw: string): string {
  return unescapeMd(raw)
    .replace(/[“”‘’「」『』"'′`]/g, '"')
    .replace(/（Top\s*\d+\s*[-–—]\s*\d+条）/gi, "")
    .replace(/（\d+条）/g, "")
    .replace(/--待完善.*$/g, "")
    .replace(/[（）()\[\]【】]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function parseCaseCount(title: string): number | null {
  const m = unescapeMd(title).match(/（(?:Top\s*\d+\s*[-–—]\s*)?(\d+)条）/);
  return m ? Number(m[1]) : null;
}

function extractCodeBlocks(body: string): string[] {
  const blocks: string[] = [];
  const re = /```(?:Plain Text|plain text|text)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) blocks.push(m[1].trim());
  return blocks;
}

function extractNotes(body: string): string {
  const withoutCode = body.replace(/```[\s\S]*?```/g, "\n");
  return withoutCode
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\([^)]*\)/g, "")
    .replace(/^\s*---\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1200);
}

function extractSteps(template: string): string[] {
  return template
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+[\.、]/.test(line))
    .map((line) => line.replace(/^\d+[\.、]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseSopSections(markdown: string): SopSection[] {
  const lines = markdown.split(/\r?\n/);
  const headings: Array<{ index: number; sectionNumber: string; title: string }> = [];
  const headingRe = /^###\s+(?:\*\*)?(\d+)\\\.(\d+)\s*(.*?)$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (!m) continue;
    const major = Number(m[1]);
    const minor = Number(m[2]);
    if (major === 2 && minor >= 1 && minor <= 33) {
      headings.push({ index: i, sectionNumber: `${major}.${minor}`, title: unescapeMd(m[3] || "") });
    } else if (major === 3 && minor >= 1 && minor <= 43) {
      headings.push({ index: i, sectionNumber: `${major}.${minor}`, title: unescapeMd(m[3] || "") });
    }
  }

  const sections: SopSection[] = [];
  for (let h = 0; h < headings.length; h++) {
    const cur = headings[h];
    const end = h + 1 < headings.length ? headings[h + 1].index : lines.length;
    const body = lines.slice(cur.index + 1, end).join("\n");
    const blocks = extractCodeBlocks(body);
    const sopTemplate = blocks.join("\n\n").trim();
    const notes = extractNotes(body);
    const title = cur.title.replace(/^【入\s*库】/, "【入库】");
    const major = cur.sectionNumber.split(".")[0];
    const category: "inbound" | "instock" =
      /【库内】/.test(title) || major === "3" ? "instock" : "inbound";
    const sceneName = title
      .replace(/（Top\s*\d+\s*[-–—]\s*\d+条）/gi, "")
      .replace(/（\d+条）/g, "")
      .replace(/--待完善.*$/, "")
      .trim();
    const withPrefix =
      /^【(?:入库|库内)】/.test(sceneName)
        ? sceneName
        : category === "inbound"
          ? `【入库】${sceneName}`
          : `【库内】${sceneName}`;
    const thin = sopTemplate.length < 40;
    sections.push({
      sectionNumber: cur.sectionNumber,
      sceneName: withPrefix,
      category,
      sopTemplate,
      sopSteps: extractSteps(sopTemplate),
      caseCount: parseCaseCount(cur.title),
      notes,
      thin,
    });
  }
  return sections;
}

function bigramDice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (s: string) => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.length || !B.length) return 0;
  const bCount = new Map<string, number>();
  for (const g of B) bCount.set(g, (bCount.get(g) || 0) + 1);
  let hit = 0;
  for (const g of A) {
    const n = bCount.get(g) || 0;
    if (n > 0) {
      hit += 1;
      bCount.set(g, n - 1);
    }
  }
  return (2 * hit) / (A.length + B.length);
}

function matchAlias(
  sectionNumber: string,
  category: "inbound" | "instock",
  rows: OmsRow[],
): OmsMatch | null {
  const alias = OMS_ALIASES[sectionNumber];
  if (!alias) return null;
  const pool = rowsForCategory(rows, category);
  if (alias.code) {
    const hit = rows.find((row) => row.sceneOverviewCode === alias.code);
    if (hit && rowCategory(hit) === category) {
      return { code: hit.sceneOverviewCode, name: hit.sceneOverviewName, kind: "alias", note: alias.note };
    }
  }
  if (alias.nameIncludes) {
    const hits = pool.filter((row) => row.sceneOverviewName.includes(alias.nameIncludes!));
    const exact = hits.find(
      (row) => normalizeName(stripCategoryPrefix(row.sceneOverviewName)) === normalizeName(alias.nameIncludes!),
    );
    const hit = exact || (hits.length === 1 ? hits[0] : undefined);
    if (hit) {
      return { code: hit.sceneOverviewCode, name: hit.sceneOverviewName, kind: "alias", note: alias.note };
    }
  }
  return null;
}

function matchOms(
  sceneName: string,
  rows: OmsRow[],
  category: "inbound" | "instock" = /【库内】/.test(sceneName) ? "instock" : "inbound",
  sectionNumber = "",
): OmsMatch {
  const aliased = sectionNumber ? matchAlias(sectionNumber, category, rows) : null;
  if (aliased) return aliased;

  const pool = rowsForCategory(rows, category);
  const want = normalizeName(sceneName);
  const wantCore = normalizeName(stripCategoryPrefix(sceneName));
  let best: { row: OmsRow; score: number } | null = null;
  for (const row of pool) {
    const got = normalizeName(row.sceneOverviewName);
    const gotCore = normalizeName(stripCategoryPrefix(row.sceneOverviewName));
    if (want && got && want === got) {
      return { code: row.sceneOverviewCode, name: row.sceneOverviewName, kind: "exact" };
    }
    const score = Math.max(
      bigramDice(want, got),
      bigramDice(wantCore, gotCore),
      wantCore && gotCore && (wantCore.includes(gotCore) || gotCore.includes(wantCore))
        ? 0.82
        : 0,
    );
    if (!best || score > best.score) best = { row, score };
  }
  if (best && best.score >= 0.72) {
    return {
      code: best.row.sceneOverviewCode,
      name: best.row.sceneOverviewName,
      kind: "fuzzy",
      alias: best.row.sceneOverviewName,
    };
  }
  return { code: "", name: "", kind: "pending_oms_code" };
}

function clampKey(raw: string, prefix: "inbound" | "instock"): string {
  let key = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!key.startsWith(`${prefix}_`)) key = `${prefix}_${key.replace(/^(inbound|instock)_/, "")}`;
  if (key.length > 50) key = key.slice(0, 50).replace(/_+$/, "");
  return key || `${prefix}_unnamed`;
}

function uniqueStrings(items: string[], max: number, dropGeneric = false): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = String(item || "").trim();
    if (!t) continue;
    if (dropGeneric && GENERIC_STRONG.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function asStringList(value: unknown, max: number, dropGeneric = false): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.map((v) => String(v)), max, dropGeneric);
}

function fallbackSignals(section: SopSection): LlmSignals {
  const core = stripCategoryPrefix(section.sceneName);
  const titleBits = core
    .split(/[\/、+\-—–]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 24 && !GENERIC_STRONG.has(s));
  const stepBits = section.sopSteps
    .map((s) => s.replace(/\[.*?]/g, "").slice(0, 24).trim())
    .filter((s) => s.length >= 4);
  const strong = uniqueStrings([...titleBits, ...stepBits], 8);
  while (strong.length < 3) strong.push(core.slice(0, 12) || section.sceneName.slice(0, 12));
  const opposite = section.category === "inbound" ? ["库内库存", "库内下架"] : ["入库预报", "到仓异常"];
  return {
    positiveSignals: {
      strong: strong.slice(0, 8),
      weak: uniqueStrings(["上架", ...stepBits], 6),
    },
    negativeSignals: {
      hard: uniqueStrings([...opposite, "拦截不上架", "标准流程即可"], 6),
      soft: uniqueStrings(["仅收费不作业", "不换标"], 4),
    },
    boundaryRules: [
      `本场景核心是「${core}」，不要仅凭「上架」命中。`,
      section.category === "inbound"
        ? "和库内同名动作区分：本场景发生在入库/到仓环节。"
        : "和入库同名动作区分：本场景发生在库内在库环节。",
    ],
    requiredRequirementHints: [
      `处理对象：${core}`,
      "动作：按 SOP 模板执行对应仓库动作",
      "去向：上架 / 暂存 / 关闭异常 / 出库（以 SOP 为准）",
    ],
    sopTemplateHints: (section.sopSteps.length ? section.sopSteps : ["按异常单或库存定位货物", "按客户要求处理", "完成后关闭异常或回传"]).slice(0, 5),
    llmFailed: true,
  };
}

function parseSignalPayload(raw: string, section: SopSection): LlmSignals {
  const jsonText = sanitizeJsonish(extractFirstJsonObject(raw) || raw);
  const obj = JSON.parse(jsonText) as Record<string, unknown>;
  const pos = (obj.positiveSignals || {}) as Record<string, unknown>;
  const neg = (obj.negativeSignals || {}) as Record<string, unknown>;
  const fallback = fallbackSignals(section);
  const strong = asStringList(pos.strong, 8, true);
  const hard = asStringList(neg.hard, 6, true);
  return {
    positiveSignals: {
      strong: strong.length >= 3 ? strong : fallback.positiveSignals.strong,
      weak: asStringList(pos.weak, 6).length ? asStringList(pos.weak, 6) : fallback.positiveSignals.weak,
    },
    negativeSignals: {
      hard: hard.length >= 2 ? hard : fallback.negativeSignals.hard,
      soft: asStringList(neg.soft, 4).length ? asStringList(neg.soft, 4) : fallback.negativeSignals.soft,
    },
    boundaryRules: asStringList(obj.boundaryRules, 4).length
      ? asStringList(obj.boundaryRules, 4)
      : fallback.boundaryRules,
    requiredRequirementHints: asStringList(obj.requiredRequirementHints, 5).length
      ? asStringList(obj.requiredRequirementHints, 5)
      : fallback.requiredRequirementHints,
    sopTemplateHints: asStringList(obj.sopTemplateHints, 5).length
      ? asStringList(obj.sopTemplateHints, 5)
      : fallback.sopTemplateHints,
  };
}

async function extractSignals(
  config: LlmConfig | null,
  section: SopSection,
  neighborNames: string[],
): Promise<LlmSignals> {
  if (!config) return fallbackSignals(section);
  const user = `## 场景名称
${section.sceneName}

## SOP 模板
${section.sopTemplate.slice(0, 3500) || "（无 SOP 模板）"}

## 章节备注
${section.notes.slice(0, 800) || "（无）"}

## 该场景的历史案例数
${section.caseCount ?? "未知"}

## 相邻场景（写 boundaryRules 时参考，不要把它们的独有词放进本场景 strong）
${neighborNames.slice(0, 12).join("；") || "（无）"}`;
  try {
    const raw = await callChat(
      config,
      [
        { role: "system", content: SIGNAL_SYSTEM },
        { role: "user", content: user },
      ],
      { jsonMode: true, maxTokens: 900, temperature: 0.1 },
    );
    return parseSignalPayload(raw, section);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[llm-fail] §${section.sectionNumber} ${msg.slice(0, 160)}`);
    try {
      const raw = await callChat(
        config,
        [
          { role: "system", content: SIGNAL_SYSTEM },
          { role: "user", content: `${user}\n\n上次输出无法解析，请只输出严格 JSON。` },
        ],
        { jsonMode: true, maxTokens: 900, temperature: 0 },
      );
      return parseSignalPayload(raw, section);
    } catch {
      return fallbackSignals(section);
    }
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function shouldSkip(
  section: SopSection,
  oms: OmsMatch,
  existing: ScenarioCard[],
): { skip: boolean; reason: string } {
  if (SKIP_SECTIONS.has(section.sectionNumber)) {
    return { skip: true, reason: `SOP §${section.sectionNumber} 已有人工场景卡` };
  }
  const want = normalizeName(section.sceneName);
  const wantCore = normalizeName(stripCategoryPrefix(section.sceneName));
  for (const card of existing) {
    if (oms.code && card.omsSceneCode && oms.code === card.omsSceneCode) {
      return { skip: true, reason: `omsSceneCode=${oms.code} 已存在 ${card.sceneKey}` };
    }
    const got = normalizeName(card.sceneName);
    const gotCore = normalizeName(stripCategoryPrefix(card.sceneName));
    if (want === got || (wantCore && gotCore && wantCore === gotCore)) {
      return { skip: true, reason: `sceneName 命中已有卡 ${card.sceneKey}` };
    }
  }
  return { skip: false, reason: "" };
}

function assembleCard(
  section: SopSection,
  oms: OmsMatch,
  signals: LlmSignals,
  usedKeys: Set<string>,
  presetKey = "",
): ScenarioCard {
  const prefix = section.category;
  let sceneKey = presetKey || clampKey(SCENE_KEY_SEED[section.sectionNumber] || `${prefix}_${section.sectionNumber.replace(".", "_")}`, prefix);
  if (!presetKey && usedKeys.has(sceneKey)) sceneKey = clampKey(`${sceneKey}_${section.sectionNumber.replace(".", "")}`, prefix);
  usedKeys.add(sceneKey);

  const thinNote = section.thin ? " SOP 内容不足，信号词可能不准。" : "";
  const llmNote = signals.llmFailed ? " LLM 提取失败，已用标题/步骤兜底。" : " Signals extracted by LLM, pending business validation.";
  const omsNote =
    oms.kind === "pending_oms_code"
      ? " omsSceneCode pending_oms_code."
      : oms.kind === "alias"
        ? ` omsSceneCode remapped alias ${oms.code}（${oms.name}）。${oms.note || ""}`
        : oms.kind === "fuzzy"
          ? ` OMS 模糊匹配 ${oms.code}（${oms.alias}）。`
          : ` OMS 精确匹配 ${oms.code}.`;

  return {
    sceneKey,
    sceneName: section.sceneName,
    status: "supported",
    category: section.category,
    omsSceneCode: oms.code || undefined,
    sourceRefs: [
      {
        path: SOP_REL,
        section: `§${section.sectionNumber}`,
        credibility: "authority",
        note: "批量从 SOP 知识库章节生成；附件规则待数据统计确认",
      },
    ],
    positiveSignals: signals.positiveSignals,
    negativeSignals: signals.negativeSignals,
    boundaryRules: signals.boundaryRules,
    requiredRequirementHints: signals.requiredRequirementHints,
    requiredAttachmentPolicy: {
      status: "auto_generated",
      enforcement: "advisory",
      omsWhitelistFieldKeys: [],
      requiredFieldKeys: [],
      note: "批量生成，附件规则待数据统计确认",
    },
    sopTemplateHints: signals.sopTemplateHints,
    examples: [],
    notes: `batch-generated from SOP §${section.sectionNumber}. Status=supported for immediate use.${llmNote}${omsNote}${thinNote}`,
  };
}

function demoteOverusedStrong(cards: ScenarioCard[]): void {
  const freq = new Map<string, number>();
  for (const card of cards) {
    for (const term of card.positiveSignals.strong) freq.set(term, (freq.get(term) || 0) + 1);
  }
  for (const card of cards) {
    if (!card.notes.includes("batch-generated")) continue;
    const keep: string[] = [];
    const demoted: string[] = [];
    for (const term of card.positiveSignals.strong) {
      if ((freq.get(term) || 0) > 8 || GENERIC_STRONG.has(term)) demoted.push(term);
      else keep.push(term);
    }
    if (keep.length >= 3) {
      card.positiveSignals.strong = keep;
      card.positiveSignals.weak = uniqueStrings([...card.positiveSignals.weak, ...demoted], 6);
    }
  }
}

function mdTable(rows: BuiltCard[]): string {
  const header = "| # | SOP | 场景名 | sceneKey | omsSceneCode | strong 信号数 | status |";
  const sep = "|---|-----|--------|----------|--------------|-------------|--------|";
  const body = rows.map((row, i) => {
    const code = row.oms.code || "pending_oms_code";
    return `| ${i + 1} | §${row.section.sectionNumber} | ${row.card.sceneName.replace(/\|/g, "/")} | \`${row.card.sceneKey}\` | ${code} | ${row.card.positiveSignals.strong.length} | ${row.card.status} |`;
  });
  return [header, sep, ...body].join("\n");
}

function writeReports(
  outDir: string,
  sections: SopSection[],
  skipped: BuiltCard[],
  generated: BuiltCard[],
): void {
  const inbound = generated.filter((g) => g.section.category === "inbound");
  const instock = generated.filter((g) => g.section.category === "instock");
  const matched = generated.filter((g) => g.oms.kind !== "pending_oms_code");
  const unmatched = generated.filter((g) => g.oms.kind === "pending_oms_code");
  const inboundAll = sections.filter((s) => s.category === "inbound");
  const instockAll = sections.filter((s) => s.category === "instock");

  const summary = [
    "# 批量场景卡生成报告",
    "",
    "## 统计",
    `- SOP 入库章节：${inboundAll.length}（§2.1-§2.33）`,
    `- SOP 库内章节：${instockAll.length}（§3.1-§3.43，缺节不计）`,
    `- 已有场景卡跳过：${skipped.length}`,
    `- 新生成：${generated.length}`,
    `- OMS 码匹配成功：${matched.length}`,
    `- OMS 码未匹配：${unmatched.length}`,
    `- 薄内容章节（SOP 模板过短）：${generated.filter((g) => g.section.thin).length}`,
    "",
    "## 跳过的已有场景卡",
    "",
    ...skipped.map((s) => `- §${s.section.sectionNumber} ${s.section.sceneName} — ${s.skipReason}`),
    "",
    "## 入库场景卡（新生成）",
    "",
    mdTable(inbound),
    "",
    "## 库内场景卡（新生成）",
    "",
    mdTable(instock),
    "",
    "## OMS 码未匹配的场景",
    "",
    unmatched.length
      ? unmatched.map((g) => `- §${g.section.sectionNumber} ${g.card.sceneName} (\`${g.card.sceneKey}\`)`).join("\n")
      : "（无）",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "batch-summary.md"), summary, "utf8");

  const matchMd = [
    "# OMS 码匹配报告",
    "",
    `精确匹配：${generated.filter((g) => g.oms.kind === "exact").length}`,
    `别名匹配：${generated.filter((g) => g.oms.kind === "alias").length}`,
    `模糊匹配：${generated.filter((g) => g.oms.kind === "fuzzy").length}`,
    `未匹配：${unmatched.length}`,
    "",
    "| SOP | 场景名 | 匹配类型 | omsSceneCode | OMS 名 |",
    "|-----|--------|----------|--------------|--------|",
    ...generated.map((g) => {
      const code = g.oms.code || "-";
      const name = (g.oms.name || g.oms.alias || "-").replace(/\|/g, "/");
      return `| §${g.section.sectionNumber} | ${g.card.sceneName.replace(/\|/g, "/")} | ${g.oms.kind} | ${code} | ${name} |`;
    }),
    "",
    "## 需要人工确认映射",
    "",
    unmatched.length
      ? unmatched.map((g) => `- §${g.section.sectionNumber} ${g.card.sceneName}`).join("\n")
      : "（无）",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "oms-code-match.md"), matchMd, "utf8");
}

function patchOmsNotes(notes: string, oms: OmsMatch, action: string): string {
  const next = String(notes || "")
    .replace(/\s*omsSceneCode pending_oms_code\.?/g, "")
    .replace(/\s*omsSceneCode remapped[^.]*\./g, "")
    .replace(/\s*已清除跨类别 OMS 码\.?/g, "")
    .replace(/\s*OMS 模糊匹配[^.]*\./g, "")
    .replace(/\s*OMS 精确匹配[^.]*\./g, "")
    .trim();
  if (action === "clear_cross_category") {
    return `${next} omsSceneCode pending_oms_code. 已清除跨类别 OMS 码.`.trim();
  }
  if (oms.kind === "pending_oms_code") return `${next} omsSceneCode pending_oms_code.`.trim();
  if (oms.kind === "alias") {
    return `${next} omsSceneCode remapped alias ${oms.code}（${oms.name}）。${oms.note || ""}`.trim();
  }
  if (oms.kind === "fuzzy") return `${next} OMS 模糊匹配 ${oms.code}（${oms.name}）。`.trim();
  return `${next} OMS 精确匹配 ${oms.code}.`.trim();
}

function remapExistingCards(opts: {
  sections: SopSection[];
  omsRows: OmsRow[];
  existing: ScenarioCard[];
  existingDir: string;
  outDir: string;
  install: boolean;
  omsPath: string;
}): void {
  const { sections, omsRows, existing, existingDir, outDir, install, omsPath } = opts;
  const protectedKeys = new Set(
    [...SKIP_SECTIONS].map((section) => SCENE_KEY_SEED[section]).filter(Boolean),
  );
  const sectionByKey = new Map<string, SopSection>();
  for (const section of sections) {
    const key = SCENE_KEY_SEED[section.sectionNumber];
    if (key) sectionByKey.set(key, section);
  }

  mkdirSync(join(outDir, "inbound"), { recursive: true });
  mkdirSync(join(outDir, "instock"), { recursive: true });

  const rows: Array<{
    section: string;
    sceneKey: string;
    sceneName: string;
    action: string;
    oldCode: string;
    newCode: string;
    kind: string;
    omsName: string;
    note: string;
  }> = [];

  for (const card of existing) {
    if (protectedKeys.has(card.sceneKey)) {
      rows.push({
        section: "",
        sceneKey: card.sceneKey,
        sceneName: card.sceneName,
        action: "skip_protected",
        oldCode: card.omsSceneCode || "",
        newCode: card.omsSceneCode || "",
        kind: "",
        omsName: "",
        note: "原人工卡不改",
      });
      continue;
    }
    const section = sectionByKey.get(card.sceneKey);
    if (!section) {
      rows.push({
        section: "",
        sceneKey: card.sceneKey,
        sceneName: card.sceneName,
        action: "skip_no_sop",
        oldCode: card.omsSceneCode || "",
        newCode: card.omsSceneCode || "",
        kind: "",
        omsName: "",
        note: "SOP 无对应章节",
      });
      continue;
    }

    const oms = matchOms(section.sceneName, omsRows, section.category, section.sectionNumber);
    const oldCode = card.omsSceneCode || "";
    const oldRow = omsRows.find((row) => row.sceneOverviewCode === oldCode);
    const oldCat = oldRow ? rowCategory(oldRow) : "";
    const oldWrongCat = Boolean(oldCode && oldCat && oldCat !== section.category);

    let action = "keep";
    let nextCode = oldCode;
    let nextOms = oms;
    if (oms.code) {
      if (!oldCode) {
        action = "fill";
        nextCode = oms.code;
      } else if (oldCode !== oms.code && (oldWrongCat || oms.kind === "alias" || oms.kind === "exact")) {
        action = "replace";
        nextCode = oms.code;
      }
    } else if (oldWrongCat) {
      action = "clear_cross_category";
      nextCode = "";
      nextOms = { code: "", name: "", kind: "pending_oms_code" };
    }

    if (action === "keep") {
      rows.push({
        section: section.sectionNumber,
        sceneKey: card.sceneKey,
        sceneName: card.sceneName,
        action,
        oldCode,
        newCode: oldCode,
        kind: oms.kind,
        omsName: oldRow?.sceneOverviewName || oms.name,
        note: oldWrongCat ? "应改但未找到同类别码，按 keep 观察" : "",
      });
      continue;
    }

    const updated: ScenarioCard = { ...card };
    if (nextCode) updated.omsSceneCode = nextCode;
    else delete updated.omsSceneCode;
    updated.notes = patchOmsNotes(card.notes || "", nextOms, action);

    const sub = section.category === "inbound" ? "inbound" : "instock";
    const destRun = join(outDir, sub, `${card.sceneKey}.json`);
    writeFileSync(destRun, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    if (install) {
      writeFileSync(join(existingDir, `${card.sceneKey}.json`), `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    }

    rows.push({
      section: section.sectionNumber,
      sceneKey: card.sceneKey,
      sceneName: card.sceneName,
      action,
      oldCode,
      newCode: nextCode,
      kind: nextOms.kind,
      omsName: nextOms.name,
      note: nextOms.note || "",
    });
  }

  const changed = rows.filter((row) => !row.action.startsWith("skip") && row.action !== "keep");
  const pending = rows.filter((row) => !row.action.startsWith("skip") && !row.newCode);

  const md = [
    "# OMS 码同类别重匹配",
    "",
    `- 码表：\`${omsPath}\``,
    `- 码表条数：${omsRows.length}`,
    `- 变更：${changed.length}`,
    `- 仍无码：${pending.length}`,
    `- install：${install}`,
    "",
    "## 变更明细",
    "",
    "| SOP | sceneKey | 动作 | 旧码 | 新码 | 类型 | OMS 名 | 说明 |",
    "|-----|----------|------|------|------|------|--------|------|",
    ...changed.map(
      (row) =>
        `| §${row.section} | \`${row.sceneKey}\` | ${row.action} | ${row.oldCode || "-"} | ${row.newCode || "-"} | ${row.kind} | ${(row.omsName || "-").replace(/\|/g, "/")} | ${row.note.replace(/\|/g, "/")} |`,
    ),
    "",
    "## 仍无 OMS 码（等业务确认，不臆造）",
    "",
    pending.length
      ? pending.map((row) => `- ${row.sceneName} (\`${row.sceneKey}\`)`).join("\n")
      : "（无）",
    "",
    "## 规则",
    "",
    "- 只在同一订单类型内匹配：入库卡不对库内/出库码，库内卡不对入库/出库码。",
    "- 别名仅用于 SOP 名与 OMS 名明显同义的条目。",
    "- 「无主货异常补贴标签上架」≠「无主货找回暂存」，不自动合并。",
    "- 「库内仓间调拨-Anker」不并到普通库间调拨。",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "remap-report.md"), md, "utf8");
  writeFileSync(join(outDir, "remap-rows.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  if (install) clearScenarioCardsCache();
  console.log(
    `remap changed=${changed.length} pending=${pending.length} protected=${rows.filter((r) => r.action === "skip_protected").length} out=${outDir} install=${install}`,
  );
}

async function main(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");

  const sopPath = resolve(projectRoot, arg("sop") || SOP_REL);
  const newerOms = resolve(projectRoot, "_runs/20260911_oms_scene_code_map/scene_overview_code_map.json");
  const omsPath = resolve(
    projectRoot,
    arg("oms-codes") ||
      (existsSync(newerOms)
        ? "_runs/20260911_oms_scene_code_map/scene_overview_code_map.json"
        : "_runs/20260902_oms_scene_code_map/scene_overview_code_map.json"),
  );
  const existingDir = resolve(
    projectRoot,
    arg("existing") || "internal-review-copilot/knowledge/scenario-cards/",
  );
  const remap = hasFlag("remap-oms");
  const outDir = resolve(
    projectRoot,
    arg("out") || (remap ? "_runs/20260911_oms_remap" : "_runs/20260911_batch_scene_cards"),
  );
  const install = hasFlag("install");
  const concurrency = Math.max(1, Number(arg("concurrency", "3")) || 3);
  const limit = Number(arg("limit", "0")) || 0;

  if (!existsSync(sopPath)) throw new Error(`SOP 不存在: ${sopPath}`);
  if (!existsSync(omsPath)) throw new Error(`OMS 码表不存在: ${omsPath}`);

  const sections = parseSopSections(readFileSync(sopPath, "utf8"));
  const omsJson = JSON.parse(readFileSync(omsPath, "utf8")) as { rows?: OmsRow[] };
  const omsRows = Array.isArray(omsJson.rows) ? omsJson.rows : [];
  const existing = loadScenarioCards(existingDir);

  console.log(
    `parsed SOP sections=${sections.length} existingCards=${existing.length} omsRows=${omsRows.length} omsPath=${omsPath}`,
  );

  if (remap) {
    remapExistingCards({ sections, omsRows, existing, existingDir, outDir, install, omsPath });
    return;
  }

  mkdirSync(join(outDir, "inbound"), { recursive: true });
  mkdirSync(join(outDir, "instock"), { recursive: true });

  const skipped: BuiltCard[] = [];
  const toBuild: Array<{ section: SopSection; oms: OmsMatch }> = [];
  for (const section of sections) {
    const oms = matchOms(section.sceneName, omsRows, section.category, section.sectionNumber);
    const skip = shouldSkip(section, oms, existing);
    if (skip.skip) {
      skipped.push({
        card: existing.find((c) => c.omsSceneCode === oms.code || normalizeName(c.sceneName) === normalizeName(section.sceneName)) || existing[0],
        section,
        oms,
        skipped: true,
        skipReason: skip.reason,
      });
      continue;
    }
    toBuild.push({ section, oms });
  }

  const work = limit > 0 ? toBuild.slice(0, limit) : toBuild;
  let llmConfig: LlmConfig | null = null;
  try {
    llmConfig = resolveLlmConfig();
    console.log(`LLM model=${llmConfig.model} concurrency=${concurrency} toBuild=${work.length}`);
  } catch (err) {
    console.warn(`LLM 不可用，改用标题/步骤兜底: ${err instanceof Error ? err.message : String(err)}`);
  }

  const usedKeys = new Set(existing.map((c) => c.sceneKey));
  const reservedKeys = work.map((item) => {
    const prefix = item.section.category;
    let sceneKey = clampKey(
      SCENE_KEY_SEED[item.section.sectionNumber] || `${prefix}_${item.section.sectionNumber.replace(".", "_")}`,
      prefix,
    );
    if (usedKeys.has(sceneKey)) sceneKey = clampKey(`${sceneKey}_${item.section.sectionNumber.replace(".", "")}`, prefix);
    usedKeys.add(sceneKey);
    return sceneKey;
  });
  const neighborNames = sections.map((s) => s.sceneName);
  const generated: BuiltCard[] = [];

  const results = await mapPool(work, concurrency, async (item, i) => {
    process.stdout.write(`[${i + 1}/${work.length}] §${item.section.sectionNumber} ${item.section.sceneName}\n`);
    const neighbors = neighborNames.filter((n) => n !== item.section.sceneName);
    const signals = await extractSignals(llmConfig, item.section, neighbors);
    const card = assembleCard(item.section, item.oms, signals, new Set(), reservedKeys[i]);
    return { card, section: item.section, oms: item.oms, skipped: false } satisfies BuiltCard;
  });
  generated.push(...results);
  demoteOverusedStrong(generated.map((g) => g.card));

  for (const item of generated) {
    const sub = item.section.category === "inbound" ? "inbound" : "instock";
    const file = join(outDir, sub, `${item.card.sceneKey}.json`);
    writeFileSync(file, `${JSON.stringify(item.card, null, 2)}\n`, "utf8");
  }

  writeReports(outDir, sections, skipped, generated);

  if (install) {
    let copied = 0;
    for (const item of generated) {
      const dest = join(existingDir, `${item.card.sceneKey}.json`);
      if (existsSync(dest)) {
        console.warn(`skip install, file exists: ${dest}`);
        continue;
      }
      const src = join(
        outDir,
        item.section.category === "inbound" ? "inbound" : "instock",
        `${item.card.sceneKey}.json`,
      );
      copyFileSync(src, dest);
      copied += 1;
    }
    clearScenarioCardsCache();
    const loaded = loadScenarioCards(existingDir);
    console.log(`installed ${copied} cards → ${existingDir}; loadScenarioCards()=${loaded.length}`);
  }

  const weak = generated.filter((g) => g.card.positiveSignals.strong.length < 3 || g.card.negativeSignals.hard.length < 2);
  console.log(
    `done generated=${generated.length} skipped=${skipped.length} omsMatched=${generated.filter((g) => g.oms.kind !== "pending_oms_code").length} weak=${weak.length} out=${outDir}`,
  );
  if (weak.length) {
    for (const w of weak) {
      console.warn(
        `quality §${w.section.sectionNumber} strong=${w.card.positiveSignals.strong.length} hard=${w.card.negativeSignals.hard.length}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
