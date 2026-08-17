/**
 * 节点：format-output — 归一化 LLM 输出
 */

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

interface InputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const analysisResult = (params.analysisResult ?? {}) as AnalysisResult;
  const inputContext = params.inputContext as InputContext | undefined;
  const slaFacts = asRecord(params.slaFacts);
  const structured =
    slaFacts.outputPath === "no_data"
      ? { ...(analysisResult.structured ?? {}), ...slaFacts }
      : (analysisResult.structured ?? {});
  const analysis = analysisResult.analysis ?? "";
  const summary = analysis.slice(0, 200) || "上架催促分析完成";

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "inbound-putaway-expedite",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "",
    },
    enrichedContext: {},
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
