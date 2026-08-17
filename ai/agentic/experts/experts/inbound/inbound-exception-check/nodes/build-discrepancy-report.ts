/**
 * 节点：build-discrepancy-report — 四层数量聚合与升级判断
 * FaaS 单文件闭环，无外部 import。
 */

const VAS_EXCEPTION_TYPES = new Set([
  "WRONG_WAREHOUSE",
  "OWNERLESS_GOODS",
  "PRE_SHELVE_ACTION",
  "EXTRA_ITEM",
  "LABEL_MISSING",
]);
const HUMAN_REVIEW_TYPES = new Set(["DAMAGE", "QTY_DIFF"]);
const DISCREPANCY_RATE_THRESHOLD = 0.05;
const DISCREPANCY_ABS_THRESHOLD = 10;
const PAGE_SIZE = 50;
const HEAD_LEG_STATUSES = new Set(["TS"]);
const PACKAGE_COMPARABLE_STATUSES = new Set(["EWC", "SHD", "SCP"]);
const PACKAGE_CONCERN_KEYWORDS = ["箱", "包裹", "少箱", "多箱", "package", "carton", "box"];
const HEAD_LEG_KEYWORDS = [
  "头程",
  "清关",
  "海关",
  "查验",
  "送仓进口",
  "实物查验",
  "到港",
  "离港",
  "船期",
  "航班",
  "customs",
  "clearance",
  "inspection",
  "first leg",
  "first-leg",
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => str(item)).filter(Boolean)
    : [];
}

