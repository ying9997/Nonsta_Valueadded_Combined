/**
 * 节点：validate-input — 校验异常诊断最小入参。
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

async function main({ params }: { params: Record<string, unknown> }) {
  const handoff = asRecord(params.valueAddHandoff);
  const hasExceptionFact = Boolean(
    asText(params.exceptionCode) ||
      asText(params.exceptionName) ||
      asText(params.exceptionDescription) ||
      asText(params.customerDescription) ||
      asText(params.query) ||
      asText(handoff.exceptionCode) ||
      asText(handoff.exceptionName) ||
      asText(handoff.exceptionDescription)
  );

  return {
    validationResult: {
      ok: hasExceptionFact,
      outputPath: hasExceptionFact ? "input_ready" : "unknown_exception",
      missingEvidence: hasExceptionFact ? [] : ["exceptionCode_or_description"],
      validationMessage: hasExceptionFact ? "" : "请补充异常编码、异常名称或异常描述。",
    },
    rawExceptionInput: {
      query: asText(params.query),
      customerIntent: asText(params.customerIntent),
      exceptionCode: asText(params.exceptionCode),
      exceptionName: asText(params.exceptionName),
      exceptionDescription: asText(params.exceptionDescription),
      customerDescription: asText(params.customerDescription),
      valueAddHandoff: handoff,
      evidenceSummary: asRecord(params.evidenceSummary),
      enrichedContext: asRecord(params.enrichedContext),
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
