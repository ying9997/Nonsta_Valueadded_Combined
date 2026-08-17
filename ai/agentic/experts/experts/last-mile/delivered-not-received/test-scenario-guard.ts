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

function validate(scanFact?: Record<string, unknown>): Record<string, unknown> {
  return runNode("nodes/validate-input.ts", {
    query: "买家未收到",
    trackingIds: ["TRACK-1"],
    enrichedContext: scanFact ? { computedScanFacts: [scanFact] } : {},
  });
}

function format(validated: Record<string, unknown>): Record<string, unknown> {
  return runNode("nodes/format-output.ts", {
    analysisResult: {
      structured: { branch: "claim_path_international" },
      analysis: "错误的 DNR 索赔结论",
    },
    dnrGuard: validated.dnrGuard,
    trackingIds: validated.trackingIds,
    outboundOrderNos: validated.outboundOrderNos,
  });
}

const ascanOnly = validate({ ascanEvents: [{}], dscanEvents: [], rdscanEvents: [] });
assert((ascanOnly.dnrGuard as Record<string, unknown>).eligibility === "ineligible", "Ascan 无 Dscan 应拒绝 DNR");
assert((format(ascanOnly).structured as Record<string, unknown>).branch === "not_dnr", "错误模型输出必须被覆盖为 not_dnr");

const delivered = validate({ ascanEvents: [{}], dscanEvents: [{}], rdscanEvents: [] });
assert((delivered.dnrGuard as Record<string, unknown>).eligibility === "eligible", "Dscan 应允许 DNR");
assert((format(delivered).structured as Record<string, unknown>).branch === "claim_path_international", "Dscan 场景应保留合法模型分支");

const returned = validate({ ascanEvents: [{}], dscanEvents: [], rdscanEvents: [{}] });
assert((format(returned).structured as Record<string, unknown>).branch === "not_dnr", "仅 RDscan 不得视为买家妥投");

const unknown = validate();
assert((format(unknown).structured as Record<string, unknown>).branch === "need_info", "无扫描事实不得凭用户表述认定 DNR");

const contradiction = runNode("nodes/validate-input.ts", {
  query: "系统显示签收但买家未收到",
  trackingIds: ["TRACK-1"],
  enrichedContext: { computedScanFacts: [{ ascanEvents: [{}], dscanEvents: [], rdscanEvents: [] }] },
});
assert((format(contradiction).structured as Record<string, unknown>).branch === "not_dnr", "结构化事实必须优先于用户措辞");

process.stdout.write("delivered-not-received scenario guard: OK\n");
