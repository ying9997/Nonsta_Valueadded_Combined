/** 为非 WO 标识生成 trackingNo + sellerOrderNo 批处理查询。 */

type ResolutionPlan = {
  inputIdentifier: string;
  queryBy: "trackingNo" | "sellerOrderNo";
};

function shippingLabelNormalizeWo(raw: string): string {
  const value = raw.trim();
  const match = /^WO(\d+)[A-Za-z]*$/i.exec(value);
  return match ? `WO${match[1]}` : "";
}

function shippingLabelDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function shippingLabelResolutionData(plan: ResolutionPlan): Record<string, string> {
  const range = shippingLabelDateRange();
  const data: Record<string, string> = {
    dateOrderedStartDate: range.start,
    dateOrderedEndDate: range.end,
    pageSize: "50",
    pageNum: "1",
  };
  data[plan.queryBy] = plan.inputIdentifier;
  return data;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const valid = params.valid === true;
  const requestedIdentifiers = Array.isArray(params.orderIdentifiers)
    ? (params.orderIdentifiers as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : [];

  const directOrders: Array<{ inputIdentifier: string; orderNo: string }> = [];
  const actionPlans: ResolutionPlan[] = [];

  if (valid) {
    for (const inputIdentifier of requestedIdentifiers) {
      const orderNo = shippingLabelNormalizeWo(inputIdentifier);
      if (orderNo) {
        directOrders.push({ inputIdentifier, orderNo });
        continue;
      }
      actionPlans.push({ inputIdentifier, queryBy: "trackingNo" });
      actionPlans.push({ inputIdentifier, queryBy: "sellerOrderNo" });
    }
  }

  const actions = actionPlans.map((plan) => ({
    action: "queryOutboundOrderList",
    data: JSON.stringify(shippingLabelResolutionData(plan)),
  }));

  return {
    requestedIdentifiers,
    directOrders,
    actions,
    actionPlans,
    resolutionPluginBatchActionsCount: actions.length,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-order-resolution-actions")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}

