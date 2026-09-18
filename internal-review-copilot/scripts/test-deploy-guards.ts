/**
 * Deploy guards: canary chat routing + pipeline circuit breaker.
 *
 *   npx tsx internal-review-copilot/scripts/test-deploy-guards.ts
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CanaryGate, formatCanaryDoneMessage, getTargetChatId, isCanaryMode } from "../lib/canary.ts";
import { CaseStore } from "../lib/case-store.ts";
import {
  PipelineCircuitBreaker,
  classifyPollerOutcome,
  emitBreakerAlert,
  formatBreakerAlert,
  resetPollerBreakerForTests,
} from "../lib/circuit-breaker-poller.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const saved: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined): void {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value == null) delete process.env[key];
  else process.env[key] = value;
}
function restoreEnv(): void {
  for (const [key, value] of Object.entries(saved)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  setEnv("CANARY_MODE", "1");
  setEnv("CANARY_CHAT_ID", "oc_canary_test");
  setEnv("FEISHU_TEST_CHAT_ID", "oc_official_test");
  assert(getTargetChatId() === "oc_canary_test", "CANARY_MODE=1 uses CANARY_CHAT_ID");

  setEnv("CANARY_MODE", "0");
  assert(getTargetChatId() === "oc_official_test", "CANARY_MODE=0 uses FEISHU_TEST_CHAT_ID");

  setEnv("CANARY_MODE", "1");
  setEnv("CANARY_CHAT_ID", "");
  try {
    getTargetChatId();
    throw new Error("missing CANARY_CHAT_ID should throw");
  } catch (err) {
    assert(/CANARY_CHAT_ID/.test(err instanceof Error ? err.message : ""), "missing canary chat throws");
  }

  const dir = mkdtempSync(join(tmpdir(), "irc-canary-"));
  const storePath = join(dir, "case-store.json");
  setEnv("CANARY_MODE", "1");
  setEnv("CANARY_CHAT_ID", "oc_canary_test");
  setEnv("CANARY_LIMIT", "2");
  const store1 = new CaseStore(storePath);
  const gate1 = new CanaryGate(store1);
  assert(gate1.count === 0, "fresh canary starts at 0");
  const a = gate1.recordProcessedOrder("VASC000000000001");
  assert(a.count === 1 && !a.reachedLimit && !a.notify, "first order not yet at limit");
  const b = gate1.recordProcessedOrder("VASC000000000002");
  assert(b.count === 2 && b.reachedLimit && b.notify, "second order hits limit and notifies");
  const raw = JSON.parse(readFileSync(storePath, "utf8")) as {
    _meta?: { canaryCount?: number; canaryOrderNos?: string[] };
  };
  assert(raw._meta?.canaryCount === 2, "canaryCount persisted on case-store _meta");
  assert(raw._meta?.canaryOrderNos?.join(",") === "VASC000000000001,VASC000000000002", "canary order nos persisted");

  const store2 = new CaseStore(storePath);
  const gate2 = new CanaryGate(store2);
  assert(gate2.count === 2, "restart with CANARY_MODE=1 keeps count");
  assert(gate2.shouldPauseNewOrders(), "at-limit stays paused after restart");
  assert(gate2.pendingReplayOrderNos().length === 0, "still in canary, no official replay yet");
  const again = gate2.recordProcessedOrder("VASC000000000003");
  assert(!again.notify, "does not re-notify after restart");

  setEnv("CANARY_MODE", "0");
  const officialGate = new CanaryGate(new CaseStore(storePath));
  assert(
    officialGate.pendingReplayOrderNos().join(",") === "VASC000000000001,VASC000000000002,VASC000000000003",
    "switching off canary queues official replay",
  );
  officialGate.markReplayed("VASC000000000001");
  assert(
    officialGate.pendingReplayOrderNos().join(",") === "VASC000000000002,VASC000000000003",
    "replay marks one done, rest still pending",
  );

  setEnv("CANARY_MODE", "1");
  const gate3 = new CanaryGate(new CaseStore(storePath));
  assert(gate3.count === 0, "CANARY_MODE 0→1 resets counter");
  assert(gate3.pendingReplayOrderNos().length === 0, "new canary round clears replay queue");
  rmSync(dir, { recursive: true, force: true });

  const dirP = mkdtempSync(join(tmpdir(), "irc-canary-promote-"));
  const storePromotePath = join(dirP, "case-store.json");
  setEnv("CANARY_MODE", "1");
  setEnv("CANARY_CHAT_ID", "oc_canary_test");
  setEnv("CANARY_LIMIT", "2");
  const gateP = new CanaryGate(new CaseStore(storePromotePath));
  gateP.recordProcessedOrder("VASC000000000011");
  gateP.recordProcessedOrder("VASC000000000012");
  assert(gateP.shouldPauseNewOrders(), "at-limit pauses before promote");
  assert(isCanaryMode(), "button not clicked yet, still canary");
  assert(getTargetChatId() === "oc_canary_test", "still test group before promote");
  assert(gateP.promote() === true, "first promote click succeeds");
  assert(!isCanaryMode(), "promote leaves canary without changing .env");
  assert(getTargetChatId() === "oc_official_test", "promote routes to official group");
  assert(!gateP.shouldPauseNewOrders(), "promote unpauses new orders");
  assert(
    gateP.pendingReplayOrderNos().join(",") === "VASC000000000011,VASC000000000012",
    "promote queues official replay",
  );
  assert(gateP.promote() === false, "second promote click is idempotent");
  const persisted = JSON.parse(readFileSync(storePromotePath, "utf8")) as {
    _meta?: { canaryPromoted?: boolean };
  };
  assert(persisted._meta?.canaryPromoted === true, "canaryPromoted persisted");
  const gateReload = new CanaryGate(new CaseStore(storePromotePath));
  assert(!isCanaryMode(), "reload still promoted with CANARY_MODE=1");
  assert(getTargetChatId() === "oc_official_test", "reload still official");
  assert(
    gateReload.pendingReplayOrderNos().join(",") === "VASC000000000011,VASC000000000012",
    "reload keeps replay queue",
  );
  rmSync(dirP, { recursive: true, force: true });

  assert(formatCanaryDoneMessage(5).includes("再发到正式群"), "canary done copy mentions official replay");

  assert(classifyPollerOutcome({ failureGate: "llm-generate-sop", outputPath: "sop_generated" }) === "red", "red card");
  assert(classifyPollerOutcome({ failureGate: "", outputPath: "transfer_human" }) === "transfer", "blue transfer");
  assert(classifyPollerOutcome({ failureGate: "", outputPath: "sop_generated" }) === "ok", "green ok");

  setEnv("BREAKER_WINDOW", "5");
  setEnv("BREAKER_RED_THRESHOLD", "2");
  setEnv("BREAKER_TRANSFER_THRESHOLD", "3");
  resetPollerBreakerForTests();

  const reds = new PipelineCircuitBreaker();
  assert(!reds.record("ok", "VASC1"), "1 ok no trip");
  assert(!reds.record("red", "VASC2"), "1 red no trip");
  const tripRed = reds.record("red", "VASC3");
  assert(tripRed?.justTripped, "2 reds trip");
  assert(/SOP 生成失败/.test(tripRed?.reason || ""), "red reason text");
  assert(reds.shouldPause(), "polling paused after red trip");

  const xfers = new PipelineCircuitBreaker();
  assert(!xfers.record("transfer", "T1"), "1 transfer");
  assert(!xfers.record("transfer", "T2"), "2 transfer");
  const tripX = xfers.record("transfer", "T3");
  assert(tripX?.justTripped, "3 consecutive transfer trip");
  assert(/transfer_human/.test(tripX?.reason || ""), "transfer reason text");

  const mixed = new PipelineCircuitBreaker();
  mixed.record("transfer", "A");
  mixed.record("transfer", "B");
  mixed.record("ok", "C");
  mixed.record("transfer", "D");
  assert(!mixed.record("transfer", "E"), "broken streak does not trip");

  const alert = formatBreakerAlert({
    reason: "最近 5 单中 2 单 SOP 生成失败",
    lastOrderNo: "VASC000000305892",
    at: new Date("2026-09-16T06:32:00.000Z"),
  });
  assert(alert.includes("⚠️ 智能审核熔断告警"), "alert title");
  assert(alert.includes("VASC000000305892"), "alert last order");
  assert(alert.includes("重启 poll 服务即恢复"), "alert recover hint");

  setEnv("BREAKER_ALERT_USER_ID", "ou_dev_alert");
  const sent: Array<{ openId: string; text: string }> = [];
  const redAlert = await emitBreakerAlert({
    reason: "最近 5 单中 2 单 SOP 生成失败",
    lastOrderNo: "VASC000000313224",
    send: async (openId, text) => {
      sent.push({ openId, text });
    },
  });
  assert(redAlert, "emitBreakerAlert returns true");
  assert(sent[0]?.openId === "ou_dev_alert", "personal message uses BREAKER_ALERT_USER_ID");
  assert(sent[0]?.text.includes("⚠️ 智能审核熔断告警"), "personal message body");
  assert(sent[0]?.text.includes("VASC000000313224"), "personal message last order");

  const sent2: Array<{ openId: string; text: string }> = [];
  await emitBreakerAlert({
    reason: "连续 3 单转人工（transfer_human）",
    lastOrderNo: "VASC000000292770",
    send: async (openId, text) => {
      sent2.push({ openId, text });
    },
  });
  assert(sent2[0]?.text.includes("连续 3 单转人工"), "transfer personal message");

  console.log("test-deploy-guards ok");
} finally {
  restoreEnv();
}
