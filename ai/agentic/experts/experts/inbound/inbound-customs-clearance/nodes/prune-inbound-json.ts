/**
 * 节点：清关专家入库单 JSON 剪枝（保留清关相关轨迹）
 */

const CUSTOMS_KEYWORDS = ["清关", "报关", "申报", "放行", "查验", "customs", "clearance", "declare"];
const DEFAULT_MAX_TRAJECTORY = 20;

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function isCustomsNode(node: Record<string, unknown>): boolean {
  const text = [node.nodeName, node.nodeDesc, node.status, node.remark, node.eventName, node.trajectoryDesc]
    .map(str)
    .join(" ")
    .toLowerCase();
  return CUSTOMS_KEYWORDS.some((kw) => text.includes(kw));
}

function pruneOrder(order: Record<string, unknown>, maxTrajectory: number, focusCustoms: boolean) {
  const copy = { ...order };
  const traj = copy.trajectoryList;
  if (Array.isArray(traj)) {
    let working = traj as Record<string, unknown>[];
    if (focusCustoms) {
      const customsOnly = working.filter((n) => n && typeof n === "object" && isCustomsNode(n));
      working = customsOnly.length > 0 ? customsOnly : working.slice(-maxTrajectory);
    }
    if (working.length > maxTrajectory) {
      working = working.slice(-maxTrajectory);
      (copy as Record<string, unknown>)._trajectoryTruncated = true;
    }
    copy.trajectoryList = working;
  }
  if (copy.inboundPackageVos != null) delete copy.inboundPackageVos;
  return copy;
}

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.pathType === "dutiable" || params.skipApi === true) {
    return { prunedOrderData: { list: [], total: 0 }, _pruneMeta: { skipped: true } };
  }

  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const maxTrajectory =
    typeof params.maxTrajectoryNodes === "number" && params.maxTrajectoryNodes >= 1
      ? Math.floor(params.maxTrajectoryNodes)
      : DEFAULT_MAX_TRAJECTORY;
  const focusCustoms = params.focusCustoms !== false;

  const prunedList = list
    .filter((item) => item && typeof item === "object")
    .map((item) => pruneOrder(item as Record<string, unknown>, maxTrajectory, focusCustoms));

  return {
    prunedOrderData: { ...rawOrderData, list: prunedList },
    _pruneMeta: { orderCount: prunedList.length, focusCustoms },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("prune-inbound-json")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
