/**
 * 将已按账号与时间范围拉取的人工客服消息整理为一次 LLM 可消费的证据包。
 * 附件 URL 只传给最终代码渲染节点，不传给 LLM。
 */

interface MessageTurn {
  conversationId?: string;
  recordId?: string;
  timestamp?: string;
  role?: string;
  speaker?: string;
  text?: string;
  agentName?: string;
  channel?: string;
  categories?: string[];
}

interface QueryScope {
  timeWindow?: { start?: string; end?: string };
  keywords?: string[];
}

type AttachmentType = "image" | "file" | "video" | "audio";
type AttachmentIntent = "none" | "check" | "deliver" | "summary_auto";
type AttachmentRoleFilter = "agent" | "customer" | "any";

interface ParsedAttachment {
  type: AttachmentType;
  url?: string;
}

interface TurnEntry {
  turn: MessageTurn;
  index: number;
  conversationId: string;
  attachment?: ParsedAttachment;
}

interface Evidence {
  id: string;
  conversationId: string;
  timestamp: string;
  role: string;
  speaker: string;
  text: string;
  textTruncated: boolean;
  kind: "message" | "attachment";
  attachmentType?: AttachmentType;
}

interface AttachmentFact {
  id: string;
  conversationId: string;
  timestamp: string;
  role: string;
  speaker: string;
  type: AttachmentType;
  linkAvailable: boolean;
}

interface AttachmentDeliveryItem extends AttachmentFact {
  url: string;
}

