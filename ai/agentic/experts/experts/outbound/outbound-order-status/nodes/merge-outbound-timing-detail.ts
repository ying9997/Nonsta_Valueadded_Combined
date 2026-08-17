/**
 * 归一化 `wh.outbound.getPackageDetail` 批处理结果，分别产出发货时间事实和
 * 包裹实际尺寸重量事实；不以预估值冒充实际值。
 * transport/business success、空数据和业务失败分别标记。
 */

type TimingActionPlan = {
  inputTokens?: string[];
  outboundOrderNum: string;
  shippingNo: string;
  trackingNos?: string[];
};

type FetchStatus = "success" | "no_data" | "service_error";

type SlaFact = {
  slaName?: string;
  serviceStandardTime?: number;
  serviceCompletionTime?: number;
  status?: string;
};

type OutboundTimingFact = {
  outboundOrderNum: string;
  shippingNo: string;
  trackingNos: string[];
  status?: string;
  orderTime?: string;
  estimateOutWhTimeLocal?: string;
  estimateOutWhTime?: string;
  expectedOutboundTime?: string;
  expectedOutboundTimeBasis?: "system" | "warehouse_local";
  outWhTime?: string;
  warehouseCode?: string;
  warehouseName?: string;
  slaList?: SlaFact[];
  fetchStatus: FetchStatus;
  businessCode: string;
  source: "wh.outbound.getPackageDetail";
};

type ActualContainerMeasurement = {
  containerNo?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  volumeM3?: number;
};

type PackageMeasurementFact = {
  outboundOrderNum: string;
  shippingNo: string;
  trackingNos: string[];
  actualWeightKg?: number;
  actualVolumeM3?: number;
  actualContainers: ActualContainerMeasurement[];
  fetchStatus: FetchStatus;
  businessCode: string;
  source: "wh.outbound.getPackageDetail";
};

function parseJsonLayers(raw: unknown, maxDepth = 8): unknown {
  let current = raw;
  for (let depth = 0; depth < maxDepth && typeof current === "string"; depth++) {
    const text = current.trim();
    if (!text) return "";
    try {
      current = JSON.parse(text) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

function unwrapDetail(raw: unknown): Record<string, unknown> | null {
  let current = parseJsonLayers(raw);
  for (let depth = 0; depth < 8; depth++) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    const object = current as Record<string, unknown>;
    if (
      object.orderNo != null ||
      object.shippingNo != null ||
      object.estimateOutWhTimeLocal != null ||
      object.estimateOutWhTime != null ||
      object.outWhTime != null
    ) {
      return object;
    }
    if (object.data != null) {
      current = parseJsonLayers(object.data);
      continue;
    }
    if (object.output != null) {
      current = parseJsonLayers(object.output);
      continue;
    }
    if (object.Output != null) {
      current = parseJsonLayers(object.Output);
      continue;
    }
    return null;
  }
  return null;
}

function textValue(raw: unknown): string | undefined {
  const text = String(raw ?? "").trim();
  return text || undefined;
}

function numberValue(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const number = Number(raw);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeSlaList(raw: unknown): SlaFact[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const facts = raw
    .filter(
      (item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))
    )
    .map((item) => {
      const fact: SlaFact = {};
      const slaName = textValue(item.slaName);
      const serviceStandardTime = numberValue(item.serviceStandardTime);
      const serviceCompletionTime = numberValue(item.serviceCompletionTime);
      const status = textValue(item.status);
      if (slaName) fact.slaName = slaName;
      if (serviceStandardTime !== undefined) fact.serviceStandardTime = serviceStandardTime;
      if (serviceCompletionTime !== undefined) fact.serviceCompletionTime = serviceCompletionTime;
      if (status) fact.status = status;
      return fact;
    })
    .filter((item) => Object.keys(item).length > 0);
  return facts.length > 0 ? facts : undefined;
}

function normalizeActualContainers(raw: unknown): ActualContainerMeasurement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))
    )
    .map((item) => {
      const measurement: ActualContainerMeasurement = {};
      const containerNo = textValue(
        item.containerSerno ?? item.containerNo ?? item.packageNo ?? item.packageNum
      );
      const lengthCm = numberValue(item.packageLength);
      const widthCm = numberValue(item.packageWidth);
      const heightCm = numberValue(item.packageHeight);
      const weightKg = numberValue(item.packageWeight);
      const volumeM3 = numberValue(item.packageVolume);
      if (containerNo) measurement.containerNo = containerNo;
      if (lengthCm !== undefined) measurement.lengthCm = lengthCm;
      if (widthCm !== undefined) measurement.widthCm = widthCm;
      if (heightCm !== undefined) measurement.heightCm = heightCm;
      if (weightKg !== undefined) measurement.weightKg = weightKg;
      if (volumeM3 !== undefined) measurement.volumeM3 = volumeM3;
      return measurement;
    })
    .filter((item) => Object.keys(item).length > 0);
}

function outputItem(raw: unknown, index: number): Record<string, unknown> | null {
  if (!Array.isArray(raw)) return null;
  const item = raw[index];
  return item && typeof item === "object" && !Array.isArray(item)
    ? (item as Record<string, unknown>)
    : null;
}

function baseFact(plan: TimingActionPlan, code: string, fetchStatus: FetchStatus): OutboundTimingFact {
  return {
    outboundOrderNum: String(plan.outboundOrderNum ?? "").trim(),
    shippingNo: String(plan.shippingNo ?? "").trim(),
    trackingNos: Array.isArray(plan.trackingNos)
      ? plan.trackingNos.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [],
    fetchStatus,
    businessCode: code,
    source: "wh.outbound.getPackageDetail",
  };
}

