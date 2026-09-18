/**
 * Prompt G-1b: fuzzy-match OMS codes for scenario cards missing omsSceneCode.
 *
 *   npx tsx internal-review-copilot/scripts/fuzzy-match-oms-codes.ts
 *
 * Writes `_runs/20260914_scene_requirement_fields/fuzzy-match-report.md` (+ json).
 * Does not modify scenario cards.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ScenarioCard } from "../lib/scenario-cards.ts";

interface OmsRow {
  sceneOverviewCode: string;
  sceneOverviewName: string;
  group?: string;
  source?: string;
}

interface Candidate {
  code: string;
  name: string;
  method: "包含匹配" | "关键词交集" | "SOP章节回溯" | "字面相似度";
  score: number;
  category: string;
  sameCategory: boolean;
  note: string;
}

interface MatchRow {
  sceneKey: string;
  sceneName: string;
  cardCategory: string;
  fileName: string;
  currentCode: string;
  sopSection: string;
  sopTitle: string;
  confidence: "高" | "中" | "未匹配";
  method: string;
  matchedCode: string;
  matchedName: string;
  score: number;
  note: string;
  candidates: Candidate[];
}

const STOP = new Set([
  "入库",
  "库内",
  "出库",
  "上架",
  "重新",
  "商品",
  "异常",
  "包裹",
  "标签",
  "处理",
  "仓库",
  "客户",
  "需要",
  "完成",
  "方式",
  "多种",
  "动作",
  "单号",
  "后",
  "前",
  "的",
]);

const DISTINCTIVE = [
  "货权",
  "无主货",
  "清除",
  "覆盖",
  "代采购",
  "箱转",
  "合箱",
  "加急",
  "视频",
  "拦截",
  "改制",
  "调拨",
  "销毁",
  "作废",
  "组合",
  "拆箱",
  "拆包",
  "加固",
  "冻结",
  "串仓",
  "采集sn",
  "破损",
  "辨识",
  "不良品",
  "anker",
  "未收到货",
];

/** If the card has a group, the OMS name must share at least one token from that group. */
const MUST_SHARE: string[][] = [
  ["无主货"],
  ["合箱"],
  ["加急"],
  ["视频"],
  ["箱转"],
  ["改制"],
  ["代采购"],
  ["串仓"],
  ["作废出库", "作废", "取消出库", "取消"],
];

const EXTRA_NOISE = ["检测", "拆包装", "出库拦截", "辨识后贴标", "a包", "吊牌", "绑带", "头程", "客制", "属性标签", "耗材", "退货", "尺重"];

function mdCell(value: string): string {
  return String(value || "")
    .replace(/\|/g, "/")
    .replace(/\n/g, " ")
    .trim();
}

function stripCategoryPrefix(name: string): string {
  return String(name || "")
    .replace(/^【(?:入库|库内|出库|退货|尾程)】\s*/, "")
    .replace(/^\[(?:Warehouse|Library|In-warehouse|Delivery)[^\]]*]\s*/i, "")
    .replace(/^【(?:In-warehouse|Delivery|Warehouse)】\s*/i, "")
    .trim();
}

function cardCategory(card: ScenarioCard): "inbound" | "instock" | "outbound" | "other" {
  const cat = String(card.category || "").toLowerCase();
  if (cat === "inbound" || cat === "instock" || cat === "outbound") return cat;
  if (card.sceneKey.startsWith("inbound_")) return "inbound";
  if (card.sceneKey.startsWith("instock_")) return "instock";
  if (card.sceneKey.startsWith("outbound_")) return "outbound";
  if (/【入库】/.test(card.sceneName)) return "inbound";
  if (/【库内】/.test(card.sceneName)) return "instock";
  if (/【出库】/.test(card.sceneName)) return "outbound";
  return "other";
}

