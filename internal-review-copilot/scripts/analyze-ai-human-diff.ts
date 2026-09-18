/**
 * 读 eval/ai-human-comparison.jsonl，产出按周对照报告。
 *
 *   npx tsx internal-review-copilot/scripts/analyze-ai-human-diff.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readComparisonRecords, type SopEditType } from "../lib/ai-human-comparison.ts";
import { copilotDir } from "../lib/env.ts";

function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function todayStamp(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
}

async function main(): Promise<void> {
  const records = readComparisonRecords();
  const withHuman = records.filter((item) => item.human && item.diff);
  const sceneMatch = withHuman.filter((item) => item.diff?.sceneMatch).length;
  const sopEdited = withHuman.filter((item) => item.diff?.sopEdited).length;
  const reqEdited = withHuman.filter((item) => item.diff?.requirementEdited).length;
  const wiEdited = withHuman.filter((item) => item.diff?.wiNumbersEdited).length;
  const editTypes: Record<SopEditType, number> = {
    none: 0,
    added_step: 0,
    deleted_step: 0,
    wording: 0,
    rewritten: 0,
  };
  for (const rec of withHuman) {
    const t = rec.diff?.sopEditType || "none";
    editTypes[t] += 1;
  }
  const byScene = new Map<string, { total: number; sceneMatch: number; sopEdited: number }>();
  for (const rec of withHuman) {
    const key = rec.ai.sceneKey || rec.ai.sceneName || "unknown";
    const cur = byScene.get(key) || { total: 0, sceneMatch: 0, sopEdited: 0 };
    cur.total += 1;
    if (rec.diff?.sceneMatch) cur.sceneMatch += 1;
    if (rec.diff?.sopEdited) cur.sopEdited += 1;
    byScene.set(key, cur);
  }
  const sceneRows = [...byScene.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([key, val]) =>
        `| ${key} | ${val.total} | ${pct(val.sceneMatch, val.total)} | ${pct(val.sopEdited, val.total)} |`,
    );
  const pending = records.filter((item) => !item.human).length;
  const lines = [
    `# AI vs 人工对照周报`,
    "",
    `- 生成时间：${new Date().toISOString()}`,
    `- 对照记录：${records.length}（已有人工终态 ${withHuman.length}，待审核 ${pending}）`,
    "",
    "## 总览",
    "",
    `| 指标 | 数量 | 占比 |`,
    `|---|---:|---:|`,
    `| 场景一致 | ${sceneMatch} | ${pct(sceneMatch, withHuman.length)} |`,
    `| SOP 被修改 | ${sopEdited} | ${pct(sopEdited, withHuman.length)} |`,
    `| 需求描述被修改 | ${reqEdited} | ${pct(reqEdited, withHuman.length)} |`,
    `| WI 号被修改 | ${wiEdited} | ${pct(wiEdited, withHuman.length)} |`,
    "",
    "## SOP 修改类型",
    "",
    `| 类型 | 数量 |`,
    `|---|---:|`,
    `| 未改 | ${editTypes.none} |`,
    `| 加步骤 | ${editTypes.added_step} |`,
    `| 删步骤 | ${editTypes.deleted_step} |`,
    `| 措辞 | ${editTypes.wording} |`,
    `| 重写 | ${editTypes.rewritten} |`,
    "",
    "## 按场景",
    "",
    `| 场景 | 单数 | 场景一致率 | SOP 修改率 |`,
    `|---|---:|---:|---:|`,
    ...(sceneRows.length ? sceneRows : ["| （暂无已审对照） | 0 | — | — |"]),
    "",
  ];
  const outDir = resolve(copilotDir(), `_runs/${todayStamp()}_ai_human_diff`);
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "weekly-report.md");
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
