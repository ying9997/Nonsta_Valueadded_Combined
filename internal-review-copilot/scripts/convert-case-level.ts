/**
 * Convert case_level 入库 JSON → OMS-shaped details.json for runPipeline.
 *
 * Round 2: require EB + non-empty RD; quality flags; no sceneOverviewNames in customerIntent.
 *
 * Usage:
 *   npx tsx internal-review-copilot/scripts/convert-case-level.ts \
 *     --input workspace/_runs/20260908_case_level_exploration_v2/by_flow/case_level_dataset_入库.json \
 *     --scenes "20250407004,20250407008,20250522001" \
 *     --require-eb \
 *     --out _runs/20260908_3scene_build_v2
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import type { JsonRecord } from "../lib/types.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

type SceneAlias = "F-001" | "A" | "B";

interface SceneSpec {
  code: string;
  alias: SceneAlias;
  sceneKey: string;
  nameNeedle: string;
}

const SCENE_SPECS: SceneSpec[] = [
  {
    code: "20250407004",
    alias: "F-001",
    sceneKey: "inbound_label_identify",
    nameNeedle: "尺重/标签辨识后换标上架",
  },
  {
    code: "20250407008",
    alias: "A",
    sceneKey: "inbound_package_exception_relabel_shelving",
    nameNeedle: "包裹类异常换商品标签上架",
  },
  {
    code: "20250522001",
    alias: "B",
    sceneKey: "inbound_photo_hold",
    nameNeedle: "指定商品拍照暂存",
  },
];

/** OMS sceneOverviewNames noise — not the three target scenes. */
const SUSPECT_SCENE_KEYWORDS = ["新单上架", "关联第三方", "覆盖指定", "直接上架"];

function matchScene(names: string[], allowedCodes: Set<string>): SceneSpec | null {
  const blob = names.join(" | ");
  for (const spec of SCENE_SPECS) {
    if (!allowedCodes.has(spec.code)) continue;
    if (blob.includes(spec.code) || blob.includes(spec.nameNeedle)) return spec;
  }
  return null;
}

function pickForVasc<T extends { vascNo?: string }>(rows: T[], vascNo: string): T[] {
  return rows.filter((row) => asText(row.vascNo) === vascNo);
}

function firstText(rows: Array<Record<string, unknown>>, key: string): string {
  for (const row of rows) {
    const v = asText(row[key]);
    if (v) return v;
  }
  return "";
}

function isConversationAvailable(raw: string, status: string): boolean {
  if (status === "not_found") return false;
  const t = raw.trim();
  if (!t) return false;
  if (t === "not_found" || t.startsWith("not_found")) return false;
  return true;
}

function looksLikeRejectOnly(rd: string): boolean {
  const t = rd.trim();
  if (!t) return true;
  // 以其他 VASC 号开头的退回/重提引用
  if (/^VASC\d{6,}/i.test(t)) return true;
  if (/^因.*退回|^退回原因|^驳回/.test(t)) return true;
  return false;
}

function collectQualityFlags(params: {
  sceneNames: string[];
  requirementDescription: string;
  vascNo: string;
}): string[] {
  const flags: string[] = [];
  const nameBlob = params.sceneNames.join(" | ");
  for (const kw of SUSPECT_SCENE_KEYWORDS) {
    if (nameBlob.includes(kw)) {
      flags.push(`suspect_scene_keyword:${kw}`);
    }
  }
  if (looksLikeRejectOnly(params.requirementDescription)) {
    flags.push("suspect_rd_reject_or_empty");
  }
  // 需求描述过短且不像操作说明
  if (params.requirementDescription.trim().length > 0 && params.requirementDescription.trim().length < 8) {
    flags.push("suspect_rd_too_short");
  }
  return [...new Set(flags)];
}

/**
 * Build OMS detail. customerIntent sources = BEOR + VAS_ATTR_REL_RD only.
 * sceneOverviewName stays on atom metadata — never copied into RD/BEOR.
 */
