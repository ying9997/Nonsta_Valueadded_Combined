/** 将已白名单化的补充详情挂载到对应订单；不覆盖旧接口字段。 */

function orderKey(order: Record<string, unknown>): string {
  return String(order.orderNo ?? order.inboundOrderNum ?? order.inboundOrderNo ?? "")
    .trim()
    .toUpperCase();
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = Array.isArray(rawOrderData.list) ? rawOrderData.list : [];
  const supplementalByOrderNo = (params.supplementalByOrderNo ?? {}) as Record<string, unknown>;
  let mergedCount = 0;

  const mergedList = list.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const order = item as Record<string, unknown>;
    const supplemental = supplementalByOrderNo[orderKey(order)];
    if (!supplemental) return order;
    mergedCount++;
    return { ...order, supplementalOrderDetail: supplemental };
  });

  return {
    rawOrderData: {
      ...rawOrderData,
      list: mergedList,
      _supplementalMergeMeta: {
        sourceAction: "wh.inboundOrder.getOrderDetail",
        orderCount: mergedList.length,
        mergedCount,
      },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-supplemental-order-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
