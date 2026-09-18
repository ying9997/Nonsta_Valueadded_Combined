import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function tryCal(label: string, where: Record<string, unknown>): Promise<void> {
  const client = await createTomClient();
  await client.setOrderReferer(asText(where.orderNo));
  try {
    const res = await client.ajaxProcess("oms.VaOrderFeeCalService_calOrderActionFee", { where });
    const detail = asArray(asRecord(res.info).actionFeeDetails).map(asRecord)[0] || {};
    console.log(label, JSON.stringify({
      message: asText(res.message),
      income: detail.totalIncome,
      cost: detail.totalCost,
      keys: Object.keys(asRecord(res.info)),
    }));
  } catch (err) {
    console.log(label, err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  loadEnvFiles();
  const base = {
    orderNo: "VASC000000370947",
    serviceCode: "OW01V1602",
    serviceName: "入库其他服务需求",
    warehouseActionCode: "DZ000025",
    warehouseActionName: "贴包裹标签",
    qty: 1,
    chargeCode: "3000313",
    chargeName: "增值-包裹标签粘贴/更改/清除",
    serviceSequence: "1",
    revenueMode: "PRICE_LIST_CALC",
    priceListId: 26262,
    isExcludeRevenue: false,
  };
  await tryCal("plain", base);
  await tryCal("with-dimension", { ...base, dimension: "ORDER", calUnit: "VAS_ATTR_REL_VOIC" });
  await tryCal("osq", { ...base, dimension: "ORDER", calUnit: "OSQ" });
  await tryCal("qty10-oldstyle", {
    ...base,
    warehouseActionCode: "DZ000031",
    warehouseActionName: "贴商品标签",
    qty: 10,
    chargeCode: "1047255",
    chargeName: "增值-商品标签粘贴/更改/清除",
    priceListId: 26261,
    dimension: "ORDER",
    calUnit: "VAS_ATTR_REL_VOIC",
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
