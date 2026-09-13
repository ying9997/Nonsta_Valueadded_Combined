import type { LlmConfig } from "./llm-client.ts";
import { classifyScene, classifySceneV1, applyExceptionNameOverride, SCENE_KEY_TO_OMS_NAME } from "./llm-scene-classifier.ts";
import { classifySceneV3 } from "./llm-scene-classifier-v3.ts";
import { lookupExceptions, type ExceptionInfo } from "./exception-lookup.ts";
import type { ContextFacts, MatchCandidate, MatchDecision, MatchResult } from "./types.ts";
import { loadScenarioCards, type ScenarioCard } from "./scenario-cards.ts";
import { resolveOrderCategory } from "./order-category.ts";
import { isRagEnabled } from "./case-retriever.ts";

const WEIGHT_STRONG = 3;
const WEIGHT_WEAK = 1;
const BONUS_STRUCTURAL = 4;
const MIN_CANDIDATE_SCORE = 3;
const HIGH_SCORE = 7;
const CLEAR_GAP = 3;
const TOP_K = 3;

const GENERIC_ATOM_RE = /OW01V1602|入库其他服务需求/;
const PRODUCT_BARCODE = /商品条码异常/;
const PACKAGE_BATCH = /包裹条码批量异常/;

/** Soft action→scene constraint (weight ±2). Derived from SOP 2.33 / scenario cards. */
export interface ActionSceneMapping {
  action: string;
  regex: RegExp;
  candidateScenes: string[];
  excludeScenes?: string[];
}

export interface ActionConstraint {
  matchedActions: string[];
  candidateSceneKeys: Set<string>;
  excludedSceneKeys: Set<string>;
}

export const ACTION_SCENE_MAP: ActionSceneMapping[] = [
  {
    action: "辨识",
    regex: /辨识|辨认|确认SKU|识别SKU/,
    candidateScenes: ["inbound_label_identify", "inbound_package_barcode_batch_relabel"],
    excludeScenes: ["inbound_photo_hold"],
  },
  {
    action: "补贴包裹标签",
    // Keep gap short so "补贴B040…Winit包裹条码标签" (F-001 贴码) does not fire.
    regex: /补贴(?:万邑通|新[\w]*)?(?:的)?包裹标签|补贴.{0,16}的?包裹标签|换包裹标签|重新打印.{0,8}包裹标签/,
    candidateScenes: ["inbound_package_barcode_batch_relabel"],
    excludeScenes: ["inbound_label_identify"],
  },
  {
    action: "换商品标签",
    regex: /换商品标签|补贴.{0,8}(?:商品|SKU)标签|更换(?:商品|SKU)标签|更换条码/,
    candidateScenes: ["inbound_label_identify", "inbound_package_exception_relabel_shelving"],
  },
  {
    action: "关联第三方条码",
    // Do not match "第三方箱唛标签覆盖/无法扫描" (often F-001/T1 补贴万邑通标).
    regex: /关联第三方|第三方商品条码|维护第三方|第三方条码已|已关联第三方/,
    candidateScenes: ["inbound_third_party_merchandise_barcode"],
    excludeScenes: ["inbound_label_identify", "inbound_package_barcode_batch_relabel"],
  },
  {
    action: "拍照暂存",
    regex: /拍照.*暂存|暂存.*拍照|拍照.*客户确认|指定商品.*拍照/,
    candidateScenes: ["inbound_photo_hold"],
  },
  {
    action: "拍照",
    regex: /拍照|拍摄/,
    candidateScenes: ["inbound_photo_hold"],
  },
  {
    action: "直接上架",
    regex: /直接.*上架|直接扫描上架|无需.*换.*上架/,
    candidateScenes: ["inbound_third_party_merchandise_barcode"],
    excludeScenes: ["inbound_label_identify", "inbound_package_barcode_batch_relabel"],
  },
];

export interface NormalizedQuery {
  text: string;
  interceptHold: boolean;
  hasPhoto: boolean;
  explicitPhotoRequirement: boolean;
  hasRelabel: boolean;
  hasShelve: boolean;
  hasIdentify: boolean;
  hasPackageException: boolean;
  hasPhotoHold: boolean;
  hasDirectScanShelve: boolean;
  weighOrPhotoWithoutRelabel: boolean;
  inboundStockPhoto: boolean;
}

