/**
 * Write suggested requiredFieldKeys onto generated scenario cards.
 *
 *   npx tsx internal-review-copilot/scripts/update-cards-attachment.ts --dry-run
 *   npx tsx internal-review-copilot/scripts/update-cards-attachment.ts --apply
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clearScenarioCardsCache, type ScenarioCard } from "../lib/scenario-cards.ts";

interface SceneStatLite {
  sceneKey: string;
  fileName: string;
  legacy: boolean;
  orderCount: number;
  applyKeys: string[];
  existingRequired: string[];
  sampleInsufficient: boolean;
  noCacheOrders: boolean;
}

interface StatsFile {
  scenes: SceneStatLite[];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function sameKeys(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((k, i) => k === right[i]);
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const statsPath = resolve(projectRoot, arg("stats") || "_runs/20260911_attachment_stats/stats.json");
  const cardsDir = resolve(
    projectRoot,
    arg("cards") || "internal-review-copilot/knowledge/scenario-cards",
  );
  const apply = hasFlag("apply");
  const dryRun = hasFlag("dry-run") || !apply;
  if (apply && dryRun && hasFlag("dry-run")) {
    throw new Error("不要同时传 --dry-run 和 --apply");
  }

  if (!existsSync(statsPath)) {
    throw new Error(`先跑 batch-attachment-stats.ts，找不到 ${statsPath}`);
  }
  const stats = JSON.parse(readFileSync(statsPath, "utf8")) as StatsFile;

  const actions: Array<{
    sceneKey: string;
    fileName: string;
    action: "update" | "skip_legacy" | "skip_small_n" | "skip_no_keys" | "skip_unchanged";
    before: string[];
    after: string[];
    orderCount: number;
    reason: string;
  }> = [];

  for (const scene of stats.scenes) {
    const before = scene.existingRequired || [];
    if (scene.legacy) {
      actions.push({
        sceneKey: scene.sceneKey,
        fileName: scene.fileName,
        action: "skip_legacy",
        before,
        after: before,
        orderCount: scene.orderCount,
        reason: "旧人工卡只对照不覆盖",
      });
      continue;
    }
    if (scene.sampleInsufficient || scene.noCacheOrders) {
      actions.push({
        sceneKey: scene.sceneKey,
        fileName: scene.fileName,
        action: "skip_small_n",
        before,
        after: before,
        orderCount: scene.orderCount,
        reason: scene.noCacheOrders ? "缓存无单" : `订单数 ${scene.orderCount} < 5`,
      });
      continue;
    }
    const after = scene.applyKeys || [];
    if (!after.length) {
      actions.push({
        sceneKey: scene.sceneKey,
        fileName: scene.fileName,
        action: "skip_no_keys",
        before,
        after: before,
        orderCount: scene.orderCount,
        reason: "没有可写入的建议必填（pipeline 可校验）",
      });
      continue;
    }
    if (sameKeys(before, after)) {
      actions.push({
        sceneKey: scene.sceneKey,
        fileName: scene.fileName,
        action: "skip_unchanged",
        before,
        after,
        orderCount: scene.orderCount,
        reason: "requiredFieldKeys 已一致",
      });
      continue;
    }
    actions.push({
      sceneKey: scene.sceneKey,
      fileName: scene.fileName,
      action: "update",
      before,
      after,
      orderCount: scene.orderCount,
      reason: `n=${scene.orderCount} 写入 ${after.join(", ")}`,
    });
  }

  const toUpdate = actions.filter((a) => a.action === "update");
  console.log(`mode=${apply ? "apply" : "dry-run"} stats=${statsPath}`);
  console.log(`would-update=${toUpdate.length} skip-legacy=${actions.filter((a) => a.action === "skip_legacy").length} skip-small=${actions.filter((a) => a.action === "skip_small_n").length} skip-no-keys=${actions.filter((a) => a.action === "skip_no_keys").length} unchanged=${actions.filter((a) => a.action === "skip_unchanged").length}`);
  for (const row of actions.filter((a) => a.action === "update" || a.action === "skip_legacy")) {
    console.log(
      `${row.action === "update" ? "UPDATE" : "KEEP "} ${row.sceneKey}  ${JSON.stringify(row.before)} → ${JSON.stringify(row.after)}  (${row.reason})`,
    );
  }

  const previewPath = resolve(projectRoot, arg("out") || "_runs/20260911_attachment_stats");
  mkdirSync(previewPath, { recursive: true });
  writeFileSync(
    join(previewPath, apply ? "apply-result.json" : "dry-run.json"),
    `${JSON.stringify({ mode: apply ? "apply" : "dry-run", actions }, null, 2)}\n`,
    "utf8",
  );

  if (!apply) {
    console.log(`dry-run 明细：${join(previewPath, "dry-run.json")}`);
    return;
  }

  const backupDir = join(previewPath, "backup-scenario-cards");
  mkdirSync(backupDir, { recursive: true });
  cpSync(cardsDir, backupDir, { recursive: true });
  console.log(`backup → ${backupDir}`);

  let written = 0;
  for (const row of toUpdate) {
    const file = join(cardsDir, row.fileName);
    const card = JSON.parse(readFileSync(file, "utf8")) as ScenarioCard;
    card.requiredAttachmentPolicy.requiredFieldKeys = row.after;
    card.requiredAttachmentPolicy.note = `auto-generated from OMS stats n=${row.orderCount} window=2026-04-21~2026-09-03; requiredFieldKeys from appearance>=70% and nonempty>=50%. Source _runs/20260911_attachment_stats.`;
    writeFileSync(file, `${JSON.stringify(card, null, 2)}\n`, "utf8");
    written += 1;
  }
  clearScenarioCardsCache();
  console.log(`applied ${written} cards → ${cardsDir}`);
}

main();
