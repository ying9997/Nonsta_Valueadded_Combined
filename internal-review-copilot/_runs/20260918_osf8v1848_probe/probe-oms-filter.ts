import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, copilotDir } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

const OUT = resolve(copilotDir(), "_runs/20260918_osf8v1848_probe");

async function total(
  client: Awaited<ReturnType<typeof createTomClient>>,
  where: Record<string, unknown>,
) {
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where,
    draw: "1",
    start: "0",
    length: "3",
  });
  const info = asRecord(list.info);
  const rows = asArray(info.content || info.data || info.rows).map(asRecord);
  return {
    total: Number(info.total ?? info.recordsTotal ?? rows.length),
    sample: rows.slice(0, 3).map((r) => ({
      orderNo: asText(r.orderNo),
      status: asText(r.statusDesc),
      product: asText(asRecord(r.vasc).productName),
      pscg: asText(r.pscgCode),
      atom: asText(asRecord(asArray(r.vaAtoms)[0]).serviceCode),
    })),
  };
}

async function main() {
  loadEnvFiles();
  const client = await createTomClient();
  const date = { orderDateStart: "2026-08-18 00:00:00", orderDateEnd: "2026-09-18 23:59:59" };
  const trials: Array<[string, Record<string, unknown>]> = [
    ["serviceCode", { ...date, serviceCode: "OSF8V1848" }],
    ["serviceCodesCsv", { ...date, serviceCodes: "OSF8V1848" }],
    ["productName", { ...date, productName: "专业销毁非标询价服务" }],
    ["productCode", { ...date, productCode: "VASC202608121453409" }],
    ["pscgCode", { ...date, pscgCode: "OSF8" }],
    ["status+productName", { statusDesc: "待审核", productName: "专业销毁非标询价服务" }],
    ["statusWA+serviceCode", { status: "WA", serviceCode: "OSF8V1848" }],
    ["vaSource+product", { vaSource: "OUTBOUND", productName: "专业销毁非标询价服务", ...date }],
  ];
  const out: Record<string, unknown> = {};
  for (const [name, where] of trials) {
    try {
      out[name] = await total(client, where);
      console.log(name, JSON.stringify(out[name]));
    } catch (err) {
      out[name] = { error: err instanceof Error ? err.message : String(err) };
      console.log(name, "ERR", out[name]);
    }
  }
  writeFileSync(resolve(OUT, "oms-filter-probe.json"), JSON.stringify(out, null, 2), "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