function textIncludesAny(text: string, keywords: string[]): boolean {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function extractVasOrderNo(params: Record<string, unknown>, customerQuestion: string): string {
  const explicit = str(params.vasOrderNo);
  if (explicit) return explicit;
  const match = customerQuestion.toUpperCase().match(/\b(?:VASC[A-Z0-9-]{6,}|V\d{6,})\b/);
  return match?.[0] ?? "";
}

function buildContextContinuity(
  inputContextValue: unknown,
  exceptionLookupStatus: string,
  followUpVasOrderNo: string,
): Record<string, unknown> {
  const inputContext = asRecord(inputContextValue);
  const previousOutput = asRecord(inputContext.previousOutput);
  const nestedResult = asRecord(previousOutput.result);
  const previousStructured = asRecord(previousOutput.structured ?? nestedResult.structured);
  const previousAnalysis = str(previousOutput.analysis ?? nestedResult.analysis);
  const hasPreviousOutput = Object.keys(previousOutput).length > 0 || previousAnalysis.length > 0;
  const currentLookupDoesNotOverridePrevious =
    hasPreviousOutput && ["success_empty", "api_error", "parse_error", "partial_failure"].includes(exceptionLookupStatus);

  return {
    hasPreviousOutput,
    previousOrderNo: str(previousStructured.orderNo),
    previousExceptionCount:
      typeof previousStructured.totalExceptions === "number" ? previousStructured.totalExceptions : null,
    previousExceptionTypes: stringArray(previousStructured.exceptionTypes),
    currentLookupDoesNotOverridePrevious,
    followUpVasOrderNo,
  };
}

function isHeadLegProduct(order: Record<string, unknown>): boolean {
  const productCode = str(order.winitProductCode);
  const productName = str(order.winitProductName);
  return (
    /^OW01011/i.test(productCode) ||
    textIncludesAny(productName, ["头程", "海运", "空运", "散货", "海卡", "快船", "普船"])
  );
}

function hasHeadLegTransportSignals(order: Record<string, unknown>): boolean {
  return Boolean(
    str(order.containerNo) ||
      str(order.logisticsPlanName) ||
      str(order.logisticsPlanNo) ||
      str(order.pickupAddressCode) ||
      str(order.inspectionWarehouseCode),
  );
}

function orderSuggestsHeadLegBeforePutaway(order: Record<string, unknown>): boolean {
  const status = str(order.status).toUpperCase();
  return HEAD_LEG_STATUSES.has(status) && (isHeadLegProduct(order) || hasHeadLegTransportSignals(order));
}

function exceptionLookupMessage(status: string): string {
  if (status === "success_with_records") return "异常单接口已返回异常明细。";
  if (status === "success_empty") return "异常单接口调用成功，但未返回异常明细。";
  if (status === "api_error") return "异常单接口调用失败，当前无法确认异常明细。";
  if (status === "parse_error") return "异常单接口返回结构无法识别，当前无法确认异常明细。";
  if (status === "partial_failure") return "异常单查询仅部分成功，当前结果可能不完整。";
  if (status === "skipped") return "本次未执行异常单接口查询。";
  return "异常单查询状态未知。";
}

function buildCoverageGap(
  order: Record<string, unknown> | undefined,
  exceptionDescription: string,
  exceptionRecordCount: number,
): { coverageGap: boolean; coverageGapReason: string; orderPhaseHint: string; isPutawayComparable: boolean } {
  const hasHeadLegKeyword = textIncludesAny(exceptionDescription, HEAD_LEG_KEYWORDS);
  const hasHeadLegOrderFacts = order ? orderSuggestsHeadLegBeforePutaway(order) : false;
  const coverageGap = exceptionRecordCount === 0 && (hasHeadLegKeyword || hasHeadLegOrderFacts);
  if (!coverageGap) {
    return {
      coverageGap: false,
      coverageGapReason: "",
      orderPhaseHint: "",
      isPutawayComparable: true,
    };
  }
  const reason = hasHeadLegKeyword
    ? "用户描述命中头程/清关/海关查验类异常，但当前对客入库异常接口未返回头程/清关异常明细，需人工通过内部系统核实。"
    : "订单状态或产品链路显示仍处于头程/运输/清关相关阶段，当前对客入库异常接口未返回头程异常明细，不能按上架数为 0 判定入库数量差异，需人工通过内部系统核实。";
  return {
    coverageGap: true,
    coverageGapReason: reason,
    orderPhaseHint: "first_leg_or_customs",
    isPutawayComparable: false,
  };
}

function normalizeException(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const exceptionType = str(o.exceptionType ?? o.type ?? o.exceptionName).toUpperCase();
  if (!exceptionType) return null;
  return {
    exceptionType,
    exceptionCode: str(o.exceptionCode ?? o.eventCode),
    exceptionName: str(o.exceptionName ?? o.eventName ?? o.type),
    eventNo: str(o.eventNo),
    exceptionQty: num(o.exceptionQty ?? o.qty ?? o.orderItemQty),
    receivedQty: num(o.receivedQty),
    expectedQty: num(o.expectedQty ?? o.forecastQty),
    merchandiseCode: str(o.merchandiseCode ?? o.merchandiseSerno ?? o.sku),
    packageNo: str(o.packageNo ?? o.packageSerno),
    status: str(o.status),
    exceptionReason: str(o.exceptionReason ?? o.reason ?? o.errormsg ?? o.exceptionDesc),
    exceptionObject: str(o.exceptionObjectName ?? o.exceptionObject),
    inboundOrderNo: str(o.inboundOrderNo ?? o.orderNo),
    winitProductName: str(o.winitProductName),
    destWhName: str(o.destWhName),
  };
}

function buildOrderReport(order: Record<string, unknown>): Record<string, unknown> {
  const merchList = (order.merchandiseList ?? order.inboundMerchandiseVos) as unknown[] | undefined;
  let forecastQty = num(order.totalMerchandiseQty) || num(order.orderMerchandiseQty);
  let receivedQty = num(order.actualOrderMerchandiseQty);
  let putawayQty = num(order.actualOrderMerchandiseQty);

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
    if (sumQty > 0) forecastQty = sumQty;
    if (sumActual > 0) putawayQty = sumActual;
    if (sumInspection > 0) receivedQty = sumInspection;
    else if (sumActual > 0) receivedQty = sumActual;
  }

  const forecastPackageRaw = order.totalPackageQty ?? order.orderPackageQty;
  const receivedPackageRaw = order.actualOrderPackageQty;
  const hasForecastPackageFact = forecastPackageRaw != null && String(forecastPackageRaw).trim() !== "";
  const hasReceivedPackageFact = receivedPackageRaw != null && String(receivedPackageRaw).trim() !== "";
  const forecastPackageQty = hasForecastPackageFact ? num(forecastPackageRaw) : null;
  const receivedPackageQty = hasReceivedPackageFact ? num(receivedPackageRaw) : null;
  const hasComparablePackageFacts = hasForecastPackageFact && hasReceivedPackageFact;
  const packageDiscrepancy = hasComparablePackageFacts
    ? num(forecastPackageQty) - num(receivedPackageQty)
    : null;
  const packageDiscrepancyRate =
    hasComparablePackageFacts && num(forecastPackageQty) > 0
      ? Math.abs(num(packageDiscrepancy)) / num(forecastPackageQty)
      : null;
  const discrepancy = forecastQty - receivedQty;
  const discrepancyRate = forecastQty > 0 ? Math.abs(discrepancy) / forecastQty : 0;

  return {
    orderNo: str(order.orderNo ?? order.inboundOrderNum),
    forecastQty,
    receivedQty,
    putawayQty,
    forecastPackageQty,
    receivedPackageQty,
    packageDiscrepancy,
    packageDiscrepancyRate:
      packageDiscrepancyRate == null ? null : Math.round(packageDiscrepancyRate * 10000) / 10000,
    hasForecastPackageFact,
    hasReceivedPackageFact,
    hasPackageDiscrepancy: hasComparablePackageFacts && packageDiscrepancy !== 0,
    discrepancy,
    discrepancyRate: Math.round(discrepancyRate * 10000) / 10000,
    isAbnormal: order.isAbnormal === true || order.isAbnormal === "Y",
    skuLevel: Array.isArray(merchList) && merchList.length > 0,
  };
}

