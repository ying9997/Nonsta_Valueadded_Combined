import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function dumpOrder(orderNo: string): Promise<Record<string, unknown>> {
  const client = await createTomClient();
  await client.setOrderReferer(orderNo);
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atom = asArray(asRecord(vas.info).content).map(asRecord)[0] || {};
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const header = asArray(asRecord(list.info).content || asRecord(list.info).data).map(asRecord)[0] || {};
  const pick = (rec: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (/price|charge|qty|qty|warehouse|action|fee|qty|calculate|whCode|warehouseCode/i.test(k)) out[k] = v;
    }
    return out;
  };
  const woa = await client.ajaxProcess("pms.TimeConsumingService_queryTimeConsumingUnitVO", {
    where: { vo: { type: "WOA" } },
  });
  const actions = (Array.isArray(woa.info) ? woa.info : []).map(asRecord);
  const names = actions.map((item) => `${asText(item.serviceCode)} ${asText(item.serviceName) || asText(item.name)}`);
  const charge025 = await client.ajaxProcess("pms.TimeConsumingService_queryActionChargeInfo", {
    where: { serviceCodes: ["DZ000025"] },
  });
  return {
    orderNo,
    atomPick: pick(atom),
    headerPick: pick(header),
    atomKeys: Object.keys(atom),
    headerKeys: Object.keys(header).filter((k) => /price|charge|ware|wh|customer/i.test(k)),
    warehouse: asText(asRecord(header.warehouse).warehouseCode) || asText(header.warehouseCode),
    allWoa: names,
    charge025: charge025.info,
  };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const a = await dumpOrder("VASC000000370947");
  const b = await dumpOrder("VASC000000370932");
  const out = { a: { ...a, allWoa: a.allWoa }, b: { ...b, allWoa: b.allWoa } };
  writeFileSync(
    resolve("D:\\DA\\Nonsta_Valueadded_Combined\\internal-review-copilot\\_runs\\20260916_interaction_e2e\\woa-charge.json"),
    `${JSON.stringify(out, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    a: { orderNo: a.orderNo, atomPick: a.atomPick, headerPick: a.headerPick, warehouse: a.warehouse, charge025: a.charge025, woa: a.allWoa },
    b: { orderNo: b.orderNo, atomPick: b.atomPick, headerPick: b.headerPick, warehouse: b.warehouse },
  }, null, 2).slice(0, 8000));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
