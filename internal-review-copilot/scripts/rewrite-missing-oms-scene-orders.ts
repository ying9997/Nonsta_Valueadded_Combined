/**
 * 把「SOP 已生成但因没有 omsSceneCode 写不进 OMS」的待审核单重跑并写入。
 * 不建新群话题；成功后私聊金萤确认 OMS 码。
 *
 *   npx tsx scripts/rewrite-missing-oms-scene-orders.ts
 *   npx tsx scripts/rewrite-missing-oms-scene-orders.ts --order VASC000000374793
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { writePipelineDraft } from "../lib/auto-oms-write.ts";
import { appendBadcase } from "../lib/badcase-log.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { notifyOwnerMissingOmsScene } from "../lib/missing-oms-scene.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { isWritableOmsStatus, omsOrderStatusLabel, resolveSceneOverviewCode } from "../lib/oms-draft-write.ts";
import { createTomClient, refreshTomCookies } from "../lib/oms-tom-client.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import { isRagEnabled } from "../lib/case-retriever.ts";
import type { JsonRecord } from "../lib/types.ts";

const DEFAULT_ORDERS = [
  "VASC000000374793",
  "VASC000000374808",
  "VASC000000374823",
  "VASC000000370740",
  "VASC000000373161",
  "VASC000000373164",
  "VASC000000373179",
  "VASC000000374889",
];

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

async function pullDetail(orderNo: string): Promise<JsonRecord> {
  const client = await createTomClient();
  await client.setOrderReferer(orderNo);
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const header =
    asArray(asRecord(list.info).content || asRecord(list.info).data)
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
  return {
    orderNo,
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
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = process.env.OMS_WRITE_ENABLED || "1";
  const only = arg("order");
  const orders = only ? [only] : DEFAULT_ORDERS;
  const outDir = resolve(projectDir(), "_runs/20260918_missing_oms_scene");
  mkdirSync(outDir, { recursive: true });
  const rows: Record<string, unknown>[] = [];

  for (const orderNo of orders) {
    const row: Record<string, unknown> = { orderNo };
    try {
      const detail = await pullDetail(orderNo);
      const header = asRecord(detail.listHeader);
      const atom = asArray(detail.atoms).map(asRecord)[0] || {};
      const status = omsOrderStatusLabel(header, atom);
      row.status = status;
      if (!isWritableOmsStatus(header, atom)) {
        row.skip = `status=${status || "unknown"}`;
        rows.push(row);
        console.log(JSON.stringify(row));
        continue;
      }
      const result = await runPipeline(detail, {
        sceneLlm: true,
        sceneLlmVersion: 2,
        ragEnabled: isRagEnabled(),
      });
      if (!result) {
        row.skip = "pipeline_empty";
        rows.push(row);
        console.log(JSON.stringify(row));
        continue;
      }
      row.outputPath = result.outputPath;
      row.sceneKey = result.matchResult?.sceneKey || "";
      row.omsCode = resolveSceneOverviewCode(String(row.sceneKey)).code || "";
      writeFileSync(resolve(outDir, `${orderNo}.pipeline.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");
      if (result.outputPath !== "sop_generated" || result.llm?.error) {
        row.skip = `out=${result.outputPath} llm=${result.llm?.error || ""}`;
        rows.push(row);
        console.log(JSON.stringify(row));
        continue;
      }
      let write = await writePipelineDraft(result);
      if (!write.success && /Cookie|cniam|#\/login|IAM|登录超时/i.test(write.error || "")) {
        const err = refreshTomCookies();
        row.cookieRefresh = err || "ok";
        write = await writePipelineDraft(result);
      }
      row.writeSuccess = write.success;
      row.dryRun = write.dryRun;
      row.written = write.written;
      row.skipped = write.skipped;
      row.missingOmsScene = write.missingOmsScene;
      row.error = write.error || "";
      row.readBackSop = (write.readBack?.sop || "").slice(0, 80);
      if (write.success && write.missingOmsScene && !write.dryRun) {
        const notify = await notifyOwnerMissingOmsScene({
          vascNo: orderNo,
          sceneKey: result.matchResult?.sceneKey,
          sceneName: result.matchResult?.scenarioName,
          warehouse: result.contextFacts?.warehouseName,
        });
        row.notify = notify;
        appendBadcase({
          kind: "missing_oms_scene_code",
          vascNo: orderNo,
          sceneKey: result.matchResult?.sceneKey || "",
          sceneName: result.matchResult?.scenarioName || "",
          source: "rewrite-missing-oms-scene-orders",
        });
      }
    } catch (err) {
      row.error = err instanceof Error ? err.message : String(err);
    }
    rows.push(row);
    console.log(JSON.stringify(row));
  }

  writeFileSync(resolve(outDir, "rewrite-result.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  const failed = rows.filter((item) => item.error && !item.writeSuccess);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
