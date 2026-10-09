/**
 * Smoke: card JSON structure for L4 / L3 / L2.
 *
 *   npx tsx internal-review-copilot/scripts/test-feishu-card.ts
 */
import { buildAllScenesCard, buildAskCard, buildCanaryPromoteCard, buildCanaryPromotedUpdateCard, buildClarificationCard, buildOmsWriteCancelledCard, buildOmsWriteRetryCard, buildRequirementClarificationCard, buildSceneConfirmCard, buildSceneConfirmedUpdateCard, buildSceneSearchMultiCard, buildSceneSearchSingleCard, buildSopActionUpdateCard, buildSopCard, buildSopGenerateErrorCard, compactAiReason, demoTopicTitle, judgmentBasis, shortSceneName } from "../lib/feishu-card.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { replaceInventedOrderNos } from "../lib/generate-text.ts";
import { searchSceneByKeyword } from "../lib/scenario-cards.ts";
import { looksLikeSceneWrong } from "../lib/sop-edit.ts";
import type { PipelineResult } from "../lib/run-pipeline.ts";
import type { MatchResult } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const personnel = {
  销售: { name: "韩洪涛", openId: "ou_ca7db67030e3816c9b4c92b668fed784" },
  审核员: { name: "金萤", openId: "ou_d09d7409a63201462177f4d8a8b1ac7b" },
};

const liveInbound = {
  销售: { name: "金萤", openId: "ou_d09d7409a63201462177f4d8a8b1ac7b" },
  客服: { name: "测试客服", openId: "ou_cs_test_sales_only" },
  审核员: { name: "耿文文", openId: "ou_fb036b896ab183f3eea939470e47bf66" },
  负责人: { name: "李颖", openId: "ou_c62fe459a4407900cdef6d340dbeb24c" },
};

const liveInstock = {
  ...liveInbound,
  审核员: { name: "何静", openId: "ou_38892cd1daae40290c0a4994e614900a" },
};

const base = {
  missing: [] as string[],
  contextFacts: {
    customerName: "××科技有限公司",
    warehouseName: "USNJ2 Warehouse",
    allEventNos: ["EB0126060330032532"],
  },
} as PipelineResult;

const REVIEWER_IDS = [
  "ou_fb036b896ab183f3eea939470e47bf66",
  "ou_c62fe459a4407900cdef6d340dbeb24c",
  "ou_38892cd1daae40290c0a4994e614900a",
];
function assertNoReviewerAt(blob: string, msg: string): void {
  for (const id of REVIEWER_IDS) {
    assert(!blob.includes(id), `${msg} (${id})`);
  }
}

const l4 = buildSopCard({ ...base, orderNo: "VASC000000315774", outputPath: "sop_generated" } as PipelineResult, personnel);
assert(l4.header.template === "green", "L4 green");
assert(JSON.stringify(l4).includes("请在 OMS 检查修改"), "L4 检查修改文案");
assert(!JSON.stringify(l4).includes("ou_d09d7409a63201462177f4d8a8b1ac7b"), "L4 不 @ 审核员");
assert(!JSON.stringify(l4).includes("confirm_sop_write"), "L4 no confirm write button");
assert(!JSON.stringify(l4).includes("scene_wrong"), "L4 no scene_wrong button");
assert(!JSON.stringify(l4).includes("ou_a59d62e22e542e6689abf3fea1e3d087"), "demo L4 must not at 耿文文");

const l4SkuHint = buildSopCard(
  {
    ...base,
    orderNo: "VASC000000370434",
    outputPath: "sop_generated",
    skuCheckResult: {
      triggered: true,
      oldWi: "WI51636814",
      newWi: "WI52653783",
      oldSkus: ["EXA2428-SLR"],
      newSkus: ["EXA2428G"],
      match: "mismatch",
    },
  } as PipelineResult,
  personnel,
);
assert(JSON.stringify(l4SkuHint).includes("【提示：本单AI识别到"), "L4 展示审核员 SKU 提示");
assert(JSON.stringify(l4SkuHint).includes("请审核人员关注"), "L4 SKU 提示面向审核员");
assert(!JSON.stringify(l4).includes("【提示：本单AI识别到"), "无 SKU 校验时不展示提示");

