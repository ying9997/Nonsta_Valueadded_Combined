/**
 * 节点：format-output
 * 仅将经证据 ID 校验的历史沟通摘要输出给用户；附件链接由代码原样渲染。
 */

interface InputContextLite {
  chainId?: string;
}

interface ValidationLite {
  canQuery?: boolean;
}

interface QueryScopeLite {
  queryStatus?: string;
  rejectReason?: string;
  timeWindow?: Record<string, unknown>;
}

type AttachmentType = "image" | "file" | "video" | "audio";
type AttachmentIntent = "none" | "check" | "deliver" | "summary_auto";
type AttachmentRoleFilter = "agent" | "customer" | "any";

interface EvidenceLite {
  id?: string;
  conversationId?: string;
  timestamp?: string;
  role?: string;
  speaker?: string;
  text?: string;
  textTruncated?: boolean;
  kind?: "message" | "attachment";
  attachmentType?: AttachmentType;
}

interface SummaryEvidenceLite {
  requestType?: string;
  answerStatus?: string;
  matchedConversationCount?: number;
  matchedMessageCount?: number;
  evidenceConversationCount?: number;
  evidenceMessageCount?: number;
  dataCompleteness?: string;
  sourceCompleteness?: string;
  evidenceCompleteness?: string;
  attachmentScanComplete?: boolean;
  attachmentIntent?: AttachmentIntent;
  attachmentRoleFilter?: AttachmentRoleFilter;
  attachmentTypes?: AttachmentType[];
  evidence?: EvidenceLite[];
}

interface AttachmentDeliveryItem {
  id?: string;
  type?: AttachmentType;
  role?: string;
  speaker?: string;
  timestamp?: string;
  url?: string;
}

interface AttachmentEventLite {
  type?: AttachmentType;
  role?: string;
  speaker?: string;
  timestamp?: string;
}

interface AttachmentDeliveryLite {
  intent?: AttachmentIntent;
  roleFilter?: AttachmentRoleFilter;
  types?: AttachmentType[];
  attachmentScanComplete?: boolean;
  matchingAttachmentCount?: number;
  availableAttachmentCount?: number;
  deliveryTruncated?: boolean;
  events?: AttachmentEventLite[];
  attachments?: AttachmentDeliveryItem[];
}

interface SummaryFactLite {
  factType?: string;
  text?: string;
  evidenceIds?: unknown;
}

interface AnalysisResultLite {
  structured?: Record<string, unknown>;
  analysis?: string;
}

const ALLOWED_FACT_TYPES = new Set([
  "customer_report",
  "agent_guidance",
  "agent_commitment",
  "completed",
  "historical_fact",
  "attachment_event",
]);
const COMPLETE_RECORD_CLAIM = /完整(?:聊天)?记录|完整内容|全部聊天|所有聊天记录|全文(?:聊天)?记录/;

