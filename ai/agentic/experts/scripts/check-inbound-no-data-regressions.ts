/**
 * Regression checks for inbound experts that must not turn missing order facts
 * into default business states such as "pending", "not_arrived", or "within SLA".
 */
import { execFileSync } from "child_process";
import path from "path";

const repoRoot = path.resolve(__dirname, "..");
const tsNodeBin = require.resolve("ts-node/dist/bin.js");

let failed = false;

function fail(message: string): never {
  failed = true;
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function runNode<T = Record<string, unknown>>(relativeFile: string, params: Record<string, unknown>): T {
  const stdout = execFileSync(
    process.execPath,
    [tsNodeBin, "-P", path.join(repoRoot, "scripts", "tsconfig.json"), path.join(repoRoot, relativeFile), JSON.stringify(params)],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(stdout) as T;
}

function assertNoDataFact(fact: Record<string, unknown>, label: string) {
  assert(fact.outputPath === "no_data", `${label} should use outputPath=no_data`);
  assert(fact.dataAvailable === false, `${label} should mark dataAvailable=false`);
  assert(fact.needsClarification === true, `${label} should require clarification`);
  assert(asArray(fact.clarificationFields).includes("inboundOrderNo"), `${label} should ask for inboundOrderNo`);
}

function checkPutawayStatusNoData() {
  const computed = runNode("experts/inbound/inbound-putaway-status/nodes/compute-putaway-progress.ts", {
    prunedOrderData: { list: [], total: 0 },
    inboundOrderNos: ["WI-NO-DATA"],
  });
  const fact = asRecord(computed.putawayProgress);
  assertNoDataFact(fact, "inbound-putaway-status");
  assert(fact.putawayStage === "unknown", "putaway status should not default to pending");
  assert(fact.slaBreached === null, "putaway status should not default slaBreached=false");

  const formatted = runNode("experts/inbound/inbound-putaway-status/nodes/format-output.ts", {
    analysisResult: {
      structured: { outputPath: "status_found", putawayStage: "pending", slaBreached: false },
      analysis: "模型不能把未取得事实改写为待上架。",
    },
    putawayProgress: fact,
    inputContext: { chainId: "no-data-putaway-status" },
  });
  const structured = asRecord(formatted.structured);
  assertNoDataFact(structured, "inbound-putaway-status formatter");
  assert(structured.putawayStage === "unknown", "putaway formatter should preserve unknown stage");
}

function checkPutawayExpediteNoData() {
  const computed = runNode("experts/inbound/inbound-putaway-expedite/nodes/evaluate-sla-breach.ts", {
    prunedOrderData: { list: [], total: 0 },
    inboundOrderNos: ["WI-NO-DATA"],
  });
  const fact = asRecord(computed.slaFacts);
  assertNoDataFact(fact, "inbound-putaway-expedite");
  assert(fact.escalationPath === "no_data", "expedite should not default to wait_within_sla");
  assert(fact.slaBreached === null, "expedite should not default slaBreached=false");

  const formatted = runNode("experts/inbound/inbound-putaway-expedite/nodes/format-output.ts", {
    analysisResult: {
      structured: { outputPath: "status_found", escalationPath: "wait_within_sla", slaBreached: false },
      analysis: "模型不能把未取得事实改写为时效内等待。",
    },
    slaFacts: fact,
    inputContext: { chainId: "no-data-putaway-expedite" },
  });
  const structured = asRecord(formatted.structured);
  assertNoDataFact(structured, "inbound-putaway-expedite formatter");
  assert(structured.escalationPath === "no_data", "expedite formatter should preserve no_data path");
}

function checkOverseasInspectionNoData() {
  const computed = runNode("experts/inbound/inbound-overseas-inspection/nodes/compute-overseas-inspection-phase.ts", {
    prunedOrderData: { list: [], total: 0 },
    inboundOrderNos: ["WI-NO-DATA"],
    intent: "progress",
  });
  const fact = asRecord(computed.inspectionPhase);
  assertNoDataFact(fact, "inbound-overseas-inspection");
  assert(fact.overseasInspectionPhase === "unknown", "overseas inspection should not default to not_arrived");
  assert(fact.isAbnormal === null, "overseas inspection should not default isAbnormal=false");

  const formatted = runNode("experts/inbound/inbound-overseas-inspection/nodes/format-output.ts", {
    analysisResult: {
      structured: { outputPath: "status_found", overseasInspectionPhase: "not_arrived", isAbnormal: false },
      analysis: "模型不能把未取得事实改写为未到仓。",
    },
    inspectionPhase: fact,
    inputContext: { chainId: "no-data-overseas-inspection" },
  });
  const structured = asRecord(formatted.structured);
  assertNoDataFact(structured, "inbound-overseas-inspection formatter");
  assert(structured.overseasInspectionPhase === "unknown", "overseas formatter should preserve unknown phase");
}

const checks: Array<[string, () => void]> = [
  ["inbound-putaway-status no-data guard", checkPutawayStatusNoData],
  ["inbound-putaway-expedite no-data guard", checkPutawayExpediteNoData],
  ["inbound-overseas-inspection no-data guard", checkOverseasInspectionNoData],
];

for (const [name, check] of checks) {
  try {
    check();
    console.log(`OK   ${name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
console.log("Inbound no-data regression checks OK");
