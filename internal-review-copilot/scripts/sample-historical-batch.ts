/**
 * Historical-batch first cut: sample stats + candidate list only.
 * Does not run pipeline and does not send Feishu.
 *
 *   npx tsx internal-review-copilot/scripts/sample-historical-batch.ts
 *   npx tsx internal-review-copilot/scripts/sample-historical-batch.ts --out _runs/20260914_historical_batch
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALLOWED_SERVICE_CODES } from "../lib/oms-adapter.ts";
import { projectDir } from "../lib/env.ts";
import { loadScenarioCards, type ScenarioCard } from "../lib/scenario-cards.ts";

const GOLDEN_DEFAULT = "internal-review-copilot/eval/golden/t14-golden.jsonl";
const OMS_CACHE_DEFAULT = "_runs/20260909_inbound_scene_probe/_oms_cache";
const CHAT_MAIN_DEFAULT = "_runs/20260909_inbound_scene_probe/three_chat_full_window.json";
const CHAT_GAP_DEFAULT = "workspace/_runs/20260909_three_chat_gap_0801_0903/three_chat_gap_discussions_filtered.json";
const FILES_DEFAULT = "_runs/20260911_attachment_stats/_oms_files/files.csv";
const MIN_RD_CHARS = 30;
const PER_SCENE = 2;
const PILOT_INBOUND = 10;
const PILOT_INSTOCK = 10;
const EB_RE = /EB\d{6,}/gi;
const WI_RE = /WI\d{6,}/gi;
const VASC_RE = /VASC\d{6,}/gi;
const REQ_DESC_KEYS = new Set(["VAS_ATTR_REL_RD", "需求描述"]);
const REQ_BG_KEYS = new Set(["BEOR", "需求背景说明", "需求背景"]);

type Category = "inbound" | "instock" | "other";

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
  serviceName: string;
  warehouseCode: string;
  warehouseName: string;
  productCode: string;
  productName: string;
  vaSource: string;
  status: string;
  approved: boolean;
  hasEb: boolean;
  hasChat: boolean;
  rd: string;
  bg: string;
  rdLen: number;
  ebs: string[];
  wis: string[];
  shortage: boolean;
  suggestedPilot: boolean;
  detail: Record<string, unknown>;
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

function readGoldenIds(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const ids = new Set<string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as { vascNo?: string };
      if (obj.vascNo) ids.add(obj.vascNo);
    } catch {
      /* skip */
    }
  }
  return ids;
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

function cmpCandidate(a: Candidate, b: Candidate): number {
  if (a.approved !== b.approved) return a.approved ? -1 : 1;
  if (a.hasEb !== b.hasEb) return a.hasEb ? -1 : 1;
  if (a.rdLen !== b.rdLen) return b.rdLen - a.rdLen;
  return a.orderNo.localeCompare(b.orderNo);
}

function mdEscape(s: string): string {
  return (s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
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
  approved: boolean;
  hasChat: boolean;
  shortage: boolean;
  suggestedPilot: boolean;
}): Record<string, unknown> {
  const { order, atom, attrs, files, ebs, wis, scene, rd, bg, approved, hasChat, shortage, suggestedPilot } = params;
  const vaAtomAttrs = attrs.map((a) => ({
    attributeKey: a.key || a.name,
    attributeKeyOriginal: a.key || a.name,
    attributeName: a.name || a.key,
    attributeValue: a.value,
    attributeValueOriginal: a.value,
  }));
  return {
    orderNo: order.order_no,
    listHeader: {
      orderNo: order.order_no,
      warehouseCode: order.warehouse_code || "",
      warehouseName: order.warehouse_name || "",
      customerCode: order.customer_code || "",
      customerName: order.customer_name || "",
      vaSource: order.va_source || "",
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
      approved,
      hasEb: ebs.length > 0,
      hasChat,
      rdLen: rd.length,
      rdPreview: rd.slice(0, 180),
      bgPreview: bg.slice(0, 120),
      shortage,
      suggestedPilot,
      note: "customerIntent 仅 BEOR + VAS_ATTR_REL_RD，不含场景名",
    },
  };
}

