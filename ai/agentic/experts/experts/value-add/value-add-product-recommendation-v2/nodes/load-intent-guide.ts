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
  const intentGuide = [
    asText(params.kbIntentGuide),
    asText(params.kbDecisionSystemPrompt)
      ? `\n\n---\n\n# v2 决策层：System Prompt 边界\n\n${asText(params.kbDecisionSystemPrompt)}`
      : "",
    asText(params.kbInferenceRules)
      ? `\n\n---\n\n# v2 决策层：Inference Rules\n\n${asText(params.kbInferenceRules)}`
      : "",
    asText(params.kbIntentRoutingB0102E23)
      ? `\n\n---\n\n# v2 决策层：Intent Routing B0102E23\n\n${asText(params.kbIntentRoutingB0102E23)}`
      : "",
    asText(params.kbIntentRoutingB03E03)
      ? `\n\n---\n\n# v2 决策层：Intent Routing B03E03\n\n${asText(params.kbIntentRoutingB03E03)}`
      : "",
    asText(params.kbForbiddenProducts)
      ? `\n\n---\n\n# v2 决策层：Forbidden Products\n\n${asText(params.kbForbiddenProducts)}`
      : "",
    asText(params.kbHRules)
      ? `\n\n---\n\n# v2 决策层：H Rules\n\n${asText(params.kbHRules)}`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return {
    intentGuideKb: intentGuide,
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
