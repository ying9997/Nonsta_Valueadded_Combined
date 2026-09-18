import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const setDir = resolve("_runs/20260915_pass_test");
const v1 = JSON.parse(readFileSync(resolve(setDir, "results/results.json"), "utf8"));
const v2 = JSON.parse(readFileSync(resolve("_runs/20260915_pass_test_v2/results.json"), "utf8"));
const testSet = JSON.parse(readFileSync(resolve(setDir, "test-set.json"), "utf8"));

function rec(arr) {
  const m = new Map();
  for (const r of arr) m.set(r.orderNo, r);
  return m;
}
const m1 = rec(v1);
const m2 = rec(v2);

function pathOf(r) {
  return r?.final?.outputPath || r?.outcome || "";
}
function sceneOf(r) {
  return {
    key: r?.final?.sceneKey || "",
    name: r?.final?.sceneName || "",
    conf: r?.final?.confidence || "",
  };
}
function l4(r) {
  const p = pathOf(r);
  return p === "sop_generated" || r?.outcome === "l4_direct" || r?.outcome === "sop_after_rounds";
}
function hit(item, r) {
  const sk = item.sceneKey || "";
  const sn = item.sceneName || "";
  const f = r?.final || {};
  return Boolean(f.sceneKey) && (f.sceneKey === sk || (f.sceneName || "").includes(sk) || sn.includes(f.sceneName || "") || (f.sceneName || "").includes(sn));
}
function shortScene(s) {
  return String(s || "").replace("【入库】", "").replace("【库内】", "").slice(0, 22);
}

const A = ["VASC000000313224", "VASC000000335355", "VASC000000309402", "VASC000000333423", "VASC000000338076"];
const B = ["VASC000000326295", "VASC000000298617", "VASC000000309288", "VASC000000292770", "VASC000000338049", "VASC000000344016"];
const C = ["VASC000000272679"];
const D = ["VASC000000309966", "VASC000000321948", "VASC000000305805"];

const lines = [];
function dump(label, ids) {
  lines.push("## " + label);
  lines.push("| VASC | OMS | v1 场景 / 出口 | v2 场景 / 出口 / 置信 | 场景 | L4 |");
  lines.push("|------|-----|----------------|----------------------|------|-----|");
  let hits = 0;
  let l4gain = 0;
  for (const id of ids) {
    const item = testSet.find((x) => x.orderNo === id) || {};
    const r1 = m1.get(id);
    const r2 = m2.get(id);
    const s1 = sceneOf(r1);
    const s2 = sceneOf(r2);
    const h = hit(item, r2);
    if (h) hits++;
    const l4v = (l4(r2) ? 1 : 0) - (l4(r1) ? 1 : 0);
    if (l4v > 0) l4gain++;
    lines.push(
      "| " +
        id +
        " | " +
        shortScene(item.sceneName) +
        " | " +
        shortScene(s1.name || s1.key || "-") +
        " / " +
        pathOf(r1) +
        " | " +
        shortScene(s2.name || s2.key || "-") +
        " / " +
        pathOf(r2) +
        " / " +
        s2.conf +
        " | " +
        (h ? "HIT" : "MISS") +
        " | " +
        (l4v > 0 ? "升L4" : l4v < 0 ? "掉L4" : "同") +
        " |",
    );
  }
  lines.push("HIT " + hits + "/" + ids.length + "  升L4 " + l4gain);
  lines.push("");
  return { hits, n: ids.length };
}

const a = dump("A 类 5 条（原 unsupported）", A);
const b = dump("B 类 6 条（近邻混淆）", B);
const c = dump("C 类 1 条（判对但低置信转人工）", C);
const d = dump("D 类 3 条（需求太短/口语）", D);

let sceneV1 = 0;
let sceneV2 = 0;
let l4v1 = 0;
let l4v2 = 0;
let mis1 = 0;
let mis2 = 0;
let expected = 0;
const flip = [];
for (const item of testSet) {
  const r1 = m1.get(item.orderNo);
  const r2 = m2.get(item.orderNo);
  if (hit(item, r1)) sceneV1++;
  if (hit(item, r2)) sceneV2++;
  if (l4(r1)) l4v1++;
  if (l4(r2)) l4v2++;
  const exp = item.expectedPath || "sop_generated";
  if (exp === "sop_generated") {
    expected++;
    const m1b = !l4(r1);
    const m2b = !l4(r2);
    if (m1b) mis1++;
    if (m2b) mis2++;
    if (m1b !== m2b || hit(item, r1) !== hit(item, r2) || pathOf(r1) !== pathOf(r2)) {
      flip.push({
        id: item.orderNo,
        oms: item.sceneName,
        v1p: pathOf(r1),
        v2p: pathOf(r2),
        v1s: sceneOf(r1).name || sceneOf(r1).key,
        v2s: sceneOf(r2).name || sceneOf(r2).key,
        v1h: hit(item, r1),
        v2h: hit(item, r2),
        l4gain: (l4(r2) ? 1 : 0) - (l4(r1) ? 1 : 0),
      });
    }
  }
}