function suggestNextExpert(types: string[]): string {
  if (types.some((t) => VAS_EXCEPTION_TYPES.has(t))) return "value-add/value-add-exception-diagnosis";
  return "";
}

function normalizeObjectLevel(record: Record<string, unknown> | undefined): string {
  const raw = str(record?.exceptionObject).toLowerCase();
  const type = str(record?.exceptionType);
  if (raw.includes("订单") || raw.includes("order")) return "order";
  if (raw.includes("包裹") || raw.includes("package") || type === "LABEL_MISSING") return "package";
  if (raw.includes("商品") || raw.includes("product") || type === "EXTRA_ITEM") return "product";
  if (raw.includes("单品") || raw.includes("item")) return "item";
  if (raw.includes("托") || raw.includes("pallet")) return "pallet";
  return "";
}

function buildValueAddHandoff(
  suggestedNextExpert: string,
  exceptionRecords: Record<string, unknown>[],
  primaryReport: Record<string, unknown>,
  exceptionDescription: string,
): Record<string, unknown> {
  if (!suggestedNextExpert) return {};
  const record =
    exceptionRecords.find((r) => VAS_EXCEPTION_TYPES.has(str(r.exceptionType))) ?? exceptionRecords[0] ?? {};
  return {
    exceptionCode: str(record.exceptionCode),
    exceptionName: str(record.exceptionName) || str(record.exceptionType),
    exceptionCategory: str(record.exceptionType),
    exceptionObject: str(record.exceptionObject),
    objectLevel: normalizeObjectLevel(record),
    inboundOrderNo: str(record.inboundOrderNo) || str(primaryReport.orderNo),
    eventNo: str(record.eventNo),
    customerActionHint: exceptionDescription,
    evidenceSummary: {
      discrepancyReport: primaryReport,
      exceptionReason: str(record.exceptionReason),
      packageNo: str(record.packageNo),
      merchandiseCode: str(record.merchandiseCode),
      status: str(record.status),
    },
    recommendedEntryExpert: suggestedNextExpert,
  };
}

