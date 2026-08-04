/**
 * 节点：入库单 JSON 剪枝（trackingList / 兼容 trajectoryList / inboundPackageVos）
 */

interface PruneMeta {
  originalTrajectoryCount: number;
  retainedTrajectoryCount: number;
  packagesOmitted: boolean;
}

const DEFAULT_MAX_TRAJECTORY = 20;

function pruneOrder(
  order: Record<string, unknown>,
  maxTrajectory: number,
  includePackageDetails: boolean
): { order: Record<string, unknown>; meta: PruneMeta } {
  let originalTrajectoryCount = 0;
  let retainedTrajectoryCount = 0;
  const copy = { ...order };

  const trajKey = Array.isArray(copy.trackingList)
    ? "trackingList"
    : Array.isArray(copy.trajectoryList)
      ? "trajectoryList"
      : null;
  if (trajKey) {
    const traj = copy[trajKey] as unknown[];
    originalTrajectoryCount = traj.length;
    if (traj.length > maxTrajectory) {
      copy[trajKey] = traj.slice(-maxTrajectory);
      retainedTrajectoryCount = maxTrajectory;
      (copy as Record<string, unknown>)._trajectoryTruncated = true;
    } else {
      retainedTrajectoryCount = traj.length;
    }
  }

  let packagesOmitted = false;
  if (!includePackageDetails) {
    if (copy.packageList != null) {
      delete copy.packageList;
      packagesOmitted = true;
    }
    if (copy.inboundPackageVos != null) {
      delete copy.inboundPackageVos;
      packagesOmitted = true;
    }
  }

  return {
    order: copy,
    meta: { originalTrajectoryCount, retainedTrajectoryCount, packagesOmitted },
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const maxTrajectory =
    typeof params.maxTrajectoryNodes === "number" && params.maxTrajectoryNodes >= 1
      ? Math.floor(params.maxTrajectoryNodes)
      : DEFAULT_MAX_TRAJECTORY;
  const includePackageDetails = params.includePackageDetails === true;

  const prunedList: unknown[] = [];
  const metaList: PruneMeta[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { order, meta } = pruneOrder(item as Record<string, unknown>, maxTrajectory, includePackageDetails);
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
