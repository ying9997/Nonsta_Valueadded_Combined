/**
 * Reply closure comparison: link post-reply reassessment to OMS final facts.
 *
 *   npx tsx internal-review-copilot/scripts/test-reply-closure.ts
 */
import {
  classifyReplyClosure,
  isAcceptedOrder,
  isCancelledOrder,
  parseOmsTimeMs,
  selectLinkedAcceptedOrder,
  type ReplyClosureOrder,
} from "../lib/reply-closure.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function order(patch: Partial<ReplyClosureOrder> & { orderNo: string }): ReplyClosureOrder {
  return {
    orderNo: patch.orderNo,
    customerCode: patch.customerCode || "19993406",
    statusDesc: patch.statusDesc || "待客户确认",
    isAuditThrough: patch.isAuditThrough ?? "Y",
    createdAtMs: patch.createdAtMs || parseOmsTimeMs("2026-09-30 18:04:28"),
    eventNos: patch.eventNos || [],
    sceneName: patch.sceneName || "【库内】商品拆箱加/减配件",
    missingFields: patch.missingFields || [],
  };
}

assert(parseOmsTimeMs("2026-09-30 16:59:04") > 0, "OMS time string should parse");
assert(isCancelledOrder(order({ orderNo: "VASC000000391044", statusDesc: "已取消" })), "cancelled order");
assert(isAcceptedOrder(order({ orderNo: "VASC000000421590", isAuditThrough: "Y" })), "approved order");
assert(!isAcceptedOrder(order({ orderNo: "VASC000000391044", statusDesc: "已取消" })), "cancelled is not accepted");

const originalWithEb = order({
  orderNo: "VASC000000X1",
  statusDesc: "审核不通过",
  isAuditThrough: "",
  eventNos: ["EB0126100900001"],
  createdAtMs: parseOmsTimeMs("2026-10-09 10:00:00"),
  sceneName: "",
});
const linkedByEb = selectLinkedAcceptedOrder({
  original: originalWithEb,
  traceAtMs: parseOmsTimeMs("2026-10-09 10:30:00"),
  candidates: [
    order({ orderNo: "VASC000000X2", eventNos: [], createdAtMs: parseOmsTimeMs("2026-10-09 10:40:00") }),
    order({ orderNo: "VASC000000X3", eventNos: ["EB0126100900001"], createdAtMs: parseOmsTimeMs("2026-10-09 11:00:00") }),
  ],
});
assert(linkedByEb.strategy === "event_no", "EB link should win");
assert(linkedByEb.order?.orderNo === "VASC000000X3", "EB-linked order selected");

const original415983 = order({
  orderNo: "VASC000000415983",
  statusDesc: "已取消",
  isAuditThrough: "",
  createdAtMs: parseOmsTimeMs("2026-09-30 16:30:00"),
  eventNos: [],
  sceneName: "",
});
const linked415983 = selectLinkedAcceptedOrder({
  original: original415983,
  traceAtMs: parseOmsTimeMs("2026-09-30 16:59:04"),
  candidates: [
    order({ orderNo: "VASC000000421000", customerCode: "OTHER", createdAtMs: parseOmsTimeMs("2026-09-30 17:00:00") }),
    order({ orderNo: "VASC000000421590", createdAtMs: parseOmsTimeMs("2026-09-30 18:04:28") }),
    order({ orderNo: "VASC000000421999", createdAtMs: parseOmsTimeMs("2026-09-30 19:00:00") }),
  ],
});
assert(linked415983.strategy === "customer_after_trace", "no EB should link by same customer after trace");
assert(linked415983.order?.orderNo === "VASC000000421590", "nearest later accepted customer order selected");

const closure415983 = classifyReplyClosure({
  original: original415983,
  aiSceneName: "【库内】商品拆箱加/减配件",
  aiMissingItems: ["处理数量未说明"],
  trace: {
    createdAtMs: parseOmsTimeMs("2026-09-30 16:59:04"),
    eventCode: "审核不通过",
    eventContent: "需求描述不清晰，请线下与客服沟通",
    supplementDesc: "您好，库内更换SKU需要提供上下架单据，麻烦提供后重新提交，谢谢。",
  },
  candidateOrders: [order({ orderNo: "VASC000000421590", createdAtMs: parseOmsTimeMs("2026-09-30 18:04:28") })],
  humanMissingItems: ["上下架单据"],
  bucketOverride: "required_rule_gap",
  nextTaskNo: "P0-011",
  goldCaseRole: "regression",
});
assert(closure415983.bucket === "required_rule_gap", "415983 is required-rule gap");
assert(closure415983.linkedOrderNo === "VASC000000421590", "415983 links to follow-up accepted order");
assert(closure415983.sceneMatched === true, "415983 scene matched");
assert(closure415983.missingItemDiff.aiOnly.includes("处理数量未说明"), "AI-only missing item kept");
assert(closure415983.missingItemDiff.humanOnly.includes("上下架单据"), "human-only missing item kept");
assert(closure415983.enterOptimizationLoop, "415983 enters optimization loop");
assert(closure415983.nextTaskNo === "P0-011", "415983 routes to P0-011");

