import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneCandidate } from "./types.ts";
import type { SceneCategory } from "./order-category.ts";

export type ScenarioCardStatus =
  | "supported"
  | "candidate_supported"
  | "pending_evidence"
  /** Dedicated standard / skip-audit atom; not a catch-all scene-overview. Hidden from matching. */
  | "retired_dedicated_atom";

export interface ScenarioCardSourceRef {
  path: string;
  section?: string;
  credibility: "authority" | "derived" | "deprecated_reference";
  note: string;
}

export interface ScenarioCardExample {
  id: string;
  kind: "positive" | "negative" | "boundary";
  sourceType: string;
  text: string;
  note: string;
}

export interface RequiredAttachmentPolicy {
  status:
    | "confirmed_from_data"
    | "simulated_pending_business_confirmation"
    | "pending_business_confirmation"
    | "auto_generated";
  enforcement: "required" | "simulated_only" | "none" | "advisory";
  /** OMS attributeKey values observed at SUBMIT (e.g. VAS_ATTR_REL_LF). */
  omsWhitelistFieldKeys: string[];
  /** Required OMS attributeKey values; empty = no attachment gate. */
  requiredFieldKeys?: string[];
  /** @deprecated Prefer requiredFieldKeys. Kept for older cards. */
  simulatedRequiredFieldKeys?: string[];
  note: string;
}

export interface RequirementInfoField {
  field: string;
  description: string;
  frequency?: string;
  examples: string[];
  required: boolean;
}

export interface ScenarioCard {
  sceneKey: string;
  sceneName: string;
  status: ScenarioCardStatus;
  category: string;
  omsSceneCode?: string;
  sourceRefs: ScenarioCardSourceRef[];
  positiveSignals: { strong: string[]; weak: string[] };
  negativeSignals: { hard: string[]; soft: string[] };
  boundaryRules: string[];
  requiredRequirementHints: string[];
  /** Semantic required info distilled from historical approved orders (G-1). */
  requiredInfoFields?: RequirementInfoField[];
  optionalInfoFields?: RequirementInfoField[];
  requiredAttachmentPolicy: RequiredAttachmentPolicy;
  sopTemplateHints: string[];
  examples: ScenarioCardExample[];
  notes: string;
}

const CARDS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../knowledge/scenario-cards");

/** Original 6 hand-written cards (never overwritten by batch generation). */
export const LEGACY_CARD_FILES = [
  "f001-inbound-label-identify.json",
  "inbound-package-exception-relabel-shelving.json",
  "inbound-photo-hold.json",
  "t1-inbound-package-barcode-batch-relabel.json",
  "t3-inbound-third-party-merchandise-barcode.json",
  "inbound-aplus-direct-shelve.json",
] as const;

let cached: ScenarioCard[] | null = null;
let legacyOnly = false;

function isCard(value: unknown): value is ScenarioCard {
  if (!value || typeof value !== "object") return false;
  const card = value as ScenarioCard;
  return Boolean(card.sceneKey && card.sceneName && card.status && card.positiveSignals && card.negativeSignals);
}

/**
 * Load scenario cards from knowledge/scenario-cards/*.json.
 * Retired dedicated-atom cards are omitted unless `includeRetired`.
 */
export function clearScenarioCardsCache(): void {
  cached = null;
}

/** A/B eval: only the original 6 cards. Call clear+reload after toggling. */
export function setLegacyCardsOnly(on: boolean): void {
  legacyOnly = on;
  cached = null;
}

export function isLegacyCardsOnly(): boolean {
  return legacyOnly;
}

function isActiveCard(card: ScenarioCard): boolean {
  return card.status !== "retired_dedicated_atom";
}