export function extractActions(query: NormalizedQuery): ActionConstraint {
  const matchedActions: string[] = [];
  const candidateSceneKeys = new Set<string>();
  const excludedSceneKeys = new Set<string>();

  for (const mapping of ACTION_SCENE_MAP) {
    if (mapping.regex.test(query.text)) {
      matchedActions.push(mapping.action);
      for (const scene of mapping.candidateScenes) candidateSceneKeys.add(scene);
      for (const scene of mapping.excludeScenes || []) excludedSceneKeys.add(scene);
    }
  }

  return { matchedActions, candidateSceneKeys, excludedSceneKeys };
}

export interface RetrievalHit {
  sceneKey: string;
  sceneName: string;
  status: string;
  score: number;
  matchedSignals: string[];
  negativeSignals: string[];
  source: "deterministic" | "sop_kb" | "casebook";
}

export interface RetrievalPort {
  name: "deterministic" | "sop_kb" | "casebook";
  retrieve(
    query: NormalizedQuery,
    cards: ScenarioCard[],
    context: ContextFacts,
    actionConstraint?: ActionConstraint,
  ): RetrievalHit[];
}

function textHas(text: string, term: string): boolean {
  if (term === "上架") return /(?<!不)上架/.test(text);
  if (term === "暂存") return /暂存/.test(text) && !/暂存不上架/.test(text);
  // Allow short intervening tokens: "补贴新入库单WI…的包裹标签"
  if (term === "补贴包裹标签") return /补贴.{0,40}包裹标签/.test(text);
  if (term === "补贴万邑通包裹标签") return /补贴.{0,20}万邑通.?包裹标签/.test(text);
  if (term === "辨识后补贴包裹标签") {
    return /辨识后补贴包裹标签/.test(text) || /辨识.{0,30}补贴.{0,40}包裹标签/.test(text);
  }
  return text.includes(term);
}

export function normalizeQuery(raw: string): NormalizedQuery {
  const text = raw.replace(/\s+/g, " ").trim();
  const interceptHold =
    (/拦截/.test(text) && /不上架|先放/.test(text)) ||
    /先放在一边/.test(text) ||
    /暂存不上架/.test(text);
  const hasPhoto = /拍照|拍摄/.test(text);
  const hasRelabel = /换标|贴标|贴条码|补贴|更换.{0,8}标签|更换.{0,8}条码|重新.{0,8}贴|换商品标签/.test(text);
  const hasIdentify =
    /辨识|尺重|绿标|露出的SKU|SKU对应|对应的商品条码|混\s*SKU|商品条码与包裹条码不对应/.test(text);
  return {
    text,
    interceptHold,
    hasPhoto,
    explicitPhotoRequirement: hasPhoto && /要求|指定|数字标识|回传|拍照暂存/.test(text),
    hasRelabel,
    hasShelve: /(?<!不)上架/.test(text) && !interceptHold,
    hasIdentify,
    hasPackageException: /包裹类异常|包裹条码正常|商品条码异常/.test(text),
    hasPhotoHold: hasPhoto && /暂存区|拍照暂存|先放置在暂存|客户确认后|确认后再处理/.test(text),
    hasDirectScanShelve: /直接扫描上架|第三方箱唛已关联/.test(text) && !hasRelabel,
    weighOrPhotoWithoutRelabel: /称重|拍照|拍摄/.test(text) && !hasRelabel,
    inboundStockPhoto: /库内/.test(text) && /拍照|拍摄照片|视频/.test(text),
  };
}

