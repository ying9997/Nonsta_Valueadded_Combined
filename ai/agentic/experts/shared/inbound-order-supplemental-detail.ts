/**
 * wh.inboundOrder.getOrderDetail 的安全适配层。
 *
 * 原接口返回客户、申报、商品、金额等大量敏感或非本专家字段；这里只保留
 * inbound-order-status 所需的订单概览、运输、流程标志、数量摘要与订单级时间。
 */

export const INBOUND_SUPPLEMENTAL_DETAIL_ACTION = "wh.inboundOrder.getOrderDetail";

export type SupplementalActionPlan = { orderNo: string };

export type NormalizedSupplementalDetail = {
  sourceAction: typeof INBOUND_SUPPLEMENTAL_DETAIL_ACTION;
  orderNo: string;
  status: string;
  customerOrderNo: string;
  orderProfile: Record<string, string | null>;
  product: Record<string, string | null>;
  transport: Record<string, string | null>;
  warehouse: Record<string, string | null>;
  inspection: Record<string, string | null>;
  processFlags: Record<string, string | null>;
  booking: Record<string, string | null>;
  serviceTiming: Record<string, string | number | null>;
  orderTimes: Record<string, string | null>;
  pickupTimes: Record<string, string | number | null>;
  forecast: Record<string, string | null>;
  quantitySummary: Record<string, number | null>;
  dataQuality: {
    ownershipCheck: "matched" | "not_returned";
    hasForecast: boolean;
    hasActualWarehouseTime: boolean;
    hasActualShelveTime: boolean;
  };
};

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function nullableString(value: unknown): string | null {
  return str(value) || null;
}

function nullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseNestedJson(data: unknown): unknown {
  let parsed = data;
  for (let i = 0; i < 5 && typeof parsed === "string"; i++) {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      break;
    }
  }
  return parsed;
}

export function coerceSupplementalDetailPayload(parsed: unknown): Record<string, unknown> | null {
  const value = parseNestedJson(parsed);
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.orderNo != null) return item;
  if (item.output != null) return coerceSupplementalDetailPayload(item.output);
  if ((item.code === "0" || item.code === 0) && item.data != null) {
    return coerceSupplementalDetailPayload(item.data);
  }
  return null;
}

export function buildSupplementalDetailActions(orderNos: string[]): {
  actions: Array<{ action: string; data: string }>;
  actionPlans: SupplementalActionPlan[];
} {
  const actionPlans = orderNos
    .map((orderNo) => str(orderNo).toUpperCase())
    .filter(Boolean)
    .map((orderNo) => ({ orderNo }));
  return {
    actions: actionPlans.map(({ orderNo }) => ({
      action: INBOUND_SUPPLEMENTAL_DETAIL_ACTION,
      data: JSON.stringify({ orderNo }),
    })),
    actionPlans,
  };
}