const header = [
  "# v1 vs v2 对比（同一批 40，RAG 关）",
  "",
  "- v1：修 L2 前（`_runs/20260915_pass_test`）",
  "- v2：A 改法后（弱信号 + 名单 15 + 边界 + low 口径），RAG 仍关",
  "",
  "| 指标 | v1 | v2 | 变化 |",
  "|------|----|----|------|",
  "| L4 | " + l4v1 + "/40 | " + l4v2 + "/40 | " + (l4v2 - l4v1) + " |",
  "| 误拦 | " + mis1 + "/" + expected + " (" + ((mis1 / expected) * 100).toFixed(1) + "%) | " + mis2 + "/" + expected + " (" + ((mis2 / expected) * 100).toFixed(1) + "%) | " + (mis2 - mis1) + " |",
  "| 场景匹配 | " + sceneV1 + "/40 | " + sceneV2 + "/40 | " + (sceneV2 - sceneV1) + " |",
  "",
];

const body = [];
body.push("## 出口或场景有变化的单");
body.push("| VASC | OMS | v1 | v2 | 场景 | L4 |");
body.push("|------|-----|----|----|------|-----|");
for (const f of flip) {
  body.push(
    "| " +
      f.id +
      " | " +
      shortScene(f.oms) +
      " | " +
      shortScene(f.v1s) +
      " / " +
      f.v1p +
      " | " +
      shortScene(f.v2s) +
      " / " +
      f.v2p +
      " | " +
      (f.v1h ? "HIT" : "MISS") +
      "→" +
      (f.v2h ? "HIT" : "MISS") +
      " | " +
      (f.l4gain > 0 ? "升" : f.l4gain < 0 ? "掉" : "同") +
      " |",
  );
}

const priorL4 = v1.filter((r) => l4(r)).map((r) => r.orderNo);
const still = priorL4.filter((id) => l4(m2.get(id)));
const lost = priorL4.filter((id) => !l4(m2.get(id)));
body.push("");
body.push("## 原 24 条 L4 是否回退");
body.push("- 原 L4 条数: " + priorL4.length);
body.push("- 仍 L4: " + still.length + "/" + priorL4.length);
body.push("- 回退: " + (lost.length ? lost.join(", ") : "无"));

const c2 = m2.get("VASC000000272679");
const cPath = pathOf(c2);
const cHit = hit(testSet.find((x) => x.orderNo === "VASC000000272679"), c2);
body.push("");
body.push("## 验收对照任务书");
body.push("- A 类 HIT: " + a.hits + "/5 （目标 ≥3） " + (a.hits >= 3 ? "达标" : "未达"));
body.push("- B 类 HIT: " + b.hits + "/6 （目标 ≥3） " + (b.hits >= 3 ? "达标" : "未达"));
body.push("- C 类 272679: 出口=" + cPath + " 场景=" + (cHit ? "HIT" : "MISS") + " 置信=" + sceneOf(c2).conf + " （目标：不转人工） " + (cPath !== "transfer_human" ? "达标" : "未达"));
body.push("- D 类: 已记 pending，本轮不修");
body.push("- 误拦: " + mis2 + "/" + expected + " (" + ((mis2 / expected) * 100).toFixed(1) + "%) 目标 ≤15%（更好 ≤10%） " + (mis2 / expected <= 0.15 ? "达标" : "未达"));
body.push("- 原 " + priorL4.length + " 条 L4 回退: " + (lost.length ? "有 " + lost.join(",") : "无") + " " + (lost.length === 0 ? "达标" : "未达"));
body.push("- RAG: 试跑 0/6 变好，默认仍关");
body.push("- 部署: 不能部署 40");
body.push("");

const out = header.concat(lines, body).join("\n");
writeFileSync("_runs/20260915_pass_test_v2/v1-vs-v2.md", out, "utf8");
console.log(out);
