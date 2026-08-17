/**
 * 节点：确定性解析到仓里程碑（awhDate、POD、PEWC/EWC、包裹数对比）
 */

type ArrivalPhase = "in_transit" | "arrived_pending" | "confirmed" | "unknown";

const IN_TRANSIT_STATUSES = new Set(["DR", "OD", "RE", "TS"]);
const ARRIVED_PENDING = "PEWC";
const CONFIRMED_STATUSES = new Set(["EWC", "SHD"]);

const TYPICAL_PEWC_WAIT_DAYS: Record<string, number> = {
  self: 2,
  domestic: 3,
  overseas: 5,
  default: 3,
};

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function countBusinessDaysSince(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur < endDay) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

function inferInspectionWaitDays(order: Record<string, unknown>): number {
  const inspection = str(order.inspectionType ?? order.inspectionMode).toLowerCase();
  if (inspection.includes("海外") || inspection.includes("overseas")) return TYPICAL_PEWC_WAIT_DAYS.overseas;
  if (inspection.includes("自验") || inspection.includes("self")) return TYPICAL_PEWC_WAIT_DAYS.self;
  if (inspection.includes("国内") || inspection.includes("domestic")) return TYPICAL_PEWC_WAIT_DAYS.domestic;
  return TYPICAL_PEWC_WAIT_DAYS.default;
}

function inferArrivalPhase(status: string, awhDate: string): ArrivalPhase {
  const s = status.toUpperCase();
  if (CONFIRMED_STATUSES.has(s)) return "confirmed";
  if (s === ARRIVED_PENDING || awhDate) return "arrived_pending";
  if (IN_TRANSIT_STATUSES.has(s)) return "in_transit";
  return "unknown";
}

function extractPodSummary(order: Record<string, unknown>): Record<string, unknown> {
  let podTime = str(order.podTime ?? order.unloadTime ?? order.actualArrivalTime);
  let podQty = order.podQty ?? order.actualOrderPackageQty ?? null;

  const traj = order.trajectoryList;
  if (Array.isArray(traj)) {
    for (const node of traj) {
      if (!node || typeof node !== "object") continue;
      const n = node as Record<string, unknown>;
      const desc = [n.nodeName, n.nodeDesc, n.trajectoryDesc, n.remark].join(" ").toLowerCase();
      if (!podTime && (n.podTime || n.eventTime || n.operateTime)) {
        podTime = str(n.podTime ?? n.eventTime ?? n.operateTime);
      }
      if (podQty == null && n.podQty != null) podQty = n.podQty;
      if (!podTime && (desc.includes("pod") || desc.includes("签收") || desc.includes("卸货"))) {
        podTime = str(n.eventTime ?? n.operateTime ?? n.createTime);
      }
    }
  }

  const podAvailable = Boolean(podTime || (podQty != null && Number(podQty) > 0));

  return {
    podTime: podTime || null,
    podQty: podQty != null ? Number(podQty) : null,
    podAvailable,
  };
}

function computePackageQtyComparison(
  order: Record<string, unknown>,
  packagePutawaySummary?: Record<string, unknown> | null
): { expectedPackages: number; receivedPackages: number; discrepancy: number } | null {
  if (packagePutawaySummary) {
    const expected = Number(packagePutawaySummary.expectedPackages ?? 0);
    const received = Number(packagePutawaySummary.receivedPackages ?? 0);
    if (expected || received) {
      return {
        expectedPackages: expected,
        receivedPackages: received,
        discrepancy: Number(
          packagePutawaySummary.discrepancy ?? Math.max(0, expected - received)
        ),
      };
    }
  }
  const expected = Number(order.totalPackageQty ?? order.orderPackageQty ?? order.bookingPackageQty ?? 0);
  const received = Number(order.actualOrderPackageQty ?? order.receivedPackageQty ?? 0);
  if (!expected && !received) return null;
  return {
    expectedPackages: expected,
    receivedPackages: received,
    discrepancy: Math.max(0, expected - received),
  };
}

function computeOrderFacts(
  order: Record<string, unknown>,
  checkPackageQty: boolean,
  packagePutawaySummary?: Record<string, unknown> | null
) {
  const orderNo = str(order.orderNo ?? order.inboundOrderNum ?? order.inboundOrderNo);
  const status = str(order.status);
  const awhDate = str(order.awhDate ?? order.actualArrivalTime ?? order.dicDate);
  const estimatedArrival = str(order.expectedSendwarehouseTime ?? order.estimatedArrivalTime);
  const bookingStatus = str(order.bookingStatus ?? order.appointmentStatus);
  const arrivalPhase = inferArrivalPhase(status, awhDate);
  const podSummary = extractPodSummary(order);

  let needsAttention = false;
  if (status.toUpperCase() === ARRIVED_PENDING && awhDate) {
    const arrived = parseDate(awhDate);
    if (arrived) {
      const waitDays = inferInspectionWaitDays(order);
      const elapsed = countBusinessDaysSince(arrived, new Date());
      needsAttention = elapsed > waitDays;
    }
  }

  const packageQtyComparison = checkPackageQty
    ? computePackageQtyComparison(order, packagePutawaySummary)
    : undefined;

  return {
    orderNo,
    arrivalPhase,
    awhDate: awhDate || null,
    estimatedArrival: estimatedArrival || null,
    currentStatus: status || null,
    bookingStatus: bookingStatus || null,
    needsAttention,
    podSummary,
    packageQtyComparison: packageQtyComparison ?? null,
    pickupDate: str(order.pickupDate) || null,
    inspectionType: str(order.inspectionType) || null,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const prunedOrderData = (params.prunedOrderData ?? {}) as Record<string, unknown>;
  const list = (prunedOrderData.list as unknown[]) ?? [];
  const checkPackageQty = params.checkPackageQty === true;
  const packagePutawaySummary = (params.packagePutawaySummary ?? null) as Record<string, unknown> | null;
  const requiresNarrowing = params.requiresNarrowing === true;

  const orders = list
    .filter((item) => item && typeof item === "object")
    .map((item) =>
      computeOrderFacts(item as Record<string, unknown>, checkPackageQty, packagePutawaySummary)
    );

  const primary = orders[0] ?? {
    orderNo: "",
    arrivalPhase: "unknown" as ArrivalPhase,
    awhDate: null,
    estimatedArrival: null,
    currentStatus: null,
    bookingStatus: null,
    needsAttention: false,
    podSummary: { podTime: null, podQty: null, podAvailable: false },
    packageQtyComparison: null,
  };

  return {
    arrivalFacts: {
      ...primary,
      orders,
      orderCount: orders.length,
      packagePutawaySummary: packagePutawaySummary ?? undefined,
      requiresNarrowing,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("compute-arrival-milestones")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
