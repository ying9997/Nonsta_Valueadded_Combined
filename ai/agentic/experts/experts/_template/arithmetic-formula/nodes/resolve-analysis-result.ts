/**
 * 分支汇合：true 路径取 llm-comment 的 analysisResult，false 路径取 stub-llm-placeholder。
 * 供 format-output 单一 analysisResult 入参，满足 Coze「入参须引用上游 node_outputs 显式键」。
 */

interface AnalysisResult {
  structured: Record<string, unknown>;
  analysis: string;
}

function pickAnalysisResult(raw: unknown): AnalysisResult {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as AnalysisResult;
    return {
      structured: o.structured ?? {},
      analysis: typeof o.analysis === "string" ? o.analysis : "",
    };
  }
  return { structured: {}, analysis: "" };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const fromLlm = pickAnalysisResult(params.llmAnalysisResult);
  const fromStub = pickAnalysisResult(params.stubAnalysisResult);
  const analysisResult =
    fromLlm.analysis.trim().length > 0 || Object.keys(fromLlm.structured).length > 0
      ? fromLlm
      : fromStub;
  return { analysisResult };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-analysis-result")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
