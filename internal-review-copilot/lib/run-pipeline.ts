import { main as validateInput } from "../../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts";
import { bindContext } from "./context-bind.ts";
import { checkRequirement } from "./check-requirement.ts";
import { checkSceneCompleteness, toCompletenessResult, type SceneCompletenessResult } from "./check-scene-completeness.ts";
import { checkDocuments } from "./check-documents.ts";
import { buildStructuredReview, formatOutput } from "./format-output.ts";
import { generateLlmTextSafe } from "./generate-text.ts";
import { resolveLlmConfig } from "./llm-client.ts";
import { matchTemplate, matchTemplateWithLlm } from "./match-template.ts";
import { asArray, asRecord, asText, buildAgentInput } from "./oms-adapter.ts";
import { isOutboundOrder } from "./order-category.ts";
import { applyOutboundUnmatchedLeaveEmpty } from "./missing-oms-scene.ts";
import { enrichPackageInfoKnownFacts, type PackageInfoFactsDeps } from "./package-info-facts.ts";
import { findScenarioCard } from "./scenario-cards.ts";
import { checkSkuConsistencySafe } from "./sku-consistency-check.ts";
import { checkT1SkuRelabelSafe, type T1SkuRelabelDeps } from "./t1-sku-relabel-check.ts";
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
  SkuCheckResult,
  StructuredReview,
  T1SkuRelabelResult,
} from "./types.ts";

export function isSopGenerateFailure(result: Pick<PipelineResult, "failureGate">): boolean {
  return result.failureGate === "llm-generate-sop";
}

export function failureTypeOf(
  result: Pick<PipelineResult, "failureGate" | "outputPath" | "failureType">,
): "llm-generate-sop" | "scene_uncertain" | "unexpected_error" | "" {
  if (result.failureType === "unexpected_error") return "unexpected_error";
  if (result.failureGate === "llm-generate-sop") return "llm-generate-sop";
  if (result.outputPath === "transfer_human") return "scene_uncertain";
  return "";
}

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
  sceneCompletenessResult?: SceneCompletenessResult;
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
  failureType?: "llm-generate-sop" | "scene_uncertain" | "unexpected_error" | "";
  skuCheckResult?: SkuCheckResult;
  t1SkuRelabelResult?: T1SkuRelabelResult;
}

export interface PipelineTraceEvent {
  node: PipelineNode;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  input: unknown;
  output?: unknown;
  error?: string;
}

export interface RunPipelineOptions {
  skipLlm?: boolean;
  /** Phase 2: use rule prefilter + LLM scene classifier in match-template. */
  sceneLlm?: boolean;
  /** 1 = v1 旧 prompt；2 = v2 异常预查；3 = v3 自主 tool calling（默认 2）. */
  sceneLlmVersion?: 1 | 2 | 3;
  /** Default true when sceneLlm. False = no BM25 few-shot (A/B run A). */
  ragEnabled?: boolean;
  /** Skip check-requirement + match-template; force this scene into L2.5 completeness. */
  overrideScene?: string;
  /** Auditor clicked「信息已齐全」: skip L2.5 and generate SOP for the current scene. */
  skipCompleteness?: boolean;
  /** 附件缺时继续生成 SOP（占位符），默认 true。 */
  allowMissingAttachment?: boolean;
  /** 审核员对上一版 SOP 的修改意见；只改 SOP 正文，不改场景。 */
  sopEditInstruction?: string;
  previousSop?: string;
  onDelta?: (chunk: string) => void;
  /** T1 商品码校验可注入（单测 mock DWS）。 */
  t1SkuRelabelDeps?: T1SkuRelabelDeps;
  /** Read-only OMS package facts for inbound WI quantity context. Fail-closed when absent or unresolved. */
  packageInfoFactsDeps?: PackageInfoFactsDeps;
  /** Optional local/debug trace collector. Not used by production callers unless explicitly supplied. */
  onTrace?: (event: PipelineTraceEvent) => void | Promise<void>;
}

