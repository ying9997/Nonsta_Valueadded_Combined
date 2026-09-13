import { asText } from "./oms-adapter.ts";
import type { LlmSopDraft } from "./types.ts";

export interface SopSections {
  requirementDescription: string;
  requirementBackground: string;
  operationSteps: string;
}

export function sectionOf(text: string, heading: string): string {
  const re = new RegExp(`【${heading}】\\s*([\\s\\S]*?)(?=\\n【|$)`);
  return (text.match(re)?.[1] || "").trim();
}

export function sameNormalizedText(a: string, b: string): boolean {
  const n = (s: string) => asText(s).replace(/\s+/g, "");
  return Boolean(n(a) && n(a) === n(b));
}

export function extractSopSectionsFromText(text: string): SopSections {
  const t = asText(text);
  return {
    requirementDescription: sectionOf(t, "需求描述"),
    requirementBackground: sectionOf(t, "需求背景"),
    operationSteps:
      sectionOf(t, "操作要求") || sectionOf(t, "操作步骤") || sectionOf(t, "仓库SOP") || t.trim(),
  };
}

function stepsWithoutBackground(raw: string, fallbackText = ""): string {
  const source = asText(raw) || asText(fallbackText);
  if (!source) return "";
  if (!/【需求背景】|【需求描述】/.test(source)) return source.trim();
  return (
    sectionOf(source, "操作要求") ||
    sectionOf(source, "操作步骤") ||
    sectionOf(source, "仓库SOP") ||
    source.trim()
  );
}

export function extractSopSectionsFromLlm(
  sop?: Partial<LlmSopDraft> | null,
  originalDescription = "",
): SopSections | null {
  if (!sop) return null;
  const fromText = extractSopSectionsFromText(asText(sop.sopText));
  let requirementDescription = asText(sop.requirementDescription) || fromText.requirementDescription;
  if (originalDescription && sameNormalizedText(requirementDescription, originalDescription)) {
    requirementDescription = "";
  }
  const requirementBackground = asText(sop.requirementBackground) || fromText.requirementBackground;
  const operationSteps = stepsWithoutBackground(asText(sop.warehouseSop), fromText.operationSteps || asText(sop.sopText));
  if (!requirementDescription && !requirementBackground && !operationSteps) return null;
  return { requirementDescription, requirementBackground, operationSteps };
}

/** Prefer LLM structured fields, else parse 【标题】 from full SOP text. */
export function extractSopSections(source: {
  aiGeneratedText?: string;
  llmSop?: Partial<LlmSopDraft> | null;
  llm?: { sop?: LlmSopDraft | Partial<LlmSopDraft>; text?: string };
  analysis?: string;
  customerRequirementDescription?: string;
}): SopSections {
  const original = asText(source.customerRequirementDescription);
  const fromLlm = extractSopSectionsFromLlm(source.llmSop || source.llm?.sop, original);
  if (fromLlm) return fromLlm;
  const fromText = extractSopSectionsFromText(source.aiGeneratedText || source.llm?.text || source.analysis || "");
  if (original && sameNormalizedText(fromText.requirementDescription, original)) {
    fromText.requirementDescription = "";
  }
  return fromText;
}

function fieldText(fields: Record<string, unknown> | undefined, keys: string[]): string {
  for (const key of keys) {
    const value = asText(fields?.[key]);
    if (value) return value;
  }
  return "";
}

function joinNos(list?: string[], fallback = ""): string {
  const nos = (list || []).map((item) => asText(item)).filter(Boolean);
  if (nos.length) return [...new Set(nos)].join("、");
  return asText(fallback);
}

export function composeRequirementDescription(input: {
  allEventNos?: string[];
  eventNo?: string;
  allBusinessOrderNos?: string[];
  businessOrderNo?: string;
}): string {
  const events = joinNos(input.allEventNos, input.eventNo);
  const wis = joinNos(input.allBusinessOrderNos, input.businessOrderNo);
  if (events && wis) return `异常单 ${events} 需关联入库单 ${wis} 处理。`;
  if (events) return `需处理异常单 ${events}。`;
  if (wis) return `需按入库单 ${wis} 处理。`;
  return "";
}

/**
 * L1 已识别出的两段总结。后面 L2/L3/L4 卡片都复用这一套：
 * 优先 LLM 结构化字段，缺了再用异常单 / 入库单 / BEOR 拼，不把客户原文原样贴上去。
 */
export function composeIdentifiedSummaries(source: {
  llm?: { sop?: LlmSopDraft | Partial<LlmSopDraft> | null; text?: string };
  llmSop?: Partial<LlmSopDraft> | null;
  aiGeneratedText?: string;
  analysis?: string;
  providedFields?: Record<string, unknown>;
  originalRequirement?: string;
  allEventNos?: string[];
  eventNo?: string;
  allBusinessOrderNos?: string[];
  businessOrderNo?: string;
  customerRequirementDescription?: string;
}): SopSections {
  const original =
    asText(source.originalRequirement) ||
    asText(source.customerRequirementDescription) ||
    fieldText(source.providedFields, ["VAS_ATTR_REL_RD", "需求描述"]);
  const sections = extractSopSections({
    llm: source.llm,
    llmSop: source.llmSop,
    aiGeneratedText: source.aiGeneratedText,
    analysis: source.analysis,
    customerRequirementDescription: original,
  });
  const requirementDescription =
    sections.requirementDescription ||
    composeRequirementDescription({
      allEventNos: source.allEventNos,
      eventNo: source.eventNo,
      allBusinessOrderNos: source.allBusinessOrderNos,
      businessOrderNo: source.businessOrderNo,
    });
  const requirementBackground =
    sections.requirementBackground ||
    fieldText(source.providedFields, ["BEOR", "需求背景说明", "requirementBackground"]);
  return {
    requirementDescription,
    requirementBackground,
    operationSteps: sections.operationSteps,
  };
}
