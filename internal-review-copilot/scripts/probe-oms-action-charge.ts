/**
 * Query charges for one warehouse action. Read-only.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { createTomClient } from "../lib/oms-tom-client.ts";

const ORDER = "VASC000000366432";
const CODE = process.argv.includes("--code") ? process.argv[process.argv.indexOf("--code") + 1] : "DZ000038";

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const client = await createTomClient();
  await client.setOrderReferer(ORDER);
  const res = await client.ajaxProcess("pms.TimeConsumingService_queryActionChargeInfo", {
    where: { serviceCodes: [CODE] },
  });
  writeFileSync(
    resolve(projectDir(), `_runs/20260915_e2e_rerun/oms-charge-${CODE}.json`),
    `${JSON.stringify(res.info, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(res.info, null, 2).slice(0, 2500));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
