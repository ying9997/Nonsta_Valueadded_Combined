import { main as validateInput } from "../../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts";
import { bindContext } from "./context-bind.ts";
import { checkRequirement } from "./check-requirement.ts";
import { checkCompleteness } from "./check-completeness.ts";
import { checkDocuments } from "./check-documents.ts";
import { buildStructuredReview, formatOutput } from "./format-output.ts";
import { generateLlmTextSafe } from "./generate-text.ts";
import { matchTemplate } from "./match-template.ts";
import { asRecord, asText, buildAgentInput } from "./oms-adapter.ts";
import type {
  AgentInput,
  CompletenessResult,
  ContextFacts,
  JsonRecord,
  LlmGeneration,
  MatchResult,
  OutputPath,
  OwnerFacts,
  PipelineNode,
  RequirementCheck,
  StructuredReview,
} from "./types.ts";

export interface PipelineResult {
  orderNo: string;
  outputPath: OutputPath;
  ruleOutputPath: OutputPath;
  node: PipelineNode;
  nodesHit: PipelineNode[];
  failureGate: "check-requirement" | "match-template" | "check-completeness" | "validate-input" | "llm-generate-sop" | "";
  missingRequirementItems: string[];
  missingAttachments: string[];
  missingFields: string[];
  missing: string[];
  clarificationPrompts: string[];
  matchResult?: MatchResult;
  completenessResult?: CompletenessResult;
  requirementCheck?: RequirementCheck;
  contextFacts?: ContextFacts;
  ownerFacts?: OwnerFacts;
  llm?: LlmGeneration;
  structured?: ReturnType<typeof formatOutput>["structured"];
  analysis?: string;
  validationMessage?: string;
  agentInput: AgentInput;
  structuredReview?: StructuredReview;
  riskFlags: string[];
}

export interface RunPipelineOptions {
  skipLlm?: boolean;
}

function missingList(result: Pick<PipelineResult, "missingRequirementItems" | "missingAttachments" | "missingFields">): string[] {
  return [...new Set([...result.missingRequirementItems, ...result.missingAttachments, ...result.missingFields])];
}

async function attachLlm(
  result: PipelineResult,
  options: RunPipelineOptions,
): Promise<PipelineResult> {
  if (options.skipLlm || result.outputPath === "invalid_input" || !result.contextFacts || !result.ownerFacts) {
    if (result.contextFacts && result.ownerFacts) {
      const formatted = formatOutput({
        outputPath: result.outputPath,
        node: result.node,
        contextFacts: result.contextFacts,
        ownerFacts: result.ownerFacts,
        requirement: result.requirementCheck,
        matchResult: result.matchResult,
        completeness: result.completenessResult,
      });
      result.structured = formatted.structured;
      result.analysis = formatted.analysis;
    }
    result.structuredReview = buildStructuredReview({
      vascNo: result.orderNo,
      outputPath: result.outputPath,
      requirement: result.requirementCheck,
      matchResult: result.matchResult,
      completeness: result.completenessResult,
      llmGeneratedText: "",
      llmError: null,
      riskFlags: result.riskFlags,
    });
    return result;
  }

  const llm = await generateLlmTextSafe({
    outputPath: result.ruleOutputPath,
    agentInput: result.agentInput,
    contextFacts: result.contextFacts,
    requirement: result.requirementCheck,
    matchResult: result.matchResult,
    completeness: result.completenessResult,
    missing: result.missing,
    clarificationPrompts: result.clarificationPrompts,
  });

  let outputPath = result.ruleOutputPath;
  let node = result.node;
  let failureGate = result.failureGate;
  if (llm.error) {
    outputPath = "transfer_human";
    node = "llm-generate-sop";
    failureGate = result.failureGate || "llm-generate-sop";
  }

  const formatted = formatOutput({
    outputPath,
    node,
    contextFacts: result.contextFacts,
    ownerFacts: result.ownerFacts,
    requirement: result.requirementCheck,
    matchResult: result.matchResult,
    completeness: result.completenessResult,
    mockSop: llm.sop,
    llm,
  });

  return {
    ...result,
    outputPath,
    node,
    failureGate,
    llm,
    structured: formatted.structured,
    analysis: formatted.analysis,
    structuredReview: buildStructuredReview({
      vascNo: result.orderNo,
      outputPath,
      requirement: result.requirementCheck,
      matchResult: result.matchResult,
      completeness: result.completenessResult,
      llmGeneratedText: llm.text,
      llmError: llm.error,
      riskFlags: result.riskFlags,
    }),
  };
}

