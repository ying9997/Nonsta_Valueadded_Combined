import { main as validateInput } from "../../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts";
import { bindContext } from "./context-bind.ts";
import { checkRequirement } from "./check-requirement.ts";
import { checkCompleteness } from "./check-completeness.ts";
import { checkDocuments } from "./check-documents.ts";
import { buildStructuredReview, formatOutput } from "./format-output.ts";
import { generateLlmTextSafe } from "./generate-text.ts";
import { resolveLlmConfig } from "./llm-client.ts";
import { matchTemplate, matchTemplateWithLlm } from "./match-template.ts";
import { asRecord, asText, buildAgentInput } from "./oms-adapter.ts";
import { findScenarioCard } from "./scenario-cards.ts";
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
  /** Phase 2: use rule prefilter + LLM scene classifier in match-template. */
  sceneLlm?: boolean;
  /** 1 = v1 旧 prompt；2 = v2 异常预查；3 = v3 自主 tool calling（默认 2）. */
  sceneLlmVersion?: 1 | 2 | 3;
  /** Default true when sceneLlm. False = no BM25 few-shot (A/B run A). */
  ragEnabled?: boolean;
  /** Skip check-requirement + match-template; force this scene into check-completeness. */
  overrideScene?: string;
  /** 审核员对上一版 SOP 的修改意见；只改 SOP 正文，不改场景。 */
  sopEditInstruction?: string;
  previousSop?: string;
  onDelta?: (chunk: string) => void;
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
    sopEditInstruction: options.sopEditInstruction,
    previousSop: options.previousSop,
    onDelta: options.onDelta,
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

  const overrideKey = (options.overrideScene || "").trim();
  let requirement = checkRequirement(built.input.customerIntent, contextFacts);
  if (!overrideKey) {
    nodesHit.push("check-requirement");
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
  } else {
    requirement = {
      ...requirement,
      complete: true,
      missingRequirementItems: [],
      clarificationPrompts: [],
    };
  }

  let matchResult: MatchResult;
  if (overrideKey) {
    const card = findScenarioCard(overrideKey);
    if (!card) {
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
        matchResult: {
          matched: false,
          supported: false,
          category: "C",
          sceneKey: overrideKey,
          scenarioId: overrideKey,
          scenarioName: "",
          confidence: "",
          reason: "override_scene_not_found",
          score: 0,
          candidateTemplate: "",
          decision: "unsupported",
          confidenceScore: 0,
          candidates: [],
          topK: [],
        },
        contextFacts,
        ownerFacts,
        agentInput: built.input,
        riskFlags,
      };
      return attachLlm(base, options);
    }
    matchResult = {
      matched: true,
      supported: true,
      category: "B",
      sceneKey: card.sceneKey,
      scenarioId: card.sceneKey,
      scenarioName: card.sceneName,
      confidence: "high",
      reason: "override_by_auditor",
      score: 100,
      candidateTemplate: card.sceneName,
      decision: "supported",
      confidenceScore: 1,
      candidates: [],
      topK: [],
    };
  } else {
  nodesHit.push("match-template");
  // sceneLlm=true → 规则+LLM；skipLlm 只控制 SOP 生成，不强制关掉显式 sceneLlm。
  if (options.sceneLlm === true) {
    try {
      const llmConfig = resolveLlmConfig();
      const version =
        options.sceneLlmVersion === 1 ? 1 : options.sceneLlmVersion === 3 ? 3 : 2;
      matchResult = await matchTemplateWithLlm(
        requirement.normalizedRequirement,
        contextFacts,
        llmConfig,
        version,
        { ragEnabled: options.ragEnabled },
      );
    } catch (err) {
      const fallback = matchTemplate(requirement.normalizedRequirement, contextFacts);
      const msg = err instanceof Error ? err.message : String(err);
      matchResult = {
        ...fallback,
        llmUsed: false,
        llmClassification: {
          matchedScene: "unsupported",
          confidence: "low",
          reasoning: `sceneLlm 初始化失败，降级纯规则: ${msg}`,
          extractedActions: [],
          alternativeScenes: [],
          ambiguous: true,
        },
      };
    }
  } else {
    matchResult = matchTemplate(requirement.normalizedRequirement, contextFacts);
  }
  }
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
