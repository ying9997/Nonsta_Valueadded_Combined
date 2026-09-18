/**
 * Phase 2: LLM scene classifier for inbound nonstandard VAS.
 * - classifySceneV1: Phase 2 v1（仅需求+上下文，无异常单详情）
 * - classifyScene: Phase 2 v2（含异常单详情 + 规则 A/B/C/D）
 */

import {
  callChat,
  extractFirstJsonObject,
  parseJsonishObject,
  type LlmConfig,
} from "./llm-client.ts";
import {
  formatExceptionDetails,
  type ExceptionInfo,
} from "./exception-lookup.ts";
import { findScenarioCard, loadScenarioCards, type ScenarioCard } from "./scenario-cards.ts";
import type { ContextFacts } from "./types.ts";
import {
  formatFewShotBlock,
  isRagEnabled,
  retrieveSimilarCases,
  toMatchRetrieved,
  type RetrievedCase,
} from "./case-retriever.ts";

export const KNOWN_SCENE_KEYS = [
  "inbound_package_barcode_batch_relabel",
  "inbound_photo_hold",
  "inbound_third_party_merchandise_barcode",
  "inbound_label_identify",
  "inbound_package_exception_relabel_shelving",
] as const;

export type KnownSceneKey = (typeof KNOWN_SCENE_KEYS)[number];

export const SCENE_KEY_TO_OMS_NAME: Record<string, string> = {
  inbound_package_barcode_batch_relabel:
    '【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架',
  inbound_photo_hold: "【入库】指定商品拍照暂存",
  inbound_third_party_merchandise_barcode: "【入库】关联第三方商品条码上架",
  inbound_label_identify: "【入库】尺重/标签辨识后换标上架",
  inbound_package_exception_relabel_shelving: "【入库】包裹类异常换商品标签上架",
};

export interface ClassifySceneOptions {
  /** Scheme B: only these cards go into the prompt. */
  candidateCards?: ScenarioCard[];
  /** Default true. Set false for A/B run without few-shot. */
  ragEnabled?: boolean;
  ragCategory?: "inbound" | "instock";
  excludeCaseIds?: string[];
}

export function resolveCandidateCards(candidateCards?: ScenarioCard[]): ScenarioCard[] {
  if (candidateCards?.length) return candidateCards;
  const loaded = loadScenarioCards();
  if (loaded.length) return loaded;
  return [];
}

export function allowedSceneKeys(candidateCards?: ScenarioCard[]): string[] {
  const cards = resolveCandidateCards(candidateCards);
  if (cards.length) return cards.map((card) => card.sceneKey);
  return [...KNOWN_SCENE_KEYS];
}

export function sceneNameOf(sceneKey: string): string {
  const card = findScenarioCard(sceneKey);
  if (card?.sceneName) return card.sceneName;
  return SCENE_KEY_TO_OMS_NAME[sceneKey] || sceneKey;
}

/** Scheme A = compact (name + top 3 strong). Scheme B top-10 uses mode=full. */
export function buildSceneListPrompt(
  cards: ScenarioCard[],
  mode: "compact" | "full" = "compact",
): string {
  return cards
    .map((card, i) => {
      const signals = (card.positiveSignals?.strong || []).slice(0, mode === "full" ? 5 : 3).join("、");
      const line = `${i + 1}. ${card.sceneKey} — ${card.sceneName}\n   核心特征：${signals || "（无）"}`;
      if (mode === "compact") return line;
      const hard = (card.negativeSignals?.hard || []).slice(0, 3).join("、");
      const bounds = (card.boundaryRules || []).slice(0, 2).join("；");
      return `${line}\n   负向：${hard || "（无）"}\n   边界：${bounds || "（无）"}`;
    })
    .join("\n");
}

function fallbackCardsFromKnown(): ScenarioCard[] {
  return KNOWN_SCENE_KEYS.map((sceneKey) => {
    const loaded = findScenarioCard(sceneKey);
    if (loaded) return loaded;
    return {
      sceneKey,
      sceneName: SCENE_KEY_TO_OMS_NAME[sceneKey] || sceneKey,
      status: "supported",
      category: "inbound",
      sourceRefs: [],
      positiveSignals: { strong: [], weak: [] },
      negativeSignals: { hard: [], soft: [] },
      boundaryRules: [],
      requiredRequirementHints: [],
      requiredAttachmentPolicy: {
        status: "pending_business_confirmation",
        enforcement: "none",
        omsWhitelistFieldKeys: [],
        requiredFieldKeys: [],
        note: "fallback known key",
      },
      sopTemplateHints: [],
      examples: [],
      notes: "",
    } as ScenarioCard;
  });
}

