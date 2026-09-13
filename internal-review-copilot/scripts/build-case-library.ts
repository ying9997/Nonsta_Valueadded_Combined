/**
 * Build inbound case-library JSONL from OMS cache.
 * Instock file is an empty placeholder (scheme B).
 *
 *   npx tsx internal-review-copilot/scripts/build-case-library.ts \
 *     --oms-cache _runs/20260909_inbound_scene_probe/_oms_cache \
 *     --golden internal-review-copilot/eval/golden/t14-golden.jsonl \
 *     --out internal-review-copilot/knowledge/case-library \
 *     --max-per-scene 3
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { projectDir } from "../lib/env.ts";
import { loadScenarioCards } from "../lib/scenario-cards.ts";
import { SCENE_KEY_TO_OMS_NAME } from "../lib/llm-scene-classifier.ts";
import type { CaseEntry } from "../lib/case-retriever.ts";
import { resetCaseRetrieverCache, retrieveSimilarCases } from "../lib/case-retriever.ts";

const ATTACH_KEYS: Record<string, string> = {
  VAS_ATTR_REL_AOOI: "操作说明附件",
  VAS_ATTR_REL_TCRBCAL: "商品和标签的对应关系",
  TRPP: "包裹和标签的对应关系",
  VAS_ATTR_REL_LF: "标签文件",
};

const ATTACH_NAMES: Record<string, string> = {
  操作说明附件: "操作说明附件",
  操作说明: "操作说明附件",
  商品和标签的对应关系: "商品和标签的对应关系",
  商品和标签对应关系: "商品和标签的对应关系",
  包裹和标签的对应关系: "包裹和标签的对应关系",
  包裹和标签对应关系: "包裹和标签的对应关系",
  标签文件: "标签文件",
};

const REQ_DESC_KEYS = new Set(["VAS_ATTR_REL_RD", "需求描述"]);
const REQ_BG_KEYS = new Set(["BEOR", "需求背景说明", "需求背景"]);

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function parseCsv(text: string): string[][] {
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
          i++;
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
  const rows = parseCsv(readFileSync(path, "utf8"));
  const header = rows[0] || [];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";
    return obj;
  });
}

function nonempty(v: string): boolean {
  const s = (v || "").trim();
  return Boolean(s) && s.toUpperCase() !== "NULL" && s !== "-" && s !== "无";
}

function normName(s: string): string {
  return (s || "")
    .replace(/[“”"‘’'"「」]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function readGoldenIds(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const ids = new Set<string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as { vascNo?: string };
      if (obj.vascNo) ids.add(obj.vascNo);
    } catch {
      /* skip */
    }
  }
  return ids;
}

function buildSceneMap(): { byCode: Map<string, { sceneKey: string; sceneName: string }>; byName: Map<string, { sceneKey: string; sceneName: string }> } {
  const byCode = new Map<string, { sceneKey: string; sceneName: string }>();
  const byName = new Map<string, { sceneKey: string; sceneName: string }>();
  const put = (code: string, sceneKey: string, sceneName: string) => {
    if (code) byCode.set(code, { sceneKey, sceneName });
    if (sceneName) byName.set(normName(sceneName), { sceneKey, sceneName });
  };
  for (const [key, name] of Object.entries(SCENE_KEY_TO_OMS_NAME)) {
    if (key.startsWith("inbound_")) put("", key, name);
  }
  for (const card of loadScenarioCards()) {
    if (card.category && card.category !== "inbound") continue;
    if (!card.sceneKey.startsWith("inbound_")) continue;
    put(card.omsSceneCode || "", card.sceneKey, card.sceneName);
  }
  return { byCode, byName };
}

function resolveScene(
  code: string,
  name: string,
  maps: ReturnType<typeof buildSceneMap>,
): { sceneKey: string; sceneName: string } | null {
  if (code && maps.byCode.has(code)) return maps.byCode.get(code)!;
  const n = normName(name);
  if (n && maps.byName.has(n)) return maps.byName.get(n)!;
  for (const [k, v] of maps.byName) {
    if (n && k.length >= 8 && (n.includes(k) || k.includes(n))) return v;
  }
  const hints: Array<[RegExp, string]> = [
    [/包裹条码批量异常/, "inbound_package_barcode_batch_relabel"],
    [/指定商品拍照暂存/, "inbound_photo_hold"],
    [/关联第三方商品条码/, "inbound_third_party_merchandise_barcode"],
    [/尺重.*换标上架|标签辨识后换标/, "inbound_label_identify"],
    [/包裹类异常换商品标签/, "inbound_package_exception_relabel_shelving"],
  ];
  for (const [re, key] of hints) {
    if (re.test(name) && maps.byName.size) {
      const hit = [...maps.byName.values()].find((v) => v.sceneKey === key);
      if (hit) return hit;
      return { sceneKey: key, sceneName: name };
    }
  }
  if (/【入库】/.test(name) && (code || n)) {
    return { sceneKey: `inbound_oms_${code || n.slice(0, 24)}`, sceneName: name };
  }
  return null;
}

