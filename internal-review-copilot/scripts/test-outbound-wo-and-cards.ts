/**
 * T5 knife-1: outbound cards + WO bind. Local whitelist includes OSF8V1601.
 *
 *   npx tsx internal-review-copilot/scripts/test-outbound-wo-and-cards.ts
 */
import {
  ALLOWED_SERVICE_CODES,
  buildAgentInput,
  collectOrderNos,
  isAllowedServiceAtom,
} from "../lib/oms-adapter.ts";
import { checkDocuments } from "../lib/check-documents.ts";
import { checkRequirement } from "../lib/check-requirement.ts";
import { matchTemplate } from "../lib/match-template.ts";
import { clearScenarioCardsCache, loadScenarioCards } from "../lib/scenario-cards.ts";
import { shouldCheckSkuConsistency } from "../lib/sku-consistency-check.ts";
import { shouldCheckT1SkuRelabel } from "../lib/t1-sku-relabel-check.ts";
import { extractWoNos } from "../lib/wo-numbers.ts";
import {
  applyOutboundUnmatchedLeaveEmpty,
  needsOmsSceneConfirm,
} from "../lib/missing-oms-scene.ts";
import { main as validateInput } from "../../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts";
import type { AgentInput, ContextFacts, JsonRecord, MatchResult } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function outboundContext(over: Partial<ContextFacts> = {}): ContextFacts {
  return {
    orderNo: "VASC000000370722",
    customerCode: "ANKER",
    customerName: "Anker",
    warehouseCode: "US0001",
    warehouseName: "美东",
    eventNo: "",
    businessOrderNo: "WO12223914586",
    allEventNos: [],
    allBusinessOrderNos: ["WO12223914586"],
    vaSource: "OUTBOUND",
    businessType: "OUTBOUND",
    businessTypeDesc: "出库订单",
    sceneKey: "",
    sceneName: "",
    sceneCode: "",
    serviceAtom: "OSF8V1601",
    attachmentStatus: {},
    providedFields: {},
    boundKeys: ["businessOrderNo"],
    ...over,
  };
}

function inboundContext(): ContextFacts {
  return {
    ...outboundContext({
      orderNo: "VASC000000366432",
      businessOrderNo: "WI50035957",
      allBusinessOrderNos: ["WI50035957"],
      vaSource: "INBOUND",
      businessType: "INBOUND",
      businessTypeDesc: "入库订单",
      serviceAtom: "OW01V1602",
    }),
  };
}

function miniInput(over: Partial<AgentInput> = {}): AgentInput {
  return {
    mode: "internal_review_copilot",
    vascNo: "VASC000000370722",
    query: "按出库单指定位置贴快递面单",
    customerIntent: "按出库单指定位置贴快递面单",
    serviceAtom: "OSF8V1601",
    sceneKey: "",
    sceneName: "",
    sceneCode: "",
    recommendedVasc: { vascCode: "", vascName: "" },
    pageContext: {
      entryScene: "INTERNAL_REVIEW",
      vaSource: "OUTBOUND",
      businessType: "OUTBOUND",
      businessTypeDesc: "出库订单",
      warehouseCode: "US0001",
      warehouseName: "美东",
      customerCode: "ANKER",
      customerName: "Anker",
      eventNo: "",
      businessOrderNo: "WO12223914586",
      attachmentStatus: {},
    },
    providedFields: {},
    omsFacts: {
      customerRequirementDescription: "按出库单指定位置贴快递面单",
      requirementBackground: "",
      fieldValues: {},
      attachmentStatus: {},
      uploadedFiles: [],
    },
    responsiblePeople: { submittedBy: "", customerService: [], sales: [], reviewers: [] },
    conversationEvidence: [],
    enrichedContext: {},
    ...over,
  };
}

clearScenarioCardsCache();
const cards = loadScenarioCards();
const outboundCards = cards.filter((card) => card.category === "outbound");
assert(outboundCards.length >= 7, `expected ≥7 outbound cards, got ${outboundCards.length}`);
const keys = new Set(outboundCards.map((card) => card.sceneKey));
for (const key of [
  "outbound_specified_position_label",
  "outbound_repack_self_pickup",
  "outbound_special_palletizing",
  "outbound_plastic_repallet",
  "outbound_relabel_sku",
  "outbound_standard_intercept",
  "outbound_delivery_photo",
]) {
  assert(keys.has(key), `missing card ${key}`);
}

assert(ALLOWED_SERVICE_CODES.has("OSF8V1601"), "whitelist includes OSF8V1601");
assert(
  isAllowedServiceAtom({ serviceCode: "OSF8V1601", serviceName: "出库其他服务需求【非标】" }),
  "OSF8V1601 atom is allowed",
);
{
  const osf8Validate = await validateInput({
    params: {
      customerIntent: "出库贴标",
      serviceAtom: "OSF8V1601",
      recommendedVasc: { vascCode: "VASC202411192253186", vascName: "出库其他服务需求【非标】" },
    },
  });
  assert(
    (osf8Validate.validationResult as { ok?: boolean }).ok === true,
    `OSF8V1601 must pass catchall, got ${JSON.stringify(osf8Validate.validationResult)}`,
  );
}
const builtOsf8 = buildAgentInput({
  orderNo: "VASC000000370722",
  listHeader: {
    businessTypeDesc: "出库订单",
    businessType: "OUTBOUND",
    businessOrder: { businessNo: "WO12223914586" },
  },
  atoms: [{ serviceCode: "OSF8V1601", serviceName: "出库其他服务需求【非标】", vaAtomAttrs: [] }],
});
assert(builtOsf8, "buildAgentInput accepts OSF8V1601");
assert(
  String(builtOsf8!.input.pageContext.businessOrderNo).startsWith("WO"),
  "outbound primary business no is WO",
);