function main(): void {
  const root = projectDir();
  const outDir = resolve(root, arg("out", "_runs/20260914_historical_batch"));
  const omsCache = resolve(root, arg("oms-cache", OMS_CACHE_DEFAULT));
  const goldenPath = resolve(root, arg("golden", GOLDEN_DEFAULT));
  const chatMain = resolve(root, arg("chat", CHAT_MAIN_DEFAULT));
  const chatGap = resolve(root, arg("chat-gap", CHAT_GAP_DEFAULT));
  const filesPath = resolve(root, arg("files", FILES_DEFAULT));

  const cards = loadScenarioCards();
  const golden = readGoldenIds(goldenPath);
  const byCode = new Map<string, SceneHit[]>();
  const collisions: Array<{ code: string; keys: string[] }> = [];

  for (const card of cards) {
    const code = (card.omsSceneCode || "").trim();
    if (!usableOmsCode(code)) continue;
    const hit: SceneHit = {
      sceneKey: card.sceneKey,
      sceneName: card.sceneName,
      category: cardCategory(card),
      omsSceneCode: code,
    };
    const list = byCode.get(code) || [];
    list.push(hit);
    byCode.set(code, list);
  }
  for (const [code, list] of byCode) {
    if (list.length > 1) collisions.push({ code, keys: list.map((x) => x.sceneKey) });
  }

  function resolveHit(code: string, omsName: string): SceneHit | null {
    const list = byCode.get(code);
    if (!list?.length) return null;
    if (list.length === 1) return list[0];
    const name = (omsName || "").replace(/\s+/g, "");
    const named = list.find((h) => h.sceneName.replace(/\s+/g, "") === name);
    return named || list[0];
  }

  const orders = csvObjects(resolve(omsCache, "orders.csv"));
  const atoms = csvObjects(resolve(omsCache, "atoms.csv"));
  const attrs = csvObjects(resolve(omsCache, "attrs_submit.csv"));
  const files = csvObjects(filesPath);
  const chatIndex = loadChatIndex([chatMain, chatGap]);

  const atomsByOrder = new Map<string, Record<string, string>[]>();
  for (const a of atoms) {
    const no = a.order_no;
    if (!no) continue;
    if (!atomsByOrder.has(no)) atomsByOrder.set(no, []);
    atomsByOrder.get(no)!.push(a);
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
    const fileType = (f.file_type || f.type || "").trim();
    const fileName = (f.file_name || "").trim();
    if (!fileType && !fileName) continue;
    const no = f.order_no;
    if (!filesByOrder.has(no)) filesByOrder.set(no, []);
    filesByOrder.get(no)!.push({ fileType, fileName });
  }

  const stats = {
    orders: orders.length,
    allowedService: 0,
    goldenExcluded: 0,
    rdTooShort: 0,
    unmappedScene: 0,
    mapped: 0,
    sampled: 0,
    shortageScenes: 0,
    noCodeCards: 0,
  };

  const poolByScene = new Map<string, Candidate[]>();
  const usedOrders = new Set<string>();

  for (const order of orders) {
    const orderNo = order.order_no;
    if (!orderNo) continue;
    const orderAtoms = (atomsByOrder.get(orderNo) || []).filter((a) => ALLOWED_SERVICE_CODES.has(a.service_code));
    if (!orderAtoms.length) continue;
    stats.allowedService++;
    if (golden.has(orderNo)) {
      stats.goldenExcluded++;
      continue;
    }
    const mappedAtom =
      orderAtoms.find((a) => resolveHit(a.scene_overview_code || "", a.scene_overview_name || "")) || null;
    if (!mappedAtom) {
      stats.unmappedScene++;
      continue;
    }
    const scene = resolveHit(mappedAtom.scene_overview_code || "", mappedAtom.scene_overview_name || "");
    if (!scene) {
      stats.unmappedScene++;
      continue;
    }
    const atomId = String(mappedAtom.atom_id || "");
    const atomAttrs = (atomId && attrsByAtom.get(atomId)) || attrsByOrder.get(orderNo) || [];
    const rd = pickText(atomAttrs, REQ_DESC_KEYS);
    if (rd.length < MIN_RD_CHARS) {
      stats.rdTooShort++;
      continue;
    }
    const bg = pickText(atomAttrs, REQ_BG_KEYS);
    const blob = atomAttrs.map((a) => a.value).join("\n");
    const ebs = uniqueNos(blob, EB_RE);
    const wis = uniqueNos([blob, pickText(atomAttrs, new Set(["VAS_ATTR_REL_NWEON", "上架入库单号", "NSVASTN"]))].join("\n"), WI_RE);
    const hasChat = chatIndex.vasc.has(orderNo.toUpperCase()) || ebs.some((eb) => chatIndex.eb.has(eb));
    const approved = (order.is_audit_through || "").toUpperCase() === "Y";
    const cand: Candidate = {
      orderNo,
      sceneKey: scene.sceneKey,
      sceneName: scene.sceneName,
      category: scene.category,
      omsSceneCode: scene.omsSceneCode,
      omsSceneName: mappedAtom.scene_overview_name || "",
      serviceCode: mappedAtom.service_code || "",
      serviceName: mappedAtom.service_name || "",
      warehouseCode: order.warehouse_code || "",
      warehouseName: order.warehouse_name || "",
      productCode: order.product_code || "",
      productName: order.product_name || "",
      vaSource: order.va_source || "",
      status: order.status || "",
      approved,
      hasEb: ebs.length > 0,
      hasChat,
      rd,
      bg,
      rdLen: rd.length,
      ebs,
      wis,
      shortage: false,
      suggestedPilot: false,
      detail: {},
    };
    cand.detail = buildDetail({
      order,
      atom: mappedAtom,
      attrs: atomAttrs,
      files: filesByOrder.get(orderNo) || [],
      ebs,
      wis,
      scene,
      rd,
      bg,
      approved,
      hasChat,
      shortage: false,
      suggestedPilot: false,
    });
    stats.mapped++;
    if (!poolByScene.has(scene.sceneKey)) poolByScene.set(scene.sceneKey, []);
    poolByScene.get(scene.sceneKey)!.push(cand);
  }

  const sampled: Candidate[] = [];
  for (const list of poolByScene.values()) {
    list.sort(cmpCandidate);
    const picked = list.slice(0, PER_SCENE);
    const shortage = picked.length < PER_SCENE;
    for (const c of picked) {
      c.shortage = shortage;
      const sample = c.detail._sample as Record<string, unknown>;
      if (sample) sample.shortage = shortage;
      sampled.push(c);
      usedOrders.add(c.orderNo);
    }
  }
  stats.sampled = sampled.length;

  type CardRow = {
    sceneKey: string;
    sceneName: string;
    category: Category;
    omsSceneCode: string;
    usableCode: boolean;
    pool: number;
    sampled: number;
    shortage: boolean;
    reason: string;
  };
  const cardRows: CardRow[] = cards.map((card) => {
    const code = (card.omsSceneCode || "").trim();
    const usable = usableOmsCode(code);
    const pool = poolByScene.get(card.sceneKey)?.length || 0;
    const n = sampled.filter((c) => c.sceneKey === card.sceneKey).length;
    if (!usable) {
      stats.noCodeCards++;
      return {
        sceneKey: card.sceneKey,
        sceneName: card.sceneName,
        category: cardCategory(card),
        omsSceneCode: code,
        usableCode: false,
        pool: 0,
        sampled: 0,
        shortage: true,
        reason: "无可用OMS码",
      };
    }
    const shortage = n < PER_SCENE;
    if (shortage) stats.shortageScenes++;
    return {
      sceneKey: card.sceneKey,
      sceneName: card.sceneName,
      category: cardCategory(card),
      omsSceneCode: code,
      usableCode: true,
      pool,
      sampled: n,
      shortage,
      reason: n === 0 ? "有OMS码但合格样本为0" : n < PER_SCENE ? "样本不足" : "",
    };
  });

  const sampledScenes = (cat: Category) =>
    new Set(sampled.filter((c) => c.category === cat).map((c) => c.sceneKey)).size;
  const inboundSceneCount = sampledScenes("inbound");
  const instockSceneCount = sampledScenes("instock");

  function pickPilot(category: Category, want: number): Candidate[] {
    const byScene = new Map<string, Candidate[]>();
    for (const c of sampled.filter((x) => x.category === category)) {
      if (!byScene.has(c.sceneKey)) byScene.set(c.sceneKey, []);
      byScene.get(c.sceneKey)!.push(c);
    }
    const sceneKeys = [...byScene.keys()].sort((a, b) => {
      const aa = byScene.get(a)![0];
      const bb = byScene.get(b)![0];
      return cmpCandidate(aa, bb);
    });
    const out: Candidate[] = [];
    for (const key of sceneKeys) {
      if (out.length >= want) break;
      out.push(byScene.get(key)![0]);
    }
    return out;
  }

  let pilot = [...pickPilot("inbound", PILOT_INBOUND), ...pickPilot("instock", PILOT_INSTOCK)];
  if (pilot.length < PILOT_INBOUND + PILOT_INSTOCK) {
    const have = new Set(pilot.map((c) => c.orderNo));
    const rest = sampled.filter((c) => !have.has(c.orderNo)).sort(cmpCandidate);
    for (const c of rest) {
      if (pilot.length >= PILOT_INBOUND + PILOT_INSTOCK) break;
      pilot.push(c);
    }
  }
  const pilotSet = new Set(pilot.map((c) => c.orderNo));
  for (const c of sampled) {
    c.suggestedPilot = pilotSet.has(c.orderNo);
    const sample = c.detail._sample as Record<string, unknown>;
    if (sample) sample.suggestedPilot = c.suggestedPilot;
  }

  sampled.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.sceneKey !== b.sceneKey) return a.sceneKey.localeCompare(b.sceneKey);
    return cmpCandidate(a, b);
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "details.json"), `${JSON.stringify(sampled.map((c) => c.detail), null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "candidates.json"),
    `${JSON.stringify(
      sampled.map((c) => ({
        orderNo: c.orderNo,
        sceneKey: c.sceneKey,
        sceneName: c.sceneName,
        category: c.category,
        omsSceneCode: c.omsSceneCode,
        serviceCode: c.serviceCode,
        warehouseName: c.warehouseName,
        status: c.status,
        approved: c.approved,
        hasEb: c.hasEb,
        hasChat: c.hasChat,
        rdLen: c.rdLen,
        ebs: c.ebs,
        wis: c.wis,
        shortage: c.shortage,
        suggestedPilot: c.suggestedPilot,
      })),
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(outDir, "suggested-pilot-20.json"),
    `${JSON.stringify(
      sampled.filter((c) => c.suggestedPilot).map((c) => ({
        orderNo: c.orderNo,
        sceneKey: c.sceneKey,
        sceneName: c.sceneName,
        category: c.category,
        omsSceneCode: c.omsSceneCode,
        approved: c.approved,
        hasEb: c.hasEb,
        hasChat: c.hasChat,
        rdLen: c.rdLen,
      })),
      null,
      2,
    )}\n`,
    "utf8",
  );

  const inboundCards = cardRows.filter((c) => c.category === "inbound");
  const instockCards = cardRows.filter((c) => c.category === "instock");
  const otherCards = cardRows.filter((c) => c.category === "other");
  const acceptInbound = inboundSceneCount >= 20;
  const acceptInstock = instockSceneCount >= 15;

  const summary = [
    "# 历史跑批抽样统计（第一刀）",
    "",
    "- 时间：本机生成，**只抽样，未跑评估、未发飞书**",
    `- OMS 缓存：\`${OMS_CACHE_DEFAULT}\``,
    "- 归桶：只用场景卡上的可用 OMS 场景码；无码卡不补关键词",
    `- 过滤：服务码 ${[...ALLOWED_SERVICE_CODES].join(" / ")}；排除 t14-golden 5 条；需求描述 ≥ ${MIN_RD_CHARS} 字`,
    "- 每场景最多 2 条：已审核通过优先，其次有 EB，再取需求描述最长",
    `- 场景卡 ${cards.length} 张（入库 ${inboundCards.length} / 库内 ${instockCards.length} / 其他 ${otherCards.length}）`,
    `- 可用 OMS 码卡片 ${cards.length - stats.noCodeCards} 张；无可用 OMS 码 ${stats.noCodeCards} 张`,
    "",
    "## 池子规模",
    "",
    `| 项 | 数量 |`,
    `|----|-----:|`,
    `| OMS 订单 | ${stats.orders} |`,
    `| 命中三类服务码 | ${stats.allowedService} |`,
    `| 排除 golden | ${stats.goldenExcluded} |`,
    `| 需求描述 < ${MIN_RD_CHARS} 字 | ${stats.rdTooShort} |`,
    `| 有服务码但对不上场景卡 | ${stats.unmappedScene} |`,
    `| 归到场景卡的合格单 | ${stats.mapped} |`,
    `| **抽中候选** | **${stats.sampled}** |`,
    "",
    "## 覆盖 vs 验收",
    "",
    `| 口径 | 结果 | 验收 |`,
    `|------|------|------|`,
    `| 入库有抽样的场景 | ${inboundSceneCount} | ≥ 20 ${acceptInbound ? "达标" : "未达标"} |`,
    `| 库内有抽样的场景 | ${instockSceneCount} | ≥ 15 ${acceptInstock ? "达标" : "未达标"} |`,
    `| 候选条数 | ${stats.sampled} | 约 150（不强凑） |`,
    "",
    "## OMS 码冲突",
    "",
    collisions.length
      ? collisions.map((c) => `- \`${c.code}\` → ${c.keys.join(" / ")}（同码多卡时优先场景名全等，否则取第一张）`).join("\n")
      : "- 无",
    "",
    "## 按场景卡",
    "",
    "| 业务段 | 场景 | OMS码 | 合格池 | 抽中 | 说明 |",
    "|--------|------|------|------:|-----:|------|",
    ...cardRows.map((r) =>
      `| ${r.category} | ${mdEscape(r.sceneName)} \`${r.sceneKey}\` | ${r.usableCode ? `\`${r.omsSceneCode}\`` : "-"} | ${r.pool} | ${r.sampled} | ${r.reason || "满 2 条"} |`,
    ),
    "",
    "## 建议试点 20 条（未跑）",
    "",
    "挑选逻辑：入库 10 个不同场景各 1 条 + 库内 10 个不同场景各 1 条；场景内取排序第一（已审核 / 有 EB / 描述更长）。不足时用另一段补齐。",
    "",
    "| # | VASC | 业务段 | 场景 | 已审 | EB | 群聊 | 描述字数 |",
    "|---|------|--------|------|:----:|:--:|:----:|--------:|",
    ...sampled
      .filter((c) => c.suggestedPilot)
      .map(
        (c, i) =>
          `| ${i + 1} | ${c.orderNo} | ${c.category} | ${mdEscape(c.sceneName)} | ${c.approved ? "Y" : ""} | ${c.hasEb ? "Y" : ""} | ${c.hasChat ? "Y" : ""} | ${c.rdLen} |`,
      ),
    "",
    "## 已记录、下一刀才执行的约定",
    "",
    "- 库内 OMS 码对不上场景卡：跳过选场景，标记「无对应场景卡」，不兜底",
    "- 试点阶段发测试群",
    "- 金萤发不出时用机器人前缀 `[模拟·金萤]`",
    "",
    "本刀未写 `run-historical-batch.ts`，未调用 pipeline，未发飞书。",
    "",
  ].join("\n");

  writeFileSync(resolve(outDir, "sample-summary.md"), `${summary}\n`, "utf8");

  const candidateLines = [
    "# 历史跑批候选名单",
    "",
    `- 共 ${sampled.length} 条。建议试点 20 条见 sample-summary.md / suggested-pilot-20.json。`,
    "",
    "| # | VASC | 业务段 | 场景 | OMS码 | 已审 | EB | 群聊 | 描述字数 | 试点 |",
    "|---|------|--------|------|------|:----:|:--:|:----:|--------:|:----:|",
    ...sampled.map(
      (c, i) =>
        `| ${i + 1} | ${c.orderNo} | ${c.category} | ${mdEscape(c.sceneName)} | \`${c.omsSceneCode}\` | ${c.approved ? "Y" : ""} | ${c.hasEb ? "Y" : ""} | ${c.hasChat ? "Y" : ""} | ${c.rdLen} | ${c.suggestedPilot ? "Y" : ""} |`,
    ),
    "",
  ];
  writeFileSync(resolve(outDir, "candidates.md"), `${candidateLines.join("\n")}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "sample-stats.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        stats,
        inboundSceneCount,
        instockSceneCount,
        acceptInbound,
        acceptInstock,
        collisions,
        cardRows,
        sampledCount: sampled.length,
        suggestedPilot: sampled.filter((c) => c.suggestedPilot).map((c) => c.orderNo),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        outDir,
        sampled: stats.sampled,
        inboundScenes: inboundSceneCount,
        instockScenes: instockSceneCount,
        noCodeCards: stats.noCodeCards,
        suggestedPilot: pilot.length,
      },
      null,
      2,
    ),
  );
}

main();