function snapshot(value: unknown): unknown {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

async function emitTrace(
  options: RunPipelineOptions,
  event: Omit<PipelineTraceEvent, "input" | "output"> & { input: unknown; output?: unknown },
): Promise<void> {
  if (!options.onTrace) return;
  await options.onTrace({
    ...event,
    input: snapshot(event.input),
    output: snapshot(event.output),
  });
}

async function traceNode<T>(
  options: RunPipelineOptions,
  node: PipelineNode,
  input: unknown,
  run: () => T | Promise<T>,
): Promise<T> {
  const start = Date.now();
  const startedAt = new Date(start).toISOString();
  try {
    const output = await run();
    const end = Date.now();
    await emitTrace(options, {
      node,
      startedAt,
      endedAt: new Date(end).toISOString(),
      durationMs: end - start,
      input,
      output,
    });
    return output;
  } catch (err) {
    const end = Date.now();
    await emitTrace(options, {
      node,
      startedAt,
      endedAt: new Date(end).toISOString(),
      durationMs: end - start,
      input,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

function missingList(result: Pick<PipelineResult, "missingRequirementItems" | "missingAttachments" | "missingFields">): string[] {
  return [...new Set([...result.missingRequirementItems, ...result.missingAttachments, ...result.missingFields])];
}

function takeTopScene(match: MatchResult): MatchResult {
  if (match.sceneKey && match.sceneKey !== "unsupported") return match;
  const first = match.topK?.[0] || match.candidates?.[0];
  if (!first?.sceneKey || first.sceneKey === "unsupported") return match;
  return {
    ...match,
    sceneKey: first.sceneKey,
    scenarioId: first.sceneKey,
    scenarioName: first.sceneName || match.scenarioName,
    matched: true,
    score: first.score || match.score,
    confidence: first.confidence || match.confidence,
    candidateTemplate: first.sceneName || match.candidateTemplate,
  };
}

function hasUsableScene(match: MatchResult): boolean {
  return Boolean(match.sceneKey && match.sceneKey !== "unsupported");
}

async function attachLlm(
  result: PipelineResult,
  options: RunPipelineOptions,
): Promise<PipelineResult> {
  if (options.skipLlm || result.outputPath === "invalid_input" || !result.contextFacts || !result.ownerFacts) {
    if (result.contextFacts && result.ownerFacts) {
      const formatInput = {
        outputPath: result.outputPath,
        node: result.node,
        contextFacts: result.contextFacts,
        ownerFacts: result.ownerFacts,
        requirement: result.requirementCheck,
        matchResult: result.matchResult,
        completeness: result.completenessResult,
      };
      const formatted = await traceNode(options, "format-output", formatInput, () => formatOutput(formatInput));
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

  const llmInput = {
    outputPath: result.ruleOutputPath,
    agentInput: result.agentInput,
    contextFacts: result.contextFacts,
    requirement: result.requirementCheck,
    matchResult: result.matchResult,
    completeness: result.completenessResult,
    missing: result.missing,
    clarificationPrompts: result.clarificationPrompts,
    missingAttachments: result.missingAttachments,
    skuCheckResult: result.skuCheckResult,
    t1SkuRelabelResult: result.t1SkuRelabelResult,
    sopEditInstruction: options.sopEditInstruction,
    previousSop: options.previousSop,
    onDelta: options.onDelta,
  };
  const llm = await traceNode(options, "llm-generate-sop", llmInput, () => generateLlmTextSafe(llmInput));

  let outputPath = result.ruleOutputPath;
  let node = result.node;
  let failureGate = result.failureGate;
  if (llm.error && result.ruleOutputPath === "sop_generated") {
    node = "llm-generate-sop";
    failureGate = "llm-generate-sop";
  }

  const formatInput = {
    outputPath,
    node,
    contextFacts: result.contextFacts,
    ownerFacts: result.ownerFacts,
    requirement: result.requirementCheck,
    matchResult: result.matchResult,
    completeness: result.completenessResult,
    mockSop: llm.sop,
    llm,
  };
  const formatted = await traceNode(options, "format-output", formatInput, () => formatOutput(formatInput));

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

function emptyAgentInput(orderNo: string): AgentInput {
  return {
    mode: "internal_review_copilot",
    vascNo: orderNo,
    query: "",
    customerIntent: "",
    serviceAtom: "",
    sceneKey: "",
    sceneName: "",
    sceneCode: "",
    recommendedVasc: { vascCode: "", vascName: "" },
    pageContext: {
      entryScene: "INTERNAL_REVIEW",
      vaSource: "",
      warehouseCode: "",
      warehouseName: "",
      customerCode: "",
      customerName: "",
      eventNo: "",
      businessOrderNo: "",
      attachmentStatus: {},
    },
    providedFields: {},
    omsFacts: {
      customerRequirementDescription: "",
      requirementBackground: "",
      fieldValues: {},
      attachmentStatus: {},
      uploadedFiles: [],
    },
    responsiblePeople: { submittedBy: "", customerService: [], sales: [], reviewers: [] },
    conversationEvidence: [],
    enrichedContext: {},
  };
}

export async function runPipeline(
  detail: JsonRecord,
  options: RunPipelineOptions = {},
): Promise<PipelineResult | null> {
  let built: ReturnType<typeof buildAgentInput> = null;
  try {
  built = buildAgentInput(detail);
  if (!built) return null;

  const nodesHit: PipelineNode[] = [];
  const orderNo = built.input.vascNo;

  nodesHit.push("validate-input");
  const validateInputArgs = { params: built.input as unknown as Record<string, unknown> };
  const validation = await traceNode(options, "validate-input", validateInputArgs, () => validateInput(validateInputArgs));
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
  const contextBound = await traceNode(
    options,
    "context-bind",
    {
      agentInputBeforeEnrichment: built.input,
      detail,
      packageInfoFactsDepsEnabled: Boolean(options.packageInfoFactsDeps),
    },
    async () => {
      await enrichPackageInfoKnownFacts(built.input, options.packageInfoFactsDeps);
      const bound = bindContext(built.input);
      const documentRiskFlags = checkDocuments(detail, bound.contextFacts);
      return { ...bound, riskFlags: documentRiskFlags, agentInputAfterEnrichment: built.input };
    },
  );
  const { contextFacts, ownerFacts, riskFlags } = contextBound;

  const overrideKey = (options.overrideScene || "").trim();
  let requirement = checkRequirement(built.input.customerIntent, contextFacts);
  if (!overrideKey) {
    nodesHit.push("check-requirement");
    requirement = await traceNode(
      options,
      "check-requirement",
      { customerIntent: built.input.customerIntent, contextFacts },
      () => requirement,
    );
    if (!requirement.complete) {
      if (requirement.insufficientAuditFacts) {
        const base: PipelineResult = {
          orderNo,
          outputPath: "transfer_human",
          ruleOutputPath: "transfer_human",
          node: "check-requirement",
          nodesHit,
          failureGate: "check-requirement",
          missingRequirementItems: requirement.missingRequirementItems,
          missingAttachments: [],
          missingFields: [],
          missing: requirement.missingRequirementItems,
          clarificationPrompts: [],
          requirementCheck: requirement,
          contextFacts,
          ownerFacts,
          agentInput: built.input,
          riskFlags: [...riskFlags, "no_rd_field_insufficient_facts"],
        };
        return attachLlm(base, options);
      }
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
  matchResult = await traceNode(
    options,
    "match-template",
    {
      normalizedRequirement: requirement.normalizedRequirement,
      contextFacts,
      sceneLlm: options.sceneLlm === true,
      sceneLlmVersion: options.sceneLlmVersion === 1 ? 1 : options.sceneLlmVersion === 3 ? 3 : 2,
      ragEnabled: options.ragEnabled,
    },
    async () => {
      if (options.sceneLlm === true) {
    try {
      const llmConfig = resolveLlmConfig();
      const version =
        options.sceneLlmVersion === 1 ? 1 : options.sceneLlmVersion === 3 ? 3 : 2;
      return matchTemplateWithLlm(
        requirement.normalizedRequirement,
        contextFacts,
        llmConfig,
        version,
        { ragEnabled: options.ragEnabled },
      );
    } catch (err) {
      const fallback = matchTemplate(requirement.normalizedRequirement, contextFacts);
      const msg = err instanceof Error ? err.message : String(err);
      return {
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
      }
      return matchTemplate(requirement.normalizedRequirement, contextFacts);
    },
  );
  }
  matchResult = takeTopScene(matchResult);
  matchResult = applyOutboundUnmatchedLeaveEmpty(matchResult, contextFacts);
  if (!hasUsableScene(matchResult)) {
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
      contextFacts,
      ownerFacts,
      agentInput: built.input,
      riskFlags: [
        ...riskFlags,
        "unmatched_scene_sop",
        ...(isOutboundOrder(contextFacts) ? ["outbound_unmatched_leave_empty"] : []),
      ],
    };
    return attachLlm(base, options);
  }

  nodesHit.push("sku-consistency-check");
  const skuCheckInput = {
    input: built.input,
    matchResult,
    contextFacts,
    events: asArray(detail.events).map(asRecord),
  };
  const skuCheckResult = await traceNode(options, "sku-consistency-check", skuCheckInput, () =>
    checkSkuConsistencySafe(skuCheckInput),
  );

  nodesHit.push("t1-sku-relabel-check");
  const t1SkuRelabelInput = {
    input: built.input,
    matchResult,
    contextFacts,
    deps: options.t1SkuRelabelDeps,
  };
  const t1SkuRelabelResult = await traceNode(options, "t1-sku-relabel-check", t1SkuRelabelInput, () =>
    checkT1SkuRelabelSafe(t1SkuRelabelInput),
  );
  if (!options.skipCompleteness && t1SkuRelabelResult.verdict === "single_mismatch_bounce") {
    const bounce = t1SkuRelabelResult.bouncePrompt || "请销售/客服核对 SKU 是否填错，打回客户重新提交。";
    const base: PipelineResult = {
      orderNo,
      outputPath: "needs_requirement_clarification",
      ruleOutputPath: "needs_requirement_clarification",
      node: "t1-sku-relabel-check",
      nodesHit,
      failureGate: "check-completeness",
      missingRequirementItems: [bounce],
      missingAttachments: [],
      missingFields: [],
      missing: [bounce],
      clarificationPrompts: [bounce],
      requirementCheck: requirement,
      matchResult,
      contextFacts,
      ownerFacts,
      agentInput: built.input,
      riskFlags,
      skuCheckResult,
      t1SkuRelabelResult,
    };
    return attachLlm(base, options);
  }

  nodesHit.push("check-scene-completeness");
  let infoLlmConfig: ReturnType<typeof resolveLlmConfig> | undefined;
  if (!options.skipLlm) {
    try {
      infoLlmConfig = resolveLlmConfig();
    } catch {
      infoLlmConfig = undefined;
    }
  }
  const sceneCompletenessInput = {
    customerIntent: built.input.customerIntent,
    contextFacts,
    matchResult,
    options: {
      skipInfoLlm: options.skipLlm || !infoLlmConfig || options.skipCompleteness,
      llmConfig: infoLlmConfig,
      skipCompleteness: options.skipCompleteness,
      allowMissingAttachment: options.allowMissingAttachment !== false,
      t1SkuRelabel: t1SkuRelabelResult,
    },
  };
  const sceneCompleteness = await traceNode(options, "check-scene-completeness", sceneCompletenessInput, () =>
    checkSceneCompleteness(
      sceneCompletenessInput.customerIntent,
      sceneCompletenessInput.contextFacts,
      sceneCompletenessInput.matchResult,
      sceneCompletenessInput.options,
    ),
  );
  const completeness = toCompletenessResult(sceneCompleteness);
  if (!completeness.complete) {
    const missingFields = completeness.missingFields.map((item) => item.field);
    const missingInfo = sceneCompleteness.missingInfo;
    const base: PipelineResult = {
      orderNo,
      outputPath: "needs_field_clarification",
      ruleOutputPath: "needs_field_clarification",
      node: "check-scene-completeness",
      nodesHit,
      failureGate: "check-completeness",
      missingRequirementItems: missingInfo,
      missingAttachments: sceneCompleteness.missingAttachments,
      missingFields,
      missing: missingList({
        missingRequirementItems: missingInfo,
        missingAttachments: [],
        missingFields,
      }),
      clarificationPrompts: sceneCompleteness.clarificationPrompts,
      requirementCheck: requirement,
      matchResult,
      completenessResult: completeness,
      sceneCompletenessResult: sceneCompleteness,
      contextFacts,
      ownerFacts,
      agentInput: built.input,
      riskFlags,
      skuCheckResult,
      t1SkuRelabelResult,
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
    missingAttachments: sceneCompleteness.missingAttachments,
    missingFields: [],
    missing: sceneCompleteness.missingAttachments,
    clarificationPrompts: sceneCompleteness.missingAttachments.map((item) => `请上传「${item}」。`),
    requirementCheck: requirement,
    matchResult,
    completenessResult: completeness,
    sceneCompletenessResult: sceneCompleteness,
    contextFacts,
    ownerFacts,
    agentInput: built.input,
    riskFlags,
    skuCheckResult,
    t1SkuRelabelResult,
  };
  return attachLlm(base, options);
  } catch (err) {
    const orderNo = built?.input.vascNo || asText(detail?.orderNo) || "unknown";
    console.error(`pipeline unexpected error ${orderNo}: ${err instanceof Error ? err.message : err}`);
    return {
      orderNo,
      outputPath: "transfer_human",
      ruleOutputPath: "transfer_human",
      node: "validate-input",
      nodesHit: [],
      failureGate: "validate-input",
      failureType: "unexpected_error",
      missingRequirementItems: [],
      missingAttachments: [],
      missingFields: [],
      missing: [],
      clarificationPrompts: [],
      agentInput: built?.input || emptyAgentInput(orderNo),
      riskFlags: [],
    };
  }
}
