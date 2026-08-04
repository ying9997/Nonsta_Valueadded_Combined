/**
 * 节点：load-exception-mapping-summary — 注入异常到 VASC 映射摘要 KB。
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
  return {
    exceptionMappingSummaryKb: asText(params.kbExceptionMappingSummary),
    diagnosisInput: asRecord(params.diagnosisInput),
    classificationResult: asRecord(params.classificationResult),
    valueAddEntryKb: asText(params.valueAddEntryKb),
    validationResult: asRecord(params.validationResult),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-exception-mapping-summary")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "load-exception-mapping-summary failed");
      process.exit(1);
    });
}
