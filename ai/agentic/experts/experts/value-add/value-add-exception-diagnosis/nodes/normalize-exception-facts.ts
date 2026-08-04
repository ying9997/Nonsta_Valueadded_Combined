/**
 * 节点：normalize-exception-facts — 合并直接入参、handoff 与证据摘要。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isVerifiedHandoff(handoff: Record<string, unknown>): boolean {
  const evidenceSummary = asRecord(handoff.evidenceSummary);
  return (
    evidenceSummary.verified === true ||
    asText(evidenceSummary.source) === "inbound-exception-check" ||
    asText(handoff.recommendedEntryExpert).length > 0
  );
}

function normalizeNaturalLanguage(text: string): Record<string, unknown> {
  if (
    (text.includes("包裹") && text.includes("条码")) ||
    text.includes("包裹条码贴错") ||
    text.includes("贴错条码") ||
    text.includes("条码贴错")
  ) {
    return {
      exceptionCode: "B01E1615",
      exceptionName: "包裹条码批量异常（需客户处理）",
      exceptionCategory: "barcode_package",
      exceptionObject: "包裹条码",
      objectLevel: "package",
      requiresCustomerAction: true,
    };
  }
  return {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const raw = asRecord(params.rawExceptionInput);
  const handoff = asRecord(raw.valueAddHandoff);
  const evidenceSummary = {
    ...asRecord(raw.evidenceSummary),
    ...asRecord(handoff.evidenceSummary),
  };
  const verifiedHandoff = isVerifiedHandoff(handoff);
  const directExceptionCode = asText(raw.exceptionCode);
  const directExceptionName = asText(raw.exceptionName);
  const handoffExceptionCode = asText(handoff.exceptionCode);
  const handoffExceptionName = asText(handoff.exceptionName);
  const directText = [
    raw.customerDescription,
    raw.exceptionDescription,
    raw.query,
    raw.customerIntent,
  ]
    .map(asText)
    .filter(Boolean)
    .join(" ");
  const naturalFacts = normalizeNaturalLanguage(directText);
  const conflictWarnings: string[] = [];
  if (
    verifiedHandoff &&
    handoffExceptionCode &&
    directExceptionCode &&
    handoffExceptionCode.toUpperCase() !== directExceptionCode.toUpperCase()
  ) {
    conflictWarnings.push("exceptionCode");
  }
  if (
    verifiedHandoff &&
    handoffExceptionName &&
    directExceptionName &&
    handoffExceptionName !== directExceptionName
  ) {
    conflictWarnings.push("exceptionName");
  }

  return {
    diagnosisInput: {
      exceptionCode:
        (verifiedHandoff ? handoffExceptionCode : "") ||
        directExceptionCode ||
        asText(naturalFacts.exceptionCode) ||
        handoffExceptionCode,
      exceptionName:
        (verifiedHandoff ? handoffExceptionName : "") ||
        directExceptionName ||
        asText(naturalFacts.exceptionName) ||
        handoffExceptionName,
      exceptionDescription: asText(raw.exceptionDescription) || asText(handoff.exceptionDescription),
      customerDescription:
        asText(raw.customerDescription) || asText(raw.query) || asText(raw.customerIntent),
      exceptionCategory: asText(handoff.exceptionCategory) || asText(naturalFacts.exceptionCategory),
      exceptionObject: asText(handoff.exceptionObject) || asText(naturalFacts.exceptionObject),
      objectLevel: asText(handoff.objectLevel) || asText(naturalFacts.objectLevel),
      inboundOrderNo: asText(handoff.inboundOrderNo),
      eventNo: asText(handoff.eventNo),
      evidenceSummary,
      requiresCustomerAction:
        handoff.requiresCustomerAction === true || naturalFacts.requiresCustomerAction === true,
      customerActionHint: asText(handoff.customerActionHint),
      conflictWarnings,
      enrichedContext: asRecord(raw.enrichedContext),
      source: Object.keys(handoff).length > 0 ? "valueAddHandoff" : "direct_input",
    },
    validationResult: asRecord(params.validationResult),
    inputContext: asRecord(params.inputContext),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("normalize-exception-facts")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "normalize-exception-facts failed");
      process.exit(1);
    });
}