function omsCategory(row: OmsRow): "inbound" | "instock" | "outbound" | "other" {
  const group = String(row.group || "").toLowerCase();
  if (group === "inbound" || group === "instock" || group === "outbound") return group;
  if (group === "a" || group === "b" || group === "f-001") return "inbound";
  const name = row.sceneOverviewName || "";
  if (name.startsWith("【入库】")) return "inbound";
  if (name.startsWith("【库内】")) return "instock";
  if (name.startsWith("【出库】")) return "outbound";
  if (name.startsWith("【退货】") || name.startsWith("【尾程】")) return "other";
  const code = row.sceneOverviewCode || "";
  if (/In-warehouse/i.test(code) || /Library/i.test(code)) return "instock";
  if (/\[Warehouse]/i.test(code) && /AbnormalTransfer/i.test(code)) return "inbound";
  if (/Delivery/i.test(code)) return "outbound";
  return "other";
}

function canon(name: string): string {
  return stripCategoryPrefix(name)
    .replace(/[“”‘’"'`]/g, "")
    .replace(/（\d+条）/g, "")
    .replace(/代购/g, "代采购")
    .replace(/仓间调拨/g, "库间调拨")
    .replace(/清除\s*[\/／]\s*覆盖|覆盖\s*[\/／]\s*清除/g, "覆盖清除")
    .replace(/收集sn码|采集sn码|sn采集/gi, "采集sn")
    .replace(/组套/g, "组合")
    .replace(/取消出库|作废出库单|订单作废/g, "作废出库")
    .replace(/更换包材/g, "更换包装")
    .replace(/包裹标签/g, "包裹条码")
    .replace(/包材/g, "包装")
    .replace(/winit/gi, "winit")
    .replace(/anker/gi, "anker")
    .replace(/补贴标签/g, "补贴")
    .replace(/[\s\-—–_\[\]【】+、]/g, "")
    .toLowerCase();
}

function tokenize(name: string): string[] {
  const core = stripCategoryPrefix(name);
  const parts = core
    .split(/[\/、+\-—–_（）()\[\]【】\s]+/)
    .map((p) => p.replace(/[“”"']/g, "").trim())
    .filter((p) => p.length >= 2 && !STOP.has(p));
  const extra = DISTINCTIVE.filter((t) => canon(core).includes(t.toLowerCase()) || core.includes(t));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...extra, ...parts]) {
    const key = t.toLowerCase();
    if (STOP.has(t) || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function tokenScore(a: string, b: string): { score: number; overlap: string[]; distinctive: string[] } {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.length || !tb.length) return { score: 0, overlap: [], distinctive: [] };
  const setB = new Set(tb.map((t) => t.toLowerCase()));
  const overlap = ta.filter((t) => setB.has(t.toLowerCase()));
  const distinctive = overlap.filter((t) => DISTINCTIVE.some((d) => t.toLowerCase().includes(d) || d.includes(t.toLowerCase())));
  const meaningful = overlap.filter((t) => !STOP.has(t));
  if (!meaningful.length) return { score: 0, overlap, distinctive };
  let score = meaningful.length / Math.max(ta.length, tb.length);
  if (distinctive.length >= 1) score = Math.max(score, 0.55 + Math.min(0.25, distinctive.length * 0.1));
  if (distinctive.length >= 2) score = Math.max(score, 0.72);
  return { score, overlap: meaningful, distinctive };
}

function bigramDice(a: string, b: string): number {
  const x = canon(a);
  const y = canon(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const grams = (s: string) => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  };
  const A = grams(x);
  const B = grams(y);
  if (!A.length || !B.length) return 0;
  const bCount = new Map<string, number>();
  for (const g of B) bCount.set(g, (bCount.get(g) || 0) + 1);
  let hit = 0;
  for (const g of A) {
    const n = bCount.get(g) || 0;
    if (n > 0) {
      hit += 1;
      bCount.set(g, n - 1);
    }
  }
  return (2 * hit) / (A.length + B.length);
}

function hasAny(text: string, tokens: string[]): boolean {
  const c = canon(text);
  return tokens.some((t) => c.includes(canon(t)) || text.includes(t));
}

function mustShareOk(cardName: string, omsName: string): boolean {
  for (const group of MUST_SHARE) {
    if (!hasAny(cardName, group)) continue;
    if (!hasAny(omsName, group)) return false;
  }
  return true;
}

function extraNoise(cardName: string, omsName: string): number {
  let penalty = 0;
  for (const token of EXTRA_NOISE) {
    if (!hasAny(cardName, [token]) && hasAny(omsName, [token])) penalty += 0.18;
  }
  if (/库存销毁|指定.*销毁/.test(cardName) && /辨识|贴标|拦截/.test(omsName) && !/辨识|贴标|拦截/.test(cardName)) {
    penalty += 0.25;
  }
  if (/做不良品|转不良品/.test(cardName) && /检测/.test(omsName)) penalty += 0.3;
  if (/取消出库|作废/.test(cardName) && /自提出库/.test(omsName) && !/作废|取消/.test(omsName)) penalty += 0.4;
  if (/清除|覆盖/.test(cardName) && /绑带|吊牌|A包|属性标签/.test(omsName) && !/绑带|吊牌|A包|属性/.test(cardName)) {
    penalty += 0.2;
  }
  if (hasAny(cardName, ["贴标", "重新贴标"]) && !/无主货|补贴/.test(cardName) && !hasAny(omsName, ["贴标", "换标", "补贴"])) {
    penalty += 0.2;
  }
  if (hasAny(cardName, ["更换包装", "换包装"]) && !hasAny(omsName, ["更换包装", "换包装"])) penalty += 0.2;
  const acts = ["拦截", "辨识", "销毁", "包装", "贴标"];
  const cardActs = acts.filter((a) => canon(cardName).includes(a)).length;
  const omsActs = acts.filter((a) => canon(omsName).includes(a)).length;
  if (cardActs >= 3 && omsActs >= 3) penalty -= 0.2;
  if (cardActs >= 3 && omsActs <= 1) penalty += 0.2;
  return penalty;
}

function polarityConflict(cardName: string, omsName: string): string {
  const a = cardName;
  const b = omsName;
  const toGood = (s: string) => /转良品|不良品转良/.test(s);
  const toBad = (s: string) => /转不良|做不良品|上架到不良品/.test(s);
  if (toGood(a) && toBad(b)) return "方向相反：卡是转良品，OMS 是转不良品";
  if (toBad(a) && toGood(b)) return "方向相反：卡是做/转不良品，OMS 是转良品";
  if (/加急入库/.test(a) && /加急出库/.test(b)) return "入库/出库加急不可混";
  if (/采集sn|收集sn/.test(canon(a)) && /【出库】/.test(b) && /【库内】|【入库】/.test(a)) {
    return "采集 SN 出库码不可配到入库/库内卡";
  }
  if (!mustShareOk(a, b)) return "缺少卡名核心词，已丢弃";
  return "";
}

function parseSopSection(card: ScenarioCard): string {
  for (const ref of card.sourceRefs || []) {
    const sec = String(ref.section || "");
    const m = sec.match(/(\d+)\.(\d+)/);
    if (m) return `${m[1]}.${m[2]}`;
    const note = String(ref.note || "");
    const n = note.match(/§\s*(\d+)\.(\d+)/);
    if (n) return `${n[1]}.${n[2]}`;
  }
  return "";
}

function loadSopTitles(kbPath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(kbPath)) return map;
  const text = readFileSync(kbPath, "utf8");
  const re = /^###\s+(?:\*\*)?(\d+)\\\.(\d+)\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const title = m[3]
      .replace(/\\/g, "")
      .replace(/\*\*/g, "")
      .replace(/（\d+条）/g, "")
      .replace(/\(Top\s*\d+\s*[-–—]\s*\d+条\)/gi, "")
      .replace(/--待完善.*$/, "")
      .trim();
    map.set(`${m[1]}.${m[2]}`, title);
  }
  return map;
}

function upsertRow(byCode: Map<string, OmsRow>, row: OmsRow): void {
  const code = String(row.sceneOverviewCode || "").trim();
  const name = String(row.sceneOverviewName || "").trim();
  if (!code || !name || code === "NULL" || name === "NULL") return;
  const prev = byCode.get(code);
  if (!prev) {
    byCode.set(code, { ...row, sceneOverviewCode: code, sceneOverviewName: name });
    return;
  }
  if (prev.sceneOverviewName.startsWith("【") && !name.startsWith("【")) return;
  if (!prev.sceneOverviewName.startsWith("【") && name.startsWith("【")) {
    byCode.set(code, { ...prev, sceneOverviewName: name, group: row.group || prev.group });
  }
}

function loadHtmlOptions(htmlPath: string, byCode: Map<string, OmsRow>): void {
  if (!existsSync(htmlPath)) return;
  const html = readFileSync(htmlPath, "utf8");
  const re = /<option value="([^"]+)"[\s\S]*?>([^<]*)<\/option>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const code = m[1].trim();
    const name = m[2].trim();
    if (!code || !name || code.startsWith("{{")) continue;
    upsertRow(byCode, { sceneOverviewCode: code, sceneOverviewName: name, source: "html-dropdown" });
  }
}

