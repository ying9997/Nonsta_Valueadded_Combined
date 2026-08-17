/**
 * 节点：format-output — 归一化 LLM 输出，生成 result / outputContext，并摊平 structured、analysis
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 遵循 design-spec.md §7 三层输出统一约定：
 *   result = { structured, analysis }
 *   outputContext = { expertId, resultSummary, chainId }
 *
 * 【输入】`params` 字段：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | object \| string \| null | LLM 输出 |
 * | inputContext | object（可选） | 链式上下文 |
 *
 * 【输出】JSON 对象（与 delivery-status 一致：`result` 与顶层 `structured`/`analysis` 同构，便于 Coze 画布直连）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | result | { structured: object; analysis: string } | 业务结果，严格 {structured, analysis} |
 * | structured | object | 与 result.structured 相同 |
 * | analysis | string | 与 result.analysis 相同 |
 * | outputContext | { expertId: string; resultSummary: string; chainId: string } | chainId 允许空串 |
 */

interface ProductInfoStructuredOut {
  countryResolved?: string;
  productLine?: string;
  matchedProducts?: Array<{
    name: string;
    category: string;
    weightLimit: string;
    dimensionLimit: string;
    deliveryTime: string;
  }>;
  confidence?: "high" | "medium" | "low";
}

interface ProductInfoAnalysisResult {
  structured?: ProductInfoStructuredOut;
  analysis?: string;
}

interface ProductInfoInputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

function structuredHasProductInfo(st: ProductInfoStructuredOut): boolean {
  if (Array.isArray(st.matchedProducts) && st.matchedProducts.length > 0) return true;
  if (typeof st.countryResolved === "string" && st.countryResolved.trim().length > 0) return true;
  if (typeof st.productLine === "string" && st.productLine.trim().length > 0) return true;
  return st.confidence === "high" || st.confidence === "medium" || st.confidence === "low";
}

function normalizeStructured(structured: ProductInfoStructuredOut): ProductInfoStructuredOut {
  const confidence = structured.confidence;
  return {
    countryResolved: structured.countryResolved,
    productLine: structured.productLine,
    matchedProducts: Array.isArray(structured.matchedProducts) ? structured.matchedProducts : [],
    confidence: confidence === "high" || confidence === "medium" || confidence === "low" ? confidence : "medium",
  };
}

/** 从 analysis 字符串中挽救误嵌套的 { structured, analysis }（含 ```json 代码块） */
function recoverFromAnalysisJson(analysis: string, depth = 0): ProductInfoAnalysisResult | null {
  if (depth > 2) return null;
  const t = analysis.trim();
  if (!t) return null;

  let candidate = t;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) candidate = fence[1].trim();
  else if (!t.startsWith("{")) return null;

  try {
    const inner = JSON.parse(candidate) as ProductInfoAnalysisResult;
    if (!inner || typeof inner !== "object") return null;

    const st = inner.structured ?? {};
    const an = typeof inner.analysis === "string" ? inner.analysis : "";

    if (structuredHasProductInfo(st)) {
      return { structured: normalizeStructured(st), analysis: an };
    }
    if (an) {
      const deeper = recoverFromAnalysisJson(an, depth + 1);
      if (deeper) return deeper;
    }
    if ("structured" in inner || "analysis" in inner) {
      return { structured: normalizeStructured(st), analysis: an || t };
    }
  } catch {
    return null;
  }
  return null;
}

function coerceAnalysisResult(raw: unknown): ProductInfoAnalysisResult {
  if (raw == null) {
    return {
      structured: { matchedProducts: [], confidence: "low" },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as ProductInfoAnalysisResult;
      if (parsed && typeof parsed === "object" && ("structured" in parsed || "analysis" in parsed)) {
        return coerceAnalysisResult(parsed);
      }
    } catch { /* fall through */ }
    const recovered = recoverFromAnalysisJson(s);
    if (recovered) return recovered;
    return {
      structured: { matchedProducts: [], confidence: "low" },
      analysis: s || "解析失败，请人工查看原始模型输出。",
    };
  }
  const o = raw as ProductInfoAnalysisResult;
  let structured = o.structured ?? {};
  let analysis = typeof o.analysis === "string" ? o.analysis : "";

  if (!structuredHasProductInfo(structured) && analysis) {
    const recovered = recoverFromAnalysisJson(analysis);
    if (recovered) {
      structured = recovered.structured ?? { matchedProducts: [], confidence: "low" };
      analysis = recovered.analysis ?? analysis;
    }
  }

  return {
    structured: normalizeStructured(structured),
    analysis: analysis || "（无 analysis 字段）",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const inputContext = params.inputContext as ProductInfoInputContext | undefined;
  const summary = coerced.analysis?.slice(0, 200) || "产品信息获取完成";

  return {
    structured: coerced.structured,
    analysis: coerced.analysis,
    outputContext: {
      expertId: "product-info",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "",
    },
    enrichedContext: {},
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => { console.error(e); process.exit(1); });
}
