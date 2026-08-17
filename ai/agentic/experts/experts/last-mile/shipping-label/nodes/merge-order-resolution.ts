/** 合并订单定位结果，并保留原始输入到 WO 主单的映射。 */

const SHIPPING_LABEL_MAX_RESOLVED_ORDERS = 20;

type ResolutionPlan = {
  inputIdentifier: string;
  queryBy: "trackingNo" | "sellerOrderNo";
};

function shippingLabelMergeParse(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim();
  if (!value) return "";
  try {
    const once = JSON.parse(value) as unknown;
    if (typeof once === "string") {
      try {
        return JSON.parse(once) as unknown;
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return raw;
  }
}

function shippingLabelMergeNormalizeWo(raw: unknown): string {
  const value = String(raw ?? "").trim();
  const match = /^WO(\d+)[A-Za-z]*$/i.exec(value);
  return match ? `WO${match[1]}` : "";
}

function shippingLabelMergeRows(raw: unknown): Array<Record<string, unknown>> {
  const parsed = shippingLabelMergeParse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const object = parsed as Record<string, unknown>;
  if (object.output != null) return shippingLabelMergeRows(object.output);
  if (String(object.code ?? "") === "0" && object.data != null) {
    return shippingLabelMergeRows(object.data);
  }
  if (Array.isArray(object.list)) {
    return object.list.filter((row) => row && typeof row === "object") as Array<Record<string, unknown>>;
  }
  if (object.outboundOrderNum != null || object.outboundOrderNo != null || object.documentNo != null) {
    return [object];
  }
  return [];
}

function shippingLabelMergeOutputList(raw: unknown): Array<Record<string, unknown>> {
  return Array.isArray(raw)
    ? raw.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>
    : [];
}

async function main({ params }: { params: Record<string, unknown> }) {
  const requestedIdentifiers = Array.isArray(params.requestedIdentifiers)
    ? (params.requestedIdentifiers as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : [];
  const directOrders = Array.isArray(params.directOrders)
    ? params.directOrders as Array<Record<string, unknown>>
    : [];
  const actionPlans = Array.isArray(params.actionPlans)
    ? params.actionPlans as ResolutionPlan[]
    : [];
  const outputList = shippingLabelMergeOutputList(params.resolutionPluginOutputList);

  const byIdentifier = new Map<string, { trackingNo: string[]; sellerOrderNo: string[] }>();
  for (const identifier of requestedIdentifiers) {
    byIdentifier.set(identifier, { trackingNo: [], sellerOrderNo: [] });
  }

  for (let index = 0; index < actionPlans.length; index++) {
    const plan = actionPlans[index];
    if (!plan) continue;
    const item = outputList[index] ?? {};
    if (String(item.code ?? "0") !== "0") continue;
    const rows = shippingLabelMergeRows(item.data ?? item);
    const holder = byIdentifier.get(plan.inputIdentifier) ?? { trackingNo: [], sellerOrderNo: [] };
    const target = holder[plan.queryBy];
    for (const row of rows) {
      const orderNo = shippingLabelMergeNormalizeWo(
        row.outboundOrderNum ?? row.outboundOrderNo ?? row.documentNo
      );
      if (orderNo && !target.includes(orderNo)) target.push(orderNo);
    }
    byIdentifier.set(plan.inputIdentifier, holder);
  }

  const directByIdentifier = new Map<string, string[]>();
  for (const item of directOrders) {
    const inputIdentifier = String(item.inputIdentifier ?? "").trim();
    const orderNo = shippingLabelMergeNormalizeWo(item.orderNo);
    if (!inputIdentifier || !orderNo) continue;
    const list = directByIdentifier.get(inputIdentifier) ?? [];
    if (!list.includes(orderNo)) list.push(orderNo);
    directByIdentifier.set(inputIdentifier, list);
  }

  const orderMap = new Map<string, { orderNo: string; matchedFrom: string[] }>();
  const unresolvedIdentifiers: Array<{ identifier: string; reason: string }> = [];
  for (const identifier of requestedIdentifiers) {
    const direct = directByIdentifier.get(identifier) ?? [];
    const matches = byIdentifier.get(identifier);
    const selected = direct.length > 0
      ? direct
      : (matches?.trackingNo.length ?? 0) > 0
        ? matches!.trackingNo
        : matches?.sellerOrderNo ?? [];
    if (selected.length === 0) {
      unresolvedIdentifiers.push({ identifier, reason: "未匹配到出库订单" });
      continue;
    }
    for (const orderNo of selected) {
      const existing = orderMap.get(orderNo);
      if (existing) {
        if (!existing.matchedFrom.includes(identifier)) existing.matchedFrom.push(identifier);
      } else {
        orderMap.set(orderNo, { orderNo, matchedFrom: [identifier] });
      }
    }
  }

  const orders = [...orderMap.values()];
  return {
    resolution: {
      requestedIdentifiers,
      orders,
      unresolvedIdentifiers,
      resolvedOrderCount: orders.length,
      tooManyMatches: orders.length > SHIPPING_LABEL_MAX_RESOLVED_ORDERS,
      maxResolvedOrders: SHIPPING_LABEL_MAX_RESOLVED_ORDERS,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-order-resolution")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}