const l4Inbound = buildSopCard({ ...base, orderNo: "VASC000000315774", outputPath: "sop_generated" } as PipelineResult, liveInbound);
assertNoReviewerAt(JSON.stringify(l4Inbound), "live inbound L4 不 @ 审核员/负责人");
assert(!JSON.stringify(l4Inbound).includes("ou_cs_test_sales_only"), "L4 不 @ 客服");
const l4Instock = buildSopCard({ ...base, orderNo: "VASC000000315774", outputPath: "sop_generated" } as PipelineResult, liveInstock);
assertNoReviewerAt(JSON.stringify(l4Instock), "live instock L4 不 @ 审核员/负责人");

const l3 = buildClarificationCard(
  {
    ...base,
    orderNo: "VASC000000298617",
    outputPath: "sop_generated",
    missing: ["操作说明附件"],
    missingAttachments: ["操作说明附件"],
    contextFacts: {
      warehouseName: "USKY3 Warehouse",
      allEventNos: ["EB1"],
      providedFields: { BEOR: "需先拍照暂存再辨识", VAS_ATTR_REL_RD: "先拍照暂存再辨识上架" },
    },
  } as PipelineResult,
  personnel,
);
assert(l3.header.template === "orange", "L3 orange");
assert(JSON.stringify(l3).includes("【客户原始 - 需求背景】"), "L3 需求背景");
assert(JSON.stringify(l3).includes("【AI 总结 - 需求描述】"), "L3 AI 需求描述");
assert(JSON.stringify(l3).includes("【AI 总结 - 需求背景】"), "L3 AI 需求背景");
assert(JSON.stringify(l3).includes("ou_ca7db67030e3816c9b4c92b668fed784"), "L3 at 销售");
assert(!JSON.stringify(l3).includes("ou_d09d7409a63201462177f4d8a8b1ac7b"), "L3 补附件不 @ 审核员");
assert(!JSON.stringify(l3).includes("skip_completeness"), "L3 no skip_completeness");
assert(!JSON.stringify(l3).includes("scene_wrong"), "L3 no scene_wrong");
assert(JSON.stringify(l3).includes("附件未提交") || JSON.stringify(l3).includes("SOP 已按现有信息生成"), "L3 attachment pending");

const l3Scene = buildClarificationCard(
  {
    ...base,
    orderNo: "VASC000000298617",
    outputPath: "needs_field_clarification",
    missingRequirementItems: ["处理范围未说明"],
    missingAttachments: ["标签文件"],
    missing: ["处理范围未说明", "标签文件"],
    matchResult: {
      sceneKey: "inbound_package_barcode_batch_relabel",
      scenarioName: "【入库】包裹条码批量异常辨识后补贴包裹标签上架",
    },
  } as PipelineResult,
  liveInbound,
);
assert(JSON.stringify(l3Scene).includes("场景识别"), "L3 scene name");
assert(l3Scene.header.title.content.includes("资料待补充"), "L3 title says field/materials missing");
assert(JSON.stringify(l3Scene).includes("以下场景资料需要补充"), "L3 body says field/materials missing");
assert(!JSON.stringify(l3Scene).includes("客户需求描述不够完整"), "L3 must not use L1 requirement wording");
assert(JSON.stringify(l3Scene).includes("处理范围未说明"), "L3 missing info");
assert(JSON.stringify(l3Scene).includes("标签文件"), "L3 missing attachment");
assert(JSON.stringify(l3Scene).includes("❓"), "L3 info uses ❓");
assert(JSON.stringify(l3Scene).includes("ou_d09d7409a63201462177f4d8a8b1ac7b"), "L3 补信息 @ 销售");
assert(JSON.stringify(l3Scene).includes("ou_cs_test_sales_only"), "L3 补信息 @ 客服");
assertNoReviewerAt(JSON.stringify(l3Scene), "L3 补信息不 @ 审核员/负责人");

const legacyL25Scene = buildAskCard(
  {
    ...base,
    orderNo: "VASC000000448314",
    outputPath: "needs_requirement_clarification",
    ruleOutputPath: "needs_requirement_clarification",
    node: "check-scene-completeness",
    failureGate: "check-completeness",
    missingRequirementItems: ["SKU与入库单对应关系未说明"],
    missing: ["SKU与入库单对应关系未说明"],
    matchResult: {
      sceneKey: "inbound_package_barcode_batch_relabel",
      scenarioName: "【入库】包裹条码批量异常辨识后补贴包裹标签上架",
    },
  } as PipelineResult,
  liveInbound,
);
assert(legacyL25Scene.header.title.content.includes("资料待补充"), "legacy L2.5 title says materials missing");
assert(JSON.stringify(legacyL25Scene).includes("以下场景资料需要补充"), "legacy L2.5 body says field/materials missing");
assert(!JSON.stringify(legacyL25Scene).includes("客户需求描述不够完整"), "legacy L2.5 must not use L1 wording");

