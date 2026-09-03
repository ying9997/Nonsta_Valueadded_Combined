import type { CompletenessResult, ContextFacts, MatchResult } from "./types.ts";

/** Simulated F-001 required attachments. Source: F-001-SIMULATED-BUSINESS-RULES.md */
export const F001_REQUIRED_ATTACHMENTS = ["操作说明附件", "商品和标签的对应关系", "标签文件"] as const;

/**
 * Scene-specific field/attachment check.
 * Only after match-template v0.2 auto-runs a card with status=supported (F-001).
 * A/B are candidate/pending: do not enter formal attachment validation here.
 */
export function checkCompleteness(context: ContextFacts, matchResult: MatchResult): CompletenessResult {
  if (!matchResult.supported || matchResult.sceneKey !== "inbound_label_identify") {
    return {
      applicable: false,
      complete: false,
      missingAttachments: [],
      missingFields: [],
      providedCount: 0,
      totalRequired: 0,
      sceneKey: matchResult.sceneKey,
    };
  }

  const missingAttachments = F001_REQUIRED_ATTACHMENTS.filter(
    (field) => context.attachmentStatus[field] !== "uploaded",
  );
  const missingFields: CompletenessResult["missingFields"] = missingAttachments.map((field) => ({
    field,
    required: true,
    clarificationPrompt: `请上传「${field}」后再生成 SOP。`,
  }));

  const wiBound =
    context.allBusinessOrderNos.length > 0 || Boolean(context.providedFields.VAS_ATTR_REL_NWEON);
  if (!wiBound) {
    missingFields.push({
      field: "上架入库单号",
      required: true,
      clarificationPrompt: "请补充上架入库单号（WI）。",
    });
  }

  return {
    applicable: true,
    complete: missingFields.length === 0,
    missingAttachments,
    missingFields,
    providedCount: F001_REQUIRED_ATTACHMENTS.length - missingAttachments.length + (wiBound ? 1 : 0),
    totalRequired: F001_REQUIRED_ATTACHMENTS.length + 1,
    sceneKey: "inbound_label_identify",
  };
}