function excludeReasons(card: ScenarioCard, query: NormalizedQuery, context: ContextFacts): string[] {
  const reasons: string[] = [];
  const key = card.sceneKey;
  const genericOnly =
    GENERIC_ATOM_RE.test(`${context.serviceAtom} ${query.text}`) &&
    !query.hasRelabel &&
    !query.hasIdentify &&
    !query.hasPackageException &&
    !query.hasPhotoHold &&
    !query.hasPhoto &&
    !query.hasShelve;

  if (genericOnly) reasons.push("generic_atom_only");

  const orderCat = resolveOrderCategory(context);
  if (orderCat) {
    if (card.category && card.category !== orderCat) {
      reasons.push(`order_type_mismatch:${orderCat}`);
    }
  } else if (
    card.category === "instock" &&
    !/库内|在库|货权转移|审计盘点|库存冻结|库存解冻/.test(query.text)
  ) {
    reasons.push("instock_without_instock_context");
  }

  if (key === "inbound_label_identify" || key === "inbound_photo_hold") {
    if (query.interceptHold && !query.explicitPhotoRequirement) reasons.push("intercept_hold_without_photo");
  }
  if (key === "inbound_package_exception_relabel_shelving" && query.interceptHold) {
    reasons.push("intercept_hold");
  }
  if ((key === "inbound_label_identify" || key === "inbound_package_exception_relabel_shelving") && query.hasDirectScanShelve) {
    reasons.push("direct_scan_shelve");
  }
  if (key === "inbound_label_identify" && query.weighOrPhotoWithoutRelabel) {
    reasons.push("weigh_or_photo_without_relabel");
  }
  if (key === "inbound_package_exception_relabel_shelving" && query.hasIdentify && !query.hasPackageException) {
    reasons.push("identify_without_package_exception");
  }
  if (key === "inbound_photo_hold") {
    if (query.hasRelabel && query.hasShelve) reasons.push("relabel_then_shelve");
    if (query.inboundStockPhoto) reasons.push("inbound_stock_photo");
    if (/称重/.test(query.text) && query.hasPhoto && !query.hasPhotoHold) reasons.push("weigh_photo_not_hold");
  }
  return reasons;
}

function structuralBonus(card: ScenarioCard, query: NormalizedQuery): { bonus: number; signal: string } {
  if (card.sceneKey === "inbound_label_identify" && query.hasIdentify && query.hasRelabel && query.hasShelve) {
    return { bonus: BONUS_STRUCTURAL, signal: "structural:identify+relabel+shelve" };
  }
  if (
    card.sceneKey === "inbound_package_exception_relabel_shelving" &&
    query.hasPackageException &&
    query.hasRelabel &&
    query.hasShelve &&
    !query.hasIdentify
  ) {
    return { bonus: BONUS_STRUCTURAL, signal: "structural:package_exception+relabel+shelve" };
  }
  if (card.sceneKey === "inbound_photo_hold" && query.hasPhotoHold) {
    return { bonus: BONUS_STRUCTURAL, signal: "structural:photo+hold+later_decision" };
  }
  return { bonus: 0, signal: "" };
}

function scoreCard(
  card: ScenarioCard,
  query: NormalizedQuery,
  context: ContextFacts,
  actionConstraint?: ActionConstraint,
): RetrievalHit {
  const negativeSignals = excludeReasons(card, query, context);
  if (negativeSignals.length) {
    return {
      sceneKey: card.sceneKey,
      sceneName: card.sceneName,
      status: card.status,
      score: 0,
      matchedSignals: [],
      negativeSignals,
      source: "deterministic",
    };
  }

  const matchedSignals: string[] = [];
  let score = 0;
  for (const term of card.positiveSignals.strong) {
    if (textHas(query.text, term)) {
      score += WEIGHT_STRONG;
      matchedSignals.push(`strong:${term}`);
    }
  }
  for (const term of card.positiveSignals.weak) {
    if (textHas(query.text, term)) {
      score += WEIGHT_WEAK;
      matchedSignals.push(`weak:${term}`);
    }
  }

  const structural = structuralBonus(card, query);
  if (structural.bonus) {
    score += structural.bonus;
    matchedSignals.push(structural.signal);
  }

  // Action-scene constraint: soft bonus/penalty per matched mapping (not hard exclude).
  // Net across actions: a scene can receive both +2 and -2 from different actions.
  if (actionConstraint) {
    let delta = 0;
    for (const mapping of ACTION_SCENE_MAP) {
      if (!actionConstraint.matchedActions.includes(mapping.action)) continue;
      if (mapping.candidateScenes.includes(card.sceneKey)) delta += 2;
      if ((mapping.excludeScenes || []).includes(card.sceneKey)) delta -= 2;
    }
    if (delta !== 0) {
      score += delta;
      const sign = delta > 0 ? "+" : "";
      matchedSignals.push(`action_constraint:${sign}${delta}(${actionConstraint.matchedActions.join(",")})`);
    }
  }

  return {
    sceneKey: card.sceneKey,
    sceneName: card.sceneName,
    status: card.status,
    score,
    matchedSignals,
    negativeSignals: [],
    source: "deterministic",
  };
}

