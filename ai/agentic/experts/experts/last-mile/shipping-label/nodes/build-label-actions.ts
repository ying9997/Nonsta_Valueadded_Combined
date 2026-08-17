/** 为已解析的 WO 主单构建尾程面单批处理动作。 */

async function main({ params }: { params: Record<string, unknown> }) {
  const valid = params.valid === true;
  const customerCode = String(params.customerCode ?? "").trim();
  const resolution = params.resolution && typeof params.resolution === "object"
    ? params.resolution as Record<string, unknown>
    : {};
  const tooManyMatches = resolution.tooManyMatches === true;
  const orders = Array.isArray(resolution.orders)
    ? resolution.orders as Array<Record<string, unknown>>
    : [];

  const actionPlans: Array<{ orderNo: string; matchedFrom: string[] }> = [];
  if (valid && customerCode && !tooManyMatches) {
    for (const order of orders) {
      const orderNo = String(order.orderNo ?? "").trim();
      if (!orderNo) continue;
      const matchedFrom = Array.isArray(order.matchedFrom)
        ? (order.matchedFrom as unknown[]).map((value) => String(value).trim()).filter(Boolean)
        : [];
      actionPlans.push({ orderNo, matchedFrom });
    }
  }

  const actions = actionPlans.map((plan) => ({
    action: "wh.outbound.getMaskedLabelUrl",
    data: JSON.stringify({ orderNo: plan.orderNo, customerCode }),
  }));

  return {
    actions,
    actionPlans,
    labelPluginBatchActionsCount: actions.length,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-label-actions")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}

