/**
 * 将 LLM 原始 JSON 归一为 { structured, analysis }。
 * 兼容 Prompt 包裹形（{ analysisResult: { structured, analysis } }）与过渡期扁平形。
 */

export interface LlmEnvelopePayload {
  structured: Record<string, unknown>;
  analysis: string;
}

const DEFAULT_ENVELOPE_KEY = "analysisResult";
const MAX_UNWRAP_DEPTH = 3;

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStructured(value: unknown): Record<string, unknown> {
  return asRecord(value);
}

function readAnalysis(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * 从已解析对象中提取 structured / analysis（不处理 envelope 键）。
 */
export function extractLlmPayload(obj: Record<string, unknown>): LlmEnvelopePayload {
  return {
    structured: readStructured(obj.structured),
    analysis: readAnalysis(obj.analysis),
  };
}

/**
 * 解开与 workflow.json LLM outputs[0] 同名的外层键（默认 analysisResult）。
 * 支持最多 MAX_UNWRAP_DEPTH 层同名嵌套；若无 envelope 键则按扁平对象处理。
 */
export function unwrapLlmEnvelope(
  raw: unknown,
  envelopeKey: string = DEFAULT_ENVELOPE_KEY,
  depth = 0
): LlmEnvelopePayload {
  if (raw == null) {
    return { structured: {}, analysis: "" };
  }

  if (typeof raw === "string") {
    const unfenced = stripJsonFence(raw);
    try {
      return unwrapLlmEnvelope(JSON.parse(unfenced) as Record<string, unknown>, envelopeKey, depth);
    } catch {
      return { structured: {}, analysis: raw };
    }
  }

  const obj = asRecord(raw);
  const nested = obj[envelopeKey];

  if (nested !== undefined && nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
    if (depth >= MAX_UNWRAP_DEPTH) {
      return extractLlmPayload(asRecord(nested));
    }
    return unwrapLlmEnvelope(nested, envelopeKey, depth + 1);
  }

  return extractLlmPayload(obj);
}
