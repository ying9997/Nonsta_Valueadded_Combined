/**
 * LLM-as-Judge for L4 (sop_generated) golden cases.
 *
 *   npx tsx internal-review-copilot/scripts/run-llm-judge.ts \
 *     --input _runs/20260909_p3_eval/t14-golden-details.json \
 *     --golden internal-review-copilot/eval/golden/t14-golden.jsonl \
 *     --out _runs/20260909_p3_eval
 *
 * Isolation: golden expectedScene is for the Judge only; runPipeline does not receive it.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  callChat,
  extractFirstJsonObject,
  resolveLlmConfig,
  type ChatMessage,
} from "../lib/llm-client.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline } from "../lib/run-pipeline.ts";

interface GoldenLabel {
  vascNo: string;
  expectedScene: string;
  expectedOutputPath: string;
  layer?: string;
  omsSceneName?: string;
}

interface DimScore {
  score: number;
  reason: string;
}

interface JudgePayload {
  factualAccuracy: DimScore;
  completeness: DimScore;
  executability: DimScore;
  safety: DimScore;
  sceneFit: DimScore;
  overallPass: boolean;
  criticalIssues: string[];
}

interface JudgeRow {
  vascNo: string;
  omsSceneName: string;
  expectedScene: string;
  outputPath: string;
  judged: boolean;
  judgeError?: string;
  scores?: JudgePayload;
  sopPreview?: string;
}

const SCENE_NAME: Record<string, string> = {
  inbound_package_barcode_batch_relabel:
    '【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架',
  inbound_photo_hold: "【入库】指定商品拍照暂存",
  inbound_third_party_merchandise_barcode: "【入库】关联第三方商品条码上架",
  inbound_label_identify: "【入库】尺重/标签辨识后换标上架",
  inbound_package_exception_relabel_shelving: "【入库】包裹类异常换商品标签上架",
};

const JUDGE_PROMPT = `你是万邑通仓库 SOP 质量审核员。请对以下 SOP 在 5 个维度打分（1-5 分）。

## 评分维度

1. **事实准确性**
   - 5: SOP 中所有单号/SKU/数量/仓库都来自输入，无编造
   - 3: 有 1-2 处引用了输入中不存在的信息
   - 1: 大量编造信息

2. **操作完整性**
   - 5: 包含完整操作链路（找货→辨识/拍照→操作→上架/暂存→关单）
   - 3: 缺少 1-2 个步骤
   - 1: 只有背景没有操作步骤

3. **可执行性**
   - 5: 仓库操作人员仅凭此 SOP 就能执行，无需追问
   - 3: 大部分可执行，但有 1-2 处模糊
   - 1: 无法执行

4. **安全合规**
   - 5: 无"AI 审核通过"等禁止表述，无时效承诺
   - 1: 有违规表述

5. **场景匹配**
   - 5: SOP 内容和预期场景完全一致
   - 3: 大致匹配但混入了其他场景操作
   - 1: 场景完全不对

## 输入
### 客户需求
{customerIntent}
### 预期场景
{expectedSceneName}（OMS 全名）
### SOP 全文
{sopText}

## 输出（严格 JSON，不要 Markdown 围栏）
{"factualAccuracy":{"score":1,"reason":"..."},"completeness":{"score":1,"reason":"..."},"executability":{"score":1,"reason":"..."},"safety":{"score":1,"reason":"..."},"sceneFit":{"score":1,"reason":"..."},"overallPass":true,"criticalIssues":["..."]}`;

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

function loadDetails(path: string): Record<string, Record<string, unknown>> {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const map: Record<string, Record<string, unknown>> = {};
  for (const detail of details) {
    const orderNo = asText(detail.orderNo);
    if (orderNo) map[orderNo] = detail;
  }
  return map;
}

function fill(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, v);
  }
  return out;
}

function customerIntentFromDetail(detail: Record<string, unknown>): string {
  const direct = asText(detail.customerIntent);
  if (direct) return direct;
  const atoms = asArray(detail.atoms).map(asRecord);
  const parts: string[] = [];
  for (const atom of atoms) {
    const des = asText(atom.vasDes) || asText(atom.sop);
    if (des) parts.push(des);
    for (const attr of asArray(atom.vaAtomAttrs).map(asRecord)) {
      const key = asText(attr.attributeKeyOriginal) || asText(attr.attributeKey);
      const name = asText(attr.attributeName);
      const val = asText(attr.attributeValue) || asText(attr.attributeValueOriginal);
      if (!val) continue;
      if (
        key === "BEOR" ||
        key === "VAS_ATTR_REL_RD" ||
        key === "RD" ||
        name.includes("需求") ||
        name.includes("描述")
      ) {
        parts.push(val);
      }
    }
  }
  return parts.join("\n").slice(0, 6000);
}

function parseJudge(text: string): JudgePayload {
  const jsonText = extractFirstJsonObject(text) || text;
  const obj = JSON.parse(jsonText) as JudgePayload;
  for (const key of ["factualAccuracy", "completeness", "executability", "safety", "sceneFit"] as const) {
    const dim = obj[key];
    if (!dim || typeof dim.score !== "number") {
      throw new Error(`missing dimension ${key}`);
    }
  }
  return obj;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const root = projectDir();
  const inputPath = resolve(root, arg("input", "_runs/20260909_p3_eval/t14-golden-details.json"));
  const goldenPath = resolve(root, arg("golden", "internal-review-copilot/eval/golden/t14-golden.jsonl"));
  const outDir = resolve(root, arg("out", "_runs/20260909_p3_eval"));
  mkdirSync(outDir, { recursive: true });

  const details = loadDetails(inputPath);
  const labels = readJsonl<GoldenLabel>(goldenPath).filter(
    (l) => l.expectedOutputPath === "sop_generated" || l.layer === "L4",
  );
  // Prompt: only L4 (sop_generated). Prefer expectedOutputPath == sop_generated.
  const l4Labels = readJsonl<GoldenLabel>(goldenPath).filter((l) => l.expectedOutputPath === "sop_generated");

  const rows: JudgeRow[] = [];
  let llmReady = true;
  let llmConfigError = "";
  try {
    resolveLlmConfig();
  } catch (e) {
    llmReady = false;
    llmConfigError = e instanceof Error ? e.message : String(e);
  }

  for (const label of l4Labels) {
    const detail = details[label.vascNo];
    if (!detail) throw new Error(`details 中找不到 ${label.vascNo}`);
    const omsName = label.omsSceneName || SCENE_NAME[label.expectedScene] || label.expectedScene;
    console.log(`[judge] pipeline ${label.vascNo}`);
    const result = await runPipeline(detail, { skipLlm: false });
    const sopText =
      result.llm?.sop?.sopText ||
      result.llm?.text ||
      result.analysis ||
      "";
    const row: JudgeRow = {
      vascNo: label.vascNo,
      omsSceneName: omsName,
      expectedScene: label.expectedScene,
      outputPath: result.outputPath,
      judged: false,
      sopPreview: String(sopText).slice(0, 240),
    };

    // Prefer real SOP draft even if reflection flipped outputPath to transfer_human.
    if (!sopText) {
      console.log(`[judge] fallback skipLlm draft for ${label.vascNo}`);
      const draft = await runPipeline(detail, { skipLlm: true });
      const draftSop = draft.analysis || "";
      if (!draftSop || draft.outputPath !== "sop_generated") {
        row.judgeError = `actual outputPath=${result.outputPath} 且无可用 SOP（llmError=${result.llm?.error || ""}；skipLlm=${draft.outputPath}）`;
        rows.push(row);
        continue;
      }
      row.sopPreview = String(draftSop).slice(0, 240);
      // continue judging draftSop below
      (row as JudgeRow & { _sop?: string })._sop = draftSop;
    }

    const finalSop = sopText || (row as JudgeRow & { _sop?: string })._sop || "";
    if (!finalSop) {
      row.judgeError = `无 SOP 可评（outputPath=${result.outputPath}, llmError=${result.llm?.error || ""}）`;
      rows.push(row);
      continue;
    }
    if (!llmReady) {
      row.judgeError = `judgeError: ${llmConfigError}`;
      rows.push(row);
      continue;
    }

    try {
      const prompt = fill(JUDGE_PROMPT, {
        customerIntent: customerIntentFromDetail(detail) || "（无）",
        expectedSceneName: omsName,
        sopText: String(finalSop).slice(0, 12000),
      });
      const messages: ChatMessage[] = [
        { role: "system", content: "你只输出严格 JSON，不要附加解释。" },
        { role: "user", content: prompt },
      ];
      const config = resolveLlmConfig();
      const raw = await callChat(config, messages, { jsonMode: true, maxTokens: 2000 });
      row.scores = parseJudge(raw);
      row.judged = true;
      if (result.outputPath !== "sop_generated") {
        row.judgeError = `注：pipeline 出口为 ${result.outputPath}（llmError=${result.llm?.error || "无"}），仍对可得 SOP 草稿评分`;
      }
    } catch (e) {
      row.judgeError = `judgeError: ${e instanceof Error ? e.message : String(e)}`;
    }
    rows.push(row);
  }

  const judged = rows.filter((r) => r.judged && r.scores);
  const avg = (key: keyof JudgePayload) => {
    if (!judged.length) return null;
    const vals = judged.map((r) => (r.scores![key] as DimScore).score);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const md: string[] = [];
  md.push("# LLM-as-Judge 报告");
  md.push("");
  md.push("## 数据集");
  md.push(`- 仅评测 golden 中 \`expectedOutputPath=sop_generated\` 的 case（本轮 ${l4Labels.length} 条）`);
  md.push("- Judge 读取 expectedScene / OMS 全名仅用于评分，不传入 `runPipeline` ✓");
  md.push(`- LLM 配置: ${llmReady ? "可用" : `不可用（${llmConfigError}）`}`);
  md.push("");
  md.push("## 汇总");
  md.push("");
  md.push("| 维度（中文） | 英文 | 平均分 |");
  md.push("|------------|------|-------:|");
  md.push(`| 事实准确性 | factualAccuracy | ${avg("factualAccuracy")?.toFixed(2) ?? "n/a"} |`);
  md.push(`| 操作完整性 | completeness | ${avg("completeness")?.toFixed(2) ?? "n/a"} |`);
  md.push(`| 可执行性 | executability | ${avg("executability")?.toFixed(2) ?? "n/a"} |`);
  md.push(`| 安全合规 | safety | ${avg("safety")?.toFixed(2) ?? "n/a"} |`);
  md.push(`| 场景匹配 | sceneFit | ${avg("sceneFit")?.toFixed(2) ?? "n/a"} |`);
  md.push(`| overallPass 数 | — | ${judged.filter((r) => r.scores?.overallPass).length}/${judged.length} |`);
  md.push("");
  md.push("## 逐条");
  md.push("");
  md.push("| VASC | 预期场景（OMS 全名） | 事实 | 完整 | 可执行 | 安全 | 场景 | Pass | 备注 |");
  md.push("|------|-------------------|-----:|-----:|------:|-----:|-----:|------|------|");
  for (const r of rows) {
    if (!r.judged || !r.scores) {
      md.push(`| ${r.vascNo} | ${r.omsSceneName} | — | — | — | — | — | — | ${r.judgeError || "-"} |`);
      continue;
    }
    const s = r.scores;
    md.push(
      `| ${r.vascNo} | ${r.omsSceneName} | ${s.factualAccuracy.score} | ${s.completeness.score} | ${s.executability.score} | ${s.safety.score} | ${s.sceneFit.score} | ${s.overallPass ? "✓" : "✗"} | ${r.judgeError || (s.criticalIssues || []).join("；") || "-"} |`,
    );
  }
  md.push("");
  md.push("## 说明");
  md.push("");
  md.push("- 若出现 `judgeError`，不阻塞客观评测（见 `objective-eval-report.md`）。");
  md.push("- 场景名一律使用 OMS 全名（统一映射表）。");
  md.push("");

  writeFileSync(resolve(outDir, "llm-judge-report.md"), md.join("\n"), "utf8");
  writeFileSync(
    resolve(outDir, "llm-judge-results.json"),
    JSON.stringify({ llmReady, llmConfigError, rows, unusedFilterNote: labels.length }, null, 2),
    "utf8",
  );
  console.log(`[judge] wrote ${outDir}/llm-judge-report.md judged=${judged.length}/${rows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
