import type { ContextFacts, MatchCandidate, MatchDecision, MatchResult } from "./types.ts";
import { loadScenarioCards, type ScenarioCard } from "./scenario-cards.ts";

const WEIGHT_STRONG = 3;
const WEIGHT_WEAK = 1;
const BONUS_STRUCTURAL = 4;
const MIN_CANDIDATE_SCORE = 3;
const HIGH_SCORE = 7;
const CLEAR_GAP = 3;
const TOP_K = 3;

const GENERIC_ATOM_RE = /OW01V1602|入库其他服务需求/;

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
  retrieve(query: NormalizedQuery, cards: ScenarioCard[], context: ContextFacts): RetrievalHit[];
}

function textHas(text: string, term: string): boolean {
  if (term === "上架") return /(?<!不)上架/.test(text);
  if (term === "暂存") return /暂存/.test(text) && !/暂存不上架/.test(text);
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

function scoreCard(card: ScenarioCard, query: NormalizedQuery, context: ContextFacts): RetrievalHit {
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

  const taggedF001 =
    card.sceneKey === "inbound_label_identify" &&
    (context.sceneKey === "inbound_label_identify" || context.sceneCode === card.omsSceneCode);
  if (taggedF001 && (query.hasRelabel || query.hasIdentify) && query.hasShelve) {
    score += 2;
    matchedSignals.push("context:oms_scene_f001_assist");
  }

  const structural = structuralBonus(card, query);
  if (structural.bonus) {
    score += structural.bonus;
    matchedSignals.push(structural.signal);
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
  retrieve(query, cards, context) {
    return cards.map((card) => scoreCard(card, query, context));
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

function selectScene(ranked: MatchCandidate[], query: NormalizedQuery): { decision: MatchDecision; reason: string; top: MatchCandidate | null } {
  const viable = ranked.filter((item) => item.score >= MIN_CANDIDATE_SCORE && item.negativeSignals.length === 0);
  if (!viable.length) {
    if (query.interceptHold && !query.explicitPhotoRequirement) {
      return { decision: "unsupported", reason: "unsupported_intercept_hold", top: null };
    }
    if (query.hasDirectScanShelve) {
      return { decision: "unsupported", reason: "unsupported_direct_scan_shelve", top: null };
    }
    return { decision: "unsupported", reason: "unsupported_template", top: null };
  }

  const top = viable[0];
  const second = viable[1];
  const gap = top.score - (second?.score ?? 0);

  if (top.sceneKey === "inbound_photo_hold" && !query.hasPhotoHold) {
    return { decision: "ambiguous", reason: "ambiguous_photo_destination_unclear", top };
  }

  const f001VsA =
    second &&
    ((top.sceneKey === "inbound_label_identify" && second.sceneKey === "inbound_package_exception_relabel_shelving") ||
      (top.sceneKey === "inbound_package_exception_relabel_shelving" && second.sceneKey === "inbound_label_identify"));
  if (f001VsA && gap < CLEAR_GAP) {
    return { decision: "ambiguous", reason: "ambiguous_f001_vs_package_exception", top };
  }

  if (second && second.score >= MIN_CANDIDATE_SCORE && gap < CLEAR_GAP) {
    return { decision: "ambiguous", reason: "ambiguous_top1_top2_close", top };
  }

  if (top.score >= HIGH_SCORE && gap >= CLEAR_GAP) {
    if (top.status === "supported") {
      return { decision: "supported", reason: "supported_clear_top1", top };
    }
    return { decision: "supported", reason: "supported_candidate_scene_not_auto_run", top };
  }

  if (top.score >= MIN_CANDIDATE_SCORE && !second) {
    if (top.status === "supported" && (query.hasIdentify || top.score >= HIGH_SCORE)) {
      return { decision: "supported", reason: "supported_single_supported_scene", top };
    }
    if (top.status !== "supported") {
      return { decision: "supported", reason: "supported_candidate_scene_not_auto_run", top };
    }
  }

  return { decision: "ambiguous", reason: "ambiguous_below_high_confidence", top };
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
 * winning card status is `supported` (F-001). A/B stay candidate/pending and
 * do not enter check-completeness.
 */
export function matchTemplate(normalizedRequirement: string, context: ContextFacts): MatchResult {
  const query = normalizeQuery(normalizedRequirement);
  const cards = loadScenarioCards();
  if (!cards.length) return emptyResult("unsupported_no_scenario_cards");

  const rawHits = RETRIEVAL_PORTS.flatMap((port) => port.retrieve(query, cards, context));
  const merged = mergeHits(rawHits);
  const sorted = [...merged].sort((a, b) => b.score - a.score || a.sceneKey.localeCompare(b.sceneKey));
  const rankedHits = sorted; // reserved reranker: identity
  const gapFor = (index: number) => rankedHits[index].score - (rankedHits[index + 1]?.score ?? 0);
  const allCandidates = rankedHits.map((hit, index) => toCandidate(hit, gapFor(index)));
  const topK = allCandidates.filter((item) => item.score >= MIN_CANDIDATE_SCORE).slice(0, TOP_K);
  const selected = selectScene(topK, query);

  if (selected.decision === "unsupported" || !selected.top) {
    return {
      ...emptyResult(selected.reason, allCandidates[0]?.score ?? 0),
      candidates: allCandidates,
      topK,
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
  };
}
