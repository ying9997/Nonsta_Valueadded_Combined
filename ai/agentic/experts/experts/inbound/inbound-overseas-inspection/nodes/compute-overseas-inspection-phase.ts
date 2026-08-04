/**
 * 节点：从 OMS 入库单推断海外验阶段、模式与轨迹行为
 */

type OverseasInspectionPhase =
  | "not_arrived"
  | "awaiting_inspection"
  | "in_progress"
  | "completed"
  | "blocked";

type InspectionMode = "with_carton" | "without_carton" | "forecast" | "unknown";

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => str(item)).filter(Boolean)
    : [];
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function countBusinessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur < endDay) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) count++;
  }
  return count;
}

const INSPECTION_KEYWORDS = ["验货", "验收", "海外验", "inspection", "pewc", "ewc"];

function isInspectionNode(node: Record<string, unknown>): boolean {
  const text = [node.nodeName, node.nodeDesc, node.status, node.remark, node.eventName, node.trajectoryDesc]
    .map(str)
    .join(" ")
    .toLowerCase();
  return INSPECTION_KEYWORDS.some((kw) => text.includes(kw));
}

function inferInspectionMode(
  order: Record<string, unknown>,
  requestedMode: string
): InspectionMode {
  if (requestedMode === "with_carton") return "with_carton";
  if (requestedMode === "without_carton") return "without_carton";
  if (requestedMode === "forecast") return "forecast";

  const psc = str(order.winitProductCode).toUpperCase();
  const inspectionType = str(order.inspectionType).toLowerCase();

  if (psc === "OW01031" || inspectionType.includes("有箱单") || inspectionType.includes("packing")) {
    return "with_carton";
  }
  if (psc === "OW01032" || inspectionType.includes("预报") || inspectionType.includes("forecast")) {
    return "forecast";
  }
  if (inspectionType.includes("无箱单") || inspectionType.includes("without")) {
    return "without_carton";
  }
  return "unknown";
}

function mapPhase(order: Record<string, unknown>): OverseasInspectionPhase {
  const status = str(order.status).toUpperCase();
  const inspectionStatus = str(order.inspectionStatus);
  const dicDate = str(order.dicDate);
  const isAbnormal = order.isAbnormal === true || order.isAbnormal === "Y";

  if (status === "TS") return "not_arrived";
  if (dicDate || status === "EWC" || status === "SHD") return "completed";
  if (status === "PEWC") {
    if (/in\s*progress|进行中/i.test(inspectionStatus)) return "in_progress";
    return "awaiting_inspection";
  }
  if (isAbnormal) return "blocked";
  return "awaiting_inspection";
}

function extractTrajectorySummary(order: Record<string, unknown>) {
  const trajectory = Array.isArray(order.trajectoryList) ? order.trajectoryList : [];
  return trajectory
    .filter((n) => n && typeof n === "object" && isInspectionNode(n as Record<string, unknown>))
    .slice(-10)
    .map((n) => {
      const node = n as Record<string, unknown>;
      return {
        nodeName: str(node.nodeName ?? node.eventName ?? node.status),
        eventTime: str(node.eventTime ?? node.createTime ?? node.operateTime),
        nodeDesc: str(node.nodeDesc ?? node.trajectoryDesc ?? node.remark),
      };
    });
}

function computeOrderPhase(order: Record<string, unknown>, requestedMode: string) {
  const awhDate = str(order.awhDate ?? order.actualArrivalTime);
  const awhParsed = parseDate(awhDate);
  const daysSinceArrival = awhParsed ? countBusinessDaysBetween(awhParsed, new Date()) : 0;
  let overseasInspectionPhase = mapPhase(order);
  const isAbnormal = order.isAbnormal === true || order.isAbnormal === "Y";
  const blockedReason = isAbnormal ? "存在异常单，可能阻塞验货进度" : "";

  if (isAbnormal && overseasInspectionPhase !== "completed" && overseasInspectionPhase !== "not_arrived") {
    overseasInspectionPhase = "blocked";
  }

  return {
    orderNo: str(order.orderNo ?? order.inboundOrderNum),
    winitProductCode: str(order.winitProductCode),
    inspectionType: str(order.inspectionType),
    inspectionStatus: str(order.inspectionStatus),
    inspectionMode: inferInspectionMode(order, requestedMode),
    currentStatus: str(order.status),
    overseasInspectionPhase,
    dicDate: str(order.dicDate) || null,
    awhDate: awhDate || null,
    daysSinceArrival,
    trajectorySummary: extractTrajectorySummary(order),
    isAbnormal,
    blockedReason: blockedReason || null,
    qtySnapshot: {
      orderMerchandiseQty: order.orderMerchandiseQty ?? null,
      actualOrderMerchandiseQty: order.actualOrderMerchandiseQty ?? null,
    },
    bookingStatus: str(order.bookingStatus) || null,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = str(params.intent) || "progress";
  const inspectionMode = str(params.inspectionMode) || "auto";

  if (intent === "mode_faq") {
    return {
      inspectionPhase: {
        intent: "mode_faq",
        inspectionMode,
        orders: [],
        orderCount: 0,
      },
    };
  }

  const prunedOrderData = (params.prunedOrderData ?? {}) as Record<string, unknown>;
  const list = (prunedOrderData.list as unknown[]) ?? [];
  const orders = list
    .filter((item) => item && typeof item === "object")
    .map((item) => computeOrderPhase(item as Record<string, unknown>, inspectionMode));

  if (orders.length === 0 && intent === "progress" && stringArray(params.inboundOrderNos).length > 0) {
    return {
      inspectionPhase: {
        outputPath: "no_data",
        dataAvailable: false,
        needsClarification: true,
        clarificationFields: ["inboundOrderNo"],
        orderNo: "",
        winitProductCode: "",
        inspectionType: "",
        inspectionStatus: "",
        inspectionMode: inspectionMode === "auto" ? "unknown" : inspectionMode,
        currentStatus: "",
        overseasInspectionPhase: "unknown",
        dicDate: null,
        awhDate: null,
        daysSinceArrival: null,
        trajectorySummary: [],
        isAbnormal: null,
        blockedReason: null,
        qtySnapshot: { orderMerchandiseQty: null, actualOrderMerchandiseQty: null },
        bookingStatus: null,
        intent: "progress",
        orders: [],
        orderCount: 0,
        wmsDataAvailable: false,
      },
    };
  }

  const primary = orders[0] ?? {
    orderNo: "",
    winitProductCode: "",
    inspectionType: "",
    inspectionStatus: "",
    inspectionMode: inspectionMode === "auto" ? "unknown" : inspectionMode,
    currentStatus: "",
    overseasInspectionPhase: "not_arrived" as OverseasInspectionPhase,
    dicDate: null,
    awhDate: null,
    daysSinceArrival: 0,
    trajectorySummary: [],
    isAbnormal: false,
    blockedReason: null,
    qtySnapshot: { orderMerchandiseQty: null, actualOrderMerchandiseQty: null },
    bookingStatus: null,
  };

  return {
    inspectionPhase: {
      ...primary,
      intent: "progress",
      orders,
      orderCount: orders.length,
      wmsDataAvailable: false,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("compute-overseas-inspection-phase")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