const l1 = buildRequirementClarificationCard(
  {
    ...base,
    orderNo: "VASC000000319344",
    outputPath: "needs_requirement_clarification",
    missing: ["操作动作不清"],
    missingRequirementItems: ["操作动作不清"],
    clarificationPrompts: ["需求里看不出要做什么操作"],
    contextFacts: {
      customerName: "××科技有限公司",
      warehouseName: "USKY5 Warehouse",
      allEventNos: ["EB0126091100001"],
      allBusinessOrderNos: ["WI52512121"],
      providedFields: {
        VAS_ATTR_REL_RD: "帮我处理一下异常",
        BEOR: "可贴标签上的 SKU 判断是否同一 Winit 号",
      },
    },
  } as PipelineResult,
  personnel,
);
assert(l1.header.template === "orange", "L1 orange");
assert(JSON.stringify(l1).includes("❓"), "L1 uses ❓");
assert(JSON.stringify(l1).includes("操作动作不清"), "L1 missing items");
assert(JSON.stringify(l1).includes("【客户原始 - 需求描述】"), "L1 需求描述");
assert(JSON.stringify(l1).includes("【客户原始 - 需求背景】"), "L1 需求背景");
assert(JSON.stringify(l1).includes("【AI 总结 - 需求描述】"), "L1 AI 需求描述");
assert(JSON.stringify(l1).includes("【AI 总结 - 需求背景】"), "L1 AI 需求背景");
assert(!JSON.stringify(l1).includes("scene_wrong"), "L1 no scene_wrong");

const match = {
  topK: [
    { sceneKey: "inbound_label_identify", sceneName: "尺重/标签辨识后换标上架", score: 0.8 },
    { sceneKey: "inbound_package_barcode_batch_relabel", sceneName: "包裹条码批量异常", score: 0.5 },
  ],
} as MatchResult;
const l2 = buildSceneConfirmCard(
  {
    ...base,
    orderNo: "VASC000000326061",
    outputPath: "transfer_human",
    matchResult: match,
    contextFacts: {
      ...base.contextFacts,
      allBusinessOrderNos: ["WI51383223", "WI51383191"],
      providedFields: { BEOR: "包裹内出现订单外商品" },
    },
  } as PipelineResult,
  personnel,
  collectSceneCandidates(match),
);
assert(l2.header.template === "blue", "L2 blue");
assert(JSON.stringify(l2).includes("【客户原始 - 需求背景】"), "L2 需求背景");
const buttons = l2.elements.flatMap((el) => (el.tag === "action" ? el.actions : []));
assert(buttons.length >= 4, `L2 buttons, got ${buttons.length}`);
assert(
  buttons.some((b) => b.tag === "button" && b.name === "scene_select" && b.value.sceneKey === "inbound_label_identify"),
  "value has sceneKey+vascNo",
);
assert(
  buttons.some((b) => b.tag === "button" && b.value.sceneKey === "inbound_label_identify" && b.value.vascNo === "VASC000000326061"),
  "vascNo on scene button",
);
assert(
  buttons.some((b) => b.tag === "button" && b.name === "show_all_scenes" && b.value.action === "show_all_scenes"),
  "show more scenes button",
);
assert(
  buttons.some(
    (b) =>
      b.tag === "button" &&
      b.value.sceneKey === "transfer_human" &&
      b.type === "danger" &&
      b.text.content.includes("确认转人工，不走智能审核"),
  ),
  "danger transfer copy",
);
assert(!JSON.stringify(l2).includes("ou_d09d7409a63201462177f4d8a8b1ac7b"), "L2 选场景不 @ 审核员");

const l2Empty = buildSceneConfirmCard(
  {
    ...base,
    orderNo: "VASC000000183069",
    outputPath: "transfer_human",
    matchResult: { topK: [], decision: "unsupported" } as MatchResult,
  } as PipelineResult,
  personnel,
  [],
);
const emptyButtons = l2Empty.elements.flatMap((el) => (el.tag === "action" ? el.actions : []));
assert(
  emptyButtons.some((b) => b.tag === "button" && b.name === "show_all_scenes" && b.text.content.includes("以上都不对，查看更多场景")),
  "unsupported L2 still has show more scenes",
);

assert(
  JSON.stringify(l2Empty).includes("场景识别：未识别到"),
  "unsupported L2 scene line is 未识别到",
);
assert(
  JSON.stringify(l2Empty).includes("未能识别到匹配的场景"),
  "unsupported L2 copy",
);

