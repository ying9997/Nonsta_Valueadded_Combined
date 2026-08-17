/**
 * 节点：load-service-orchestration — 加载服务项/原子编排 KB。
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
    serviceOrchestrationKb: asText(params.kbServiceOrchestration),
    vascContextKb: asText(params.vascContextKb),
    serviceConfigInput: asRecord(params.serviceConfigInput),
    validationResult: asRecord(params.validationResult),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-service-orchestration")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "load-service-orchestration failed");
      process.exit(1);
    });
}
