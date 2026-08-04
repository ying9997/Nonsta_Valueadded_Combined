/**
 * 节点：derive-order-status-evidence
 *
 * 将 OMS 订单字段与轨迹拆成可安全消费的证据层：
 * - 轨迹节点属于当前接口实际返回的事实；
 * - expected / target / goal 时间只保留其计划语义；
 * - 本专家不查询头程 TMS 或异常接口，因此不得据此宣称已到港或无异常。
 */

interface TrackingFact {
  code: string;
  description: string;
  time: string;
  location: string;
}

interface OrderStatusEvidence {
  orderNo: string;
  currentStatus: string;
  isHeadLegInTransit: boolean;
  latestActualMilestone: TrackingFact | null;
  arrivalPortVerified: false;
  warehouseArrivalVerified: boolean;
  actualWarehouseArrivalTime: string | null;
  expectedSendwarehouseTime: string | null;
  forecastWarehouseTime: string | null;
  targetWarehouseArrivalTime: string | null;
  goalShelveDate: string | null;
  estimatedShelveTime: string | null;
  estimatedShelveTimeLocal: string | null;
  actualShelveTime: string | null;
  orderTimes: Record<string, string | null>;
  pickupTimes: Record<string, string | number | null>;
  timeEvidencePolicy: Record<string, string>;
  timeZone: "unknown";
  supplementalSource: string | null;
  orderProfile: Record<string, unknown>;
  product: Record<string, unknown>;
  transport: Record<string, unknown>;
  warehouse: Record<string, unknown>;
  inspection: Record<string, unknown>;
  processFlags: Record<string, unknown>;
  booking: Record<string, unknown>;
  serviceTiming: Record<string, unknown>;
  forecast: Record<string, unknown>;
  quantitySummary: Record<string, unknown>;
  dataCoverage: Record<string, string>;
  exceptionVerification: "not_checked_by_inbound_order_status";
  canClaimNoException: false;
  requiresManualTransitVerification: boolean;
  evidenceWarnings: string[];
}

const WAREHOUSE_ARRIVED_STATUSES = new Set(["PEWC", "EWC", "SHD"]);

const ORDER_TIME_SEMANTICS: Record<string, string> = {
  orderDate: "system_recorded_order_time",
  shelveCompletedDate: "actual_shelve_completed_time",
  voidDate: "actual_void_time",
  awhDate: "actual_warehouse_arrival_time",
  dicDate: "actual_domestic_inbound_completed_time",
  dioDate: "actual_domestic_outbound_completed_time",
  pickupDate: "system_recorded_pickup_time",
  pickupCompletedDate: "actual_pickup_completed_time",
  estimateShelveCompletedDate: "system_target_shelve_time_not_commitment",
  goalShelveDate: "system_estimated_shelve_time_not_commitment",
  targetWarehouseArrivalTime: "system_target_warehouse_arrival_not_actual",
  unloadStartDate: "actual_unload_start_time",
  unloadDate: "actual_unload_completed_time",
  estimateUnloadDate: "system_estimated_unload_time_not_actual",
  mergeDate: "actual_order_merge_time",
  receiptCompletionDate: "actual_domestic_receipt_completed_time",
  estimateDeliveryDate: "system_estimated_outbound_time_not_warehouse_delivery",
  targetShelveTime: "system_target_shelve_time_not_commitment",
  targetShelveTimeLocal: "local_system_target_shelve_time_not_commitment",
  estimateShelveTime: "system_estimated_shelve_time_not_commitment",
  estimateShelveTimeLocal: "local_system_estimated_shelve_time_not_commitment",
  actualShelveTime: "actual_shelve_time",
  actualShelveTimeLocal: "local_actual_shelve_time",
  expectedSendwarehouseTime: "system_estimated_send_to_warehouse_not_actual",
  forecastWarehouseTime: "system_forecast_warehouse_arrival_not_actual",
};

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const normalized = str(value);
    if (normalized) return normalized;
  }
  return "";
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringMap(value: unknown): Record<string, string | null> {
  const source = record(value);
  const result: Record<string, string | null> = {};
  for (const [key, item] of Object.entries(source)) result[key] = str(item) || null;
  return result;
}

