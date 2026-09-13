/**
 * Pre-lookup exception name/object before LLM scene classification.
 * Priority: inline hints → process cache → OMS UnusualEvent API → known table → not_found.
 */

import { asArray, asRecord, asText } from "./oms-adapter.ts";
import { getOrCreateTomClient, type TomClient } from "./oms-tom-client.ts";

export interface ExceptionInfo {
  ebNo: string;
  exceptionName: string;
  exceptionObject: string;
  source: "inline" | "cache" | "oms_api" | "api" | "not_found" | "known_table";
}

/** Golden / known EB → name+object. OMS 查不到时的兜底，不删。 */
const KNOWN_EXCEPTIONS: Record<string, { name: string; object: string }> = {
  // VASC000000311652 — 商品条码异常；仅当客户明确「不换商品标签/只换箱唛」才可走场景 1
  EB0126070130941754: { name: "商品条码异常(需客户处理)", object: "商品" },
  EB0126070130941397: { name: "商品条码异常(需客户处理)", object: "商品" },
  // VASC000000315774 — 任务提示 / 需求语境
  EB0126060330032532: { name: "包裹条码批量异常(需客户处理)", object: "包裹" },
  // VASC000000298617 — oms_facts_b events.eventName
  EB0326061230366501: { name: "包裹内出现订单外商品", object: "商品" },
  // 同单另一 EB：详情库未独立命中 eventName，按同单 sibling 对齐（数据验证弱）
  EB0326061230362709: { name: "包裹内出现订单外商品", object: "商品" },
  // VASC000000326061 — demo_all.details.json events
  EB0326072531612017: { name: "包裹内出现订单外商品", object: "商品" },
  // VASC000000305805 / EB0126060830209943：现有 cache/details 无 eventName → 不写入表
};

const OMS_GAP_MS = 500;
const exceptionCache = new Map<string, ExceptionInfo>();
let lastOmsAt = 0;

export type InlineExceptionHint = {
  ebNo?: string;
  exceptionName?: string;
  exceptionObject?: string;
  eventName?: string;
  eventObj?: string;
};

export type ExceptionLookupDeps = {
  queryDetail?: (client: TomClient, ebNo: string) => Promise<{ exceptionName: string; exceptionObject: string }>;
  getClient?: () => Promise<TomClient>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRows(info: unknown): Record<string, unknown>[] {
  if (Array.isArray(info)) return info.map(asRecord);
  const rec = asRecord(info);
  for (const key of ["content", "data", "rows"]) {
    if (Array.isArray(rec[key])) return asArray(rec[key]).map(asRecord);
  }
  return [];
}

function hiddenField(html: string, fieldId: string): string {
  const a = html.match(new RegExp(`id="${fieldId}"[^>]*value="([^"]*)"`, "i"));
  if (a?.[1]) return a[1].trim();
  const b = html.match(new RegExp(`value="([^"]*)"[^>]*id="${fieldId}"`, "i"));
  return (b?.[1] || "").trim();
}

function nameAndObjectFromRow(row: Record<string, unknown>): { exceptionName: string; exceptionObject: string } {
  const exceptionName =
    asText(row.eventName) || asText(row.exceptionName) || asText(row.eventAttributeName);
  const exceptionObject =
    asText(row.eventObj) ||
    asText(row.exceptionObjectName) ||
    asText(row.exceptionObject) ||
    asText(row.eventObject);
  return { exceptionName, exceptionObject };
}

export async function queryExceptionDetail(
  client: TomClient,
  ebNo: string,
): Promise<{ exceptionName: string; exceptionObject: string }> {
  const data = await client.ajaxUnusualEvent("oms.UnusualEventOrderService_findUnusualEventOrderPage", {
    draw: "1",
    start: "0",
    length: "5",
    where: { unusualEventOrderVo: { eventNo: ebNo } },
  });
  const rows = pickRows(data.info);
  const hit =
    rows.find((row) => asText(row.eventNo).toUpperCase() === ebNo.toUpperCase()) || rows[0] || {};
  let parsed = nameAndObjectFromRow(hit);
  if (parsed.exceptionName) return parsed;

  const html = await client.getPage(`/UnusualEvent/detail/eventNo/${ebNo}`);
  parsed = {
    exceptionName: hiddenField(html, "eventName"),
    exceptionObject: hiddenField(html, "eventObj") || hiddenField(html, "exceptionObject"),
  };
  if (!parsed.exceptionName) {
    throw new Error(`OMS 未返回 ${ebNo} 的异常名称`);
  }
  return parsed;
}

function knownFallback(ebNo: string): ExceptionInfo {
  const known = KNOWN_EXCEPTIONS[ebNo];
  if (known) {
    return { ebNo, exceptionName: known.name, exceptionObject: known.object, source: "known_table" };
  }
  return { ebNo, exceptionName: "", exceptionObject: "", source: "not_found" };
}

async function lookupOne(
  ebNo: string,
  hint: InlineExceptionHint | undefined,
  deps: ExceptionLookupDeps,
): Promise<ExceptionInfo> {
  const inlineName = asText(hint?.exceptionName || hint?.eventName);
  const inlineObj = asText(hint?.exceptionObject || hint?.eventObj);
  if (inlineName) {
    return { ebNo, exceptionName: inlineName, exceptionObject: inlineObj, source: "inline" };
  }

  const cached = exceptionCache.get(ebNo);
  if (cached) return { ...cached, source: cached.source === "oms_api" ? "cache" : cached.source };

  const query = deps.queryDetail || queryExceptionDetail;
  const getClient = deps.getClient || getOrCreateTomClient;
  try {
    const wait = OMS_GAP_MS - (Date.now() - lastOmsAt);
    if (wait > 0) await sleep(wait);
    lastOmsAt = Date.now();
    const client = await getClient();
    const detail = await query(client, ebNo);
    const info: ExceptionInfo = {
      ebNo,
      exceptionName: asText(detail.exceptionName),
      exceptionObject: asText(detail.exceptionObject),
      source: "oms_api",
    };
    if (!info.exceptionName) return knownFallback(ebNo);
    exceptionCache.set(ebNo, info);
    return info;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`exception-lookup OMS 失败 ${ebNo}：${msg}`);
    return knownFallback(ebNo);
  }
}