export function loadScenarioCards(cardsDir = CARDS_DIR, options?: { includeRetired?: boolean }): ScenarioCard[] {
  const includeRetired = Boolean(options?.includeRetired);
  if (cached && cardsDir === CARDS_DIR && !includeRetired) return cached;
  if (!existsSync(cardsDir)) return [];
  const cards = readdirSync(cardsDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !legacyOnly || (LEGACY_CARD_FILES as readonly string[]).includes(name))
    .map((name) => {
      const raw = JSON.parse(readFileSync(join(cardsDir, name), "utf8"));
      return isCard(raw) ? raw : null;
    })
    .filter((card): card is ScenarioCard => Boolean(card))
    .filter((card) => includeRetired || isActiveCard(card));
  if (cardsDir === CARDS_DIR && !includeRetired) cached = cards;
  return cards;
}

export function findScenarioCard(sceneKey: string): ScenarioCard | undefined {
  const cards = loadScenarioCards();
  const exact = cards.find((card) => card.sceneKey === sceneKey);
  if (exact) return exact;
  return cards.find((card) => {
    const aliases = (card as ScenarioCard & { aliases?: { sceneKeys?: string[] } }).aliases?.sceneKeys || [];
    return aliases.includes(sceneKey);
  });
}

const SCENE_QUERY_FILLER =
  /帮我找|帮我|请帮|找一下|找一找|搜索|的场景|场景|一下|请问|看看|哪个|那个|是不是|有没有/g;

export function normalizeSceneQuery(raw: string): string {
  return String(raw || "")
    .replace(/@_user_\d+/g, " ")
    .replace(/@\S+/g, " ")
    .replace(SCENE_QUERY_FILLER, " ")
    .replace(/[？?！!。．.，,、]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cardMatchesCategory(card: ScenarioCard, category?: SceneCategory | ""): boolean {
  if (!category) return true;
  const cat = String(card.category || "").toLowerCase();
  return cat === category || card.sceneKey.startsWith(`${category}_`);
}

function aliasNamesOf(card: ScenarioCard): string[] {
  const aliases = (card as ScenarioCard & { aliases?: { kbNames?: string[]; sceneKeys?: string[] } }).aliases;
  return [...(aliases?.kbNames || []), ...(aliases?.sceneKeys || [])].map((item) => String(item));
}

/**
 * Keyword search over scenario cards. Highest score first, max 5.
 * Prefer sceneName hits; strong/weak signals are secondary.
 */
export function searchSceneByKeyword(
  keyword: string,
  options?: { category?: SceneCategory | ""; limit?: number },
): SceneCandidate[] {
  const query = normalizeSceneQuery(keyword);
  if (query.length < 2) return [];
  const limit = options?.limit ?? 5;
  const results: Array<{ card: ScenarioCard; score: number }> = [];

  for (const card of loadScenarioCards()) {
    if (!cardMatchesCategory(card, options?.category)) continue;
    let score = 0;
    const names = [card.sceneName, ...aliasNamesOf(card)];
    if (names.some((name) => name.includes(query))) score += 10;
    for (const signal of card.positiveSignals?.strong || []) {
      const s = String(signal || "");
      if (s.length < 2) continue;
      if (s.includes(query) || (query.includes(s) && s.length >= 3)) score += 5;
    }
    for (const signal of card.positiveSignals?.weak || []) {
      const s = String(signal || "");
      if (s.length < 2) continue;
      if (s.includes(query) || (query.includes(s) && s.length >= 3)) score += 2;
    }
    if (score > 0) results.push({ card, score });
  }

  return results
    .sort((a, b) => b.score - a.score || a.card.sceneName.localeCompare(b.card.sceneName, "zh"))
    .slice(0, limit)
    .map((row, i) => ({
      index: i + 1,
      sceneKey: row.card.sceneKey,
      sceneName: row.card.sceneName.replace(/^[§\d.]+\s*/, "").trim(),
    }));
}

/** Supported matching cards with no OMS 场景概述 code — write SOP without selecting a scene. */
export function supportedCardsMissingOmsSceneCode(): ScenarioCard[] {
  return loadScenarioCards().filter((card) => !String(card.omsSceneCode || "").trim());
}
