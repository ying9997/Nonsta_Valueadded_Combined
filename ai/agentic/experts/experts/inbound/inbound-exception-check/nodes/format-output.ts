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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasObjectFields(value: unknown): boolean {
  return Object.keys(asRecord(value)).length > 0;
}

function hasParam(params: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(params, key);
}

function coerceAnalysisResult(raw: unknown): AnalysisResult {
  if (raw == null) return { structured: {}, analysis: "未收到模型输出。" };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw.trim()) as AnalysisResult;
      if (parsed && typeof parsed === "object") return coerceAnalysisResult(parsed);
    } catch {
      return { structured: {}, analysis: raw };
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
  const structured = coerced.structured ?? {};
  if (hasParam(params, "discrepancyReport")) {
    structured.discrepancyReport = params.discrepancyReport;
  }
  if (hasParam(params, "needsClarification")) {
    structured.needsClarification = params.needsClarification;
  }
  if (hasParam(params, "clarificationFields")) {
    structured.clarificationFields = params.clarificationFields;
  }
  if (hasParam(params, "coverageGap")) {
    structured.coverageGap = params.coverageGap;
  }
  if (hasParam(params, "coverageGapReason")) {
    structured.coverageGapReason = params.coverageGapReason;
  }
  if (hasParam(params, "orderPhaseHint")) {
    structured.orderPhaseHint = params.orderPhaseHint;
  }
  if (hasParam(params, "isPutawayComparable")) {
    structured.isPutawayComparable = params.isPutawayComparable;
  }
  if (hasParam(params, "humanReviewReason")) {
    structured.humanReviewReason = params.humanReviewReason;
  }
  if (hasParam(params, "needsHumanReview")) {
    structured.needsHumanReview = params.needsHumanReview;
  }
  if (hasParam(params, "exceptionLookupStatus")) {
    structured.exceptionLookupStatus = params.exceptionLookupStatus;
  }
  if (hasParam(params, "exceptionLookupMessage")) {
    structured.exceptionLookupMessage = params.exceptionLookupMessage;
  }
  if (hasParam(params, "contextContinuity")) {
    structured.contextContinuity = params.contextContinuity;
  }
  if (hasParam(params, "followUpVasOrderNo")) {
    structured.followUpVasOrderNo = params.followUpVasOrderNo;
  }
  if (hasParam(params, "needsFollowUp")) {
    structured.needsFollowUp = params.needsFollowUp;
  }
  if (hasParam(params, "followUpReason")) {
    structured.followUpReason = params.followUpReason;
  }
  if (hasParam(params, "suggestedNextExpert")) {
    structured.suggestedNextExpert = params.suggestedNextExpert;
  }
  if (hasParam(params, "valueAddHandoff")) {
    structured.valueAddHandoff = params.valueAddHandoff;
  }
  if (!hasObjectFields(structured.valueAddHandoff)) {
    structured.valueAddHandoff = {};
    structured.suggestedNextExpert = "";
  }
  const analysis = coerced.analysis || "（无 analysis 字段）";
  const summary = analysis.slice(0, 200) || "入库异常核实完成";

  return {
    structured,
    analysis,
    outputContext: {expertId: "inbound-exception-check",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "" },
    enrichedContext: {
        discrepancyReport: structured.discrepancyReport,
        exceptionTypes: structured.exceptionTypes,
        needsHumanReview: structured.needsHumanReview,
        exceptionLookupStatus: structured.exceptionLookupStatus,
        contextContinuity: structured.contextContinuity,
        followUpVasOrderNo: structured.followUpVasOrderNo,
        needsFollowUp: structured.needsFollowUp,
        followUpReason: structured.followUpReason,
        suggestedNextExpert: structured.suggestedNextExpert,
        coverageGap: structured.coverageGap,
        orderPhaseHint: structured.orderPhaseHint,
        isPutawayComparable: structured.isPutawayComparable,
        valueAddHandoff: structured.valueAddHandoff,
      },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