function trackingList(order: Record<string, unknown>): Array<Record<string, unknown>> {
  const raw = Array.isArray(order.trackingList)
    ? order.trackingList
    : Array.isArray(order.trajectoryList)
      ? order.trajectoryList
      : [];
  return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function trackingTime(item: Record<string, unknown>): string {
  return firstNonEmpty(
    item.localTrackingDate,
    item.trackingDate,
    item.date,
    item.time,
    item.created,
  );
}

function latestTrackingFact(order: Record<string, unknown>): TrackingFact | null {
  const items = trackingList(order);
  if (items.length === 0) return null;

  let latest = items[items.length - 1]!;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const parsed = Date.parse(trackingTime(item).replace(" ", "T"));
    if (Number.isFinite(parsed) && parsed >= latestTimestamp) {
      latest = item;
      latestTimestamp = parsed;
    }
  }

  return {
    code: firstNonEmpty(latest.trackingCode, latest.code, latest.statusCode),
    description: firstNonEmpty(
      latest.trackingDesc,
      latest.description,
      latest.desc,
      latest.statusDesc,
    ),
    time: trackingTime(latest),
    location: firstNonEmpty(latest.location, latest.address),
  };
}

function isHeadLegInTransit(order: Record<string, unknown>, status: string): boolean {
  if (status !== "TS") return false;
  const supplemental = record(order.supplementalOrderDetail);
  const product = record(supplemental.product);
  const transport = record(supplemental.transport);
  const productCode = firstNonEmpty(order.winitProductCode, product.winitProductCode);
  const transportType = firstNonEmpty(
    order.transprotType,
    order.transportType,
    transport.transprotType,
    transport.transportMode,
  ).toUpperCase();
  return /^OW01011/i.test(productCode) || transportType === "SEA" || transportType === "AIR";
}

