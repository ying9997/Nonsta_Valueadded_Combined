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

function validate(scanFact: Record<string, unknown> | null, withOrder = true): Record<string, unknown> {
  return runNode("nodes/validate-input.ts", {
    scenario: "妥投未收到",
    customerIntent: "查询妥投未收到赔付标准",
    trackingIds: withOrder ? ["TRACK-1"] : [],
    enrichedContext: scanFact
      ? { "last-mile/delivery-status": [{ computedScanFacts: [scanFact] }] }
      : {},
  });
}

function format(validated: Record<string, unknown>): Record<string, unknown> {
  return runNode("nodes/format-output.ts", {
    analysisResult: {
      structured: {
        policyBranch: "carrier_designated",
        matchedRuleIds: ["WRONG-DNR-RULE"],
        confidence: "high",
        suggestedNextStep: "route_to_substitute_claim",
      },
      analysis: "可在妥投后60天申请。",
    },
    scenarioGuard: validated.scenarioGuard,
    inputContext: {},
  });
}

const notDelivered = validate({ ascanEvents: [{}], dscanEvents: [], rdscanEvents: [] });
const blocked = format(notDelivered);
const blockedStructured = blocked.structured as Record<string, unknown>;
assert(blockedStructured.scenarioApplicability === "inapplicable", "无 Dscan 的具体订单应标记不适用");
assert((blockedStructured.matchedRuleIds as unknown[]).length === 0, "不适用时不得保留 DNR 条款");
assert(blockedStructured.suggestedNextStep === "route_to_tracking_inquiry", "不适用时应转尾程查件");
assert(!String(blocked.analysis).includes("60天"), "不适用时不得输出 DNR 申请窗口");

const delivered = validate({ ascanEvents: [{}], dscanEvents: [{}], rdscanEvents: [] });
const allowed = format(delivered);
assert((allowed.structured as Record<string, unknown>).scenarioApplicability === "applicable", "Dscan 具体订单应允许匹配 DNR 条款");
assert(String(allowed.analysis).includes("60天"), "适用场景应保留模型条款解释");

const generic = validate(null, false);
const genericOutput = format(generic);
assert((genericOutput.structured as Record<string, unknown>).scenarioApplicability === "not_checked", "通用政策咨询不应被订单门禁拦截");
assert(String(genericOutput.analysis).includes("60天"), "通用政策咨询应保留条款解释");

process.stdout.write("refund-standard scenario applicability: OK\n");
