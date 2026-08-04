/**
 * 节点：format-output — 归一化 LLM 输出
 */

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

interface InputContext {
  chainId?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function coerceAnalysisResult(raw: unknown): AnalysisResult {
  if (raw == null) return { structured: {}, analysis: "未收到模型输出。" };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw.trim()) as AnalysisResult;
      if (parsed && typeof parsed === "object") return coerceAnalysisResult(parsed);
    } catch {
      return { structured: {}, analysis: raw.trim() || "解析失败。" };
    }
  }
  const o = raw as AnalysisResult;
  return {
    structured: o.structured ?? ({} as Record<string, unknown>),
    analysis: typeof o.analysis === "string" ? o.analysis : "",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const inputContext = params.inputContext as InputContext | undefined;
  const inspectionPhase = asRecord(params.inspectionPhase);
  const structured: Record<string, unknown> = {
    wmsDataAvailable: false,
    ...coerced.structured,
    ...(inspectionPhase.outputPath === "no_data" ? inspectionPhase : {}),
  };
  structured.wmsDataAvailable = false;

  const analysis = coerced.analysis || "（无 analysis 字段）";
  const summary = analysis.slice(0, 200) || "海外验状态解读完成";

  return {
    structured,
    analysis,
    outputContext: {expertId: "inbound-overseas-inspection",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "" },
    enrichedContext: {
        overseasInspectionPhase: structured.overseasInspectionPhase,
        inspectionMode: structured.inspectionMode,
        isAbnormal: structured.isAbnormal,
        daysSinceArrival: structured.daysSinceArrival,
      },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