const cancelled391044 = classifyReplyClosure({
  original: order({ orderNo: "VASC000000391044", statusDesc: "已取消", isAuditThrough: "", sceneName: "" }),
  aiSceneName: "",
  aiMissingItems: [],
  candidateOrders: [],
  goldCaseRole: "excluded",
});
assert(cancelled391044.bucket === "excluded_cancelled", "cancelled-only sample excluded");
assert(cancelled391044.excluded, "excluded flag set");
assert(!cancelled391044.enterOptimizationLoop, "391044 does not enter optimization loop");

const cancelled403008 = classifyReplyClosure({
  original: order({ orderNo: "VASC000000403008", statusDesc: "已取消", isAuditThrough: "", sceneName: "" }),
  aiSceneName: "",
  aiMissingItems: [],
  candidateOrders: [],
  goldCaseRole: "excluded",
});
assert(cancelled403008.bucket === "excluded_cancelled", "403008 cancelled sample excluded");
assert(!cancelled403008.enterOptimizationLoop, "403008 does not enter optimization loop");

const sceneWrong416175 = classifyReplyClosure({
  original: order({ orderNo: "VASC000000416175", statusDesc: "待客户确认", sceneName: "【库内】异常重新拍照" }),
  aiSceneName: "【库内】商品组合",
  aiMissingItems: [],
  humanFinalSceneName: "【库内】异常重新拍照",
  bucketOverride: "l2_scene_recognition",
  nextTaskNo: "P1-001",
  goldCaseRole: "regression",
});
assert(sceneWrong416175.bucket === "l2_scene_recognition", "416175 is L2 scene recognition regression");
assert(sceneWrong416175.nextTaskNo === "P1-001", "416175 routes to P1-001");

const facts420921 = classifyReplyClosure({
  original: order({ orderNo: "VASC000000420921", statusDesc: "待客户确认", sceneName: "【入库】尺重/标签辨识后换标上架" }),
  aiSceneName: "【入库】包裹条码批量异常（需客户处理）辨识后补贴包裹标签上架",
  aiMissingItems: ["处理数量或范围未说明"],
  humanFinalSceneName: "【入库】尺重/标签辨识后换标上架",
  humanMissingItems: ["上架入库单号"],
  auditorReply: "客户提供的新的单据可以判断数量",
  bucketOverride: "context_fact_gap",
  nextTaskNo: "P0-010",
  goldCaseRole: "regression",
});
assert(facts420921.bucket === "context_fact_gap", "420921 is facts/context injection gap");
assert(facts420921.nextTaskNo === "P0-010", "420921 routes to P0-010");
assert(facts420921.enterOptimizationLoop, "420921 enters optimization loop");

const nuance411852 = classifyReplyClosure({
  original: order({ orderNo: "VASC000000411852", statusDesc: "待客户确认", sceneName: "【库内】指定库位开箱拍照" }),
  aiSceneName: "【库内】拍摄照片/视频",
  aiMissingItems: ["水印/时间戳要求"],
  humanFinalSceneName: "【库内】指定库位开箱拍照",
  auditorReply: "无时间戳的要求",
  bucketOverride: "rule_nuance",
  nextTaskNo: "P0-011",
  nextTaskReason: "不能把时间戳粗暴设成所有照片/视频场景必填",
  goldCaseRole: "regression",
});
assert(nuance411852.bucket === "rule_nuance", "411852 remains timestamp rule nuance");
assert(nuance411852.nextTaskReason.includes("不能把时间戳粗暴设成所有照片/视频场景必填"), "411852 guard kept");

const nonActionable420954 = classifyReplyClosure({
  original: order({ orderNo: "VASC000000420954", statusDesc: "待客户确认", sceneName: "【入库】尺重/标签辨识后换标上架" }),
  aiSceneName: "【入库】包裹类异常换商品标签上架",
  aiMissingItems: [],
  humanFinalSceneName: "【入库】尺重/标签辨识后换标上架",
  notActionable: true,
  goldCaseRole: "non_actionable",
});
assert(nonActionable420954.bucket === "not_actionable", "420954 is not actionable");
assert(!nonActionable420954.enterOptimizationLoop, "420954 does not enter optimization loop");
assert(!nonActionable420954.nextTaskNo, "420954 does not route to an atomic fix");

console.log("test-reply-closure ok");
