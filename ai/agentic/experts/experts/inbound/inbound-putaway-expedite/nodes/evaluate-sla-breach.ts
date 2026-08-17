/**
 * 节点：按 SLA 矩阵判定上架超时（dicDate vs now）
 * v1：仅 getOrderDetail；canRush 固定 null（库存 API 下期接入）
 */

type OrderTypeKey = "standard" | "direct_domestic" | "direct_overseas";
type RegionKey = "US" | "NON_US";

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

function inferRegion(destWhCode: string): RegionKey {
  return /^US/i.test(destWhCode) ? "US" : "NON_US";
}

function inferOrderType(order: Record<string, unknown>): OrderTypeKey {
  const raw = str(order.orderType ?? order.inboundType ?? order.inboundOrderType).toLowerCase();
  if (raw.includes("直发") && (raw.includes("海外") || raw.includes("overseas"))) return "direct_overseas";
  if (raw.includes("直发") || raw.includes("direct")) return "direct_domestic";
  return "standard";
}

function inferHeadwayBucket(order: Record<string, unknown>): string {
  const parts = [
    order.headwayProduct,
    order.winitProductName,
    order.transportType,
    order.logisticsProduct,
    order.expressType,
  ]
    .map(str)
    .join(" ")
    .toLowerCase();

  if (parts.includes("fedex") || parts.includes("空运") || parts.includes("air")) return "air_express";
  if (parts.includes("美森") || parts.includes("以星") || parts.includes("matson")) return "lcl_premium";
  if (parts.includes("ups")) return "ups";
  if (parts.includes("dhl")) return "dhl";
  if (parts.includes("空卡")) return "air_card";
  if (parts.includes("海卡") || parts.includes("海运整柜") || parts.includes("fcl")) return "sea_fcl";
  if (parts.includes("空派") || parts.includes("海派")) return "air_sea_parcel";
  if (parts.includes("海运") || parts.includes("铁路") || parts.includes("sea") || parts.includes("rail")) return "sea_rail";
  if (parts.includes("快递") || parts.includes("express")) return "express";
  if (!parts.trim()) return "unknown";
  return "other";
}

function lookupSlaWorkingDays(region: RegionKey, orderType: OrderTypeKey, headway: string): number {
  if (region === "US") {
    if (orderType === "standard") {
      if (headway === "air_express") return 1;
      if (headway === "lcl_premium") return 2;
      if (headway === "ups" || headway === "unknown") return 4;
      if (headway === "sea_fcl" || headway === "sea_rail" || headway === "other") return 3;
      return 3;
    }
    if (orderType === "direct_domestic") {
      if (headway === "air_card" || headway === "dhl") return 1;
      return 4;
    }
    if (orderType === "direct_overseas") {
      if (headway === "air_card" || headway === "dhl") return 2;
      return 5;
    }
  }

  if (orderType === "standard") {
    if (headway === "air_express" || headway === "express") return 1;
    return 3;
  }
  if (orderType === "direct_domestic") {
    if (headway === "air_card") return 1;
    if (headway === "express") return 2;
    if (headway === "sea_fcl" || headway === "sea_rail") return 3;
    return 4;
  }
  if (orderType === "direct_overseas") {
    if (headway === "air_card") return 2;
    if (headway === "express") return 3;
    if (headway === "sea_fcl" || headway === "sea_rail") return 4;
    return 5;
  }
  return 3;
}

function resolveDicTime(order: Record<string, unknown>): string {
  return str(order.dicDate ?? order.awhDate ?? order.actualArrivalTime);
}

function isAlreadyPutaway(order: Record<string, unknown>): boolean {
  const status = str(order.status).toUpperCase();
  const shelveDone = str(order.shelveCompletedDate ?? order.dioDate);
  return Boolean(shelveDone) || status === "SHD";
}

function resolveEscalationPath(slaBreached: boolean, alreadyPutaway: boolean, status: string): string {
  if (alreadyPutaway) return "none_completed";
  if (str(status).toUpperCase() === "PEWC") return "await_inspection";
  if (slaBreached) return "ticket_winit_customer_service";
  return "wait_within_sla";
}

function evaluateOrder(order: Record<string, unknown>) {
  const orderNo = str(order.orderNo ?? order.inboundOrderNum);
  const currentStatus = str(order.status);
  const dicTime = resolveDicTime(order);
  const dicDate = parseDate(dicTime);
  const region = inferRegion(str(order.destWhCode));
  const orderType = inferOrderType(order);
  const headway = inferHeadwayBucket(order);
  const slaWorkingDays = lookupSlaWorkingDays(region, orderType, headway);
  const alreadyPutaway = isAlreadyPutaway(order);

  let workingDaysElapsed = 0;
  let slaBreached = false;
  const statusUpper = currentStatus.toUpperCase();

  if (dicDate && !alreadyPutaway && statusUpper !== "PEWC") {
    workingDaysElapsed = countBusinessDaysBetween(dicDate, new Date());
    slaBreached = workingDaysElapsed > slaWorkingDays;
  }

  if (statusUpper === "PEWC") {
    workingDaysElapsed = 0;
    slaBreached = false;
  }

  const escalationPath = resolveEscalationPath(slaBreached, alreadyPutaway, currentStatus);

  return {
    orderNo,
    currentStatus: currentStatus || null,
    slaBreached,
    slaWorkingDays,
    workingDaysElapsed,
    dicTime: dicTime || null,
    alreadyPutaway,
    escalationPath,
    canRush: null as boolean | null,
    canRushReason: "inventory_check_not_available",
    stockCheckSummary: [] as Array<{ sku: string; qtyAvailable: number; isLowStock: boolean }>,
    destWhCode: str(order.destWhCode) || null,
    orderType,
    headwayBucket: headway,
    region,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const prunedOrderData = (params.prunedOrderData ?? {}) as Record<string, unknown>;
  const list = (prunedOrderData.list as unknown[]) ?? [];

  const orders = list
    .filter((item) => item && typeof item === "object")
    .map((item) => evaluateOrder(item as Record<string, unknown>));

  if (orders.length === 0 && stringArray(params.inboundOrderNos).length > 0) {
    return {
      slaFacts: {
        outputPath: "no_data",
        dataAvailable: false,
        needsClarification: true,
        clarificationFields: ["inboundOrderNo"],
        orderNo: "",
        currentStatus: null,
        slaBreached: null,
        slaWorkingDays: null,
        workingDaysElapsed: null,
        dicTime: null,
        alreadyPutaway: null,
        escalationPath: "no_data",
        canRush: null,
        canRushReason: "order_facts_not_available",
        stockCheckSummary: [],
        orders: [],
        orderCount: 0,
      },
    };
  }

  const primary = orders[0] ?? {
    orderNo: "",
    currentStatus: null,
    slaBreached: false,
    slaWorkingDays: 3,
    workingDaysElapsed: 0,
    dicTime: null,
    alreadyPutaway: false,
    escalationPath: "wait_within_sla",
    canRush: null,
    canRushReason: "inventory_check_not_available",
    stockCheckSummary: [],
  };

  return {
    slaFacts: {
      ...primary,
      orders,
      orderCount: orders.length,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("evaluate-sla-breach")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
