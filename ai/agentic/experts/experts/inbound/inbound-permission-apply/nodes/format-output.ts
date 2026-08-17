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

  const structured = {
    ...coerced.structured,
    dataSource: "kb_only",
    permissionType: coerced.structured?.permissionType ?? params.permissionType ?? "",
    alreadyEnabled: coerced.structured?.alreadyEnabled ?? params.alreadyEnabled ?? false,
    canAutoSubmit: false,
    submitStatus: coerced.structured?.submitStatus ?? params.submitStatus ?? "api_not_available",
    materialChecklist: coerced.structured?.materialChecklist ?? params.materialChecklist ?? [],
    applySteps: coerced.structured?.applySteps ?? params.applySteps ?? [],
  };

  const analysis = coerced.analysis || "（无 analysis 字段）";
  const summary = analysis.slice(0, 200) || "权限申请指引完成";

  return {
    structured,
    analysis,
    outputContext: {expertId: "inbound-permission-apply",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "" },
    enrichedContext: {
        permissionType: structured.permissionType,
        alreadyEnabled: structured.alreadyEnabled,
        dataSource: structured.dataSource,
      },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
