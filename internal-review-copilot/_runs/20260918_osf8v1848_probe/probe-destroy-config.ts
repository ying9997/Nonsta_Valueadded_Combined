/**
 * Read-only: dump OSF8 VAS fields + search OMS product names for 销毁/弃置.
 * Does not write OMS.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, copilotDir } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

const OUT = resolve(copilotDir(), "_runs/20260918_osf8v1848_probe");
const ORDER = "VASC000000374748";

function pick(obj: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function summarizeRow(r: Record<string, unknown>) {
  const vasc = asRecord(r.vasc);
  const atom = asRecord(asArray(r.vaAtoms)[0]);
  const biz = asRecord(r.businessOrder);
  return {
    orderNo: asText(r.orderNo),
    status: asText(r.statusDesc) || asText(r.status),
    productCode: asText(vasc.productCode) || asText(r.productCode),
    productName: asText(vasc.productName) || asText(r.productName),
    pscgCode: asText(r.pscgCode),
    vaSource: asText(r.vaSource),
    businessType: asText(r.businessType) || asText(r.businessTypeDesc),
    atom: asText(atom.serviceCode),
    atomName: asText(atom.serviceName),
    wo: asText(biz.businessNo) || asText(asRecord(r.business).businessNo),
  };
}

async function tryApi(
  client: Awaited<ReturnType<typeof createTomClient>>,
  api: string,
  params: Record<string, unknown>,
) {
  try {
    const res = await client.ajaxProcess(api, params);
    const info = res.info;
    const rec = asRecord(info);
    const rows = asArray(rec.content || rec.data || rec.rows || (Array.isArray(info) ? info : []));
    return {
      ok: true,
      keys: rec && Object.keys(rec).slice(0, 20),
      n: rows.length,
      total: rec.total ?? rec.recordsTotal,
      sample: rows.slice(0, 3).map((x) => summarizeRow(asRecord(x))),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 240) : String(err) };
  }
}

async function main() {
  loadEnvFiles();
  const client = await createTomClient();
  const out: Record<string, unknown> = { generatedAt: new Date().toISOString() };

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
  const vasc = asRecord(header.vasc);
  const biz = asRecord(header.businessOrder);
  const wh = asRecord(header.warehouse);
  out.headerKeys = Object.keys(header);
  out.header = {
    orderNo: asText(header.orderNo),
    status: asText(header.statusDesc),
    vaSource: asText(header.vaSource),
    businessType: asText(header.businessType),
    businessTypeDesc: asText(header.businessTypeDesc),
    pscgCode: asText(header.pscgCode),
    warehouse: { code: asText(wh.warehouseCode), name: asText(wh.warehouseName), country: asText(wh.countryName) || asText(header.countryName) },
    vasc: pick(vasc, ["productCode", "productName", "productType", "pscgCode"]),
    businessOrderKeys: Object.keys(biz),
    businessOrder: biz,
    extra: pick(header, [
      "winitProductCode",
      "winitProductName",
      "chargeProductCode",
      "chargeProductName",
      "deliveryWay",
      "deliverywayName",
      "outboundType",
      "destructionType",
      "handleType",
      "processType",
    ]),
  };

  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo: ORDER },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atoms = asArray(asRecord(vas.info).content).map(asRecord);
  out.atoms = atoms.map((a) => ({
    keys: Object.keys(a),
    serviceCode: asText(a.serviceCode),
    serviceName: asText(a.serviceName),
    winitProductCode: asText(a.winitProductCode),
    winitProductName: asText(a.winitProductName),
    winitOrderNo: asText(a.winitOrderNo),
    sop: asText(a.sop).slice(0, 120),
    attrs: asArray(a.vaAtomAttrs).map((row) => {
      const r = asRecord(row);
      return {
        k: asText(r.attributeKey) || asText(r.attributeName),
        v: asText(r.attributeValue) || asText(r.pulldownValue),
      };
    }),
  }));

  const atom0 = atoms[0] || {};
  try {
    const eventsRaw = await client.ajaxProcess("oms.VaOrderService_getEventOrder4VaAtom", {
      where: {
        orderNo: ORDER,
        serviceCode: asText(atom0.serviceCode) || "OSF8V1848",
        serviceSequence: asText(atom0.serviceSequence) || "1",
      },
      draw: "1",
      start: "0",
      length: "20",
    });
    const events = (Array.isArray(eventsRaw.info) ? eventsRaw.info : asArray(asRecord(eventsRaw.info).content)).map(
      asRecord,
    );
    out.eventsN = events.length;
    out.eventSample = events.slice(0, 2).map((e) => ({ keys: Object.keys(e), e }));
  } catch (err) {
    out.eventsError = err instanceof Error ? err.message : String(err);
  }

  const date = { orderDateStart: "2026-08-18 00:00:00", orderDateEnd: "2026-09-18 23:59:59" };
  const nameTrials: Array<[string, Record<string, unknown>]> = [
    ["name销毁", { ...date, productName: "销毁" }],
    ["name专业销毁", { ...date, productName: "专业销毁" }],
    ["name弃置", { ...date, productName: "弃置" }],
    ["name仓内销毁", { ...date, productName: "仓内销毁" }],
    ["name库存弃置", { ...date, productName: "库存弃置" }],
    ["name出库非标", { ...date, productName: "出库非标增值" }],
  ];
  const nameHits: Record<string, unknown> = {};
  for (const [k, where] of nameTrials) {
    nameHits[k] = await tryApi(client, "oms.VaOrderService_pageQuery", {
      where,
      draw: "1",
      start: "0",
      length: "5",
    });
    console.log("name", k, JSON.stringify(nameHits[k]).slice(0, 300));
  }
  out.nameHits = nameHits;

  const apis = [
    "oms.VaAtomService_pageQuery",
    "oms.VaAtomDefService_pageQuery",
    "oms.VascService_pageQuery",
    "oms.VaProductService_pageQuery",
    "oms.ProductService_pageQuery",
    "pms.VaAtomService_pageQuery",
    "pms.VascService_pageQuery",
    "oms.OutboundOrderService_pageQuery",
    "oms.OutboundOrderService_get",
    "oms.WhOutboundOrderService_pageQuery",
  ];
  const apiHits: Record<string, unknown> = {};
  for (const api of apis) {
    apiHits[api] = await tryApi(client, api, { where: {}, draw: "1", start: "0", length: "3" });
    console.log("api", api, JSON.stringify(apiHits[api]).slice(0, 220));
  }
  out.apiHits = apiHits;

  const pages = ["/VasOrder/index", "/OutboundOrder/index", "/WhOutboundOrder/index", "/Product/index"];
  const pageHits: Record<string, unknown> = {};
  for (const p of pages) {
    try {
      const html = await client.getPage(p);
      pageHits[p] = {
        ok: true,
        len: html.length,
        title: (html.match(/<title>([^<]+)/)?.[1] || "").slice(0, 80),
        login: /cniam|#\/login/.test(html),
        hasDestroy: /销毁|弃置/.test(html),
      };
    } catch (err) {
      pageHits[p] = { ok: false, error: err instanceof Error ? err.message.slice(0, 180) : String(err) };
    }
    console.log("page", p, pageHits[p]);
  }
  out.pageHits = pageHits;

  writeFileSync(resolve(OUT, "destroy-config-probe.json"), JSON.stringify(out, null, 2), "utf8");
  console.log("wrote destroy-config-probe.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