export interface LlmClassifyResult {
  matchedScene: string;
  matchedSceneName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  /** Card-facing one-liner; max 30 chars. */
  conclusionOneLiner?: string;
  /** Topic title summary; max 60 chars. */
  topicSummary?: string;
  extractedActions: string[];
  alternativeScenes: string[];
  ambiguous: boolean;
  /** true when LLM call/parse failed (caller may fall back to pure rules). */
  failed?: boolean;
  retrievedCases?: Array<{
    caseId: string;
    sceneName: string;
    score: number;
    keyAction: string;
  }>;
}

export function retrieveForPrompt(
  customerIntent: string,
  options: ClassifySceneOptions,
): { prompt: string; retrieved: RetrievedCase[] } {
  if (options.ragEnabled === false || !isRagEnabled()) return { prompt: "", retrieved: [] };
  const retrieved = retrieveSimilarCases(customerIntent, {
    topK: 3,
    category: options.ragCategory || "inbound",
    excludeCaseIds: options.excludeCaseIds,
  });
  return { prompt: formatFewShotBlock(retrieved), retrieved };
}

function buildSystemPromptV1(cards: ScenarioCard[]): string {
  const listCards = cards.length ? cards : fallbackCardsFromKnown();
  const mode = listCards.length <= 16 ? "full" : "compact";
  const list = buildSceneListPrompt(listCards, mode);
  const hasF001 = listCards.some((c) => c.sceneKey === "inbound_label_identify");
  return `你是万邑通入库/库内增值审核场景分类器。

## 任务
根据客户需求描述和已知上下文，判断这条增值单属于哪个场景。

## 可选场景（只能从以下场景中选，或回答"unsupported"）

${list}

unsupported — 不属于以上任何场景

## 判断优先级（业务审核逻辑）

1. 先看需求描述中提到的异常名称，再看仓库动作对象（包裹标签 vs 商品标签 vs 拍照暂存 vs 第三方条码）
2. 明确提到"包裹条码异常"（含批量、含需客户处理）→ 优先 inbound_package_barcode_batch_relabel（若在候选中）
3. 明确提到"商品条码异常"且非批量 → 优先 inbound_package_exception_relabel_shelving（若在候选中）
4. "拍照"+"暂存"/"等客户确认" → inbound_photo_hold（若在候选中）
5. "关联第三方"/"直接扫描上架" → inbound_third_party_merchandise_barcode（若在候选中）
${hasF001 ? "6. 以上都不明确 → inbound_label_identify（通用兜底，仅当它在候选中）" : "6. 以上都不明确且无法判断 → unsupported"}
7. 需求描述太模糊 → matchedScene 填 "unsupported"

## 注意
- "辨识"可能出现在多个场景中，不能单靠"辨识"判断，要看操作对象
- "不换商品标签"≠"换商品标签"，注意否定句
- 入库 vs 库内同名动作不要混（看候选 sceneKey 前缀 inbound_ / instock_）
- 【库内】良品/不良品检测 vs 【库内】良品转不良品上架 vs 【库内】异常商品转不良品上架：
  检测 = 还需要检查判断是不是不良品（动作是「检测/检查」）
  良品转不良 = 已经确定是不良品，要换库位上架（动作是「转/移到不良品」）
  异常转不良 = 因为异常直接归为不良品上架
- 【库内】商品外观辨识+贴标上架 vs 【库内】A+包裹更换标签上架：
  外观辨识 = 要打开看实物才知道是什么（动作是「辨识/识别」、按左右/漏气等外观分别贴）
  A+包裹换标 = 已经知道是什么，只换标签（动作是「更换标签」、箱产品/整箱出库）
- inbound_label_identify（尺重/标签辨识后换标）是通用兜底：客户写了「拍照暂存」「包裹条码异常」「返回照片后再辨识」时不要因为出现「换标/辨识」就走兜底
- 写了「上架到不良品 / 上架不良品」且没有「检测/检查判定」→ 不要选 instock_good_defective_inspection
- 没写 A+包裹/整箱/箱产品 → 不要选 A+换标。错装/按实际SKU 重新贴标 → instock_appearance_identify_label
- 异常名称是「包裹条码异常」且动作是补贴包裹标签 → inbound_package_barcode_batch_relabel，不要选「换商品标签」
- 大致能判断就标 confidence=medium、ambiguous=false；只有完全无法判断才标 low 且 ambiguous=true
- matchedScene 必须是上述 sceneKey 之一，或 "unsupported"（不要编造其他 key）
`;
}

