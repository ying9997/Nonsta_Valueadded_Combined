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

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
}

function pickProvided(provided: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const text = asText(provided[key]);
    if (text) return text;
  }
  return "";
}

function isInboundGoldPath(sopInput: Record<string, unknown>, matchResult: Record<string, unknown>): boolean {
  const atom = asText(sopInput.serviceAtom);
  const vasc = asRecord(sopInput.recommendedVasc);
  const vascCode = asText(vasc.vascCode);
  const sceneKey = asText(matchResult.sceneKey) || asText(sopInput.sceneKey);
  const sceneName = asText(matchResult.scenarioName);
  if (atom === "OW01V1602" || atom.includes("入库其他服务需求")) return true;
  if (vascCode === "VASC202411192246131") return true;
  if (sceneKey === "inbound_label_identify") return true;
  if (sceneName.includes("尺重") && sceneName.includes("换标")) return true;
  return false;
}

function buildInboundUiActionProposal(
  sopInput: Record<string, unknown>,
  matchResult: Record<string, unknown>,
  sopText: string,
  scenarioName: string,
): Record<string, unknown> {
  const provided = asRecord(sopInput.providedFields);
  const customerIntent = asText(sopInput.customerIntent);
  const background = firstText(
    pickProvided(provided, ["BEOR", "需求背景说明", "背景", "requirementBackground"]),
    customerIntent,
    scenarioName ? `【${scenarioName}】客户确认后按入库其他服务需求处理。` : "",
  );
  const description = firstText(
    pickProvided(provided, ["VAS_ATTR_REL_RD", "需求描述", "增值单需求描述", "requirementDescription"]),
    sopText,
    customerIntent,
  );

  return {
    requiresUserConfirm: true,
    proposalReason: "客户已确认 SOP；按测环境金标回放：客户创建新单上架 → 入库其他服务需求 → 填写背景与描述。不含提交。",
    actions: [
      {
        type: "select",
        fieldKey: "shelveWayCode",
        valueCode: "INBOUND_ORDER_OF_CUSTOMER",
        valueLabel: "客户创建新单上架",
        reason: "页上处理方式卡文案；接口 shelveWayCode。不要用接口中文「客户提供入库单上架」或产品名「入库非标增值（特批）」去点卡。",
      },
      {
        type: "select",
        fieldKey: "serviceCode",
        valueCode: "OW01V1602",
        valueLabel: "入库其他服务需求",
        reason: "getEventSolutionList 第 3 条原子；表单 vaAtoms_OW01V1602_serviceCode。",
      },
      {
        type: "fill",
        fieldKey: "BEOR",
        value: background,
        reason: "创建页 SUBMIT 必填：需求背景说明。id=vaAtoms_OW01V1602_attributes_BEOR_attributeValue。",
      },
      {
        type: "fill",
        fieldKey: "VAS_ATTR_REL_RD",
        value: description,
        reason: "创建页 SUBMIT 必填：需求描述。id=vaAtoms_OW01V1602_attributes_VAS_ATTR_REL_RD_attributeValue。",
      },
    ],
    validationRules: [
      {
        ruleKey: "no_submit_click",
        severity: "block",
        message: "禁止点击「提交」。暂存是处理方式，不是拉黑对象。",
      },
      {
        ruleKey: "candidate_in_current_page_options",
        severity: "block",
        message: "处理方式与 OW01V1602 必须仍出现在当前页可选范围内。",
      },
    ],
  };
}

export async function main({ params }: { params: Record<string, unknown> }) {
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
  const uiActionProposal = isInboundGoldPath(sopInput, matchResult)
    ? buildInboundUiActionProposal(sopInput, matchResult, sopResult.sopText, scenarioName)
    : undefined;

  return {
    structured: {
      outputPath: "sop_generated",
      category: "B",
      scenarioId: matchResult.scenarioId,
      scenarioName,
      sopText: sopResult.sopText,
      fieldsUsed: sopResult.fieldsUsed,
      ...(uiActionProposal ? { uiActionProposal } : {}),
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
        ...(uiActionProposal ? { uiActionProposal } : {}),
      },
    },
  };
}

if (typeof process !== "undefined" && /[/\\]format-output\.(ts|js)$/.test(process.argv[1] || "")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "format-output failed");
      process.exit(1);
    });
}
