/**
 * 回流死胡同 + 入库调查监控豁免时间戳。
 *
 *   npx tsx internal-review-copilot/scripts/test-reassess-loop.ts
 */
import {
  isInboundMonitorVideoIntent,
  requiredInfoForIntent,
} from "../lib/check-scene-completeness.ts";
import {
  humanRepliesAfterClarification,
  isClarificationOutput,
  nextStatusAfterReassess,
} from "../lib/reassess-loop.ts";
import { clearScenarioCardsCache, findScenarioCard } from "../lib/scenario-cards.ts";
import type { FeishuMessage } from "../lib/feishu-bot.ts";
import type { PipelineResult } from "../lib/run-pipeline.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function fakeResult(outputPath: PipelineResult["outputPath"], missingAttachments: string[] = []): PipelineResult {
  return {
    orderNo: "VASC_TEST",
    outputPath,
    ruleOutputPath: outputPath,
    missing: [],
    missingAttachments,
    missingRequirementItems: [],
    missingFields: [],
    analysis: "",
    failureGate: null,
    nodesHit: [],
    riskFlags: [],
    agentInput: {} as PipelineResult["agentInput"],
    contextFacts: {} as PipelineResult["contextFacts"],
    matchResult: { sceneKey: "instock_photo_video" } as PipelineResult["matchResult"],
    llm: null,
    structured: null,
    structuredReview: null,
  } as unknown as PipelineResult;
}

assert(nextStatusAfterReassess(fakeResult("needs_requirement_clarification")) === "needs_clarification", "缺需求应回 needs_clarification");
assert(nextStatusAfterReassess(fakeResult("needs_field_clarification")) === "needs_clarification", "缺字段应回 needs_clarification");
assert(nextStatusAfterReassess(fakeResult("sop_generated")) === "written_back", "SOP 齐应 written_back");
assert(nextStatusAfterReassess(fakeResult("sop_generated", ["标签文件"])) === "needs_attachment", "缺附件应 needs_attachment");
assert(nextStatusAfterReassess(fakeResult("transfer_human")) === "transferred", "转人工");
assert(isClarificationOutput(fakeResult("needs_requirement_clarification")), "clarif detect");

const cardAt = "2026-09-20T01:46:41.000Z";
const messages: FeishuMessage[] = [
  {
    messageId: "1",
    chatId: "c",
    threadId: "t",
    text: "旧回复",
    createTime: String(Date.parse("2026-09-20T01:40:00.000Z")),
    senderId: "u1",
    senderType: "user",
    msgType: "text",
  },
  {
    messageId: "2",
    chatId: "c",
    threadId: "t",
    text: "新回复 给了时间段",
    createTime: String(Date.parse("2026-09-20T02:15:00.000Z")),
    senderId: "u1",
    senderType: "user",
    msgType: "text",
  },
];
const after = humanRepliesAfterClarification(messages, cardAt, {});
assert(after.length === 1 && after[0].text.includes("新回复"), "只收追问卡之后的回复");

const monitor =
  "亚马逊退件物流显示仓库已签收，上架数量与实际退出不符，少了30多台。查看该入库单入库监控视频，判断是否丢件。";
assert(isInboundMonitorVideoIntent(monitor), "监控调查应识别");
assert(!isInboundMonitorVideoIntent("请给SKU拍照并加水印用于Temu申诉"), "普通库内拍摄不应识别为监控调查");

clearScenarioCardsCache();
const card = findScenarioCard("instock_photo_video");
assert(card, "有拍摄场景卡");
const normal = requiredInfoForIntent(card, "请拍SKU照片并带时间戳水印做申诉", "instock_photo_video");
assert(normal.some((f) => f.field === "水印/时间戳要求"), "普通拍摄仍要水印字段");
const waived = requiredInfoForIntent(card, monitor, "instock_photo_video");
assert(!waived.some((f) => f.field === "水印/时间戳要求"), "入库调查监控豁免水印/时间戳");
assert(card!.boundaryRules.some((r) => r.includes("入库调查调监控")), "场景卡边界已写监控区别");

console.log("test-reassess-loop: ok");
