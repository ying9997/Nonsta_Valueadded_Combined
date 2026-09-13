/**
 * Probe OMS unusual-event APIs for exception name / object by EB.
 *
 *   npx tsx internal-review-copilot/scripts/probe-event-order-api.ts --eb EB0126090932893980
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { createTomClient } from "../lib/oms-tom-client.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function pickRows(info: unknown): Record<string, unknown>[] {
  if (Array.isArray(info)) return info.map(asRecord);
  const rec = asRecord(info);
  for (const key of ["content", "data", "rows"]) {
    const v = rec[key];
    if (Array.isArray(v)) return v.map(asRecord);
  }
  return [];
}

function summarizeRow(row: Record<string, unknown>): Record<string, string> {
  return {
    eventNo: asText(row.eventNo),
    eventCode: asText(row.eventCode),
    eventName: asText(row.eventName),
    eventObj: asText(row.eventObj),
    exceptionObject: asText(row.exceptionObject),
    exceptionObjectName: asText(row.exceptionObjectName),
    exceptionName: asText(row.exceptionName),
  };
}

function hiddenField(html: string, fieldId: string): string {
  const a = html.match(new RegExp(`id="${fieldId}"[^>]*value="([^"]*)"`));
  if (a?.[1]) return a[1];
  const b = html.match(new RegExp(`value="([^"]*)"[^>]*id="${fieldId}"`));
  return b?.[1] || "";
}

async function main(): Promise<void> {
  loadEnvFiles();
  const ebNo = arg("eb", "EB0126090932893980");
  const outDir = resolve(projectDir(), arg("out") || "_runs/20260911_line_a_verify");
  mkdirSync(outDir, { recursive: true });
  const client = await createTomClient();
  const probes: Array<{ name: string; ok: boolean; error?: string; sample?: unknown }> = [];

  try {
    const data = await client.ajaxUnusualEvent("oms.UnusualEventOrderService_findUnusualEventOrderPage", {
      draw: "1",
      start: "0",
      length: "5",
      where: { unusualEventOrderVo: { eventNo: ebNo } },
    });
    const rows = pickRows(data.info).map(summarizeRow);
    probes.push({ name: "UnusualEvent.findUnusualEventOrderPage", ok: true, sample: rows });
  } catch (err) {
    probes.push({
      name: "UnusualEvent.findUnusualEventOrderPage",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  for (const api of ["oms.EventOrderService_queryPage", "oms.EventOrderService_getEventOrderDetail"]) {
    try {
      const data = await client.ajaxProcess(api, {
        where: { eventNo: ebNo },
        draw: "1",
        start: "0",
        length: "1",
        eventNo: ebNo,
      });
      probes.push({ name: `VasOrder.${api}`, ok: true, sample: summarizeRow(asRecord(pickRows(data.info)[0] || data.info)) });
    } catch (err) {
      probes.push({
        name: `VasOrder.${api}`,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    const html = await client.getPage(`/UnusualEvent/detail/eventNo/${ebNo}`);
    probes.push({
      name: "UnusualEvent.detail HTML",
      ok: Boolean(html && !html.includes("cniam.winit.com.cn")),
      sample: {
        eventName: hiddenField(html, "eventName"),
        eventCode: hiddenField(html, "eventCode"),
        eventObj: hiddenField(html, "eventObj"),
        htmlChars: String(html.length),
      },
    });
  } catch (err) {
    probes.push({
      name: "UnusualEvent.detail HTML",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const outPath = resolve(outDir, `${ebNo}.probe.json`);
  writeFileSync(outPath, `${JSON.stringify({ ebNo, probes, at: new Date().toISOString() }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ebNo, probes, outPath }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
