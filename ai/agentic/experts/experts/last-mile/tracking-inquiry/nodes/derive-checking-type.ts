/**
 * 根据上游结构化扫描事实，为“新建查件”给出建议类型。
 * primaryCheckingType 属于已有查件记录；本节点只生成 recommendedCheckingType。
 */

type Confidence = "high" | "medium" | "low";

interface CheckingTypeRecommendation {
  recommendedCheckingType: "OT" | "FR" | "NT" | "";
  recommendedCheckingTypeName: "超时未妥投" | "退回原因" | "妥投未收到" | "";
  classificationConfidence: Confidence;
  classificationReason: string;
  suggestedNextExperts: string[];
  hasScanFacts: boolean;
  hasAscan: boolean;
  hasDscan: boolean;
  hasRdscan: boolean;
  hasDeliveryFailureReturn: boolean;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const text = raw.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return raw;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return raw;
  }
}

function latestDomainEntry(raw: unknown, key: string): Record<string, unknown> | null {
  const index = asRecord(raw);
  const entries = index?.[key];
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return asRecord(entries[entries.length - 1]);
}

function previousOutput(raw: unknown): Record<string, unknown> | null {
  const context = asRecord(raw);
  return asRecord(parseMaybeJson(context?.previousOutput));
}

function scanFactsFromPrevious(raw: unknown): unknown[] | null {
  const previous = previousOutput(raw);
  const result = asRecord(previous?.result);
  const structured = asRecord(previous?.structured) ?? asRecord(result?.structured);
  return structured && Array.isArray(structured.scanFacts) ? structured.scanFacts : null;
}

function returnOrdersFromRecord(raw: unknown): unknown[] {
  const row = asRecord(raw);
  if (!row) return [];
  if (Array.isArray(row.returnOrders)) return row.returnOrders;
  const enriched = asRecord(row.enrichedContext);
  if (enriched && Array.isArray(enriched.returnOrders)) return enriched.returnOrders;
  const structured = asRecord(row.structured);
  if (structured && Array.isArray(structured.returnOrders)) return structured.returnOrders;
  const result = asRecord(row.result);
  const resultStructured = asRecord(result?.structured);
  if (resultStructured && Array.isArray(resultStructured.returnOrders)) return resultStructured.returnOrders;
  return [];
}

function collectReturnOrders(enrichedContext: unknown, inputContext: unknown): unknown[] {
  const direct = returnOrdersFromRecord(enrichedContext);
  const outboundEntry = latestDomainEntry(enrichedContext, "outbound/outbound-order-status");
  const indexed = returnOrdersFromRecord(outboundEntry);
  const previous = returnOrdersFromRecord(previousOutput(inputContext));
  return [...direct, ...indexed, ...previous];
}

function isDeliveryFailureReturn(raw: unknown): boolean {
  const row = asRecord(raw);
  if (!row) return false;
  const reasonCode = String(row.retrunReason ?? row.returnReason ?? "").trim().toUpperCase();
  const reasonName = String(row.returnReasonName ?? "").trim();
  return reasonCode === "DF" || /派送失败|delivery\s+fail/i.test(reasonName);
}

function eventCount(row: Record<string, unknown>, key: string): number {
  return Array.isArray(row[key]) ? (row[key] as unknown[]).length : 0;
}

function collectText(raw: unknown, depth = 0): string[] {
  if (depth > 5 || raw === null || raw === undefined) return [];
  if (typeof raw === "string") return [raw];
  if (typeof raw === "number" || typeof raw === "boolean") return [];
  if (Array.isArray(raw)) return raw.flatMap((item) => collectText(item, depth + 1));
  const row = asRecord(raw);
  if (!row) return [];
  const allowed = new Set([
    "analysis",
    "description",
    "status",
    "statusName",
    "deliveryStatus",
    "trajectorySummary",
    "exceptionResult",
    "resultSummary",
    "message",
  ]);
  const out: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key) || depth === 0) out.push(...collectText(value, depth + 1));
  }
  return out;
}

