import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  const client = await createTomClient();
  const woa = await client.ajaxProcess("pms.TimeConsumingService_queryTimeConsumingUnitVO", {
    where: { vo: { type: "WOA" } },
  });
  const actions = (Array.isArray(woa.info) ? woa.info : []).map(asRecord);
  for (const code of ["DZ000024", "DZ000049", "DZ000066", "DZ000053", "DZ000034"]) {
    const one = actions.find((item) => asText(item.serviceCode) === code);
    const charge = await client.ajaxProcess("pms.TimeConsumingService_queryActionChargeInfo", {
      where: { serviceCodes: [code] },
    });
    console.log(code, JSON.stringify({ name: one?.serviceName, unit: one?.unitInfos, charge: charge.info }).slice(0, 700));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
