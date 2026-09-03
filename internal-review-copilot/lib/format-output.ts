import type {
  CompletenessResult,
  ContextFacts,
  GeneratedSop,
  LlmGeneration,
  MatchResult,
  OutputPath,
  OwnerFacts,
  PipelineNode,
  RequirementCheck,
  StructuredReview,
} from "./types.ts";

export interface FormattedOutput {
  structured: {
    mode: "internal_review_copilot";
    outputPath: OutputPath;
    node: PipelineNode;
    sceneKey: string;
    scenarioName: string;
    missingRequirementItems: string[];
    missingFields: string[];
    missingAttachments: string[];
    requirementDescription: string;
    requirementBackground: string;
    warehouseSop: string;
    llmGeneratedText: string;
    llmError: string | null;
    processingMethod: "暂时";
    imActionProposal: {
      requiresUserConfirm: true;
      mentionRoles: string[];
      messageDraft: string;
    };
  };
  analysis: string;
  outputContext: {
    expertId: "internal-review-copilot";
    outputPath: OutputPath;
    node: PipelineNode;
  };
}

function mentionRoles(path: OutputPath, owners: OwnerFacts): string[] {
  if (path === "needs_requirement_clarification" || path === "needs_field_clarification") {
    return owners.customerService.length || owners.sales.length
      ? ["customerService", "sales"].filter((role) => (owners as Record<string, string[]>)[role]?.length)
      : ["customerService", "sales"];
  }
  if (path === "sop_generated") return ["reviewers"];
  return [];
}

function messageDraft(
  path: OutputPath,
  orderNo: string,
  missing: string[],
  llmText?: string,
  sop?: GeneratedSop,
): string {
  if (llmText) return llmText;
  if (path === "needs_requirement_clarification") {
    return `增值单 ${orderNo} 需求描述不完整，请补充：${missing.join("、") || "客户需求要素"}。AI 不代填事实。`;
  }
  if (path === "needs_field_clarification") {
    return `增值单 ${orderNo} 已识别为 F-001，但仍缺附件/字段：${missing.join("、")}。请补齐后再审。`;
  }
  if (path === "transfer_human") {
    return `增值单 ${orderNo} 需求描述已完整，但当前模板库只自动支持 F-001，请转人工审核，并记为后续模板候选。`;
  }
  if (path === "sop_generated") {
    return `增值单 ${orderNo} 需求与附件已齐，已生成 SOP 草稿供审核确认。确认不等于审核通过。\n${sop?.sopText || ""}`;
  }
  return `增值单 ${orderNo} 输入无法进入内部审核链路。`;
}

export function formatOutput(args: {
  outputPath: OutputPath;
  node: PipelineNode;
  contextFacts: ContextFacts;
  ownerFacts: OwnerFacts;
  requirement?: RequirementCheck;
  matchResult?: MatchResult;
  completeness?: CompletenessResult;
  mockSop?: GeneratedSop;
  llm?: LlmGeneration;
}): FormattedOutput {
  const missingRequirementItems = args.requirement?.missingRequirementItems || [];
  const missingAttachments = args.completeness?.missingAttachments || [];
  const missingFields = (args.completeness?.missingFields || []).map((item) => item.field);
  const missing = [...new Set([...missingRequirementItems, ...missingAttachments, ...missingFields])];
  const path = args.outputPath;
  const llmText = args.llm?.text || "";
  const draft = messageDraft(path, args.contextFacts.orderNo, missing, llmText, args.mockSop);

  return {
    structured: {
      mode: "internal_review_copilot",
      outputPath: path,
      node: args.node,
      sceneKey: args.matchResult?.sceneKey || "",
      scenarioName: args.matchResult?.scenarioName || "",
      missingRequirementItems,
      missingFields,
      missingAttachments,
      requirementDescription:
        args.mockSop?.requirementDescription || args.requirement?.normalizedRequirement || "",
      requirementBackground: args.mockSop?.requirementBackground || args.contextFacts.providedFields.BEOR || "",
      warehouseSop: args.mockSop?.warehouseSop || "",
      llmGeneratedText: llmText,
      llmError: args.llm?.error || null,
      processingMethod: "暂时",
      imActionProposal: {
        requiresUserConfirm: true,
        mentionRoles: mentionRoles(path, args.ownerFacts),
        messageDraft: draft,
      },
    },
    analysis: draft,
    outputContext: {
      expertId: "internal-review-copilot",
      outputPath: path,
      node: args.node,
    },
  };
}

export function buildStructuredReview(args: {
  vascNo: string;
  outputPath: OutputPath;
  requirement?: RequirementCheck;
  matchResult?: MatchResult;
  completeness?: CompletenessResult;
  llmGeneratedText: string;
  llmError: string | null;
  riskFlags?: string[];
}): StructuredReview {
  const missingRequirements = args.requirement?.missingRequirementItems || [];
  const missingMaterials = [
    ...(args.completeness?.missingAttachments || []),
    ...(args.completeness?.missingFields || []).map((item) => item.field),
  ];
  const uniqueMaterials = [...new Set(missingMaterials)];
  const transferReason =
    args.outputPath === "transfer_human"
      ? args.llmError || args.matchResult?.reason || args.llmGeneratedText || "转人工审核"
      : null;

  return {
    vascNo: args.vascNo,
    requirementComplete: args.requirement?.complete ?? false,
    missingRequirements,
    sceneMatch: {
      decision: args.matchResult?.decision || "",
      topScene: args.matchResult?.topK?.[0]?.sceneKey || args.matchResult?.sceneKey || "",
      confidence: args.matchResult?.confidenceScore ?? args.matchResult?.score ?? "",
    },
    materialsComplete: args.completeness?.complete ?? false,
    missingMaterials: uniqueMaterials,
    outputPath: args.outputPath,
    llmGeneratedText: args.llmGeneratedText,
    transferReason,
    processingMethod: "暂时",
    riskFlags: args.riskFlags || [],
    llmError: args.llmError,
  };
}
