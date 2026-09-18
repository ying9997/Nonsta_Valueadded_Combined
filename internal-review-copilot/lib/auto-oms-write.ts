import { extractSopSections } from "./sop-sections.ts";
import { asText } from "./oms-adapter.ts";
import {
  DEFAULT_UNBLOCK_WAREHOUSE_ACTIONS,
  isOmsWriteEnabled,
  resolveSceneOverviewCode,
  writeDraft,
  type DraftWriteInput,
  type DraftWriteResult,
} from "./oms-draft-write.ts";
import type { PipelineResult } from "./run-pipeline.ts";
import type { LlmSopDraft } from "./types.ts";

function asSop(result: PipelineResult): LlmSopDraft | undefined {
  const sop = result.llm?.sop;
  if (!sop || sop.mocked) return undefined;
  return sop;
}

export function draftInputFromPipeline(result: PipelineResult): DraftWriteInput {
  const sceneKey = result.matchResult?.sceneKey || result.contextFacts?.sceneKey || "";
  const sopDraft = asSop(result);
  const sections = extractSopSections({
    llmSop: sopDraft,
    aiGeneratedText: result.llm?.text || result.analysis || "",
  });
  const sceneCode = resolveSceneOverviewCode(sceneKey);
  return {
    orderNo: result.orderNo,
    sceneOverviewCode: sceneCode.code,
    sop: sopDraft?.warehouseSop || sections.operationSteps,
    aiRequirementDescription: sopDraft?.requirementDescription || sections.requirementDescription,
    aiRequirementBackground: sopDraft?.requirementBackground || sections.requirementBackground,
    extractedWiNumbers: sopDraft?.extractedWiNumbers || [],
    warehouseActions: DEFAULT_UNBLOCK_WAREHOUSE_ACTIONS,
    comparisonMeta: {
      sceneKey,
      sceneName: result.matchResult?.scenarioName || result.contextFacts?.sceneName || "",
      missingAttachments: result.missingAttachments || [],
      degraded: Boolean(sopDraft?.degraded),
      confidence: asText(result.matchResult?.confidence),
    },
    dryRun: !isOmsWriteEnabled(),
  };
}

export async function writePipelineDraft(result: PipelineResult): Promise<DraftWriteResult> {
  return writeDraft({ ...draftInputFromPipeline(result), dryRun: !isOmsWriteEnabled() });
}
