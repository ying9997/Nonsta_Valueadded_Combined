/**
 * Internal review Copilot local dry-run.
 *
 * Pipeline:
 *   validate-input → context-bind → check-requirement → match-template
 *   → check-completeness → llm-generate → format-output
 *
 * Deterministic gates are unchanged. LLM only writes llmGeneratedText.
 * LLM failure degrades to transfer_human + llmError and does not abort the batch.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function missingList(result: PipelineResult): string[] {
  return [...new Set([...result.missingRequirementItems, ...result.missingAttachments, ...result.missingFields])];
}

function writeSummary(outDir: string, inputPath: string, results: PipelineResult[], usedLlm: boolean): void {
  const summary = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.outputPath] = (acc[result.outputPath] || 0) + 1;
    return acc;
  }, {});
  const ruleSummary = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.ruleOutputPath] = (acc[result.ruleOutputPath] || 0) + 1;
    return acc;
  }, {});
  const gates = results.reduce<Record<string, number>>((acc, result) => {
    const gate = result.failureGate || "passed";
    acc[gate] = (acc[gate] || 0) + 1;
    return acc;
  }, {});
  const llmFailed = results.filter((result) => result.llm?.error).length;

  writeFileSync(
    resolve(outDir, "summary.md"),
    [
      "# 内部审核 Copilot 本地干跑报告",
      "",
      `- 输入文件：\`${inputPath}\``,
      `- 样本数：${results.length}`,
      `- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output`,
      `- LLM：${usedLlm ? "真实 LiteLLM（失败降级 transfer_human，不中断批次）" : "已跳过（--skip-llm），仅规则分流"}`,
      `- LLM 失败条数：${llmFailed}`,
      "",
      "## 规则分流（不受 LLM 影响）",
      "",
      "| ruleOutputPath | count |",
      "| --- | ---: |",
      ...Object.entries(ruleSummary).map(([key, value]) => `| ${key} | ${value} |`),
      "",
      "## 最终分流（含 LLM 降级）",
      "",
      "| outputPath | count |",
      "| --- | ---: |",
      ...Object.entries(summary).map(([key, value]) => `| ${key} | ${value} |`),
      "",
      "## 失败归因",
      "",
      "| gate | count |",
      "| --- | ---: |",
      ...Object.entries(gates).map(([key, value]) => `| ${key} | ${value} |`),
      "",
      "## 明细",
      "",
      "| orderNo | rulePath | outputPath | 缺失项 | LLM |",
      "| --- | --- | --- | --- | --- |",
      ...results.map((result) => {
        const missing = missingList(result).join("；");
        const llm = result.llm?.error ? `error:${result.llm.error.slice(0, 40)}` : result.llm?.mocked === false ? "real" : usedLlm ? "-" : "skipped";
        return `| ${result.orderNo} | ${result.ruleOutputPath} | ${result.outputPath} | ${missing || "-"} | ${llm} |`;
      }),
      "",
      "## match-template v0.2",
      "",
      "| orderNo | decision | top1 | score | confidenceScore | reason |",
      "| --- | --- | --- | ---: | ---: | --- |",
      ...results.map((result) => {
        const match = result.matchResult;
        const top1 = match?.topK?.[0]?.sceneKey || "-";
        return `| ${result.orderNo} | ${match?.decision || "-"} | ${top1} | ${match?.score ?? "-"} | ${match?.confidenceScore ?? "-"} | ${match?.reason || "-"} |`;
      }),
      "",
      "完整结构化审核结果见 `structured-reviews.json`。规则分流见每条 `ruleOutputPath`。",
      "",
    ].join("\n"),
    "utf8",
  );
}

async function main(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const inputPath = resolve(here, arg("input"));
  const outDir = resolve(here, arg("out"));
  const orderFilter = arg("order");
  const skipLlm = hasFlag("skip-llm");
  if (!arg("input") || !arg("out")) {
    throw new Error(
      "Usage: npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input <details.json> --out <dir> [--order VASC…] [--skip-llm]",
    );
  }
  if (!existsSync(inputPath)) {
    throw new Error(`输入不存在：${inputPath}。本脚本不拉实时 OMS，请先由抽取任务写入 details.json。`);
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const selected = orderFilter ? details.filter((detail) => asText(detail.orderNo) === orderFilter) : details;
  if (orderFilter && !selected.length) throw new Error(`找不到单号 ${orderFilter}`);

  const results: PipelineResult[] = [];
  for (const detail of selected) {
    const result = await runPipeline(detail, { skipLlm });
    if (result) results.push(result);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "agent-inputs.json"), `${JSON.stringify(results.map((result) => result.agentInput), null, 2)}\n`, "utf8");
  writeFileSync(resolve(outDir, "dryrun-results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "structured-reviews.json"),
    `${JSON.stringify(results.map((result) => result.structuredReview), null, 2)}\n`,
    "utf8",
  );
  writeSummary(outDir, inputPath, results, !skipLlm);

  const summary = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.outputPath] = (acc[result.outputPath] || 0) + 1;
    return acc;
  }, {});
  console.log(`sample=${results.length} skipLlm=${skipLlm}`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`wrote ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
