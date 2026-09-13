import { ATTACHMENT_BY_FILE_TYPE } from "./oms-adapter.ts";
import { findScenarioCard } from "./scenario-cards.ts";
import type { CompletenessResult, ContextFacts, MatchResult } from "./types.ts";

/** @deprecated Prefer scenario-card requiredFieldKeys. Kept for smoke scripts that import the name. */
export const F001_REQUIRED_ATTACHMENTS = ["标签文件"] as const;

/** Scenes that also require WI / VAS_ATTR_REL_NWEON binding (≥70% in 20260908 analysis). */
const SCENES_REQUIRE_WI = new Set([
  "inbound_label_identify",
  "inbound_package_exception_relabel_shelving",
]);

const FIELD_LABELS: Record<string, string> = {
  VAS_ATTR_REL_NWEON: "上架入库单号",
  NSVASTN: "非标增值来源单号",
  CEO_SOA: "CEO审批截图",
};

function resolveFieldLabel(fieldKeyOrName: string): string {
  return ATTACHMENT_BY_FILE_TYPE[fieldKeyOrName] || FIELD_LABELS[fieldKeyOrName] || fieldKeyOrName;
}

function isAttachmentKey(key: string): boolean {
  return Boolean(ATTACHMENT_BY_FILE_TYPE[key]);
}

function fieldProvided(context: ContextFacts, key: string): boolean {
  const attachLabel = ATTACHMENT_BY_FILE_TYPE[key];
  if (attachLabel) return context.attachmentStatus[attachLabel] === "uploaded";
  const direct = (context.providedFields[key] || "").trim();
  if (direct) return true;
  if (key === "VAS_ATTR_REL_NWEON") {
    return context.allBusinessOrderNos.length > 0 || Boolean((context.providedFields.VAS_ATTR_REL_NWEON || "").trim());
  }
  return false;
}

/**
 * Scene-specific field/attachment check after match-template auto-runs a
 * card with status=supported. Reads requiredFieldKeys from the scenario card.
 * Empty requiredFieldKeys → applicable and complete (pass-through).
 */
export function checkCompleteness(context: ContextFacts, matchResult: MatchResult): CompletenessResult {
  if (!matchResult.supported || !matchResult.sceneKey) {
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

  const card = findScenarioCard(matchResult.sceneKey);
  // Auditor override can mark match.supported even when the catalog card is
  // pending_evidence. Empty requiredFieldKeys must still pass (no attachment gate).
  if (!card) {
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
  if (card.status !== "supported") {
    const policyPeek = card.requiredAttachmentPolicy;
    const peekKeys =
      (policyPeek as { requiredFieldKeys?: string[] }).requiredFieldKeys ??
      (policyPeek as { simulatedRequiredFieldKeys?: string[] }).simulatedRequiredFieldKeys ??
      [];
    if (!peekKeys.length && !SCENES_REQUIRE_WI.has(matchResult.sceneKey)) {
      return {
        applicable: true,
        complete: true,
        missingAttachments: [],
        missingFields: [],
        providedCount: 0,
        totalRequired: 0,
        sceneKey: matchResult.sceneKey,
      };
    }
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

  const policy = card.requiredAttachmentPolicy;
  const requiredKeys =
    (policy as { requiredFieldKeys?: string[] }).requiredFieldKeys ??
    (policy as { simulatedRequiredFieldKeys?: string[] }).simulatedRequiredFieldKeys ??
    [];

  const missingAttachments: string[] = [];
  const missingFields: CompletenessResult["missingFields"] = [];
  for (const key of requiredKeys) {
    if (fieldProvided(context, key)) continue;
    const label = resolveFieldLabel(key);
    if (isAttachmentKey(key)) {
      missingAttachments.push(label);
      missingFields.push({
        field: label,
        required: true,
        clarificationPrompt: `请上传「${label}」后再生成 SOP。`,
      });
    } else {
      missingFields.push({
        field: label,
        required: true,
        clarificationPrompt: `请补充「${label}」后再生成 SOP。`,
      });
    }
  }

  let wiRequired = 0;
  let wiProvided = 0;
  const nweonAlready = requiredKeys.includes("VAS_ATTR_REL_NWEON");
  if (SCENES_REQUIRE_WI.has(matchResult.sceneKey) && !nweonAlready) {
    wiRequired = 1;
    const wiBound =
      context.allBusinessOrderNos.length > 0 || Boolean(context.providedFields.VAS_ATTR_REL_NWEON);
    if (wiBound) {
      wiProvided = 1;
    } else {
      missingFields.push({
        field: "上架入库单号",
        required: true,
        clarificationPrompt: "请补充上架入库单号（WI）。",
      });
    }
  }

  const totalRequired = requiredKeys.length + wiRequired;
  const providedCount = requiredKeys.filter((key) => fieldProvided(context, key)).length + wiProvided;

  // Empty required list and no WI requirement → complete.
  if (totalRequired === 0) {
    return {
      applicable: true,
      complete: true,
      missingAttachments: [],
      missingFields: [],
      providedCount: 0,
      totalRequired: 0,
      sceneKey: matchResult.sceneKey,
    };
  }

  return {
    applicable: true,
    complete: missingFields.length === 0,
    missingAttachments,
    missingFields,
    providedCount,
    totalRequired,
    sceneKey: matchResult.sceneKey,
  };
}
