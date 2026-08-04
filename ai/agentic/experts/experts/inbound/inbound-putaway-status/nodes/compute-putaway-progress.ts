/**
 * 节点：推断上架阶段、数量对比、SLA 超时标注
 */

type PutawayStage = "pending" | "in_progress" | "completed";
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

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  result.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added++;
  }
  return result;
}

function inferRegion(destWhCode: string): RegionKey {
  return /^US/i.test(destWhCode) ? "US" : "NON_US";
}

function inferTimezone(destWhCode: string): string {
  const code = destWhCode.toUpperCase();
  // 北美
  if (code.startsWith("US")) return "美国当地时间";
  if (code.startsWith("CA")) return "加拿大东部时间 (ET)";
  if (code.startsWith("MX")) return "墨西哥中部时间 (CST/CDT)";
  // 欧洲 — 英国/爱尔兰
  if (code.startsWith("GB") || code.startsWith("UK") || code.startsWith("IE")) return "英国时间 (GMT/BST)";
  if (code.startsWith("PT")) return "西欧时间 (WET/WEST)";
  // 欧洲 — 中部时区 (CET/CEST)
  if (code.startsWith("DE") || code.startsWith("FR") || code.startsWith("IT") ||
      code.startsWith("ES") || code.startsWith("NL") || code.startsWith("BE") ||
      code.startsWith("AT") || code.startsWith("CH") || code.startsWith("PL") ||
      code.startsWith("CZ") || code.startsWith("SK") || code.startsWith("HU") ||
      code.startsWith("DK") || code.startsWith("NO") || code.startsWith("SE") ||
      code.startsWith("LU") || code.startsWith("SI") || code.startsWith("HR")) return "欧洲中部时间 (CET/CEST)";
  // 欧洲 — 东部时区
  if (code.startsWith("FI") || code.startsWith("EE") || code.startsWith("LV") ||
      code.startsWith("LT") || code.startsWith("BG") || code.startsWith("RO") ||
      code.startsWith("GR") || code.startsWith("CY")) return "欧洲东部时间 (EET/EEST)";
  // 大洋洲
  if (code.startsWith("AU")) return "澳大利亚东部时间 (AEST/AEDT)";
  if (code.startsWith("NZ")) return "新西兰时间 (NZST/NZDT)";
  // 亚洲
  if (code.startsWith("JP")) return "日本标准时间 (JST)";
  if (code.startsWith("KR")) return "韩国标准时间 (KST)";
  if (code.startsWith("SG") || code.startsWith("MY") || code.startsWith("PH")) return "东南亚时间 (SGT/MYT)";
  if (code.startsWith("CN") || code.startsWith("HK") || code.startsWith("TW")) return "北京时间 (CST)";
  // 南美
  if (code.startsWith("BR")) return "巴西时间 (BRT)";
  // 兜底
  return "仓库当地时间";
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

function inferPutawayStage(order: Record<string, unknown>): PutawayStage {
  const status = str(order.status).toUpperCase();
  const shelveDone = str(order.shelveCompletedDate ?? order.dioDate);
  if (shelveDone || status === "SHD") return "completed";
  if (status === "PEWC") return "pending";
  if (status === "EWC") return "in_progress";
  if (shelveDone) return "completed";
  return "pending";
}

function computeQtyComparison(
  order: Record<string, unknown>,
  enabled: boolean,
  skuPutawaySummary?: Record<string, unknown> | null
) {
  if (!enabled) return null;

  const merchList = (order.merchandiseList ?? order.inboundMerchandiseVos) as unknown[] | undefined;
  let expected = num(order.totalMerchandiseQty) || num(order.orderMerchandiseQty);
  let putaway = num(order.actualOrderMerchandiseQty ?? order.putawayQty);
  let received = num(order.actualOrderMerchandiseQty ?? order.receivedMerchandiseQty);

  if (Array.isArray(merchList) && merchList.length > 0) {
    let sumQty = 0;
    let sumActual = 0;
    let sumInspection = 0;
    for (const m of merchList) {
      if (!m || typeof m !== "object") continue;
      const row = m as Record<string, unknown>;
      const parts = num(row.standardPartsNum) || 1;
      sumQty += num(row.quantity) * parts;
      sumActual += num(row.actualQuantity) * parts;
      sumInspection += num(row.inspectionQty) * parts;
    }
    if (sumQty > 0) expected = sumQty;
    if (sumActual > 0) putaway = sumActual;
    // 验收量优先使用 inspectionQty，回退到 actualQuantity
    if (sumInspection > 0) received = sumInspection;
    else if (sumActual > 0) received = sumActual;
  }

  const anomalySkuCount =
    skuPutawaySummary && typeof skuPutawaySummary.anomalySkus === "object"
      ? (skuPutawaySummary.anomalySkus as unknown[]).length
      : undefined;

  const discrepancy = expected - received;
  return { expected, received, putaway, discrepancy, anomalySkuCount };
}

function computeOrderProgress(
  order: Record<string, unknown>,
  checkQtyDiscrepancy: boolean,
  skuPutawaySummary?: Record<string, unknown> | null
) {
  const orderNo = str(order.orderNo ?? order.inboundOrderNum);
  const putawayStage = inferPutawayStage(order);
  const shelveCompletedDate = str(order.shelveCompletedDate ?? order.dioDate) || null;
  const dicTime = resolveDicTime(order);
  const dicDate = parseDate(dicTime);
  const region = inferRegion(str(order.destWhCode));
  const orderType = inferOrderType(order);
  const headway = inferHeadwayBucket(order);
  const slaWorkingDays = lookupSlaWorkingDays(region, orderType, headway);
  const dicTimezone = inferTimezone(str(order.destWhCode));

  let workingDaysElapsed = 0;
  let slaBreached = false;
  let estimatedComplete: string | null = null;

  if (dicDate && putawayStage !== "completed") {
    workingDaysElapsed = countBusinessDaysBetween(dicDate, new Date());
    slaBreached = workingDaysElapsed > slaWorkingDays;
    const est = addBusinessDays(dicDate, slaWorkingDays);
    estimatedComplete = est.toISOString();
  }

  if (putawayStage === "completed") {
    slaBreached = false;
  }

  if (str(order.status).toUpperCase() === "PEWC") {
    workingDaysElapsed = 0;
    slaBreached = false;
    estimatedComplete = null;
  }

  return {
    orderNo,
    putawayStage,
    shelveCompletedDate,
    estimatedComplete,
    qtyComparison: computeQtyComparison(order, checkQtyDiscrepancy, skuPutawaySummary),
    workingDaysElapsed,
    slaBreached,
    slaWorkingDays,
    dicTime: dicTime || null,
    dicTimezone: dicTimezone || null,
    currentStatus: str(order.status) || null,
    destWhCode: str(order.destWhCode) || null,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const prunedOrderData = (params.prunedOrderData ?? {}) as Record<string, unknown>;
  const list = (prunedOrderData.list as unknown[]) ?? [];
  const checkQtyDiscrepancy = params.checkQtyDiscrepancy !== false;
  const skuPutawaySummary = (params.skuPutawaySummary ?? null) as Record<string, unknown> | null;
  const requiresNarrowing =
    params.requiresNarrowing === true ||
    (prunedOrderData._detailExtractMeta as Record<string, unknown>)?.requiresNarrowing === true;

  const orders = list
    .filter((item) => item && typeof item === "object")
    .map((item) => computeOrderProgress(item as Record<string, unknown>, checkQtyDiscrepancy, skuPutawaySummary));

  if (orders.length === 0 && stringArray(params.inboundOrderNos).length > 0) {
    return {
      putawayProgress: {
        outputPath: "no_data",
        dataAvailable: false,
        needsClarification: true,
        clarificationFields: ["inboundOrderNo"],
        orderNo: "",
        putawayStage: "unknown",
        shelveCompletedDate: null,
        estimatedComplete: null,
        qtyComparison: null,
        workingDaysElapsed: null,
        slaBreached: null,
        slaWorkingDays: null,
        dicTime: null,
        currentStatus: null,
        orders: [],
        orderCount: 0,
        skuPutawaySummary: skuPutawaySummary ?? undefined,
        requiresNarrowing,
      },
    };
  }

  const primary = orders[0] ?? {
    orderNo: "",
    putawayStage: "pending" as PutawayStage,
    shelveCompletedDate: null,
    estimatedComplete: null,
    qtyComparison: null,
    workingDaysElapsed: 0,
    slaBreached: false,
    slaWorkingDays: 3,
    dicTime: null,
    dicTimezone: null,
    currentStatus: null,
  };

  return {
    putawayProgress: {
      ...primary,
      orders,
      orderCount: orders.length,
      skuPutawaySummary: skuPutawaySummary ?? undefined,
      requiresNarrowing,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("compute-putaway-progress")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