const deterministicPort: RetrievalPort = {
  name: "deterministic",
  retrieve(query, cards, context, actionConstraint) {
    return cards.map((card) => scoreCard(card, query, context, actionConstraint));
  },
};

/** Reserved: later SOP knowledge-base retrieval. Must not be used as authority yet. */
const sopKbPort: RetrievalPort = {
  name: "sop_kb",
  retrieve() {
    return [];
  },
};

/** Reserved: later casebook retrieval. Casebook is derived teaching material, not gold. */
const casebookPort: RetrievalPort = {
  name: "casebook",
  retrieve() {
    return [];
  },
};

const RETRIEVAL_PORTS: RetrievalPort[] = [deterministicPort, sopKbPort, casebookPort];

function mergeHits(hits: RetrievalHit[]): RetrievalHit[] {
  const byKey = new Map<string, RetrievalHit>();
  for (const hit of hits) {
    const prev = byKey.get(hit.sceneKey);
    if (!prev) {
      byKey.set(hit.sceneKey, { ...hit, matchedSignals: [...hit.matchedSignals], negativeSignals: [...hit.negativeSignals] });
      continue;
    }
    prev.score += hit.score;
    prev.matchedSignals.push(...hit.matchedSignals);
    prev.negativeSignals.push(...hit.negativeSignals);
    if (hit.source !== "deterministic") prev.source = hit.source;
  }
  return [...byKey.values()];
}

function confidenceBand(score: number, gap: number): MatchCandidate["confidence"] {
  if (score >= HIGH_SCORE && gap >= CLEAR_GAP) return "high";
  if (score >= MIN_CANDIDATE_SCORE) return "medium";
  return "low";
}

function toCandidate(hit: RetrievalHit, gap: number): MatchCandidate {
  const confidenceScore = Math.min(1, hit.score / 12);
  return {
    sceneKey: hit.sceneKey,
    sceneName: hit.sceneName,
    score: hit.score,
    confidenceScore,
    confidence: confidenceBand(hit.score, gap),
    matchedSignals: hit.matchedSignals,
    negativeSignals: hit.negativeSignals,
    source: hit.source,
    status: hit.status,
  };
}

function templateLabel(sceneKey: string): string {
  if (sceneKey === "inbound_label_identify") return "F-001";
  if (sceneKey === "inbound_package_exception_relabel_shelving") return "A";
  if (sceneKey === "inbound_photo_hold") return "B";
  if (sceneKey === "inbound_package_barcode_batch_relabel") return "T1";
  if (sceneKey === "inbound_third_party_merchandise_barcode") return "T3";
  return sceneKey;
}

function emptyResult(reason: string, score = 0): MatchResult {
  return {
    matched: false,
    supported: false,
    category: "C",
    sceneKey: "",
    scenarioId: "",
    scenarioName: "",
    confidence: "",
    reason,
    score,
    candidateTemplate: "",
    decision: "unsupported",
    confidenceScore: 0,
    candidates: [],
    topK: [],
  };
}

interface SelectResult {
  decision: MatchDecision;
  reason: string;
  top: MatchCandidate | null;
  gap: number;
  decisionPath: string;
}

