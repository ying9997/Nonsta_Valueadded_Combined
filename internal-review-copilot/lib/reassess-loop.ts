/**
 * Helpers for the clarification ↔ reply ↔ reassess loop.
 * Keeps poll-and-assess from parking cases in a dead `reassessed` status.
 */

import type { FeishuMessage } from "./feishu-bot.ts";
import type { CaseStatus } from "./types.ts";
import { isSopGenerateFailure, type PipelineResult } from "./run-pipeline.ts";
import { repliesFromFeishu } from "./summarize-reply.ts";

export function messageTimeMs(raw: string | undefined): number {
  const text = String(raw || "").trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Only treat human replies after the last clarification card as "new".
 * Prevents: reassess → needs_clarification → same old replies → reply_received forever.
 */
export function humanRepliesAfterClarification(
  messages: FeishuMessage[],
  clarificationSentAt: string | null | undefined,
  botFilter: { botOpenId?: string } = {},
): ReturnType<typeof repliesFromFeishu> {
  const all = repliesFromFeishu(messages, botFilter);
  const since = clarificationSentAt ? messageTimeMs(clarificationSentAt) : 0;
  if (!since) return all;
  return all.filter((item) => {
    const t = messageTimeMs(item.at);
    if (!t) return false;
    return t > since;
  });
}

export function nextStatusAfterReassess(result: PipelineResult): CaseStatus {
  if (isSopGenerateFailure(result)) return "transferred";
  if (result.outputPath === "invalid_input" || result.outputPath === "transfer_human") return "transferred";
  if (result.outputPath === "sop_generated") {
    return (result.missingAttachments || []).length ? "needs_attachment" : "written_back";
  }
  if (
    result.outputPath === "needs_requirement_clarification" ||
    result.outputPath === "needs_field_clarification"
  ) {
    return "needs_clarification";
  }
  return "first_assessed";
}

export function isClarificationOutput(result: PipelineResult): boolean {
  return (
    result.outputPath === "needs_requirement_clarification" ||
    result.outputPath === "needs_field_clarification"
  );
}
