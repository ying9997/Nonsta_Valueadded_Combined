/**
 * Pick 40 already-audited orders for L2.5 pass-test (TOP 15 scenes, 2–3 each).
 *
 *   npx tsx internal-review-copilot/scripts/sample-pass-test.ts
 *
 * Writes _runs/20260915_pass_test/test-set.json + details.json + test-set-summary.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { bindContext } from "../lib/context-bind.ts";
import { checkCompleteness } from "../lib/check-completeness.ts";
import { ALLOWED_SERVICE_CODES, ATTACHMENT_BY_FILE_TYPE, buildAgentInput } from "../lib/oms-adapter.ts";
import { projectDir } from "../lib/env.ts";
import { findScenarioCard, loadScenarioCards, type ScenarioCard } from "../lib/scenario-cards.ts";
import type { JsonRecord, MatchResult } from "../lib/types.ts";

const OMS_CACHE_DEFAULT = "_runs/20260909_inbound_scene_probe/_oms_cache";
const CHAT_MAIN_DEFAULT = "_runs/20260909_inbound_scene_probe/three_chat_full_window.json";
const CHAT_GAP_DEFAULT = "workspace/_runs/20260909_three_chat_gap_0801_0903/three_chat_gap_discussions_filtered.json";
const FILES_DEFAULT = "_runs/20260911_attachment_stats/_oms_files/files.csv";
const MIN_RD_CHARS = 30;
const TARGET_N = 40;
const TOP_SCENES = 15;
const PER_SCENE_MIN = 2;
const PER_SCENE_MAX = 3;
const EB_RE = /EB\d{6,}/gi;
const WI_RE = /WI\d{6,}/gi;
const VASC_RE = /VASC\d{6,}/gi;
const REQ_DESC_KEYS = new Set(["VAS_ATTR_REL_RD", "需求描述"]);
const REQ_BG_KEYS = new Set(["BEOR", "需求背景说明", "需求背景"]);
const FILE_KEYS = new Set([...Object.keys(ATTACHMENT_BY_FILE_TYPE), "CEO_SOA"]);

type Category = "inbound" | "instock" | "other";
type ExpectedPath = "sop_generated" | "needs_field_clarification" | "transfer_human";

interface AttrRow {
  key: string;
  name: string;
  value: string;
}

interface FileRow {
  fileType: string;
  fileName: string;
}

interface SceneHit {
  sceneKey: string;
  sceneName: string;
  category: Category;
  omsSceneCode: string;
}

interface Candidate {
  orderNo: string;
  sceneKey: string;
  sceneName: string;
  category: Category;
  omsSceneCode: string;
  omsSceneName: string;
  serviceCode: string;
  warehouseName: string;
  customerName: string;
  status: string;
  auditTime: string;
  hasEb: boolean;
  hasChat: boolean;
  fileCount: number;
  rd: string;
  bg: string;
  rdLen: number;
  ebs: string[];
  wis: string[];
  expectedPath: ExpectedPath;
  expectedNote: string;
  missingRequired: string[];
  detail: JsonRecord;
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
          i++;
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
  if (!existsSync(path)) return [];
  const rows = parseCsv(readFileSync(path, "utf8"));
  const header = rows[0] || [];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";
    return obj;
  });
}

function nonempty(v: string): boolean {
  const s = (v || "").trim();
  return Boolean(s) && s.toUpperCase() !== "NULL" && s !== "-" && s !== "无";
}

function usableOmsCode(code: string): boolean {
  const c = (code || "").trim();
  if (!c || c === "pending_oms_code") return false;
  if (/[【】]/.test(c) || /\s/.test(c)) return false;
  return true;
}

function cardCategory(card: ScenarioCard): Category {
  if (card.category === "inbound" || card.category === "instock") return card.category;
  return "other";
}

function indexTokens(blob: string, vasc: Set<string>, eb: Set<string>): void {
  for (const m of blob.match(VASC_RE) || []) vasc.add(m.toUpperCase());
  for (const m of blob.match(EB_RE) || []) eb.add(m.toUpperCase());
}

function loadChatIndex(paths: string[]): { vasc: Set<string>; eb: Set<string> } {
  const vasc = new Set<string>();
  const eb = new Set<string>();
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    const rows = Array.isArray(raw) ? raw : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const blob = Object.values(row as Record<string, unknown>)
        .filter((v) => v != null && typeof v !== "object")
        .join("\n");
      indexTokens(blob, vasc, eb);
    }
  }
  return { vasc, eb };
}

function pickText(attrs: AttrRow[], keys: Set<string>): string {
  const parts: string[] = [];
  for (const a of attrs) {
    if (keys.has(a.key) || keys.has(a.name)) {
      if (nonempty(a.value) && !parts.includes(a.value)) parts.push(a.value);
    }
  }
  return parts.join("\n");
}

function uniqueNos(blob: string, re: RegExp): string[] {
  return [...new Set((blob.match(re) || []).map((m) => m.toUpperCase()))];
}

function cmpPick(a: Candidate, b: Candidate): number {
  if (a.hasChat !== b.hasChat) return a.hasChat ? -1 : 1;
  if (a.rdLen !== b.rdLen) return b.rdLen - a.rdLen;
  if (a.fileCount !== b.fileCount) return b.fileCount - a.fileCount;
  return b.orderNo.localeCompare(a.orderNo);
}

function parentOf(id: string, parent: Map<string, string>): string {
  let cur = id;
  while (parent.get(cur) && parent.get(cur) !== cur) {
    const next = parent.get(cur) as string;
    parent.set(cur, parent.get(next) || next);
    cur = parent.get(cur) as string;
  }
  if (!parent.has(cur)) parent.set(cur, cur);
  return cur;
}

function union(a: string, b: string, parent: Map<string, string>): void {
  const pa = parentOf(a, parent);
  const pb = parentOf(b, parent);
  if (pa !== pb) parent.set(pa, pb);
}

function buildDetail(params: {
  order: Record<string, string>;
  atom: Record<string, string>;
  attrs: AttrRow[];
  files: FileRow[];
  ebs: string[];
  wis: string[];
  scene: SceneHit;
  rd: string;
  bg: string;
  hasChat: boolean;
}): JsonRecord {
  const { order, atom, attrs, files, ebs, wis, scene, rd, bg, hasChat } = params;
  const vaAtomAttrs = attrs.map((a) => ({
    attributeKey: a.key || a.name,
    attributeKeyOriginal: a.key || a.name,
    attributeName: a.name || a.key,
    attributeValue: a.value,
    attributeValueOriginal: a.value,
  }));
  const inbound = scene.category === "inbound";
  return {
    orderNo: order.order_no,
    listHeader: {
      orderNo: order.order_no,
      warehouseCode: order.warehouse_code || "",
      warehouseName: order.warehouse_name || "",
      customerCode: order.customer_code || "",
      customerName: order.customer_name || "",
      vaSource: order.va_source || "",
      businessType: inbound ? "INBOUND" : scene.category === "instock" ? "INHOUSE" : "",
      businessTypeDesc: inbound ? "入库订单" : scene.category === "instock" ? "库内订单" : "",
      isAuditThrough: "Y",
      vasc: {
        productCode: order.product_code || "",
        productName: order.product_name || "",
      },
      businessOrder: {
        businessNo: wis[0] || "",
        childBusinessOrders: wis.slice(1, 6).map((w) => ({ businessNo: w })),
      },
    },
    atoms: [
      {
        serviceCode: atom.service_code || "",
        serviceName: atom.service_name || "",
        sceneOverviewCode: atom.scene_overview_code || "",
        sceneOverviewName: atom.scene_overview_name || "",
        vaAtomAttrs,
        vaAtomFiles: files,
      },
    ],
    events: ebs.map((eb) => ({ eventNo: eb, businessNo: eb })),
    errors: [],
    _sample: {
      sceneKey: scene.sceneKey,
      sceneName: scene.sceneName,
      category: scene.category,
      omsSceneCode: scene.omsSceneCode,
      approved: true,
      hasEb: ebs.length > 0,
      hasChat,
      rdLen: rd.length,
      rdPreview: rd.slice(0, 180),
      bgPreview: bg.slice(0, 120),
    },
  };
}

function expectedFromDetail(detail: JsonRecord, scene: SceneHit): { path: ExpectedPath; note: string; missing: string[] } {
  const card = findScenarioCard(scene.sceneKey);
  if (!card || card.status !== "supported") {
    return { path: "transfer_human", note: "场景卡未 supported，预期 L2 转人工", missing: [] };
  }
  const built = buildAgentInput(detail);
  if (!built) {
    return { path: "transfer_human", note: "缓存详情拼不出 Agent 输入", missing: [] };
  }
  const { contextFacts } = bindContext(built.input);
  const att = checkCompleteness(contextFacts, {
    supported: true,
    sceneKey: scene.sceneKey,
    scenarioName: scene.sceneName,
    decision: "supported",
    confidence: "high",
    reason: "oms-fact",
  } as MatchResult);
  if (att.complete) {
    return { path: "sop_generated", note: "已审通过且当前必填附件/WI 在缓存里齐", missing: [] };
  }
  const missing = [
    ...att.missingAttachments,
    ...att.missingFields.map((f) => f.field),
  ];
  return {
    path: "needs_field_clarification",
    note: `OMS 事实仍缺：${missing.join("、") || "完整性未过"}`,
    missing,
  };
}

function main(): void {
  const root = projectDir();
  const outDir = resolve(root, arg("out", "_runs/20260915_pass_test"));
  const omsCache = resolve(root, arg("oms-cache", OMS_CACHE_DEFAULT));
  const chatMain = resolve(root, arg("chat", CHAT_MAIN_DEFAULT));
  const chatGap = resolve(root, arg("chat-gap", CHAT_GAP_DEFAULT));
  const filesPath = resolve(root, arg("files", FILES_DEFAULT));

  const cards = loadScenarioCards();
  const byCode = new Map<string, SceneHit[]>();
  for (const card of cards) {
    const code = (card.omsSceneCode || "").trim();
    if (!usableOmsCode(code)) continue;
    const list = byCode.get(code) || [];
    list.push({
      sceneKey: card.sceneKey,
      sceneName: card.sceneName,
      category: cardCategory(card),
      omsSceneCode: code,
    });
    byCode.set(code, list);
  }

  function resolveHit(code: string, omsName: string): SceneHit | null {
    const list = byCode.get(code);
    if (!list?.length) return null;
    if (list.length === 1) return list[0];
    const name = (omsName || "").replace(/\s+/g, "");
    return list.find((h) => h.sceneName.replace(/\s+/g, "") === name) || list[0];
  }

  const orders = csvObjects(resolve(omsCache, "orders.csv"));
  const atoms = csvObjects(resolve(omsCache, "atoms.csv"));
  const attrs = csvObjects(resolve(omsCache, "attrs_submit.csv"));
  const files = csvObjects(filesPath);
  const chatIndex = loadChatIndex([chatMain, chatGap]);

  const atomsByOrder = new Map<string, Record<string, string>[]>();
  for (const a of atoms) {
    if (!a.order_no) continue;
    const list = atomsByOrder.get(a.order_no) || [];
    list.push(a);
    atomsByOrder.set(a.order_no, list);
  }
  const attrsByAtom = new Map<string, AttrRow[]>();
  const attrsByOrder = new Map<string, AttrRow[]>();
  for (const a of attrs) {
    const row: AttrRow = {
      key: (a.attribute_key || "").trim(),
      name: (a.attribute_name || "").trim(),
      value: (a.attribute_value || "").trim(),
    };
    if (!nonempty(row.value)) continue;
    const orderNo = a.order_no;
    if (!attrsByOrder.has(orderNo)) attrsByOrder.set(orderNo, []);
    attrsByOrder.get(orderNo)!.push(row);
    const atomId = String(a.va_atom_id || "");
    if (atomId) {
      if (!attrsByAtom.has(atomId)) attrsByAtom.set(atomId, []);
      attrsByAtom.get(atomId)!.push(row);
    }
  }
  const filesByOrder = new Map<string, FileRow[]>();
  for (const f of files) {
    const node = (f.input_node || "").toUpperCase();
    if (node && node !== "SUBMIT") continue;
    const fileType = (f.file_type || f.attribute_key || "").trim();
    const fileName = (f.file_name || "").trim();
    if (!fileType && !fileName) continue;
    const no = f.order_no;
    if (!filesByOrder.has(no)) filesByOrder.set(no, []);
    filesByOrder.get(no)!.push({ fileType, fileName });
  }

  const stats = {
    orders: orders.length,
    approved: 0,
    allowed: 0,
    rdTooShort: 0,
    noEb: 0,
    noFile: 0,
    unmapped: 0,
    pool: 0,
    ebDupDropped: 0,
  };

  const raw: Candidate[] = [];
  for (const order of orders) {
    const orderNo = order.order_no;
    if (!orderNo) continue;
    if ((order.is_audit_through || "").toUpperCase() !== "Y") continue;
    stats.approved += 1;
    const orderAtoms = (atomsByOrder.get(orderNo) || []).filter((a) => ALLOWED_SERVICE_CODES.has(a.service_code));
    if (!orderAtoms.length) continue;
    stats.allowed += 1;
    const mappedAtom =
      orderAtoms.find((a) => resolveHit(a.scene_overview_code || "", a.scene_overview_name || "")) || null;
    if (!mappedAtom) {
      stats.unmapped += 1;
      continue;
    }
    const scene = resolveHit(mappedAtom.scene_overview_code || "", mappedAtom.scene_overview_name || "");
    if (!scene) {
      stats.unmapped += 1;
      continue;
    }
    const atomId = String(mappedAtom.atom_id || "");
    const atomAttrs = (atomId && attrsByAtom.get(atomId)) || attrsByOrder.get(orderNo) || [];
    const rd = pickText(atomAttrs, REQ_DESC_KEYS);
    if (rd.length < MIN_RD_CHARS) {
      stats.rdTooShort += 1;
      continue;
    }
    const bg = pickText(atomAttrs, REQ_BG_KEYS);
    const blob = atomAttrs.map((a) => a.value).join("\n");
    const ebs = uniqueNos(blob, EB_RE);
    if (!ebs.length) {
      stats.noEb += 1;
      continue;
    }
    const fileRows = filesByOrder.get(orderNo) || [];
    const attrHasFile = atomAttrs.some((a) => FILE_KEYS.has(a.key) && nonempty(a.value));
    if (!fileRows.length && !attrHasFile) {
      stats.noFile += 1;
      continue;
    }
    const wis = uniqueNos(
      [blob, pickText(atomAttrs, new Set(["VAS_ATTR_REL_NWEON", "上架入库单号", "NSVASTN"]))].join("\n"),
      WI_RE,
    );
    const hasChat = chatIndex.vasc.has(orderNo.toUpperCase()) || ebs.some((eb) => chatIndex.eb.has(eb));
    const detail = buildDetail({
      order,
      atom: mappedAtom,
      attrs: atomAttrs,
      files: fileRows,
      ebs,
      wis,
      scene,
      rd,
      bg,
      hasChat,
    });
    const expected = expectedFromDetail(detail, scene);
    raw.push({
      orderNo,
      sceneKey: scene.sceneKey,
      sceneName: scene.sceneName,
      category: scene.category,
      omsSceneCode: scene.omsSceneCode,
      omsSceneName: mappedAtom.scene_overview_name || "",
      serviceCode: mappedAtom.service_code || "",
      warehouseName: order.warehouse_name || "",
      customerName: order.customer_name || "",
      status: order.status || "",
      auditTime: order.actual_audit_time || "",
      hasEb: true,
      hasChat,
      fileCount: fileRows.length,
      rd,
      bg,
      rdLen: rd.length,
      ebs,
      wis,
      expectedPath: expected.path,
      expectedNote: expected.note,
      missingRequired: expected.missing,
      detail,
    });
  }
  stats.pool = raw.length;

  const parent = new Map<string, string>();
  for (const c of raw) parent.set(c.orderNo, c.orderNo);
  const byEb = new Map<string, string[]>();
  for (const c of raw) {
    for (const eb of c.ebs) {
      const list = byEb.get(eb) || [];
      list.push(c.orderNo);
      byEb.set(eb, list);
    }
  }
  for (const nos of byEb.values()) {
    for (let i = 1; i < nos.length; i++) union(nos[0], nos[i], parent);
  }
  const groups = new Map<string, Candidate[]>();
  for (const c of raw) {
    const root = parentOf(c.orderNo, parent);
    const list = groups.get(root) || [];
    list.push(c);
    groups.set(root, list);
  }
  const deduped: Candidate[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => {
      if (a.auditTime !== b.auditTime) return (b.auditTime || "").localeCompare(a.auditTime || "");
      return b.orderNo.localeCompare(a.orderNo);
    });
    deduped.push(list[0]);
    stats.ebDupDropped += list.length - 1;
  }

  const poolByScene = new Map<string, Candidate[]>();
  for (const c of deduped) {
    const list = poolByScene.get(c.sceneKey) || [];
    list.push(c);
    poolByScene.set(c.sceneKey, list);
  }
  for (const list of poolByScene.values()) list.sort(cmpPick);

  const sceneRank = [...poolByScene.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const top = sceneRank.slice(0, TOP_SCENES).map(([key]) => key);

  const quota = new Map<string, number>();
  for (const key of top) quota.set(key, Math.min(PER_SCENE_MIN, poolByScene.get(key)?.length || 0));
  let total = [...quota.values()].reduce((s, n) => s + n, 0);
  const grow = [...top].sort((a, b) => (poolByScene.get(b)?.length || 0) - (poolByScene.get(a)?.length || 0));
  for (const key of grow) {
    if (total >= TARGET_N) break;
    const have = quota.get(key) || 0;
    const cap = Math.min(PER_SCENE_MAX, poolByScene.get(key)?.length || 0);
    if (have >= cap) continue;
    quota.set(key, have + 1);
    total += 1;
  }
  if (total < TARGET_N) {
    for (const [key, list] of sceneRank) {
      if (total >= TARGET_N) break;
      if (top.includes(key)) continue;
      const take = Math.min(PER_SCENE_MIN, list.length, TARGET_N - total);
      if (!take) continue;
      top.push(key);
      quota.set(key, take);
      total += take;
    }
  }

  const picked: Candidate[] = [];
  for (const key of top) {
    const need = quota.get(key) || 0;
    picked.push(...(poolByScene.get(key) || []).slice(0, need));
  }
  picked.sort((a, b) => a.sceneKey.localeCompare(b.sceneKey) || cmpPick(a, b));

  mkdirSync(outDir, { recursive: true });
  const testSet = picked.map((c, i) => ({
    i: i + 1,
    orderNo: c.orderNo,
    sceneKey: c.sceneKey,
    sceneName: c.sceneName,
    category: c.category,
    omsSceneCode: c.omsSceneCode,
    warehouseName: c.warehouseName,
    fileCount: c.fileCount,
    rdLen: c.rdLen,
    hasChat: c.hasChat,
    ebs: c.ebs,
    expectedPath: c.expectedPath,
    expectedNote: c.expectedNote,
    missingRequired: c.missingRequired,
  }));
  writeFileSync(resolve(outDir, "test-set.json"), `${JSON.stringify(testSet, null, 2)}\n`, "utf8");
  writeFileSync(resolve(outDir, "details.json"), `${JSON.stringify(picked.map((c) => c.detail), null, 2)}\n`, "utf8");

  const byExpected = {
    sop_generated: picked.filter((c) => c.expectedPath === "sop_generated").length,
    needs_field_clarification: picked.filter((c) => c.expectedPath === "needs_field_clarification").length,
    transfer_human: picked.filter((c) => c.expectedPath === "transfer_human").length,
  };
  const summary = [
    "# 已审核通过测试集",
    "",
    "- 口径：`is_audit_through=Y`，服务码 OW01V1602 / OSF6V1603 / OSF6V1841，有 EB，需求描述 ≥ 30 字，有附件，同一 EB 只留最终通过的 VASC",
    `- OMS 缓存：\`${OMS_CACHE_DEFAULT}\``,
    `- 目标 ${TARGET_N} 条 / TOP ${TOP_SCENES} 场景 / 每场景 ${PER_SCENE_MIN}～${PER_SCENE_MAX} 条`,
    `- 实抽 **${picked.length}** 条，覆盖 **${new Set(picked.map((c) => c.sceneKey)).size}** 个场景`,
    "- 预期出口按 OMS 事实（改卡后的 requiredFieldKeys + WI），不是 pipeline 预测",
    "",
    "## 池子",
    "",
    `| 项 | 数量 |`,
    `|----|-----:|`,
    `| OMS 订单 | ${stats.orders} |`,
    `| 已审核通过 | ${stats.approved} |`,
    `| 三类服务码 | ${stats.allowed} |`,
    `| 需求过短 | ${stats.rdTooShort} |`,
    `| 无 EB | ${stats.noEb} |`,
    `| 无附件 | ${stats.noFile} |`,
    `| 无场景码映射 | ${stats.unmapped} |`,
    `| 合格池 | ${stats.pool} |`,
    `| 同 EB 去重丢掉 | ${stats.ebDupDropped} |`,
    `| 去重后 | ${deduped.length} |`,
    "",
    "## 预期出口",
    "",
    `| 预期 | 条数 |`,
    `|------|-----:|`,
    `| L4 sop_generated | ${byExpected.sop_generated} |`,
    `| L2.5 needs_field_clarification | ${byExpected.needs_field_clarification} |`,
    `| L2 transfer_human | ${byExpected.transfer_human} |`,
    "",
    "## 场景配额",
    "",
    "| 场景 | 池子 | 抽到 |",
    "|------|-----:|-----:|",
    ...top.map((key) => {
      const name = poolByScene.get(key)?.[0]?.sceneName || key;
      return `| ${name.replace(/\|/g, "/")} | ${poolByScene.get(key)?.length || 0} | ${picked.filter((c) => c.sceneKey === key).length} |`;
    }),
    "",
    "## 测试单",
    "",
    "| # | VASC | 场景 | 业务段 | 附件数 | 需求描述长度 | 有群聊 | 预期出口 |",
    "|---|------|------|--------|--------|-----------|--------|---------|",
    ...picked.map((c, i) => {
      const label =
        c.expectedPath === "sop_generated" ? "L4" : c.expectedPath === "needs_field_clarification" ? "L2.5" : "L2";
      return `| ${i + 1} | ${c.orderNo} | ${c.sceneName.replace(/\|/g, "/")} | ${c.category} | ${c.fileCount} | ${c.rdLen} | ${c.hasChat ? "是" : ""} | ${label} |`;
    }),
    "",
  ].join("\n");
  writeFileSync(resolve(outDir, "test-set-summary.md"), `${summary}\n`, "utf8");

  console.log(`pass-test set n=${picked.length} scenes=${new Set(picked.map((c) => c.sceneKey)).size} → ${outDir}`);
  console.log(`expected L4=${byExpected.sop_generated} L2.5=${byExpected.needs_field_clarification} L2=${byExpected.transfer_human}`);
}

main();
