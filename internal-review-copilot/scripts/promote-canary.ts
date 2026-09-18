/**
 * Same as clicking Feishu「没问题，切到正式群」.
 *   npx tsx scripts/promote-canary.ts [_runs/live_poll/case-store.json]
 */
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { CanaryGate, getTargetChatId, isCanaryMode } from "../lib/canary.ts";
import { replayCanaryToOfficial } from "../lib/canary-replay.ts";
import { CaseStore } from "../lib/case-store.ts";
import { copilotDir, loadEnvFiles } from "../lib/env.ts";

loadEnvFiles();

const storePath = resolve(process.argv[2] || resolve(copilotDir(), "_runs/live_poll/case-store.json"));
const logPath = resolve(copilotDir(), "logs/poll.log");

function log(line: string): void {
  const text = `${new Date().toISOString()} ${line}`;
  console.log(line);
  try {
    appendFileSync(logPath, `${text}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

const store = new CaseStore(storePath);
const canary = new CanaryGate(store);
const first = canary.promote();
log(
  `canary_promote script first=${first ? "1" : "0"} store=${storePath} canaryModeEnv=${isCanaryMode() ? "1" : "0"} chat=${getTargetChatId()} nos=${canary.orderNos().join(",")}`,
);
const stats = await replayCanaryToOfficial({
  store,
  canary,
  log,
});
log(`canary_promote_done sent=${stats.sent} skipped=${stats.skipped} failed=${stats.failed}`);
if (stats.failed) process.exit(1);