const RULES_ABCD = `
## 基于异常单详情的判断规则（优先级最高）

当异常单详情可用时，**先看异常名称，再看需求描述**：

### 规则 A：异常名称直接映射（来源：业务方确认；优先级高于客户口语）
- 异常名称含"包裹条码异常"（不要求「批量」二字）→ inbound_package_barcode_batch_relabel（§2.33，若在候选中），禁止选 inbound_package_exception_relabel_shelving
- 异常名称含"商品条码异常" → **必须** inbound_package_exception_relabel_shelving（§2.5，若在候选中），禁止选 batch_relabel
- 客户写「补贴包裹标签」「上架到新单」是常见口语，**不能**覆盖 OMS 异常名称
- 扫描彩盒/单品标签/商品标签，即使后面写了补贴包裹标签，仍是 inbound_package_exception_relabel_shelving

### 规则 B：多异常单 ≠ 改判异常类型（来源：360750 纠偏）
- 同一增值单关联 ≥2 个异常单，且异常名称**本身含「包裹条码批量异常」** → inbound_package_barcode_batch_relabel
- 多个「商品条码异常」仍按规则 A，**不要**因为张数多或客户写了补贴包裹标签就改判 batch_relabel
- 唯一例外：客户**明确写**「不换商品标签 / 不换产品标签 / 只换箱唛 / 只换包裹标签」时，才允许在商品条码异常下选 batch_relabel（311652 口径）
- 「批量」只描述处理量，不能把商品条码异常改写成包裹条码异常

### 规则 C：未知/复杂异常名称 → 不强行匹配（来源：业务方确认）
- 异常名称是以下这些复杂类型时，**不要**强行归到名称直接映射：
  - "包裹内出现订单外商品" — 多步骤复杂场景
  - "A+包裹无法识别" — 可能需要特殊处理
  - 其他不在规则 A 明确映射中的异常名称
- 此时回退到看需求描述判断：若描述含拍照/拍摄实物照片/返回照片后再处理 → inbound_photo_hold（即使还写了「之后再辨识」，只要本轮动作是拍照回传）；若描述含关联第三方 → inbound_third_party_merchandise_barcode；若描述也不明确 → inbound_label_identify（§2.1 通用兜底，若在候选中）或 unsupported
- 重要：不要因为需求文本里出现「第三方」「关联」字样，就在复杂异常名称下强行选 third_party；复杂异常优先 inbound_label_identify，除非需求明确是已完成第三方关联后直接扫描上架，或本轮只是拍照回传

### 规则 D：异常详情不可用时（来源：推导）
- 回退到原有逻辑（只看需求描述 + 动作对象）
`;

function buildSystemPromptV2(cards: ScenarioCard[]): string {
  return `${buildSystemPromptV1(cards)}
${RULES_ABCD}`;
}

function attachmentStatusSummary(context: ContextFacts): string {
  const entries = Object.entries(context.attachmentStatus || {});
  if (!entries.length) return "（无附件状态）";
  return entries.map(([k, v]) => `${k}=${v}`).join("；");
}

const CLASSIFY_JSON_HINT = `{"matchedScene":"必须是 sceneKey 之一或 unsupported（不要写 OMS 全名到该字段）","topicSummary":"用一句话概括客户的核心需求（不超过60字）","matchedSceneName":"可写 OMS 全名（勿使用中文弯引号）","confidence":"high/medium/low","reasoning":"判断过程（内部，卡片不展示）","conclusionOneLiner":"一句话说明为什么选这个场景（不超过30字，只写结论不写推理过程）","extractedActions":["动作1","动作2"],"alternativeScenes":["sceneKey"],"ambiguous":false}

topicSummary 要求：包含核心动作（如「辨识后补贴包裹标签上架」），多个单号概括为「N个异常单」不要逐个列出，提取关键业务信息（如件数/箱数/处理方式）。不要截取客户原文前50字，要真正理解后概括。把 topicSummary 放在 JSON 靠前位置，不要漏填。
conclusionOneLiner 示例：客户已关联第三方编码，按新单扫描上架；包裹条码批量异常，需辨识后补贴包裹标签；异常类型复杂，建议人工确认`;