function hasNonReceiptIntent(text: string): boolean {
  return /(未收到|没收到|没有收到|未签收|not\s+received|didn['’]?t\s+receive)/i.test(text);
}

function hasAbnormalOrStaleSignal(text: string): boolean {
  return /(异常|停滞|超时|延误|延迟|断更|派送失败|无法派送|补充信息|避免退回|exception|stale|delay(?:ed)?|delivery\s+fail|unable\s+to\s+deliver|additional\s+information|avoid\s+return)/i.test(text);
}

function derive(params: Record<string, unknown>): CheckingTypeRecommendation {
  const deliveryEntry = latestDomainEntry(params.enrichedContext, "last-mile/delivery-status");
  const direct = asRecord(params.enrichedContext);
  const flatDelivery = deliveryEntry ?? direct ?? {};
  const computed = Array.isArray(flatDelivery.computedScanFacts)
    ? flatDelivery.computedScanFacts
    : null;
  const previousFacts = scanFactsFromPrevious(params.inputContext);
  const scanFacts = computed ?? previousFacts;
  const returnOrders = collectReturnOrders(params.enrichedContext, params.inputContext);
  const hasDeliveryFailureReturn = returnOrders.some(isDeliveryFailureReturn);

  let hasAscan = false;
  let hasDscan = false;
  let hasRdscan = false;
  if (scanFacts) {
    for (const item of scanFacts) {
      const row = asRecord(item);
      if (!row) continue;
      hasAscan = hasAscan || eventCount(row, "ascanEvents") > 0;
      hasDscan = hasDscan || eventCount(row, "dscanEvents") > 0;
      hasRdscan = hasRdscan || eventCount(row, "rdscanEvents") > 0;
    }
  }

  const intentText = `${String(params.query ?? "")} ${String(params.customerIntent ?? "")}`;
  const evidenceText = collectText(flatDelivery).join(" ");
  const previousText = collectText(previousOutput(params.inputContext)).join(" ");
  const nonReceipt = hasNonReceiptIntent(intentText);
  const abnormal = hasAbnormalOrStaleSignal(`${evidenceText} ${previousText}`);

  // RDscan 是退回妥投的结构化终态，应优先于 Dscan/Ascan 判断。
  // 只凭“可能退回”“避免退回”等文本不能进入该分支。
  if (hasRdscan || hasDeliveryFailureReturn) {
    return {
      recommendedCheckingType: "FR",
      recommendedCheckingTypeName: "退回原因",
      classificationConfidence: "high",
      classificationReason: hasRdscan
        ? "结构化扫描事实包含 RDscan（退回妥投），应查询退回或派送失败原因"
        : "关联退货单事实明确标记派送失败退回，应查询退回或派送失败原因",
      suggestedNextExperts: [],
      hasScanFacts: Boolean(scanFacts),
      hasAscan,
      hasDscan,
      hasRdscan,
      hasDeliveryFailureReturn,
    };
  }

  if (hasDscan && nonReceipt) {
    return {
      recommendedCheckingType: "NT",
      recommendedCheckingTypeName: "妥投未收到",
      classificationConfidence: "high",
      classificationReason: "结构化扫描事实包含 Dscan，且用户明确反馈买家未收到",
      suggestedNextExperts: [],
      hasScanFacts: true,
      hasAscan,
      hasDscan,
      hasRdscan,
      hasDeliveryFailureReturn,
    };
  }

  if (hasAscan && !hasDscan && abnormal) {
    return {
      recommendedCheckingType: "OT",
      recommendedCheckingTypeName: "超时未妥投",
      classificationConfidence: computed ? "high" : "medium",
      classificationReason: "结构化扫描事实有 Ascan、无 Dscan，且上游事实包含超时、停滞或派送异常信号",
      suggestedNextExperts: [],
      hasScanFacts: true,
      hasAscan,
      hasDscan,
      hasRdscan,
      hasDeliveryFailureReturn,
    };
  }

  if (scanFacts && !hasAscan && !hasDscan && !hasRdscan) {
    return {
      recommendedCheckingType: "",
      recommendedCheckingTypeName: "",
      classificationConfidence: "high",
      classificationReason: "结构化扫描事实中没有 Ascan、Dscan 或 RDscan，不能推荐查件类型",
      suggestedNextExperts: ["tracking-no-scan"],
      hasScanFacts: true,
      hasAscan,
      hasDscan,
      hasRdscan,
      hasDeliveryFailureReturn,
    };
  }

  return {
    recommendedCheckingType: "",
    recommendedCheckingTypeName: "",
    classificationConfidence: "low",
    classificationReason: scanFacts
      ? "现有扫描事实不足以证明已妥投或已发生超时、停滞、派送异常"
      : "缺少可核验的结构化扫描事实，不能仅凭用户描述推荐查件类型",
    suggestedNextExperts: scanFacts ? [] : ["delivery-status"],
    hasScanFacts: Boolean(scanFacts),
    hasAscan,
    hasDscan,
    hasRdscan,
    hasDeliveryFailureReturn,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  return { checkingTypeRecommendation: derive(params) };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("derive-checking-type")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
