/**
 * Smoke: card JSON structure for L4 / L3 / L2.
 *
 *   npx tsx internal-review-copilot/scripts/test-feishu-card.ts
 */
import { buildClarificationCard, buildOmsWriteRetryCard, buildRequirementClarificationCard, buildSceneConfirmCard, buildSceneConfirmedUpdateCard, buildSopActionUpdateCard, buildSopCard, compactAiReason, demoTopicTitle, judgmentBasis } from "../lib/feishu-card.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
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

const l4 = buildSopCard({ ...base, orderNo: "VASC000000315774", outputPath: "sop_generated" } as PipelineResult, personnel);
assert(l4.header.template === "green", "L4 green");
assert(JSON.stringify(l4).includes("ou_d09d7409a63201462177f4d8a8b1ac7b"), "L4 at 金萤");
assert(!JSON.stringify(l4).includes("ou_a59d62e22e542e6689abf3fea1e3d087"), "demo L4 must not at 耿文文");

const l4Inbound = buildSopCard({ ...base, orderNo: "VASC000000315774", outputPath: "sop_generated" } as PipelineResult, liveInbound);
assert(JSON.stringify(l4Inbound).includes("ou_fb036b896ab183f3eea939470e47bf66"), "live inbound L4 at 耿文文");
assert(JSON.stringify(l4Inbound).includes("ou_c62fe459a4407900cdef6d340dbeb24c"), "L4 CC 李颖");
const l4Instock = buildSopCard({ ...base, orderNo: "VASC000000315774", outputPath: "sop_generated" } as PipelineResult, liveInstock);
assert(JSON.stringify(l4Instock).includes("ou_38892cd1daae40290c0a4994e614900a"), "live instock L4 at 何静");

const l3 = buildClarificationCard(
  {
    ...base,
    orderNo: "VASC000000298617",
    outputPath: "needs_field_clarification",
    missing: ["操作说明附件"],
    contextFacts: {
      warehouseName: "USKY3 Warehouse",
      allEventNos: ["EB1"],
      providedFields: { BEOR: "需先拍照暂存再辨识" },
    },
  } as PipelineResult,
  personnel,
);
assert(l3.header.template === "orange", "L3 orange");
assert(JSON.stringify(l3).includes("【AI 总结 - 需求描述】"), "L3 需求描述");
assert(JSON.stringify(l3).includes("【AI 总结 - 需求背景】"), "L3 需求背景");
assert(JSON.stringify(l3).includes("ou_ca7db67030e3816c9b4c92b668fed784"), "L3 at 销售");
assert(!JSON.stringify(l3).includes("ou_d09d7409a63201462177f4d8a8b1ac7b"), "L3 no reviewer");
assert(!l3.elements.some((el) => el.tag === "action"), "L3 no buttons");

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
assert(l1.header.template === "red", "L1 red");
assert(JSON.stringify(l1).includes("❓"), "L1 uses ❓");
assert(JSON.stringify(l1).includes("操作动作不清"), "L1 missing items");
assert(JSON.stringify(l1).includes("【AI 总结 - 需求描述】"), "L1 需求描述");
assert(JSON.stringify(l1).includes("【AI 总结 - 需求背景】"), "L1 需求背景");
assert(!JSON.stringify(l1).includes("AI 已识别的信息"), "L1 no old identified heading");
assert(!l1.elements.some((el) => el.tag === "action"), "L1 no buttons");

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
assert(JSON.stringify(l2).includes("【AI 总结 - 需求描述】"), "L2 需求描述");
assert(JSON.stringify(l2).includes("【AI 总结 - 需求背景】"), "L2 需求背景");
const buttons = l2.elements.flatMap((el) => (el.tag === "action" ? el.actions : []));
assert(buttons.length >= 3, `L2 buttons, got ${buttons.length}`);
assert(buttons.every((b) => b.tag === "button" && b.name === "scene_select"), "scene_select name");
assert(
  buttons.some((b) => b.tag === "button" && b.value.sceneKey === "inbound_label_identify" && b.value.vascNo === "VASC000000326061"),
  "value has sceneKey+vascNo",
);
assert(buttons.some((b) => b.tag === "button" && b.value.sceneKey === "transfer_human" && b.type === "danger"), "danger transfer");

const updated = buildSceneConfirmedUpdateCard(l2, "inbound_label_identify", "金萤", "ou_d09d7409a63201462177f4d8a8b1ac7b");
assert(!updated.elements.some((el) => el.tag === "action"), "update removes buttons");
assert(updated.open_ids?.[0] === "ou_d09d7409a63201462177f4d8a8b1ac7b", "open_ids for card 1.0 update");
assert(JSON.stringify(updated).includes("已确认场景"), "confirm copy");

assert(demoTopicTitle("needs_requirement_clarification", "VASC000000319344") === "VASC000000319344 增值单-智能审核请关注", "L1 topic");
assert(demoTopicTitle("transfer_human", "VASC000000326061") === "VASC000000326061 增值单-智能审核请关注", "L2 topic");
assert(demoTopicTitle("needs_field_clarification", "VASC000000298617") === "VASC000000298617 增值单-智能审核请关注", "L3 topic");
assert(demoTopicTitle("sop_generated", "VASC000000360654") === "VASC000000360654 增值单-智能审核请关注", "L4 topic");

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
assert(JSON.stringify(revisedSplit).includes("confirm_sop_write"), "revised card still has write button");
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
assert(JSON.stringify(retryCard).includes("ou_fb036b896ab183f3eea939470e47bf66"), "retry at 耿文文");
assert(JSON.stringify(retryCard).includes("ou_c62fe459a4407900cdef6d340dbeb24c"), "retry CC 李颖");
const exhaustedCard = buildOmsWriteRetryCard({
  vascNo: "VASC000000315774",
  sceneKey: "inbound_label_identify",
  error: "登录超时",
  personnel: liveInbound,
  remainingManual: 0,
});
assert(JSON.stringify(exhaustedCard).includes("请联系开发排查"), "exhausted hint");
assert(!JSON.stringify(exhaustedCard).includes("retry_sop_write"), "exhausted no retry button");

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
assert(JSON.stringify(withBasis).includes("AI 判断场景：包裹类异常换商品标签上架（置信度：高）"), "展示 LLM 场景和置信度");
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
assert(JSON.stringify(withBasis).includes("场景识别：包裹类异常换商品标签上架"), "facts 场景识别");
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

console.log("test-feishu-card ok");
