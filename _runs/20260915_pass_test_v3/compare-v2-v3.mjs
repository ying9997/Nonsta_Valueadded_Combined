import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const setDir = resolve("_runs/20260915_pass_test");
const v2 = JSON.parse(readFileSync(resolve("_runs/20260915_pass_test_v2/results.json"), "utf8"));
const v3 = JSON.parse(readFileSync(resolve("_runs/20260915_pass_test_v3/results.json"), "utf8"));
const testSet = JSON.parse(readFileSync(resolve(setDir, "test-set.json"), "utf8"));

function rec(arr) {
  const m = new Map();
  for (const r of arr) m.set(r.orderNo, r);
  return m;
}
const m2 = rec(v2);
const m3 = rec(v3);

function pathOf(r) {
  return r?.final?.outputPath || r?.outcome || "";
}
function sceneOf(r) {
  return {
    key: r?.final?.sceneKey || "",
    name: r?.final?.sceneName || "",
    conf: r?.final?.confidence || "",
    reason: r?.final?.reason || "",
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
const L25 = ["VASC000000313224", "VASC000000309402", "VASC000000333423", "VASC000000298617", "VASC000000309966"];

const lines = [];
function dump(label, ids) {
  lines.push("## " + label);
  lines.push("| VASC | OMS | v2 场景 / 出口 | v3 场景 / 出口 / 置信 | 场景 | L4 |");
  lines.push("|------|-----|----------------|----------------------|------|-----|");
  let hits = 0;
  for (const id of ids) {
    const item = testSet.find((x) => x.orderNo === id) || {};
    const r2 = m2.get(id);
    const r3 = m3.get(id);
    const s2 = sceneOf(r2);
    const s3 = sceneOf(r3);
    const h = hit(item, r3);
    if (h) hits++;
    const l4v = (l4(r3) ? 1 : 0) - (l4(r2) ? 1 : 0);
    lines.push(
      "| " +
        id +
        " | " +
        shortScene(item.sceneName) +
        " | " +
        shortScene(s2.name || s2.key || "-") +
        " / " +
        pathOf(r2) +
        " | " +
        shortScene(s3.name || s3.key || "-") +
        " / " +
        pathOf(r3) +
        " / " +
        s3.conf +
        " | " +
        (h ? "HIT" : "MISS") +
        " | " +
        (l4v > 0 ? "升L4" : l4v < 0 ? "掉L4" : "同") +
        " |",
    );
  }
  lines.push("HIT " + hits + "/" + ids.length);
  lines.push("");
  return { hits, n: ids.length };
}

const a = dump("A 类 5 条", A);
const b = dump("B 类 6 条", B);
const c = dump("C 类 1 条", C);
const d = dump("D 类 3 条", D);
dump("L2.5 那 5 条", L25);

let sceneV2 = 0;
let sceneV3 = 0;
let l4v2 = 0;
let l4v3 = 0;
let mis2 = 0;
let mis3 = 0;
let expected = 0;
const flip = [];
for (const item of testSet) {
  const r2 = m2.get(item.orderNo);
  const r3 = m3.get(item.orderNo);
  if (hit(item, r2)) sceneV2++;
  if (hit(item, r3)) sceneV3++;
  if (l4(r2)) l4v2++;
  if (l4(r3)) l4v3++;
  const exp = item.expectedPath || "sop_generated";
  if (exp === "sop_generated") {
    expected++;
    const m2b = !l4(r2);
    const m3b = !l4(r3);
    if (m2b) mis2++;
    if (m3b) mis3++;
    if (m2b !== m3b || hit(item, r2) !== hit(item, r3) || pathOf(r2) !== pathOf(r3)) {
      flip.push({
        id: item.orderNo,
        oms: item.sceneName,
        v2p: pathOf(r2),
        v3p: pathOf(r3),
        v2s: sceneOf(r2).name || sceneOf(r2).key,
        v3s: sceneOf(r3).name || sceneOf(r3).key,
        v2h: hit(item, r2),
        v3h: hit(item, r3),
        l4gain: (l4(r3) ? 1 : 0) - (l4(r2) ? 1 : 0),
        reason: sceneOf(r3).reason,
      });
    }
  }
}

const header = [
  "# v2 vs v3 对比（同一批 40，RAG 关）",
  "",
  "- v2：L2 弱信号 + 名单 15 + 边界",
  "- v3：再修 L2.5 单据信息 + B 类近邻改判",
  "",
  "| 指标 | v2 | v3 | 变化 |",
  "|------|----|----|------|",
  "| L4 | " + l4v2 + "/40 | " + l4v3 + "/40 | " + (l4v3 - l4v2) + " |",
  "| 误拦 | " + mis2 + "/" + expected + " (" + ((mis2 / expected) * 100).toFixed(1) + "%) | " + mis3 + "/" + expected + " (" + ((mis3 / expected) * 100).toFixed(1) + "%) | " + (mis3 - mis2) + " |",
  "| 场景匹配 | " + sceneV2 + "/40 | " + sceneV3 + "/40 | " + (sceneV3 - sceneV2) + " |",
  "",
];

const body = [];
body.push("## 出口或场景有变化的单");
body.push("| VASC | OMS | v2 | v3 | 场景 | L4 |");
body.push("|------|-----|----|----|------|-----|");
for (const f of flip) {
  body.push(
    "| " +
      f.id +
      " | " +
      shortScene(f.oms) +
      " | " +
      shortScene(f.v2s) +
      " / " +
      f.v2p +
      " | " +
      shortScene(f.v3s) +
      " / " +
      f.v3p +
      " | " +
      (f.v2h ? "HIT" : "MISS") +
      "→" +
      (f.v3h ? "HIT" : "MISS") +
      " | " +
      (f.l4gain > 0 ? "升" : f.l4gain < 0 ? "掉" : "同") +
      " |",
  );
}

const priorL4 = v2.filter((r) => l4(r)).map((r) => r.orderNo);
const lost = priorL4.filter((id) => !l4(m3.get(id)));
const gained = v3.filter((r) => l4(r) && !l4(m2.get(r.orderNo))).map((r) => r.orderNo);

body.push("");
body.push("## 相对 v2 的 L4 进出");
body.push("- v2 L4 仍在: " + priorL4.filter((id) => l4(m3.get(id))).length + "/" + priorL4.length);
body.push("- 回退: " + (lost.length ? lost.join(", ") : "无"));
body.push("- 新进 L4: " + (gained.length ? gained.join(", ") : "无"));

const c3 = m3.get("VASC000000272679");
body.push("");
body.push("## 验收");
body.push("- A 类 HIT: " + a.hits + "/5");
body.push("- B 类 HIT: " + b.hits + "/6 （目标 ≥3） " + (b.hits >= 3 ? "达标" : "未达"));
body.push("- C 类 272679: " + pathOf(c3) + " " + (pathOf(c3) !== "transfer_human" ? "达标" : "未达"));
body.push("- 误拦: " + mis3 + "/" + expected + " (" + ((mis3 / expected) * 100).toFixed(1) + "%) 目标 ≤10% " + (mis3 / expected <= 0.1 ? "达标" : "未达"));
body.push("- 部署: " + (mis3 / expected <= 0.1 ? "指标过门，仍须你说可以部署 40" : "不能部署"));
body.push("");

const out = header.concat(lines, body).join("\n");
writeFileSync("_runs/20260915_pass_test_v3/v2-vs-v3.md", out, "utf8");
console.log(out);
