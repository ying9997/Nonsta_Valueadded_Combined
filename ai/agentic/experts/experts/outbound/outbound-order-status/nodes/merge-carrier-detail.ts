/**
 * 节点：将 id/55 `queryOutboundOrder` 详情安全合并到 id/54 订单，并确定性提取承运商事实。
 * id/55 缺失、失败或不可解析时保留原始 id/54 结果。
 *
 * 【输入】rawOrderData、actionPlans、winitPluginOutputList
 * 【输出】rawOrderData、carrierFacts
 */

type CarrierDetailActionPlan = {
  outboundOrderNum: string;
};

type CarrierFact = {
  trackingNo?: string;
  outboundOrderNum: string;
  carrier: string;
  carrierServiceCode?: string;
  carrierServiceName?: string;
  carrierHasChange?: string;
  source: "queryOutboundOrder" | "queryOutboundOrderList";
};

function normalizeWoMainOrderNum(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const match = /^WO(\d+)[A-Za-z]*$/i.exec(value);
  return match ? `WO${match[1]}` : value;
}

function parseJsonLayers(raw: unknown, maxDepth = 6): unknown {
  let current = raw;
  for (let depth = 0; depth < maxDepth && typeof current === "string"; depth++) {
    try {
      current = JSON.parse(current) as unknown;
    } catch {
      break;
    }
  }
  return current;
}

function unwrapDetailRow(raw: unknown): Record<string, unknown> | null {
  let current = parseJsonLayers(raw);
  for (let depth = 0; depth < 6; depth++) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    const object = current as Record<string, unknown>;
    if (Array.isArray(object.list)) {
      const first = object.list.find((item) => item && typeof item === "object");
      return first ? (first as Record<string, unknown>) : null;
    }
    if (object.outboundOrderNum != null || object.documentNo != null) return object;
    if (object.Output != null) {
      current = parseJsonLayers(object.Output);
      continue;
    }
    if (object.output != null) {
      current = parseJsonLayers(object.output);
      continue;
    }
    if (object.data != null) {
      current = parseJsonLayers(object.data);
      continue;
    }
    return null;
  }
  return null;
}

function outputDataAt(rawList: unknown, index: number): unknown {
  if (!Array.isArray(rawList)) return null;
  const item = rawList[index];
  if (!item || typeof item !== "object") return null;
  const object = item as Record<string, unknown>;
  const code = object.code;
  if (code !== undefined && code !== null && code !== 0 && code !== "0") return null;
  return object.data;
}

function stringValue(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function trackingNoFromOrder(order: Record<string, unknown>): string | undefined {
  const direct = stringValue(order.trackingNum ?? order.trackingNo);
  if (direct) return direct;
  const packages = Array.isArray(order.packageList) ? order.packageList : [];
  for (const item of packages) {
    if (!item || typeof item !== "object") continue;
    const object = item as Record<string, unknown>;
    const single = stringValue(object.trackingNo);
    if (single) return single;
    if (Array.isArray(object.trackingNos)) {
      const first = object.trackingNos.map(stringValue).find(Boolean);
      if (first) return first;
    }
  }
  return undefined;
}

function buildCarrierFact(
  order: Record<string, unknown>,
  source: CarrierFact["source"]
): CarrierFact | null {
  const carrier = stringValue(order.carrier);
  const outboundOrderNum = normalizeWoMainOrderNum(
    String(order.outboundOrderNum ?? order.documentNo ?? order.orderNo ?? "")
  );
  if (!carrier || !outboundOrderNum) return null;
  const fact: CarrierFact = { outboundOrderNum, carrier, source };
  const trackingNo = trackingNoFromOrder(order);
  const carrierServiceCode = stringValue(order.carrierServiceCode);
  const carrierServiceName = stringValue(order.carrierServiceName);
  const carrierHasChange = stringValue(order.carrierHasChange);
  if (trackingNo) fact.trackingNo = trackingNo;
  if (carrierServiceCode) fact.carrierServiceCode = carrierServiceCode;
  if (carrierServiceName) fact.carrierServiceName = carrierServiceName;
  if (carrierHasChange) fact.carrierHasChange = carrierHasChange;
  return fact;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData =
    params.rawOrderData && typeof params.rawOrderData === "object" && !Array.isArray(params.rawOrderData)
      ? (params.rawOrderData as Record<string, unknown>)
      : {};
  const originalList = Array.isArray(rawOrderData.list)
    ? rawOrderData.list.filter(
        (item): item is Record<string, unknown> => Boolean(item && typeof item === "object")
      )
    : [];
  const actionPlans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as CarrierDetailActionPlan[];
  const detailByOrder = new Map<string, Record<string, unknown>>();
  let failedCount = 0;

  for (let index = 0; index < actionPlans.length; index++) {
    const plan = actionPlans[index];
    const rawDetail = outputDataAt(params.winitPluginOutputList, index);
    const detail = unwrapDetailRow(rawDetail);
    const expected = normalizeWoMainOrderNum(String(plan?.outboundOrderNum ?? "")).toUpperCase();
    const actual = detail
      ? normalizeWoMainOrderNum(String(detail.outboundOrderNum ?? detail.documentNo ?? "")).toUpperCase()
      : "";
    if (!detail || !expected || actual !== expected) {
      failedCount++;
      continue;
    }
    detailByOrder.set(expected, detail);
  }

  const carrierFacts: CarrierFact[] = [];
  const mergedList = originalList.map((order) => {
    const key = normalizeWoMainOrderNum(
      String(order.outboundOrderNum ?? order.documentNo ?? order.orderNo ?? "")
    ).toUpperCase();
    const detail = detailByOrder.get(key);
    const merged = detail ? { ...order, ...detail } : { ...order };
    const fact = buildCarrierFact(merged, detail ? "queryOutboundOrder" : "queryOutboundOrderList");
    if (fact) carrierFacts.push(fact);
    return merged;
  });

  const previousMeta =
    rawOrderData._fetchMeta && typeof rawOrderData._fetchMeta === "object" && !Array.isArray(rawOrderData._fetchMeta)
      ? (rawOrderData._fetchMeta as Record<string, unknown>)
      : {};

  return {
    rawOrderData: {
      ...rawOrderData,
      list: mergedList,
      _fetchMeta: {
        ...previousMeta,
        carrierDetailRequestedCount: actionPlans.length,
        carrierDetailResolvedCount: detailByOrder.size,
        carrierDetailFailedCount: failedCount,
      },
    },
    carrierFacts,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-carrier-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

