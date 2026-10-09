/**
 * P0-011 regression: VASC000000415983 scene is correct, required-info wording is not.
 *
 *   npx tsx internal-review-copilot/scripts/test-p0-011-required-fields.ts
 */
import { buildInfoPrompt, requiredInfoForIntent } from "../lib/check-scene-completeness.ts";
import { clearScenarioCardsCache, findScenarioCard } from "../lib/scenario-cards.ts";
import type { ContextFacts } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

clearScenarioCardsCache();
const card = findScenarioCard("instock_add_remove_accessories");
assert(card, "missing instock_add_remove_accessories scenario card");
assert(card!.sceneName === "【库内】商品拆箱加/减配件", `unexpected scene=${card!.sceneName}`);

const required = requiredInfoForIntent(
  card,
  "库内更换SKU，已提供操作说明，但没有上下架单据。",
  "instock_add_remove_accessories",
);
const requiredFields = required.map((item) => item.field);
const requiredFieldKeys = card!.requiredAttachmentPolicy.requiredFieldKeys || [];

assert(requiredFields.includes("上下架单据"), "P0-011 must require 上下架单据 for add/remove accessories");
assert(
  !requiredFields.includes("处理数量"),
  `P0-011 must not ask 415983-style cases only for 处理数量; required=${requiredFields.join(",")}`,
);
assert(
  requiredFieldKeys.includes("VAS_ATTR_REL_NWEON"),
  `P0-011 should keep the existing 上架入库单号 document gate; requiredFieldKeys=${requiredFieldKeys.join(",")}`,
);

const contextFacts: ContextFacts = {
  orderNo: "VASC000000415983",
  customerCode: "19993406",
  customerName: "",
  warehouseCode: "",
  warehouseName: "",
  eventNo: "",
  businessOrderNo: "IH000000122694",
  allEventNos: [],
  allBusinessOrderNos: ["IH000000122694"],
  vaSource: "INHOUSE",
  businessType: "INHOUSE",
  businessTypeDesc: "库内订单",
  sceneKey: "instock_add_remove_accessories",
  sceneName: "【库内】商品拆箱加/减配件",
  sceneCode: "20250421001",
  serviceAtom: "OSF6V1603",
  attachmentStatus: {},
  providedFields: {},
  boundKeys: ["businessOrderNo"],
  knownFactLines: ["业务单号：IH000000122694", "原子处理数量：0"],
};

const prompt = buildInfoPrompt(
  "库内更换SKU，需要拆箱加减配件，已写操作说明。",
  required,
  {},
  contextFacts,
);

assert(prompt.includes("上下架单据"), "LLM completeness prompt should ask for 上下架单据");
assert(!prompt.includes("1. 处理数量"), "LLM completeness prompt should not lead with 处理数量");

console.log("test-p0-011-required-fields ok", { requiredFields });
