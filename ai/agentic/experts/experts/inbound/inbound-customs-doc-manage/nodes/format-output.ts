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
  const umsDataAvailable = params.umsDataAvailable === true;
  const vendorList = Array.isArray(params.vendorList) ? params.vendorList : [];

  const structured: Record<string, unknown> = {
    ...(coerced.structured ?? {}),
    umsDataAvailable,
  };
  if (vendorList.length > 0 && !structured.vendorList) {
    structured.vendorList = vendorList;
  }
  if (umsDataAvailable && !structured.apiAction) {
    structured.apiAction = "winit.ums.getVendorInfo";
  }

  const analysis = coerced.analysis || "（无 analysis 字段）";
  const summary = analysis.slice(0, 200) || "清关资料与进口商管理指引完成";

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "inbound-customs-doc-manage",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "",
    },
    enrichedContext: {
      intent: structured.intent,
      country: structured.country,
      inboundOrderNo: structured.inboundOrderNo,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
