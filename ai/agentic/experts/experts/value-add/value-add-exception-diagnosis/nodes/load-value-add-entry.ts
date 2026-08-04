/**
 * 节点：load-value-add-entry — 注入增值入口规则 KB。
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
    valueAddEntryKb: asText(params.kbValueAddEntry),
    diagnosisInput: asRecord(params.diagnosisInput),
    classificationResult: asRecord(params.classificationResult),
    validationResult: asRecord(params.validationResult),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-value-add-entry")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "load-value-add-entry failed");
      process.exit(1);
    });
}