const l2Mismatch = buildSceneConfirmCard(
  {
    ...base,
    orderNo: "VASC000000183069",
    outputPath: "transfer_human",
    matchResult: {
      topK: [],
      decision: "unsupported",
      sceneKey: "inbound_label_identify",
      scenarioName: "【入库】尺重/标签辨识后换标上架",
    } as MatchResult,
  } as PipelineResult,
  personnel,
  [],
);
assert(JSON.stringify(l2Mismatch).includes("未能识别到匹配的场景"), "leftover scene still situation B");
assert(JSON.stringify(l2Mismatch).includes("场景识别：未识别到"), "do not show leftover scene name");
assert(!JSON.stringify(l2Mismatch).includes("场景识别：【入库】尺重"), "facts must not contradict 未能识别");
assert(
  collectSceneCandidates({
    decision: "supported",
    sceneKey: "inbound_label_identify",
    scenarioName: "【入库】尺重/标签辨识后换标上架",
    topK: [],
  } as MatchResult).some((item) => item.sceneKey === "inbound_label_identify"),
  "supported sceneKey without topK still a candidate",
);

const updated = buildSceneConfirmedUpdateCard(l2, "inbound_label_identify", "金萤", "ou_d09d7409a63201462177f4d8a8b1ac7b");
assert(!updated.elements.some((el) => el.tag === "action"), "update removes buttons");
assert(updated.open_ids?.[0] === "ou_d09d7409a63201462177f4d8a8b1ac7b", "open_ids for card 1.0 update");
assert(JSON.stringify(updated).includes("已确认场景"), "confirm copy");

assert(demoTopicTitle({
  orderNo: "VASC000000366717",
  contextFacts: { customerCode: "19227270", customerName: "自由創新(香港)", warehouseCode: "USNJ2" },
  matchResult: { llmClassification: { topicSummary: "辨识后补贴包裹标签上架到新单" } },
}) === "VASC000000366717 | 19227270/自由創新(香港) | USNJ2 | 辨识后补贴包裹标签上架到新单", "topic title uses topicSummary");
assert(demoTopicTitle({
  orderNo: "VASC000000366717",
  contextFacts: {
    customerCode: "19227270",
    customerName: "自由創新(香港)",
    warehouseCode: "USNJ2",
    providedFields: { VAS_ATTR_REL_RD: "很长的客户原文需求描述不要当标题" },
  },
  matchResult: { llmClassification: { conclusionOneLiner: "商品条码异常换标上架" } },
}) === "VASC000000366717 | 19227270/自由創新(香港) | USNJ2 | 商品条码异常换标上架", "topic title falls back to conclusionOneLiner");
assert(
  demoTopicTitle({ orderNo: "VASC000000319344" }).startsWith("VASC000000319344 | "),
  "L1 topic still has VASC",
);
const skuDesc =
  "包裹上面有SKU标签，需要你们一箱箱查看是哪个SKU，再根据SKU对应的条码重新给包裹贴条码入库上架。附件图片1是辨识例子，我用红色方框圈起来的就是SKU，在包裹外包装其中的一面就粘贴了SKU标签。";
assert(
  demoTopicTitle({
    orderNo: "VASC000000343821",
    contextFacts: {
      customerCode: "11177690",
      customerName: "广州德诺汽配有限公司",
      warehouseCode: "CATO",
      providedFields: { VAS_ATTR_REL_RD: skuDesc },
      allEventNos: ["EB0126082632490213"],
      allBusinessOrderNos: ["WI52118288", "WI50893267"],
    },
    analysis: "增值单 VASC000000343821 需求与附件已齐，已生成 SOP 草稿供审核确认。确认不等于审核通过。",
  }) === `VASC000000343821 | 11177690/广州德诺汽配有限公司 | CATO | ${skuDesc.slice(0, 50)}`,
  "topic title uses 需求描述 not EB/WI filler",
);
assert(
  !demoTopicTitle({
    orderNo: "VASC000000343821",
    analysis: "增值单 VASC000000343821 需求与附件已齐，已生成 SOP 草稿供审核确认。确认不等于审核通过。",
    failureGate: "llm-generate-sop",
    llm: { error: "生成失败", text: "", sop: null },
  }).includes("已生成 SOP"),
  "SOP fail title must not use success boilerplate",
);

assert(shortSceneName("【入库】尺重/标签辨识后换标上架") === "【入库】尺重/标签辨识后换标上架", "keep inbound prefix");
assert(shortSceneName("【库内】拆分SKU") === "【库内】拆分SKU", "keep instock prefix");
assert(shortSceneName("【出库】采集SN码") === "【出库】采集SN码", "keep outbound prefix");

