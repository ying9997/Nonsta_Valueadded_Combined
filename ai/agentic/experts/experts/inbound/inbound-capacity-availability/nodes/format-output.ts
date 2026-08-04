/**
 * 节点：format-output — 归一化 LLM 输出
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。
 */

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

interface InputContext {
  chainId?: string;
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
  const mergedCapacity = (params.mergedCapacity ?? {}) as Record<string, unknown>;

  const structured = {
    ...coerced.structured,
    warehouseCode: coerced.structured?.warehouseCode ?? mergedCapacity.warehouseCode ?? params.warehouseCode ?? "",
    quotaSnapshot: coerced.structured?.quotaSnapshot ?? mergedCapacity.quotaSnapshot ?? params.quotaSnapshot ?? {},
    dataSource: coerced.structured?.dataSource ?? params.dataSource ?? "kb_only",
    overallTemperature: coerced.structured?.overallTemperature ?? params.overallTemperature ?? "unknown",
    capacityAdvice: coerced.structured?.capacityAdvice ?? params.capacityAdvice ?? [],
    dataQuality: coerced.structured?.dataQuality ?? params.dataQuality ?? "mock",
  };

  const analysis = coerced.analysis || "（无 analysis 字段）";
  const summary = analysis.slice(0, 200) || "库容额度查询完成";

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "inbound-capacity-availability",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "",
    },
    enrichedContext: {
      warehouseCode: structured.warehouseCode,
      overallTemperature: structured.overallTemperature,
      dataSource: structured.dataSource,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
