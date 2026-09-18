/**
 * Pull last-month OSF8V1848 orders from OMS and cluster SOP text.
 * Does not write OMS / does not change pipeline.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, copilotDir } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

const OUT = resolve(copilotDir(), "_runs/20260918_osf8v1848_probe");
const CODE = "OSF8V1848";
const START = "2026-08-18 00:00:00";
const END = "2026-09-18 23:59:59";

function atomsOf(header: Record<string, unknown>) {
  const nested = asArray(header.vaAtoms).map(asRecord);
  if (nested.length) return nested;
  return [];
}

function attrMap(atom: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of asArray(atom.vaAtomAttrs).map(asRecord)) {
    const key = asText(row.attributeKey) || asText(row.attributeName) || asText(row.attributeKeyOriginal);
    const value = asText(row.attributeValue) || asText(row.attributeValueOriginal) || asText(row.pulldownValue);
    if (key) out[key] = value;
  }
  return out;
}

function normSop(text: string): string {
  return text.replace(/\s+/g, " ").replace(/[0-9]/g, "#").trim();
}

async function pageQuery(
  client: Awaited<ReturnType<typeof createTomClient>>,
  where: Record<string, unknown>,
  length = 50,
  start = 0,
) {
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where,
    draw: "1",
    start: String(start),
    length: String(length),
  });
  const info = asRecord(list.info);
  const rows = asArray(info.content || info.data || info.rows).map(asRecord);
  const total = Number(info.total ?? info.recordsTotal ?? rows.length);
  return { total, rows };
}

async function main(): Promise<void> {
  loadEnvFiles();
  mkdirSync(OUT, { recursive: true });
  const client = await createTomClient();

  const where = {
    productCode: "VASC202608121453409",
    orderDateStart: START,
    orderDateEnd: END,
  };
  const first = await pageQuery(client, where, 50, 0);
  const all = [...first.rows];
  console.log(`page0 total=${first.total} got=${first.rows.length}`);
  for (let start = 50; start < first.total && start < 500; start += 50) {
    const page = await pageQuery(client, where, 50, start);
    all.push(...page.rows);
    console.log(`start=${start} got=${page.rows.length} acc=${all.length}/${first.total}`);
    if (page.rows.length === 0) break;
  }

  const compact = [];
  const sopClusters = new Map<string, { n: number; sample: string; orders: string[] }>();
  const statusCount = new Map<string, number>();
  const countryCount = new Map<string, number>();
  const pending = [];

  for (const header of all) {
    const orderNo = asText(header.orderNo);
    const warehouse = asRecord(header.warehouse);
    const customer = asRecord(header.customer);
    const vasc = asRecord(header.vasc);
    const business = asRecord(header.businessOrder);
    const atoms = atomsOf(header);
    const atom = atoms.find((a) => asText(a.serviceCode) === CODE) || atoms[0] || {};
    const attrs = attrMap(atom);
    const sop = asText(atom.sop);
    const status = asText(header.statusDesc) || asText(header.status);
    const country = asText(warehouse.countryName) || asText(warehouse.countryCode) || asText(warehouse.warehouseCode);
    statusCount.set(status, (statusCount.get(status) || 0) + 1);
    countryCount.set(country || "-", (countryCount.get(country || "-") || 0) + 1);
    if (status.includes("待审核") || asText(header.status) === "WA") pending.push(orderNo);
    const key = normSop(sop) || "(empty)";
    const cluster = sopClusters.get(key) || { n: 0, sample: sop.slice(0, 240), orders: [] };
    cluster.n += 1;
    if (cluster.orders.length < 8) cluster.orders.push(orderNo);
    sopClusters.set(key, cluster);
    compact.push({
      orderNo,
      status,
      isAuditThrough: asText(header.isAuditThrough),
      warehouseCode: asText(warehouse.warehouseCode) || asText(header.warehouseCode),
      warehouseName: asText(warehouse.warehouseName) || asText(header.warehouseName),
      countryName: asText(warehouse.countryName),
      countryCode: asText(warehouse.countryCode),
      customerCode: asText(customer.customerCode) || asText(header.customerCode),
      customerName: asText(customer.customerName) || asText(header.customerName),
      productName: asText(vasc.productName),
      businessNo: asText(business.businessNo) || asText(asRecord(header.businessOrder).businessNo),
      businessType: asText(header.businessType) || asText(header.businessTypeDesc),
      destructionMethod: attrs["销毁方式"] || attrs.VAS_ATTR_DESTRUCTION_METHOD || "",
      attrs,
      sop,
      sopLen: sop.length,
      sceneOverviewCode: asText(atom.sceneOverviewCode),
      sceneOverviewName: asText(atom.sceneOverviewName),
    });
  }

  const needDetail = compact.filter((row) => true);
  for (const row of needDetail) {
    const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
      where: { orderNo: row.orderNo },
      draw: "1",
      start: "0",
      length: "50",
    });
    const atoms = asArray(asRecord(vas.info).content || vas.info).map(asRecord);
    const atom = atoms.find((a) => asText(a.serviceCode) === CODE) || atoms[0] || {};
    row.sop = asText(atom.sop);
    row.sopLen = row.sop.length;
    Object.assign(row.attrs, attrMap(atom));
    if (!row.destructionMethod) {
      row.destructionMethod = row.attrs["销毁方式"] || row.attrs.VAS_ATTR_DESTRUCTION_METHOD || "";
    }
    console.log(`detail ${row.orderNo} sopLen=${row.sopLen}`);
  }

  const clusters = [...sopClusters.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .map(([key, v]) => ({ key: key.slice(0, 180), ...v }));

  const summary = {
    generatedAt: new Date().toISOString(),
    range: { START, END, CODE },
    listTotal: first.total,
    pulled: compact.length,
    pendingCount: pending.length,
    pendingSample: pending.slice(0, 30),
    statusCount: Object.fromEntries([...statusCount.entries()].sort((a, b) => b[1] - a[1])),
    countryCount: Object.fromEntries([...countryCount.entries()].sort((a, b) => b[1] - a[1])),
    sopEmpty: compact.filter((r) => !r.sop).length,
    sopClusters: clusters,
  };

  writeFileSync(resolve(OUT, "oms-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(resolve(OUT, "oms-orders.json"), JSON.stringify(compact, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
