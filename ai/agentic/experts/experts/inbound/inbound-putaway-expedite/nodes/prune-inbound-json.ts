/**
 * 节点：催上架专家入库单 JSON 剪枝
 * - 保留 inboundMerchandiseVos（供下期加急库存判定）
 * - 省略 inboundPackageVos 与冗余轨迹
 */

interface PruneMeta {
  originalTrajectoryCount: number;
  retainedTrajectoryCount: number;
  merchandiseRetained: boolean;
}

const DEFAULT_MAX_TRAJECTORY = 20;

function pruneOrder(
  order: Record<string, unknown>,
  maxTrajectory: number
): { order: Record<string, unknown>; meta: PruneMeta } {
  let originalTrajectoryCount = 0;
  let retainedTrajectoryCount = 0;
  const copy = { ...order };

  const traj = copy.trajectoryList;
  if (Array.isArray(traj)) {
    originalTrajectoryCount = traj.length;
    if (traj.length > maxTrajectory) {
      copy.trajectoryList = traj.slice(-maxTrajectory);
      retainedTrajectoryCount = maxTrajectory;
      (copy as Record<string, unknown>)._trajectoryTruncated = true;
    } else {
      retainedTrajectoryCount = traj.length;
    }
  }

  if (copy.inboundPackageVos != null) {
    delete copy.inboundPackageVos;
  }

  const merchandiseRetained = copy.inboundMerchandiseVos != null;

  return {
    order: copy,
    meta: { originalTrajectoryCount, retainedTrajectoryCount, merchandiseRetained },
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const maxTrajectory =
    typeof params.maxTrajectoryNodes === "number" && params.maxTrajectoryNodes >= 1
      ? Math.floor(params.maxTrajectoryNodes)
      : DEFAULT_MAX_TRAJECTORY;

  const prunedList: unknown[] = [];
  const metaList: PruneMeta[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { order, meta } = pruneOrder(item as Record<string, unknown>, maxTrajectory);
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
