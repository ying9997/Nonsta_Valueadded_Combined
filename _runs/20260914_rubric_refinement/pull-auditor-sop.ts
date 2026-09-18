/**
 * One-shot: pull auditor SOP (atom.sop) for rubric comparison tables.
 *
 *   npx tsx _runs/20260914_rubric_refinement/pull-auditor-sop.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../../internal-review-copilot/lib/env.ts";
import { asArray, asRecord, asText } from "../../internal-review-copilot/lib/oms-adapter.ts";
import { createTomClient } from "../../internal-review-copilot/lib/oms-tom-client.ts";

const ORDERS = [
  "VASC000000329235",
  "VASC000000324789",
  "VASC000000305892",
  "VASC000000282990",
  "VASC000000338049",
  "VASC000000305787",
];

async function main(): Promise<void> {
  loadEnvFiles();
  const outDir = resolve(projectDir(), "_runs/20260914_rubric_refinement");
  mkdirSync(outDir, { recursive: true });
  const client = await createTomClient();
  const rows: Array<Record<string, string>> = [];

  for (const orderNo of ORDERS) {
    try {
      await client.setOrderReferer(orderNo);
      const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
        where: { orderNo },
        draw: "1",
        start: "0",
        length: "20",
      });
      const atoms = asArray(asRecord(vas.info).content).map(asRecord);
      const atom = atoms.find((item) => asText(item.orderNo) === orderNo) || atoms[0] || {};
      const sop = asText(atom.sop);
      const vasDes = asText(atom.vasDes);
      rows.push({
        orderNo,
        ok: "1",
        sceneOverviewCode: asText(atom.sceneOverviewCode),
        sceneOverviewName: asText(atom.sceneOverviewName),
        sop,
        vasDes,
        sopEmpty: sop ? "0" : "1",
        atomKeys: Object.keys(atom).join(","),
      });
      console.log(`[ok] ${orderNo} sopChars=${sop.length} scene=${asText(atom.sceneOverviewName)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rows.push({ orderNo, ok: "0", error: msg, sop: "", vasDes: "", sceneOverviewName: "" });
      console.error(`[fail] ${orderNo} ${msg}`);
    }
  }

  const outPath = resolve(outDir, "auditor-sop.json");
  writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
