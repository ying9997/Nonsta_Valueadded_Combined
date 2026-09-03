/**
 * P-001 整段干跑：validate → match → completeness → mock SOP → format-output
 * 人眼看终端打印的 uiActionProposal，并对照 A 金标四步。
 * 运行：npx tsx tests/test-p001-dryrun.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { main as validateInput } from "../nodes/validate-input.js";
import { main as matchTemplate } from "../nodes/match-template.js";
import { main as checkCompleteness } from "../nodes/check-completeness.js";
import { main as formatOutput } from "../nodes/format-output.js";

const here = dirname(fileURLToPath(import.meta.url));
const casePath = resolve(here, "pilot-f001/cases/P-001-happy.json");
const outDir = resolve(here, "../../../../_tmp/20260901_pageagent_oms_testenv");
const outPath = resolve(outDir, "P-001-dryrun-uiActionProposal.json");

async function run() {
  const tc = JSON.parse(readFileSync(casePath, "utf8")) as Record<string, unknown>;

  const step1 = await validateInput({ params: tc });
  const validationResult = step1.validationResult as Record<string, unknown>;
  if (!validationResult.ok) {
    throw new Error(`P-001 blocked at validate-input: ${JSON.stringify(validationResult)}`);
  }

  const step2 = await matchTemplate({
    params: { sopInput: step1.sopInput, validationResult },
  });
  const matchResult = step2.matchResult as Record<string, unknown>;
  if (!matchResult.matched || matchResult.sceneKey !== "inbound_label_identify") {
    throw new Error(`P-001 match failed: ${JSON.stringify(matchResult)}`);
  }

  const step3 = await checkCompleteness({
    params: { sopInput: step2.sopInput, matchResult },
  });
  const completenessResult = step3.completenessResult as Record<string, unknown>;
  if (!completenessResult.complete) {
    throw new Error(`P-001 not complete: ${JSON.stringify(completenessResult)}`);
  }

  const sopGenerationResult = {
    sopText: [
      "仓库按已确认 SOP 对异常单 EB0326062258 / WI46673588 辨识后换标上架。",
      "SKU-A 换成 SKU-B，共 100 件；不需要补贴新入库单包裹标签。",
    ].join(""),
    scenarioName: "【入库】尺重/标签辨识后换标上架",
    fieldsUsed: ["操作说明附件", "商品和标签的对应关系", "标签文件"],
  };

  const final = await formatOutput({
    params: {
      sopInput: step3.sopInput,
      matchResult,
      completenessResult,
      sopGenerationResult,
      validationResult,
    },
  });

  const structured = final.structured as Record<string, unknown>;
  const proposal = structured.uiActionProposal as {
    actions: Array<Record<string, string>>;
  };
  if (structured.outputPath !== "sop_generated") {
    throw new Error(`outputPath=${structured.outputPath}`);
  }
  if (!proposal?.actions) throw new Error("missing uiActionProposal");

  const keys = proposal.actions.map((a) => `${a.type}:${a.fieldKey}`);
  const expectedKeys = [
    "select:shelveWayCode",
    "select:serviceCode",
    "fill:BEOR",
    "fill:VAS_ATTR_REL_RD",
  ];
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`shape mismatch: ${JSON.stringify(keys)}`);
  }
  if (proposal.actions[0].valueCode !== "INBOUND_ORDER_OF_CUSTOMER") {
    throw new Error("shelveWayCode != INBOUND_ORDER_OF_CUSTOMER");
  }
  if (proposal.actions[0].valueLabel !== "客户创建新单上架") {
    throw new Error("valueLabel 必须是页上文案「客户创建新单上架」");
  }
  if (proposal.actions[1].valueCode !== "OW01V1602") {
    throw new Error("serviceCode != OW01V1602");
  }
  if (proposal.actions.some((a) => a.type === "submit" || a.valueLabel === "提交")) {
    throw new Error("must not emit submit");
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(final, null, 2)}\n`, "utf8");

  console.log("PASS P-001 dryrun");
  console.log("");
  console.log("人眼对这 4 行（应与 A 金标同形状）：");
  for (const action of proposal.actions) {
    const value = action.valueCode || action.value;
    console.log(`  ${action.type}  ${action.fieldKey}  =  ${value}`);
  }
  console.log("");
  console.log(`完整 JSON：${outPath}`);
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
