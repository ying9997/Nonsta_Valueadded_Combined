/**
 * format-output：入库金标才出 uiActionProposal；库内 sop_generated 不出这包。
 * 运行：npx tsx tests/test-format-output-uiaction.ts
 */

import { main as formatOutput } from "../nodes/format-output.js";

async function run() {
  const inbound = await formatOutput({
    params: {
      sopInput: {
        customerIntent: "尺重辨识后换标上架",
        serviceAtom: "OW01V1602",
        recommendedVasc: { vascCode: "VASC202411192246131", vascName: "入库非标增值（特批）" },
        providedFields: {
          BEOR: "背景金标",
          VAS_ATTR_REL_RD: "描述金标",
        },
      },
      matchResult: { matched: true, category: "B", sceneKey: "inbound_label_identify", scenarioName: "【入库】尺重/标签辨识后换标上架" },
      completenessResult: { applicable: true, complete: true },
      validationResult: { ok: true },
      sopGenerationResult: { sopText: "仓库 SOP 正文", scenarioName: "【入库】尺重/标签辨识后换标上架", fieldsUsed: [] },
    },
  });

  const inboundProposal = (inbound.structured as Record<string, unknown>).uiActionProposal as {
    actions: Array<Record<string, string>>;
  };
  if (!inboundProposal) throw new Error("inbound sop_generated missing uiActionProposal");
  const types = inboundProposal.actions.map((a) => `${a.type}:${a.fieldKey}:${a.valueCode || a.value}`);
  const expected = [
    "select:shelveWayCode:INBOUND_ORDER_OF_CUSTOMER",
    "select:serviceCode:OW01V1602",
    "fill:BEOR:背景金标",
    "fill:VAS_ATTR_REL_RD:描述金标",
  ];
  if (JSON.stringify(types) !== JSON.stringify(expected)) {
    throw new Error(`inbound actions mismatch: ${JSON.stringify(types)}`);
  }
  if (inboundProposal.actions.some((a) => a.type === "submit" || a.valueLabel === "提交")) {
    throw new Error("must not emit submit");
  }

  const instock = await formatOutput({
    params: {
      sopInput: {
        customerIntent: "良品转不良品",
        serviceAtom: "库内其他服务需求",
        recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
        providedFields: { 背景: "x" },
      },
      matchResult: { matched: true, category: "B", scenarioName: "良品转不良品上架" },
      completenessResult: { applicable: true, complete: true },
      validationResult: { ok: true },
      sopGenerationResult: { sopText: "库内 SOP", scenarioName: "良品转不良品上架", fieldsUsed: [] },
    },
  });
  if ((instock.structured as Record<string, unknown>).uiActionProposal) {
    throw new Error("库内 sop_generated 不应带入库金标 uiActionProposal");
  }

  console.log("PASS format-output inbound uiActionProposal");
  console.log("人眼核：下面 4 行应是 select shelveWayCode / select serviceCode / fill BEOR=背景金标 / fill VAS_ATTR_REL_RD=描述金标");
  for (const action of inboundProposal.actions) {
    console.log(`  ${action.type}  ${action.fieldKey}  =  ${action.valueCode || action.value}`);
  }
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