const MAX_EVIDENCE_CHARS = 24_000;
const MAX_EVIDENCE_TEXT_CHARS = 1_200;
const MAX_DELIVERY_ATTACHMENTS = 20;
const MAX_AUTO_DELIVERY_ATTACHMENTS = 3;
const MAX_DELIVERY_LINK_CHARS = 12_000;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function inWindow(turn: MessageTurn, scope: QueryScope): boolean {
  const timestamp = text(turn.timestamp);
  const start = text(scope.timeWindow?.start);
  const end = text(scope.timeWindow?.end);
  return !timestamp || !start || !end || (timestamp >= start && timestamp <= end);
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

function parseAttachment(turn: MessageTurn): ParsedAttachment | undefined {
  const raw = text(turn.text);
  const marker = /^\[(image|file|video|audio)\]/i.exec(raw);
  if (!marker) return undefined;
  const type = marker[1].toLowerCase() as AttachmentType;
  const url = /https?:\/\/[^\s<>]+/i.exec(raw)?.[0] ?? "";
  return isSafeHttpUrl(url) ? { type, url } : { type };
}

function isAttachmentMarker(turn: MessageTurn): boolean {
  return /^\[(image|file|video|audio)\]/i.test(text(turn.text));
}

function isLowValue(turn: MessageTurn): boolean {
  const value = text(turn.text);
  const compact = value.replace(/\s+/g, "");
  return (
    !value ||
    isAttachmentMarker(turn) ||
    /有新的咨询进来了|发送满意度调查|您的对话已关闭|匿名调研|survey\.winit\.com\.cn|我将关闭此对话|祝您生活愉快/.test(value) ||
    /请问.*还有.*问题.*咨询吗|还有其他问题咨询吗|还有其它问题咨询吗|仍有问题需要咨询|再次上线联系/.test(compact) ||
    /^(您好|你好|不客气|好的?|可以的?)[。！!]*$/.test(compact)
  );
}

function isSubstantive(turn: MessageTurn): boolean {
  const value = text(turn.text);
  return !isLowValue(turn) && (value.length >= 6 || /怎么|为什么|操作|确认|订单|入库|标签|箱唛|异常|处理/.test(value));
}

function requestType(query: string, keywords: string[]): "recap" | "how_to" | "fact_check" | "outcome" {
  const value = `${query} ${keywords.join(" ")}`;
  if (/处理了吗|有没有结果|结果如何|进度|完成了吗|已处理/.test(value)) return "outcome";
  if (/怎么|如何|操作|怎么办|步骤|处理方式/.test(value)) return "how_to";
  if (/是否|有没有|能否|可以吗|是不是|确认/.test(value)) return "fact_check";
  return "recap";
}

function attachmentIntent(query: string): AttachmentIntent {
  if (!/图片|照片|截图|附件|文件|文档|视频|音频|语音|录音/.test(query)) return "none";
  if (
    /给我|发我|查看|打开|下载|链接/.test(query) ||
    /(?:图片|照片|截图|附件|文件|文档|视频|音频|语音|录音).{0,8}(?:是什么|哪张|哪个|内容|具体内容)/.test(query)
  ) {
    return "deliver";
  }
  return "check";
}

function attachmentRoleFilter(query: string): AttachmentRoleFilter {
  if (/(?:我|客户)(?:自己)?(?:给|向)?(?:客服|人工|坐席).{0,12}(?:发|传|上传)/.test(query)) return "customer";
  if (/(?:客服|人工|坐席|服务人员)(?:给我|向我|发给我|发送给我|传给我|上传给我|发我的|发送我的)/.test(query)) return "agent";
  if (/(?:客服|人工|坐席|服务人员)(?:之前|上次|曾|曾经|有|是否|有没有)?(?:发过|发送过|传过|上传过|发的|发送的|传的|上传的|的图片|的附件)/.test(query)) return "agent";
  if (/(?:我|客户)(?:自己)?(?:发|传|上传)(?:的)?(?:图片|照片|截图|附件|文件|文档|视频|音频|语音|录音)?/.test(query)) return "customer";
  return "any";
}

function attachmentTypes(query: string): AttachmentType[] {
  const out: AttachmentType[] = [];
  const hasSpecificType = /图片|照片|截图|文件|文档|视频|音频|语音|录音/.test(query);
  if (/附件/.test(query) && !hasSpecificType) return out;
  if (/图片|照片|截图/.test(query)) out.push("image");
  if (/文件|文档/.test(query)) out.push("file");
  if (/视频/.test(query)) out.push("video");
  if (/音频|语音|录音/.test(query)) out.push("audio");
  return out;
}

function keywordHit(turn: MessageTurn, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const value = `${text(turn.text)} ${text(turn.speaker)}`.toLowerCase();
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

function conversationId(turn: MessageTurn, index: number): string {
  return text(turn.conversationId) || text(turn.recordId) || `unknown-${index}`;
}

function truncate(value: string): { text: string; textTruncated: boolean } {
  if (value.length <= MAX_EVIDENCE_TEXT_CHARS) return { text: value, textTruncated: false };
  return { text: `${value.slice(0, MAX_EVIDENCE_TEXT_CHARS)}…`, textTruncated: true };
}

function latestConversationId(entries: TurnEntry[]): string {
  const lastByConversation = new Map<string, string>();
  for (const entry of entries) {
    const timestamp = text(entry.turn.timestamp);
    if (!lastByConversation.has(entry.conversationId) || timestamp > String(lastByConversation.get(entry.conversationId))) {
      lastByConversation.set(entry.conversationId, timestamp);
    }
  }
  return [...lastByConversation.entries()].sort((a, b) => b[1].localeCompare(a[1]))[0]?.[0] ?? "";
}

function selectSpecificEvidenceEntries(entries: TurnEntry[], keywords: string[]): TurnEntry[] {
  if (keywords.length === 0) return entries;
  const byConversation = new Map<string, TurnEntry[]>();
  for (const entry of entries) {
    const group = byConversation.get(entry.conversationId) ?? [];
    group.push(entry);
    byConversation.set(entry.conversationId, group);
  }

  const selectedIndexes = new Set<number>();
  for (const group of byConversation.values()) {
    const hitIndexes = group
      .map((entry, index) => (keywordHit(entry.turn, keywords) ? index : -1))
      .filter((index) => index >= 0);
    if (hitIndexes.length === 0) continue;
    for (const hitIndex of hitIndexes) {
      for (const offset of [-1, 0, 1]) {
        const entry = group[hitIndex + offset];
        if (entry) selectedIndexes.add(entry.index);
      }
    }
    const finalAgent = [...group].reverse().find((entry) => text(entry.turn.role) === "agent");
    if (finalAgent) selectedIndexes.add(finalAgent.index);
  }
  return entries.filter((entry) => selectedIndexes.has(entry.index));
}

function attachmentId(entry: TurnEntry): string {
  return `att-${entry.conversationId}-${text(entry.turn.timestamp).replace(/[^0-9]/g, "") || entry.index}-${entry.index + 1}`;
}

function attachmentLabel(type: AttachmentType): string {
  return type === "image" ? "图片" : type === "file" ? "文件" : type === "video" ? "视频" : "音频";
}

function attachmentMatches(entry: TurnEntry, types: AttachmentType[], roleFilter: AttachmentRoleFilter): boolean {
  if (!entry.attachment) return false;
  if (types.length > 0 && !types.includes(entry.attachment.type)) return false;
  return roleFilter === "any" || text(entry.turn.role) === roleFilter;
}

function attachmentFact(entry: TurnEntry): AttachmentFact | undefined {
  if (!entry.attachment) return undefined;
  return {
    id: attachmentId(entry),
    conversationId: entry.conversationId,
    timestamp: text(entry.turn.timestamp),
    role: text(entry.turn.role) || "other",
    speaker: text(entry.turn.speaker),
    type: entry.attachment.type,
    linkAvailable: Boolean(entry.attachment.url),
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const turns = Array.isArray(params.messageTurns) ? (params.messageTurns as MessageTurn[]) : [];
  const scope = (params.queryScope && typeof params.queryScope === "object" ? params.queryScope : {}) as QueryScope;
  const query = text(params.query);
  const keywords = Array.isArray(scope.keywords) ? scope.keywords.map(text).filter(Boolean) : [];
  const type = requestType(query, keywords);
  const requestedAttachmentIntent = attachmentIntent(query);
  const requestedAttachmentRole = attachmentRoleFilter(query);
  const requestedAttachmentTypes = attachmentTypes(query);
  const scopedEntries = turns
    .filter((turn) => inWindow(turn, scope))
    .map((turn, index) => ({ turn, index, conversationId: conversationId(turn, index), attachment: parseAttachment(turn) }));
  const substantiveEntries = scopedEntries.filter((entry) => isSubstantive(entry.turn));
  const attachmentEntries = scopedEntries.filter((entry) => Boolean(entry.attachment));
  const useLatestConversation = type === "recap" && keywords.length === 0;
  const latestId = useLatestConversation
    ? latestConversationId(substantiveEntries.length > 0 ? substantiveEntries : attachmentEntries)
    : "";
  let selectedContentEntries = useLatestConversation
    ? substantiveEntries.filter((entry) => entry.conversationId === latestId)
    : selectSpecificEvidenceEntries(substantiveEntries, keywords);
  let selectedConversationIds = new Set(selectedContentEntries.map((entry) => entry.conversationId));
  if (selectedConversationIds.size === 0 && requestedAttachmentIntent !== "none") {
    for (const entry of attachmentEntries.filter((item) => attachmentMatches(item, requestedAttachmentTypes, requestedAttachmentRole))) {
      selectedConversationIds.add(entry.conversationId);
    }
  }
  if (selectedConversationIds.size === 0 && latestId) selectedConversationIds = new Set([latestId]);

  const candidateEntries = scopedEntries
    .filter((entry) => selectedConversationIds.has(entry.conversationId) && (isSubstantive(entry.turn) || entry.attachment))
    .sort((a, b) => text(a.turn.timestamp).localeCompare(text(b.turn.timestamp)));
  const selectedAttachmentEntries = attachmentEntries
    .filter((entry) => selectedConversationIds.has(entry.conversationId))
    .sort((a, b) => text(a.turn.timestamp).localeCompare(text(b.turn.timestamp)));

  const evidence: Evidence[] = [];
  const evidenceAttachmentIds = new Set<string>();
  let characterCount = 0;
  let evidenceOverBudget = false;
  for (const entry of candidateEntries) {
    const attachment = entry.attachment;
    const sourceText = attachment
      ? `${text(entry.turn.speaker) || "沟通方"}发送了 1 个${attachmentLabel(attachment.type)}`
      : text(entry.turn.text);
    const shortened = truncate(sourceText);
    const nextSize = characterCount + shortened.text.length;
    if (nextSize > MAX_EVIDENCE_CHARS) {
      evidenceOverBudget = true;
      break;
    }
    const id = attachment ? attachmentId(entry) : `e-${entry.conversationId}-${text(entry.turn.timestamp).replace(/[^0-9]/g, "") || entry.index}-${entry.index + 1}`;
    evidence.push({
      id,
      conversationId: entry.conversationId,
      timestamp: text(entry.turn.timestamp),
      role: text(entry.turn.role) || "other",
      speaker: text(entry.turn.speaker),
      text: shortened.text,
      textTruncated: shortened.textTruncated,
      kind: attachment ? "attachment" : "message",
      ...(attachment ? { attachmentType: attachment.type } : {}),
    });
    if (attachment) evidenceAttachmentIds.add(id);
    characterCount = nextSize;
  }

  const records = (params.humanServiceRecords && typeof params.humanServiceRecords === "object"
    ? params.humanServiceRecords
    : {}) as { recordsTruncated?: unknown; fetchStatus?: unknown };
  const recordsTruncated = records.recordsTruncated === true;
  const sourceCompleteness = recordsTruncated ? "partial_source" : "complete";
  const evidenceCompleteness = evidenceOverBudget || evidence.length < scopedEntries.length ? "relevant_subset" : "complete";
  const dataCompleteness = sourceCompleteness === "partial_source" ? "partial_source" : evidenceCompleteness;
  const attachmentScanComplete = sourceCompleteness === "complete";
  const automaticAttachmentDelivery = requestedAttachmentIntent === "none" && evidenceAttachmentIds.size > 0;
  const deliveryIntent: AttachmentIntent = automaticAttachmentDelivery ? "summary_auto" : requestedAttachmentIntent;
  const matchingAttachmentEntries = selectedAttachmentEntries.filter((entry) =>
    attachmentMatches(entry, requestedAttachmentTypes, requestedAttachmentRole) &&
    (deliveryIntent !== "summary_auto" || evidenceAttachmentIds.has(attachmentId(entry)))
  );
  const deliveryAttachments: AttachmentDeliveryItem[] = [];
  let deliveryLinkCharacterCount = 0;
  let deliveryTruncated = false;
  const deliveryLimit = deliveryIntent === "summary_auto" ? MAX_AUTO_DELIVERY_ATTACHMENTS : MAX_DELIVERY_ATTACHMENTS;
  if (deliveryIntent === "deliver" || deliveryIntent === "summary_auto") {
    for (const entry of [...matchingAttachmentEntries].reverse()) {
      const fact = attachmentFact(entry);
      if (!fact || !entry.attachment) continue;
      if (!entry.attachment.url) continue;
      const nextSize = deliveryLinkCharacterCount + entry.attachment.url.length;
      if (deliveryAttachments.length >= deliveryLimit || nextSize > MAX_DELIVERY_LINK_CHARS) {
        deliveryTruncated = true;
        break;
      }
      deliveryAttachments.push({ ...fact, url: entry.attachment.url });
      deliveryLinkCharacterCount = nextSize;
    }
    deliveryAttachments.reverse();
  }

  const selectedConversationIdList = [...selectedConversationIds];
  const answerStatus = records.fetchStatus && records.fetchStatus !== "ok"
    ? text(records.fetchStatus)
    : scopedEntries.length === 0
      ? "no_records"
      : evidence.length === 0 && matchingAttachmentEntries.length === 0
        ? "no_match"
        : "found";

  return {
    summaryEvidence: {
      requestType: type,
      answerStatus,
      matchedConversationCount: selectedConversationIdList.length,
      matchedMessageCount: scopedEntries.length,
      evidenceConversationCount: [...new Set(evidence.map((item) => item.conversationId))].length,
      evidenceMessageCount: evidence.length,
      dataCompleteness,
      sourceCompleteness,
      evidenceCompleteness,
      attachmentScanComplete,
      attachmentIntent: deliveryIntent,
      attachmentRoleFilter: requestedAttachmentRole,
      attachmentTypes: requestedAttachmentTypes,
      attachmentEvidence: selectedAttachmentEntries
        .map(attachmentFact)
        .filter((item): item is AttachmentFact => item !== undefined)
        .filter((item) => evidenceAttachmentIds.has(item.id)),
      evidenceCharacterCount: characterCount,
      evidence,
    },
    attachmentDelivery: {
      intent: deliveryIntent,
      roleFilter: requestedAttachmentRole,
      types: requestedAttachmentTypes,
      attachmentScanComplete,
      matchingAttachmentCount: matchingAttachmentEntries.length,
      availableAttachmentCount: matchingAttachmentEntries.filter((entry) => Boolean(entry.attachment?.url)).length,
      deliveryTruncated,
      deliveryLinkCharacterCount,
      events: matchingAttachmentEntries
        .slice(-3)
        .map(attachmentFact)
        .filter((item): item is AttachmentFact => item !== undefined),
      attachments: deliveryAttachments,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-summary-evidence")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
