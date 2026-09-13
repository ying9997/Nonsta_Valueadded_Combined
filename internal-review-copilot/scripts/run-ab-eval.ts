/**
 * Phase 1 vs Phase 2 A/B eval on the same golden labels.
 *
 *   npx tsx internal-review-copilot/scripts/run-ab-eval.ts \
 *     --input _runs/20260909_p3_eval/t14-golden-details.json \
 *     --golden internal-review-copilot/eval/golden/t14-golden.jsonl \
 *     --out _runs/20260909_phase2_ab_eval
 *
 * Note: skipLlm=true on both runs to skip SOP generation cost; Phase 2 enables sceneLlm only.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { resolveLlmConfig } from "../lib/llm-client.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { renderTrace } from "./trace-case.ts";
import type { OutputPath } from "../lib/types.ts";
import { SCENE_KEY_TO_OMS_NAME } from "../lib/llm-scene-classifier.ts";

interface GoldenLabel {
  vascNo: string;
  expectedScene: string;
  acceptableScenes?: string[];
  expectedOutputPath: OutputPath;
  expectedActions?: string[];
  expectedMissing?: string[];
  omsSceneName?: string;
}

interface SideMetrics {
  pathOk: number;
  exact: number;
  acceptable: number;
  falseBlock: number;
  falsePass: number;
  falseUnsupported: number;
  actionCoverageSum: number;
  constraintHit: number;
  constraintScored: number;
  missRecallSum: number;
  missPrecSum: number;
  n: number;
  elapsedMsSum: number;
  llmCalls: number;
}

interface SideRow {
  vascNo: string;
  expectedScene: string;
  omsSceneName: string;
  actualSceneKey: string;
  actualSceneName: string;
  sceneExact: boolean;
  sceneAcceptable: boolean;
  expectedOutputPath: string;
  actualOutputPath: string;
  pathOk: boolean;
  actionCoverage: number;
  decision: string;
  llmUsed?: boolean;
  llmReasoning?: string;
  llmMatched?: string;
  llmConfidence?: string;
  llmActions?: string[];
  llmAmbiguous?: boolean;
  elapsedMs: number;
  retrievedCases?: Array<{ caseId: string; sceneName: string; score: number; keyAction: string }>;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
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

function pct(n: number, d: number): string {
  if (d <= 0) return "n/a";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function pp(a: number, b: number): string {
  const d = (b - a) * 100;
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(1)}pp`;
}

function normalizeMissingToken(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").replace(/vas_attr_rel_lf/g, "标签文件");
}

function missingOverlap(expected: string[], actual: string[]): { recall: number; precision: number } {
  const e = [...new Set(expected.map(normalizeMissingToken).filter(Boolean))];
  const a = [...new Set(actual.map(normalizeMissingToken).filter(Boolean))];
  if (!e.length && !a.length) return { recall: 1, precision: 1 };
  if (!e.length) return { recall: 1, precision: a.length ? 0 : 1 };
  if (!a.length) return { recall: 0, precision: 1 };
  const hit = e.filter((x) => a.some((y) => y.includes(x) || x.includes(y))).length;
  const precHit = a.filter((x) => e.some((y) => y.includes(x) || x.includes(y))).length;
  return { recall: hit / e.length, precision: precHit / a.length };
}

function actionCovered(expected: string, matched: string[]): boolean {
  const e = expected.trim();
  if (!e) return true;
  for (const m of matched) {
    if (m && (m === e || m.includes(e) || e.includes(m))) return true;
  }
  const aliases: Array<[RegExp, RegExp]> = [
    [/补贴包裹/, /补贴包裹标签|换包裹标签/],
    [/关联第三方/, /关联第三方/],
    [/拍照/, /拍照/],
    [/暂存/, /拍照暂存|暂存/],
    [/辨识/, /辨识/],
    [/换标|换商品标签/, /换商品标签|换标/],
    [/上架/, /上架|直接上架/],
  ];
  return aliases.some(([er, mr]) => er.test(e) && matched.some((m) => mr.test(m)));
}

function actionCoverage(expected: string[], matched: string[]): number {
  if (!expected.length) return 1;
  return expected.filter((a) => actionCovered(a, matched)).length / expected.length;
}

function isL1(path: string): boolean {
  return path === "needs_requirement_clarification";
}

function scoreOne(label: GoldenLabel, result: PipelineResult, elapsedMs: number): SideRow {
  const actualSceneKey = result.matchResult?.sceneKey || "";
  const acceptable = label.acceptableScenes?.length
    ? label.acceptableScenes
    : [label.expectedScene].filter(Boolean);
  const llm = result.matchResult?.llmClassification;
  return {
    vascNo: label.vascNo,
    expectedScene: label.expectedScene,
    omsSceneName: label.omsSceneName || SCENE_KEY_TO_OMS_NAME[label.expectedScene] || label.expectedScene,
    actualSceneKey,
    actualSceneName:
      result.matchResult?.scenarioName || SCENE_KEY_TO_OMS_NAME[actualSceneKey] || actualSceneKey || "（空）",
    sceneExact: Boolean(label.expectedScene) && actualSceneKey === label.expectedScene,
    sceneAcceptable: Boolean(actualSceneKey) && acceptable.includes(actualSceneKey),
    expectedOutputPath: label.expectedOutputPath,
    actualOutputPath: result.outputPath,
    pathOk: result.outputPath === label.expectedOutputPath,
    actionCoverage: actionCoverage(label.expectedActions || [], result.matchResult?.matchedActions || []),
    decision: result.matchResult?.decision || "",
    llmUsed: result.matchResult?.llmUsed,
    llmReasoning: llm?.reasoning,
    llmMatched: llm?.matchedScene,
    llmConfidence: llm?.confidence,
    llmActions: llm?.extractedActions,
    llmAmbiguous: llm?.ambiguous,
    elapsedMs,
    retrievedCases: result.matchResult?.retrievedCases || [],
  };
}

function accumulate(rows: SideRow[], results: PipelineResult[]): SideMetrics {
  const m: SideMetrics = {
    pathOk: 0,
    exact: 0,
    acceptable: 0,
    falseBlock: 0,
    falsePass: 0,
    falseUnsupported: 0,
    actionCoverageSum: 0,
    constraintHit: 0,
    constraintScored: 0,
    missRecallSum: 0,
    missPrecSum: 0,
    n: rows.length,
    elapsedMsSum: 0,
    llmCalls: 0,
  };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const result = results[i];
    if (r.pathOk) m.pathOk++;
    if (r.sceneExact) m.exact++;
    if (r.sceneAcceptable) m.acceptable++;
    if (!isL1(r.expectedOutputPath) && isL1(r.actualOutputPath)) m.falseBlock++;
    if (isL1(r.expectedOutputPath) && !isL1(r.actualOutputPath)) m.falsePass++;
    if (
      r.expectedOutputPath !== "transfer_human" &&
      (result.matchResult?.decision === "unsupported" ||
        (r.actualOutputPath === "transfer_human" && result.matchResult?.decision === "unsupported"))
    ) {
      m.falseUnsupported++;
    }
    m.actionCoverageSum += r.actionCoverage;
    if (r.expectedScene) {
      m.constraintScored++;
      if ((result.matchResult?.actionCandidateScenes || []).includes(r.expectedScene)) m.constraintHit++;
    }
    const miss = missingOverlap(
      // reconstruct from result only — expected missing not on SideRow; re-read below unused
      [],
      result.missing || [],
    );
    void miss;
    m.elapsedMsSum += r.elapsedMs;
    if (r.llmUsed) m.llmCalls++;
  }
  return m;
}

function accumulateWithLabels(rows: SideRow[], results: PipelineResult[], labels: GoldenLabel[]): SideMetrics {
  const m = accumulate(rows, results);
  m.missRecallSum = 0;
  m.missPrecSum = 0;
  for (let i = 0; i < rows.length; i++) {
    const miss = missingOverlap(labels[i].expectedMissing || [], results[i].missing || []);
    m.missRecallSum += miss.recall;
    m.missPrecSum += miss.precision;
  }
  return m;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const root = projectDir();
  const ragOn = hasFlag("rag-on");
  const inputPath = resolve(root, arg("input", "_runs/20260909_p3_eval/t14-golden-details.json"));
  const goldenPath = resolve(root, arg("golden", "internal-review-copilot/eval/golden/t14-golden.jsonl"));
  const outDir = resolve(root, arg("out", ragOn ? "_runs/20260911_rag_ab" : "_runs/20260909_phase2_ab_eval"));
  const tracesDir = resolve(outDir, "ab-traces");
  mkdirSync(tracesDir, { recursive: true });

  let model = "(unknown)";
  try {
    model = resolveLlmConfig().model;
  } catch {
    model = "(LLM config unavailable)";
  }

  const details = loadDetails(inputPath);
  const labels = readJsonl<GoldenLabel>(goldenPath);

  const rowsA: SideRow[] = [];
  const rowsB: SideRow[] = [];
  const resultsA: PipelineResult[] = [];
  const resultsB: PipelineResult[] = [];

  for (const label of labels) {
    const detail = details[label.vascNo];
    if (!detail) throw new Error(`details 中找不到 ${label.vascNo}`);

    console.log(ragOn ? `[A] ${label.vascNo} Phase2 v2 无 RAG` : `[A] ${label.vascNo} Phase1 rules`);
    const t0 = Date.now();
    if (ragOn) process.env.RAG_ENABLED = "0";
    const resA = ragOn
      ? await runPipeline(detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 2, ragEnabled: false })
      : await runPipeline(detail, { skipLlm: true, sceneLlm: false });
    if (!resA) throw new Error(`pipeline null ${label.vascNo} A`);
    resultsA.push(resA);
    rowsA.push(scoreOne(label, resA, Date.now() - t0));

    console.log(ragOn ? `[B] ${label.vascNo} Phase2 v2 + BM25 few-shot` : `[B] ${label.vascNo} Phase2 rules+LLM`);
    const t1 = Date.now();
    if (ragOn) process.env.RAG_ENABLED = "1";
    const resB = ragOn
      ? await runPipeline(detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 2, ragEnabled: true })
      : await runPipeline(detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 1 });
    if (!resB) throw new Error(`pipeline null ${label.vascNo} B`);
    resultsB.push(resB);
    rowsB.push(scoreOne(label, resB, Date.now() - t1));

    const md = renderTrace(label.vascNo, detail, resB);
    writeFileSync(resolve(tracesDir, `${label.vascNo}.trace.md`), md, "utf8");
  }

  const mA = accumulateWithLabels(rowsA, resultsA, labels);
  const mB = accumulateWithLabels(rowsB, resultsB, labels);
  const n = labels.length;

  const rate = (x: number) => x / (n || 1);
  const lines: string[] = [];
  lines.push(ragOn ? "# Phase 2 v2：无 RAG vs 有 RAG（BM25 few-shot）" : "# Phase 1 vs Phase 2 A/B 对比评测");
  lines.push("");
  lines.push("## 数据集");
  lines.push(`- Golden labels: t14-golden.jsonl (${n} 条)`);
  if (ragOn) {
    lines.push("- Run A: Phase 2 v2 无 RAG `{ skipLlm: true, sceneLlm: true, sceneLlmVersion: 2, ragEnabled: false }`");
    lines.push("- Run B: Phase 2 v2 + BM25 案例库 few-shot `{ ragEnabled: true }`");
    lines.push("- 案例库与金标 VASC 已隔离；score < 1.0 不注入 few-shot。");
  } else {
    lines.push("- Run A: 纯规则（Phase 1）`{ skipLlm: true, sceneLlm: false }`");
    lines.push("- Run B: 规则 + LLM 场景分类（Phase 2）`{ skipLlm: true, sceneLlm: true }`");
    lines.push("- 说明：两边均 skip SOP 生成，仅对比 match-template 场景分类效果；Phase 2 只多调场景分类 LLM。");
  }
  lines.push(`- LLM model: ${model}`);
  lines.push("");
  const colA = ragOn ? "无 RAG" : "Phase 1";
  const colB = ragOn ? "有 RAG" : "Phase 2";
  lines.push("");
  lines.push("## 端到端指标对比");
  lines.push("");
  lines.push(`| 中文名 | ${colA} | ${colB} | 变化 |`);
  lines.push("|--------|---------|---------|------|");
  lines.push(
    `| 出口准确率 | ${mA.pathOk}/${n} (${pct(mA.pathOk, n)}) | ${mB.pathOk}/${n} (${pct(mB.pathOk, n)}) | ${pp(rate(mA.pathOk), rate(mB.pathOk))} |`,
  );
  lines.push(
    `| 场景精准匹配率 | ${mA.exact}/${n} (${pct(mA.exact, n)}) | ${mB.exact}/${n} (${pct(mB.exact, n)}) | ${pp(rate(mA.exact), rate(mB.exact))} |`,
  );
  lines.push(
    `| 场景可接受匹配率 | ${mA.acceptable}/${n} (${pct(mA.acceptable, n)}) | ${mB.acceptable}/${n} (${pct(mB.acceptable, n)}) | ${pp(rate(mA.acceptable), rate(mB.acceptable))} |`,
  );
  lines.push("");
  lines.push("## 组件级指标对比");
  lines.push("");
  lines.push(`| 中文名 | ${colA} | ${colB} | 变化 |`);
  lines.push("|--------|---------|---------|------|");
  lines.push(
    `| 动作命中率 | ${((mA.actionCoverageSum / n) * 100).toFixed(1)}% | ${((mB.actionCoverageSum / n) * 100).toFixed(1)}% | ${pp(mA.actionCoverageSum / n, mB.actionCoverageSum / n)} |`,
  );
  lines.push(
    `| 误拦率 | ${mA.falseBlock}/${n} (${pct(mA.falseBlock, n)}) | ${mB.falseBlock}/${n} (${pct(mB.falseBlock, n)}) | ${pp(rate(mA.falseBlock), rate(mB.falseBlock))} |`,
  );
  lines.push(
    `| 漏放率 | ${mA.falsePass}/${n} (${pct(mA.falsePass, n)}) | ${mB.falsePass}/${n} (${pct(mB.falsePass, n)}) | ${pp(rate(mA.falsePass), rate(mB.falsePass))} |`,
  );
  lines.push(
    `| 误判无场景率 | ${mA.falseUnsupported}/${n} (${pct(mA.falseUnsupported, n)}) | ${mB.falseUnsupported}/${n} (${pct(mB.falseUnsupported, n)}) | ${pp(rate(mA.falseUnsupported), rate(mB.falseUnsupported))} |`,
  );
  lines.push(
    `| 缺失字段召回率 | ${((mA.missRecallSum / n) * 100).toFixed(1)}% | ${((mB.missRecallSum / n) * 100).toFixed(1)}% | ${pp(mA.missRecallSum / n, mB.missRecallSum / n)} |`,
  );
  lines.push(
    `| 缺失字段精确率 | ${((mA.missPrecSum / n) * 100).toFixed(1)}% | ${((mB.missPrecSum / n) * 100).toFixed(1)}% | ${pp(mA.missPrecSum / n, mB.missPrecSum / n)} |`,
  );
  lines.push("");
  lines.push("## 逐条对比");
  lines.push("");
  lines.push("| VASC | 预期场景 | A 场景 | A ✓ | B 场景 | B ✓ | LLM reasoning |");
  lines.push("|------|---------|--------|-----|--------|-----|---------------|");
  for (let i = 0; i < n; i++) {
    const a = rowsA[i];
    const b = rowsB[i];
    const mark = (exact: boolean, ok: boolean) => (exact ? "精准✓" : ok ? "可接受✓" : "✗");
    lines.push(
      `| ${a.vascNo} | ${a.omsSceneName} | ${a.actualSceneName} | ${mark(a.sceneExact, a.sceneAcceptable)} | ${b.actualSceneName} | ${mark(b.sceneExact, b.sceneAcceptable)} | ${(b.llmReasoning || "-").replace(/\|/g, "/").slice(0, 80)} |`,
    );
  }
  lines.push("");
  lines.push("## LLM 场景分类详情");
  lines.push("");
  lines.push("| VASC | matchedScene | confidence | reasoning | extractedActions | ambiguous |");
  lines.push("|------|-------------|------------|-----------|-----------------|-----------|");
  for (const b of rowsB) {
    lines.push(
      `| ${b.vascNo} | \`${b.llmMatched || ""}\` | ${b.llmConfidence || ""} | ${(b.llmReasoning || "").replace(/\|/g, "/").slice(0, 100)} | [${(b.llmActions || []).join(", ")}] | ${b.llmAmbiguous} |`,
    );
  }
  if (ragOn) {
    lines.push("");
    lines.push("## RAG 检索（Run B）");
    lines.push("");
    lines.push("| VASC | 注入 | top1 案例 | 场景 | 分数 | 关键动作 |");
    lines.push("|------|------|----------|------|------|---------|");
    for (const b of rowsB) {
      const hits = (b.retrievedCases || []).filter((c) => c.score >= 1);
      const top = b.retrievedCases?.[0];
      lines.push(
        `| ${b.vascNo} | ${hits.length ? "是" : "否"} | ${top?.caseId || "—"} | ${top?.sceneName || "—"} | ${top ? top.score.toFixed(1) : "—"} | ${top?.keyAction || "—"} |`,
      );
    }
  }
  lines.push("");
  lines.push("## 成本和延迟");
  lines.push("");
  lines.push(`| 指标 | ${colA} | ${colB} |`);
  lines.push("|------|---------|---------|");
  lines.push(
    `| 平均每条耗时 | ${(mA.elapsedMsSum / n).toFixed(0)}ms | ${(mB.elapsedMsSum / n).toFixed(0)}ms |`,
  );
  lines.push(`| LLM 调用次数（场景分类成功） | 0 | ${mB.llmCalls} |`);
  lines.push("| LLM token 用量 | 0 | （未在客户端计量，见网关日志） |");
  lines.push("");

  const exactLift = rate(mB.exact) - rate(mA.exact);
  const acceptLift = rate(mB.acceptable) - rate(mA.acceptable);
  lines.push("## 结论");
  lines.push("");
  if (ragOn) {
    lines.push(
      `- 有 RAG vs 无 RAG 场景精准匹配率变化：${pp(rate(mA.exact), rate(mB.exact))}；可接受匹配率变化：${pp(rate(mA.acceptable), rate(mB.acceptable))}`,
    );
    if (acceptLift < 0 || exactLift < 0) {
      lines.push("- **验收：未达到「有 RAG ≥ 无 RAG」**，默认仍可用无 RAG；需看错案是否被 few-shot 带偏。");
    } else {
      lines.push("- **验收：有 RAG 准确率不低于无 RAG。**");
    }
  } else {
    lines.push(
      `- Phase 2 vs Phase 1 场景精准匹配率变化：${pp(rate(mA.exact), rate(mB.exact))}；可接受匹配率变化：${pp(rate(mA.acceptable), rate(mB.acceptable))}`,
    );
    lines.push(
      `- Phase 2 引入的额外延迟：+${((mB.elapsedMsSum - mA.elapsedMsSum) / n).toFixed(0)}ms/条`,
    );
    lines.push("- Phase 2 引入的额外成本：每条约 1 次场景分类 chat completion（token 见网关）");
    if (exactLift >= 0.2 || acceptLift >= 0.2) {
      lines.push("- **建议：采纳 Phase 2（场景准确率提升 ≥ +20pp）**，默认可用 `sceneLlm: true`。");
    } else if (exactLift > 0 || acceptLift > 0) {
      lines.push(
        "- **建议：有条件采纳**（有提升但未达 +20pp 验收线）。需结合错案 reasoning / 规则硬排除冲突继续调 prompt。",
      );
    } else {
      lines.push(
        "- **建议：暂缓默认开启**（未超过 Phase 1）。优先检查：规则硬排除是否误杀 LLM 正确场景、confidence=low 是否过多转人工。",
      );
    }
  }
  lines.push("");
  lines.push("Traces: `ab-traces/`");
  lines.push("");

  writeFileSync(resolve(outDir, "ab-comparison.md"), lines.join("\n"), "utf8");
  writeFileSync(
    resolve(outDir, "ab-comparison.json"),
    JSON.stringify(
      {
        model,
        ragOn,
        metricsA: mA,
        metricsB: mB,
        rowsA,
        rowsB,
      },
      null,
      2,
    ),
    "utf8",
  );

  const index = [
    "# Phase 2 A/B traces",
    "",
    ...labels.map((l) => `- [${l.vascNo}](./${l.vascNo}.trace.md)`),
    "",
  ].join("\n");
  writeFileSync(resolve(tracesDir, "index.md"), index, "utf8");

  console.log(`[ab] wrote ${outDir}/ab-comparison.md`);
  console.log(
    `[ab] exact ${mA.exact}/${n} → ${mB.exact}/${n} (${pp(rate(mA.exact), rate(mB.exact))}); acceptable ${mA.acceptable}/${n} → ${mB.acceptable}/${n}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