const woDetail: JsonRecord = {
  orderNo: "VASC000000370722",
  listHeader: {
    orderNo: "VASC000000370722",
    businessType: "OUTBOUND",
    businessTypeDesc: "出库订单",
    customer: { customerCode: "ANKER" },
    warehouse: { warehouseCode: "US0001" },
    businessOrder: { businessNo: "WO12223914586" },
  },
  atoms: [],
  events: [],
};
const nos = collectOrderNos(woDetail, {
  VAS_ATTR_REL_RD: "按出库单 WO12223914586 指定位置贴快递面单",
});
assert(nos.wos.includes("WO12223914586"), `WO extracted, got ${nos.wos.join(",")}`);
assert(extractWoNos("出库单 WO12223914586 重新装箱").includes("WO12223914586"), "extractWoNos");

const ctx = outboundContext();
const flags = checkDocuments(woDetail, ctx);
assert(!flags.includes("单据归属未验证"), `WO header should verify, flags=${flags.join(",")}`);

const inboundFlags = checkDocuments(
  {
    ...woDetail,
    listHeader: {
      ...woDetail.listHeader,
      businessOrder: { businessNo: "WO99999999999" },
    },
  } as JsonRecord,
  ctx,
);
assert(inboundFlags.includes("单据归属未验证"), "mismatched WO should flag");

const req = checkRequirement("按出库单 WO12223914586 贴面单", ctx);
assert(req.complete, "short outbound intent with WO should pass L1");

const labelHit = matchTemplate("出库单指定位置贴快递面单，覆盖 UN3480", ctx);
assert(
  labelHit.topK[0]?.sceneKey === "outbound_specified_position_label",
  `指定位置贴标 → ${labelHit.topK[0]?.sceneKey}`,
);
assert(
  !labelHit.topK.some((item) => item.sceneKey.startsWith("inbound_")),
  "outbound order must not pick inbound cards",
);

const repackHit = matchTemplate("暂存单重新装箱，按客户装箱思路贴新出库单标签", ctx);
assert(
  repackHit.topK[0]?.sceneKey === "outbound_repack_self_pickup",
  `重装箱 → ${repackHit.topK[0]?.sceneKey}`,
);

const palletHit = matchTemplate("出库单需要使用 gaylord 装箱打托", ctx);
assert(
  palletHit.topK[0]?.sceneKey === "outbound_special_palletizing",
  `特殊打托 → ${palletHit.topK[0]?.sceneKey}`,
);

const plasticHit = matchTemplate("出库单改用塑料托盘重新打托", ctx);
assert(
  plasticHit.topK[0]?.sceneKey === "outbound_plastic_repallet",
  `塑料托盘 → ${plasticHit.topK[0]?.sceneKey}`,
);

const photoHit = matchTemplate("交货时拍照，开箱拍商品标签", ctx);
assert(
  photoHit.topK[0]?.sceneKey === "outbound_delivery_photo",
  `交货拍照 → ${photoHit.topK[0]?.sceneKey}`,
);

const inboundHit = matchTemplate("尺重辨识后换标上架", inboundContext());
assert(
  inboundHit.topK[0]?.sceneKey === "inbound_label_identify" ||
    inboundHit.topK.some((item) => item.sceneKey === "inbound_label_identify"),
  `入库仍走入库卡，got ${inboundHit.topK[0]?.sceneKey}`,
);
assert(
  !inboundHit.topK.some((item) => item.sceneKey.startsWith("outbound_")),
  "inbound order must not pick outbound cards",
);

assert(
  !shouldCheckSkuConsistency(miniInput(), { sceneKey: "outbound_specified_position_label" } as never, ctx),
  "outbound skips inbound SKU gate",
);
assert(
  !shouldCheckT1SkuRelabel(
    { sceneKey: "inbound_package_barcode_batch_relabel" } as never,
    miniInput(),
  ),
  "outbound skips T1 gate even if scene key looks like T1",
);

const unmappedHit = matchTemplate("出库单采集箱唛打印给客户", ctx);
assert(unmappedHit.decision !== "supported", `采集箱唛不得强行 supported，got ${unmappedHit.decision}`);
const cleared = applyOutboundUnmatchedLeaveEmpty(
  {
    ...unmappedHit,
    sceneKey: unmappedHit.topK[0]?.sceneKey || "outbound_specified_position_label",
    scenarioId: unmappedHit.topK[0]?.sceneKey || "outbound_specified_position_label",
    scenarioName: unmappedHit.topK[0]?.sceneName || "误选",
    decision: "unsupported",
    supported: false,
  } as MatchResult,
  ctx,
);
assert(!cleared.sceneKey, "出库对不上必须清空 sceneKey，不选下拉");
const crossedInbound = applyOutboundUnmatchedLeaveEmpty(
  {
    sceneKey: "inbound_destroy_before_shelve",
    scenarioId: "inbound_destroy_before_shelve",
    scenarioName: "上架前销毁",
    decision: "supported",
    supported: true,
    matched: true,
  } as MatchResult,
  ctx,
);
assert(!crossedInbound.sceneKey, "出库单不得套入库销毁卡，应空概述");
assert(
  !needsOmsSceneConfirm({
    sceneKey: "",
    decision: "unsupported",
    outputPath: "sop_generated",
    riskFlags: ["unmatched_scene_sop", "outbound_unmatched_leave_empty"],
    businessTypeDesc: "出库订单",
  }),
  "出库对不上不转人工、不找人补下拉",
);

console.log("test-outbound-wo-and-cards ok", {
  outboundCards: outboundCards.length,
  wo: nos.wos,
  label: labelHit.topK[0]?.sceneKey,
  whitelist: [...ALLOWED_SERVICE_CODES],
});
