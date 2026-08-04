/**
 * 节点：format-output — 合并 LLM 输出与 **fetch-export-pod** 的确定性 POD 字段
 * FaaS 单文件闭环。`podFileUrls` / `exportStatus` 等以 `podExportFacts` 为准覆盖 LLM 同名字段。
 */

interface PodExportFacts {
  exportStatus?: string;
  outboundOrderNos?: string[];
  trackingIds?: string[];
  podFileUrls?: string[];
  podRawPaths?: string[];
  verifiedOutboundOrderNos?: string[];
  rejectedOutboundOrderNos?: string[];
  ownershipStatus?: string;
  apiStatus?: unknown;
  apiInfo?: string;
  apiErrorCode?: string;
  notes?: string[];
}

interface PodStructured {
  outboundOrderNos?: string[];
  trackingIds?: string[];
  podFileUrls?: string[];
  podRawPaths?: string[];
  exportStatus?: string;
  verifiedOutboundOrderNos?: string[];
  rejectedOutboundOrderNos?: string[];
  ownershipStatus?: string;
  apiStatus?: unknown;
  apiInfo?: string;
  apiErrorCode?: string;
  podNotes?: string[];
  [key: string]: unknown;
}

interface PodAnalysisResult {
  structured?: PodStructured;
  analysis?: string;
}

interface PodInputContext {
  chainId?: string;
  sourceExpertId?: string;
  previousOutput?: string | object;
}

function coerceAnalysisResult(raw: unknown): { structured: PodStructured; analysis: string } {
  if (raw == null) {
    return { structured: {}, analysis: "未收到模型输出。" };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as PodAnalysisResult;
      if (parsed && typeof parsed === "object") {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      return { structured: {}, analysis: s || "解析失败。" };
    }
    return { structured: {}, analysis: s };
  }

  const o = raw as PodAnalysisResult;
  const st = o.structured ?? {};
  const analysis = typeof o.analysis === "string" ? o.analysis : "（无 analysis 字段）";
  return { structured: typeof st === "object" && st !== null ? { ...st } : {}, analysis };
}

function asFacts(raw: unknown): PodExportFacts {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as PodExportFacts;
  }
  return {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const facts = asFacts(params.podExportFacts);
  const inputContext = (params.inputContext ?? {}) as PodInputContext;

  const structured: PodStructured = { ...coerced.structured };

  if (facts.exportStatus !== undefined) structured.exportStatus = facts.exportStatus;
  if (facts.ownershipStatus !== undefined) structured.ownershipStatus = facts.ownershipStatus;
  if (Array.isArray(facts.verifiedOutboundOrderNos) && facts.verifiedOutboundOrderNos.length)
    structured.verifiedOutboundOrderNos = facts.verifiedOutboundOrderNos;
  if (Array.isArray(facts.rejectedOutboundOrderNos) && facts.rejectedOutboundOrderNos.length)
    structured.rejectedOutboundOrderNos = facts.rejectedOutboundOrderNos;
  if (Array.isArray(facts.outboundOrderNos) && facts.outboundOrderNos.length)
    structured.outboundOrderNos = facts.outboundOrderNos;
  if (Array.isArray(facts.trackingIds) && facts.trackingIds.length) structured.trackingIds = facts.trackingIds;
  if (Array.isArray(facts.podFileUrls)) structured.podFileUrls = facts.podFileUrls;
  if (Array.isArray(facts.podRawPaths)) structured.podRawPaths = facts.podRawPaths;
  if (facts.apiStatus !== undefined) structured.apiStatus = facts.apiStatus;
  if (facts.apiInfo !== undefined) structured.apiInfo = facts.apiInfo;
  if (facts.apiErrorCode !== undefined) structured.apiErrorCode = facts.apiErrorCode;
  if (Array.isArray(facts.notes) && facts.notes.length) structured.podNotes = facts.notes;

  const summary =
    (coerced.analysis || "").slice(0, 200) ||
    (structured.exportStatus === "success" ? "POD 导出成功" : "POD 申请处理完成");

  return {
    structured,
    analysis: coerced.analysis,
    outputContext: {
      expertId: "pod-request",
      resultSummary: summary,
      chainId: inputContext.chainId ?? "",
    },
    enrichedContext: {},
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
