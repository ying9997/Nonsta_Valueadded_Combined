/**
 * Formal eval runner: golden labels × details.json → metrics + report.
 *
 * Usage:
 *   npx tsx internal-review-copilot/scripts/run-eval.ts \
 *     --input _runs/20260904_demo_cases/demo_all.details.json \
 *     --golden internal-review-copilot/eval/golden/demo-7.jsonl \
 *     --out _runs/20260907_eval_report \
 *     [--appendix-input ...] [--appendix-golden ...] [--skip-llm] [--tag baseline|post-reflection]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { resolveLlmConfig } from "../lib/llm-client.ts";
import type { OutputPath } from "../lib/types.ts";

interface GoldenLabel {
  vascNo: string;
  expectedOutputPath: OutputPath;
  expectedSceneKey?: string;
  expectedMissing?: string[];
  notes?: string;
}

interface EvalMetrics {
  total: number;
  outputPathAccuracy: number;
  outputPathCorrect: number;
  sceneKeyAccuracy: number;
  sceneKeyCorrect: number;
  sceneKeyScored: number;
  missingFieldsRecall: number;
  missingFieldsPrecision: number;
  llmSuccessRate: number;
  llmSuccessCount: number;
  sopGeneratedCount: number;
  transferHumanCount: number;
  needsClarificationCount: number;
}

interface RowCompare {
  vascNo: string;
  expected: string;
  actual: string;
  match: boolean;
  expectedSceneKey: string;
  actualSceneKey: string;
  sceneMatch: boolean | null;
  expectedMissing: string[];
  actualMissing: string[];
  missingRecallOk: boolean;
  missingPrecisionOk: boolean;
  llmError: string | null;
  reflectionPass?: boolean;
  reflectionIssues?: string[];
  regenerated?: boolean;
  notes: string;
  diff: string;
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
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
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

function setRecall(expected: string[], actual: string[]): { recall: number; precision: number; recallOk: boolean; precisionOk: boolean } {
  const e = [...new Set(expected)];
  const a = [...new Set(actual)];
  if (e.length === 0 && a.length === 0) {
    return { recall: 1, precision: 1, recallOk: true, precisionOk: true };
  }
  if (e.length === 0) {
    return { recall: 1, precision: 0, recallOk: true, precisionOk: a.length === 0 };
  }
  const eSet = new Set(e);
  const aSet = new Set(a);
  const hit = e.filter((item) => aSet.has(item)).length;
  const precHit = a.filter((item) => eSet.has(item)).length;
  const recall = hit / e.length;
  const precision = a.length ? precHit / a.length : 1;
  return {
    recall,
    precision,
    recallOk: hit === e.length,
    precisionOk: a.every((item) => eSet.has(item)),
  };
}

function compareOne(label: GoldenLabel, result: PipelineResult): RowCompare {
  const actualMissing = result.missing || [];
  const expectedMissing = label.expectedMissing || [];
  const miss = setRecall(expectedMissing, actualMissing);
  const actualScene = result.matchResult?.sceneKey || "";
  const expectedScene = label.expectedSceneKey || "";
  const sceneMatch = expectedScene ? actualScene === expectedScene : null;
  const pathMatch = result.outputPath === label.expectedOutputPath;
  const diffs: string[] = [];
  if (!pathMatch) diffs.push(`path ${label.expectedOutputPath}→${result.outputPath}`);
  if (sceneMatch === false) diffs.push(`scene ${expectedScene}→${actualScene || "(empty)"}`);
  if (!miss.recallOk) diffs.push(`missing recall fail exp=${expectedMissing.join("|")} act=${actualMissing.join("|")}`);
  if (!miss.precisionOk) diffs.push(`missing precision fail act extras`);
  if (result.llm?.error) diffs.push(`llmError:${result.llm.error.slice(0, 60)}`);

  return {
    vascNo: label.vascNo,
    expected: label.expectedOutputPath,
    actual: result.outputPath,
    match: pathMatch,
    expectedSceneKey: expectedScene,
    actualSceneKey: actualScene,
    sceneMatch,
    expectedMissing,
    actualMissing,
    missingRecallOk: miss.recallOk,
    missingPrecisionOk: miss.precisionOk,
    llmError: result.llm?.error || null,
    reflectionPass: result.llm?.reflectionPass,
    reflectionIssues: result.llm?.reflectionIssues,
    regenerated: result.llm?.regenerated,
    notes: label.notes || "",
    diff: diffs.join("; ") || "-",
  };
}

function computeMetrics(rows: RowCompare[], results: PipelineResult[]): EvalMetrics {
  const total = rows.length;
  const outputPathCorrect = rows.filter((r) => r.match).length;
  const sceneRows = rows.filter((r) => r.expectedSceneKey);
  const sceneKeyCorrect = sceneRows.filter((r) => r.sceneMatch).length;
  const recallVals = rows.map((r) => setRecall(r.expectedMissing, r.actualMissing).recall);
  const precVals = rows.map((r) => setRecall(r.expectedMissing, r.actualMissing).precision);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const llmSuccessCount = results.filter((r) => !r.llm?.error).length;
  return {
    total,
    outputPathCorrect,
    outputPathAccuracy: total ? outputPathCorrect / total : 0,
    sceneKeyCorrect,
    sceneKeyScored: sceneRows.length,
    sceneKeyAccuracy: sceneRows.length ? sceneKeyCorrect / sceneRows.length : 0,
    missingFieldsRecall: avg(recallVals),
    missingFieldsPrecision: avg(precVals),
    llmSuccessCount,
    llmSuccessRate: total ? llmSuccessCount / total : 0,
    sopGeneratedCount: results.filter((r) => r.outputPath === "sop_generated").length,
    transferHumanCount: results.filter((r) => r.outputPath === "transfer_human").length,
    needsClarificationCount: results.filter(
      (r) =>
        r.outputPath === "needs_requirement_clarification" ||
        r.outputPath === "needs_field_clarification",
    ).length,
  };
}

async function evalSet(
  name: string,
  detailsPath: string,
  goldenPath: string,
  skipLlm: boolean,
): Promise<{ rows: RowCompare[]; results: PipelineResult[]; metrics: EvalMetrics; labels: GoldenLabel[] }> {
  const details = loadDetails(detailsPath);
  const labels = readJsonl<GoldenLabel>(goldenPath);
  const results: PipelineResult[] = [];
  const rows: RowCompare[] = [];
  for (const label of labels) {
    const detail = details[label.vascNo];
    if (!detail) throw new Error(`[${name}] details 中找不到 ${label.vascNo}`);
    console.log(`[${name}] running ${label.vascNo} ...`);
    const result = await runPipeline(detail, { skipLlm });
    if (!result) throw new Error(`[${name}] pipeline returned null for ${label.vascNo}`);
    results.push(result);
    rows.push(compareOne(label, result));
  }
  return { rows, results, metrics: computeMetrics(rows, results), labels };
}

function metricsTable(m: EvalMetrics): string[] {
  return [
    "| 指标 | 值 |",
    "|------|---|",
    `| outputPath Accuracy | ${m.outputPathCorrect}/${m.total} (${pct(m.outputPathCorrect, m.total)}) |`,
    `| sceneKey Accuracy | ${m.sceneKeyCorrect}/${m.sceneKeyScored} (${pct(m.sceneKeyCorrect, m.sceneKeyScored)}) |`,
    `| missingFields Recall | ${(m.missingFieldsRecall * 100).toFixed(1)}% |`,
    `| missingFields Precision | ${(m.missingFieldsPrecision * 100).toFixed(1)}% |`,
    `| LLM Success Rate | ${m.llmSuccessCount}/${m.total} (${pct(m.llmSuccessCount, m.total)}) |`,
    `| sop_generated | ${m.sopGeneratedCount} |`,
    `| transfer_human | ${m.transferHumanCount} |`,
    `| needs_*_clarification | ${m.needsClarificationCount} |`,
  ];
}

function rowTable(rows: RowCompare[]): string[] {
  return [
    "| vascNo | expected | actual | match | scene | missing | 差异说明 |",
    "|--------|----------|--------|-------|-------|---------|----------|",
    ...rows.map((r) => {
      const scene =
        r.sceneMatch === null ? "-" : r.sceneMatch ? "✓" : `✗ ${r.actualSceneKey || "∅"}`;
      const miss = r.missingRecallOk && r.missingPrecisionOk ? "✓" : "✗";
      return `| ${r.vascNo} | ${r.expected} | ${r.actual} | ${r.match ? "✓" : "✗"} | ${scene} | ${miss} | ${r.diff} |`;
    }),
  ];
}

function reflectionSection(rows: RowCompare[], results: PipelineResult[]): string[] {
  const sopRows = results.filter((r) => r.ruleOutputPath === "sop_generated");
  if (!sopRows.length) return ["（本批无 sop_generated，无 Reflection 字段）"];
  const lines = [
    "| vascNo | reflectionPass | regenerated | issues |",
    "|--------|----------------|-------------|--------|",
  ];
  for (const r of sopRows) {
    const llm = r.llm;
    lines.push(
      `| ${r.orderNo} | ${llm?.reflectionPass ?? "-"} | ${llm?.regenerated ?? "-"} | ${(llm?.reflectionIssues || []).join("; ") || "-"} |`,
    );
  }
  return lines;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");

  const inputPath = resolve(projectRoot, arg("input") || "_runs/20260904_demo_cases/demo_all.details.json");
  const goldenPath = resolve(
    projectRoot,
    arg("golden") || "internal-review-copilot/eval/golden/demo-7.jsonl",
  );
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260907_eval_report");
  const appendixInput = arg("appendix-input")
    ? resolve(projectRoot, arg("appendix-input"))
    : resolve(projectRoot, "_runs/20260902_ow01v1602_review_orders/details.json");
  const appendixGolden = arg("appendix-golden")
    ? resolve(projectRoot, arg("appendix-golden"))
    : resolve(projectRoot, "internal-review-copilot/eval/golden/appendix-16.jsonl");
  const skipAppendix = hasFlag("skip-appendix");
  const skipLlm = hasFlag("skip-llm");
  const tag = arg("tag") || "baseline";

  if (!existsSync(inputPath)) throw new Error(`input 不存在: ${inputPath}`);
  if (!existsSync(goldenPath)) throw new Error(`golden 不存在: ${goldenPath}`);

  let model = "(skipped)";
  if (!skipLlm) {
    try {
      model = resolveLlmConfig().model;
    } catch {
      model = "(config unresolved)";
    }
  }

  const mainEval = await evalSet("demo-7", inputPath, goldenPath, skipLlm);

  let appendix:
    | { rows: RowCompare[]; results: PipelineResult[]; metrics: EvalMetrics }
    | undefined;
  if (!skipAppendix && existsSync(appendixInput) && existsSync(appendixGolden)) {
    appendix = await evalSet("appendix-16", appendixInput, appendixGolden, skipLlm);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, `eval-results-${tag}.json`),
    `${JSON.stringify(
      {
        tag,
        model,
        skipLlm,
        generatedAt: new Date().toISOString(),
        demo7: {
          metrics: mainEval.metrics,
          rows: mainEval.rows,
          results: mainEval.results.map((r) => ({
            orderNo: r.orderNo,
            outputPath: r.outputPath,
            ruleOutputPath: r.ruleOutputPath,
            failureGate: r.failureGate,
            missing: r.missing,
            matchResult: r.matchResult,
            llm: r.llm
              ? {
                  error: r.llm.error,
                  model: r.llm.model,
                  reflectionPass: r.llm.reflectionPass,
                  reflectionIssues: r.llm.reflectionIssues,
                  regenerated: r.llm.regenerated,
                  textPreview: (r.llm.text || "").slice(0, 400),
                }
              : null,
          })),
        },
        appendix16: appendix
          ? {
              metrics: appendix.metrics,
              rows: appendix.rows,
            }
          : null,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const knownIssues = mainEval.rows.filter((r) => !r.match || r.sceneMatch === false || !r.missingRecallOk);
  const reportLines = [
    `# 评测报告 V0.1 (${tag})`,
    "",
    "## 数据集",
    "- 来源：7 条 demo 用例（L1×1 L2×1 L3×1 L4×4）",
    "- Golden labels：`internal-review-copilot/eval/golden/demo-7.jsonl`（人工标注）",
    `- 附录：16 条当日待审核单粗标（不计主表准确率结论）`,
    "",
    "## 指标",
    "",
    ...metricsTable(mainEval.metrics),
    "",
    "## 逐条对比",
    "",
    ...rowTable(mainEval.rows),
    "",
    "## Reflection（sop_generated）",
    "",
    ...reflectionSection(mainEval.rows, mainEval.results),
    "",
    "## 已知问题",
    "",
    ...(knownIssues.length
      ? knownIssues.map((r) => `- ${r.vascNo}: ${r.diff}`)
      : ["- 本批主表无 path/scene/missing 不匹配"]),
    "",
    "## 版本",
    `- Pipeline: run-pipeline.ts`,
    `- LLM model: ${model}`,
    `- skipLlm: ${skipLlm}`,
    `- tag: ${tag}`,
    `- 日期: ${new Date().toISOString().slice(0, 10)}`,
    "",
  ];

  if (appendix) {
    reportLines.push(
      "## 附录：16 条当日单（粗标，shadow）",
      "",
      "> 这批没有精确 golden labels；expectedOutputPath 来自既有规则口径粗标。**不计入主结论准确率。**",
      "",
      ...metricsTable(appendix.metrics),
      "",
      ...rowTable(appendix.rows),
      "",
    );
  }

  const reportPath = resolve(outDir, tag === "baseline" ? "eval-report.md" : `eval-report-${tag}.md`);
  writeFileSync(reportPath, reportLines.join("\n"), "utf8");
  // Never overwrite baseline eval-report.md from other tags.

  console.log(`wrote ${reportPath}`);
  console.log(
    `demo7 outputPath=${mainEval.metrics.outputPathCorrect}/${mainEval.metrics.total} llm=${mainEval.metrics.llmSuccessCount}/${mainEval.metrics.total}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
