/**
 * L2.5 scene-level completeness: required info (LLM) + attachments (rules).
 *
 * Pipeline calls this after match-template succeeds. `check-completeness.ts`
 * is kept for attachment rules / old evals; pipeline no longer calls it
 * directly.
 */

import { checkCompleteness } from "./check-completeness.ts";
import { callChat, extractFirstJsonObject, type LlmConfig } from "./llm-client.ts";
import { findScenarioCard, type RequirementInfoField, type ScenarioCard } from "./scenario-cards.ts";
import { applyT1RequiredInfo, t1RequiredInfoMode } from "./t1-sku-relabel-check.ts";
import type { AttachmentStatus, CompletenessResult, ContextFacts, MatchResult, T1SkuRelabelResult } from "./types.ts";

export interface SceneInfoCheck {
  field: string;
  present: boolean;
  evidence: string;
}

export interface SceneCompletenessResult {
  complete: boolean;
  missingInfo: string[];
  missingAttachments: string[];
  clarificationPrompts: string[];
  sceneKey: string;
  infoChecks: SceneInfoCheck[];
  infoCheckSkipped: boolean;
  infoCheckError: string;
  attachment: CompletenessResult;
}

export interface CheckSceneCompletenessOptions {
  /** Dry-run / eval: attachments only, no info LLM. */
  skipInfoLlm?: boolean;
  llmConfig?: LlmConfig;
  /** Auditor said info is enough: skip info LLM and attachment gate. */
  skipCompleteness?: boolean;
  /** 缺附件不阻断 L4，默认 true。 */
  allowMissingAttachment?: boolean;
  /** T1 单/多 SKU 校验结果：单 SKU 去掉对应关系，多 SKU 升辨识依据为必填。 */
  t1SkuRelabel?: T1SkuRelabelResult;
}