function selectScene(ranked: MatchCandidate[], query: NormalizedQuery): SelectResult {
  const viable = ranked.filter((item) => item.score >= MIN_CANDIDATE_SCORE && item.negativeSignals.length === 0);
  if (!viable.length) {
    if (query.interceptHold && !query.explicitPhotoRequirement) {
      return { decision: "unsupported", reason: "unsupported_intercept_hold", top: null, gap: 0, decisionPath: "no viable candidates + interceptHold → unsupported" };
    }
    if (query.hasDirectScanShelve) {
      return { decision: "unsupported", reason: "unsupported_direct_scan_shelve", top: null, gap: 0, decisionPath: "no viable candidates + directScanShelve → unsupported" };
    }
    return { decision: "unsupported", reason: "unsupported_template", top: null, gap: 0, decisionPath: "no viable candidates → unsupported" };
  }

  const top = viable[0];
  const second = viable[1];
  const gap = top.score - (second?.score ?? 0);
  const t1 = templateLabel(top.sceneKey);
  const t2 = second ? templateLabel(second.sceneKey) : "-";

  if (top.sceneKey === "inbound_photo_hold" && !query.hasPhotoHold) {
    return { decision: "ambiguous", reason: "ambiguous_photo_destination_unclear", top, gap, decisionPath: `top1=${t1}(${top.score}) is photo_hold but hasPhotoHold=false → ambiguous` };
  }

  const f001VsA =
    second &&
    ((top.sceneKey === "inbound_label_identify" && second.sceneKey === "inbound_package_exception_relabel_shelving") ||
      (top.sceneKey === "inbound_package_exception_relabel_shelving" && second.sceneKey === "inbound_label_identify"));
  if (f001VsA && gap < CLEAR_GAP) {
    return { decision: "ambiguous", reason: "ambiguous_f001_vs_package_exception", top, gap, decisionPath: `top1=${t1}(${top.score}) top2=${t2}(${second!.score}) gap=${gap} < CLEAR_GAP(${CLEAR_GAP}) → ambiguous F-001 vs A` };
  }

  if (second && second.score >= MIN_CANDIDATE_SCORE && gap < CLEAR_GAP) {
    return { decision: "ambiguous", reason: "ambiguous_top1_top2_close", top, gap, decisionPath: `top1=${t1}(${top.score}) top2=${t2}(${second.score}) gap=${gap} < CLEAR_GAP(${CLEAR_GAP}) → ambiguous` };
  }

  if (top.score >= HIGH_SCORE && gap >= CLEAR_GAP) {
    if (top.status === "supported") {
      return { decision: "supported", reason: "supported_clear_top1", top, gap, decisionPath: `top1=${t1}(${top.score}) ≥ HIGH(${HIGH_SCORE}) gap=${gap} ≥ CLEAR(${CLEAR_GAP}) status=supported → supported` };
    }
    return { decision: "supported", reason: "supported_candidate_scene_not_auto_run", top, gap, decisionPath: `top1=${t1}(${top.score}) ≥ HIGH(${HIGH_SCORE}) gap=${gap} ≥ CLEAR(${CLEAR_GAP}) status=${top.status} → supported(no auto-run)` };
  }

  if (top.score >= MIN_CANDIDATE_SCORE && !second) {
    if (top.status === "supported" && (query.hasIdentify || top.score >= HIGH_SCORE)) {
      return { decision: "supported", reason: "supported_single_supported_scene", top, gap, decisionPath: `top1=${t1}(${top.score}) single candidate, status=supported, hasIdentify=${query.hasIdentify} → supported` };
    }
    if (top.status !== "supported") {
      return { decision: "supported", reason: "supported_candidate_scene_not_auto_run", top, gap, decisionPath: `top1=${t1}(${top.score}) single candidate, status=${top.status} → supported(no auto-run)` };
    }
  }

  const t2Score = second ? `top2=${t2}(${second.score}) ` : "";
  return { decision: "ambiguous", reason: "ambiguous_below_high_confidence", top, gap, decisionPath: `top1=${t1}(${top.score}) ${t2Score}gap=${gap} — score<HIGH(${HIGH_SCORE}) or gap<CLEAR(${CLEAR_GAP}) → ambiguous(below confidence)` };
}

/**
 * match-template v0.2
 *
 * Pipeline: Query Normalize → Load Scenario Cards → Score Candidates
 * → Candidate Merge → Rank + Confidence → Scene Select
 *
 * Retrieval is deterministic keyword/structure scoring. SOP KB / casebook /
 * reranker ports are reserved and currently return identity / empty.
 *
 * Auto-run (legacy `supported=true`) only when decision=supported AND the
 * winning card status is `supported`. F-001 / A / B cards are supported and
 * enter check-completeness when selected.
 */