function buildUserMessageV1(customerIntent: string, context: ContextFacts): string {
  return `## 客户需求描述
${customerIntent || "（空）"}

## 已知上下文
- 异常单号：${context.allEventNos?.join("、") || "未填写"}
- 入库单号：${context.allBusinessOrderNos?.join("、") || context.businessOrderNo || "未填写"}
- 仓库：${context.warehouseCode || "未填写"} / ${context.warehouseName || "未填写"}
- 服务原子：${context.serviceAtom || "未填写"}
- 附件状态：${attachmentStatusSummary(context)}

## 请输出 JSON
${CLASSIFY_JSON_HINT}`;
}

function buildUserMessageV2(
  customerIntent: string,
  context: ContextFacts,
  exceptionInfos: ExceptionInfo[],
  fewShot = "",
): string {
  const few = fewShot ? `\n${fewShot}\n` : "";
  return `## 客户需求描述
${customerIntent || "（空）"}

## 已知上下文
- 异常单号：${context.allEventNos?.join("、") || "未填写"}
- 入库单号：${context.allBusinessOrderNos?.join("、") || context.businessOrderNo || "未填写"}
- 仓库：${context.warehouseCode || "未填写"} / ${context.warehouseName || "未填写"}
- 服务原子：${context.serviceAtom || "未填写"}
- 附件状态：${attachmentStatusSummary(context)}

## 异常单详情（来自 OMS 查询，非客户输入）
${formatExceptionDetails(exceptionInfos)}
${few}
## 请输出 JSON
${CLASSIFY_JSON_HINT}`;
}

function degrade(reason: string): LlmClassifyResult {
  return {
    matchedScene: "unsupported",
    matchedSceneName: "不支持的场景",
    confidence: "low",
    reasoning: reason,
    extractedActions: [],
    alternativeScenes: [],
    ambiguous: true,
    failed: true,
  };
}

export function clipConclusionOneLiner(raw: unknown): string {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.slice(0, 30);
}

export function clipTopicSummary(raw: unknown): string {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.slice(0, 60);
}

export function deriveTopicSummary(topicSummary: unknown, reasoning: unknown): string {
  const direct = clipTopicSummary(topicSummary);
  if (direct) return direct;
  const firstSentence = String(reasoning || "").split(/[。；;]/)[0]?.trim() || "";
  if (firstSentence.length >= 10 && firstSentence.length <= 60) {
    return clipTopicSummary(firstSentence);
  }
  return "";
}

function normalizeConfidence(raw: unknown): "high" | "medium" | "low" {
  const s = String(raw || "").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "low";
}