export async function runPipeline(
  detail: JsonRecord,
  options: RunPipelineOptions = {},
): Promise<PipelineResult | null> {
  const built = buildAgentInput(detail);
  if (!built) return null;

  const nodesHit: PipelineNode[] = [];
  const orderNo = built.input.vascNo;

  nodesHit.push("validate-input");
  const validation = await validateInput({ params: built.input as unknown as Record<string, unknown> });
  const validationResult = asRecord(validation.validationResult);
  if (validationResult.ok === false && asText(validationResult.reason) !== "missing_intent") {
    return {
      orderNo,
      outputPath: "invalid_input",
      ruleOutputPath: "invalid_input",
      node: "validate-input",
      nodesHit,
      failureGate: "validate-input",
      missingRequirementItems: [],
      missingAttachments: [],
      missingFields: [],
      missing: [],
      clarificationPrompts: [],
      validationMessage: asText(validationResult.message),
      agentInput: built.input,
      riskFlags: [],
    };
  }

  nodesHit.push("context-bind");
  const { contextFacts, ownerFacts } = bindContext(built.input);
  const riskFlags = checkDocuments(detail, contextFacts);

  nodesHit.push("check-requirement");
  const requirement = checkRequirement(built.input.customerIntent, contextFacts);
  if (!requirement.complete) {
    const base: PipelineResult = {
      orderNo,
      outputPath: "needs_requirement_clarification",
      ruleOutputPath: "needs_requirement_clarification",
      node: "check-requirement",
      nodesHit,
      failureGate: "check-requirement",
      missingRequirementItems: requirement.missingRequirementItems,
      missingAttachments: [],
      missingFields: [],
      missing: requirement.missingRequirementItems,
      clarificationPrompts: requirement.clarificationPrompts,
      requirementCheck: requirement,
      contextFacts,
      ownerFacts,
      agentInput: built.input,
      riskFlags,
    };
    return attachLlm(base, options);
  }

  nodesHit.push("match-template");
  const matchResult = matchTemplate(requirement.normalizedRequirement, contextFacts);
  if (!matchResult.supported) {
    const base: PipelineResult = {
      orderNo,
      outputPath: "transfer_human",
      ruleOutputPath: "transfer_human",
      node: "match-template",
      nodesHit,
      failureGate: "match-template",
      missingRequirementItems: [],
      missingAttachments: [],
      missingFields: [],
      missing: [],
      clarificationPrompts: [],
      requirementCheck: requirement,
      matchResult,
      contextFacts,
      ownerFacts,
      agentInput: built.input,
      riskFlags,
    };
    return attachLlm(base, options);
  }

  nodesHit.push("check-completeness");
  const completeness = checkCompleteness(contextFacts, matchResult);
  if (!completeness.complete) {
    const missingFields = completeness.missingFields.map((item) => item.field);
    const base: PipelineResult = {
      orderNo,
      outputPath: "needs_field_clarification",
      ruleOutputPath: "needs_field_clarification",
      node: "check-completeness",
      nodesHit,
      failureGate: "check-completeness",
      missingRequirementItems: [],
      missingAttachments: completeness.missingAttachments,
      missingFields,
      missing: missingList({
        missingRequirementItems: [],
        missingAttachments: completeness.missingAttachments,
        missingFields,
      }),
      clarificationPrompts: completeness.missingFields.map((item) => item.clarificationPrompt),
      requirementCheck: requirement,
      matchResult,
      completenessResult: completeness,
      contextFacts,
      ownerFacts,
      agentInput: built.input,
      riskFlags,
    };
    return attachLlm(base, options);
  }

  nodesHit.push("llm-generate-sop");
  nodesHit.push("format-output");
  const base: PipelineResult = {
    orderNo,
    outputPath: "sop_generated",
    ruleOutputPath: "sop_generated",
    node: "format-output",
    nodesHit,
    failureGate: "",
    missingRequirementItems: [],
    missingAttachments: [],
    missingFields: [],
    missing: [],
    clarificationPrompts: [],
    requirementCheck: requirement,
    matchResult,
    completenessResult: completeness,
    contextFacts,
    ownerFacts,
    agentInput: built.input,
    riskFlags,
  };
  return attachLlm(base, options);
}
