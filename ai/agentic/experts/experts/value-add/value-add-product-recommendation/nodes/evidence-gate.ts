/**
 * 节点：evidence-gate — 检查候选证据质量并决定推荐路径。
 * FaaS 单文件闭环，无外部 import。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function main({ params }: { params: Record<string, unknown> }) {
  const filtered = asRecord(params.filteredRecommendation);
  const missing = asArray(filtered.missingConfirmations);
  const candidates = asArray(filtered.recommendedVascCandidates);
  const presetOutputPath = typeof filtered.outputPath === "string" ? filtered.outputPath : "";
  const outputPath =
    presetOutputPath === "handoff_to_order_status"
      ? presetOutputPath
      : candidates.length > 0 && missing.length === 0
        ? "recommendation_ready"
        : "needs_confirmation";

  return {
    filteredRecommendation: {
      ...filtered,
      outputPath,
      evidenceStatus: outputPath === "recommendation_ready" ? "sufficient" : "conditional",
      missingConfirmations: missing,
    },
    recommendationInput: asRecord(params.recommendationInput),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("evidence-gate")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "evidence-gate failed");
      process.exit(1);
    });
}