const revisedSplit = buildSopCard(
  {
    ...base,
    orderNo: "VASC000000360654",
    outputPath: "sop_generated",
    llm: {
      text: "【需求背景】\n到仓海运整柜。\n\n【需求描述】\n按新单上架。\n\n【操作要求】\n1. 扫描外箱\n2. 关闭异常单",
      sop: {
        requirementBackground: "到仓海运整柜。",
        requirementDescription: "按新单上架。",
        warehouseSop: "1. 扫描外箱\n2. 关闭异常单",
        sopText: "【需求背景】\n到仓海运整柜。\n\n【需求描述】\n按新单上架。\n\n【操作要求】\n1. 扫描外箱\n2. 关闭异常单",
      },
    },
  } as PipelineResult,
  personnel,
  { revised: true, revision: 1 },
);
assert(revisedSplit.header.title.content.includes("修订版"), "revised title");
assert(JSON.stringify(revisedSplit).includes("已将 SOP 写入 OMS"), "revised card is write notice");
assert(!JSON.stringify(revisedSplit).includes("confirm_sop_write"), "revised card has no write button");
assert(!JSON.stringify(revisedSplit).includes("scene_wrong"), "revised card has no scene_wrong button");
assert(JSON.stringify(revisedSplit).includes("【AI 总结 - 需求描述】"), "card 需求描述段");
assert(JSON.stringify(revisedSplit).includes("【AI 总结 - 需求背景】"), "card 需求背景段");
assert(JSON.stringify(revisedSplit).includes("【操作步骤】"), "card 操作步骤段");

const retryCard = buildOmsWriteRetryCard({
  vascNo: "VASC000000315774",
  sceneKey: "inbound_label_identify",
  error: "登录超时，请重新登录",
  personnel: liveInbound,
  remainingManual: 2,
});
assert(retryCard.header.template === "red", "retry card red");
assert(JSON.stringify(retryCard).includes("retry_sop_write"), "retry action");
assertNoReviewerAt(JSON.stringify(retryCard), "retry 不 @ 审核员/负责人");
const exhaustedCard = buildOmsWriteRetryCard({
  vascNo: "VASC000000315774",
  sceneKey: "inbound_label_identify",
  error: "登录超时",
  personnel: liveInbound,
  remainingManual: 0,
});
assert(JSON.stringify(exhaustedCard).includes("请联系开发排查"), "exhausted hint");
assert(!JSON.stringify(exhaustedCard).includes("retry_sop_write"), "exhausted no retry button");

const sopFailCard = buildSopGenerateErrorCard(
  {
    ...base,
    orderNo: "VASC000000282990",
    outputPath: "sop_generated",
    failureGate: "llm-generate-sop",
    llm: { error: "SOP 编造了输入中没有的单号：VASC000000278868" },
  } as PipelineResult,
  personnel,
);
assert(sopFailCard.header.template === "red", "sop fail card red");
assert(!JSON.stringify(sopFailCard).includes("confirm_scene"), "sop fail card no scene select list");
assert(!JSON.stringify(sopFailCard).includes("scene_wrong"), "sop fail card no scene_wrong");
assert(JSON.stringify(sopFailCard).includes("SOP 编造了输入中没有的单号"), "sop fail card shows reason");

