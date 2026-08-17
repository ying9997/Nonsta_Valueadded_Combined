/**
 * 节点：在 id/54 已定位订单后，按需为 id/55 `queryOutboundOrder` 生成批处理动作。
 *
 * 【输入】rawOrderData、query、customerIntent
 * 【输出】actions、actionPlans、carrierDetailActionsCount
 */

type CarrierDetailActionPlan = {
  outboundOrderNum: string;
};

function normalizeWoMainOrderNum(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const match = /^WO(\d+)[A-Za-z]*$/i.exec(value);
  return match ? `WO${match[1]}` : value;
}

function asOrderList(raw: unknown): Array<Record<string, unknown>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const list = (raw as Record<string, unknown>).list;
  return Array.isArray(list)
    ? list.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
}

function hasActualCarrier(order: Record<string, unknown>): boolean {
  if (String(order.carrier ?? "").trim()) return true;
  const packages = Array.isArray(order.packageList) ? order.packageList : [];
  return packages.some(
    (item) => item && typeof item === "object" && String((item as Record<string, unknown>).carrier ?? "").trim()
  );
}

function isCarrierIntent(query: unknown, customerIntent: unknown): boolean {
  const text = `${String(query ?? "")} ${String(customerIntent ?? "")}`.toLowerCase();
  return /(承运商|派送商|渠道商|快递公司|物流商|carrier|courier|delivery provider)/i.test(text);
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orders = asOrderList(params.rawOrderData);
  const explicitCarrierIntent = isCarrierIntent(params.query, params.customerIntent);
  const seen = new Set<string>();
  const actionPlans: CarrierDetailActionPlan[] = [];

  for (const order of orders) {
    if (!explicitCarrierIntent && hasActualCarrier(order)) continue;
    const rawOrderNo = String(order.outboundOrderNum ?? order.documentNo ?? order.orderNo ?? "");
    const outboundOrderNum = normalizeWoMainOrderNum(rawOrderNo);
    if (!/^WO\d+$/i.test(outboundOrderNum)) continue;
    const key = outboundOrderNum.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    actionPlans.push({ outboundOrderNum });
  }

  const actions = actionPlans.map(({ outboundOrderNum }) => ({
    action: "queryOutboundOrder",
    data: JSON.stringify({ outboundOrderNum }),
  }));

  return {
    actions,
    actionPlans,
    carrierDetailActionsCount: actions.length,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-carrier-detail-winit")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

