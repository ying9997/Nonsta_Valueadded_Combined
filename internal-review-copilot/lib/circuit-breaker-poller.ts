/**
 * Pipeline-level circuit breaker for live poll.
 * Tracks recent first-assess outcomes. Does not touch OMS API breaker in oms-tom-client.ts.
 * Trip flag is in-memory: process restart resumes polling.
 */
import { envNumber, envText } from "./env.ts";
import { alertUserId } from "./canary.ts";

export type PollerOutcomeKind = "red" | "transfer" | "ok";

export interface PipelineBreakerConfig {
  window: number;
  redThreshold: number;
  transferThreshold: number;
  alertUserId: string;
}

export interface BreakerTrip {
  justTripped: boolean;
  reason: string;
  lastOrderNo: string;
  redCount: number;
  transferStreak: number;
}

export function loadPipelineBreakerConfig(): PipelineBreakerConfig {
  return {
    window: envNumber("BREAKER_WINDOW", 5),
    redThreshold: envNumber("BREAKER_RED_THRESHOLD", 2),
    transferThreshold: envNumber("BREAKER_TRANSFER_THRESHOLD", 3),
    alertUserId: alertUserId(),
  };
}

export function classifyPollerOutcome(result: {
  failureGate?: string;
  outputPath?: string;
}): PollerOutcomeKind {
  if (result.failureGate === "llm-generate-sop") return "red";
  if (result.outputPath === "transfer_human") return "transfer";
  return "ok";
}

export function formatShanghaiMinute(d = new Date()): string {
  return new Date(d).toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0, 16);
}

export function formatBreakerAlert(args: {
  reason: string;
  lastOrderNo: string;
  at?: Date;
}): string {
  return [
    "⚠️ 智能审核熔断告警",
    `原因：${args.reason}`,
    `最后处理：${args.lastOrderNo || "-"}`,
    `时间：${formatShanghaiMinute(args.at)}`,
    "操作：看完原因、确认可以继续后，重启 poll 服务即恢复（不用改环境变量）",
  ].join("\n");
}

export class PipelineCircuitBreaker {
  tripped = false;
  tripReason = "";
  lastOrderNo = "";
  private readonly window: Array<{ kind: PollerOutcomeKind; orderNo: string }> = [];
  private readonly cfg: PipelineBreakerConfig;

  constructor(cfg?: Partial<PipelineBreakerConfig>) {
    this.cfg = { ...loadPipelineBreakerConfig(), ...cfg };
  }

  shouldPause(): boolean {
    return this.tripped;
  }

  record(kind: PollerOutcomeKind, orderNo: string): BreakerTrip | null {
    if (this.tripped) {
      return {
        justTripped: false,
        reason: this.tripReason,
        lastOrderNo: this.lastOrderNo,
        redCount: this.redCount(),
        transferStreak: this.transferStreak(),
      };
    }
    this.window.push({ kind, orderNo });
    while (this.window.length > this.cfg.window) this.window.shift();
    this.lastOrderNo = orderNo;

    const redCount = this.redCount();
    const transferStreak = this.transferStreak();
    let reason = "";
    if (redCount >= this.cfg.redThreshold) {
      reason = `最近 ${this.cfg.window} 单中 ${redCount} 单 SOP 生成失败`;
    } else if (transferStreak >= this.cfg.transferThreshold) {
      reason = `连续 ${transferStreak} 单转人工（transfer_human）`;
    }
    if (!reason) return null;

    this.tripped = true;
    this.tripReason = reason;
    console.warn(`[CIRCUIT-BREAKER] tripped: reason=${reason}, pausing polling`);
    return {
      justTripped: true,
      reason,
      lastOrderNo: orderNo,
      redCount,
      transferStreak,
    };
  }

  private redCount(): number {
    return this.window.filter((item) => item.kind === "red").length;
  }

  private transferStreak(): number {
    let n = 0;
    for (let i = this.window.length - 1; i >= 0; i--) {
      if (this.window[i]?.kind !== "transfer") break;
      n += 1;
    }
    return n;
  }
}

let sharedBreaker: PipelineCircuitBreaker | null = null;

export function pollerBreaker(): PipelineCircuitBreaker {
  if (!sharedBreaker) sharedBreaker = new PipelineCircuitBreaker();
  return sharedBreaker;
}

export function resetPollerBreakerForTests(): void {
  sharedBreaker = new PipelineCircuitBreaker();
}

export async function emitBreakerAlert(args: {
  reason: string;
  lastOrderNo: string;
  send: (openId: string, text: string) => Promise<unknown>;
}): Promise<boolean> {
  const openId = envText("BREAKER_ALERT_USER_ID") || envText("FEISHU_TEST_USER_ID");
  if (!openId) {
    console.warn("[CIRCUIT-BREAKER] no BREAKER_ALERT_USER_ID / FEISHU_TEST_USER_ID, skip personal message");
    return false;
  }
  await args.send(openId, formatBreakerAlert({ reason: args.reason, lastOrderNo: args.lastOrderNo }));
  return true;
}
