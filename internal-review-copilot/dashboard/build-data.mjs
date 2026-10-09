/**
 * 把对照 jsonl 收成看板用的 data.js。
 * 没指定文件时，优先选最新写入时间更新的数据源，再用条数兜底。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const copilot = resolve(here, "..");
const candidates = [
  process.argv[2],
  resolve(copilot, "_runs/dashboard_current/from40-current.jsonl"),
  resolve(copilot, "eval/ai-human-comparison.jsonl"),
  resolve(copilot, "_runs/20260917_sync_comparison_base/from40.jsonl"),
].filter(Boolean);

function load(path) {
  try {
    const rows = readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((row) => row && row.vascNo);
    const latestWriteTime = rows
      .map((row) => Date.parse(row.aiWriteTime || ""))
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0] || 0;
    return { path, rows, latestWriteTime };
  } catch {
    return { path, rows: [], latestWriteTime: 0 };
  }
}

const best = candidates.map(load).sort((a, b) => b.latestWriteTime - a.latestWriteTime || b.rows.length - a.rows.length)[0];
if (!best || !best.rows.length) {
  console.error("没有读到对照记录");
  process.exit(1);
}

const payload = {
  source: best.path,
  builtAt: new Date().toISOString(),
  rowCount: best.rows.length,
  rows: best.rows,
};
writeFileSync(resolve(here, "data.js"), `window.QUALITY_DATA = ${JSON.stringify(payload)};\n`, "utf8");
console.log(`wrote ${best.rows.length} rows from ${best.path}`);
