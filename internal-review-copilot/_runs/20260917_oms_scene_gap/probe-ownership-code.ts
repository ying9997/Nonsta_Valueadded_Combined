/**
 * Probe sceneOverviewCode for 【库内】货权转移, using list only (no getVasList).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../../lib/env.ts";
import { asArray, asRecord, asText } from "../../lib/oms-adapter.ts";
import { createTomClient } from "../../lib/oms-tom-client.ts";

const OUT = resolve(projectDir(), "_runs/20260917_oms_scene_gap");
const CODE = "【In-warehouse】Transfer of ownership of goods";
const CATCH = new Set(["OW01V1602", "OSF6V1603", "OSF6V1841"]);

function atomsOf(header: Record<string, unknown>) {
  const nested = asArray(header.vaAtoms).map(asRecord);
  if (nested.length) return nested;
  return [header];
}

async function pageQuery(
  client: Awaited<ReturnType<typeof createTomClient>>,
  where: Record<string, string>,
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
  const rows = asArray(info.content || info.data).map(asRecord);
  const total = Number(info.total ?? info.recordsTotal ?? rows.length);
  return { total, rows, rawKeys: Object.keys(rows[0] || {}) };
}

function summarize(rows: Array<Record<string, unknown>>) {
  const combos = new Map<string, number>();
  const examples: Array<Record<string, string>> = [];
  for (const header of rows) {
    const orderNo = asText(header.orderNo);
    for (const atom of atomsOf(header)) {
      const serviceCode = asText(atom.serviceCode) || asText(header.serviceCode);
      const serviceName = asText(atom.serviceName) || asText(header.serviceName);
      const sceneOverviewCode = asText(atom.sceneOverviewCode) || asText(header.sceneOverviewCode);
      const sceneOverviewName = asText(atom.sceneOverviewName) || asText(header.sceneOverviewName);
      const key = `${serviceCode}\t${serviceName}\t${sceneOverviewCode}\t${sceneOverviewName}`;
      combos.set(key, (combos.get(key) || 0) + 1);
      if (examples.length < 15) {
        examples.push({
          orderNo,
          serviceCode,
          serviceName,
          sceneOverviewCode,
          sceneOverviewName,
          catchAll: CATCH.has(serviceCode) ? "Y" : "N",
        });
      }
    }
  }
  return {
    combos: [...combos.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ n, k })),
    examples,
  };
}

async function main() {
  loadEnvFiles();
  mkdirSync(OUT, { recursive: true });
  const client = await createTomClient();

  const first = await pageQuery(client, { sceneOverviewCode: CODE }, 50, 0);
  const allRows = [...first.rows];
  for (let start = 50; start < first.total; start += 50) {
    const page = await pageQuery(client, { sceneOverviewCode: CODE }, 50, start);
    allRows.push(...page.rows);
    console.log(`page start=${start} got=${page.rows.length} accumulated=${allRows.length}/${first.total}`);
  }
  const byCode = { total: first.total, rows: allRows, rawKeys: first.rawKeys };
  console.log(`code query total=${byCode.total} rows=${byCode.rows.length}`);
  console.log("list keys:", byCode.rawKeys.join(","));
  const summary = summarize(byCode.rows);
  console.log("\n=== list combos ===");
  for (const row of summary.combos) console.log(`${row.n}\t${row.k}`);
  const catchHits = [];
  for (const header of byCode.rows) {
    const orderNo = asText(header.orderNo);
    for (const atom of atomsOf(header)) {
      const serviceCode = asText(atom.serviceCode) || asText(header.serviceCode);
      const sceneOverviewName = asText(atom.sceneOverviewName) || asText(header.sceneOverviewName);
      const sceneOverviewCode = asText(atom.sceneOverviewCode) || asText(header.sceneOverviewCode);
      if (CATCH.has(serviceCode) && sceneOverviewName.includes("货权转移")) {
        catchHits.push({
          orderNo,
          serviceCode,
          serviceName: asText(atom.serviceName) || asText(header.serviceName),
          sceneOverviewCode,
          sceneOverviewName,
          statusDesc: asText(header.statusDesc),
        });
      }
    }
  }
  console.log("\n=== 其他服务需求 + 【库内】货权转移 ===");
  for (const row of catchHits) console.log(JSON.stringify(row));

  const filters = [
    { label: "OSF6V1603+code", where: { sceneOverviewCode: CODE, serviceCode: "OSF6V1603" } },
    { label: "OSF6V1841+code", where: { sceneOverviewCode: CODE, serviceCode: "OSF6V1841" } },
    { label: "OSF6V1647+code", where: { sceneOverviewCode: CODE, serviceCode: "OSF6V1647" } },
  ];
  const extra: Record<string, unknown> = {};
  for (const f of filters) {
    try {
      const got = await pageQuery(client, f.where, 5);
      extra[f.label] = { total: got.total, first: asText(got.rows[0]?.orderNo), summary: summarize(got.rows).combos };
      console.log(`${f.label} total=${got.total} first=${asText(got.rows[0]?.orderNo)}`);
    } catch (err) {
      extra[f.label] = { error: err instanceof Error ? err.message : String(err) };
      console.log(`${f.label} ERROR`, extra[f.label]);
    }
  }

  const evidence = {
    dropdownCode: CODE,
    dropdownName: "【库内】货权转移",
    liveTotalByCode: byCode.total,
    listKeys: byCode.rawKeys,
    listCombos: summary.combos,
    examples: summary.examples,
    extra,
    catchAllHits: catchHits,
  };
  const out = resolve(OUT, "ownership-catchall-code.json");
  writeFileSync(out, JSON.stringify(evidence, null, 2), "utf8");
  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