function loadOmsRows(projectRoot: string): OmsRow[] {
  const byCode = new Map<string, OmsRow>();
  const jsonPaths = [
    resolve(projectRoot, "_runs/20260911_oms_scene_code_map/scene_overview_code_map.json"),
    resolve(projectRoot, "_runs/20260902_oms_scene_code_map/scene_overview_code_map.json"),
  ];
  for (const p of jsonPaths) {
    if (!existsSync(p)) continue;
    const raw = JSON.parse(readFileSync(p, "utf8")) as { rows?: OmsRow[] };
    for (const row of raw.rows || []) upsertRow(byCode, { ...row, source: row.source || p });
  }
  const htmlDir = resolve(projectRoot, "_runs/20260911_oms_scene_code_map");
  if (existsSync(htmlDir)) {
    for (const name of readdirSync(htmlDir)) {
      if (name.endsWith(".html")) loadHtmlOptions(join(htmlDir, name), byCode);
    }
  }
  const atomsPath = resolve(projectRoot, "_runs/20260909_inbound_scene_probe/_oms_cache/atoms.csv");
  if (existsSync(atomsPath)) {
    const lines = readFileSync(atomsPath, "utf8").split(/\r?\n/);
    const header = (lines[0] || "").split(",");
    const iCode = header.indexOf("scene_overview_code");
    const iName = header.indexOf("scene_overview_name");
    for (const line of lines.slice(1)) {
      if (!line) continue;
      const cols = line.split(",");
      const code = (cols[iCode] || "").trim();
      const name = (cols[iName] || "").trim();
      upsertRow(byCode, {
        sceneOverviewCode: code,
        sceneOverviewName: name,
        group: /【库内】/.test(name) ? "instock" : /【出库】/.test(name) ? "outbound" : /【入库】/.test(name) ? "inbound" : "other",
        source: "atoms.csv",
      });
    }
  }
  return [...byCode.values()];
}

