/**
 * 合并 getOrderDetail 批处理插件结果 → rawOrderData
 */

function parseCozeWorkflowDataField(data: unknown): unknown {
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

function coerceDetailPayload(parsed: unknown): Record<string, unknown> | null {
  if (parsed == null || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;

  if (o.output != null && typeof o.output === "object") {
    return coerceDetailPayload(o.output);
  }

  if (o.code === "0" || o.code === 0) {
    const inner = o.data;
    if (typeof inner === "string") {
      try {
        return coerceDetailPayload(JSON.parse(inner) as unknown);
      } catch {
        return null;
      }
    }
    if (inner != null && typeof inner === "object") {
      return coerceDetailPayload(inner);
    }
    return null;
  }

  if (o.orderNo != null || o.inboundOrderNum != null || o.inboundOrderNo != null) {
    return o;
  }

  return null;
}

function orderKeyFromRow(row: Record<string, unknown>): string {
  return String(row.orderNo ?? row.inboundOrderNum ?? row.inboundOrderNo ?? "").trim().toUpperCase();
}

function asOutputList(raw: unknown): Array<{ data?: unknown }> {
  if (!Array.isArray(raw)) return [];
  return raw as Array<{ data?: unknown }>;
}

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.skipApi === true) {
    return {
      rawOrderData: {
        list: [],
        total: 0,
        _fetchMeta: { strategy: "kb-only", skipApi: true },
      },
    };
  }

  type ActionPlan = { inputToken: string; queryBy: "orderNo" | "customerOrderNo" };
  const actionPlans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as ActionPlan[];
  const outputList = asOutputList(params.winitPluginOutputList);

  const rowsByKey = new Map<string, Record<string, unknown>>();
  const multipleMatchWarnings: string[] = [];

  for (let i = 0; i < outputList.length; i++) {
    const item = outputList[i];
    const plan = actionPlans[i];
    if (!item?.data) continue;

    const parsed = parseCozeWorkflowDataField(item.data);
    const row = coerceDetailPayload(parsed);
    if (!row) continue;

    const key = orderKeyFromRow(row);
    if (!key) continue;

    if (rowsByKey.has(key)) {
      multipleMatchWarnings.push(plan?.inputToken ?? key);
    }
    rowsByKey.set(key, row);
  }

  const list = Array.from(rowsByKey.values());

  return {
    rawOrderData: {
      list,
      total: list.length,
      currentPageNum: 1,
      currentPageSize: list.length,
      _fetchMeta: {
        strategy: "detail-only",
        batchPluginMerged: true,
        actionPlanCount: actionPlans.length,
        pluginBatchOutputCount: outputList.length,
        resolvedCount: list.length,
        multipleMatchWarning: multipleMatchWarnings.length > 0 ? multipleMatchWarnings : undefined,
      },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-winit-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
