/**
 * 节点：load-flow-context — 加载流程语境 KB。
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
  const flowContext = [
    asText(params.kbFlowContext),
    asText(params.kbInferenceRules)
      ? `\n\n---\n\n# v2 决策层：推断规则\n\n${asText(params.kbInferenceRules)}`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return {
    flowContextKb: flowContext,
    recommendationInput: asRecord(params.recommendationInput),
    validationResult: asRecord(params.validationResult),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-flow-context")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "load-flow-context failed");
      process.exit(1);
    });
}