function buildOmsDetail(params: {
  caseRec: JsonRecord;
  vascNo: string;
  scene: SceneSpec;
  sceneName: string;
  qualityFlag: string[];
}): JsonRecord {
  const { caseRec, vascNo, scene, sceneName, qualityFlag } = params;
  const reqDescs = asArray(caseRec.requirementDescriptions).map(asRecord);
  const reqBgs = asArray(caseRec.requirementBackgrounds).map(asRecord);
  const submitted = asArray(caseRec.submittedFields).map(asRecord);
  const uploaded = asArray(caseRec.uploadedAttachments).map(asRecord);
  const ebNos = asArray(caseRec.ebNos).map((x) => asText(x)).filter(Boolean);
  const wiNos = asArray(caseRec.wiNos).map((x) => asText(x)).filter(Boolean);

  const reqForVasc = pickForVasc(reqDescs, vascNo);
  const bgForVasc = pickForVasc(reqBgs, vascNo);
  const fieldsForVasc = pickForVasc(submitted, vascNo).filter(
    (f) => asText(f.inputNode) === "SUBMIT" || !asText(f.inputNode),
  );
  const filesForVasc = pickForVasc(uploaded, vascNo).filter((f) => {
    const node = asText(f.inputNode);
    const ver = asText(f.verification);
    return node === "SUBMIT" && (ver === "verified" || !ver);
  });

  // Customer-authored only — never sceneOverviewNames / audit notes.
  let requirementDescription =
    firstText(reqForVasc, "requirementDescription") || firstText(reqDescs, "requirementDescription");
  let requirementBackground =
    firstText(bgForVasc, "requirementBackground") || firstText(reqBgs, "requirementBackground");

  // Prefer SUBMIT field values for RD/BEOR when present (still customer form fields).
  for (const f of fieldsForVasc) {
    const key = asText(f.fieldKey);
    const value = asText(f.fieldValue);
    if (!value) continue;
    if (key === "VAS_ATTR_REL_RD" || key === "需求描述") requirementDescription = value;
    if (key === "BEOR" || key === "需求背景说明") requirementBackground = value;
  }

  const vaAtomAttrs: JsonRecord[] = [];
  if (requirementBackground) {
    vaAtomAttrs.push({
      attributeKey: "BEOR",
      attributeKeyOriginal: "BEOR",
      attributeName: "需求背景说明",
      attributeValue: requirementBackground,
      attributeValueOriginal: requirementBackground,
    });
  }
  if (requirementDescription) {
    vaAtomAttrs.push({
      attributeKey: "VAS_ATTR_REL_RD",
      attributeKeyOriginal: "VAS_ATTR_REL_RD",
      attributeName: "需求描述",
      attributeValue: requirementDescription,
      attributeValueOriginal: requirementDescription,
    });
  }

  const fieldSeen = new Set<string>(["BEOR", "VAS_ATTR_REL_RD", "需求描述", "需求背景说明"]);
  for (const f of fieldsForVasc) {
    const key = asText(f.fieldKey);
    const name = asText(f.fieldName);
    const value = asText(f.fieldValue);
    if (!key || !value || fieldSeen.has(key)) continue;
    // Skip audit-side noise fields if present
    if (/退回|驳回|审核备注|reject/i.test(key) || /退回|驳回|审核备注/.test(name)) continue;
    fieldSeen.add(key);
    vaAtomAttrs.push({
      attributeKey: key,
      attributeKeyOriginal: key,
      attributeName: name || key,
      attributeValue: value,
      attributeValueOriginal: value,
    });
  }

  if (!fieldSeen.has("VAS_ATTR_REL_NWEON") && wiNos.length) {
    vaAtomAttrs.push({
      attributeKey: "VAS_ATTR_REL_NWEON",
      attributeKeyOriginal: "VAS_ATTR_REL_NWEON",
      attributeName: "上架入库单号",
      attributeValue: wiNos[0],
      attributeValueOriginal: wiNos[0],
    });
  }

  const vaAtomFiles = filesForVasc.map((f) => ({
    fileType: asText(f.attributeKey) || asText(f.attachmentType),
    fileName: asText(f.attachmentName) || asText(f.fileName) || "attachment",
  }));

  const serviceCode =
    asText(asArray(caseRec.serviceCodes)[0]) ||
    asText(filesForVasc[0]?.serviceCode) ||
    "OW01V1602";

  const conversationRaw = asText(caseRec.conversationRaw);
  const conversationStatus = asText(caseRec.conversationRawStatus);
  const conversationAvailable = isConversationAvailable(conversationRaw, conversationStatus);
  const customerIntent = [requirementBackground, requirementDescription].filter(Boolean).join("\n");

  return {
    orderNo: vascNo,
    listHeader: {
      orderNo: vascNo,
      warehouseCode: "",
      warehouseName: "",
      customerCode: "",
      customerName: "",
      vaSource: "case_level",
      createdby: "",
      vasc: {
        productCode: "VASC202411192246131",
        productName: "入库非标增值（特批）",
      },
      businessOrder: {
        businessNo: wiNos[0] || "",
        childBusinessOrders: wiNos.slice(1).map((no) => ({ businessNo: no })),
      },
    },
    atoms: [
      {
        serviceCode: serviceCode.includes("OW01") ? serviceCode : "OW01V1602",
        serviceName: "入库其他服务需求",
        // OMS metadata only — must NOT feed customerIntent
        sceneOverviewCode: scene.code,
        sceneOverviewName: sceneName || `【入库】${scene.nameNeedle}`,
        vaAtomAttrs,
        vaAtomFiles,
      },
    ],
    events: ebNos.map((eventNo) => ({ eventNo, businessNo: eventNo })),
    errors: [],
    conversationAvailable,
    conversationRaw: conversationAvailable ? conversationRaw : "",
    qualityFlag: qualityFlag.length ? qualityFlag : null,
    _caseMeta: {
      caseId: asText(caseRec.caseId),
      expectedSceneAlias: scene.alias,
      expectedSceneKey: scene.sceneKey,
      expectedSceneCode: scene.code,
      expectedSceneName: sceneName || `【入库】${scene.nameNeedle}`,
      customerIntentPreview: customerIntent,
      conversationAvailable,
      conversationRaw: conversationAvailable ? conversationRaw : "",
      conversationRawStatus: conversationStatus || (conversationAvailable ? "ok" : "not_found"),
      qualityFlag,
      sceneOverviewNames: asArray(caseRec.sceneOverviewNames).map((x) => asText(x)),
      vascNos: asArray(caseRec.vascNos).map((x) => asText(x)),
      ebNos,
    },
  };
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] || 0) + 1;
}

