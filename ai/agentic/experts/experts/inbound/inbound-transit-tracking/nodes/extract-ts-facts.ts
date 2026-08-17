/**
 * 节点：extract-ts-facts — 从 OMS 订单提取 TS 阶段事实
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function findTsEntryTime(trajectory: Record<string, unknown>[]): string | null {
  for (const node of trajectory) {
    const status = str(node.status ?? node.nodeStatus).toUpperCase();
    if (status === "TS") {
      return str(node.nodeTime ?? node.eventTime ?? node.createTime) || null;
    }
  }
  for (const node of trajectory) {
    const text = [node.nodeName, node.nodeDesc, node.trajectoryDesc].join(" ").toLowerCase();
    if (text.includes("ts") || text.includes("头程") || text.includes("发运")) {
      return str(node.nodeTime ?? node.eventTime) || null;
    }
  }
  return null;
}

function extractOrderFacts(order: Record<string, unknown>) {
  const orderNo = str(order.orderNo ?? order.inboundOrderNum);
  const currentStatus = str(order.status).toUpperCase() || "UNKNOWN";
  const expectedSendwarehouseTime =
    str(order.expectedSendwarehouseTime ?? order.estimatedArrivalTime) || null;

  const traj = Array.isArray(order.trajectoryList)
    ? (order.trajectoryList as Record<string, unknown>[])
    : [];
  const tsTrajectoryNodes = traj.filter((n) => {
    const status = str(n.status ?? n.nodeStatus).toUpperCase();
    return status === "TS" || /头程|在途|发运|ts/i.test(
      [n.nodeName, n.nodeDesc, n.trajectoryDesc].join(" ")
    );
  });

  const tsEntryTime = findTsEntryTime(traj);

  let currentMilestone = "国际在途（TS）";
  if (currentStatus !== "TS") {
    currentMilestone = currentStatus === "OD" ? "草稿/未发运" : `当前状态 ${currentStatus}（非 TS 在途阶段）`;
  } else if (tsTrajectoryNodes.length > 0) {
    const last = tsTrajectoryNodes[tsTrajectoryNodes.length - 1];
    currentMilestone = str(last.nodeDesc ?? last.nodeName ?? last.trajectoryDesc) || currentMilestone;
  }

  return {
    orderNo,
    currentStatus,
    tsEntryTime,
    expectedSendwarehouseTime,
    tsTrajectoryNodes,
    currentMilestone,
    isTsPhase: currentStatus === "TS",
  };
}

function tmsOverlay(summary: unknown) {
  const s = (summary ?? {}) as Record<string, unknown>;
  const primary = (s.primary ?? null) as Record<string, unknown> | null;
  if (!primary) return null;
  return {
    transportOrderNo: String(primary.transportOrderNo ?? ""),
    transportStatus: String(primary.status ?? ""),
    containerNo: String(primary.containerNo ?? ""),
    cartonType: String(primary.cartonType ?? ""),
    cutoffCabinetDate: String(primary.cutoffCabinetDate ?? ""),
    estimateVolume: primary.estimateVolume ?? null,
    logisticsPlanId: String(primary.logisticsPlanId ?? ""),
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const prunedOrderData = (params.prunedOrderData ?? {}) as Record<string, unknown>;
  const list = (prunedOrderData.list as unknown[]) ?? [];
  const tmsFacts = tmsOverlay(params.tmsTransportSummary);

  const orders = list
    .filter((item) => item && typeof item === "object")
    .map((item) => extractOrderFacts(item as Record<string, unknown>));

  const primary = orders[0] ?? {
    orderNo: "",
    currentStatus: "UNKNOWN",
    tsEntryTime: null,
    expectedSendwarehouseTime: null,
    tsTrajectoryNodes: [],
    currentMilestone: "暂无数据",
    isTsPhase: false,
  };

  return {
    tsFacts: {
      ...primary,
      orders,
      orderCount: orders.length,
      dataAvailable: orders.length > 0,
      tmsFacts,
      tmsDataQuality: String((params.tmsTransportSummary as Record<string, unknown>)?.dataQuality ?? "missing"),
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("extract-ts-facts")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
