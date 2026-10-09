export type AuditorReplyFeedbackType =
  | "scene_wrong"
  | "requirement_understanding_wrong"
  | "missing_rule_wrong"
  | "general_feedback";

export interface AuditorReplyClassification {
  matched: boolean;
  type: AuditorReplyFeedbackType;
  repairBucket: "A" | "B" | "D" | "F";
  reason: string;
}

function normalize(raw: string): string {
  return (raw || "").replace(/\s+/g, " ").trim();
}

export function classifyAuditorReply(raw: string): AuditorReplyClassification {
  const text = normalize(raw);
  if (!text) {
    return { matched: false, type: "general_feedback", repairBucket: "F", reason: "" };
  }

  if (/场景(不对|错|选错|识别错)|不是.{0,12}场景|应该是.{0,24}场景|换个场景/.test(text)) {
    return {
      matched: true,
      type: "scene_wrong",
      repairBucket: "A",
      reason: "审核员指出场景识别不对",
    };
  }

  if (
    /不需要补充|无需补充|不用补充|已经(提供|上传|有)|已(提供|上传|有)|可以(查询|查到|判断|推断)|系统(可以|能).{0,8}(查|判断)|产品(下载|生成|提供)|不是由客户上传|缺失项.{0,8}(不对|错)|必填.{0,8}(不对|错)/.test(
      text,
    )
  ) {
    return {
      matched: true,
      type: "missing_rule_wrong",
      repairBucket: "B",
      reason: "审核员指出缺失项/必填规则不应追问",
    };
  }

  if (
    /(需求|描述|摘要|理解|问的问题|追问).{0,12}(不对|不太对|错|错误|理解错)|AI.{0,12}(理解|摘要|追问|问).{0,12}(不对|错)|不是客户.{0,12}意思/.test(
      text,
    )
  ) {
    return {
      matched: true,
      type: "requirement_understanding_wrong",
      repairBucket: "D",
      reason: "审核员指出需求理解或追问问题不对",
    };
  }

  if (/@?增值咨询|AI|机器人|agent/i.test(text)) {
    return {
      matched: true,
      type: "general_feedback",
      repairBucket: "F",
      reason: "审核员在 AI 话题中 @bot 反馈，需人工复核",
    };
  }

  return { matched: false, type: "general_feedback", repairBucket: "F", reason: "" };
}

export function isL1L25OutputPath(path: string | undefined): boolean {
  return path === "needs_requirement_clarification" || path === "needs_field_clarification";
}