export async function lookupExceptions(
  ebNos: string[],
  inlineHints?: InlineExceptionHint[],
  deps: ExceptionLookupDeps = {},
): Promise<ExceptionInfo[]> {
  const hintByEb = new Map<string, InlineExceptionHint>();
  for (const h of inlineHints || []) {
    const eb = asText(h.ebNo);
    if (eb) hintByEb.set(eb, h);
  }
  const out: ExceptionInfo[] = [];
  for (const raw of ebNos) {
    const ebNo = String(raw || "").trim();
    if (!ebNo) continue;
    out.push(await lookupOne(ebNo, hintByEb.get(ebNo), deps));
  }
  return out;
}

export async function preloadExceptions(ebNos: string[], deps: ExceptionLookupDeps = {}): Promise<ExceptionInfo[]> {
  return lookupExceptions(ebNos, undefined, deps);
}

export function clearExceptionCache(): void {
  exceptionCache.clear();
}

/** Format for LLM user message (含批量提示). */
export function formatExceptionDetails(infos: ExceptionInfo[]): string {
  if (!infos.length) {
    return "- 异常单详情未查到，请仅根据客户需求描述判断";
  }
  const found = infos.filter((i) => i.exceptionName);
  if (!found.length) {
    const nos = infos.map((i) => i.ebNo).join("、");
    return `- 异常单详情未查到（已尝试：${nos || "无"}），请仅根据客户需求描述判断`;
  }

  const lines = found.map(
    (i) =>
      `- ${i.ebNo}：异常名称=${i.exceptionName}，异常对象=${i.exceptionObject || "未知"}（来源=${i.source}）`,
  );
  const missing = infos.filter((i) => !i.exceptionName);
  for (const m of missing) {
    lines.push(`- ${m.ebNo}：异常详情未查到`);
  }

  const names = found.map((i) => i.exceptionName);
  const unique = [...new Set(names)];
  if (found.length >= 2 && unique.length === 1) {
    lines.push(`- 共 ${found.length} 个异常单，异常名称相同（${unique[0]}）`);
  } else if (found.length >= 2) {
    lines.push(`- 共 ${found.length} 个异常单，异常名称不完全相同`);
  }
  if (found.some((i) => /商品条码异常/.test(i.exceptionName) && !/包裹条码批量异常/.test(i.exceptionName))) {
    lines.push("- 注意：商品条码异常必须按换商品标签（场景5）判断，不要改判包裹条码批量异常");
  }
  return lines.join("\n");
}

export function getKnownExceptionTable(): typeof KNOWN_EXCEPTIONS {
  return { ...KNOWN_EXCEPTIONS };
}
