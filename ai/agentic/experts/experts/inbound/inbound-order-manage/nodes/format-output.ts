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

const INTERNAL_FIELD_KEY = /^(orderMode|isAutoInspection)$/i;
const INTERNAL_FIELD_PAIR = /`?orderMode`?\s*(?:与|和|\/)\s*`?isAutoInspection`?(?:\s*配置)?/gi;
const INTERNAL_FIELD_NAME = /`?(?:orderMode|isAutoInspection)`?/gi;

function sanitizeCustomerValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(INTERNAL_FIELD_PAIR, "相关下单设置")
      .replace(INTERNAL_FIELD_NAME, "相关下单设置");
  }
  if (Array.isArray(value)) return value.map(sanitizeCustomerValue);
  if (!value || typeof value !== "object") return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (!INTERNAL_FIELD_KEY.test(key)) sanitized[key] = sanitizeCustomerValue(nested);
  }
  return sanitized;
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
  const operability = params as Record<string, unknown>;

  const sanitizedStructured = sanitizeCustomerValue(coerced.structured) as Record<string, unknown>;
  const structured = {
    ...sanitizedStructured,
    intent: sanitizedStructured.intent ?? operability.intent ?? "",
    isOperable: sanitizedStructured.isOperable ?? operability.isOperable ?? true,
    blockReason: sanitizedStructured.blockReason ?? operability.blockReason ?? "",
    currentStatus: sanitizedStructured.currentStatus ?? operability.currentStatus ?? null,
  };

  const analysis = String(sanitizeCustomerValue(coerced.analysis) || "（无 analysis 字段）");
  const summary = analysis.slice(0, 200) || "入库单操作指引完成";

  return {
    structured,
    analysis,
    outputContext: {expertId: "inbound-order-manage",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "" },
    enrichedContext: {
        intent: structured.intent,
        isOperable: structured.isOperable,
        currentStatus: structured.currentStatus,
      },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