const withBasis = buildClarificationCard(
  {
    ...base,
    orderNo: "VASC000000360750",
    outputPath: "needs_field_clarification",
    missing: ["标签文件"],
    contextFacts: {
      customerCode: "17225006",
      customerName: "Plaud LLC",
      warehouseName: "DEBR2 Warehouse",
      allEventNos: ["EB0126090932893980"],
      allBusinessOrderNos: ["WI52514524", "WI52242392"],
    },
    matchResult: {
      decision: "supported",
      reason: "supported_llm_clear",
      scenarioName: "【入库】包裹类异常换商品标签上架",
      matchedActions: ["补贴包裹标签"],
      candidates: [{ sceneKey: "inbound_package_exception_relabel_shelving", sceneName: "包裹类异常换商品标签上架", score: 8 }],
      llmClassification: {
        matchedScene: "inbound_package_exception_relabel_shelving",
        confidence: "high",
        reasoning: "规则A：异常名称含商品条码异常，选场景5。",
        conclusionOneLiner: "商品条码异常，换商品标签后上架",
        extractedActions: [],
        alternativeScenes: [],
        ambiguous: false,
        exceptionInfos: [
          {
            ebNo: "EB0126090932893980",
            exceptionName: "商品条码异常(需客户处理)",
            exceptionObject: "商品",
            source: "oms_api",
          },
        ],
      },
    },
  } as PipelineResult,
  personnel,
);
assert(JSON.stringify(withBasis).includes("AI 判断场景：【入库】包裹类异常换商品标签上架（置信度：高）"), "展示 LLM 场景和置信度");
assert(JSON.stringify(withBasis).includes("AI 理由：商品条码异常，换商品标签后上架"), "展示 conclusionOneLiner");
assert(!JSON.stringify(withBasis).includes("规则A：异常名称含商品条码异常"), "有 oneLiner 时不展示 reasoning");
assert(
  compactAiReason(
    "本案例应用规则C（未知/复杂异常名称回退逻辑）。虽然异常名称是'商品条码异常(需客户处理)'，但需求描述明确说明：1）第三方编码已被主账号占用导致无法识别；2）现已取消绑定并重新绑定第三方编码到M010000000012103871；3）仓库只需重新扫描第三方编码即可识别上架。这是典型的【入库】关联第三方商品条码上架场景（202506120001）的特征：客户已完成第三方条码维护，仓库直接扫描上架，无需换标或补贴标签。",
  ) === "客户已完成第三方条码维护，仓库直接扫描上架，无需换标或补贴标签",
  "理由只保留结论",
);
assert(
  compactAiReason("的特征：客户已完成第三方条码维护，仓库直接扫描上架，无需换标或补贴标签") ===
    "客户已完成第三方条码维护，仓库直接扫描上架，无需换标或补贴标签",
  "去掉残句「的特征」",
);
assert(!compactAiReason("虽然名称复杂，但客户已关联第三方编码，要求按新单扫描上架").includes("虽然"), "去掉虽然但是");
assert(!JSON.stringify(withBasis).includes("supported_llm_clear"), "不再展示英文 reason");
assert(!JSON.stringify(withBasis).includes("📊"), "去掉规则打分");
assert(!JSON.stringify(withBasis).includes(" 分"), "不再展示规则分数");
assert(JSON.stringify(withBasis).includes("商品条码异常"), "依据含异常名称");
assert(JSON.stringify(withBasis).includes("oms_api"), "依据含 oms_api");
assert(JSON.stringify(withBasis).includes("增值单：VASC000000360750"), "facts 含增值单");
assert(JSON.stringify(withBasis).includes("入库单：WI52514524, WI52242392"), "facts 含入库单");
assert(JSON.stringify(withBasis).includes("异常单：EB0126090932893980（商品条码异常）"), "facts 异常单带名称");
assert(JSON.stringify(withBasis).includes("场景识别：【入库】包裹类异常换商品标签上架"), "facts 场景识别");
assert(JSON.stringify(l1).includes("入库单：WI52512121"), "L1 含入库单");
assert(JSON.stringify(l1).includes("增值单：VASC000000319344"), "L1 含增值单");
assert(
  judgmentBasis({
    matchResult: {
      llmClassification: {
        exceptionInfos: [
          { ebNo: "EB1", exceptionName: "商品条码异常(需客户处理)", exceptionObject: "商品", source: "oms_api" },
        ],
        reasoning: "规则A",
      },
    },
  } as PipelineResult)
    .split("\n").length <= 5,
  "依据不超过 5 行",
);
assert(
  judgmentBasis({
    matchResult: {
      retrievedCases: [
        { caseId: "VASC000000272889", sceneName: "批量异常补贴包裹标签", score: 8.3, keyAction: "补贴包裹标签" },
      ],
    },
  } as PipelineResult).includes("相似案例"),
  "依据含相似案例",
);
assert(
  judgmentBasis({
    matchResult: {
      scenarioName: "【入库】关联第三方商品条码上架",
      confidence: "high",
      llmClassification: {
        matchedScene: "inbound_third_party_merchandise_barcode",
        confidence: "high",
        reasoning: "虽然异常名称复杂，但客户已关联第三方编码。",
        extractedActions: [],
        alternativeScenes: [],
        ambiguous: false,
      },
    },
  } as PipelineResult).includes("AI 理由："),
  "无 oneLiner 时 fallback compactAiReason",
);

