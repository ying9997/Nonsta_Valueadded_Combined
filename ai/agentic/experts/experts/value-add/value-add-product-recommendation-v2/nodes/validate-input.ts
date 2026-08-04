/**
 * 节点：validate-input — 归一化并校验 VASC 推荐入参。
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

function latestContext(enrichedContext: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = enrichedContext[key];
  if (Array.isArray(value)) return asRecord(value[value.length - 1]);
  return asRecord(value);
}

function pickText(params: Record<string, unknown>, inputs: Record<string, unknown>, key: string): string {
  return asText(params[key]) || asText(inputs[key]);
}

function pickRecord(params: Record<string, unknown>, inputs: Record<string, unknown>, key: string): Record<string, unknown> {
  const direct = asRecord(params[key]);
  if (Object.keys(direct).length > 0) return direct;
  return asRecord(inputs[key]);
}

async function main({ params }: { params: Record<string, unknown> }) {
  const inputs = asRecord(params.inputs);
  const enrichedContext = pickRecord(params, inputs, "enrichedContext");
  const diagnosisContext = latestContext(enrichedContext, "value-add/value-add-exception-diagnosis");
  const contextFacts =
    asRecord(diagnosisContext.handoffFacts).exceptionCode || asRecord(diagnosisContext.handoffFacts).exceptionName
      ? asRecord(diagnosisContext.handoffFacts)
      : asRecord(diagnosisContext.valueAddExceptionDiagnosis);
  const handoffFacts = {
    ...contextFacts,
    ...pickRecord(params, inputs, "handoffFacts"),
  };
  const recommendationInput = {
    exceptionCode: pickText(params, inputs, "exceptionCode") || asText(handoffFacts.exceptionCode),
    exceptionName: pickText(params, inputs, "exceptionName") || asText(handoffFacts.exceptionName),
    exceptionCategory: pickText(params, inputs, "exceptionCategory") || asText(handoffFacts.exceptionCategory),
    exceptionObject: pickText(params, inputs, "exceptionObject") || asText(handoffFacts.exceptionObject),
    customerActionIntent:
      pickText(params, inputs, "customerActionIntent") || asText(params.customerIntent) || asText(params.query),
    inboundOrderNo: pickText(params, inputs, "inboundOrderNo") || asText(handoffFacts.inboundOrderNo),
    orderStatusHint: pickText(params, inputs, "orderStatusHint"),
    handoffFacts,
    enrichedContext,
  };
  const hasExceptionFact = Boolean(
    recommendationInput.exceptionCode ||
      recommendationInput.exceptionName ||
      recommendationInput.exceptionCategory ||
      recommendationInput.exceptionObject
  );

  return {
    recommendationInput,
    validationResult: {
      ok: hasExceptionFact,
      intentClarity: recommendationInput.customerActionIntent ? "clear" : "missing",
      missingEvidence: hasExceptionFact ? [] : ["exception_fact"],
    },
    inputContext: asRecord(params.inputContext),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "validate-input failed");
      process.exit(1);
    });
}