export function normalizeSupplementalDetail(
  raw: Record<string, unknown>,
  expectedCustomerCode = "",
): NormalizedSupplementalDetail | null {
  const orderNo = str(raw.orderNo).toUpperCase();
  if (!orderNo) return null;

  const returnedCustomerCode = str(raw.customerCode);
  const expected = str(expectedCustomerCode);
  // 一旦调用方提供客户上下文，就必须由接口返回值完成正向归属校验。
  // 缺失 customerCode 与明确不匹配同样拒绝，避免把未核实数据送入后续节点。
  if (expected && returnedCustomerCode !== expected) return null;

  const product = record(raw.winitProduct);
  const timeNode = record(raw.orderKeyTimeNode);
  const pickupInfo = record(raw.pickupInfo);
  const forecastInfo = record(raw.directForecastInfo);
  const goods = record(raw.goodsStatistics);

  const orderTimes: Record<string, string | null> = {
    orderDate: nullableString(timeNode.orderDate),
    shelveCompletedDate: nullableString(timeNode.shelveCompletedDate),
    voidDate: nullableString(timeNode.voidDate),
    awhDate: nullableString(timeNode.awhDate),
    dicDate: nullableString(timeNode.dicDate),
    dioDate: nullableString(timeNode.dioDate),
    pickupDate: nullableString(timeNode.pickupDate),
    pickupCompletedDate: nullableString(timeNode.pickupCompletedDate),
    estimateShelveCompletedDate: nullableString(timeNode.estimateShelveCompletedDate),
    goalShelveDate: nullableString(timeNode.goalShelveDate),
    targetWarehouseArrivalTime: nullableString(timeNode.targetWarehouseArrivalTime),
    unloadStartDate: nullableString(timeNode.unloadStartDate),
    unloadDate: nullableString(timeNode.unloadDate),
    estimateUnloadDate: nullableString(timeNode.estimateUnloadDate),
    mergeDate: nullableString(timeNode.mergeDate),
    receiptCompletionDate: nullableString(timeNode.receiptCompletionDate),
    estimateDeliveryDate: nullableString(timeNode.estimateDeliveryDate),
    targetShelveTime: nullableString(timeNode.targetShelveTime),
    targetShelveTimeLocal: nullableString(timeNode.targetShelveTimeLocal),
    estimateShelveTime: nullableString(timeNode.estimateShelveTime),
    estimateShelveTimeLocal: nullableString(timeNode.estimateShelveTimeLocal),
    actualShelveTime: nullableString(timeNode.actualShelveTime),
    actualShelveTimeLocal: nullableString(timeNode.actualShelveTimeLocal),
  };

  const forecast = {
    expectedSendWarehouseWay: nullableString(forecastInfo.expectedSendWarehouseWay),
    expectedSendwarehouseTime: nullableString(forecastInfo.expectedSendwarehouseTime),
    forecastWarehouseTime: nullableString(forecastInfo.forecastWarehouseTime),
  };

  return {
    sourceAction: INBOUND_SUPPLEMENTAL_DETAIL_ACTION,
    orderNo,
    status: str(raw.status).toUpperCase(),
    customerOrderNo: str(raw.customerOrderNo),
    orderProfile: {
      entryWhType: nullableString(raw.entryWhType),
      mergeType: nullableString(raw.mergeType),
      mainOrderNo: nullableString(raw.mainOrderNo),
      orderMode: nullableString(raw.orderMode),
      orderSource: nullableString(raw.orderSource),
      originallyOrderNo: nullableString(raw.originallyOrderNo),
    },
    product: {
      winitProductCode: nullableString(raw.winitProductCode ?? product.winitProductCode),
      winitProductName: nullableString(raw.winitProductName ?? product.winitProductName),
      pscCode: nullableString(product.pscCode),
      productGroupCode: nullableString(product.productGroupCode),
    },
    transport: {
      onwardVoyageType: nullableString(raw.onwardVoyageType),
      transprotType: nullableString(raw.transprotType),
      transportMode: nullableString(raw.transportMode),
    },
    warehouse: {
      inspectionCountryCode: nullableString(raw.inspectionCountryCode),
      inspectionCountryName: nullableString(raw.inspectionCountryName),
      inspectionWhCode: nullableString(raw.inspectionWhCode),
      inspectionWhName: nullableString(raw.inspectionWhName),
      actualInspectionWhCode: nullableString(raw.actualInspectionWhCode),
      actualInspectionWhName: nullableString(raw.actualInspectionWhName),
      destinationCountryCode: nullableString(raw.destinationCountryCode),
      destinationCountryName: nullableString(raw.destinationCountryName),
      destWhCode: nullableString(raw.destWhCode),
      destWhName: nullableString(raw.destWhName),
    },
    inspection: {
      inspectionType: nullableString(raw.inspectionType),
      inspectionMode: nullableString(raw.inspectionMode),
      inspectionSource: nullableString(raw.inspectionSource),
      isExemptInspection: nullableString(raw.isExemptInspection),
    },
    processFlags: {
      isForecastOrder: nullableString(raw.isForecastOrder),
      isSelfInspection: nullableString(raw.isSelfInspection),
      isAutoInspection: nullableString(raw.isAutoInspection),
      isInspectionComplete: nullableString(raw.isInspectionComplete),
      isSendPort: nullableString(raw.isSendPort),
      isSendWarehouse: nullableString(raw.isSendWarehouse),
      isExportClearance: nullableString(raw.isExportClearance),
      isImportClearance: nullableString(raw.isImportClearance),
      isSendCwmOrder: nullableString(raw.isSendCwmOrder),
      needReservationSendWh: nullableString(raw.needReservationSendWh),
    },
    booking: {
      bookingStatus: nullableString(raw.bookingStatus),
      mergeBooking: nullableString(raw.mergeBooking),
    },
    serviceTiming: {
      slaCalType: nullableString(raw.slaCalType),
      serviceStandardTime: nullableNumber(raw.serviceStandardTime),
      serviceCompleteTime: nullableNumber(raw.serviceCompleteTime),
      serviceStatus: nullableString(raw.serviceStatus),
      isOnTime: nullableString(raw.isOnTime),
    },
    orderTimes,
    pickupTimes: {
      pickupDate: nullableString(pickupInfo.pickupDate),
      pickUpDateStr: nullableString(pickupInfo.pickUpDateStr),
      pickUpTimeStr: nullableString(pickupInfo.pickUpTimeStr),
      pickupCompletedDate: nullableString(pickupInfo.pickupCompletedDate),
      expectFromDate: nullableString(pickupInfo.expectFromDate),
      expectToDate: nullableString(pickupInfo.expectToDate),
      advanceBookingTime: nullableNumber(pickupInfo.advanceBookingTime),
    },
    forecast,
    quantitySummary: {
      orderMerchandiseQty: nullableNumber(goods.orderMerchandiseQty),
      orderItemQty: nullableNumber(goods.orderItemQty),
      orderPackageQty: nullableNumber(goods.orderPackageQty),
      actualOrderMerchandiseQty: nullableNumber(goods.actualOrderMerchandiseQty),
      actualOrderItemQty: nullableNumber(goods.actualOrderItemQty),
      actualOrderPackageQty: nullableNumber(goods.actualOrderPackageQty),
      inspectionItemQty: nullableNumber(goods.inspectionItemQty),
      shelveItemQty: nullableNumber(goods.shelveItemQty),
    },
    dataQuality: {
      ownershipCheck: returnedCustomerCode ? "matched" : "not_returned",
      hasForecast: Boolean(forecast.expectedSendwarehouseTime || forecast.forecastWarehouseTime),
      hasActualWarehouseTime: Boolean(orderTimes.awhDate),
      hasActualShelveTime: Boolean(orderTimes.actualShelveTime || orderTimes.shelveCompletedDate),
    },
  };
}
