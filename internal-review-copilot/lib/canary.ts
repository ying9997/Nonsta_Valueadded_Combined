/**
 * Canary / shadow-chat routing for live poll.
 * CANARY_MODE=1 sends to the test group until the user clicks「没问题，切到正式群」
 * (or sets CANARY_MODE=0). Promotion is persisted as _meta.canaryPromoted so .env
 * does not have to change, and reloadCopilotEnv cannot undo it.
 */
import { envNumber, envText } from "./env.ts";
import { resolveTestChatId } from "./feishu-bot.ts";
import type { CaseStore } from "./case-store.ts";

/** Set from CaseStore._meta so getTargetChatId() works after a button promote. */
let canaryPromotedFlag = false;

export function isCanaryPromoted(): boolean {
  return canaryPromotedFlag;
}

export function isCanaryMode(): boolean {
  return envText("CANARY_MODE") === "1" && !canaryPromotedFlag;
}

export function canaryLimit(): number {
  return envNumber("CANARY_LIMIT", 5);
}

export function canaryChatId(): string {
  return envText("CANARY_CHAT_ID");
}

export function alertUserId(): string {
  return envText("BREAKER_ALERT_USER_ID") || envText("FEISHU_TEST_USER_ID");
}

/** All poller card/text sends must use this. Canary mode returns CANARY_CHAT_ID. */
export function getTargetChatId(): string {
  if (isCanaryMode()) {
    const id = canaryChatId();
    if (!id) throw new Error("CANARY_MODE=1 但未设置 CANARY_CHAT_ID");
    return id;
  }
  return resolveTestChatId();
}

export function formatCanaryDoneMessage(count: number): string {
  return `金丝雀 ${count} 单已跑完，请先看测试群。没问题就点「切到正式群」：这 ${count} 单会再发到正式群，之后新单也进正式群。有问题不要点，自己先修。`;
}

function uniqueNos(items: string[] | undefined): string[] {
  return [...new Set((items || []).map((item) => item.trim()).filter(Boolean))];
}

export class CanaryGate {
  constructor(private readonly store: CaseStore) {
    this.hydrate();
  }

  hydrate(): void {
    const meta = this.store.getMeta();
    canaryPromotedFlag = Boolean(meta.canaryPromoted);
    const envOn = envText("CANARY_MODE") === "1";
    if (envOn && !meta.canaryPromoted && meta.canaryMode !== "1") {
      this.store.setMeta({
        canaryCount: 0,
        canaryMode: "1",
        canaryLimitNotified: false,
        canaryOrderNos: [],
        canaryReplayedOrderNos: [],
        canaryPromoted: false,
      });
      canaryPromotedFlag = false;
      return;
    }
    if (!envOn) {
      canaryPromotedFlag = false;
      if (meta.canaryMode !== "0" || meta.canaryPromoted) {
        this.store.setMeta({ canaryMode: "0", canaryPromoted: false });
      }
    }
  }

  get count(): number {
    return Number(this.store.getMeta().canaryCount || 0);
  }

  orderNos(): string[] {
    return uniqueNos(this.store.getMeta().canaryOrderNos);
  }

  pendingReplayOrderNos(): string[] {
    if (isCanaryMode()) return [];
    const done = new Set(uniqueNos(this.store.getMeta().canaryReplayedOrderNos));
    return this.orderNos().filter((no) => !done.has(no));
  }

  markReplayed(vascNo: string): void {
    const done = uniqueNos([...(this.store.getMeta().canaryReplayedOrderNos || []), vascNo]);
    this.store.setMeta({ canaryReplayedOrderNos: done });
  }

  promote(): boolean {
    if (this.store.getMeta().canaryPromoted) return false;
    this.store.setMeta({ canaryPromoted: true, canaryMode: "0" });
    canaryPromotedFlag = true;
    return true;
  }

  shouldPauseNewOrders(): boolean {
    return isCanaryMode() && this.count >= canaryLimit();
  }

  recordProcessedOrder(vascNo: string): { count: number; reachedLimit: boolean; notify: boolean } {
    const next = this.count + 1;
    const reachedLimit = next >= canaryLimit();
    const already = Boolean(this.store.getMeta().canaryLimitNotified);
    const nos = uniqueNos([...(this.store.getMeta().canaryOrderNos || []), vascNo]);
    this.store.setMeta({
      canaryCount: next,
      canaryMode: "1",
      canaryLimitNotified: already || reachedLimit,
      canaryOrderNos: nos,
    });
    return { count: next, reachedLimit, notify: reachedLimit && !already };
  }
}