function parseClassifyPayload(text: string, allowed: string[]): LlmClassifyResult {
  const allowedSet = new Set(allowed);
  let obj: Record<string, unknown>;
  try {
    obj = parseJsonishObject(text) as Record<string, unknown>;
  } catch {
    const all = [...text.matchAll(/(?:inbound|instock)_[a-z0-9_]+/g)].map((m) => m[0]);
    const matchedScene = [...all].reverse().find((k) => allowedSet.has(k));
    if (matchedScene) {
      return {
        matchedScene,
        matchedSceneName: sceneNameOf(matchedScene),
        confidence: "medium",
        reasoning: `JSON 解析失败，从原文回退提取 sceneKey=${matchedScene}`,
        conclusionOneLiner: "",
        topicSummary: deriveTopicSummary("", `JSON 解析失败，从原文回退提取 sceneKey=${matchedScene}`),
        extractedActions: [],
        alternativeScenes: [],
        ambiguous: true,
      };
    }
    throw new Error(`JSON parse failed: ${(extractFirstJsonObject(text) || text).slice(0, 120)}`);
  }
  let matchedScene = String(obj.matchedScene || "").trim();
  if (matchedScene === "unsupported" || matchedScene === "") {
    return {
      matchedScene: "unsupported",
      matchedSceneName: String(obj.matchedSceneName || "不支持的场景"),
      confidence: normalizeConfidence(obj.confidence),
      reasoning: String(obj.reasoning || "LLM 判定 unsupported"),
      conclusionOneLiner: clipConclusionOneLiner(obj.conclusionOneLiner),
      topicSummary: deriveTopicSummary(obj.topicSummary, obj.reasoning),
      extractedActions: Array.isArray(obj.extractedActions)
        ? obj.extractedActions.map(String)
        : [],
      alternativeScenes: Array.isArray(obj.alternativeScenes)
        ? obj.alternativeScenes.map(String)
        : [],
      ambiguous: Boolean(obj.ambiguous),
    };
  }
  if (!allowedSet.has(matchedScene)) {
    const byName = [...allowedSet]
      .map((key) => [key, sceneNameOf(key)] as const)
      .find(
        ([, name]) =>
          matchedScene.includes(name.slice(0, 12)) || name.includes(matchedScene.slice(0, 12)),
      );
    if (byName) matchedScene = byName[0];
  }
  if (!allowedSet.has(matchedScene)) {
    return {
      ...degrade(`matchedScene 不在候选列表: ${matchedScene}`),
      conclusionOneLiner: clipConclusionOneLiner(obj.conclusionOneLiner),
      topicSummary: deriveTopicSummary(obj.topicSummary, obj.reasoning),
    };
  }
  return {
    matchedScene,
    matchedSceneName:
      String(obj.matchedSceneName || "").trim() || sceneNameOf(matchedScene),
    confidence: normalizeConfidence(obj.confidence),
    reasoning: String(obj.reasoning || ""),
    conclusionOneLiner: clipConclusionOneLiner(obj.conclusionOneLiner),
    topicSummary: deriveTopicSummary(obj.topicSummary, obj.reasoning),
    extractedActions: Array.isArray(obj.extractedActions)
      ? obj.extractedActions.map(String)
      : [],
    alternativeScenes: Array.isArray(obj.alternativeScenes)
      ? obj.alternativeScenes.map(String).filter((k) => allowedSet.has(k))
      : [],
    ambiguous: Boolean(obj.ambiguous),
  };
}

const PACKAGE_BATCH_NAME = /包裹条码(批量)?异常/;
const PRODUCT_BARCODE_NAME = /商品条码异常/;
const EXPLICIT_PACKAGE_ONLY = /不换商品标签|不换产品标签|不换商品条码|只换箱唛|只换包裹标签|只换包裹条码/;
const PHOTO_HOLD_INTENT = /拍照暂存|返回照片后|回传照片|拍正|实物照片|随机抽.{0,12}拍/;
const RELABEL_NOW = /换标后上架|换标上架/;
const TO_DEFECTIVE = /上架到不良品|上架不良品|转不良品/;
const INSPECT_ACTION = /检测|质量检测|判定标准/;
const APLUS_HINT = /A\+包裹|整箱出库|箱产品|误下为A包裹/;
const APPEARANCE_HINT = /错装|按实际SKU|左边|右边|漏气|不漏气/;