function deriveEvidence(order: Record<string, unknown>): OrderStatusEvidence {
  const supplemental = record(order.supplementalOrderDetail);
  const orderTimes = stringMap(supplemental.orderTimes);
  const pickupTimesSource = record(supplemental.pickupTimes);
  const pickupTimes: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(pickupTimesSource)) {
    pickupTimes[key] = typeof value === "number" ? value : str(value) || null;
  }
  const forecast = record(supplemental.forecast);
  const baseStatus = str(order.status).toUpperCase();
  const supplementalStatus = str(supplemental.status).toUpperCase();
  const currentStatus = baseStatus || supplementalStatus;
  const actualWarehouseArrivalTime =
    firstNonEmpty(orderTimes.awhDate, order.awhDate, order.actualArrivalTime) || null;
  const warehouseArrivalVerified =
    Boolean(actualWarehouseArrivalTime) || WAREHOUSE_ARRIVED_STATUSES.has(currentStatus);
  const headLegInTransit = isHeadLegInTransit(order, currentStatus);
  const expectedSendwarehouseTime = firstNonEmpty(
    forecast.expectedSendwarehouseTime,
    order.expectedSendwarehouseTime,
  ) || null;
  const forecastWarehouseTime = str(forecast.forecastWarehouseTime) || null;
  const targetWarehouseArrivalTime =
    firstNonEmpty(orderTimes.targetWarehouseArrivalTime, order.targetWarehouseArrivalTime) || null;
  const goalShelveDate = firstNonEmpty(orderTimes.goalShelveDate, order.goalShelveDate) || null;
  const estimatedShelveTime = firstNonEmpty(
    orderTimes.estimateShelveTime,
    orderTimes.estimateShelveCompletedDate,
  ) || null;
  const estimatedShelveTimeLocal = str(orderTimes.estimateShelveTimeLocal) || null;
  const actualShelveTime = firstNonEmpty(
    orderTimes.actualShelveTime,
    orderTimes.shelveCompletedDate,
    order.shelveCompletedDate,
  ) || null;

  const evidenceWarnings = [
    "PORT_ARRIVAL_NOT_VERIFIED_BY_CURRENT_EXPERT",
    "EXCEPTION_STATUS_NOT_CHECKED_BY_CURRENT_EXPERT",
  ];
  if (expectedSendwarehouseTime || targetWarehouseArrivalTime) {
    evidenceWarnings.push("PLANNED_WAREHOUSE_TIME_IS_NOT_ACTUAL_ARRIVAL_EVIDENCE");
  }
  if (forecastWarehouseTime) {
    evidenceWarnings.push("FORECAST_WAREHOUSE_TIME_IS_NOT_ACTUAL_ARRIVAL_EVIDENCE");
  }
  if (headLegInTransit && !expectedSendwarehouseTime) {
    evidenceWarnings.push("EXPECTED_SENDWAREHOUSE_TIME_NOT_RETURNED");
  }
  if (goalShelveDate) {
    evidenceWarnings.push("GOAL_SHELVE_DATE_IS_NOT_A_COMPLETION_COMMITMENT");
  }
  if (baseStatus && supplementalStatus && baseStatus !== supplementalStatus) {
    evidenceWarnings.push("ORDER_STATUS_SOURCE_CONFLICT");
  }
  if ((actualWarehouseArrivalTime || actualShelveTime) && (expectedSendwarehouseTime || forecastWarehouseTime)) {
    evidenceWarnings.push("ACTUAL_TIME_TAKES_PRECEDENCE_OVER_FORECAST");
  }

  const latestActualMilestone = latestTrackingFact(order);
  const hasTracking = Boolean(latestActualMilestone);

  return {
    orderNo: firstNonEmpty(order.orderNo, order.inboundOrderNo, order.inboundOrderNum),
    currentStatus,
    isHeadLegInTransit: headLegInTransit,
    latestActualMilestone,
    // 当前专家只调用 OMS 详情与 OMS 轨迹，不调用 TMS 头程轨迹。
    arrivalPortVerified: false,
    warehouseArrivalVerified,
    actualWarehouseArrivalTime,
    expectedSendwarehouseTime,
    forecastWarehouseTime,
    targetWarehouseArrivalTime,
    goalShelveDate,
    estimatedShelveTime,
    estimatedShelveTimeLocal,
    actualShelveTime,
    orderTimes,
    pickupTimes,
    timeEvidencePolicy: {
      ...ORDER_TIME_SEMANTICS,
    },
    timeZone: "unknown",
    supplementalSource: str(supplemental.sourceAction) || null,
    orderProfile: record(supplemental.orderProfile),
    product: record(supplemental.product),
    transport: record(supplemental.transport),
    warehouse: record(supplemental.warehouse),
    inspection: record(supplemental.inspection),
    processFlags: record(supplemental.processFlags),
    booking: record(supplemental.booking),
    serviceTiming: record(supplemental.serviceTiming),
    forecast,
    quantitySummary: record(supplemental.quantitySummary),
    dataCoverage: {
      orderStatus: currentStatus ? "available" : "not_returned",
      tracking: hasTracking ? "available" : "not_returned",
      expectedSendTime: expectedSendwarehouseTime ? "available" : "not_returned",
      forecastWarehouseTime: forecastWarehouseTime ? "available" : "not_returned",
      warehouseArrival: warehouseArrivalVerified ? "verified" : "not_verified",
      shelveTime: actualShelveTime
        ? "actual_available"
        : estimatedShelveTime || estimatedShelveTimeLocal || goalShelveDate
          ? "estimate_available"
          : "not_returned",
      exceptionStatus: "not_checked",
    },
    // 当前专家没有调用任何异常单或内部异常事件接口。
    exceptionVerification: "not_checked_by_inbound_order_status",
    canClaimNoException: false,
    requiresManualTransitVerification: headLegInTransit && !warehouseArrivalVerified,
    evidenceWarnings,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const prunedOrderData = (params.prunedOrderData ?? {}) as Record<string, unknown>;
  const list = Array.isArray(prunedOrderData.list) ? prunedOrderData.list : [];
  const orders = list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(deriveEvidence);

  return {
    orderStatusEvidence: {
      primary: orders[0] ?? null,
      orders,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("derive-order-status-evidence")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