assert(
  !judgmentBasis({
    matchResult: {
      scenarioName: "【入库】关联第三方商品条码上架",
      confidence: "high",
      candidates: [
        { sceneKey: "a", sceneName: "包裹类异常换商品标签上架", score: 4 },
        { sceneKey: "b", sceneName: "尺重/标签辨识后换标上架", score: 2 },
      ],
      llmClassification: {
        matchedScene: "inbound_third_party_merchandise_barcode",
        confidence: "high",
        reasoning: "客户已关联第三方编码，要求按新单扫描上架。",
        conclusionOneLiner: "客户已关联第三方编码，按新单扫描上架",
        extractedActions: [],
        alternativeScenes: [],
        ambiguous: false,
      },
    },
  } as PipelineResult).includes("📊"),
  "LLM 判断卡不含规则分数",
);

const editUpdate = buildSopActionUpdateCard({
  originalCard: l4,
  kind: "sop_needs_edit",
  confirmedBy: "金萤",
  operatorOpenId: "ou_d09d7409a63201462177f4d8a8b1ac7b",
});
assert(editUpdate.header.template === "orange", "edit card orange");
assert(JSON.stringify(editUpdate).includes("AI 将根据意见重新生成"), "edit copy asks for instruction");
assert(!editUpdate.elements.some((el) => el.tag === "action"), "edit update removes buttons");

const cancelledUpdate = buildSopActionUpdateCard({
  originalCard: l4,
  kind: "write_cancelled",
  confirmedBy: "金萤",
  error: "订单状态为「待客户确认」，非待审核状态，禁止写入。可能审核员已经手动审核通过。",
  operatorOpenId: "ou_d09d7409a63201462177f4d8a8b1ac7b",
});
assert(cancelledUpdate.header.template === "orange", "cancelled card orange");
assert(JSON.stringify(cancelledUpdate).includes("OMS 写入已取消"), "cancelled copy");
assert(JSON.stringify(cancelledUpdate).includes("待客户确认"), "cancelled shows status");
assert(!cancelledUpdate.elements.some((el) => el.tag === "action"), "cancelled update removes buttons");
assert(!JSON.stringify(cancelledUpdate).includes("请重试"), "cancelled must not ask retry");

const cancelledThread = buildOmsWriteCancelledCard({
  vascNo: "VASC000000282990",
  error: "订单状态为「待客户确认」，非待审核状态，禁止写入。可能审核员已经手动审核通过。",
  personnel,
});
assert(cancelledThread.header.template === "orange", "cancelled thread orange");
assert(JSON.stringify(cancelledThread).includes("无需 AI 写入") || JSON.stringify(cancelledThread).includes("不要再点"), "cancelled thread no-write copy");
assert(!JSON.stringify(cancelledThread).includes("重试写入 OMS"), "cancelled thread has no retry button");

assert(looksLikeSceneWrong("场景错了，应该是换标场景"), "detect 场景错/应该是");
assert(looksLikeSceneWrong("不是这个场景"), "detect 不是这个场景");
assert(!looksLikeSceneWrong("请把第3步改成先拍照再上架"), "edit instruction is not scene-wrong");

assert(
  replaceInventedOrderNos("关联 VASC000000278868 上架到 WI1", ["VASC000000278868"]) === "关联 [待补充] 上架到 WI1",
  "invented no replaced",
);

const degradedCard = buildSopCard(
  {
    ...base,
    orderNo: "VASC000000282990",
    outputPath: "sop_generated",
    llm: {
      text: "将 [待补充] 关联上架",
      sop: {
        requirementBackground: "异常到仓",
        requirementDescription: "关联第三方后上架",
        warehouseSop: "1. 扫描 [待补充]\n2. 上架",
        sopText: "1. 扫描 [待补充]",
        degraded: true,
        degradeReason: "AI 编造了 VASC000000278868，已替换为 [待补充]",
      },
    },
  } as PipelineResult,
  personnel,
);
assert(degradedCard.header.template === "green", "degraded SOP still green");
assert(JSON.stringify(degradedCard).includes("[待补充]"), "degraded SOP keeps placeholder");
assert(JSON.stringify(degradedCard).includes("部分单号被替换为 [待补充]"), "degraded yellow notice");
assert(!JSON.stringify(degradedCard).includes("confirm_sop_write"), "degraded SOP auto-written, no button");

const allScenes = buildAllScenesCard(
  {
    ...base,
    orderNo: "VASC000000326061",
    outputPath: "transfer_human",
    contextFacts: { ...base.contextFacts, businessTypeDesc: "入库订单", vaSource: "INBOUND" },
  } as PipelineResult,
  personnel,
  "inbound",
);
assert(JSON.stringify(allScenes).includes("【入库场景】"), "all scenes inbound heading");
assert(JSON.stringify(allScenes).includes("以上都没有，确认转人工"), "all scenes transfer copy");
assert(
  allScenes.elements.flatMap((el) => (el.tag === "action" ? el.actions : [])).length > 10,
  "all scenes has many buttons",
);