function containHit(cardName: string, omsName: string): { hit: boolean; exact: boolean; ratio: number } {
  const a = canon(cardName);
  const b = canon(omsName);
  if (!a || !b || a.length < 2 || b.length < 2) return { hit: false, exact: false, ratio: 0 };
  const exact = a === b;
  const phrases = ["覆盖清除标签", "清除标签", "更换包装", "库间调拨", "作废出库", "无主货", "代采购包装"];
  const phraseHit =
    phrases.some((p) => a.includes(p) && b.includes(p) && p.length >= 3) ||
    (/更换.*包装/.test(a) && /更换.*包装/.test(b));
  const hit = exact || a.includes(b) || b.includes(a) || phraseHit;
  const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return { hit, exact, ratio: phraseHit && ratio < 0.45 ? 0.5 : ratio };
}

function allowOtherFor(cat: string, row: OmsRow): boolean {
  if (omsCategory(row) !== "other") return false;
  const name = row.sceneOverviewName || "";
  if (/^【/.test(name)) return false;
  return cat === "inbound" || cat === "instock";
}

function matchCard(card: ScenarioCard & { fileName: string }, omsRows: OmsRow[], sopTitles: Map<string, string>): MatchRow {
  const cat = cardCategory(card);
  const sopSection = parseSopSection(card);
  const sopTitle = sopTitles.get(sopSection) || "";
  const pool = omsRows.filter((row) => omsCategory(row) === cat || allowOtherFor(cat, row));
  const candidates: Candidate[] = [];

  const push = (row: OmsRow, method: Candidate["method"], score: number, note: string) => {
    const conflict = polarityConflict(card.sceneName, row.sceneOverviewName);
    if (conflict) return;
    const same = omsCategory(row) === cat;
    if (!same && !allowOtherFor(cat, row)) return;
    const key = `${row.sceneOverviewCode}::${method}`;
    if (candidates.some((c) => `${c.code}::${c.method}` === key)) return;
    candidates.push({
      code: row.sceneOverviewCode,
      name: row.sceneOverviewName,
      method,
      score: Number(score.toFixed(3)),
      category: omsCategory(row),
      sameCategory: same,
      note,
    });
  };

  for (const row of pool) {
    const contain = containHit(card.sceneName, row.sceneOverviewName);
    if (contain.hit && (contain.exact || contain.ratio >= 0.45 || canon(card.sceneName).includes(canon(row.sceneOverviewName)))) {
      const raw = contain.exact ? 1 : contain.ratio >= 0.7 ? 0.92 : contain.ratio >= 0.5 ? 0.78 : 0.68;
      const score = Math.max(0, raw - extraNoise(card.sceneName, row.sceneOverviewName));
      push(
        row,
        "包含匹配",
        score,
        contain.exact ? "去前缀/别名后全等" : `去前缀包含匹配 ratio=${contain.ratio.toFixed(2)}`,
      );
    }
    const tok = tokenScore(card.sceneName, row.sceneOverviewName);
    const tokScore = tok.score - extraNoise(card.sceneName, row.sceneOverviewName);
    if (tokScore >= 0.5) {
      push(row, "关键词交集", tokScore, `overlap=${tok.overlap.join("、") || "-"} distinctive=${tok.distinctive.join("、") || "-"}`);
    }
    const dice = bigramDice(card.sceneName, row.sceneOverviewName) - extraNoise(card.sceneName, row.sceneOverviewName);
    if (dice >= 0.55) {
      push(row, "字面相似度", dice, `bigramDice=${dice.toFixed(2)}`);
    }
  }

  const sopQuery = sopTitle || "";
  if (sopQuery) {
    for (const row of pool) {
      if (polarityConflict(card.sceneName, row.sceneOverviewName)) continue;
      const contain = containHit(sopQuery, row.sceneOverviewName);
      if (contain.hit) {
        const raw = contain.exact ? 0.95 : Math.max(0.7, contain.ratio);
        push(row, "SOP章节回溯", raw - extraNoise(card.sceneName, row.sceneOverviewName), `SOP ${sopSection} 标题「${sopQuery}」包含匹配`);
      }
      const tok = tokenScore(sopQuery, row.sceneOverviewName);
      const tokScore = Math.max(0.55, tok.score) - extraNoise(card.sceneName, row.sceneOverviewName);
      if (tok.score >= 0.5 && tokScore >= 0.5) {
        push(row, "SOP章节回溯", tokScore, `SOP ${sopSection} overlap=${tok.overlap.join("、")}`);
      }
      const dice = bigramDice(sopQuery, row.sceneOverviewName) - extraNoise(card.sceneName, row.sceneOverviewName);
      if (dice >= 0.55) {
        push(row, "SOP章节回溯", dice, `SOP ${sopSection} bigramDice=${dice.toFixed(2)}`);
      }
    }
  }

  const byCodeBest = new Map<string, Candidate>();
  for (const c of candidates) {
    const prev = byCodeBest.get(c.code);
    if (!prev || c.score > prev.score) byCodeBest.set(c.code, c);
  }
  const ranked = [...byCodeBest.values()].sort((a, b) => {
    if (Math.abs(a.score - b.score) >= 0.04) return b.score - a.score;
    if (a.sameCategory !== b.sameCategory) return a.sameCategory ? -1 : 1;
    return a.name.length - b.name.length;
  });

  const best = ranked[0];
  const close = ranked.filter((c) => best && c.code !== best.code && c.score >= Math.min(0.72, best.score - 0.04) && c.score >= 0.62);

  let confidence: MatchRow["confidence"] = "未匹配";
  let method = "";
  let matchedCode = "";
  let matchedName = "";
  let score = 0;
  let note = "";

  if (!best) {
    const cross = omsRows
      .filter((row) => {
        const otherCat = omsCategory(row);
        if (otherCat === cat || otherCat === "other") return false;
        return containHit(card.sceneName, row.sceneOverviewName).hit || tokenScore(card.sceneName, row.sceneOverviewName).score >= 0.55;
      })
      .slice(0, 3);
    note = cross.length
      ? `仅跨类别候选，已丢弃：${cross.map((c) => `${c.sceneOverviewName}(${omsCategory(c)})`).join("；")}`
      : "无同类别候选";
  } else {
    matchedCode = best.code;
    matchedName = best.name;
    method = best.method;
    score = best.score;
    const sharedNote = close.length
      ? `同分类有歧义：${[best, ...close].map((c) => `${c.name} / ${c.code}`).join("；")}`
      : best.note + (best.sameCategory ? "" : "；OMS 名为无前缀/other，需人工确认分类");
    const customerExtra = /anker|拓竹/i.test(card.sceneName) && !/anker|拓竹/i.test(best.name);
    const highByMethod =
      best.category !== "other" &&
      !customerExtra &&
      ((best.method === "包含匹配" && best.score >= 0.78 && containHit(card.sceneName, best.name).ratio >= 0.65) ||
        (best.method === "关键词交集" && best.score >= 0.7) ||
        (best.method === "字面相似度" && best.score >= 0.78) ||
        (best.method === "SOP章节回溯" && best.score >= 0.8 && best.sameCategory));
    if (close.length || customerExtra) {
      confidence = best.score >= 0.5 ? "中" : "未匹配";
      note = customerExtra
        ? `${sharedNote}；卡名含客户特化（Anker/拓竹），与已有通用 OMS 码共用，需确认是否写入`
        : sharedNote;
    } else if (highByMethod) {
      confidence = "高";
      note = sharedNote;
    } else if (best.score >= 0.5) {
      confidence = "中";
      note = sharedNote;
    } else {
      matchedCode = "";
      matchedName = "";
      method = "";
      note = "最高分不足 0.5";
    }
  }

  return {
    sceneKey: card.sceneKey,
    sceneName: card.sceneName,
    cardCategory: cat,
    fileName: card.fileName,
    currentCode: String(card.omsSceneCode || ""),
    sopSection,
    sopTitle,
    confidence,
    method,
    matchedCode,
    matchedName,
    score,
    note,
    candidates: ranked.slice(0, 5),
  };
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const cardsDir = resolve(projectRoot, "internal-review-copilot/knowledge/scenario-cards");
  const outDir = resolve(projectRoot, "_runs/20260914_scene_requirement_fields");
  const kbPath = resolve(projectRoot, "workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md");
  const g1IndexPath = join(outDir, "index.json");

  const omsRows = loadOmsRows(projectRoot);
  const sopTitles = loadSopTitles(kbPath);

  const cards = readdirSync(cardsDir)
    .filter((name) => name.endsWith(".json"))
    .map((fileName) => {
      const raw = JSON.parse(readFileSync(join(cardsDir, fileName), "utf8")) as ScenarioCard;
      return { ...raw, fileName };
    });

  const g1Pending: Array<{ sceneKey: string; omsSceneCode: string; skipReason: string }> = [];
  if (existsSync(g1IndexPath)) {
    const idx = JSON.parse(readFileSync(g1IndexPath, "utf8")) as {
      scenes?: Array<{ sceneKey: string; skipReason?: string; omsSceneCode?: string }>;
    };
    for (const s of idx.scenes || []) {
      if (s.skipReason) g1Pending.push({ sceneKey: s.sceneKey, omsSceneCode: s.omsSceneCode || "", skipReason: s.skipReason });
    }
  }

  const emptyCards = cards.filter((card) => !String(card.omsSceneCode || "").trim());
  const rows = emptyCards
    .map((card) => matchCard(card, omsRows, sopTitles))
    .sort((a, b) => a.sceneName.localeCompare(b.sceneName, "zh"));

  mkdirSync(outDir, { recursive: true });
  const high = rows.filter((r) => r.confidence === "高");
  const mid = rows.filter((r) => r.confidence === "中");
  const none = rows.filter((r) => r.confidence === "未匹配");
  const alreadyCoded = g1Pending.filter((s) => String(s.omsSceneCode || "").trim());

  const lines: string[] = [
    "# 无码场景卡模糊匹配结果",
    "",
    "## 匹配结果汇总",
    "",
    `- OMS 全表：20260911 合并下拉 + 20260902 + HTML option + atoms.csv，共 ${omsRows.length} 个码`,
    `- G-1 待补字段：${g1Pending.length} 张（空码 ${emptyCards.length} + 已有码但样本不足/缓存无已审 ${alreadyCoded.length}）`,
    `- 本次模糊匹配目标：空 ` + "`omsSceneCode`" + ` 的 ${rows.length} 张（已有码的不重配）`,
    `- 高置信度：${high.length}　中置信度：${mid.length}　未匹配：${none.length}　高+中：${high.length + mid.length}`,
    "- **未写入场景卡。** 高置信度建议直接写入；中置信度需人工确认。",
    "- 跨入库/库内/出库的同名场景已排除（例如库内采集 SN 不配出库采集 SN；入库加急不配出库加急）。",
    "",
    "| # | sceneKey | 场景卡名称 | 分类 | 匹配到的 OMS 码 | OMS 场景名 | 匹配方式 | 置信度 |",
    "|---|----------|-----------|------|----------------|-----------|---------|--------|",
  ];
  rows.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | \`${r.sceneKey}\` | ${mdCell(r.sceneName)} | ${r.cardCategory} | ${mdCell(r.matchedCode || "—")} | ${mdCell(r.matchedName || "—")} | ${mdCell(r.method || "—")} | ${r.confidence} |`,
    );
  });

  const dumpGroup = (title: string, list: MatchRow[], hint: string) => {
    lines.push("", `## ${title}`, "", hint, "");
    if (!list.length) {
      lines.push("（无）", "");
      return;
    }
    for (const r of list) {
      lines.push(`### ${r.sceneKey}`);
      lines.push("");
      lines.push(`- 卡名：${r.sceneName}`);
      lines.push(`- 分类：${r.cardCategory}`);
      lines.push(`- SOP：${r.sopSection ? `§${r.sopSection} ${r.sopTitle || ""}`.trim() : "无章节"}`);
      lines.push(`- 建议码：\`${r.matchedCode || "—"}\` ${r.matchedName || ""}`);
      lines.push(`- 方式 / 分数：${r.method || "—"} / ${r.score || 0}`);
      lines.push(`- 说明：${r.note || "—"}`);
      if (r.candidates.length) {
        lines.push("- 其他候选：");
        for (const c of r.candidates.slice(0, 4)) {
          lines.push(`  - ${c.sameCategory ? "同分类" : c.category} \`${c.code}\` ${c.name}（${c.method} ${c.score}）`);
        }
      }
      lines.push("");
    }
  };

  dumpGroup("匹配成功（高置信度，建议直接写入）", high, "包含匹配 / 字面相似度 ≥ 0.72，或关键词交集 score ≥ 0.7，且无同分类歧义。");
  dumpGroup("匹配候选（中置信度，需人工确认）", mid, "score 约 0.5–0.7，或名称有差异 / 有歧义 / OMS 名为无前缀 other。");
  dumpGroup("未匹配（无候选）", none, "同分类下没有可用 OMS 码。跨类别命中已丢弃，这些场景多半是 SOP 有、OMS 下拉里没有独立码。");

  lines.push("", "## G-1 已有 OMS 码、本次不重配", "");
  lines.push("这几张在 G-1 里没抽出 requiredInfoFields，但卡上已有码，不属于「无码」。", "");
  if (!alreadyCoded.length) {
    lines.push("（无）", "");
  } else {
    lines.push("| sceneKey | 已有 OMS 码 | G-1 跳过原因 |", "|----------|------------|--------------|");
    for (const s of alreadyCoded) {
      lines.push(`| \`${s.sceneKey}\` | \`${s.omsSceneCode}\` | ${mdCell(s.skipReason)} |`);
    }
    lines.push("");
  }

  writeFileSync(join(outDir, "fuzzy-match-report.md"), `${lines.join("\n")}\n`, "utf8");
  writeFileSync(
    join(outDir, "fuzzy-match-results.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        omsRowCount: omsRows.length,
        g1Pending: g1Pending.length,
        targetCount: rows.length,
        high: high.length,
        mid: mid.length,
        unmatched: none.length,
        alreadyCoded,
        rows,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(
    `targets=${rows.length} high=${high.length} mid=${mid.length} unmatched=${none.length} oms=${omsRows.length} out=${outDir}`,
  );
}

main();
