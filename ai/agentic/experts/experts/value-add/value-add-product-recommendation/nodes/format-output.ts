/**
 * 节点：format-output — 归一化 VASC 推荐输出。
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function recommendationLabel(value: unknown): string {
  const recommendation = asRecord(value);
  const code = asText(recommendation.vascCode);
  const name = asText(recommendation.vascName);
  return [code, name].filter(Boolean).join(" ");
}

function analysisConflictsWithPrimary(analysis: string, primaryCode: string): boolean {
  if (!analysis || !primaryCode) return false;
  const mentionedCodes = analysis.match(/\bVASC[A-Z0-9_-]*\b/gi) ?? [];
  return mentionedCodes.length > 0 && !mentionedCodes.some((code) => code.toUpperCase() === primaryCode.toUpperCase());
}

function analysisSemanticallyConflictsWithPrimary(analysis: string, primaryLabel: string): boolean {
  if (!analysis || !primaryLabel) return false;
  if (primaryLabel.includes("新单上架")) {
    return analysis.includes("原单上架") || analysis.includes("原入库单");
  }
  if (primaryLabel.includes("原单上架")) {
    return analysis.includes("新单上架") || analysis.includes("新建入库单");
  }
  if (primaryLabel.includes("销毁")) {
    return analysis.includes("重新包装") || analysis.includes("包装加固");
  }
  if (primaryLabel.includes("拍照") || primaryLabel.includes("视频")) {
    return analysis.includes("销毁") || analysis.includes("重新包装");
  }
  return false;
}

function coerceAnalysisResult(raw: unknown): { structured: Record<string, unknown>; analysis: string } {
  if (typeof raw === "string") {
    try {
      return coerceAnalysisResult(JSON.parse(raw));
    } catch {
      return { structured: {}, analysis: raw };
    }
  }
  const obj = asRecord(raw);
  return {
    structured: asRecord(obj.structured),
    analysis: asText(obj.analysis),
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const recommendationInput = asRecord(params.recommendationInput);
  const filtered = asRecord(params.filteredRecommendation);
  const result = coerceAnalysisResult(params.analysisResult);
  const primaryRecommendation = filtered.primaryRecommendation ?? null;
  const outputPath = asText(filtered.outputPath) || (primaryRecommendation ? "recommendation_ready" : "needs_confirmation");
  const handoffExpertId = asText(filtered.handoffExpertId);
  const structured = {
    outputPath,
    recommendedVascCandidates: filtered.recommendedVascCandidates ?? [],
    primaryRecommendation,
    notRecommendedOptions: filtered.notRecommendedOptions ?? [],
    missingConfirmations: filtered.missingConfirmations ?? [],
    handoffExpertId,
    handoffToServiceConfig: primaryRecommendation
      ? {
          vasc: primaryRecommendation,
          customerActionIntent: asText(recommendationInput.customerActionIntent),
          limitations: [],
        }
      : null,
  };
  const primaryCode = asText(asRecord(primaryRecommendation).vascCode);
  const primaryLabel = recommendationLabel(primaryRecommendation);
  let analysis = result.analysis;
  if (outputPath === "handoff_to_order_status") {
    analysis =
      analysis && analysis.includes("value-add-order-status")
        ? analysis
        : "该问题属于已提交增值单状态查询，应转交 value-add-order-status；本专家不做 VASC 推荐。";
  } else if (primaryLabel) {
    analysis = analysisConflictsWithPrimary(analysis, primaryCode) || analysisSemanticallyConflictsWithPrimary(analysis, primaryLabel)
      ? `首选推荐为 ${primaryLabel}；该结论以结构化候选排序为准，后续服务项/原子配置请交给 value-add-service-config。`
      : analysis || `首选推荐为 ${primaryLabel}；如需服务项/原子配置，请交给 value-add-service-config。`;
    if (!analysis.includes(primaryCode)) {
      analysis = `${analysis} 首选 VASC：${primaryLabel}。`;
    }
  } else if (!analysis) {
    analysis = "已基于异常事实和客户处理意图整理 VASC 候选；如需服务项/原子配置，请交给 value-add-service-config。";
  }
  const inputContext = asRecord(params.inputContext);
  const chainId = asText(inputContext.chainId);

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "value-add-product-recommendation",
      resultSummary: analysis.slice(0, 200),
      chainId,
    },
    enrichedContext: {
      valueAddProductRecommendation: structured,
      handoffToServiceConfig: structured.handoffToServiceConfig,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "format-output failed");
      process.exit(1);
    });
}
