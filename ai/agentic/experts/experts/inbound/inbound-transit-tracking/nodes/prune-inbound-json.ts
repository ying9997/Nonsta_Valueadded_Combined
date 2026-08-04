/**
 * 节点：头程专家入库单 JSON 剪枝 — 保留 TS 相关轨迹与关键字段
 * FaaS 单文件闭环，无外部 import。
 */

const DEFAULT_MAX_TRAJECTORY = 20;

const TS_KEYWORDS = ["ts", "头程", "在途", "发运", "离港", "到港", "送仓", "transit", "shipped", "departure", "arrival"];

function isTsRelatedNode(node: Record<string, unknown>): boolean {
  const status = String(node.status ?? node.nodeStatus ?? "").toUpperCase();
  if (status === "TS") return true;
  const text = [
    node.nodeName,
    node.nodeDesc,
    node.status,
    node.remark,
    node.eventName,
    node.trajectoryDesc,
  ]
    .filter((v) => v != null)
    .join(" ")
    .toLowerCase();
  return TS_KEYWORDS.some((kw) => text.includes(kw));
}

function pruneOrder(
  order: Record<string, unknown>,
  maxTrajectory: number
): Record<string, unknown> {
  const copy: Record<string, unknown> = {
    orderNo: order.orderNo ?? order.inboundOrderNum,
    status: order.status,
    expectedSendwarehouseTime: order.expectedSendwarehouseTime ?? order.estimatedArrivalTime,
    destWhCode: order.destWhCode,
    transportType: order.transportType ?? order.headwayProduct,
  };

  const traj = order.trajectoryList;
  if (Array.isArray(traj)) {
    let working = traj.filter(
      (n) => n && typeof n === "object" && isTsRelatedNode(n as Record<string, unknown>)
    ) as Record<string, unknown>[];
    if (working.length === 0) {
      working = traj.slice(-maxTrajectory) as Record<string, unknown>[];
    } else if (working.length > maxTrajectory) {
      working = working.slice(-maxTrajectory);
      copy._trajectoryTruncated = true;
    }
    copy.trajectoryList = working;
  }

  return copy;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const maxTrajectory =
    typeof params.maxTrajectoryNodes === "number" && params.maxTrajectoryNodes >= 1
      ? Math.floor(params.maxTrajectoryNodes)
      : DEFAULT_MAX_TRAJECTORY;

  const prunedList = list
    .filter((item) => item && typeof item === "object")
    .map((item) => pruneOrder(item as Record<string, unknown>, maxTrajectory));

  return {
    prunedOrderData: { list: prunedList, total: prunedList.length },
    _pruneMeta: { strategy: "ts-focused", maxTrajectory },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("prune-inbound-json")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
