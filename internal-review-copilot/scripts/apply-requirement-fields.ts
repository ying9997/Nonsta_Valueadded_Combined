/**
 * Write G-1 requiredInfoFields onto scenario cards (sample ≥ 5, skip retired).
 *
 *   npx tsx internal-review-copilot/scripts/apply-requirement-fields.ts
 *   npx tsx internal-review-copilot/scripts/apply-requirement-fields.ts --dry-run
 *
 * Source: `_runs/20260914_scene_requirement_fields/per-scene/*.json`
 * Backup: `_runs/20260914_scene_requirement_fields/backup-scenario-cards/`
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RequirementInfoField, ScenarioCard } from "../lib/scenario-cards.ts";

const MIN_SAMPLES = 5;

interface PerSceneFile {
  sceneKey: string;
  sampleCount?: number;
  skipReason?: string;
  requiredInfoFields?: RequirementInfoField[];
  optionalInfoFields?: RequirementInfoField[];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function cleanFields(fields: RequirementInfoField[] | undefined, required: boolean): RequirementInfoField[] {
  const out: RequirementInfoField[] = [];
  const seen = new Set<string>();
  for (const raw of fields || []) {
    const field = String(raw.field || "").trim();
    if (!field || seen.has(field)) continue;
    seen.add(field);
    out.push({
      field,
      description: String(raw.description || "").trim(),
      frequency: String(raw.frequency || "").trim() || undefined,
      examples: (raw.examples || []).map((e) => String(e || "").trim()).filter(Boolean).slice(0, 5),
      required,
    });
  }
  return out;
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const cardsDir = resolve(projectRoot, "internal-review-copilot/knowledge/scenario-cards");
  const srcDir = resolve(projectRoot, "_runs/20260914_scene_requirement_fields/per-scene");
  const backupDir = resolve(projectRoot, "_runs/20260914_scene_requirement_fields/backup-scenario-cards");
  const dryRun = hasFlag("dry-run");

  if (!existsSync(srcDir)) throw new Error(`missing G-1 per-scene dir: ${srcDir}`);

  const cardsByKey = new Map<string, { fileName: string; card: ScenarioCard }>();
  for (const fileName of readdirSync(cardsDir).filter((n) => n.endsWith(".json"))) {
    const card = JSON.parse(readFileSync(join(cardsDir, fileName), "utf8")) as ScenarioCard;
    if (card?.sceneKey) cardsByKey.set(card.sceneKey, { fileName, card });
  }

  const written: string[] = [];
  const skipped: string[] = [];

  for (const name of readdirSync(srcDir).filter((n) => n.endsWith(".json"))) {
    const src = JSON.parse(readFileSync(join(srcDir, name), "utf8")) as PerSceneFile;
    const hit = cardsByKey.get(src.sceneKey);
    if (!hit) {
      skipped.push(`${src.sceneKey} 目录里没有对应场景卡`);
      continue;
    }
    if (hit.card.status === "retired_dedicated_atom") {
      skipped.push(`${src.sceneKey} 已下线（独立原子）`);
      continue;
    }
    if (src.skipReason) {
      skipped.push(`${src.sceneKey} ${src.skipReason}`);
      continue;
    }
    const sampleCount = Number(src.sampleCount || 0);
    if (sampleCount < MIN_SAMPLES) {
      skipped.push(`${src.sceneKey} 样本 ${sampleCount} < ${MIN_SAMPLES}`);
      continue;
    }
    const required = cleanFields(src.requiredInfoFields, true);
    if (!required.length) {
      skipped.push(`${src.sceneKey} 无 requiredInfoFields`);
      continue;
    }
    const optional = cleanFields(src.optionalInfoFields, false);
    written.push(`${src.sceneKey} required=${required.length} optional=${optional.length} sample=${sampleCount}`);
    if (dryRun) continue;

    mkdirSync(backupDir, { recursive: true });
    copyFileSync(join(cardsDir, hit.fileName), join(backupDir, hit.fileName));
    const next: ScenarioCard = {
      ...hit.card,
      requiredInfoFields: required,
      optionalInfoFields: optional,
      notes: `${hit.card.notes || ""} 2026-09-14: 写入 G-1 requiredInfoFields（样本≥${MIN_SAMPLES}）。`.trim(),
    };
    writeFileSync(join(cardsDir, hit.fileName), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  const report = [
    `# apply-requirement-fields ${dryRun ? "（dry-run）" : ""}`.trim(),
    "",
    `- 写入：${written.length} 张`,
    `- 跳过：${skipped.length} 张`,
    "",
    "## 写入",
    ...written.map((line) => `- ${line}`),
    "",
    "## 跳过",
    ...skipped.map((line) => `- ${line}`),
    "",
  ];
  writeFileSync(
    resolve(projectRoot, "_runs/20260914_scene_requirement_fields/apply-requirement-fields.md"),
    `${report.join("\n")}\n`,
    "utf8",
  );
  console.log(`written=${written.length} skipped=${skipped.length} dryRun=${dryRun}`);
}

main();
