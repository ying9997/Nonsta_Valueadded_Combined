/**
 * 节点：到仓专家入库单 JSON 剪枝
 * - includeTrajectory=false 时省略 trajectoryList
 * - focusPod=true 时仅保留 POD/签收/卸货相关轨迹节点
 */

interface PruneMeta {
  originalTrajectoryCount: number;
  retainedTrajectoryCount: number;
  trajectoryOmitted: boolean;
  podFiltered: boolean;
}

const DEFAULT_MAX_TRAJECTORY = 20;

const POD_KEYWORDS = ["pod", "签收", "卸货", "妥投", "收货", "delivery", "unload"];

function isPodRelatedNode(node: Record<string, unknown>): boolean {
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
  if (node.podTime != null || node.podQty != null) return true;
  return POD_KEYWORDS.some((kw) => text.includes(kw));
}

function pruneOrder(
  order: Record<string, unknown>,
  maxTrajectory: number,
  includeTrajectory: boolean,
  focusPod: boolean
): { order: Record<string, unknown>; meta: PruneMeta } {
  let originalTrajectoryCount = 0;
  let retainedTrajectoryCount = 0;
  let trajectoryOmitted = false;
  let podFiltered = false;
  const copy = { ...order };

  if (!includeTrajectory && copy.trajectoryList != null) {
    delete copy.trajectoryList;
    trajectoryOmitted = true;
  } else {
    const traj = copy.trajectoryList;
    if (Array.isArray(traj)) {
      originalTrajectoryCount = traj.length;
      let working = traj as Record<string, unknown>[];
      if (focusPod) {
        working = working.filter((n) => n && typeof n === "object" && isPodRelatedNode(n as Record<string, unknown>));
        podFiltered = true;
      }
      if (working.length > maxTrajectory) {
        working = working.slice(-maxTrajectory);
        (copy as Record<string, unknown>)._trajectoryTruncated = true;
      }
      copy.trajectoryList = working;
      retainedTrajectoryCount = working.length;
    }
  }

  if (copy.inboundPackageVos != null) {
    delete copy.inboundPackageVos;
  }

  return {
    order: copy,
    meta: { originalTrajectoryCount, retainedTrajectoryCount, trajectoryOmitted, podFiltered },
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const maxTrajectory =
    typeof params.maxTrajectoryNodes === "number" && params.maxTrajectoryNodes >= 1
      ? Math.floor(params.maxTrajectoryNodes)
      : DEFAULT_MAX_TRAJECTORY;
  const includeTrajectory = params.includeTrajectory !== false;
  const focusPod = params.focusPod === true;

  const prunedList: unknown[] = [];
  const metaList: PruneMeta[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { order, meta } = pruneOrder(item as Record<string, unknown>, maxTrajectory, includeTrajectory, focusPod);
    prunedList.push(order);
    metaList.push(meta);
  }

  const _pruneMeta = { orders: metaList };

  return {
    prunedOrderData: { ...rawOrderData, list: prunedList, _pruneMeta },
    _pruneMeta,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("prune-inbound-json")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