function baseMeasurementFact(
  plan: TimingActionPlan,
  code: string,
  fetchStatus: FetchStatus
): PackageMeasurementFact {
  return {
    outboundOrderNum: String(plan.outboundOrderNum ?? "").trim(),
    shippingNo: String(plan.shippingNo ?? "").trim(),
    trackingNos: Array.isArray(plan.trackingNos)
      ? plan.trackingNos.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [],
    actualContainers: [],
    fetchStatus,
    businessCode: code,
    source: "wh.outbound.getPackageDetail",
  };
}

function measurementFact(
  plan: TimingActionPlan,
  code: string,
  detail: Record<string, unknown>
): PackageMeasurementFact {
  const actualWeightKg = numberValue(detail.actualWeight);
  const actualVolumeM3 = numberValue(detail.actualVolume);
  const actualContainers = normalizeActualContainers(detail.actualContainerList);
  const hasActualData =
    actualWeightKg !== undefined || actualVolumeM3 !== undefined || actualContainers.length > 0;
  const fact = baseMeasurementFact(plan, code, hasActualData ? "success" : "no_data");
  if (actualWeightKg !== undefined) fact.actualWeightKg = actualWeightKg;
  if (actualVolumeM3 !== undefined) fact.actualVolumeM3 = actualVolumeM3;
  fact.actualContainers = actualContainers;
  return fact;
}

function successFact(
  plan: TimingActionPlan,
  code: string,
  detail: Record<string, unknown>
): OutboundTimingFact {
  const fact = baseFact(plan, code, "success");
  const fields: Array<[keyof OutboundTimingFact, unknown]> = [
    ["status", detail.status],
    ["orderTime", detail.orderTime],
    ["estimateOutWhTimeLocal", detail.estimateOutWhTimeLocal],
    ["estimateOutWhTime", detail.estimateOutWhTime],
    ["outWhTime", detail.outWhTime],
    ["warehouseCode", detail.warehouseCode],
    ["warehouseName", detail.warehouseName],
  ];
  for (const [key, raw] of fields) {
    const value = textValue(raw);
    if (value) (fact as Record<string, unknown>)[key] = value;
  }
  const systemExpected = textValue(detail.estimateOutWhTime);
  const localExpected = textValue(detail.estimateOutWhTimeLocal);
  if (systemExpected) {
    fact.expectedOutboundTime = systemExpected;
    fact.expectedOutboundTimeBasis = "system";
  } else if (localExpected) {
    fact.expectedOutboundTime = localExpected;
    fact.expectedOutboundTimeBasis = "warehouse_local";
  }
  const slaList = normalizeSlaList(detail.slaList);
  if (slaList) fact.slaList = slaList;
  return fact;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const actionPlans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as TimingActionPlan[];
  const outboundTimingFacts: OutboundTimingFact[] = [];
  const packageMeasurementFacts: PackageMeasurementFact[] = [];

  for (let index = 0; index < actionPlans.length; index++) {
    const plan = actionPlans[index];
    const item = outputItem(params.winitPluginOutputList, index);
    const code = String(item?.code ?? "missing");
    if (!item || (code !== "0" && code !== "0.0")) {
      outboundTimingFacts.push(baseFact(plan, code, "service_error"));
      packageMeasurementFacts.push(baseMeasurementFact(plan, code, "service_error"));
      continue;
    }
    const rawData = item.data;
    if (rawData === null || rawData === undefined || String(rawData).trim() === "") {
      outboundTimingFacts.push(baseFact(plan, code, "no_data"));
      packageMeasurementFacts.push(baseMeasurementFact(plan, code, "no_data"));
      continue;
    }
    const detail = unwrapDetail(rawData);
    if (!detail) {
      outboundTimingFacts.push(baseFact(plan, code, "no_data"));
      packageMeasurementFacts.push(baseMeasurementFact(plan, code, "no_data"));
      continue;
    }
    const actualOrderNo = textValue(detail.orderNo);
    const actualShippingNo = textValue(detail.shippingNo);
    if (
      (actualOrderNo && actualOrderNo.toUpperCase() !== plan.outboundOrderNum.toUpperCase()) ||
      (actualShippingNo && actualShippingNo.toUpperCase() !== plan.shippingNo.toUpperCase())
    ) {
      outboundTimingFacts.push(baseFact(plan, code, "service_error"));
      packageMeasurementFacts.push(baseMeasurementFact(plan, code, "service_error"));
      continue;
    }
    outboundTimingFacts.push(successFact(plan, code, detail));
    packageMeasurementFacts.push(measurementFact(plan, code, detail));
  }

  return {
    outboundTimingFacts,
    packageMeasurementFacts,
    requiresNarrowing: params.requiresNarrowing === true,
    timingDetailResolvedCount: outboundTimingFacts.filter((item) => item.fetchStatus === "success").length,
    timingDetailNoDataCount: outboundTimingFacts.filter((item) => item.fetchStatus === "no_data").length,
    timingDetailFailedCount: outboundTimingFacts.filter((item) => item.fetchStatus === "service_error").length,
    measurementResolvedCount: packageMeasurementFacts.filter((item) => item.fetchStatus === "success").length,
    measurementNoDataCount: packageMeasurementFacts.filter((item) => item.fetchStatus === "no_data").length,
    measurementFailedCount: packageMeasurementFacts.filter((item) => item.fetchStatus === "service_error").length,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-outbound-timing-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
