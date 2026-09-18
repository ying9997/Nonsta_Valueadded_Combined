import { loadEnvFiles } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

async function cal(orderNo: string, wa: { code: string; name: string; chargeCode: string; chargeName: string; priceListId: number }): Promise<void> {
  const client = await createTomClient();
  await client.setOrderReferer(orderNo);
  const res = await client.ajaxProcess("oms.VaOrderFeeCalService_calOrderActionFee", {
    where: {
      orderNo,
      serviceCode: "OW01V1602",
      serviceName: "入库其他服务需求",
      warehouseActionCode: wa.code,
      warehouseActionName: wa.name,
      qty: 1,
      chargeCode: wa.chargeCode,
      chargeName: wa.chargeName,
      serviceSequence: "1",
      revenueMode: "PRICE_LIST_CALC",
      priceListId: wa.priceListId,
      isExcludeRevenue: false,
    },
  });
  const detail = asArray(asRecord(res.info).actionFeeDetails).map(asRecord)[0] || {};
  console.log(JSON.stringify({
    orderNo,
    code: wa.code,
    ok: !asText(res.error) && asText(res.message) !== "error",
    message: asText(res.message) || asText(res.error),
    totalIncome: detail.totalIncome,
    totalCost: detail.totalCost,
    currency: detail.currencyType,
  }));
}

async function main(): Promise<void> {
  loadEnvFiles();
  await cal("VASC000000370947", {
    code: "DZ000025",
    name: "贴包裹标签",
    chargeCode: "3000313",
    chargeName: "增值-包裹标签粘贴/更改/清除",
    priceListId: 26262,
  });
  const client = await createTomClient();
  for (const code of ["DZ000024", "DZ000049", "DZ000066"]) {
    const res = await client.ajaxProcess("pms.TimeConsumingService_queryActionChargeInfo", {
      where: { serviceCodes: [code] },
    });
    console.log(code, JSON.stringify(res.info).slice(0, 500));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