function shortSceneName(sceneName: string): string {
  return sceneName.replace(/^[§\d.]+\s*/, "").replace(/[“”"]/g, "").trim();
}

function requiredInfoOf(card: ScenarioCard | undefined): RequirementInfoField[] {
  return (card?.requiredInfoFields || []).filter((item) => item.required && String(item.field || "").trim());
}

function stripMissingSuffix(text: string): string {
  return text.replace(/未说明$/, "").replace(/未上传$/, "").trim();
}

export function parseInfoLlmResponse(
  raw: string,
  requiredInfo: RequirementInfoField[],
): { missing: string[]; checks: SceneInfoCheck[] } {
  let parsed: { missing?: unknown; checks?: unknown } = {};
  try {
    parsed = JSON.parse(extractFirstJsonObject(raw) || raw || "{}") as {
      missing?: unknown;
      checks?: unknown;
    };
  } catch {
    parsed = {};
  }

  const byField = new Map<string, RequirementInfoField>();
  for (const item of requiredInfo) byField.set(item.field, item);

  const checks: SceneInfoCheck[] = [];
  if (Array.isArray(parsed.checks)) {
    for (const row of parsed.checks) {
      if (!row || typeof row !== "object") continue;
      const rec = row as { field?: unknown; present?: unknown; evidence?: unknown };
      const field = String(rec.field || "").trim();
      if (!field) continue;
      checks.push({
        field,
        present: Boolean(rec.present),
        evidence: String(rec.evidence || "").trim(),
      });
    }
  }

  if (!checks.length && Array.isArray(parsed.missing)) {
    const missingNames = new Set(
      parsed.missing.map((item) => stripMissingSuffix(String(item || "").trim())).filter(Boolean),
    );
    for (const item of requiredInfo) {
      const present = !missingNames.has(item.field) && ![...missingNames].some((name) => name.includes(item.field));
      checks.push({ field: item.field, present, evidence: "" });
    }
  }

  if (!checks.length) {
    for (const item of requiredInfo) {
      checks.push({ field: item.field, present: true, evidence: "" });
    }
  }

  const known = new Set(requiredInfo.map((item) => item.field));
  const missing = checks
    .filter((item) => !item.present && (!known.size || known.has(item.field) || [...known].some((f) => item.field.includes(f))))
    .map((item) => (item.field.endsWith("未说明") ? item.field : `${item.field}未说明`));

  return { missing, checks };
}

export function listUploadedAttachments(
  attachmentStatus: Record<string, AttachmentStatus> | undefined,
): string[] {
  return Object.entries(attachmentStatus || {})
    .filter(([, status]) => status === "uploaded")
    .map(([key]) => key)
    .filter(Boolean);
}

export function formatKnownOrderFacts(context: ContextFacts): string {
  const lines: string[] = [];
  const warehouse = [context.warehouseName, context.warehouseCode].filter(Boolean).join(" / ");
  if (warehouse) {
    lines.push(`- 当前单据仓库（视为「当前所在仓库」，不必再问客户）：${warehouse}`);
  }
  const ebs = [...new Set([context.eventNo, ...(context.allEventNos || [])].filter(Boolean))];
  if (ebs.length) lines.push(`- 异常单号：${ebs.join("、")}`);
  const wis = [
    ...new Set(
      [
        context.businessOrderNo,
        ...(context.allBusinessOrderNos || []),
        context.providedFields?.VAS_ATTR_REL_NWEON,
        context.providedFields?.["上架入库单号"],
      ].filter(Boolean),
    ),
  ];
  if (wis.length) lines.push(`- 单据上的入库单/上架单：${wis.join("、")}`);
  const fileNames = (context.uploadedFileNames || []).filter(Boolean);
  if (fileNames.length) lines.push(`- 已上传文件名：${fileNames.join("、")}`);
  if (!lines.length) return "";
  return `\n\n系统已掌握的单据信息（客户不必再在需求描述里写一遍，应视为已提供）：\n${lines.join("\n")}`;
}

export function buildInfoPrompt(
  customerIntent: string,
  requiredInfo: RequirementInfoField[],
  attachmentStatus: Record<string, AttachmentStatus> = {},
  contextFacts?: ContextFacts,
): string {
  const lines = requiredInfo.map((item, i) => {
    const examples = (item.examples || []).filter(Boolean).slice(0, 5).join("、");
    const exampleBit = examples ? `（例如：${examples}）` : "";
    return `${i + 1}. ${item.field}：${item.description || ""}${exampleBit}`;
  });
  const uploaded = listUploadedAttachments(attachmentStatus);
  const attachmentHint = uploaded.length
    ? `\n\n注意：客户已上传以下附件：${uploaded.join("、")}。这些附件中可能已包含数量、对应关系、操作说明等信息。如果某项必填信息可以合理推断已包含在已上传的附件中，不要判为缺失。例如：上传了「包裹和标签的对应关系」时，商品标签数量大概率在表中已列明。`
    : "";
  const knownFacts = contextFacts ? formatKnownOrderFacts(contextFacts) : "";
  return `你是增值审核完整性检查员。

已确认场景需要以下关键信息：
${lines.join("\n")}

客户需求描述：
"${customerIntent.replace(/"/g, "＂")}"
${attachmentHint}
${knownFacts}

请判断客户需求描述、已上传附件线索、以及上面「系统已掌握的单据信息」里，是否包含或可以合理推断出上述每条关键信息。
判断标准：
- 客户原文直接写了 → 有
- 客户没直接写，但可以从上下文或单据信息推断出 → 有（如：写了「整单处理」就等于说明了处理范围）
- WI 开头的单号（含「Winit订单号」「入库单号」「上架单」）= 新入库单号 / 目标入库单号
- 单据页已有仓库 = 当前所在仓库；异常单列表或正文里的 EB = 异常单号
- 按外观/漏气与否/左边右边/错装按实际SKU 区分 = 辨识方法；贴哪个 SKU 或上到哪个库位 = SKU对应关系
- 文件名里带 WI / EB 可作对应线索
- 补贴 WINIT 包裹标签的场景，标签由系统生成后下载上传，不需要客户提供标签文件。只有「关联第三方商品条码上架」等需要客户自己的条码时，才要求客户上传标签文件。
- 客户确实没提到，单据和附件里也不太可能有 → 缺失
宁可判为「有」也不要过度追问。审核员看到追问太多会觉得 AI 不好用。

输出 JSON：
{"checks":[{"field":"处理范围","present":true,"evidence":"264箱"},{"field":"辨识方法","present":false,"evidence":""}],"missing":["辨识方法未说明"]}
全部齐全时 missing 为空数组。只判断上面列出的字段。`;
}

export async function checkInfoWithLlm(
  customerIntent: string,
  requiredInfo: RequirementInfoField[],
  config: LlmConfig,
  attachmentStatus: Record<string, AttachmentStatus> = {},
  contextFacts?: ContextFacts,
): Promise<{ missing: string[]; checks: SceneInfoCheck[]; error: string }> {
  if (!requiredInfo.length) return { missing: [], checks: [], error: "" };
  try {
    const response = await callChat(
      config,
      [{ role: "user", content: buildInfoPrompt(customerIntent, requiredInfo, attachmentStatus, contextFacts) }],
      {
        jsonMode: true,
        maxTokens: 800,
        temperature: 0,
      },
    );
    const parsed = parseInfoLlmResponse(response, requiredInfo);
    return { ...parsed, error: "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      missing: [],
      checks: requiredInfo.map((item) => ({ field: item.field, present: true, evidence: "" })),
      error: message,
    };
  }
}

export function buildClarificationPrompts(
  missingInfo: string[],
  missingAttachments: string[],
  extraFieldPrompts: string[],
  card: ScenarioCard | undefined,
): string[] {
  const scene = shortSceneName(card?.sceneName || "");
  const prompts: string[] = [];
  for (const info of missingInfo) {
    const what = stripMissingSuffix(info) || info;
    prompts.push(scene ? `本场景（${scene}）需要知道${what}，请补充。` : `需要知道${what}，请补充。`);
  }
  for (const att of missingAttachments) {
    prompts.push(`请上传「${att}」。`);
  }
  for (const extra of extraFieldPrompts) {
    if (extra) prompts.push(extra);
  }
  return prompts;
}

/**
 * Merge attachment rules (checkCompleteness) with LLM info checks.
 * LLM runs only when the scene matched and skipInfoLlm is false.
 */
export async function checkSceneCompleteness(
  customerIntent: string,
  contextFacts: ContextFacts,
  matchResult: MatchResult,
  options: CheckSceneCompletenessOptions = {},
): Promise<SceneCompletenessResult> {
  if (options.skipCompleteness) {
    return {
      complete: true,
      missingInfo: [],
      missingAttachments: [],
      clarificationPrompts: [],
      sceneKey: matchResult.sceneKey,
      infoChecks: [],
      infoCheckSkipped: true,
      infoCheckError: "",
      attachment: {
        applicable: true,
        complete: true,
        missingAttachments: [],
        missingFields: [],
        providedCount: 0,
        totalRequired: 0,
        sceneKey: matchResult.sceneKey,
      },
    };
  }
  const attachment = checkCompleteness(contextFacts, matchResult);
  const card = findScenarioCard(matchResult.sceneKey);
  const requiredInfo = applyT1RequiredInfo(
    requiredInfoOf(card),
    card?.optionalInfoFields || [],
    t1RequiredInfoMode(options.t1SkuRelabel),
  );
  const missingAttachments = [...attachment.missingAttachments];
  const extraFieldPrompts = attachment.missingFields
    .filter((item) => !missingAttachments.includes(item.field))
    .map((item) => item.clarificationPrompt);

  let missingInfo: string[] = [];
  let infoChecks: SceneInfoCheck[] = requiredInfo.map((item) => ({
    field: item.field,
    present: true,
    evidence: "",
  }));
  let infoCheckSkipped = true;
  let infoCheckError = "";

  if (!options.skipInfoLlm && requiredInfo.length && options.llmConfig) {
    infoCheckSkipped = false;
    const judged = await checkInfoWithLlm(
      customerIntent,
      requiredInfo,
      options.llmConfig,
      contextFacts.attachmentStatus,
      contextFacts,
    );
    missingInfo = judged.missing;
    infoChecks = judged.checks;
    infoCheckError = judged.error;
  }

  const allowMissingAttachment = options.allowMissingAttachment !== false;
  const requirementInfoComplete = missingInfo.length === 0;
  const complete = requirementInfoComplete && (attachment.complete || allowMissingAttachment);
  return {
    complete,
    missingInfo,
    missingAttachments,
    clarificationPrompts: buildClarificationPrompts(
      missingInfo,
      allowMissingAttachment ? [] : missingAttachments,
      extraFieldPrompts,
      card,
    ),
    sceneKey: matchResult.sceneKey,
    infoChecks,
    infoCheckSkipped,
    infoCheckError,
    attachment,
  };
}

export function toCompletenessResult(scene: SceneCompletenessResult): CompletenessResult {
  return {
    ...scene.attachment,
    complete: scene.complete,
    missingAttachments: scene.missingAttachments,
    missingInfo: scene.missingInfo,
    infoChecks: scene.infoChecks,
    infoCheckSkipped: scene.infoCheckSkipped,
    infoCheckError: scene.infoCheckError,
  };
}