function deriveAttachmentHints(attachments: Record<string, string>): string {
  const hints: string[] = [];
  if (attachments["操作说明附件"] === "uploaded") hints.push("有辨识操作说明→可能涉及辨识换标");
  if (attachments["商品和标签的对应关系"] === "uploaded") hints.push("有商品对应关系→换商品条码场景");
  if (attachments["包裹和标签的对应关系"] === "uploaded") hints.push("有包裹对应关系→换包裹条码场景");
  if (attachments["标签文件"] === "uploaded") hints.push("有标签文件");
  return hints.join("; ") || "无附件提示";
}

function attachmentSummary(attachments: Record<string, string>): string {
  const labels: Array<[string, string]> = [
    ["标签文件", "标签文件"],
    ["操作说明附件", "操作说明"],
    ["商品和标签的对应关系", "商品对应关系"],
    ["包裹和标签的对应关系", "包裹对应关系"],
  ];
  return labels.map(([k, short]) => `${short}:${attachments[k] === "uploaded" ? "✓" : "✗"}`).join(", ");
}

function attachmentTemplateType(attachments: Record<string, string>): string {
  const types: string[] = [];
  if (attachments["操作说明附件"] === "uploaded") types.push("操作说明");
  if (attachments["商品和标签的对应关系"] === "uploaded") types.push("商品对应关系");
  if (attachments["包裹和标签的对应关系"] === "uploaded") types.push("包裹对应关系");
  return types.join("/") || "无";
}

function extractKeyAction(text: string): string {
  const found: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/补贴包裹标签|补贴包裹标/, "补贴包裹标签"],
    [/关联第三方/, "关联第三方"],
    [/拍照/, "拍照"],
    [/销毁/, "销毁"],
    [/拆箱|拆包装/, "拆箱"],
    [/换商品标签|换商品条码/, "换商品标签"],
    [/换标/, "换标"],
    [/辨识/, "辨识"],
    [/上架/, "上架"],
  ];
  for (const [re, label] of rules) {
    if (re.test(text) && !found.includes(label)) found.push(label);
  }
  return found.slice(0, 3).join("、") || "（未提取）";
}

function extractException(text: string): { name: string; object: string } {
  const nameHit = text.match(
    /(?:异常名称|异常类型)[：:]\s*([^，。；\n]{2,40})|(包裹条码批量异常|商品条码异常|包裹内出现订单外商品|A\+包裹无法识别)[^，。；\n]{0,20}/,
  );
  const name = (nameHit?.[1] || nameHit?.[2] || "").trim();
  let object = "";
  const objHit = text.match(/异常对象[：:]\s*([^，。；\n]{1,10})/);
  if (objHit) object = objHit[1].trim();
  else if (/包裹/.test(name) && !/商品/.test(name)) object = "包裹";
  else if (/商品/.test(name)) object = "商品";
  return { name, object };
}

