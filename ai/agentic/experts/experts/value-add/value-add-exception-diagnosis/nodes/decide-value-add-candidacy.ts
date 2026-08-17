/**
 * 节点：decide-value-add-candidacy — 决定异常是否进入增值推荐链。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asKnownText(value: unknown): string {
  const text = asText(value);
  return text && text.toLowerCase() !== "unknown" ? text : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function coerceStructured(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return coerceStructured(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  const obj = asRecord(raw);
  return asRecord(obj.structured ?? obj);
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

function isDeprecatedOrRedirectNote(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("deprecated") ||
    line.includes("已废弃") ||
    line.includes("废弃") ||
    line.includes("请使用") ||
    line.includes("替代")
  );
}

function evidenceLineMentions(kb: string, needle: string): boolean {
  if (!needle) return false;
  const lowerNeedle = needle.toLowerCase();
  return kb
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isDeprecatedOrRedirectNote(line))
    .some((line) => line.toLowerCase().includes(lowerNeedle));
}

function isVerifiedDiscrepancy(evidenceSummary: Record<string, unknown>): boolean {
  return (
    evidenceSummary.verified === true ||
    evidenceSummary.discrepancyVerified === true ||
    evidenceSummary.responsibilityVerified === true ||
    asText(evidenceSummary.checkResult).length > 0 ||
    asText(evidenceSummary.discrepancyCheckResult).length > 0
  );
}

async function main({ params }: { params: Record<string, unknown> }) {
  const diagnosisInput = asRecord(params.diagnosisInput);
  const validationResult = asRecord(params.validationResult);
  const classification = coerceStructured(params.classificationResult);
  const normalizedException = asRecord(classification.normalizedException);
  const exceptionCode =
    asKnownText(classification.exceptionCode) || asKnownText(normalizedException.code) || asKnownText(diagnosisInput.exceptionCode);
  const exceptionName =
    asKnownText(classification.exceptionName) || asKnownText(normalizedException.name) || asKnownText(diagnosisInput.exceptionName);
  const entryKb = asText(params.valueAddEntryKb);
  const mappingKb = asText(params.exceptionMappingSummaryKb);
  const hasKnownException = Boolean(exceptionCode || exceptionName || asText(diagnosisInput.exceptionDescription));
  const hasMappingEvidence =
    evidenceLineMentions(mappingKb, exceptionCode) || evidenceLineMentions(mappingKb, exceptionName);
  const hasEntryEvidence =
    hasMappingEvidence ||
    evidenceLineMentions(entryKb, exceptionCode) ||
    evidenceLineMentions(entryKb, exceptionName);
  const exceptionCategory = asKnownText(classification.exceptionCategory) || asKnownText(diagnosisInput.exceptionCategory);
  const requiresCustomerAction =
    asOptionalBoolean(classification.requiresCustomerAction) ?? asOptionalBoolean(diagnosisInput.requiresCustomerAction);
  const evidenceSummary = asRecord(diagnosisInput.evidenceSummary);
  const needsDiscrepancyCheck =
    exceptionCategory === "quantity_discrepancy" && !isVerifiedDiscrepancy(evidenceSummary);
  const outputPath = !validationResult.ok
    ? "unknown_exception"
    : !hasKnownException
      ? "unknown_exception"
      : needsDiscrepancyCheck
        ? "needs_upstream_check"
      : hasEntryEvidence
        ? "candidate"
        : "needs_upstream_check";

  const handoffFacts = {
    exceptionCode,
    exceptionName,
    exceptionCategory,
    exceptionObject: asKnownText(classification.exceptionObject) || asKnownText(diagnosisInput.exceptionObject),
    objectLevel: asKnownText(classification.objectLevel) || asKnownText(diagnosisInput.objectLevel),
    blockedStage: asKnownText(classification.blockedStage),
    requiresCustomerAction,
    inboundOrderNo: asText(diagnosisInput.inboundOrderNo),
    eventNo: asText(diagnosisInput.eventNo),
    evidenceSummary: asRecord(diagnosisInput.evidenceSummary),
  };

  return {
    candidacyDecision: {
      outputPath,
      isValueAddCandidate: outputPath === "candidate",
      missingEvidence:
        outputPath === "candidate"
          ? []
          : outputPath === "unknown_exception"
            ? ["exception_identity"]
            : needsDiscrepancyCheck
              ? ["discrepancyFacts"]
            : ["upstream_exception_check"],
      handoffFacts,
    },
    diagnosisInput: {
      ...diagnosisInput,
      exceptionCode,
      exceptionName,
      exceptionCategory: handoffFacts.exceptionCategory,
      exceptionObject: handoffFacts.exceptionObject,
      objectLevel: handoffFacts.objectLevel,
      requiresCustomerAction,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("decide-value-add-candidacy")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "decide-value-add-candidacy failed");
      process.exit(1);
    });
}
