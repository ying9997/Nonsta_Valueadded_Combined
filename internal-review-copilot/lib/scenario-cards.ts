import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type ScenarioCardStatus = "supported" | "candidate_supported" | "pending_evidence";

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
 * Reserved for later SOP KB / casebook retrieval: callers should treat this as the
 * catalog, not as scored hits.
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

export function loadScenarioCards(cardsDir = CARDS_DIR): ScenarioCard[] {
  if (cached && cardsDir === CARDS_DIR) return cached;
  if (!existsSync(cardsDir)) return [];
  const cards = readdirSync(cardsDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !legacyOnly || (LEGACY_CARD_FILES as readonly string[]).includes(name))
    .map((name) => {
      const raw = JSON.parse(readFileSync(join(cardsDir, name), "utf8"));
      return isCard(raw) ? raw : null;
    })
    .filter((card): card is ScenarioCard => Boolean(card));
  if (cardsDir === CARDS_DIR) cached = cards;
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