function sopSnippet(sop: string): string {
  const cleaned = (sop || "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/仓库操作步骤[：:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const steps = cleaned.split(/(?=\d+\s*[\.．、])/).map((s) => s.trim()).filter(Boolean);
  return (steps.slice(0, 2).join(" ") || cleaned).slice(0, 120);
}

function desensitize(text: string, customerName: string): string {
  let out = text || "";
  const name = (customerName || "").trim();
  if (name && name !== "************************" && !/^\*+$/.test(name)) {
    out = out.split(name).join("[客户]");
  }
  out = out.replace(/[\u4e00-\u9fa5]{2,20}(?:有限公司|股份有限公司)/g, "[客户]");
  out = out.replace(/(?:销售|客服|审核员)[:：]?\s*[\u4e00-\u9fa5]{2,4}/g, "");
  out = out.replace(/[\u4e00-\u9fa5]{2,4}(?:销售|客服)/g, "[人员]");
  return out.replace(/\s{2,}/g, " ").trim();
}

function clarityScore(intent: string, attachments: Record<string, string>): number {
  let score = 0;
  if (intent.length >= 40) score += 2;
  if (intent.length >= 80) score += 2;
  if (/换标|补贴|拍照|辨识|关联第三方|销毁|拆箱/.test(intent)) score += 3;
  if (/补贴包裹标签/.test(intent)) score += 2;
  if (/EB\d{6,}/i.test(intent)) score += 1;
  if (/WI\d{6,}/i.test(intent)) score += 1;
  if (Object.values(attachments).some((v) => v === "uploaded")) score += 1;
  if (intent.length < 20) score -= 4;
  return score;
}

function parseAttachments(attrs: Record<string, string>[]): Record<string, string> {
  const status: Record<string, string> = {
    操作说明附件: "missing",
    商品和标签的对应关系: "missing",
    包裹和标签的对应关系: "missing",
    标签文件: "missing",
  };
  for (const a of attrs) {
    const key = (a.attribute_key || "").trim();
    const name = (a.attribute_name || "").trim();
    const value = a.attribute_value || "";
    if (!nonempty(value)) continue;
    const label = ATTACH_KEYS[key] || ATTACH_NAMES[name];
    if (label) status[label] = "uploaded";
  }
  return status;
}

function pickText(attrs: Record<string, string>[], keys: Set<string>): string {
  const parts: string[] = [];
  for (const a of attrs) {
    const key = (a.attribute_key || "").trim();
    const name = (a.attribute_name || "").trim();
    if (keys.has(key) || keys.has(name)) {
      const v = (a.attribute_value || "").trim();
      if (nonempty(v) && !parts.includes(v)) parts.push(v);
    }
  }
  return parts.join("\n");
}

async function main(): Promise<void> {
  const root = projectDir();
  const omsCache = resolve(root, arg("oms-cache", "_runs/20260909_inbound_scene_probe/_oms_cache"));
  const goldenPath = resolve(root, arg("golden", "internal-review-copilot/eval/golden/t14-golden.jsonl"));
  const outDir = resolve(root, arg("out", "internal-review-copilot/knowledge/case-library"));
  const maxPerScene = Number(arg("max-per-scene", "3")) || 3;

  const golden = readGoldenIds(goldenPath);
  const maps = buildSceneMap();
  const orders = csvObjects(resolve(omsCache, "orders.csv"));
  const atoms = csvObjects(resolve(omsCache, "atoms.csv"));
  const attrs = csvObjects(resolve(omsCache, "attrs_submit.csv"));

  const atomByOrder = new Map<string, Record<string, string>[]>();
  for (const a of atoms) {
    const no = a.order_no;
    if (!atomByOrder.has(no)) atomByOrder.set(no, []);
    atomByOrder.get(no)!.push(a);
  }
  const attrsByOrder = new Map<string, Record<string, string>[]>();
  for (const a of attrs) {
    const no = a.order_no;
    if (!attrsByOrder.has(no)) attrsByOrder.set(no, []);
    attrsByOrder.get(no)!.push(a);
  }

  type Cand = CaseEntry & { clarity: number };
  const byScene = new Map<string, Cand[]>();
  const stats = {
    orders: orders.length,
    inboundApproved: 0,
    goldenExcluded: 0,
    unmappedScene: 0,
    tooShort: 0,
    kept: 0,
    scenes: 0,
  };

  for (const order of orders) {
    const va = (order.va_source || "").toUpperCase();
    const pname = order.product_name || "";
    const inbound = va === "INBOUND" || /入库/.test(pname);
    if (!inbound) continue;
    if ((order.is_audit_through || "").toUpperCase() !== "Y") continue;
    stats.inboundApproved++;
    const orderNo = order.order_no;
    if (golden.has(orderNo)) {
      stats.goldenExcluded++;
      continue;
    }
    const orderAtoms = atomByOrder.get(orderNo) || [];
    const inboundAtom =
      orderAtoms.find((a) => /【入库】/.test(a.scene_overview_name || "")) || orderAtoms[0];
    if (!inboundAtom) continue;
    const sceneNameRaw = inboundAtom.scene_overview_name || "";
    if (sceneNameRaw && !/【入库】/.test(sceneNameRaw) && va !== "INBOUND") continue;
    const mapped = resolveScene(inboundAtom.scene_overview_code || "", sceneNameRaw, maps);
    if (!mapped) {
      stats.unmappedScene++;
      continue;
    }
    const orderAttrs = attrsByOrder.get(orderNo) || [];
    const desc = pickText(orderAttrs, REQ_DESC_KEYS);
    const bg = pickText(orderAttrs, REQ_BG_KEYS);
    const intentRaw = [bg, desc].filter(Boolean).join("\n").trim();
    const intent = desensitize(intentRaw, order.customer_name || "");
    if (intent.length < 20) {
      stats.tooShort++;
      continue;
    }
    const attachments = parseAttachments(orderAttrs);
    const ex = extractException(intent);
    const cand: Cand = {
      caseId: orderNo,
      sceneKey: mapped.sceneKey,
      sceneName: mapped.sceneName || sceneNameRaw,
      customerIntent: intent,
      exceptionName: ex.name,
      exceptionObject: ex.object,
      keyAction: extractKeyAction(intent),
      attachmentSummary: attachmentSummary(attachments),
      attachmentTemplateType: attachmentTemplateType(attachments),
      attachmentHints: deriveAttachmentHints(attachments),
      sopSnippet: sopSnippet(inboundAtom.sop || ""),
      auditResult: "approved",
      clarity: clarityScore(intent, attachments),
    };
    if (!byScene.has(mapped.sceneKey)) byScene.set(mapped.sceneKey, []);
    byScene.get(mapped.sceneKey)!.push(cand);
  }

  const picked: CaseEntry[] = [];
  for (const [sceneKey, list] of byScene) {
    list.sort((a, b) => b.clarity - a.clarity || b.customerIntent.length - a.customerIntent.length);
    const take = list.filter((c) => c.clarity >= 2).slice(0, maxPerScene);
    const filled = take.length ? take : list.slice(0, maxPerScene);
    for (const c of filled) {
      const { clarity: _c, ...entry } = c;
      void _c;
      picked.push(entry);
    }
    if (filled.length) stats.scenes++;
  }
  stats.kept = picked.length;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "inbound-cases.jsonl"), picked.map((e) => JSON.stringify(e)).join("\n") + (picked.length ? "\n" : ""), "utf8");
  writeFileSync(resolve(outDir, "instock-cases.jsonl"), "", "utf8");

  const overlap = picked.filter((e) => golden.has(e.caseId)).map((e) => e.caseId);
  if (overlap.length) throw new Error(`golden overlap: ${overlap.join(",")}`);

  const readme = `# 案例库（最小 RAG）

给场景判断用的**历史参考案例**，不是评测金标。

## 今天的范围（方案 B）

- 检索：纯 JS 内存 BM25，案例存在 JSONL 里，不引入向量库。
- 只填 **入库** \`inbound-cases.jsonl\`；\`instock-cases.jsonl\` 为空壳（暂不填库内）。
- 每场景最多 ${maxPerScene} 条**已审核通过**、需求描述相对清楚的单。
- 不放 \`eval/\`。金标 \`${golden.size}\` 条 VASC 已排除。

## 文件

| 文件 | 说明 |
|------|------|
| inbound-cases.jsonl | 入库案例，一行一条 JSON |
| instock-cases.jsonl | 库内占位（空） |
| README.md | 本说明 |

## 字段

\`caseId\`（VASC）、\`sceneKey\` / \`sceneName\`、\`customerIntent\`（需求背景+需求描述）、异常名称/对象（能从原文抽出才填）、附件摘要/模板类型/hints、SOP 前两步、\`auditResult=approved\`。

附件 hints 只看**上传了哪种模板**，不解析 Excel 正文。

## 脱敏

- 保留 VASC / EB / WI / SKU
- 客户名 → \`[客户]\`
- 删除销售/客服姓名

## 和金标隔离

构建时读取 \`eval/golden/t14-golden.jsonl\`，重叠单号不入库。本次排除：${[...golden].join("、") || "（无）"}。

## 更新方式

缓存更新后重跑：

\`\`\`powershell
npx tsx internal-review-copilot/scripts/build-case-library.ts --max-per-scene 3
\`\`\`

不要手工把金标单写进 jsonl。库内要填时再开一轮授权。

## 最近一次构建

- 入库通过候选订单：${stats.inboundApproved}
- 排除金标：${stats.goldenExcluded}
- 对不上场景卡：${stats.unmappedScene}
- 描述过短：${stats.tooShort}
- 写入案例：${stats.kept} 条，覆盖 ${stats.scenes} 个入库场景
`;

  writeFileSync(resolve(outDir, "README.md"), readme, "utf8");

  process.env.RAG_ENABLED = "1";
  resetCaseRetrieverCache();
  const probe = retrieveSimilarCases("入库单整单包裹标都无法识别，需要全部补贴万邑通包裹标签上架", {
    topK: 3,
    category: "inbound",
  });
  const probeOk = probe.some((c) => c.entry.sceneKey.includes("package_barcode_batch") || /批量异常|补贴包裹/.test(c.entry.sceneName));

  console.log(`[case-library] inbound=${stats.kept} scenes=${stats.scenes} goldenExcluded=${stats.goldenExcluded}`);
  console.log(`[case-library] unmapped=${stats.unmappedScene} tooShort=${stats.tooShort}`);
  console.log(`[case-library] wrote ${outDir}`);
  console.log(`[case-library] probe batch-relabel recalled=${probeOk} top=${probe.map((c) => `${c.entry.sceneKey}:${c.score.toFixed(2)}`).join(" | ")}`);
  if (stats.kept < 50) console.warn(`[case-library] WARN inbound cases ${stats.kept} < 50`);
  if (stats.scenes < 10) console.warn(`[case-library] WARN scenes ${stats.scenes} < 10`);
  if (!probeOk) console.warn("[case-library] WARN probe did not recall batch-relabel");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
