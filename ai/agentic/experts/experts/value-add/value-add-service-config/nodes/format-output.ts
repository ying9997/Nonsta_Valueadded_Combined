/**
 * 节点：format-output — 归一化服务配置输出。
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function extractJsonStringField(text: string, fieldName: string): string {
  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "gs");
  let match: RegExpExecArray | null;
  let value = "";
  while ((match = pattern.exec(text)) !== null) {
    value = match[1] || "";
  }
  if (!value) return "";
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
}

function coerceAnalysisResult(raw: unknown): { structured: Record<string, unknown>; analysis: string } {
  if (typeof raw === "string") {
    const unfenced = stripJsonFence(raw);
    try {
      return coerceAnalysisResult(JSON.parse(unfenced));
    } catch {
      const extractedAnalysis = extractJsonStringField(unfenced, "analysis");
      if (extractedAnalysis) return { structured: {}, analysis: extractedAnalysis };
      return { structured: {}, analysis: raw };
    }
  }
  const obj = asRecord(raw);
  const analysis = asText(obj.analysis);
  if (analysis.startsWith("```")) {
    const unfencedAnalysis = stripJsonFence(analysis);
    try {
      const parsed = coerceAnalysisResult(JSON.parse(unfencedAnalysis));
      if (parsed.analysis || Object.keys(parsed.structured).length > 0) return parsed;
    } catch {
      const extractedAnalysis = extractJsonStringField(unfencedAnalysis, "analysis");
      if (extractedAnalysis) return { structured: asRecord(obj.structured), analysis: extractedAnalysis };
    }
  }
  return {
    structured: asRecord(obj.structured),
    analysis,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const configEvidence = asRecord(params.configEvidence);
  const result = coerceAnalysisResult(params.analysisResult);
  const selectableServiceItems = configEvidence.selectableServiceItems ?? [];
  const serviceItems = asArray(configEvidence.serviceItems).length > 0
    ? configEvidence.serviceItems
    : selectableServiceItems;
  const outputPath = asText(configEvidence.outputPath) || "conditional";
  const structured = {
    outputPath,
    vasc: configEvidence.vasc ?? {},
    serviceItems,
    selectableServiceItems: configEvidence.selectableServiceItems ?? [],
    blockedServiceItems: configEvidence.blockedServiceItems ?? [],
    mutexGroups: configEvidence.mutexGroups ?? [],
    blockingReasons: configEvidence.blockingReasons ?? [],
    missingConfirmations: configEvidence.missingConfirmations ?? [],
    pendingRuleEvidence: configEvidence.pendingRuleEvidence ?? [],
    fieldEvidenceStatus: configEvidence.fieldEvidenceStatus ?? "partial_field_evidence",
    fieldEvidenceSummary: configEvidence.fieldEvidenceSummary ?? { status: configEvidence.fieldEvidenceStatus ?? "partial_field_evidence" },
    handoffExpertId: asText(configEvidence.handoffExpertId),
    blockedClaims: configEvidence.blockedClaims ?? [],
    configBoundaryNotes: [
      "字段、附件、模板和上传关系只输出证据状态，不作为完整下单配置。",
      ...(asText(asRecord(configEvidence.vasc).activeStatus).toLowerCase() === "inactive"
        ? ["activeStatus=inactive，只作历史线索，不承诺当前可下单。"]
        : []),
    ],
  };
  const analysis =
    result.analysis ||
    (structured.outputPath === "escalated"
      ? "已提交增值单状态查询不属于服务配置解释范围，应转交 value-add-order-status 查询处理进度。"
      : structured.outputPath === "inactive_vasc"
      ? "该 VASC 当前 activeStatus=inactive，只能作为历史线索解释，不承诺当前页面可下单。"
      : "已整理当前 VASC 的服务配置证据边界；未覆盖或动态配置依赖的规则需保持待确认。");
  const inputContext = asRecord(params.inputContext);
  const chainId = asText(inputContext.chainId);

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "value-add-service-config",
      resultSummary: analysis.slice(0, 200),
      chainId,
    },
    enrichedContext: {
      valueAddServiceConfig: structured,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "format-output failed");
      process.exit(1);
    });
}
