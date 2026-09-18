import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function tryCal(label: string, extra: Record<string, unknown>): Promise<void> {
  const client = await createTomClient();
  await client.setOrderReferer("VASC000000370947");
  const where = {
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
    dimension: "ORDER",
    calUnit: "VAS_ATTR_REL_VPC",
    ...extra,
  };
  try {
    const res = await client.ajaxProcess("oms.VaOrderFeeCalService_calOrderActionFee", { where });
    const detail = asArray(asRecord(res.info).actionFeeDetails).map(asRecord)[0] || {};
    console.log(label, "OK", JSON.stringify({ income: detail.totalIncome, cost: detail.totalCost, billingUnit: detail.billingUnit, msg: asText(res.message) }));
  } catch (err) {
    console.log(label, err instanceof Error ? err.message.slice(0, 200) : err);
  }
}

async function main(): Promise<void> {
  loadEnvFiles();
  await tryCal("vpc-qty1", {});
  await tryCal("vpc-qty1-value", { VAS_ATTR_REL_VPC: 1, attrValue: 1, unitNum: 1 });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
