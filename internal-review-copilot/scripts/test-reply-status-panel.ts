/**
 * Regression: reply status panel must derive L2.5 from workflow gate/node
 * evidence instead of old needs_requirement_clarification card wording.
 *
 *   npx tsx scripts/test-reply-status-panel.ts
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const outDir = resolve("_runs/20261009_reply_status_panel_test");
const run = spawnSync(
  "npx",
  [
    "tsx",
    "scripts/build-reply-status-panel.ts",
    "--store",
    "_runs/20261008_l1_l25_readonly/case-store.json",
    "--poll-log",
    "_runs/20261008_l1_l25_readonly/poll.log",
    "--listen-log",
    "_runs/20261008_l1_l25_readonly/listen.log",
    "--out",
    outDir,
  ],
  { cwd: resolve("."), encoding: "utf8", shell: true, windowsHide: true },
);

assert(run.status === 0, `panel build failed: ${run.stderr || run.stdout}`);

const jsonPath = resolve(outDir, "reply-status-panel.json");
assert(existsSync(jsonPath), "panel json exists");
const panel = JSON.parse(readFileSync(jsonPath, "utf8")) as {
  rows: Array<{ vascNo: string; level: string; aiOutputPath: string; ruleOutputPath: string }>;
};

for (const vascNo of ["VASC000000448314", "VASC000000420921", "VASC000000411852"]) {
  const row = panel.rows.find((item) => item.vascNo === vascNo);
  assert(row, `${vascNo} row exists`);
  assert(row!.level === "L2.5", `${vascNo} should be L2.5, got ${row!.level}`);
  assert(
    row!.aiOutputPath === "needs_requirement_clarification" ||
      row!.ruleOutputPath === "needs_requirement_clarification",
    `${vascNo} keeps historical needs_requirement_clarification evidence`,
  );
}

console.log("test-reply-status-panel: ok");