export function matchTemplate(normalizedRequirement: string, context: ContextFacts): MatchResult {
  const query = normalizeQuery(normalizedRequirement);
  const cards = loadScenarioCards();
  if (!cards.length) return emptyResult("unsupported_no_scenario_cards");

  const actionConstraint = extractActions(query);
  const rawHits = RETRIEVAL_PORTS.flatMap((port) => port.retrieve(query, cards, context, actionConstraint));
  const merged = mergeHits(rawHits);
  const sorted = [...merged].sort((a, b) => b.score - a.score || a.sceneKey.localeCompare(b.sceneKey));
  const rankedHits = sorted; // reserved reranker: identity
  const gapFor = (index: number) => rankedHits[index].score - (rankedHits[index + 1]?.score ?? 0);
  const allCandidates = rankedHits.map((hit, index) => toCandidate(hit, gapFor(index)));
  const topK = allCandidates.filter((item) => item.score >= MIN_CANDIDATE_SCORE).slice(0, TOP_K);
  const selected = selectScene(topK, query);

  const actionTrace = {
    matchedActions: actionConstraint.matchedActions,
    actionCandidateScenes: [...actionConstraint.candidateSceneKeys],
    actionExcludedScenes: [...actionConstraint.excludedSceneKeys],
  };

  const traceFields = {
    querySignals: query as import("./types.ts").MatchQuerySignals,
    gap: selected.gap,
    decisionPath: selected.decisionPath,
    ...actionTrace,
  };

  if (selected.decision === "unsupported" || !selected.top) {
    return {
      ...emptyResult(selected.reason, allCandidates[0]?.score ?? 0),
      candidates: allCandidates,
      topK,
      ...traceFields,
    };
  }

  const top = selected.top;
  const autoRun = selected.decision === "supported" && top.status === "supported";
  return {
    matched: autoRun,
    supported: autoRun,
    category: autoRun ? "B" : "C",
    sceneKey: autoRun || selected.decision !== "unsupported" ? top.sceneKey : "",
    scenarioId: autoRun || selected.decision !== "unsupported" ? top.sceneKey : "",
    scenarioName: autoRun || selected.decision !== "unsupported" ? top.sceneName : "",
    confidence: top.confidence,
    reason: selected.reason,
    score: top.score,
    candidateTemplate: templateLabel(top.sceneKey),
    decision: selected.decision,
    confidenceScore: top.confidenceScore,
    candidates: allCandidates,
    topK,
    llmUsed: false,
    ...traceFields,
  };
}

function pickLlmCandidateCards(ruleBaseline: MatchResult): ScenarioCard[] {
  const cards = loadScenarioCards();
  const byKey = new Map(cards.map((card) => [card.sceneKey, card]));
  const ranked = [...(ruleBaseline.candidates || [])].sort((a, b) => b.score - a.score);
  const picked: ScenarioCard[] = [];
  const seen = new Set<string>();
  const push = (sceneKey: string) => {
    const card = byKey.get(sceneKey);
    if (!card || seen.has(card.sceneKey) || picked.length >= 10) return;
    seen.add(card.sceneKey);
    picked.push(card);
  };
  for (const hit of ranked) {
    if (hit.negativeSignals.length) continue;
    push(hit.sceneKey);
  }
  for (const hit of ranked) push(hit.sceneKey);
  if (picked.length < 10) {
    for (const card of cards) push(card.sceneKey);
  }
  return picked;
}

function rulePrefilterCandidates(
  query: NormalizedQuery,
  context: ContextFacts,
): { sceneKey: string; sceneName: string; status: string; exclude: string[] }[] {
  const cards = loadScenarioCards();
  return cards.map((card) => ({
    sceneKey: card.sceneKey,
    sceneName: card.sceneName,
    status: card.status,
    exclude: excludeReasons(card, query, context),
  }));
}

export type SceneLlmVersion = 1 | 2 | 3;

/**
 * Phase 2: rule prefilter + LLM refine.
 * version=1 → 旧 prompt；version=2 → 异常预查+规则；version=3 → 自主 tool calling。
 * On LLM call/parse failure → fall back to pure matchTemplate (llmUsed=false).
 */
