/**
 * 节点：将 queryOrderTracking 结果合并进 rawOrderData.list[].trackingList
 */

import { orderKeyFromToken } from "../../../../shared/inbound-winit-tracking";

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const trackingByOrderNo = (params.trackingByOrderNo ?? {}) as Record<string, unknown[]>;
  const list = Array.isArray(rawOrderData.list) ? [...rawOrderData.list] : [];

  let mergedCount = 0;
  const mergedList = list.map((item) => {
    if (!item || typeof item !== "object") return item;
    const order = { ...(item as Record<string, unknown>) };
    const key = orderKeyFromToken(String(order.orderNo ?? ""));
    const trackingList = trackingByOrderNo[key];
    if (Array.isArray(trackingList) && trackingList.length > 0) {
      order.trackingList = trackingList;
      mergedCount++;
    }
    return order;
  });

  return {
    rawOrderData: {
      ...rawOrderData,
      list: mergedList,
      _trackingMergeMeta: {
        orderCount: mergedList.length,
        trackingMergedCount: mergedCount,
        trackingSource: "wh.tracking.queryOrderTracking",
      },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-order-with-tracking")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
