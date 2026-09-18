import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "D:/DA/Nonsta_Valueadded_Combined";
const OMS_PATH = join(ROOT, "_runs/20260911_oms_scene_code_map/scene_overview_code_map.json");
const CARDS_DIR = join(ROOT, "internal-review-copilot/knowledge/scenario-cards");
const OUT_DIR = join(ROOT, "internal-review-copilot/_runs/20260917_oms_scene_gap");

const PREFIX = /^[【\[][^】\]]+[】\]]\s*/;

function canon(name) {
  return String(name || "")
    .replace(PREFIX, "")
    .replace(/[（）()\s\-\/]/g, "")
    .toLowerCase();
}

function loadOms() {
  return JSON.parse(readFileSync(OMS_PATH, "utf8")).rows;
}

function loadCards() {
  return readdirSync(CARDS_DIR)
    .filter((n) => n.endsWith(".json"))
    .map((file) => {
      const d = JSON.parse(readFileSync(join(CARDS_DIR, file), "utf8"));
      return {
        file,
        sceneKey: d.sceneKey,
        sceneName: d.sceneName,
        status: d.status,
        category: d.category,
        oms: String(d.omsSceneCode || "").trim(),
        core: canon(d.sceneName),
      };
    });
}

function hitsFor(o, cards) {
  const ocore = canon(o.sceneOverviewName);
  const ocode = o.sceneOverviewCode;
  const found = [];
  for (const c of cards) {
    let how = "";
    if (ocode && c.oms && ocode === c.oms) how = "code";
    else if (ocore && c.core && Math.min(ocore.length, c.core.length) >= 4) {
      if (ocore === c.core || ocore.includes(c.core) || c.core.includes(ocore)) how = "name";
    }
    if (how) found.push([c, how]);
  }
  return found;
}

function main() {
  const oms = loadOms();
  const cards = loadCards();
  const lines = [];
  const w = (s = "") => lines.push(s);

  w("# OMS 场景概述 vs 场景卡对照");
  w();
  w(`- OMS 下拉：${oms.length} 条（2026-09-11 入库+库内+出库详情页合并）`);
  w(
    `- 场景卡：${cards.length} 张（supported=${cards.filter((c) => c.status === "supported").length}，retired=${cards.filter((c) => c.status === "retired_dedicated_atom").length}）`,
  );
  w();
  w("## 1. 已下线卡在 OMS 下拉里有没有对应概述");
  w();
  w("| 场景卡 | SOP/卡名 | 卡上的 omsSceneCode | OMS 码 | OMS 名 | 对上方式 |");
  w("|---|---|---|---|---|---|");

  for (const c of cards.filter((x) => x.status === "retired_dedicated_atom")) {
    const omsHits = [];
    const seen = new Set();
    for (const o of oms) {
      const ocore = canon(o.sceneOverviewName);
      let how = "";
      if (c.oms && o.sceneOverviewCode === c.oms) how = "code";
      else if (c.core && ocore && Math.min(c.core.length, ocore.length) >= 4) {
        if (c.core === ocore || c.core.includes(ocore) || ocore.includes(c.core)) how = "name";
      }
      if (!how || seen.has(o.sceneOverviewCode)) continue;
      seen.add(o.sceneOverviewCode);
      omsHits.push([o, how]);
    }
    if (!omsHits.length) {
      w(`| \`${c.sceneKey}\` | ${c.sceneName} | \`${c.oms || "-"}\` | — | **下拉里没有同名** | — |`);
      continue;
    }
    for (const [o, how] of omsHits) {
      w(
        `| \`${c.sceneKey}\` | ${c.sceneName} | \`${c.oms || "-"}\` | \`${o.sceneOverviewCode}\` | ${o.sceneOverviewName} | ${how} |`,
      );
    }
  }

  const inboundInstock = oms.filter((o) => {
    const n = String(o.sceneOverviewName || "");
    return n.startsWith("【入库】") || n.startsWith("【库内】") || ["inbound", "instock", "A", "B", "F-001"].includes(o.group);
  });
  const outbound = oms.filter((o) => String(o.sceneOverviewName || "").startsWith("【出库】") || o.group === "outbound");
  const tagged = new Set([...inboundInstock, ...outbound]);
  const other = oms.filter((o) => !tagged.has(o));

  w();
  w("## 2. 入库/库内 OMS 概述：没有生效场景卡");
  w();
  w("判定：下拉有这条，但没有任何 `status=supported` 的卡用码或名字对上。");
  w();
  w("| 类型 | OMS 码 | OMS 名 | 现况 |");
  w("|---|---|---|---|");

  let noSupported = 0;
  const retiredOnly = [];
  const noCard = [];
  for (const o of inboundInstock) {
    const found = hitsFor(o, cards);
    const supported = found.filter((h) => h[0].status === "supported");
    const retired = found.filter((h) => h[0].status === "retired_dedicated_atom");
    if (supported.length) continue;
    noSupported += 1;
    const grp = String(o.sceneOverviewName).startsWith("【入库】") ? "入库" : "库内";
    const tag = retired.length
      ? "有卡但已下线：" + retired.map((h) => h[0].sceneKey).join("、")
      : "无场景卡";
    const row = { grp, code: o.sceneOverviewCode, name: o.sceneOverviewName, tag };
    if (retired.length) retiredOnly.push(row);
    else noCard.push(row);
    w(`| ${grp} | \`${o.sceneOverviewCode}\` | ${o.sceneOverviewName} | ${tag} |`);
  }

  w();
  w(`入库/库内下拉未挂到生效卡：**${noSupported}** / ${inboundInstock.length}`);
  w(`其中：有卡已下线 ${retiredOnly.length}；完全无卡 ${noCard.length}`);
  w();
  w("## 3. 出库");
  w();
  w(`出库下拉 ${outbound.length} 条；场景卡目录没有 outbound 卡。`);
  w();
  w("## 4. 无【入库/库内/出库】前缀");
  w();
  for (const o of other) {
    w(`- \`${o.sceneOverviewCode}\` ${o.sceneOverviewName}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "oms-vs-cards.md"), lines.join("\n") + "\n", "utf8");
  writeFileSync(
    join(OUT_DIR, "summary.json"),
    JSON.stringify(
      {
        oms: oms.length,
        inboundInstock: inboundInstock.length,
        noSupported,
        retiredOnly: retiredOnly.length,
        noCard: noCard.length,
        outbound: outbound.length,
        retiredOnlyRows: retiredOnly,
        noCardRows: noCard,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(join(OUT_DIR, "oms-vs-cards.md"));
  console.log("inboundInstock", inboundInstock.length, "noSupported", noSupported, "retiredOnly", retiredOnly.length, "noCard", noCard.length);
}

main();
