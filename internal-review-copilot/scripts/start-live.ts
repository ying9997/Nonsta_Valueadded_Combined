/**
 * Start live poll + card-action listener together.
 *
 *   npx tsx internal-review-copilot/scripts/start-live.ts
 *   npx tsx internal-review-copilot/scripts/start-live.ts --out _runs/20260911_live_poll
 */
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { defaultPersonnelPath } from "../lib/personnel.ts";

const here = dirname(fileURLToPath(import.meta.url));

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function start(label: string, script: string, args: string[]): void {
  const child = spawn("npx", ["tsx", script, ...args], {
    cwd: projectDir(),
    stdio: "inherit",
    shell: true,
    windowsHide: false,
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    console.error(`${label} exited code=${code} signal=${signal || "-"}`);
  });
  child.on("error", (err) => {
    console.error(`${label} failed: ${err.message}`);
  });
}

loadEnvFiles();
const outRel = arg("out", "_runs/20260911_live_poll");
const interval = arg("interval", "600");
const pollScript = resolve(here, "poll-and-assess.ts");
const listenScript = resolve(here, "listen-card-actions.ts");
const personnel = arg("personnel") || defaultPersonnelPath();

console.log(`start-live out=${outRel} interval=${interval}s`);
start("poll", pollScript, ["--interval", interval, "--card", "--out", outRel, "--personnel", personnel]);
start("listen", listenScript, [
  "--store",
  `${outRel}/case-store.json`,
  "--input",
  `${outRel}/details.json`,
  "--personnel",
  personnel,
  "--out",
  outRel,
]);
