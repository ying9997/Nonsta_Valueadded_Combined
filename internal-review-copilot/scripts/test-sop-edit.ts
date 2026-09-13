/**
 * Smoke: SOP edit helpers (no Feishu / OMS).
 *
 *   npx tsx internal-review-copilot/scripts/test-sop-edit.ts
 */
import { MAX_SOP_EDITS, isEchoOfSop, pickLatestEditAfter, previewSopStream, sceneKeyForSopEdit, stripNotesIfRequested } from "../lib/sop-edit.ts";
import { extractSopSections, composeIdentifiedSummaries } from "../lib/sop-sections.ts";
import type { CaseRecord } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const clickAt = "2026-09-11T03:00:00.000Z";
const before = String(Date.parse("2026-09-11T02:50:00.000Z"));
const after = String(Date.parse("2026-09-11T03:05:00.000Z"));

assert(pickLatestEditAfter([], clickAt) === "", "no replies");
assert(
  pickLatestEditAfter([{ text: "旧消息", at: before }], clickAt) === "",
  "ignore replies before click",
);
assert(
  pickLatestEditAfter(
    [
      { text: "旧消息", at: before },
      { text: "第 3 步缺少关闭异常单的操作", at: after },
    ],
    clickAt,
  ) === "第 3 步缺少关闭异常单的操作",
  "take latest after click",
);

const rec = {
  confirmedScene: "inbound_aplus_direct_shelve",
  matchResult: { sceneKey: "other" },
} as CaseRecord;
assert(sceneKeyForSopEdit(rec) === "inbound_aplus_direct_shelve", "override confirmed scene");
assert(isEchoOfSop("【操作要求】\n1. 扫描", "【需求背景】x\n\n【操作要求】\n1. 扫描\n\n【注意事项】"), "echo of SOP section");
assert(
  pickLatestEditAfter([{ text: "去掉注意事项部分", at: String(Date.parse("2026-09-11T02:59:50.000Z")) }], clickAt) ===
    "去掉注意事项部分",
  "same-minute reply still counts",
);

assert(
  stripNotesIfRequested("背景\n\n【注意事项】\n- a", "去掉注意事项部分").includes("注意事项") === false,
  "strip notes when asked",
);

assert(previewSopStream('{"sopText":"【需求背景】\\nhello"}').includes("需求背景"), "preview sopText from stream json");

const sections = extractSopSections({
  aiGeneratedText:
    "【需求背景】\n到仓海运整柜。\n\n【需求描述】\n按新单上架。\n\n【操作要求】\n1. 扫描外箱\n2. 关闭异常单",
});
assert(sections.requirementBackground.includes("海运整柜"), "extract 需求背景");
assert(sections.requirementDescription.includes("按新单上架"), "extract 需求描述");
assert(sections.operationSteps.startsWith("1. 扫描外箱"), "extract 操作步骤");
assert(!sections.operationSteps.includes("需求背景"), "操作步骤不含需求背景");

const fromLlm = extractSopSections({
  llmSop: {
    requirementBackground: "背景A",
    requirementDescription: "描述A",
    warehouseSop: "1. 上架",
    sopText: "【需求背景】背景A\n\n【操作要求】\n1. 上架",
  },
});
assert(fromLlm.requirementDescription === "描述A", "llm 需求描述优先");
assert(fromLlm.operationSteps === "1. 上架", "llm warehouseSop");

assert(
  extractSopSections({
    llmSop: {
      requirementDescription: "麻烦扫描外箱条码直接按新单上架的 新单：WI52512121",
      requirementBackground: "背景A",
      warehouseSop: "1. 上架",
    },
    customerRequirementDescription: "麻烦扫描外箱条码直接按新单上架的 新单：WI52512121",
  }).requirementDescription === "",
  "copy of original requirementDescription is dropped",
);

const identified = composeIdentifiedSummaries({
  allEventNos: ["EB1"],
  allBusinessOrderNos: ["WI1", "WI2"],
  providedFields: { BEOR: "可贴 SKU 判断是否同一单号", VAS_ATTR_REL_RD: "帮我处理一下" },
  originalRequirement: "帮我处理一下",
});
assert(identified.requirementDescription.includes("EB1"), "compose 需求描述 from EB/WI");
assert(identified.requirementDescription.includes("WI1"), "compose 需求描述 has WI");
assert(!identified.requirementDescription.includes("帮我处理一下"), "compose 不复制原文");
assert(identified.requirementBackground.includes("SKU"), "compose 需求背景 from BEOR");

console.log("test-sop-edit ok");