function main(): void {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const inputPath = resolve(
    projectRoot,
    arg("input") ||
      "workspace/_runs/20260908_case_level_exploration_v2/by_flow/case_level_dataset_入库.json",
  );
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260908_3scene_build_v2");
  const scenesArg = arg("scenes") || "20250407004,20250407008,20250522001";
  const allowedCodes = new Set(
    scenesArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  // Round 2 hard default: require EB unless explicitly disabled
  const requireEb = !hasFlag("no-require-eb");

  if (!existsSync(inputPath)) {
    console.error(`input not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const cases = (Array.isArray(raw) ? raw : asArray(raw.cases)).map(asRecord);

  const filterReasons: Record<string, number> = {};
  const sceneHitBeforeFilter: Record<string, number> = { "F-001": 0, A: 0, B: 0 };
  const details: JsonRecord[] = [];
  const flaggedLines: string[] = [];
  const statsClean: Record<string, number> = { "F-001": 0, A: 0, B: 0 };
  const statsFlagged: Record<string, number> = { "F-001": 0, A: 0, B: 0 };
  let convMissing = 0;
  let convOk = 0;
  let sceneMatchedCases = 0;

  for (const caseRec of cases) {
    const names = asArray(caseRec.sceneOverviewNames).map((x) => asText(x)).filter(Boolean);
    const scene = matchScene(names, allowedCodes);
    if (!scene) {
      bump(filterReasons, "not_three_scene");
      continue;
    }
    sceneMatchedCases += 1;
    bump(sceneHitBeforeFilter, scene.alias);

    const ebNos = asArray(caseRec.ebNos).map((x) => asText(x)).filter(Boolean);
    if (requireEb && ebNos.length === 0) {
      bump(filterReasons, "no_eb");
      continue;
    }

    const sceneName =
      names.find((n) => n.includes(scene.nameNeedle) || n.includes(scene.code)) || names[0] || "";
    const vascNos = asArray(caseRec.vascNos)
      .map((x) => asText(x))
      .filter(Boolean);
    const targets = vascNos.length ? vascNos : [];

    if (!targets.length) {
      bump(filterReasons, "no_vasc");
      continue;
    }

    for (const vascNo of targets) {
      const reqDescs = asArray(caseRec.requirementDescriptions).map(asRecord);
      const reqForVasc = pickForVasc(reqDescs, vascNo);
      let rd =
        firstText(reqForVasc, "requirementDescription") || firstText(reqDescs, "requirementDescription");
      for (const f of pickForVasc(asArray(caseRec.submittedFields).map(asRecord), vascNo)) {
        const key = asText(f.fieldKey);
        const value = asText(f.fieldValue);
        if ((key === "VAS_ATTR_REL_RD" || key === "需求描述") && value) rd = value;
      }

      if (!rd.trim()) {
        bump(filterReasons, "empty_requirement_description");
        continue;
      }

      const qualityFlag = collectQualityFlags({
        sceneNames: names,
        requirementDescription: rd,
        vascNo,
      });

      const detail = buildOmsDetail({
        caseRec,
        vascNo,
        scene,
        sceneName,
        qualityFlag,
      });

      const meta = asRecord(detail._caseMeta);
      if (meta.conversationAvailable) convOk += 1;
      else convMissing += 1;

      if (qualityFlag.length) {
        bump(statsFlagged, scene.alias);
        flaggedLines.push(
          JSON.stringify({
            orderNo: vascNo,
            caseId: asText(caseRec.caseId),
            expectedScene: scene.alias,
            qualityFlag,
            sceneOverviewNames: names,
            requirementDescriptionPreview: rd.slice(0, 200),
            ebNos,
            reason: "flagged_not_sampled",
          }),
        );
        // Keep in details.json for audit, but mark qualityFlag
        details.push(detail);
      } else {
        bump(statsClean, scene.alias);
        details.push(detail);
      }
    }
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "details.json"), `${JSON.stringify(details, null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "flagged-cases.jsonl"),
    flaggedLines.length ? `${flaggedLines.join("\n")}\n` : "",
    "utf8",
  );

  const cleanCount = details.filter((d) => {
    const q = (d as { qualityFlag?: unknown }).qualityFlag;
    return !q || (Array.isArray(q) && q.length === 0);
  }).length;
  const flaggedCount = details.length - cleanCount;

  const md: string[] = [];
  md.push("# convert-summary（Round 2）");
  md.push("");
  md.push(`- 生成时间: ${new Date().toISOString()}`);
  md.push(`- 输入: \`${inputPath}\``);
  md.push(`- 输出: \`${outDir}\``);
  md.push(`- requireEb: ${requireEb}`);
  md.push(`- allowedScenes: ${[...allowedCodes].join(", ")}`);
  md.push("");
  md.push("## 过滤漏斗");
  md.push("");
  md.push(`| 阶段 | 数量 |`);
  md.push(`|------|-----:|`);
  md.push(`| case 总数 | ${cases.length} |`);
  md.push(`| 命中三场景（case） | ${sceneMatchedCases} |`);
  md.push(`| 通过过滤写入 details（VASC 展开） | ${details.length} |`);
  md.push(`| 其中 clean（可抽样） | ${cleanCount} |`);
  md.push(`| 其中 flagged（保留不抽样） | ${flaggedCount} |`);
  md.push("");
  md.push("## 过滤原因分布（未写入或跳过的次数）");
  md.push("");
  md.push("| 原因 | 次数 |");
  md.push("|------|-----:|");
  for (const [k, v] of Object.entries(filterReasons).sort((a, b) => b[1] - a[1])) {
    md.push(`| ${k} | ${v} |`);
  }
  if (!Object.keys(filterReasons).length) md.push("| (无) | 0 |");
  md.push("");
  md.push("## 三场景命中（过滤前，case 级）");
  md.push("");
  for (const [k, v] of Object.entries(sceneHitBeforeFilter)) md.push(`- ${k}: ${v}`);
  md.push("");
  md.push("## details 按场景（VASC 级）");
  md.push("");
  md.push("| 场景 | clean | flagged |");
  md.push("|------|------:|--------:|");
  for (const alias of ["F-001", "A", "B"] as const) {
    md.push(`| ${alias} | ${statsClean[alias] || 0} | ${statsFlagged[alias] || 0} |`);
  }
  md.push("");
  md.push("## 群聊上下文");
  md.push("");
  md.push(`- conversationAvailable=true: ${convOk}`);
  md.push(`- conversationAvailable=false: ${convMissing}`);
  md.push(`- 缺失比例: ${details.length ? ((convMissing / details.length) * 100).toFixed(1) : 0}%`);
  md.push("");
  md.push("## customerIntent 约束");
  md.push("");
  md.push("- 仅由 requirementBackground + requirementDescription 构成");
  md.push("- 不包含 sceneOverviewNames / sceneName / 审核备注 / 退回原因");
  md.push("- sceneCode/sceneName 仅写在 atom OMS 元数据");

  writeFileSync(resolve(outDir, "convert-summary.md"), `${md.join("\n")}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "convert-summary.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        inputPath,
        outDir,
        requireEb,
        caseTotal: cases.length,
        sceneMatchedCases,
        detailCount: details.length,
        cleanCount,
        flaggedCount,
        filterReasons,
        sceneHitBeforeFilter,
        statsClean,
        statsFlagged,
        conversation: { ok: convOk, missing: convMissing },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        detailCount: details.length,
        cleanCount,
        flaggedCount,
        filterReasons,
        statsClean,
        statsFlagged,
      },
      null,
      2,
    ),
  );
}

main();
