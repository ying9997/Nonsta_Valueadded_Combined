import { loadEnvFiles } from "../../lib/env.ts";
import { asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  const client = await createTomClient();
  const woa = await client.ajaxProcess("pms.TimeConsumingService_queryTimeConsumingUnitVO", {
    where: { vo: { type: "WOA" } },
  });
  const actions = (Array.isArray(woa.info) ? woa.info : []).map(asRecord);
  const one = actions.find((item) => asText(item.serviceCode) === "DZ000025") || {};
  console.log(JSON.stringify(one, null, 2).slice(0, 4000));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
