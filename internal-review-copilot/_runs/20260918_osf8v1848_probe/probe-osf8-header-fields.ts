/**
 * Dump remaining VAS header fields for one OSF8 order. Read-only.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, copilotDir } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

const OUT = resolve(copilotDir(), "_runs/20260918_osf8v1848_probe");
const ORDER = "VASC000000374748";

async function main() {
  loadEnvFiles();
  const client = await createTomClient();
  await client.setOrderReferer(ORDER);
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo: ORDER },
    draw: "1",
    start: "0",
    length: "5",
  });
  const header = asArray(asRecord(list.info).content || asRecord(list.info).data)
    .map(asRecord)
    .find((item) => asText(item.orderNo) === ORDER) || {};
  const goods = asArray(header.vaOrderGoods).map(asRecord);
  const dump = {
    goodsOperationType: header.goodsOperationType,
    inquiryMode: header.inquiryMode,
    inquiryModeName: header.inquiryModeName,
    deliveryType: header.deliveryType,
    orderSource: header.orderSource,
    orderSourceDesc: header.orderSourceDesc,
    isStoreTemporarily: header.isStoreTemporarily,
    merchandiseDimension: header.merchandiseDimension,
    isSelectAllGoods: header.isSelectAllGoods,
    vaOrderGoodsN: goods.length,
    vaOrderGoodsSample: goods.slice(0, 3),
    control: header.control,
  };
  writeFileSync(resolve(OUT, "osf8-header-fields.json"), JSON.stringify(dump, null, 2), "utf8");
  console.log(JSON.stringify(dump, null, 2).slice(0, 2500));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
