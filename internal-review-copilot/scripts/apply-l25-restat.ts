/**
 * After batch-attachment-stats.ts: write restat tables and (with --apply)
 * drop over-strict requiredFieldKeys / requiredInfoFields.
 *
 *   npx tsx internal-review-copilot/scripts/apply-l25-restat.ts --dry-run
 *   npx tsx internal-review-copilot/scripts/apply-l25-restat.ts --apply
 *
 * Rule (scheme B): n≥5 and nonemptyRate < 70% and currently required → remove / demote.
 * Does not add new required keys. n<5: no card change.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ATTACHMENT_BY_FILE_TYPE } from "../lib/oms-adapter.ts";
import { clearScenarioCardsCache, type RequirementInfoField, type ScenarioCard } from "../lib/scenario-cards.ts";

const MIN_ORDERS = 5;
const MIN_NONEMPTY = 0.7;

interface KeyStat {
  attributeKey: string;
  attributeName: string;
  presentOrders: number;
  nonemptyOrders: number;
  appearance: number;
  nonemptyRate: number;
  suggestion: string;
}

interface SceneStat {
  sceneKey: string;
  sceneName: string;
  omsSceneCode: string;
  fileName: string;
  orderCount: number;
  keys: KeyStat[];
  existingRequired: string[];
  sampleInsufficient: boolean;
  noCacheOrders: boolean;
}

interface StatsFile {
  generatedAt: string;
  source: string;
  scenes: SceneStat[];
}

interface AttachRow {
  sceneName: string;
  omsSceneCode: string;
  orderCount: number;
  fieldKey: string;
  fieldName: string;
  nonemptyRate: number;
  nonemptyOrders: number;
  advice: string;
  diff: string;
  warn: boolean;
}

interface InfoRow {
  sceneName: string;
  sceneKey: string;
  fileName: string;
  field: string;
  required: boolean;
  frequency: string;
  pct: number | null;
  advice: string;
  change: boolean;
  skipReason: string;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function mdCell(value: string): string {
  return String(value || "").replace(/\|/g, "/").replace(/\n/g, " ");
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function frequencyPct(freq: string): number | null {
  const m = String(freq || "").match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function adviceOf(orderCount: number, nonemptyRate: number): string {
  if (orderCount < MIN_ORDERS) return "样本不足，不改";
  if (nonemptyRate >= MIN_NONEMPTY) return "必填（非空率≥70%）";
  return "可选（非空率<70%）";
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const statsPath = resolve(projectRoot, arg("stats") || "_runs/20260915_attachment_restat/stats.json");
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260915_attachment_restat");
  const cardsDir = resolve(projectRoot, arg("cards") || "internal-review-copilot/knowledge/scenario-cards");
  const backupDir = resolve(outDir, "backup-scenario-cards");
  const apply = hasFlag("apply");

  if (!existsSync(statsPath)) {
    throw new Error(`找不到 ${statsPath}，先跑 batch-attachment-stats.ts`);
  }
  const stats = JSON.parse(readFileSync(statsPath, "utf8")) as StatsFile;
  const applyable = new Set([...Object.keys(ATTACHMENT_BY_FILE_TYPE), "VAS_ATTR_REL_NWEON", "NSVASTN", "CEO_SOA"]);

  mkdirSync(outDir, { recursive: true });

  const attachRows: AttachRow[] = [];
  const infoRows: InfoRow[] = [];
  const cardUpdates: Array<{
    fileName: string;
    sceneKey: string;
    removedKeys: string[];
    demotedFields: string[];
    skipped: string;
  }> = [];

  for (const scene of stats.scenes) {
    const filePath = join(cardsDir, scene.fileName);
    if (!existsSync(filePath)) continue;
    const card = JSON.parse(readFileSync(filePath, "utf8")) as ScenarioCard;
    const existing = [...(card.requiredAttachmentPolicy?.requiredFieldKeys || [])];
    const keyStat = new Map(scene.keys.map((k) => [k.attributeKey, k]));
    const interesting = new Set([...existing, ...scene.keys.filter((k) => applyable.has(k.attributeKey)).map((k) => k.attributeKey)]);

    for (const fieldKey of interesting) {
      const k = keyStat.get(fieldKey);
      const nonemptyRate = k?.nonemptyRate ?? 0;
      const onCard = existing.includes(fieldKey);
      const advice = adviceOf(scene.orderCount, nonemptyRate);
      let diff = "当前不必填";
      let warn = false;
      if (onCard && scene.orderCount < MIN_ORDERS) {
        diff = "当前=必填；样本不足，不改";
      } else if (onCard && nonemptyRate < MIN_NONEMPTY) {
        diff = "当前=必填 ⚠ 过严";
        warn = true;
      } else if (onCard) {
        diff = "当前=必填，与统计一致";
      } else if (nonemptyRate >= MIN_NONEMPTY && scene.orderCount >= MIN_ORDERS) {
        diff = "统计达必填但本次只降不增";
      }
      attachRows.push({
        sceneName: scene.sceneName,
        omsSceneCode: scene.omsSceneCode,
        orderCount: scene.orderCount,
        fieldKey,
        fieldName: k?.attributeName || ATTACHMENT_BY_FILE_TYPE[fieldKey] || fieldKey,
        nonemptyRate,
        nonemptyOrders: k?.nonemptyOrders ?? 0,
        advice,
        diff,
        warn,
      });
    }

    const sampleSkip = scene.orderCount < MIN_ORDERS ? (scene.noCacheOrders ? "缓存无单" : `n=${scene.orderCount}<5`) : "";
    const requiredInfo = card.requiredInfoFields || [];
    const optionalInfo = card.optionalInfoFields || [];
    for (const field of [...requiredInfo, ...optionalInfo]) {
      const pctVal = frequencyPct(field.frequency || "");
      const tooStrict = Boolean(field.required) && pctVal != null && pctVal < 70;
      let advice = "保持";
      let change = false;
      if (!field.required) {
        advice = "已是可选";
      } else if (sampleSkip) {
        advice = "样本不足，不改";
      } else if (pctVal == null) {
        advice = "无 frequency，不改";
      } else if (tooStrict) {
        advice = "降为可选";
        change = true;
      }
      infoRows.push({
        sceneName: scene.sceneName,
        sceneKey: scene.sceneKey,
        fileName: scene.fileName,
        field: field.field,
        required: Boolean(field.required),
        frequency: field.frequency || "",
        pct: pctVal,
        advice,
        change,
        skipReason: sampleSkip,
      });
    }

    const removedKeys = scene.orderCount < MIN_ORDERS
      ? []
      : existing.filter((key) => (keyStat.get(key)?.nonemptyRate ?? 0) < MIN_NONEMPTY);
    const demotedFields = sampleSkip
      ? []
      : requiredInfo.filter((f) => f.required && frequencyPct(f.frequency || "") != null && (frequencyPct(f.frequency || "") as number) < 70).map((f) => f.field);

    cardUpdates.push({
      fileName: scene.fileName,
      sceneKey: scene.sceneKey,
      removedKeys,
      demotedFields,
      skipped: sampleSkip,
    });
  }

  const attachMd = [
    "# 附件规则重跑对照（非空率 + 真实上传）",
    "",
    `- 统计时间：${stats.generatedAt}`,
    `- 数据源：${stats.source}`,
    "- **出现率列 = 非空率**（attrs 有值或 files.csv 真实上传）。OMS 表单空槽的「出现」不算。",
    `- 规则：总单数 ≥ ${MIN_ORDERS} 且非空率 < ${MIN_NONEMPTY * 100}% 且当前必填 → 改为不必填。只降不增。n<5 不改。`,
    "",
    "## 过严清单（当前必填但非空率 < 70%）",
    "",
    attachRows.filter((r) => r.warn).length
      ? [
          "| 场景 | omsSceneCode | 总单数 | fieldKey | fieldName | 非空率 | 建议 | 和当前卡的差异 |",
          "|------|-------------|-------|----------|-----------|-------|------|-------------|",
          ...attachRows
            .filter((r) => r.warn)
            .map(
              (r) =>
                `| ${mdCell(r.sceneName)} | ${mdCell(r.omsSceneCode)} | ${r.orderCount} | ${mdCell(r.fieldKey)} | ${mdCell(r.fieldName)} | ${pct(r.nonemptyRate)} (${r.nonemptyOrders}/${r.orderCount}) | ${r.advice} | ${mdCell(r.diff)} |`,
            ),
        ].join("\n")
      : "无。当前必填附件在 n≥5 的场景里非空率都 ≥ 70%。",
    "",
    "## 全量对照",
    "",
    "| 场景 | omsSceneCode | 总单数 | fieldKey | fieldName | 非空率 | 建议 | 和当前卡的差异 |",
    "|------|-------------|-------|----------|-----------|-------|------|-------------|",
    ...attachRows.map(
      (r) =>
        `| ${mdCell(r.sceneName)} | ${mdCell(r.omsSceneCode)} | ${r.orderCount} | ${mdCell(r.fieldKey)} | ${mdCell(r.fieldName)} | ${pct(r.nonemptyRate)} (${r.nonemptyOrders}/${r.orderCount}) | ${r.advice} | ${mdCell(r.diff)} |`,
    ),
    "",
  ].join("\n");
  writeFileSync(join(outDir, "attachment-rules-all.md"), `${attachMd}\n`, "utf8");

  const infoMd = [
    "# requiredInfoFields 是否过严",
    "",
    "- 只读场景卡上已有 frequency，不重跑 LLM 抽取。",
    "- frequency < 70% 且 required=true → 降为可选；n<5 不改。",
    "",
    "| 场景 | field | 当前 required | frequency | 建议 | 是否需要改 |",
    "|------|-------|-------------|-----------|------|----------|",
    ...infoRows.map(
      (r) =>
        `| ${mdCell(r.sceneName)} | ${mdCell(r.field)} | ${r.required} | ${mdCell(r.frequency)} | ${r.advice} | ${r.change ? "⚠ 是" : "否"} |`,
    ),
    "",
  ].join("\n");
  writeFileSync(join(outDir, "info-fields-review.md"), `${infoMd}\n`, "utf8");

  const willChange = cardUpdates.filter((u) => u.removedKeys.length || u.demotedFields.length);
  const applyLog = [
    "# 场景卡更新日志",
    "",
    `- 模式：${apply ? "apply" : "dry-run"}`,
    `- 将改 ${willChange.length} 张卡（附件降门槛 ${cardUpdates.filter((u) => u.removedKeys.length).length}，信息降级 ${cardUpdates.filter((u) => u.demotedFields.length).length}）`,
    "",
    ...willChange.map((u) => {
      const bits = [
        u.removedKeys.length ? `附件移除 ${u.removedKeys.join(", ")}` : "",
        u.demotedFields.length ? `信息降为可选 ${u.demotedFields.join("、")}` : "",
      ].filter(Boolean);
      return `- ${u.sceneKey} (${u.fileName})：${bits.join("；")}`;
    }),
    willChange.length ? "" : "- 没有需要改的卡。",
    "",
  ].join("\n");
  writeFileSync(join(outDir, apply ? "apply-log.md" : "apply-log-dry-run.md"), `${applyLog}\n`, "utf8");

  console.log(`restat tables → ${outDir}`);
  console.log(`over-strict attachments: ${attachRows.filter((r) => r.warn).length}`);
  console.log(`info fields to demote: ${infoRows.filter((r) => r.change).length}`);

  if (!apply) {
    console.log("dry-run，未改场景卡。加 --apply 才写入。");
    return;
  }

  mkdirSync(backupDir, { recursive: true });
  for (const name of readdirSync(cardsDir).filter((n) => n.endsWith(".json"))) {
    cpSync(join(cardsDir, name), join(backupDir, name));
  }

  for (const scene of stats.scenes) {
    const upd = cardUpdates.find((u) => u.sceneKey === scene.sceneKey);
    if (!upd || (!upd.removedKeys.length && !upd.demotedFields.length)) continue;
    const filePath = join(cardsDir, scene.fileName);
    const card = JSON.parse(readFileSync(filePath, "utf8")) as ScenarioCard;
    if (upd.removedKeys.length) {
      const drop = new Set(upd.removedKeys);
      card.requiredAttachmentPolicy.requiredFieldKeys = (card.requiredAttachmentPolicy.requiredFieldKeys || []).filter(
        (k) => !drop.has(k),
      );
      const note = card.requiredAttachmentPolicy.note || "";
      const stamp = "2026-09-15 restat：非空率<70% 的必填附件已降为不必填。";
      if (!note.includes("2026-09-15 restat")) {
        card.requiredAttachmentPolicy.note = note ? `${note} ${stamp}` : stamp;
      }
    }
    if (upd.demotedFields.length) {
      const demote = new Set(upd.demotedFields);
      const keepReq: RequirementInfoField[] = [];
      const extraOpt: RequirementInfoField[] = [];
      for (const field of card.requiredInfoFields || []) {
        if (demote.has(field.field)) extraOpt.push({ ...field, required: false });
        else keepReq.push(field);
      }
      card.requiredInfoFields = keepReq;
      const seen = new Set((card.optionalInfoFields || []).map((f) => f.field));
      card.optionalInfoFields = [...(card.optionalInfoFields || [])];
      for (const field of extraOpt) {
        if (seen.has(field.field)) continue;
        card.optionalInfoFields.push(field);
      }
      const stamp = " 2026-09-15 restat：frequency<70% 的信息项已降为可选。";
      if (!card.notes.includes("2026-09-15 restat")) card.notes = `${card.notes || ""}${stamp}`.trim();
    }
    writeFileSync(filePath, `${JSON.stringify(card, null, 2)}\n`, "utf8");
  }
  clearScenarioCardsCache();
  console.log(`cards backed up → ${backupDir}`);
  console.log(`updated ${willChange.length} cards`);
}

main();
