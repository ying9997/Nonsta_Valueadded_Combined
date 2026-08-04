/**
 * 节点：format-output — 归一化 LLM 输出，合并 bookingSummary / scopeGuard
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
  const bookingSummary = (params.bookingSummary ?? {}) as Record<string, unknown>;
  const scopeGuard = (params.scopeGuard ?? {}) as Record<string, unknown>;

  const structured: Record<string, unknown> = { ...(coerced.structured ?? {}) };

  if (bookingSummary.recordCount != null && structured.bookingRecords == null) {
    structured.bookingRecords = bookingSummary.records ?? [];
  }
  if (bookingSummary.totalPenaltyFee != null && structured.penaltyFee == null) {
    structured.penaltyFee = bookingSummary.totalPenaltyFee;
  }
  if (bookingSummary.dataQuality != null) {
    structured.dataQuality = bookingSummary.dataQuality;
  }
  if (bookingSummary.requiresManualAction === true) {
    structured.requiresManualAction = true;
  }
  if (scopeGuard.scopeAction && !structured.scopeAction) {
    structured.scopeAction = scopeGuard.scopeAction;
  }
  if (scopeGuard.referExpertId && !structured.referExpertId) {
    structured.referExpertId = scopeGuard.referExpertId;
  }

  const analysis = coerced.analysis || "（无 analysis 字段）";
  const summary = analysis.slice(0, 200) || "预约送仓操作指引完成";

  const outputContext: Record<string, unknown> = {
    expertId: "inbound-appointment-manage",
    resultSummary: summary,
    chainId: inputContext?.chainId ?? "",
  };
  if (scopeGuard.referExpertId) {
    outputContext.nextExpertId = scopeGuard.referExpertId;
  }

  return {
    structured,
    analysis,
    outputContext,
    enrichedContext: {
      bookingSummary,
      scopeGuard,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
