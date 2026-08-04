/**
 * 合并 `queryOutboundOrderList` 批处理结果，直接产出 rawOrderData
 * 约定：
 * - WO 主单动作（outboundOrderNum）优先级最高
 * - 模糊单号动作顺序：trackingNo 命中优先，sellerOrderNo 兜底
 */

function mergeParseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    const once = JSON.parse(data) as unknown;
    if (typeof once === "string") {
      try {
        return JSON.parse(once) as unknown;
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return data;
  }
}

function mergeCoerceListPayload(parsed: unknown): { list?: Array<Record<string, unknown>> } {
  if (parsed == null) {
    return { list: [] };
  }
  if (typeof parsed !== "object") {
    return { list: [] };
  }
  const o = parsed as Record<string, unknown>;

  if (o.output != null && typeof o.output === "object") {
    return mergeCoerceListPayload(o.output);
  }

  if (o.code === "0" || o.code === 0) {
    const inner = o.data;
    if (inner != null && typeof inner === "string") {
      try {
        return mergeCoerceListPayload(JSON.parse(inner) as unknown);
      } catch {
        return { list: [] };
      }
    }
    if (inner != null && typeof inner === "object") {
      return mergeCoerceListPayload(inner);
    }
    return { list: [] };
  }

  if (Array.isArray(o.list)) {
    return { list: o.list as Array<Record<string, unknown>> };
  }

  if (o.outboundOrderNum != null || o.outboundOrderNo != null) {
    return { list: [o as Record<string, unknown>] };
  }

  return { list: [] };
}

function mergeNormalizeWoMainOrderNum(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const m = /^WO(\d+)[A-Za-z]*$/i.exec(s);
  if (m) return `WO${m[1]}`;
  return s;
}

function mergeNormalizeTokens(nos: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of nos) {
    const raw = String(n).trim();
    if (!raw) continue;
    const c = /^WO\d+/i.test(raw) ? mergeNormalizeWoMainOrderNum(raw) : raw;
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function mergeOrderKeyFromRow(row: Record<string, unknown>): string {
  return mergeNormalizeWoMainOrderNum(String(row.outboundOrderNum ?? row.documentNo ?? "").trim());
}

function mergeNormalizeOrderAliases(order: Record<string, unknown>): Record<string, unknown> {
  const doc = order.documentNo;
  const hasOut =
    order.outboundOrderNum != null && String(order.outboundOrderNum).trim() !== "";
  if (!hasOut && doc != null && String(doc).trim() !== "") {
    return { ...order, outboundOrderNum: String(doc).trim() };
  }
  return order;
}

function asOutputList(raw: unknown): Array<{ data?: unknown }> {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  return raw as Array<{ data?: unknown }>;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawNos = ((params.outboundOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const requested = mergeNormalizeTokens(rawNos);

  type ActionPlan = {
    inputToken: string;
    queryBy: "outboundOrderNum" | "trackingNo" | "sellerOrderNo";
  };
  const actionPlans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as ActionPlan[];
  const outputList = asOutputList(params.winitPluginOutputList);

  const priority = (q: ActionPlan["queryBy"]): number => {
    if (q === "outboundOrderNum") return 3;
    if (q === "trackingNo") return 2;
    return 1;
  };

  const bestByToken = new Map<
    string,
    {
      priority: number;
      rowsByKey: Map<string, Record<string, unknown>>;
    }
  >();

  for (let i = 0; i < outputList.length; i++) {
    const item = outputList[i];
    const plan = actionPlans[i];
    if (!plan) continue;

    const token = plan.inputToken?.trim();
    if (!token) continue;

    const slot = item?.data;
    if (slot == null) continue;
    const str = String(slot).trim();
    if (!str) continue;

    const parsed = mergeParseCozeWorkflowDataField(slot);
    const chunk = mergeCoerceListPayload(parsed);
    const rows = (chunk.list ?? []).filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    if (rows.length === 0) continue;

    const p = priority(plan.queryBy);
    const prev = bestByToken.get(token);
    if (!prev || p > prev.priority) {
      bestByToken.set(token, { priority: p, rowsByKey: new Map<string, Record<string, unknown>>() });
    } else if (p < prev.priority) {
      continue;
    }

    const holder = bestByToken.get(token)!;
    for (const row of rows) {
      const aliased = mergeNormalizeOrderAliases(row);
      const key = mergeOrderKeyFromRow(aliased);
      if (!key) continue;
      if (!holder.rowsByKey.has(key)) holder.rowsByKey.set(key, aliased);
    }
  }

  const outList: Record<string, unknown>[] = [];
  const globalKeys = new Set<string>();
  for (const token of requested) {
    const entry = bestByToken.get(token);
    if (!entry) continue;
    for (const [k, row] of entry.rowsByKey.entries()) {
      if (globalKeys.has(k)) continue;
      globalKeys.add(k);
      outList.push(row);
    }
  }

  return {
    rawOrderData: {
      list: outList,
      total: outList.length,
      currentPageNum: 1,
      currentPageSize: outList.length,
      _fetchMeta: {
        strategy: "list-only",
        batchPluginMerged: true,
        requestedTokenCount: requested.length,
        actionPlanCount: actionPlans.length,
        pluginBatchOutputCount: outputList.length,
        resolvedCount: outList.length,
      },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-winit-outbound-plugin-batch")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
