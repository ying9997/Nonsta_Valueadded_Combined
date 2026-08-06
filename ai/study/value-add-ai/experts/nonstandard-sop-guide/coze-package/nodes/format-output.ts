/**
 * format-output — 归一化 SOP 引导输出，决定 outputPath。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function coerceSopResult(raw: unknown): { sopText: string; scenarioName: string; fieldsUsed: string[] } {
  if (typeof raw === "string") {
    try {
      return coerceSopResult(JSON.parse(raw));
    } catch {
      return { sopText: raw, scenarioName: "", fieldsUsed: [] };
    }
  }
  const obj = asRecord(raw);
  return {
    sopText: asText(obj.sopText),
    scenarioName: asText(obj.scenarioName),
    fieldsUsed: Array.isArray(obj.fieldsUsed) ? (obj.fieldsUsed as string[]) : [],
  };
}

function buildClarificationText(missingFields: Array<{ field: string; clarificationPrompt: string }>): string {
  if (missingFields.length === 0) return "";
  const lines = missingFields.map((f, i) => `${i + 1}. ${f.clarificationPrompt}`);
  return `为了帮您生成完整的 SOP，还需要以下信息：\n${lines.join("\n")}`;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const sopInput = asRecord(params.sopInput);
  const matchResult = asRecord(params.matchResult);
  const completenessResult = asRecord(params.completenessResult);
  const validationResult = asRecord(params.validationResult);
  const sopGenerationResult = params.sopGenerationResult;

  if (validationResult.ok === false) {
    const reason = asText(validationResult.reason);
    return {
      structured: {
        outputPath: "invalid_input",
        reason,
        message: asText(validationResult.message),
      },
      analysis: asText(validationResult.message),
      outputContext: { expertId: "nonstandard-sop-guide", outputPath: "invalid_input" },
      enrichedContext: {},
    };
  }

  if (!matchResult.matched || matchResult.category === "C") {
    const scenarioName = asText(matchResult.scenarioName as unknown);
    const message = scenarioName
      ? `您的需求"${scenarioName}"目前暂无标准 SOP 模板，建议联系人工客服协助处理。`
      : "未能匹配到标准场景模板，建议联系人工客服协助您填写需求描述。";

    return {
      structured: {
        outputPath: "transfer_human",
        category: "C",
        scenarioName,
        candidateScenarios: matchResult.candidateScenarios ?? [],
      },
      analysis: message,
      outputContext: { expertId: "nonstandard-sop-guide", outputPath: "transfer_human" },
      enrichedContext: { nonstandardSopGuide: { outputPath: "transfer_human", category: "C" } },
    };
  }

  if (completenessResult.applicable && !completenessResult.complete) {
    const missingFields = (completenessResult.missingFields ?? []) as Array<{ field: string; clarificationPrompt: string }>;
    const clarificationText = buildClarificationText(missingFields);

    return {
      structured: {
        outputPath: "needs_clarification",
        category: "B",
        scenarioId: matchResult.scenarioId,
        scenarioName: asText(matchResult.scenarioName as unknown),
        missingFields: missingFields.map((f) => f.field),
        clarificationPrompts: missingFields.map((f) => f.clarificationPrompt),
        providedCount: completenessResult.providedCount,
        totalRequired: completenessResult.totalRequired,
      },
      analysis: clarificationText,
      outputContext: { expertId: "nonstandard-sop-guide", outputPath: "needs_clarification" },
      enrichedContext: {
        nonstandardSopGuide: {
          outputPath: "needs_clarification",
          category: "B",
          scenarioId: matchResult.scenarioId,
          scenarioName: asText(matchResult.scenarioName as unknown),
          missingFields: missingFields.map((f) => f.field),
        },
      },
    };
  }

  const sopResult = coerceSopResult(sopGenerationResult);
  const scenarioName = sopResult.scenarioName || asText(matchResult.scenarioName as unknown);

  return {
    structured: {
      outputPath: "sop_generated",
      category: "B",
      scenarioId: matchResult.scenarioId,
      scenarioName,
      sopText: sopResult.sopText,
      fieldsUsed: sopResult.fieldsUsed,
    },
    analysis: sopResult.sopText || `已为"${scenarioName}"场景生成 SOP，请确认以下内容是否准确。`,
    outputContext: {
      expertId: "nonstandard-sop-guide",
      outputPath: "sop_generated",
      resultSummary: `${scenarioName} SOP 已生成`,
    },
    enrichedContext: {
      nonstandardSopGuide: {
        outputPath: "sop_generated",
        category: "B",
        scenarioId: matchResult.scenarioId,
        scenarioName,
        sopText: sopResult.sopText,
      },
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
