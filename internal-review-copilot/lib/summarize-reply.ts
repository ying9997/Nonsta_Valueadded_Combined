import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { callChat, fillTemplate, resolveLlmConfig } from "./llm-client.ts";
import { isAiTaggedText, type FeishuMessage } from "./feishu-bot.ts";
import type { PipelineResult } from "./run-pipeline.ts";
import type { CaseRecord } from "./types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const promptPath = resolve(here, "../prompts/summarize-reply.md");

export interface SummarizeReplyArgs {
  firstAssess: PipelineResult;
  replies: Array<{ speaker: string; text: string; at?: string }>;
  caseRecord?: CaseRecord;
}

function fallbackRemark(args: SummarizeReplyArgs): string {
  const first = args.firstAssess;
  const ctx = first.contextFacts;
  const input = first.agentInput;
  const replies = args.replies.length
    ? args.replies.map((item) => `${item.speaker} 在话题中回复：${item.text}`).join("\n")
    : "无群内回复";
  const missing = first.missing.length ? first.missing.map((item) => `- ${item}`).join("\n") : "- 无";
  const sop = first.ruleOutputPath === "sop_generated" ? first.llm?.text || first.structured?.warehouseSop || "未生成" : "未生成";
  return [
    "=== 增值单审核辅助 ===",
    `单号：${first.orderNo}`,
    `客户：${ctx?.customerName || "未填写"}`,
    `仓库：${ctx?.warehouseName || ctx?.warehouseCode || "未填写"}`,
    "",
    "【客户原始需求】",
    input.omsFacts.requirementBackground || "未填写",
    input.omsFacts.customerRequirementDescription || "未填写",
    "",
    "【AI 补全后需求】",
    args.replies.length ? "见下方补充来源；未改变 OMS 原文。" : "回复未补充新的需求事实",
    "",
    "【本次补充来源】",
    replies,
    "",
    "【仍缺失的信息】",
    missing,
    "",
    "【建议审核动作】",
    first.ruleOutputPath === "sop_generated"
      ? "资料已齐，SOP 草稿仅供确认，不等于审核通过。"
      : "按缺失项补齐后重新提交。AI 不自动审核。",
    "",
    "【SOP 草稿】",
    sop,
    "",
  ].join("\n");
}

export function isBotFeishuMessage(msg: FeishuMessage, botOpenId?: string): boolean {
  const senderType = (msg.senderType || "").toLowerCase();
  if (senderType === "app" || senderType === "bot") return true;
  if (botOpenId && msg.senderId && msg.senderId === botOpenId) return true;
  return false;
}

export function repliesFromFeishu(
  messages: FeishuMessage[],
  options?: { botOpenId?: string },
): SummarizeReplyArgs["replies"] {
  const botOpenId = options?.botOpenId || "";
  return messages
    .filter((msg) => !isAiTaggedText(msg.text) && !isBotFeishuMessage(msg, botOpenId) && msg.senderType !== "bot")
    .filter((msg) => {
      const t = (msg.msgType || "").toLowerCase();
      return t !== "interactive" && t !== "system";
    })
    .map((msg) => ({
      speaker: "群成员",
      text: msg.text.trim(),
      at: msg.createTime,
    }))
    .filter((item) => item.text);
}

export async function summarizeReply(args: SummarizeReplyArgs): Promise<string> {
  const first = args.firstAssess;
  const ctx = first.contextFacts;
  const template = readFileSync(promptPath, "utf8");
  const system = fillTemplate(template, {
    vascNo: first.orderNo,
    customer: ctx?.customerName || "未填写",
    warehouse: ctx?.warehouseName || ctx?.warehouseCode || "未填写",
  });
  try {
    const config = resolveLlmConfig();
    const user = JSON.stringify(
      {
        首判: first.structuredReview,
        原始需求背景: first.agentInput.omsFacts.requirementBackground,
        原始需求描述: first.agentInput.omsFacts.customerRequirementDescription,
        群内回复: args.replies,
        SOP草稿: first.llm?.sop?.sopText || "",
      },
      null,
      2,
    );
    const text = await callChat(config, [
      { role: "system", content: system },
      { role: "user", content: `请按模板输出可复制备注。只能使用这些事实。\n\n${user}` },
    ]);
    if (!text.includes("=== 增值单审核辅助 ===")) return fallbackRemark(args);
    return text.trim();
  } catch {
    return fallbackRemark(args);
  }
}