/** Deterministic guard after LLM: OMS 异常名称优先于客户口语。 */
export function applyExceptionNameOverride(
  matchedScene: string,
  exceptionInfos: ExceptionInfo[],
  customerIntent: string,
): { scene: string; overridden: boolean; reason: string } {
  const names = exceptionInfos.map((item) => item.exceptionName).filter(Boolean);
  const intent = customerIntent || "";
  const hasPackageBatch = names.some((name) => PACKAGE_BATCH_NAME.test(name));
  const allProduct =
    names.length > 0 && names.every((name) => PRODUCT_BARCODE_NAME.test(name) && !PACKAGE_BATCH_NAME.test(name));
  const explicitPackageOnly = EXPLICIT_PACKAGE_ONLY.test(intent);

  if (hasPackageBatch && matchedScene !== "inbound_package_barcode_batch_relabel") {
    return {
      scene: "inbound_package_barcode_batch_relabel",
      overridden: true,
      reason: "规则A：异常名称含包裹条码异常",
    };
  }
  if (allProduct && !explicitPackageOnly && matchedScene === "inbound_package_barcode_batch_relabel") {
    return {
      scene: "inbound_package_exception_relabel_shelving",
      overridden: true,
      reason: "规则A：OMS 异常名称为商品条码异常，客户未明确只换箱唛/不换商品标签，禁止改判场景1",
    };
  }
  if (
    PHOTO_HOLD_INTENT.test(intent) &&
    !RELABEL_NOW.test(intent) &&
    matchedScene === "inbound_label_identify"
  ) {
    return {
      scene: "inbound_photo_hold",
      overridden: true,
      reason: "规则C：本轮是拍照回传，不要因「之后再辨识」走尺重兜底",
    };
  }
  if (
    TO_DEFECTIVE.test(intent) &&
    !INSPECT_ACTION.test(intent) &&
    (matchedScene === "instock_good_defective_inspection" ||
      matchedScene === "instock_good_to_defective_shelve" ||
      matchedScene === "instock_exception_to_defective_shelve" ||
      matchedScene === "instock_aplus_parcel_relabel_shelve")
  ) {
    const qualityEx = names.some((name) => /质量异常/.test(name));
    const target = qualityEx ? "instock_exception_to_defective_shelve" : "instock_good_to_defective_shelve";
    if (matchedScene !== target) {
      return {
        scene: target,
        overridden: true,
        reason: "已确定上架不良品且无检测动作，不选检测/A+换标",
      };
    }
    return {
      scene: target,
      overridden: true,
      reason: "已确定上架不良品，按异常类型锁定转不良场景",
    };
  }
  if (matchedScene === "instock_aplus_parcel_relabel_shelve" && !APLUS_HINT.test(intent) && APPEARANCE_HINT.test(intent)) {
    return {
      scene: "instock_appearance_identify_label",
      overridden: true,
      reason: "错装/按实际SKU 且未写 A+，不选 A+换标",
    };
  }
  if (
    matchedScene === "instock_exception_to_defective_shelve" &&
    TO_DEFECTIVE.test(intent) &&
    names.some((name) => /单品条码无法扫描/.test(name)) &&
    !names.some((name) => /质量异常/.test(name))
  ) {
    return {
      scene: "instock_good_to_defective_shelve",
      overridden: true,
      reason: "单品条码异常后上不良品，优先良品转不良而不是异常转不良",
    };
  }
  return { scene: matchedScene, overridden: false, reason: "" };
}

/** Phase 2 v1 — 无异常单详情。 */
export async function classifySceneV1(
  customerIntent: string,
  contextFacts: ContextFacts,
  config: LlmConfig,
  options: ClassifySceneOptions = {},
): Promise<LlmClassifyResult> {
  const cards = resolveCandidateCards(options.candidateCards);
  const allowed = allowedSceneKeys(options.candidateCards);
  try {
    const raw = await callChat(
      config,
      [
        { role: "system", content: buildSystemPromptV1(cards) },
        { role: "user", content: buildUserMessageV1(customerIntent, contextFacts) },
      ],
      { jsonMode: true, maxTokens: 1000, temperature: 0.1 },
    );
    return parseClassifyPayload(raw, allowed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return degrade(`LLM 调用失败，降级: ${msg}`);
  }
}

/** Phase 2 v2 — 含异常单详情与规则 A/B/C/D。 */
export async function classifyScene(
  customerIntent: string,
  contextFacts: ContextFacts,
  exceptionInfos: ExceptionInfo[],
  config: LlmConfig,
  options: ClassifySceneOptions = {},
): Promise<LlmClassifyResult> {
  const cards = resolveCandidateCards(options.candidateCards);
  const allowed = allowedSceneKeys(options.candidateCards);
  const rag = retrieveForPrompt(customerIntent, options);
  const retrievedCases = toMatchRetrieved(rag.retrieved);
  try {
    const raw = await callChat(
      config,
      [
        { role: "system", content: buildSystemPromptV2(cards) },
        {
          role: "user",
          content: buildUserMessageV2(customerIntent, contextFacts, exceptionInfos, rag.prompt),
        },
      ],
      { jsonMode: true, maxTokens: 1000, temperature: 0.1 },
    );
    return { ...parseClassifyPayload(raw, allowed), retrievedCases };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ...degrade(`LLM 调用失败，降级: ${msg}`), retrievedCases };
  }
}