function objectFrom(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function sanitizeAnalysis(value: string): string {
  return value
    .replace(/飞书多维表格?/g, "历史记录")
    .replace(/飞书/g, "记录系统")
    .replace(/多维表/g, "历史记录")
    .replace(/内部表/g, "历史记录");
}

function fallbackAnalysis(validation: ValidationLite, scope: QueryScopeLite, summary: SummaryEvidenceLite): string {
  const status = text(summary.answerStatus);
  if (validation.canQuery !== true) return "需要先确认您的登录邮箱，才能查询您的历史人工客服沟通记录。";
  if (scope.queryStatus === "rejected_too_old" || status === "rejected_too_old") {
    return "暂不支持查询半年前的人工客服记录。您可以查询最近半年内的记录。";
  }
  if (scope.queryStatus === "rejected_today_unavailable" || status === "rejected_today_unavailable") {
    return "今天的人工客服聊天记录需明天才能查询。";
  }
  if (status === "missing_config" || status === "fetch_failed") {
    return "暂时无法查询历史人工客服沟通记录，请稍后再试。";
  }
  if (status === "no_records") return "未查询到您的历史人工客服沟通记录。";
  if (status === "no_match") return "未查询到与当前问题相关的历史人工客服沟通记录。您可以补充日期、订单号或关键词再试。";
  return "已查询到相关历史人工客服沟通记录，但本次无法生成可核验摘要。请补充日期、订单号或关键词再试。";
}

function evidenceRefs(ids: string[], evidenceById: Map<string, EvidenceLite>): string {
  const refs = ids
    .map((id) => evidenceById.get(id))
    .filter((item): item is EvidenceLite => Boolean(item))
    .slice(0, 3)
    .map((item) => `${text(item.timestamp)} ${text(item.speaker) || "沟通方"}`)
    .filter(Boolean);
  return refs.length > 0 ? `（依据：${refs.join("；")}）` : "";
}

function validatedIds(value: unknown, evidenceById: Map<string, EvidenceLite>): string[] {
  const ids = stringArray(value);
  return ids.length > 0 && ids.every((id) => evidenceById.has(id)) ? ids : [];
}

function attachmentLabel(type: AttachmentType): string {
  return type === "image" ? "图片" : type === "file" ? "文件" : type === "video" ? "视频" : "音频";
}

function attachmentAction(type: AttachmentType): string {
  return type === "file" ? "下载文件" : `打开${attachmentLabel(type)}`;
}

function roleLabel(roleFilter: AttachmentRoleFilter): string {
  return roleFilter === "agent" ? "客服" : roleFilter === "customer" ? "客户" : "";
}

function typeLabel(types: AttachmentType[]): string {
  return types.length === 1 ? attachmentLabel(types[0]) : "图片或附件";
}

function isSafeHttpUrl(value: string): boolean {
  if (!/^https?:\/\/[^\s<>]+$/i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizedDelivery(raw: unknown): AttachmentDeliveryLite {
  const delivery = objectFrom(raw) as AttachmentDeliveryLite;
  const attachments = Array.isArray(delivery.attachments)
    ? delivery.attachments
      .map((item) => objectFrom(item) as AttachmentDeliveryItem)
      .filter((item) => isSafeHttpUrl(text(item.url)))
      .map((item) => ({
        id: text(item.id),
        type: item.type === "file" || item.type === "video" || item.type === "audio" ? item.type : "image" as AttachmentType,
        role: text(item.role),
        speaker: text(item.speaker),
        timestamp: text(item.timestamp),
        url: text(item.url),
      }))
    : [];
  const events = Array.isArray(delivery.events)
    ? delivery.events
      .map((item) => objectFrom(item) as AttachmentEventLite)
      .map((item) => ({
        type: item.type === "file" || item.type === "video" || item.type === "audio" ? item.type : "image" as AttachmentType,
        role: text(item.role),
        speaker: text(item.speaker),
        timestamp: text(item.timestamp),
      }))
    : [];
  return {
    intent: delivery.intent === "deliver" || delivery.intent === "check" || delivery.intent === "summary_auto" ? delivery.intent : "none",
    roleFilter: delivery.roleFilter === "agent" || delivery.roleFilter === "customer" ? delivery.roleFilter : "any",
    types: Array.isArray(delivery.types) ? delivery.types.filter((item): item is AttachmentType => item === "image" || item === "file" || item === "video" || item === "audio") : [],
    attachmentScanComplete: delivery.attachmentScanComplete === true,
    matchingAttachmentCount: Number(delivery.matchingAttachmentCount ?? 0),
    availableAttachmentCount: Number(delivery.availableAttachmentCount ?? 0),
    deliveryTruncated: delivery.deliveryTruncated === true,
    events,
    attachments,
  };
}

function attachmentQuerySummary(delivery: AttachmentDeliveryLite): string {
  const role = roleLabel(delivery.roleFilter ?? "any");
  const kind = typeLabel(delivery.types ?? []);
  const count = Number(delivery.matchingAttachmentCount ?? 0);
  if (count > 0) {
    const events = delivery.events ?? [];
    const details = events
      .map((item) => `${text(item.timestamp)} ${text(item.speaker) || role || "沟通方"}发送${attachmentLabel(item.type ?? "image")}`.trim())
      .filter(Boolean)
      .join("；");
    return `查到${role ? `${role}发送的` : ""}${count}个${kind}${details ? `：${details}` : ""}。`;
  }
  if (delivery.attachmentScanComplete) return `在本次查询范围内未发现${role ? `${role}发送的` : ""}${kind}。`;
  return "本次仅获取到部分历史记录，无法据此判断是否存在对应附件。";
}

function renderAttachmentLinks(delivery: AttachmentDeliveryLite): string[] {
  const attachments = delivery.attachments ?? [];
  if (attachments.length === 0) return [];
  const lines = [delivery.intent === "summary_auto" ? "本次摘要相关附件" : "历史附件"];
  for (const attachment of attachments) {
    const type = attachment.type ?? "image";
    const speaker = text(attachment.speaker) || (text(attachment.role) === "agent" ? "客服" : text(attachment.role) === "customer" ? "客户" : "沟通方");
    const timestamp = text(attachment.timestamp) || "历史会话中";
    lines.push(`- ${timestamp} ${speaker}发送的${attachmentLabel(type)}：[${attachmentAction(type)}](<${text(attachment.url)}>)`);
  }
  if (delivery.deliveryTruncated) {
    lines.push(delivery.intent === "summary_auto"
      ? "- 提醒：附件较多，本次仅展示与当前摘要相关的最新 3 个附件链接。"
      : "- 提醒：附件较多，本次仅展示最新的部分附件链接。");
  }
  lines.push("提示：历史图片或附件链接可能已过期；如无法打开，暂不能通过该链接查看。");
  return lines;
}

function buildResultSummary(analysis: string, attachmentLinks: string[]): string {
  if (attachmentLinks.length === 0) return analysis.slice(0, 200) || "人工客服沟通摘要查询完成";

  // 下游链路会优先消费 resultSummary。链接若留在摘要末尾，容易被普通摘要截断，
  // 因此在此处把经过协议校验的原始链接前置，并且绝不截断链接本身。
  return ["历史附件链接（请原样保留）：", ...attachmentLinks, "", analysis.slice(0, 200)]
    .filter(Boolean)
    .join("\n");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validation = objectFrom(params.validation) as ValidationLite;
  const queryScope = objectFrom(params.queryScope) as QueryScopeLite;
  const summary = objectFrom(params.summaryEvidence) as SummaryEvidenceLite;
  const analysisResult = objectFrom(params.analysisResult) as AnalysisResultLite;
  const inputContext = objectFrom(params.inputContext) as InputContextLite;
  const delivery = normalizedDelivery(params.attachmentDelivery);
  const modelStructured = objectFrom(analysisResult.structured);
  const evidence = Array.isArray(summary.evidence) ? summary.evidence : [];
  const evidenceById = new Map<string, EvidenceLite>();
  for (const item of evidence) {
    const id = text(item.id);
    if (id) evidenceById.set(id, item);
  }
  const answerStatus = text(summary.answerStatus) || "unknown";
  const dataCompleteness = text(summary.dataCompleteness) || "relevant_subset";
  const directAnswer = text(modelStructured.directAnswer);
  const directAnswerEvidenceIds = validatedIds(modelStructured.directAnswerEvidenceIds, evidenceById);
  const validDirectAnswer = directAnswer && directAnswerEvidenceIds.length > 0 && !COMPLETE_RECORD_CLAIM.test(directAnswer);
  const rawFacts = Array.isArray(modelStructured.keyFacts) ? modelStructured.keyFacts : [];
  const keyFacts = rawFacts
    .map((item) => objectFrom(item) as SummaryFactLite)
    .map((item) => ({
      factType: text(item.factType) || "historical_fact",
      text: text(item.text),
      evidenceIds: validatedIds(item.evidenceIds, evidenceById),
    }))
    .filter((item) => item.text && item.evidenceIds.length > 0 && ALLOWED_FACT_TYPES.has(item.factType) && !COMPLETE_RECORD_CLAIM.test(item.text))
    .slice(0, 3);
  const unconfirmedItems = dataCompleteness === "complete" && delivery.intent === "none"
    ? stringArray(modelStructured.unconfirmedItems).filter((item) => !COMPLETE_RECORD_CLAIM.test(item)).slice(0, 3)
    : [];

  let analysis = "";
  const isAttachmentQuery = delivery.intent === "check" || delivery.intent === "deliver";
  const isAutomaticAttachmentDelivery = delivery.intent === "summary_auto";
  const attachmentLinks = delivery.intent === "deliver" || isAutomaticAttachmentDelivery
    ? renderAttachmentLinks(delivery)
    : [];
  if (answerStatus === "found" && (validDirectAnswer || isAttachmentQuery || isAutomaticAttachmentDelivery)) {
    const lines = ["历史沟通摘要"];
    if (isAttachmentQuery) {
      lines.push("", "查询结论", attachmentQuerySummary(delivery));
      if (validDirectAnswer) lines.push(directAnswer + evidenceRefs(directAnswerEvidenceIds, evidenceById));
    } else if (validDirectAnswer) {
      lines.push("", "查询结论", directAnswer + evidenceRefs(directAnswerEvidenceIds, evidenceById));
    }
    if (keyFacts.length > 0) {
      lines.push("", "关键依据");
      for (const fact of keyFacts) lines.push(`- ${fact.text}${evidenceRefs(fact.evidenceIds, evidenceById)}`);
    }
    if (unconfirmedItems.length > 0) {
      lines.push("", "尚未确认");
      for (const item of unconfirmedItems) lines.push(`- ${item}`);
    }
    if (delivery.intent === "deliver" || isAutomaticAttachmentDelivery) {
      if (attachmentLinks.length > 0) lines.push("", ...attachmentLinks);
      else if (Number(delivery.matchingAttachmentCount ?? 0) > 0) {
        lines.push("", "提醒：记录显示存在对应附件，但原始链接未随当前记录返回，无法提供可点击链接。");
      }
    }
    if (dataCompleteness === "partial_source") {
      lines.push("", "提醒：本次仅基于已获取的部分历史记录整理，不能据此判断全部沟通情况。");
    } else if (dataCompleteness === "relevant_subset") {
      lines.push("", "提醒：以下为历史沟通摘要，不是完整聊天记录，仅覆盖与当前问题最相关的内容。");
    }
    analysis = lines.join("\n");
  } else {
    analysis = fallbackAnalysis(validation, queryScope, summary);
  }
  analysis = sanitizeAnalysis(analysis);

  const attachments = delivery.intent === "deliver" || isAutomaticAttachmentDelivery
    ? (delivery.attachments ?? []).map((item) => ({
      id: text(item.id),
      type: item.type ?? "image",
      speaker: text(item.speaker) || (text(item.role) === "agent" ? "客服" : text(item.role) === "customer" ? "客户" : "沟通方"),
      timestamp: text(item.timestamp),
      url: text(item.url),
    }))
    : [];
  const structured = {
    answerStatus,
    requestType: text(summary.requestType) || "unknown",
    matchedConversationCount: Number(summary.matchedConversationCount ?? 0),
    matchedMessageCount: Number(summary.matchedMessageCount ?? 0),
    evidenceConversationCount: Number(summary.evidenceConversationCount ?? 0),
    evidenceMessageCount: Number(summary.evidenceMessageCount ?? 0),
    dataCompleteness,
    keyFacts,
    unconfirmedItems,
    ...(attachments.length > 0 ? { attachments } : {}),
    evidenceRefs: evidence
      .filter((item) => evidenceById.has(text(item.id)))
      .map((item) => ({ id: text(item.id), timestamp: text(item.timestamp), speaker: text(item.speaker) }))
      .slice(0, 3),
  };
  const outputContext = {
    expertId: "human-service-records",
    resultSummary: buildResultSummary(analysis, attachmentLinks),
    chainId: inputContext.chainId !== undefined && inputContext.chainId !== null ? String(inputContext.chainId) : "",
  };
  const enrichedContext = {
    answerStatus,
    requestType: structured.requestType,
    dataCompleteness,
    queryStatus: text(queryScope.queryStatus) || "ok",
    rejectReason: text(queryScope.rejectReason),
    identityMatched: validation.canQuery === true,
    matchedConversationCount: structured.matchedConversationCount,
    matchedMessageCount: structured.matchedMessageCount,
    evidenceConversationCount: structured.evidenceConversationCount,
    evidenceMessageCount: structured.evidenceMessageCount,
    timeWindow: queryScope.timeWindow ?? {},
  };
  return { structured, analysis, outputContext, enrichedContext };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
