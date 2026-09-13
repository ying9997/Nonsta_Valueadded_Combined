/**
 * Count SUBMIT attribute fill rates per scenario card (by omsSceneCode).
 *
 *   npx tsx internal-review-copilot/scripts/batch-attachment-stats.ts
 *
 * Writes `_runs/20260911_attachment_stats/` by default.
 * Overlay real uploads: --files _runs/20260911_attachment_stats/_oms_files/files.csv
 *   npx tsx internal-review-copilot/scripts/batch-attachment-stats.ts --out _runs/20260911_attachment_stats/from-files
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ATTACHMENT_BY_FILE_TYPE } from "../lib/oms-adapter.ts";
import { LEGACY_CARD_FILES, type ScenarioCard } from "../lib/scenario-cards.ts";

const DATE_FROM = "2026-04-21";
const DATE_TO = "2026-09-03";
const MIN_REQUIRED_APPEARANCE = 0.7;
const MIN_REQUIRED_NONEMPTY = 0.5;
const MIN_OPTIONAL_APPEARANCE = 0.3;
const MIN_ORDERS = 5;

const FORM_TEXT_KEYS = new Set(["BEOR", "VAS_ATTR_REL_RD"]);
const APPLYABLE_KEYS = new Set([
  ...Object.keys(ATTACHMENT_BY_FILE_TYPE),
  "VAS_ATTR_REL_NWEON",
  "NSVASTN",
  "CEO_SOA",
]);

export interface KeyStat {
  attributeKey: string;
  attributeName: string;
  presentOrders: number;
  nonemptyOrders: number;
  appearance: number;
  nonemptyRate: number;
  suggestion: "required" | "optional" | "skip" | "form_text" | "insufficient";
}

export interface SceneStat {
  sceneKey: string;
  sceneName: string;
  omsSceneCode: string;
  fileName: string;
  legacy: boolean;
  orderCount: number;
  atomCount: number;
  keys: KeyStat[];
  suggestedRequired: string[];
  suggestedOptional: string[];
  applyKeys: string[];
  existingRequired: string[];
  diffOnlyStats: string[];
  diffOnlyCard: string[];
  sampleInsufficient: boolean;
  noCacheOrders: boolean;
}

export interface StatsFile {
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  source: string;
  rules: {
    minRequiredAppearance: number;
    minRequiredNonEmpty: number;
    minOptionalAppearance: number;
    minOrders: number;
  };
  scenes: SceneStat[];
  noCode: Array<{ sceneKey: string; sceneName: string; fileName: string }>;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.length));
}

function csvObjects(path: string): Record<string, string>[] {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const header = rows[0] || [];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";
    return obj;
  });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function mdCell(value: string): string {
  return String(value || "").replace(/\|/g, "/").replace(/\n/g, " ");
}

function suggestKey(appearance: number, nonempty: number, key: string, orderCount: number): KeyStat["suggestion"] {
  if (orderCount < MIN_ORDERS) return "insufficient";
  if (FORM_TEXT_KEYS.has(key)) return "form_text";
  if (appearance >= MIN_REQUIRED_APPEARANCE && nonempty >= MIN_REQUIRED_NONEMPTY) return "required";
  // 空表单槽（几乎每单都有 key、几乎没值）不算「可选」
  if (appearance >= MIN_OPTIONAL_APPEARANCE && nonempty >= 0.1) return "optional";
  return "skip";
}

function loadCards(cardsDir: string): Array<ScenarioCard & { fileName: string }> {
  return readdirSync(cardsDir)
    .filter((name) => name.endsWith(".json"))
    .map((fileName) => {
      const raw = JSON.parse(readFileSync(join(cardsDir, fileName), "utf8")) as ScenarioCard;
      return { ...raw, fileName };
    });
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const cacheDir = resolve(projectRoot, arg("oms-cache") || "_runs/20260909_inbound_scene_probe/_oms_cache");
  const cardsDir = resolve(
    projectRoot,
    arg("cards") || "internal-review-copilot/knowledge/scenario-cards",
  );
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260911_attachment_stats");
  const filesPath = resolve(
    projectRoot,
    arg("files") || "_runs/20260911_attachment_stats/_oms_files/files.csv",
  );
  const atomsPath = join(cacheDir, "atoms.csv");
  const attrsPath = join(cacheDir, "attrs_submit.csv");
  if (!existsSync(atomsPath) || !existsSync(attrsPath)) {
    throw new Error(`OMS 缓存不存在: ${cacheDir}`);
  }
  const FILE_NONEMPTY_KEYS = new Set([...Object.keys(ATTACHMENT_BY_FILE_TYPE), "CEO_SOA"]);

  const cards = loadCards(cardsDir);
  const legacyFiles = new Set<string>(LEGACY_CARD_FILES);
  const atoms = csvObjects(atomsPath);
  const attrs = csvObjects(attrsPath).filter((row) => (row.input_node || "SUBMIT") === "SUBMIT");

  const atomsByCode = new Map<string, Array<{ atomId: string; orderNo: string }>>();
  for (const row of atoms) {
    const code = row.scene_overview_code || "";
    const list = atomsByCode.get(code) || [];
    list.push({ atomId: row.atom_id, orderNo: row.order_no });
    atomsByCode.set(code, list);
  }

  const attrsByAtom = new Map<string, Array<{ orderNo: string; key: string; name: string; value: string }>>();
  for (const row of attrs) {
    const atomId = row.va_atom_id;
    const list = attrsByAtom.get(atomId) || [];
    list.push({
      orderNo: row.order_no,
      key: row.attribute_key,
      name: row.attribute_name,
      value: (row.attribute_value || "").trim(),
    });
    attrsByAtom.set(atomId, list);
  }

  const filesByAtom = new Map<string, Array<{ orderNo: string; key: string; name: string }>>();
  let filesUsed = 0;
  if (existsSync(filesPath)) {
    for (const row of csvObjects(filesPath)) {
      const key = (row.attribute_key || row.file_type || "").trim();
      if (!key) continue;
      const node = (row.input_node || "").toUpperCase();
      if (node === "FINISH") continue;
      if (node !== "SUBMIT" && !FILE_NONEMPTY_KEYS.has(key)) continue;
      const atomId = row.va_atom_id;
      const list = filesByAtom.get(atomId) || [];
      list.push({
        orderNo: row.order_no,
        key,
        name: row.attribute_name || ATTACHMENT_BY_FILE_TYPE[key] || key,
      });
      filesByAtom.set(atomId, list);
      filesUsed += 1;
    }
  }

  mkdirSync(join(outDir, "per-scene"), { recursive: true });

  const scenes: SceneStat[] = [];
  const noCode: StatsFile["noCode"] = [];

  for (const card of cards) {
    const code = (card.omsSceneCode || "").trim();
    if (!code) {
      noCode.push({ sceneKey: card.sceneKey, sceneName: card.sceneName, fileName: card.fileName });
      continue;
    }

    const sceneAtoms = atomsByCode.get(code) || [];
    const orderSet = new Set(sceneAtoms.map((a) => a.orderNo));
    const atomSet = new Set(sceneAtoms.map((a) => a.atomId));
    const orderCount = orderSet.size;

    const present = new Map<string, Set<string>>();
    const nonempty = new Map<string, Set<string>>();
    const names = new Map<string, string>();
    for (const atom of sceneAtoms) {
      for (const attr of attrsByAtom.get(atom.atomId) || []) {
        names.set(attr.key, attr.name);
        const p = present.get(attr.key) || new Set();
        p.add(attr.orderNo);
        present.set(attr.key, p);
        if (attr.value) {
          const e = nonempty.get(attr.key) || new Set();
          e.add(attr.orderNo);
          nonempty.set(attr.key, e);
        }
      }
      for (const file of filesByAtom.get(atom.atomId) || []) {
        names.set(file.key, file.name || names.get(file.key) || file.key);
        const p = present.get(file.key) || new Set();
        p.add(file.orderNo);
        present.set(file.key, p);
        const e = nonempty.get(file.key) || new Set();
        e.add(file.orderNo);
        nonempty.set(file.key, e);
      }
    }

    const keys: KeyStat[] = [...present.entries()]
      .map(([attributeKey, orders]) => {
        const presentN = orders.size;
        const nonemptyN = nonempty.get(attributeKey)?.size || 0;
        const appearance = orderCount ? presentN / orderCount : 0;
        const nonemptyRate = orderCount ? nonemptyN / orderCount : 0;
        return {
          attributeKey,
          attributeName: names.get(attributeKey) || attributeKey,
          presentOrders: presentN,
          nonemptyOrders: nonemptyN,
          appearance,
          nonemptyRate,
          suggestion: suggestKey(appearance, nonemptyRate, attributeKey, orderCount),
        };
      })
      .sort((a, b) => b.appearance - a.appearance || b.nonemptyRate - a.nonemptyRate);

    const suggestedRequired = keys.filter((k) => k.suggestion === "required").map((k) => k.attributeKey);
    const suggestedOptional = keys.filter((k) => k.suggestion === "optional").map((k) => k.attributeKey);
    const applyKeys =
      orderCount >= MIN_ORDERS
        ? suggestedRequired.filter((k) => APPLYABLE_KEYS.has(k))
        : [];
    const existingRequired = card.requiredAttachmentPolicy?.requiredFieldKeys || [];
    const statsSet = new Set(suggestedRequired);
    const cardSet = new Set(existingRequired);

    const stat: SceneStat = {
      sceneKey: card.sceneKey,
      sceneName: card.sceneName,
      omsSceneCode: code,
      fileName: card.fileName,
      legacy: legacyFiles.has(card.fileName),
      orderCount,
      atomCount: atomSet.size,
      keys,
      suggestedRequired,
      suggestedOptional,
      applyKeys,
      existingRequired,
      diffOnlyStats: suggestedRequired.filter((k) => !cardSet.has(k)),
      diffOnlyCard: existingRequired.filter((k) => !statsSet.has(k)),
      sampleInsufficient: orderCount < MIN_ORDERS,
      noCacheOrders: orderCount === 0,
    };
    scenes.push(stat);
  }

  scenes.sort((a, b) => a.sceneName.localeCompare(b.sceneName, "zh"));
  noCode.sort((a, b) => a.sceneName.localeCompare(b.sceneName, "zh"));

  const payload: StatsFile = {
    generatedAt: new Date().toISOString(),
    dateFrom: DATE_FROM,
    dateTo: DATE_TO,
    source: `${cacheDir}/attrs_submit.csv + atoms.csv + ${existsSync(filesPath) ? filesPath : "(no files.csv)"}`,
    rules: {
      minRequiredAppearance: MIN_REQUIRED_APPEARANCE,
      minRequiredNonEmpty: MIN_REQUIRED_NONEMPTY,
      minOptionalAppearance: MIN_OPTIONAL_APPEARANCE,
      minOrders: MIN_ORDERS,
    },
    scenes,
    noCode,
  };
  writeFileSync(join(outDir, "stats.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  for (const scene of scenes) {
    const rows = scene.keys.map((k) => {
      const advice =
        k.suggestion === "required"
          ? "必填"
          : k.suggestion === "optional"
            ? "可选"
            : k.suggestion === "form_text"
              ? "表单正文，不作为附件门"
              : k.suggestion === "insufficient"
                ? "待验证"
                : "不列入";
      return `| ${mdCell(k.attributeKey)} | ${mdCell(k.attributeName)} | ${pct(k.appearance)} (${k.presentOrders}/${scene.orderCount}) | ${pct(k.nonemptyRate)} (${k.nonemptyOrders}/${scene.orderCount}) | ${advice} |`;
    });
    const md = [
      `# 附件统计：${scene.sceneName}`,
      "",
      `- sceneKey：\`${scene.sceneKey}\``,
      `- omsSceneCode：\`${scene.omsSceneCode}\``,
      `- 订单数：${scene.orderCount}（原子 ${scene.atomCount}）`,
      `- 旧人工卡：${scene.legacy ? "是（只对照，不覆盖）" : "否"}`,
      scene.noCacheOrders ? "- 本窗 OMS 缓存没有该码的订单" : "",
      scene.sampleInsufficient && !scene.noCacheOrders ? `- 样本 < ${MIN_ORDERS}，不自动填必填` : "",
      "",
      "| attributeKey | attributeName | 出现率 | 非空率 | 建议 |",
      "|-------------|---------------|-------|-------|------|",
      ...(rows.length ? rows : ["| （无 SUBMIT 属性） | - | - | - | - |"]),
      "",
      "## 建议必填 / 可选",
      "",
      `- 建议必填：${scene.suggestedRequired.join(", ") || "（无）"}`,
      `- 建议可选：${scene.suggestedOptional.join(", ") || "（无）"}`,
      `- 可写入 requiredFieldKeys（pipeline 能校验）：${scene.applyKeys.join(", ") || "（无）"}`,
      `- 卡上现有 requiredFieldKeys：${scene.existingRequired.join(", ") || "（空）"}`,
      "",
    ]
      .filter((line) => line !== "")
      .join("\n");
    writeFileSync(join(outDir, "per-scene", `${scene.sceneKey}.md`), `${md}\n`, "utf8");
  }

  const withRequired = scenes.filter((s) => s.suggestedRequired.length > 0);
  const legacy = scenes.filter((s) => s.legacy);
  const summaryRows = scenes.map((s, i) => {
    const verify = s.sampleInsufficient ? (s.noCacheOrders ? "缓存无单" : `n=${s.orderCount}<5`) : "";
    return `| ${i + 1} | ${mdCell(s.sceneName)} | ${mdCell(s.omsSceneCode)} | ${s.orderCount} | ${s.suggestedRequired.join(", ") || ""} | ${s.suggestedOptional.join(", ") || ""} | ${verify} |`;
  });

  const legacyDiff = legacy.map((s) => {
    const same = s.diffOnlyStats.length === 0 && s.diffOnlyCard.length === 0;
    return [
      `### ${s.sceneName} (\`${s.sceneKey}\`)`,
      "",
      `- 订单数：${s.orderCount}`,
      `- 卡上 requiredFieldKeys：${s.existingRequired.join(", ") || "（空）"}`,
      `- 统计建议必填：${s.suggestedRequired.join(", ") || "（无）"}`,
      same
        ? "- 差异：**一致**"
        : `- 差异：统计多出 \`${s.diffOnlyStats.join(", ") || "无"}\`；卡上多出 \`${s.diffOnlyCard.join(", ") || "无"}\`。**不覆盖旧卡。**`,
      s.keys
        .filter((k) => APPLYABLE_KEYS.has(k.attributeKey) || s.existingRequired.includes(k.attributeKey))
        .map(
          (k) =>
            `  - ${k.attributeKey}（${k.attributeName}）出现率 ${pct(k.appearance)} / 非空率 ${pct(k.nonemptyRate)} → ${k.suggestion}`,
        )
        .join("\n"),
      "",
    ].join("\n");
  });

  const allMd = [
    "# 全场景附件必填规则统计",
    "",
    "## 统计口径",
    "",
    `- 数据窗口：${DATE_FROM} ~ ${DATE_TO}`,
    `- 数据源：\`${payload.source}\``,
    "- 只统计 `inputNode=SUBMIT`",
    `- 判断规则：出现率 ≥ ${MIN_REQUIRED_APPEARANCE * 100}% **且** 非空率 ≥ ${MIN_REQUIRED_NONEMPTY * 100}% → 建议必填；出现率 ≥ ${MIN_OPTIONAL_APPEARANCE * 100}% 且非空率 ≥ 10%（但未达必填）→ 建议可选；空表单槽（有 key 无值）不列入`,
    `- 场景订单数 < ${MIN_ORDERS} → 待验证，不自动填`,
    "- 出现率 = 有该 key 的订单数 / 该场景总订单数；文本字段非空率 = attributeValue 非空；**附件非空率 = `oms_va_execute_file` 在 SUBMIT 有真实文件**（不看空槽）",
    "- 附件白名单：`VAS_ATTR_REL_LF` / `AOOI` / `TCRBCAL` / `TRPP` / `VSS` / `CEO_SOA`。FINISH 文件（如结果照片 RDP）不计入提交必填。",
    `- 文件表：${existsSync(filesPath) ? `\`${filesPath}\`（SUBMIT 行 ${filesUsed}）` : "未提供，附件非空仍会接近 0"}`,
    "- `BEOR` / `VAS_ATTR_REL_RD` 是需求正文，不算附件门。",
    `- 有 OMS 码场景：${scenes.length}；其中建议必填 ≥1 项：${withRequired.length}；无码：${noCode.length}`,
    "",
    "## 汇总",
    "",
    "| # | 场景名 | omsSceneCode | 订单数 | 建议必填 | 建议可选 | 待验证 |",
    "|---|--------|-------------|-------|---------|---------|--------|",
    ...summaryRows,
    "",
    "## 6 张旧卡对照（只标注，不覆盖）",
    "",
    ...legacyDiff,
    "",
    "## 无 OMS 码的场景（无法按码统计）",
    "",
    "| 场景名 | sceneKey | 说明 |",
    "|--------|----------|------|",
    ...noCode.map((c) => `| ${mdCell(c.sceneName)} | \`${c.sceneKey}\` | 无 omsSceneCode |`),
    "",
    "## 写入规则（给 update-cards-attachment.ts）",
    "",
    "- 只把 pipeline 能校验的建议必填写入 `requiredFieldKeys`：附件白名单 + `VAS_ATTR_REL_NWEON` + `NSVASTN`",
    "- 旧 6 张卡不写；n<5 不写",
    "",
  ].join("\n");
  writeFileSync(join(outDir, "attachment-rules-all.md"), allMd, "utf8");

  console.log(
    JSON.stringify(
      {
        out: outDir,
        cards: cards.length,
        withCode: scenes.length,
        noCode: noCode.length,
        withSuggestedRequired: withRequired.length,
        applyEligible: scenes.filter((s) => !s.legacy && s.applyKeys.length > 0).length,
        filesCsv: existsSync(filesPath) ? filesPath : "",
        submitFileRows: filesUsed,
      },
      null,
      2,
    ),
  );
}

main();
