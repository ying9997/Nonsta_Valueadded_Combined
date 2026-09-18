import { findScenarioCard, loadScenarioCards } from "../../lib/scenario-cards.ts";
import { matchTemplate } from "../../lib/match-template.ts";
import type { ContextFacts } from "../../lib/types.ts";

const card = findScenarioCard("instock_ownership_transfer");
if (!card) {
  console.error("FAIL: instock_ownership_transfer not loaded");
  process.exit(1);
}
if (card.status !== "supported") {
  console.error(`FAIL: status=${card.status}`);
  process.exit(1);
}
if (card.omsSceneCode !== "【In-warehouse】Transfer of ownership of goods") {
  console.error(`FAIL: omsSceneCode=${card.omsSceneCode}`);
  process.exit(1);
}
const catalog = loadScenarioCards();
const loaded = catalog.some((c) => c.sceneKey === "instock_ownership_transfer");
if (!loaded) {
  console.error("FAIL: not in loadScenarioCards()");
  process.exit(1);
}

const ctx: ContextFacts = {
  orderNo: "SMOKE",
  customerCode: "",
  customerName: "",
  warehouseCode: "",
  warehouseName: "",
  eventNo: "",
  businessOrderNo: "",
  allEventNos: [],
  allBusinessOrderNos: [],
  vaSource: "",
  businessType: "INHOUSE",
  businessTypeDesc: "库内订单",
  sceneKey: "",
  sceneName: "",
  sceneCode: "",
  serviceAtom: "OSF6V1603",
  attachmentStatus: {},
  providedFields: {},
  boundKeys: [],
};

const result = matchTemplate("请把 A 账号库存货权转移到 B 账号，纯IT改数，无实物流", ctx);
const hit =
  result.sceneKey === "instock_ownership_transfer" ||
  result.topK.some((c) => c.sceneKey === "instock_ownership_transfer") ||
  result.candidates.some((c) => c.sceneKey === "instock_ownership_transfer");

console.log(
  JSON.stringify(
    {
      status: card.status,
      omsSceneCode: card.omsSceneCode,
      inCatalog: loaded,
      catalogSize: catalog.length,
      decision: result.decision,
      sceneKey: result.sceneKey,
      top: result.topK.slice(0, 5).map((c) => `${c.sceneKey}:${c.score}`),
      ownershipInCandidates: hit,
    },
    null,
    2,
  ),
);
if (!hit) {
  console.error("FAIL: 货权转移未进入匹配候选");
  process.exit(1);
}
console.log("OK");
