import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { asArray, asRecord, asText } from "./oms-adapter.ts";
import { projectDir } from "./env.ts";
import type { JsonRecord } from "./types.ts";

export type ReplyClosureBucket =
  | "excluded_cancelled"
  | "l2_scene_recognition"
  | "required_rule_gap"
  | "context_fact_gap"
  | "rule_nuance"
  | "multi_turn_context_gap"
  | "not_actionable"
  | "unknown";

export type LinkStrategy = "event_no" | "customer_after_trace" | "none";
export type GoldCaseRole = "excluded" | "regression" | "non_actionable" | "candidate";

export interface ReplyClosureOrder {
  orderNo: string;
  customerCode: string;
  statusDesc: string;
  isAuditThrough: string;
  createdAtMs: number;
  eventNos: string[];
  sceneName: string;
  sceneKey?: string;
  missingFields?: string[];
}

export interface ReplyClosureTrace {
  createdAtMs: number;
  eventCode: string;
  eventContent: string;
  supplementDesc: string;
}

export interface ReplyClosureCaseInput {
  original: ReplyClosureOrder;
  aiSceneName: string;
  aiMissingItems: string[];
  trace?: ReplyClosureTrace | null;
  candidateOrders?: ReplyClosureOrder[];
  humanFinalSceneName?: string;
  humanMissingItems?: string[];
  auditorReply?: string;
  notActionable?: boolean;
  bucketOverride?: ReplyClosureBucket;
  enterOptimizationLoop?: boolean;
  goldCaseRole?: GoldCaseRole;
  nextTaskNo?: string;
  nextTaskReason?: string;
  note?: string;
}

export interface ReplyClosureEntry {
  type: "reply_reassessment_closure";
  vascNo: string;
  at: string;
  bucket: ReplyClosureBucket;
  excluded: boolean;
  enterOptimizationLoop: boolean;
  goldCaseRole: GoldCaseRole;
  nextTaskNo: string;
  nextTaskReason: string;
  linkStrategy: LinkStrategy;
  linkedOrderNo: string;
  aiSceneName: string;
  humanSceneName: string;
  sceneMatched: boolean | null;
  aiMissingItems: string[];
  humanMissingItems: string[];
  missingItemDiff: {
    aiOnly: string[];
    humanOnly: string[];
    overlap: string[];
  };
  evidence: {
    originalStatusDesc: string;
    originalIsAuditThrough: string;
    customerCode: string;
    traceEventCode: string;
    traceEventContent: string;
    traceSupplementDesc: string;
    auditorReply: string;
    note: string;
  };
}

function dayStamp(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
}

export function replyClosureLogPath(day = dayStamp()): string {
  return resolve(projectDir(), `_runs/${day}_reply_closure`, "reply-closure-log.jsonl");
}

