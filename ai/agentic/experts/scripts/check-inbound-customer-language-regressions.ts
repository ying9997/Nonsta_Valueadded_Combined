/**
 * Offline regression checks for inbound customer-facing language.
 * Ensures LLM output cannot expose internal order configuration field names.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "..");
const tsNodeBin = require.resolve("ts-node/dist/bin.js");
const internalFieldPattern = /orderMode|isAutoInspection/i;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function runNode(relativeFile: string, params: Record<string, unknown>): Record<string, unknown> {
  const stdout = execFileSync(
    process.execPath,
    [
      tsNodeBin,
      "-P",
      path.join(repoRoot, "scripts", "tsconfig.json"),
      path.join(repoRoot, relativeFile),
      JSON.stringify(params),
    ],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(stdout) as Record<string, unknown>;
}

function assertNoInternalFields(result: Record<string, unknown>, label: string) {
  assert(
    !internalFieldPattern.test(JSON.stringify(result)),
    `${label} leaked an internal order configuration field`
  );
}

function checkOrderManage() {
  const result = runNode("experts/inbound/inbound-order-manage/nodes/format-output.ts", {
    intent: "create",
    analysisResult: {
      structured: {
        operationSteps: [
          "填写目的仓、SKU 与箱单信息。",
          "请确认 orderMode 与 isAutoInspection 配置。",
        ],
        riskNotes: ["如 isAutoInspection 设置异常，请保留页面提示。"],
        orderMode: "SelfInspectionPlanSKU",
        nested: { isAutoInspection: "Y" },
      },
      analysis: "填写完成后，请确认 orderMode 与 isAutoInspection 配置。",
    },
    inputContext: { chainId: "inbound-customer-language-order-manage" },
  });
  const structured = asRecord(result.structured);
  const operationSteps = asStrings(structured.operationSteps);

  assertNoInternalFields(result, "inbound-order-manage");
  assert(operationSteps.includes("填写目的仓、SKU 与箱单信息。"), "normal order step must be preserved");
  assert(
    operationSteps.some((step) => step.includes("相关下单设置")),
    "internal configuration step must use neutral customer language"
  );
  assert(!("orderMode" in structured), "orderMode key must be removed from customer output");
}

function checkProcessGuide() {
  const result = runNode("experts/inbound/inbound-process-guide/nodes/format-output.ts", {
    analysisResult: {
      structured: {
        sopSteps: [
          "完成商品注册与 PSC 选择。",
          "请确认 orderMode 与 isAutoInspection 配置。",
        ],
        prerequisites: ["按页面完成 isAutoInspection 相关设置。"],
        isAutoInspection: "N",
      },
      analysis: "如页面出现 orderMode 或 isAutoInspection，请按提示完成设置。",
    },
    inputContext: { chainId: "inbound-customer-language-process-guide" },
  });
  const structured = asRecord(result.structured);
  const sopSteps = asStrings(structured.sopSteps);

  assertNoInternalFields(result, "inbound-process-guide");
  assert(sopSteps.includes("完成商品注册与 PSC 选择。"), "normal process step must be preserved");
  assert(
    sopSteps.some((step) => step.includes("相关下单设置")),
    "internal configuration step must use neutral customer language"
  );
  assert(!("isAutoInspection" in structured), "isAutoInspection key must be removed from customer output");
}

function checkSourcePrompts() {
  const orderCreateKb = fs.readFileSync(
    path.join(repoRoot, "experts", "inbound", "inbound-order-manage", "prompts", "kb-order-create.md"),
    "utf8"
  );
  const processKb = fs.readFileSync(
    path.join(repoRoot, "experts", "inbound", "inbound-process-guide", "prompts", "kb-process.md"),
    "utf8"
  );

  assert(!internalFieldPattern.test(orderCreateKb), "order-create KB must not expose internal field names");
  assert(!internalFieldPattern.test(processKb), "process KB must not expose internal field names");
  assert(orderCreateKb.includes("页面提示"), "order-create KB must retain a customer action");
  assert(processKb.includes("页面提示"), "process KB must retain a customer action");
}

function checkExportedWorkflows() {
  const orderWorkflow = fs.readFileSync(
    path.join(
      repoRoot,
      "experts",
      "inbound",
      "inbound-order-manage",
      "workflow",
      "workflow",
      "inbound_order_manage-draft.yaml"
    ),
    "utf8"
  );
  const processWorkflow = fs.readFileSync(
    path.join(
      repoRoot,
      "experts",
      "inbound",
      "inbound-process-guide",
      "workflow",
      "workflow",
      "inbound_process_guide-draft.yaml"
    ),
    "utf8"
  );

  assert(orderWorkflow.includes("若页面出现相关设置，请按所选 PSC 和页面提示完成"), "order workflow KB is stale");
  assert(processWorkflow.includes("完成页面设置**：如页面出现相关设置"), "process workflow KB is stale");
  assert(!orderWorkflow.includes("4. 确认 `orderMode` 与 `isAutoInspection` 配置"), "order workflow has stale customer wording");
  assert(!processWorkflow.includes("注意 orderMode 与 isAutoInspection（自验/海外验/标准差异）"), "process workflow has stale customer wording");
}

const checks: Array<[string, () => void]> = [
  ["inbound-order-manage customer language", checkOrderManage],
  ["inbound-process-guide customer language", checkProcessGuide],
  ["inbound customer-facing KB language", checkSourcePrompts],
  ["inbound exported workflow customer language", checkExportedWorkflows],
];

let failed = false;
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
console.log("Inbound customer-language regression checks OK");
