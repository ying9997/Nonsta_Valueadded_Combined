/**
 * 节点：load-intent-guide — 加载客户处理意图导航 KB。
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
    intentGuideKb: asText(params.kbIntentGuide),
    recommendationInput: asRecord(params.recommendationInput),
    classificationResult: asRecord(params.classificationResult),
    clarificationResult: asRecord(params.clarificationResult),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-intent-guide")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "load-intent-guide failed");
      process.exit(1);
    });
}
