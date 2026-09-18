import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  const client = await createTomClient();
  await client.setOrderReferer("VASC000000370947");
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo: "VASC000000370947" },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atom = asArray(asRecord(vas.info).content).map(asRecord)[0] || {};
  const attrs = asArray(atom.vaAtomAttrs).map(asRecord).map((a) => ({
    key: asText(a.attributeKey) || asText(a.attributeKeyOriginal),
    name: asText(a.attributeName),
    value: asText(a.attributeValue).slice(0, 80),
  }));
  console.log(JSON.stringify(attrs, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
