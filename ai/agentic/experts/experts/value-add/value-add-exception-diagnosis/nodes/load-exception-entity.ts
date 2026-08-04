/**
 * 节点：load-exception-entity — 注入异常实体 KB。
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
    exceptionEntityKb: asText(params.kbExceptionEntity),
    diagnosisInput: asRecord(params.diagnosisInput),
    validationResult: asRecord(params.validationResult),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-exception-entity")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "load-exception-entity failed");
      process.exit(1);
    });
}
