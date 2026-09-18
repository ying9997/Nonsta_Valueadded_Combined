/**
 * Dry-run calOrderActionFee for 366432. Does not save.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { createTomClient } from "../lib/oms-tom-client.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const client = await createTomClient();
  await client.setOrderReferer("VASC000000366432");
  const res = await client.ajaxProcess("oms.VaOrderFeeCalService_calOrderActionFee", {
    where: {
      orderNo: "VASC000000366432",
      serviceCode: "OW01V1602",
      serviceName: "入库其他服务需求",
      warehouseActionCode: "DZ000031",
      warehouseActionName: "贴商品标签",
      qty: 10,
      chargeCode: "1047255",
      chargeName: "增值-商品标签粘贴/更改/清除",
      serviceSequence: "1",
      dimension: "ORDER",
      calUnit: "VAS_ATTR_REL_VOIC",
      revenueMode: "PRICE_LIST_CALC",
      priceListId: 26261,
      isExcludeRevenue: false,
    },
  });
  writeFileSync(resolve(projectDir(), "_runs/20260915_e2e_rerun/oms-cal-fee.json"), `${JSON.stringify(res, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(res, null, 2).slice(0, 2500));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
