/**
 * 节点：从 OMS getOrderDetail 提取清关相关事实
 */

const CUSTOMS_KEYWORDS = [
  "清关",
  "报关",
  "申报",
  "放行",
  "查验",
  "customs",
  "clearance",
  "declare",
  "inspection",
  "release",
];

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function isCustomsNode(node: Record<string, unknown>): boolean {
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
  return CUSTOMS_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

function summarizeTrajectoryNode(node: Record<string, unknown>) {
  return {
    nodeName: str(node.nodeName ?? node.eventName ?? node.status),
    nodeDesc: str(node.nodeDesc ?? node.trajectoryDesc ?? node.remark),
    eventTime: str(node.eventTime ?? node.createTime ?? node.operateTime),
    status: str(node.status),
  };
}

function extractFromOrder(order: Record<string, unknown>) {
  const trajectory = Array.isArray(order.trajectoryList) ? order.trajectoryList : [];
  const customsTrajectoryNodes = trajectory
    .filter((n) => n && typeof n === "object" && isCustomsNode(n as Record<string, unknown>))
    .map((n) => summarizeTrajectoryNode(n as Record<string, unknown>));

  return {
    orderNo: str(order.orderNo ?? order.inboundOrderNum ?? order.inboundOrderNo),
    currentStatus: str(order.status),
    importerCode: str(order.importerCode),
    containerNo: str(order.containerNo ?? order.cabinetNo),
    destWhCode: str(order.destWhCode),
    winitProductCode: str(order.winitProductCode),
    customsTrajectoryNodes,
    trajectoryTotal: trajectory.length,
    customsNodeCount: customsTrajectoryNodes.length,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const pathType = str(params.pathType) || "progress";
  if (pathType !== "progress" || params.validationOk === false) {
    return {
      customsFacts: {
        orderNo: "",
        currentStatus: "",
        importerCode: "",
        containerNo: str(params.containerNo),
        customsTrajectoryNodes: [],
        orders: [],
        orderCount: 0,
      },
    };
  }

  const prunedOrderData = (params.prunedOrderData ?? {}) as Record<string, unknown>;
  const list = (prunedOrderData.list as unknown[]) ?? [];
  const orders = list
    .filter((item) => item && typeof item === "object")
    .map((item) => extractFromOrder(item as Record<string, unknown>));

  const primary = orders[0] ?? {
    orderNo: "",
    currentStatus: "",
    importerCode: "",
    containerNo: str(params.containerNo),
    customsTrajectoryNodes: [],
  };

  const tmsSummary = (params.tmsTransportSummary ?? {}) as Record<string, unknown>;
  const tmsPrimary = (tmsSummary.primary ?? null) as Record<string, unknown> | null;
  const tmsFacts = tmsPrimary
    ? {
        transportOrderNo: String(tmsPrimary.transportOrderNo ?? ""),
        transportStatus: String(tmsPrimary.status ?? ""),
        importDeclarationRuleCode: String(tmsPrimary.importDeclarationRuleCode ?? ""),
        importerCode: String(tmsPrimary.importerCode ?? ""),
        exportDeclarationType: String(tmsPrimary.exportDeclarationType ?? ""),
        containerNo: String(tmsPrimary.containerNo ?? primary.containerNo ?? ""),
      }
    : null;

  return {
    customsFacts: {
      ...primary,
      country: str(params.country),
      orders,
      orderCount: orders.length,
      tmsFacts,
      tmsDataQuality: String(tmsSummary.dataQuality ?? "missing"),
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("extract-customs-facts")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
