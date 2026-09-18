/**
 * Dump unitInfos for DZ000031. Read-only.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { asRecord, asText } from "../lib/oms-adapter.ts";
import { createTomClient } from "../lib/oms-tom-client.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const client = await createTomClient();
  await client.setOrderReferer("VASC000000366432");
  const woa = await client.ajaxProcess("pms.TimeConsumingService_queryTimeConsumingUnitVO", {
    where: { vo: { type: "WOA" } },
  });
  const actions = (Array.isArray(woa.info) ? woa.info : []).map(asRecord);
  const one = actions.find((item) => asText(item.serviceCode) === "DZ000031") || {};
  writeFileSync(resolve(projectDir(), "_runs/20260915_e2e_rerun/oms-woa-DZ000031.json"), `${JSON.stringify(one, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(one, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