const thirdPartyHits = searchSceneByKeyword("帮我找关联第三方的场景", { category: "inbound" });
assert(thirdPartyHits.length >= 1, "search 关联第三方");
assert(
  thirdPartyHits.some((item) => item.sceneKey === "inbound_third_party_merchandise_barcode"),
  "search hits inbound third-party merchandise",
);
const photoHits = searchSceneByKeyword("拍照暂存");
assert(photoHits.some((item) => item.sceneKey === "inbound_photo_hold"), "search 拍照暂存");

const singleSearch = buildSceneSearchSingleCard({
  vascNo: "VASC000000326061",
  scene: thirdPartyHits[0],
  personnel,
});
assert(JSON.stringify(singleSearch).includes("确认是这个场景"), "single search confirm");
assert(JSON.stringify(singleSearch).includes("show_all_scenes"), "single search reject → more scenes");

const multiSearch = buildSceneSearchMultiCard({
  vascNo: "VASC000000326061",
  scenes: thirdPartyHits.slice(0, 3),
  personnel,
});
assert(JSON.stringify(multiSearch).includes("以上都不是"), "multi search miss");

const canaryCard = buildCanaryPromoteCard({ count: 5, orderNos: ["VASC000000000001", "VASC000000000002"] });
assert(canaryCard.header.template === "orange", "canary promote card orange");
assert(JSON.stringify(canaryCard).includes("canary_promote"), "canary promote action");
assert(JSON.stringify(canaryCard).includes("没问题，切到正式群"), "canary promote button copy");
const canaryDone = buildCanaryPromotedUpdateCard({ sent: 5, skipped: 0, failed: 0 });
assert(canaryDone.header.template === "green", "canary promoted update green");
assert(JSON.stringify(canaryDone).includes("补发成功 5 单"), "canary promoted stats");
const canaryAlready = buildCanaryPromotedUpdateCard({ sent: 0, skipped: 0, failed: 0, already: true });
assert(JSON.stringify(canaryAlready).includes("已经切过了"), "canary promote second click");

const maskedNameCard = buildSopCard(
  {
    ...base,
    orderNo: "VASC000000342198",
    outputPath: "sop_generated",
    contextFacts: {
      customerCode: "19104098",
      customerName: "***************",
      warehouseName: "USWC",
      allEventNos: ["EB1"],
    },
  } as PipelineResult,
  personnel,
);
assert(!JSON.stringify(maskedNameCard).includes("***"), "group card never prints starred customer");
assert(JSON.stringify(maskedNameCard).includes("客户：19104098"), "masked name falls back to customer code");
assert(
  demoTopicTitle({
    orderNo: "VASC000000342198",
    contextFacts: { customerCode: "19104098", customerName: "***************", warehouseCode: "USWC" },
  }) === "VASC000000342198 | 19104098 | USWC | 待审核",
  "topic title drops starred customer name",
);
assert(
  demoTopicTitle({
    orderNo: "VASC000000342198",
    contextFacts: { customerCode: "19104098", customerName: "RED NOW LIMITED", warehouseCode: "USWC" },
  }).startsWith("VASC000000342198 | 19104098/RED NOW LIMITED | USWC"),
  "topic title keeps real customer name",
);

process.env.BREAKER_ALERT_USER_ID = "ou_d09d7409a63201462177f4d8a8b1ac7b";
const missingCodeCard = buildSopCard(
  {
    ...base,
    orderNo: "VASC000000374793",
    outputPath: "sop_generated",
    matchResult: {
      sceneKey: "inbound_reshelve_change_wi_keep_sku",
      scenarioName: "【入库】商品下架后换入库单重新上架（不更换SKU）",
      decision: "supported",
    } as MatchResult,
  } as PipelineResult,
  liveInbound,
);
const missingBlob = JSON.stringify(missingCodeCard);
assert(missingBlob.includes("ou_d09d7409a63201462177f4d8a8b1ac7b"), "缺 OMS 码绿卡 @ 金萤");
assert(missingBlob.includes("不选场景"), "缺 OMS 码说明不选下拉");
assertNoReviewerAt(missingBlob, "缺 OMS 码绿卡不 @ 李颖/何静/耿文文");
assert(!JSON.stringify(l4).includes("不选场景"), "普通绿卡不提缺码");

console.log("test-feishu-card ok");
