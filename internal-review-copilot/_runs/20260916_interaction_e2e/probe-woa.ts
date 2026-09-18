import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  const client = await createTomClient();
  const orderNo = "VASC000000370947";
  await client.setOrderReferer(orderNo);
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atom = asArray(asRecord(vas.info).content).map(asRecord)[0] || {};
  const keys = Object.keys(atom).filter((k) => /fee|action|woa|charge|price|qty/i.test(k));
  const woa = await client.ajaxProcess("pms.TimeConsumingService_queryTimeConsumingUnitVO", {
    where: { vo: { type: "WOA" } },
  });
  const actions = (Array.isArray(woa.info) ? woa.info : []).map(asRecord);
  const hits = actions
    .filter((item) => /标签|调拨|跨仓|包裹/.test(`${asText(item.serviceName)}${asText(item.serviceCode)}${asText(item.name)}`))
    .map((item) => ({
      code: asText(item.serviceCode) || asText(item.code),
      name: asText(item.serviceName) || asText(item.name),
      chargeCode: asText(item.chargeCode),
      chargeName: asText(item.chargeName),
    }));
  const out = {
    orderNo,
    serviceCode: atom.serviceCode,
    serviceName: atom.serviceName,
    keys,
    fee: atom.vaActionFeeDetailVos || atom.vaAtomFeeDetailVos || atom.vaOrderCostVoList || null,
    calculateType: atom.calculateType,
    hits: hits.slice(0, 40),
    hitCount: hits.length,
    totalWoa: actions.length,
  };
  writeFileSync(resolve("D:\\DA\\Nonsta_Valueadded_Combined\\internal-review-copilot\\_runs\\20260916_interaction_e2e\\woa-probe.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2).slice(0, 4000));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
