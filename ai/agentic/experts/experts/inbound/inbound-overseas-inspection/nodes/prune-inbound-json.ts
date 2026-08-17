/**
 * 节点：海外验专家入库单 JSON 剪枝（保留验货相关字段与轨迹）
 */

const INSPECTION_FIELDS = [
  "orderNo",
  "inboundOrderNum",
  "status",
  "winitProductCode",
  "inspectionType",
  "inspectionStatus",
  "dicDate",
  "awhDate",
  "actualArrivalTime",
  "isAbnormal",
  "bookingStatus",
  "orderMerchandiseQty",
  "actualOrderMerchandiseQty",
  "trajectoryList",
];

const DEFAULT_MAX_TRAJECTORY = 20;

function pickFields(order: Record<string, unknown>, maxTrajectory: number) {
  const copy: Record<string, unknown> = {};
  for (const key of INSPECTION_FIELDS) {
    if (order[key] != null) copy[key] = order[key];
  }
  const traj = copy.trajectoryList;
  if (Array.isArray(traj) && traj.length > maxTrajectory) {
    copy.trajectoryList = traj.slice(-maxTrajectory);
    copy._trajectoryTruncated = true;
  }
  return copy;
}

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.skipApi === true) {
    return { prunedOrderData: { list: [], total: 0 }, _pruneMeta: { skipped: true } };
  }

  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const maxTrajectory =
    typeof params.maxTrajectoryNodes === "number" && params.maxTrajectoryNodes >= 1
      ? Math.floor(params.maxTrajectoryNodes)
      : DEFAULT_MAX_TRAJECTORY;

  const prunedList = list
    .filter((item) => item && typeof item === "object")
    .map((item) => pickFields(item as Record<string, unknown>, maxTrajectory));

  return {
    prunedOrderData: { ...rawOrderData, list: prunedList },
    _pruneMeta: { orderCount: prunedList.length },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("prune-inbound-json")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
