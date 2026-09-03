/**
 * Export daily pilot log from case-store.
 *
 *   npx tsx internal-review-copilot/scripts/export-pilot-log.ts --store <case-store.json> --out <dir>
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../lib/case-store.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function todayStamp(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
}

function main(): void {
  loadEnvFiles();
  const storePath = arg("store") || resolve(projectDir(), `_runs/${todayStamp()}_internal_review_poll/case-store.json`);
  const outDir = resolve(arg("out") || resolve(projectDir(), `_runs/${todayStamp()}_pilot_export`));
  const store = new CaseStore(storePath);
  const cases = store.list();
  mkdirSync(outDir, { recursive: true });

  const byPath = cases.reduce<Record<string, number>>((acc, item) => {
    acc[item.aiOutputPath || "(empty)"] = (acc[item.aiOutputPath || "(empty)"] || 0) + 1;
    return acc;
  }, {});
  const byStatus = cases.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const sopReady = cases.filter((item) => item.status === "sop_ready" || item.aiOutputPath === "sop_generated").length;
  const transferred = cases.filter((item) => item.status === "transferred" || item.aiOutputPath === "transfer_human").length;
  const humanCorrected = cases.filter((item) => item.status === "reassessed" || item.status === "written_back").length;
  const llmErrors = cases.filter((item) => item.llmError).length;

  const md = [
    "# 试点日报",
    "",
    `- 导出时间：${new Date().toISOString()}`,
    `- 来源：\`${storePath}\``,
    `- 总单数：${cases.length}`,
    `- SOP 草稿：${sopReady}`,
    `- 转人工：${transferred}`,
    `- 人工再评估/回写：${humanCorrected}`,
    `- LLM 失败：${llmErrors}`,
    "",
    "## 状态分布",
    "",
    "| status | count |",
    "| --- | ---: |",
    ...Object.entries(byStatus).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## AI 分流",
    "",
    "| aiOutputPath | count |",
    "| --- | ---: |",
    ...Object.entries(byPath).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## 明细",
    "",
    "| vascNo | customer | warehouse | status | aiOutputPath | missing | llmError |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...cases.map((item) =>
      `| ${item.vascNo} | ${item.customer} | ${item.warehouse} | ${item.status} | ${item.aiOutputPath} | ${item.missingFields.join("；") || "-"} | ${item.llmError || "-"} |`,
    ),
    "",
    "说明：本表统计 AI 建议与状态流转，不表示审核通过/驳回。人工决定才算终态。",
    "",
  ].join("\n");

  writeFileSync(resolve(outDir, "pilot-daily.md"), md, "utf8");
  writeFileSync(resolve(outDir, "pilot-daily.json"), `${JSON.stringify({ byStatus, byPath, cases }, null, 2)}\n`, "utf8");
  console.log(`cases=${cases.length}`);
  console.log(`wrote ${outDir}`);
}

main();
