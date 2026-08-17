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

async function main({ params }: { params: Record<string, unknown> }) {
  const analysisResult = (params.analysisResult ?? {}) as AnalysisResult;
  const inputContext = params.inputContext as InputContext | undefined;
  const structured = analysisResult.structured ?? {};
  const analysis = analysisResult.analysis ?? "";
  const summary = analysis.slice(0, 200) || "到仓状态查询完成";

  return {
    structured,
    analysis,
    outputContext: {expertId: "inbound-arrival-status",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "" },
    enrichedContext: {
        arrivalPhase: structured.arrivalPhase,
        awhDate: structured.awhDate,
        podSummary: structured.podSummary,
        needsAttention: structured.needsAttention,
        packageQtyComparison: structured.packageQtyComparison,
      },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
