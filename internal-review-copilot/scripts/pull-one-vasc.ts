/**
 * Pull one VASC into demo-e2e detail JSON (for L2 card tests).
 *
 *   npx tsx internal-review-copilot/scripts/pull-one-vasc.ts --order VASC000000360654
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { createTomClient } from "../lib/oms-tom-client.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const orderNo = arg("order", "VASC000000360654");
  const outDir = resolve(projectDir(), arg("out") || "_runs/20260909_demo_e2e/card-test");
  mkdirSync(outDir, { recursive: true });
  const client = await createTomClient();
  await client.setOrderReferer(orderNo);
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const header = asArray(asRecord(list.info).content || asRecord(list.info).data)
    .map(asRecord)
    .find((item) => asText(item.orderNo) === orderNo) || {};
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atoms = asArray(asRecord(vas.info).content).map(asRecord);
  const atom = atoms[0] || {};
  const eventsRaw = await client.ajaxProcess("oms.VaOrderService_getEventOrder4VaAtom", {
    where: {
      orderNo,
      serviceCode: asText(atom.serviceCode) || "OW01V1602",
      serviceSequence: asText(atom.serviceSequence) || "1",
    },
    draw: "1",
    start: "0",
    length: "50",
  });
  const events = (Array.isArray(eventsRaw.info) ? eventsRaw.info : asArray(asRecord(eventsRaw.info).content)).map(
    asRecord,
  );
  const warehouse = asRecord(header.warehouse);
  const customer = asRecord(header.customer);
  const detail = {
    orderNo,
    demoLabel: "L4-SOP生成-OMS写入试点",
    expectedOutputPath: "sop_generated",
    expectedScene: "【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架",
    expectedSceneKey: "inbound_aplus_direct_shelve",
    expectedSceneCode: "20250929",
    _caseMeta: {
      expectedScene: "【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架",
      expectedSceneKey: "inbound_aplus_direct_shelve",
      expectedSceneCode: "20250929",
      note: "仅评测对比，不影响 pipeline 自动匹配",
    },
    listHeader: {
      ...header,
      warehouseCode: asText(warehouse.warehouseCode) || asText(header.warehouseCode),
      warehouseName: asText(warehouse.warehouseName) || asText(header.warehouseName),
      customerCode: asText(customer.customerCode) || asText(header.customerCode),
      customerName: asText(customer.customerName) || asText(header.customerName),
    },
    atoms,
    events,
    errors: [],
  };
  const outPath = resolve(outDir, `${orderNo}.input.json`);
  writeFileSync(outPath, `${JSON.stringify(detail, null, 2)}\n`, "utf8");

  const demoInputsPath = resolve(projectDir(), "_runs/20260909_demo_e2e/demo-inputs.json");
  const raw = JSON.parse(readFileSync(demoInputsPath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const merged = [detail, ...details.filter((item) => asText(item.orderNo) !== orderNo)];
  const listenPath = resolve(outDir, "listen-inputs.json");
  writeFileSync(
    listenPath,
    `${JSON.stringify({ sourceFile: demoInputsPath, note: "demo-inputs + 360654 L2 试点", details: merged }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        orderNo,
        outPath,
        listenPath,
        atomSop: asText(atom.sop).slice(0, 40),
        sceneOverviewCode: asText(atom.sceneOverviewCode),
        req: asText(asRecord(asArray(atom.vaAtomAttrs).map(asRecord).find((a) => asText(a.attributeName).includes("需求描述")) || {}).attributeValue).slice(0, 80),
        events: events.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
