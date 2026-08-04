/**
 * 节点：format-output — 归一化 LLM 的 analysisResult，生成下游 result / outputContext
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 【输入】`params` 字段：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | object \| string \| null | LLM 输出 |
 * | inputContext | object（可选） | 链式上下文 |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | result | { structured: ConsultStructuredOut; analysis: string } | 归一化输出 |
 * | outputContext | { expertId: string; resultSummary: string; chainId?: string } | expertId 固定 product-consult |
 */

interface ConsultStructuredOut {
  countryResolved?: string;
  recommendedProducts?: Array<{ name: string; tier: string; reason: string; sellingPoints?: string[] }>;
  missingInfo?: string[];
  confidence?: "high" | "medium" | "low";
}

interface ConsultAnalysisResult {
  structured?: ConsultStructuredOut;
  analysis?: string;
}

interface ConsultInputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

function coerceAnalysisResult(raw: unknown): ConsultAnalysisResult {
  if (raw == null) {
    return {
      structured: { recommendedProducts: [], missingInfo: ["all"], confidence: "low" },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as ConsultAnalysisResult;
      if (parsed && typeof parsed === "object" && ("structured" in parsed || "analysis" in parsed)) {
        return coerceAnalysisResult(parsed);
      }
    } catch { /* fall through */ }
    return {
      structured: { recommendedProducts: [], missingInfo: [], confidence: "low" },
      analysis: s || "解析失败，请人工查看原始模型输出。",
    };
  }
  const o = raw as { structured?: Record<string, unknown>; analysis?: string };
  const structured = o.structured ?? {};
  const analysis = typeof o.analysis === "string" ? o.analysis : "";
  const confidence = structured.confidence;
  return {
    structured: {
      countryResolved: typeof structured.countryResolved === "string" ? structured.countryResolved : undefined,
      recommendedProducts: Array.isArray(structured.recommendedProducts)
        ? (structured.recommendedProducts as ConsultStructuredOut["recommendedProducts"])
        : [],
      missingInfo: Array.isArray(structured.missingInfo) ? (structured.missingInfo as string[]) : [],
      confidence: confidence === "high" || confidence === "medium" || confidence === "low" ? confidence : "medium",
    },
    analysis: analysis || "（无 analysis 字段）",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const analysisResult = coerceAnalysisResult(params.analysisResult);
  const inputContext = params.inputContext as ConsultInputContext | undefined;
  const summary = analysisResult.analysis?.slice(0, 200) || "产品推荐完成";
  const outputContext = {
    expertId: "product-consult",
    resultSummary: summary,
    chainId: inputContext?.chainId ?? "",
  };
  return {
    structured: analysisResult.structured ?? {},
    analysis: analysisResult.analysis ?? "",
    outputContext,
    enrichedContext: {},
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => { console.error(e); process.exit(1); });
}