function buildOrderStatusHandoff(
  vasOrderNo: string,
  inboundOrderNo: string,
  exceptionLookupStatus: string,
  contextContinuity: Record<string, unknown>,
): Record<string, unknown> {
  if (!vasOrderNo) return {};
  return {
    vasOrderNo,
    businessNo: inboundOrderNo,
    inboundOrderNo,
    sourceExpertId: "inbound-exception-check",
    currentExceptionLookupStatus: exceptionLookupStatus,
    contextContinuity,
    recommendedEntryExpert: "value-add/value-add-order-status",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const rawExceptionData = (params.rawExceptionData ?? {}) as Record<string, unknown>;
  const exceptionDescription = str(params.exceptionDescription);
  const customerQuestion = [str(params.query), str(params.customerIntent), exceptionDescription]
    .filter(Boolean)
    .join(" ");

  const orderList = Array.isArray(rawOrderData.list) ? rawOrderData.list : [];
  const exceptionRawList = Array.isArray(rawExceptionData.list) ? rawExceptionData.list : [];
  const fetchMeta = (rawExceptionData._fetchMeta ?? {}) as Record<string, unknown>;
  const exceptionLookupStatus =
    str(fetchMeta.status) || (exceptionRawList.length > 0 ? "success_with_records" : "unknown");
  const exceptionLookupMessageText = exceptionLookupMessage(exceptionLookupStatus);
  const followUpVasOrderNo = extractVasOrderNo(params, customerQuestion);
  const contextContinuity = buildContextContinuity(
    params.inputContext,
    exceptionLookupStatus,
    followUpVasOrderNo,
  );
  const totalExceptions =
    typeof rawExceptionData.total === "number" ? rawExceptionData.total : exceptionRawList.length;
  const hasMoreExceptions = totalExceptions > PAGE_SIZE;
  const queryAllExceptions = params.queryAllExceptions === true;
  const requestedOrderNos = stringArray(params.inboundOrderNos);
  const hasRequestedOrder = requestedOrderNos.length > 0;
  const followUpSuggestedNextExpert = followUpVasOrderNo
    ? "value-add/value-add-order-status"
    : "";
  const followUpValueAddHandoff = buildOrderStatusHandoff(
    followUpVasOrderNo,
    requestedOrderNos[0] || "",
    exceptionLookupStatus,
    contextContinuity,
  );
  const continuityNeedsResolution = contextContinuity.currentLookupDoesNotOverridePrevious === true;
  const needsFollowUp = Boolean(followUpVasOrderNo) || continuityNeedsResolution;
  const followUpReason = followUpVasOrderNo
    ? "用户已补充已提交增值单号，应转 value-add/value-add-order-status 查询主状态与执行进度；当前入库异常快照不能代替增值单状态。"
    : continuityNeedsResolution
      ? "当前异常查询结果不能覆盖或否定上一轮上下文，需要结合上一轮事实继续核实。"
      : "";

  if (orderList.length === 0 && exceptionRawList.length === 0 && (!queryAllExceptions || hasRequestedOrder)) {
    return {
      discrepancyReport: null,
      orderReports: [],
      exceptionRecords: [],
      exceptionTypes: [],
      needsHumanReview: false,
      humanReviewReason: "",
      suggestedNextExpert: followUpSuggestedNextExpert,
      valueAddHandoff: followUpValueAddHandoff,
      hasMoreExceptions: false,
      totalExceptions: 0,
      requiresNarrowing: false,
      needsClarification: !followUpVasOrderNo,
      clarificationFields: followUpVasOrderNo ? [] : ["inboundOrderNo"],
      coverageGap: false,
      coverageGapReason: "",
      orderPhaseHint: "",
      isPutawayComparable: true,
      exceptionLookupStatus,
      exceptionLookupMessage: exceptionLookupMessageText,
      contextContinuity,
      followUpVasOrderNo,
      needsFollowUp,
      followUpReason,
    };
  }

  if (orderList.length === 0 && exceptionRawList.length === 0) {
    return {
      discrepancyReport: null,
      orderReports: [],
      exceptionRecords: [],
      exceptionTypes: [],
      needsHumanReview: false,
      humanReviewReason: "",
      suggestedNextExpert: followUpSuggestedNextExpert,
      valueAddHandoff: followUpValueAddHandoff,
      hasMoreExceptions: false,
      totalExceptions: 0,
      requiresNarrowing: false,
      needsClarification: false,
      clarificationFields: [],
      coverageGap: false,
      coverageGapReason: "",
      orderPhaseHint: "",
      isPutawayComparable: true,
      exceptionLookupStatus,
      exceptionLookupMessage: exceptionLookupMessageText,
      contextContinuity,
      followUpVasOrderNo,
      needsFollowUp,
      followUpReason,
    };
  }

  const reports = orderList
    .filter((o) => o && typeof o === "object")
    .map((o) => buildOrderReport(o as Record<string, unknown>));

  let primaryReport = reports[0] ?? {
    orderNo: "",
    forecastQty: 0,
    receivedQty: 0,
    putawayQty: 0,
    forecastPackageQty: null,
    receivedPackageQty: null,
    packageDiscrepancy: null,
    packageDiscrepancyRate: null,
    hasForecastPackageFact: false,
    hasReceivedPackageFact: false,
    hasPackageDiscrepancy: false,
    discrepancy: 0,
    discrepancyRate: 0,
    isAbnormal: false,
  };
  const primaryOrder =
    orderList.find((o) => o && typeof o === "object") as Record<string, unknown> | undefined;
  const coverage = buildCoverageGap(primaryOrder, customerQuestion, exceptionRawList.length);
  if (coverage.coverageGap) {
    primaryReport = {
      ...primaryReport,
      discrepancy: 0,
      discrepancyRate: 0,
      isPutawayComparable: false,
      comparisonSuppressedReason: coverage.coverageGapReason,
    };
  } else {
    primaryReport = {
      ...primaryReport,
      isPutawayComparable: coverage.isPutawayComparable,
    };
  }

  const exceptionRecords: Record<string, unknown>[] = [];
  const typeSet = new Set<string>();
  for (const item of exceptionRawList.slice(0, PAGE_SIZE)) {
    const rec = normalizeException(item);
    if (!rec) continue;
    exceptionRecords.push(rec);
    typeSet.add(rec.exceptionType as string);
  }

  const exceptionTypes = Array.from(typeSet);
  const discrepancyRate = num(primaryReport.discrepancyRate);
  const discrepancy = num(primaryReport.discrepancy);
  const packageDiscrepancy = num(primaryReport.packageDiscrepancy);
  const hasPackageDiscrepancy = primaryReport.hasPackageDiscrepancy === true;
  const primaryOrderStatus = str(primaryOrder?.status).toUpperCase();
  const asksAboutPackages = textIncludesAny(customerQuestion, PACKAGE_CONCERN_KEYWORDS);
  const packageGapRequiresReview =
    hasPackageDiscrepancy &&
    (asksAboutPackages || PACKAGE_COMPARABLE_STATUSES.has(primaryOrderStatus));
  const lookupFailed = ["api_error", "parse_error", "partial_failure"].includes(exceptionLookupStatus);
  const rateExceeded = discrepancyRate >= DISCREPANCY_RATE_THRESHOLD;
  const absExceeded = Math.abs(discrepancy) >= DISCREPANCY_ABS_THRESHOLD;
  const hasDamage = exceptionTypes.includes("DAMAGE");
  const needsHumanReview =
    coverage.coverageGap ||
    rateExceeded ||
    absExceeded ||
    packageGapRequiresReview ||
    lookupFailed ||
    hasDamage ||
    primaryReport.isAbnormal === true ||
    exceptionDescription.includes("破损");
  const requiresNarrowing = params.requiresNarrowing === true;

  const reasons: string[] = [];
  if (rateExceeded) reasons.push(`差异率 ${(discrepancyRate * 100).toFixed(1)}% 超过 5% 参考线`);
  if (absExceeded) reasons.push(`绝对差异 ${Math.abs(discrepancy)} 件超过 10 件参考线`);
  if (packageGapRequiresReview) {
    const direction = packageDiscrepancy > 0 ? "少" : "多";
    reasons.push(
      `包裹预报 ${num(primaryReport.forecastPackageQty)} 箱、实收 ${num(primaryReport.receivedPackageQty)} 箱，差异${direction} ${Math.abs(packageDiscrepancy)} 箱`,
    );
  }
  if (lookupFailed) reasons.push(exceptionLookupMessageText);
  if (hasDamage) reasons.push("存在包裹破损（DAMAGE）异常");
  if (primaryReport.isAbnormal === true) reasons.push("入库单标记为异常");
  if (coverage.coverageGap) reasons.push(coverage.coverageGapReason);

  const suggestedNextExpert = followUpVasOrderNo
    ? "value-add/value-add-order-status"
    : suggestNextExpert(exceptionTypes);
  const valueAddHandoff = followUpVasOrderNo
    ? buildOrderStatusHandoff(
        followUpVasOrderNo,
        str(primaryReport.orderNo) || requestedOrderNos[0] || "",
        exceptionLookupStatus,
        contextContinuity,
      )
    : buildValueAddHandoff(
        suggestedNextExpert,
        exceptionRecords,
        primaryReport,
        exceptionDescription,
      );

  return {
    discrepancyReport: primaryReport,
    orderReports: reports,
    exceptionRecords,
    exceptionTypes,
    needsHumanReview,
    humanReviewReason: reasons.join("；") || "",
    suggestedNextExpert,
    valueAddHandoff,
    hasMoreExceptions,
    totalExceptions,
    requiresNarrowing,
    needsClarification: false,
    clarificationFields: [],
    coverageGap: coverage.coverageGap,
    coverageGapReason: coverage.coverageGapReason,
    orderPhaseHint: coverage.orderPhaseHint,
    isPutawayComparable: coverage.isPutawayComparable,
    exceptionLookupStatus,
    exceptionLookupMessage: exceptionLookupMessageText,
    contextContinuity,
    followUpVasOrderNo,
    needsFollowUp,
    followUpReason,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-discrepancy-report")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
