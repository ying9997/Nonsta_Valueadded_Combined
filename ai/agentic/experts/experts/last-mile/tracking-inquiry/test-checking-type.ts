import { execFileSync } from "child_process";
import * as path from "path";

const root = path.resolve(__dirname, "../../..");
const tsNode = require.resolve("ts-node/dist/bin.js");
const tsconfig = path.join(root, "scripts", "tsconfig.json");

function runNode(file: string, params: Record<string, unknown>): Record<string, unknown> {
  const stdout = execFileSync(
    process.execPath,
    [tsNode, "-P", tsconfig, path.join(__dirname, file), JSON.stringify(params)],
    { encoding: "utf8" }
  );
  return JSON.parse(stdout) as Record<string, unknown>;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function classify(scanFact: Record<string, unknown>, summary: string, query = "买家未收到"): Record<string, unknown> {
  const result = runNode("nodes/derive-checking-type.ts", {
    query,
    enrichedContext: {
      "last-mile/delivery-status": [{ computedScanFacts: [scanFact], trajectorySummary: summary }],
    },
  });
  return result.checkingTypeRecommendation as Record<string, unknown>;
}

const ot = classify({ ascanEvents: [{}], dscanEvents: [], rdscanEvents: [] }, "包裹派送异常停滞");
assert(ot.recommendedCheckingType === "OT", "Ascan + 无 Dscan + 异常应推荐 OT");

const returned = classify(
  { ascanEvents: [{}], dscanEvents: [], rdscanEvents: [{}] },
  "包裹派送失败并已退回"
);
assert(returned.recommendedCheckingType === "FR", "RDscan 退回终态应推荐 FR");
assert(returned.recommendedCheckingTypeName === "退回原因", "RDscan 应显示退回原因");
assert(returned.classificationConfidence === "high", "RDscan 结构化事实应为高置信度");

const returnedWithDscan = classify(
  { ascanEvents: [{}], dscanEvents: [{}], rdscanEvents: [{}] },
  "买家未收到，包裹已退回"
);
assert(returnedWithDscan.recommendedCheckingType === "FR", "RDscan 优先级应高于 Dscan + 未收到的 NT");

const chainedReturn = runNode("nodes/derive-checking-type.ts", {
  query: "这票为什么退回",
  inputContext: {
    previousOutput: {
      enrichedContext: {
        returnOrders: [
          {
            returnGoodsOrderNo: "RT_TEST",
            outboundOrderNo: "WO_TEST",
            retrunReason: "DF",
            returnReasonName: "派送失败",
            status: "OC",
            statusName: "已完成",
          },
        ],
      },
    },
  },
});
const chainedRecommendation = chainedReturn.checkingTypeRecommendation as Record<string, unknown>;
assert(chainedRecommendation.recommendedCheckingType === "FR", "问题2的派送失败退货事实应驱动问题1推荐 FR");
assert(chainedRecommendation.hasDeliveryFailureReturn === true, "应标记已消费派送失败退货事实");
assert(chainedRecommendation.hasScanFacts === false, "仅有退货单事实时不得伪报存在扫描事实");

const customerReturn = runNode("nodes/derive-checking-type.ts", {
  query: "这票为什么退回",
  enrichedContext: {
    returnOrders: [{ retrunReason: "BR", returnReasonName: "客户退货" }],
  },
});
const customerReturnRecommendation = customerReturn.checkingTypeRecommendation as Record<string, unknown>;
assert(customerReturnRecommendation.recommendedCheckingType !== "FR", "客户主动退货不得误判为派送失败退回");

const nt = classify({ ascanEvents: [{}], dscanEvents: [{}], rdscanEvents: [] }, "已妥投");
assert(nt.recommendedCheckingType === "NT", "Dscan + 未收到应推荐 NT");

const early = classify({ ascanEvents: [{}], dscanEvents: [], rdscanEvents: [] }, "包裹正常运输中");
assert(early.recommendedCheckingType === "", "未证明超时或异常时不得提前推荐 OT");

const possibleReturn = classify(
  { ascanEvents: [{}], dscanEvents: [], rdscanEvents: [] },
  "请补充地址信息以避免退回"
);
assert(possibleReturn.recommendedCheckingType !== "FR", "无 RDscan 时不得仅凭避免退回文本推荐 FR");

const noScan = classify({ ascanEvents: [], dscanEvents: [], rdscanEvents: [] }, "暂无轨迹");
assert(noScan.recommendedCheckingType === "", "无 Ascan 不得推荐 OT");
assert((noScan.suggestedNextExperts as string[]).includes("tracking-no-scan"), "无扫描应建议 tracking-no-scan");

const formatted = runNode("nodes/format-output.ts", {
  analysisResult: { structured: {}, analysis: "未查询到查件记录。" },
  tailTraceFacts: { listStatus: "empty", submissionGuidanceUrl: "https://example.invalid" },
  checkingTypeRecommendation: ot,
  inputContext: {},
});
const structured = formatted.structured as Record<string, unknown>;
assert(structured.recommendedCheckingType === "OT", "format-output 应固化推荐类型");
assert(String(formatted.analysis).includes("超时未妥投"), "无记录时对客文案应明确推荐类型");

const formattedReturn = runNode("nodes/format-output.ts", {
  analysisResult: { structured: {}, analysis: "未查询到查件记录。" },
  tailTraceFacts: { listStatus: "empty", submissionGuidanceUrl: "https://example.invalid" },
  checkingTypeRecommendation: returned,
  inputContext: {},
});
const returnStructured = formattedReturn.structured as Record<string, unknown>;
assert(returnStructured.recommendedCheckingType === "FR", "format-output 应固化 FR 推荐类型");
assert(String(formattedReturn.analysis).includes("退回原因"), "无记录时对客文案应推荐退回原因");

process.stdout.write("tracking-inquiry checking type: OK\n");
