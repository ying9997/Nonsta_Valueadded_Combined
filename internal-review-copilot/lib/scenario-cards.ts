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
  status: "simulated_pending_business_confirmation" | "pending_business_confirmation";
  enforcement: "simulated_only" | "none";
  omsWhitelistFieldKeys: string[];
  simulatedRequiredFieldKeys: string[];
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

let cached: ScenarioCard[] | null = null;

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
export function loadScenarioCards(cardsDir = CARDS_DIR): ScenarioCard[] {
  if (cached && cardsDir === CARDS_DIR) return cached;
  if (!existsSync(cardsDir)) return [];
  const cards = readdirSync(cardsDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const raw = JSON.parse(readFileSync(join(cardsDir, name), "utf8"));
      return isCard(raw) ? raw : null;
    })
    .filter((card): card is ScenarioCard => Boolean(card));
  if (cardsDir === CARDS_DIR) cached = cards;
  return cards;
}

export function findScenarioCard(sceneKey: string): ScenarioCard | undefined {
  return loadScenarioCards().find((card) => card.sceneKey === sceneKey);
}
