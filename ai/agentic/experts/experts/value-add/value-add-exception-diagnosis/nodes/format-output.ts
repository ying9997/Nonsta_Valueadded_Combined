/**
 * 节点：format-output - 归一化异常诊断输出。
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。
 */

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function coerceAnalysisResult(raw: unknown): AnalysisResult {
  if (typeof raw === "string") {
    try {
      return coerceAnalysisResult(JSON.parse(raw));
    } catch {
      return { structured: {}, analysis: raw };
    }
  }
  const obj = asRecord(raw);
  return {
    structured: asRecord(obj.structured),
    analysis: asText(obj.analysis),
  };
}

function buildCandidateAnalysis(structured: Record<string, unknown>): string {
  const exceptionName = asText(structured.exceptionName);
  const exceptionCode = asText(structured.exceptionCode);
  const exceptionCategory = asText(structured.exceptionCategory);
  const objectLevel = asText(structured.objectLevel);
  const blockedStage = asText(structured.blockedStage);
  const identity = exceptionName
    ? `${exceptionName}${exceptionCode ? `，异常编码为 ${exceptionCode}` : ""}`
    : exceptionCode
      ? `异常编码 ${exceptionCode}`
      : "当前异常";
  const facts = [
    exceptionCategory ? `类别为 ${exceptionCategory}` : "",
    objectLevel ? `对象层级为 ${objectLevel}` : "",
    blockedStage ? `阻断阶段为 ${blockedStage}` : "",
  ].filter(Boolean);
  const factText = facts.length > 0 ? `，${facts.join("，")}` : "";
  return `异常归一结果为${identity}${factText}。该异常可进入增值推荐链；下一步可由产品推荐专家继续判断候选。`;
}

function hasMissingObjectLevelContradiction(analysis: string, structured: Record<string, unknown>): boolean {
  return Boolean(asText(structured.objectLevel)) && analysis.includes("缺失") && analysis.includes("objectLevel");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const diagnosisInput = asRecord(params.diagnosisInput);
  const decision = asRecord(params.candidacyDecision);
  const result = coerceAnalysisResult(params.analysisResult);
  const clarification = coerceAnalysisResult(params.clarificationResult);
  const outputPath = asText(decision.outputPath) || "unknown_exception";
  const handoffFacts = asRecord(decision.handoffFacts);
  const requiresCustomerAction =
    asOptionalBoolean(handoffFacts.requiresCustomerAction) ?? asOptionalBoolean(diagnosisInput.requiresCustomerAction);
  const structured = {
    outputPath,
    isValueAddCandidate: Boolean(decision.isValueAddCandidate),
    exceptionCode: asText(handoffFacts.exceptionCode) || asText(diagnosisInput.exceptionCode),
    exceptionName: asText(handoffFacts.exceptionName) || asText(diagnosisInput.exceptionName),
    exceptionCategory: asText(handoffFacts.exceptionCategory) || asText(diagnosisInput.exceptionCategory),
    exceptionObject: asText(handoffFacts.exceptionObject) || asText(diagnosisInput.exceptionObject),
    objectLevel: asText(handoffFacts.objectLevel) || asText(diagnosisInput.objectLevel),
    blockedStage: asText(handoffFacts.blockedStage) || asText(diagnosisInput.blockedStage),
    requiresCustomerAction: requiresCustomerAction ?? false,
    missingEvidence: Array.isArray(decision.missingEvidence) ? decision.missingEvidence : [],
    handoffFacts,
    normalizedException: {
      code: asText(handoffFacts.exceptionCode) || asText(diagnosisInput.exceptionCode),
      name: asText(handoffFacts.exceptionName) || asText(diagnosisInput.exceptionName),
      source: asText(diagnosisInput.source) || "normalized_facts",
    },
  };
  const candidateAnalysis = result.analysis || buildCandidateAnalysis(structured);
  const analysis =
    outputPath === "unknown_exception" || outputPath === "needs_upstream_check"
      ? clarification.analysis || result.analysis || "当前异常事实不足，请补充异常编码、异常名称或上游核实结果。"
      : hasMissingObjectLevelContradiction(candidateAnalysis, structured)
        ? buildCandidateAnalysis(structured)
        : candidateAnalysis;
  const inputContext = asRecord(params.inputContext);
  const chainId = asText(inputContext.chainId);

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "value-add-exception-diagnosis",
      resultSummary: analysis.slice(0, 200),
      chainId,
    },
    enrichedContext: {
      valueAddExceptionDiagnosis: structured,
      handoffFacts: structured.handoffFacts,
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