export async function matchTemplateWithLlm(
  normalizedRequirement: string,
  contextFacts: ContextFacts,
  llmConfig: LlmConfig,
  version: SceneLlmVersion = 2,
  matchOpts?: { ragEnabled?: boolean },
): Promise<MatchResult> {
  const query = normalizeQuery(normalizedRequirement);
  const prefilter = rulePrefilterCandidates(query, contextFacts);
  const ruleBaseline = matchTemplate(normalizedRequirement, contextFacts);
  const llmCards = pickLlmCandidateCards(ruleBaseline);
  const candidateScenes = llmCards.map((card) => card.sceneKey);
  const cat = resolveOrderCategory(contextFacts);
  const classifyOpts = {
    candidateCards: llmCards,
    ragEnabled: version !== 1 && (matchOpts?.ragEnabled ?? isRagEnabled()),
    ragCategory: (cat === "instock" ? "instock" : "inbound") as "inbound" | "instock",
    excludeCaseIds: contextFacts.orderNo ? [contextFacts.orderNo] : [],
  };

  let exceptionInfos: ExceptionInfo[] = [];
  let toolCallHistory:
    | Array<{
        round: number;
        toolName: string;
        arguments: Record<string, unknown>;
        result: string;
      }>
    | undefined;
  let totalToolRounds: number | undefined;
  let classify: Awaited<ReturnType<typeof classifySceneV1>>;

  if (version === 1) {
    classify = await classifySceneV1(normalizedRequirement, contextFacts, llmConfig, classifyOpts);
  } else if (version === 3) {
    const v3 = await classifySceneV3(normalizedRequirement, contextFacts, llmConfig, classifyOpts);
    classify = v3;
    toolCallHistory = v3.toolCallHistory;
    totalToolRounds = v3.totalToolRounds;
  } else {
    exceptionInfos = await lookupExceptions(contextFacts.allEventNos || []);
    classify = await classifyScene(
      normalizedRequirement,
      contextFacts,
      exceptionInfos,
      llmConfig,
      classifyOpts,
    );
    if (!classify.failed) {
      const ov = applyExceptionNameOverride(classify.matchedScene, exceptionInfos, normalizedRequirement);
      if (ov.overridden) {
        classify = {
          ...classify,
          matchedScene: ov.scene,
          matchedSceneName: SCENE_KEY_TO_OMS_NAME[ov.scene] || classify.matchedSceneName,
          reasoning: `${ov.reason}；原LLM=${classify.matchedScene}。${classify.reasoning}`,
        };
      }
    }
    for (const info of exceptionInfos) {
      if (PRODUCT_BARCODE.test(info.exceptionName) && !candidateScenes.includes("inbound_package_exception_relabel_shelving")) {
        candidateScenes.push("inbound_package_exception_relabel_shelving");
      }
      if (PACKAGE_BATCH.test(info.exceptionName) && !candidateScenes.includes("inbound_package_barcode_batch_relabel")) {
        candidateScenes.push("inbound_package_barcode_batch_relabel");
      }
    }
  }

  if (classify.failed) {
    return {
      ...ruleBaseline,
      llmUsed: false,
      ruleCandidateScenes: candidateScenes,
      retrievedCases: classify.retrievedCases || [],
      llmClassification: {
        matchedScene: classify.matchedScene,
        confidence: classify.confidence,
        reasoning: classify.reasoning,
        conclusionOneLiner: classify.conclusionOneLiner || "",
        extractedActions: classify.extractedActions,
        alternativeScenes: classify.alternativeScenes,
        ambiguous: classify.ambiguous,
        sceneLlmVersion: version,
        exceptionInfos: version === 2 ? exceptionInfos : undefined,
        toolCallHistory: version === 3 ? toolCallHistory : undefined,
        totalToolRounds: version === 3 ? totalToolRounds : undefined,
      },
      decisionPath: `${ruleBaseline.decisionPath || ruleBaseline.reason} | llm_failed_fallback_rules`,
    };
  }

  const llmMeta = {
    matchedScene: classify.matchedScene,
    confidence: classify.confidence,
    reasoning: classify.reasoning,
    conclusionOneLiner: classify.conclusionOneLiner || "",
    extractedActions: classify.extractedActions,
    alternativeScenes: classify.alternativeScenes,
    ambiguous: classify.ambiguous,
    sceneLlmVersion: version,
    exceptionInfos: version === 2 ? exceptionInfos : undefined,
    toolCallHistory: version === 3 ? toolCallHistory : undefined,
    totalToolRounds: version === 3 ? totalToolRounds : undefined,
  };

  const cards = loadScenarioCards();
  const cardByKey = new Map(cards.map((c) => [c.sceneKey, c]));
  const actionConstraint = extractActions(query);
  const actionTrace = {
    matchedActions: [...new Set([...actionConstraint.matchedActions, ...classify.extractedActions])],
    actionCandidateScenes: [...actionConstraint.candidateSceneKeys],
    actionExcludedScenes: [...actionConstraint.excludedSceneKeys],
  };

  const baseTrace = {
    querySignals: query as import("./types.ts").MatchQuerySignals,
    candidates: ruleBaseline.candidates,
    topK: ruleBaseline.topK,
    ruleCandidateScenes: candidateScenes,
    llmClassification: llmMeta,
    llmUsed: true,
    retrievedCases: classify.retrievedCases || [],
    ...actionTrace,
  };

  if (classify.matchedScene === "unsupported") {
    return {
      ...emptyResult("unsupported_llm", ruleBaseline.score),
      ...baseTrace,
      gap: 0,
      decisionPath: `llm=unsupported; reasoning=${classify.reasoning.slice(0, 120)}`,
      reason: "unsupported_llm",
    };
  }

  if (!candidateScenes.includes(classify.matchedScene)) {
    const excluded = prefilter.find((c) => c.sceneKey === classify.matchedScene);
    const card = cardByKey.get(classify.matchedScene);
    return {
      matched: false,
      supported: false,
      category: "C",
      sceneKey: classify.matchedScene,
      scenarioId: classify.matchedScene,
      scenarioName: card?.sceneName || classify.matchedSceneName,
      confidence: "low",
      reason: "ambiguous_llm_vs_rule_exclude",
      score: ruleBaseline.score,
      candidateTemplate: templateLabel(classify.matchedScene),
      decision: "ambiguous",
      confidenceScore: 0.35,
      gap: 0,
      decisionPath: `llm=${classify.matchedScene} hard-excluded by rules(${(excluded?.exclude || []).join(",") || "not_in_candidates"}) → ambiguous`,
      ...baseTrace,
    };
  }

  if (classify.confidence === "low" || classify.ambiguous) {
    const card = cardByKey.get(classify.matchedScene);
    return {
      matched: false,
      supported: false,
      category: "C",
      sceneKey: classify.matchedScene,
      scenarioId: classify.matchedScene,
      scenarioName: card?.sceneName || classify.matchedSceneName,
      confidence: "low",
      reason: "ambiguous_llm_low_confidence",
      score: Math.max(ruleBaseline.score, HIGH_SCORE),
      candidateTemplate: templateLabel(classify.matchedScene),
      decision: "ambiguous",
      confidenceScore: 0.45,
      gap: 0,
      decisionPath: `llm=${classify.matchedScene} confidence=${classify.confidence} ambiguous=${classify.ambiguous} → ambiguous`,
      ...baseTrace,
    };
  }

  const card = cardByKey.get(classify.matchedScene);
  const autoRun = card?.status === "supported";
  const confScore = classify.confidence === "high" ? 0.9 : 0.7;
  return {
    matched: autoRun,
    supported: autoRun,
    category: autoRun ? "B" : "C",
    sceneKey: classify.matchedScene,
    scenarioId: classify.matchedScene,
    scenarioName: card?.sceneName || classify.matchedSceneName,
    confidence: classify.confidence === "high" ? "high" : "medium",
    reason: autoRun ? "supported_llm_clear" : "supported_llm_candidate_not_auto_run",
    score: Math.max(ruleBaseline.score, HIGH_SCORE + 1),
    candidateTemplate: templateLabel(classify.matchedScene),
    decision: "supported",
    confidenceScore: confScore,
    gap: CLEAR_GAP,
    decisionPath: `ruleCandidates=[${candidateScenes.join(",")}] → llm=${classify.matchedScene}(${classify.confidence}) → ${autoRun ? "supported" : "supported(no auto-run)"}`,
    ...baseTrace,
  };
}

/** Phase 2 v1 入口（保留旧 prompt，供三版对比）. */
export async function matchTemplateWithLlmV1(
  normalizedRequirement: string,
  contextFacts: ContextFacts,
  llmConfig: LlmConfig,
): Promise<MatchResult> {
  return matchTemplateWithLlm(normalizedRequirement, contextFacts, llmConfig, 1);
}
