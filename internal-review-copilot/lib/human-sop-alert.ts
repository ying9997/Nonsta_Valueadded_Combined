/**
 * 人工 SOP 已填：不进【增值】异常沟通，只私聊开发负责人（金萤）。
 */
import { alertUserId } from "./canary.ts";
import { sendPersonalMessage } from "./feishu-bot.ts";
import { isHumanSopAlreadyFilled } from "./oms-draft-write.ts";

export { isHumanSopAlreadyFilled };

export function isHumanSopFilledNotice(cardOrText: unknown): boolean {
  const blob = typeof cardOrText === "string" ? cardOrText : JSON.stringify(cardOrText || "");
  return (
    blob.includes("非 AI 生成") ||
    blob.includes("禁止覆盖审核员手动填写") ||
    blob.includes("SOP 字段已有内容")
  );
}

export function humanSopAlertText(args: {
  vascNo: string;
  customer?: string;
  warehouse?: string;
  error?: string;
  ownerOpenId?: string;
}): string {
  const at = args.ownerOpenId ? `<at id=${args.ownerOpenId}></at> ` : "";
  const head = [args.vascNo, args.customer, args.warehouse].filter(Boolean).join(" | ");
  return [
    `${at}${head}`,
    args.error || "OMS 操作 SOP 字段已有内容（非 AI 生成），禁止覆盖审核员手动填写的 SOP。",
    "未在【增值】异常沟通新建话题，也没有艾特销售/客服/审核员。",
    "请你本人在 OMS 检查是否要人工处理。",
  ].join("\n");
}

export async function notifyOwnerHumanSopFilled(args: {
  vascNo: string;
  customer?: string;
  warehouse?: string;
  error?: string;
}): Promise<"sent" | "skipped" | "error"> {
  const openId = alertUserId();
  if (!openId) return "skipped";
  const text = humanSopAlertText({ ...args, ownerOpenId: openId });
  try {
    await sendPersonalMessage(openId, text);
    return "sent";
  } catch {
    return "error";
  }
}