export function appendReplyClosure(entry: ReplyClosureEntry, path = replyClosureLogPath()): string {
  mkdirSync(resolve(path, ".."), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
  return path;
}

export function uniqueTexts(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function parseOmsTimeMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asText(value);
  if (!text) return 0;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? text.replace(" ", "T") + "+08:00"
    : text;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : 0;
}

export function eventNosFromUnknown(value: unknown): string[] {
  const blob = JSON.stringify(value || {}).toUpperCase();
  return uniqueTexts(blob.match(/EB\d{6,}/g) || []);
}

export function orderFromOms(headerRaw: unknown, atomsRaw: unknown[] = [], eventsRaw: unknown[] = []): ReplyClosureOrder {
  const header = asRecord(headerRaw);
  const customer = asRecord(header.customer);
  const atom = asArray(atomsRaw).map(asRecord).find((item) => asText(item.orderNo) === asText(header.orderNo)) || asRecord(atomsRaw[0]);
  return {
    orderNo: asText(header.orderNo) || asText(atom.orderNo),
    customerCode: asText(header.customerCode) || asText(customer.customerCode),
    statusDesc: asText(header.statusDesc) || asText(header.status) || asText(atom.statusDesc) || asText(atom.status),
    isAuditThrough: asText(header.isAuditThrough) || asText(atom.isAuditThrough),
    createdAtMs: parseOmsTimeMs(header.created) || parseOmsTimeMs(header.orderDate) || parseOmsTimeMs(atom.created),
    eventNos: uniqueTexts([
      ...eventNosFromUnknown(header),
      ...eventNosFromUnknown(atom),
      ...eventNosFromUnknown(eventsRaw),
    ]),
    sceneName: asText(atom.sceneOverviewName),
  };
}

export function traceFromOms(raw: unknown): ReplyClosureTrace {
  const rec = asRecord(raw);
  return {
    createdAtMs: parseOmsTimeMs(rec.created) || parseOmsTimeMs(rec.createdStr) || parseOmsTimeMs(rec.createTime),
    eventCode: asText(rec.eventCode),
    eventContent: asText(rec.eventContent),
    supplementDesc: asText(rec.supplementDesc),
  };
}

export function isCancelledOrder(order: Pick<ReplyClosureOrder, "statusDesc">): boolean {
  return /取消/.test(order.statusDesc);
}

export function isAcceptedOrder(order: Pick<ReplyClosureOrder, "statusDesc" | "isAuditThrough" | "sceneName">): boolean {
  if (isCancelledOrder(order)) return false;
  if (order.isAuditThrough === "Y") return true;
  return /待客户确认|审核通过|已完成|完成/.test(order.statusDesc) && Boolean(order.sceneName);
}

export function selectLinkedAcceptedOrder(args: {
  original: ReplyClosureOrder;
  candidates: ReplyClosureOrder[];
  traceAtMs?: number;
}): { order: ReplyClosureOrder | null; strategy: LinkStrategy } {
  const accepted = args.candidates.filter((item) => item.orderNo !== args.original.orderNo && isAcceptedOrder(item));
  const eventNos = new Set(args.original.eventNos);
  if (eventNos.size) {
    const byEvent = accepted.find((item) => item.eventNos.some((eventNo) => eventNos.has(eventNo)));
    if (byEvent) return { order: byEvent, strategy: "event_no" };
  }

  const afterMs = args.traceAtMs || args.original.createdAtMs;
  const sameCustomerLater = accepted
    .filter((item) => item.customerCode && item.customerCode === args.original.customerCode)
    .filter((item) => !afterMs || !item.createdAtMs || item.createdAtMs >= afterMs)
    .sort((a, b) => (a.createdAtMs || Number.MAX_SAFE_INTEGER) - (b.createdAtMs || Number.MAX_SAFE_INTEGER));
  if (sameCustomerLater[0]) return { order: sameCustomerLater[0], strategy: "customer_after_trace" };
  return { order: null, strategy: "none" };
}

export function diffMissingItems(aiItems: string[], humanItems: string[]): ReplyClosureEntry["missingItemDiff"] {
  const ai = uniqueTexts(aiItems);
  const human = uniqueTexts(humanItems);
  const humanSet = new Set(human);
  const aiSet = new Set(ai);
  return {
    aiOnly: ai.filter((item) => !humanSet.has(item)),
    humanOnly: human.filter((item) => !aiSet.has(item)),
    overlap: ai.filter((item) => humanSet.has(item)),
  };
}

export function classifyReplyClosure(input: ReplyClosureCaseInput): ReplyClosureEntry {
  const linked = selectLinkedAcceptedOrder({
    original: input.original,
    candidates: input.candidateOrders || [],
    traceAtMs: input.trace?.createdAtMs,
  });
  const humanSceneName = input.humanFinalSceneName || linked.order?.sceneName || "";
  const sceneMatched = humanSceneName ? input.aiSceneName === humanSceneName : null;
  const diff = diffMissingItems(input.aiMissingItems, input.humanMissingItems || []);

  let bucket: ReplyClosureBucket = input.bucketOverride || "unknown";
  if (input.notActionable) {
    bucket = "not_actionable";
  } else if (bucket === "unknown" && isCancelledOrder(input.original) && !linked.order && !input.humanFinalSceneName) {
    bucket = "excluded_cancelled";
  } else if (bucket === "unknown" && sceneMatched === false) {
    bucket = "l2_scene_recognition";
  } else if (bucket === "unknown" && (diff.humanOnly.length || diff.aiOnly.length)) {
    bucket = "required_rule_gap";
  } else if (bucket === "unknown" && (linked.strategy !== "none" || input.trace?.supplementDesc || input.auditorReply)) {
    bucket = "context_fact_gap";
  } else if (bucket === "unknown") {
    bucket = "not_actionable";
  }
  const excluded = bucket === "excluded_cancelled";
  const enterOptimizationLoop =
    input.enterOptimizationLoop ?? (!excluded && bucket !== "not_actionable" && bucket !== "unknown");
  const goldCaseRole: GoldCaseRole =
    input.goldCaseRole || (excluded ? "excluded" : bucket === "not_actionable" ? "non_actionable" : "candidate");

  return {
    type: "reply_reassessment_closure",
    vascNo: input.original.orderNo,
    at: new Date().toISOString(),
    bucket,
    excluded,
    enterOptimizationLoop,
    goldCaseRole,
    nextTaskNo: input.nextTaskNo || "",
    nextTaskReason: input.nextTaskReason || "",
    linkStrategy: linked.strategy,
    linkedOrderNo: linked.order?.orderNo || "",
    aiSceneName: input.aiSceneName,
    humanSceneName,
    sceneMatched,
    aiMissingItems: uniqueTexts(input.aiMissingItems),
    humanMissingItems: uniqueTexts(input.humanMissingItems || []),
    missingItemDiff: diff,
    evidence: {
      originalStatusDesc: input.original.statusDesc,
      originalIsAuditThrough: input.original.isAuditThrough,
      customerCode: input.original.customerCode,
      traceEventCode: input.trace?.eventCode || "",
      traceEventContent: input.trace?.eventContent || "",
      traceSupplementDesc: input.trace?.supplementDesc || "",
      auditorReply: input.auditorReply || "",
      note: input.note || "",
    },
  };
}
