import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../../internal-review-copilot/lib/env.ts";
import { asArray, asRecord, asText, isAllowedServiceAtom } from "../../internal-review-copilot/lib/oms-adapter.ts";
import { createTomClient } from "../../internal-review-copilot/lib/oms-tom-client.ts";
import { pullReviewOrders } from "../../internal-review-copilot/scripts/pull_ow01v1602_review_orders.mjs";

const OUT = resolve(projectDir(), "_runs/20260915_pre_deploy_verify");
const STORE = resolve(projectDir(), "_runs/20260911_live_poll/case-store.json");
const LIVE_PENDING = ["VASC000000366717", "VASC000000366735", "VASC000000366432"];

function localDatesBack(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = 0; i < n; i += 1) {
    out.push(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(now - i * 86400000)));
  }
  return out;
}

async function headerOf(client: Awaited<ReturnType<typeof createTomClient>>, orderNo: string) {
  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const rows = asArray(asRecord(list.info).content || asRecord(list.info).data).map(asRecord);
  return rows.find((item) => asText(item.orderNo) === orderNo) || rows[0] || {};
}

async function atomsOf(client: Awaited<ReturnType<typeof createTomClient>>, orderNo: string) {
  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  return asArray(asRecord(vas.info).content).map(asRecord);
}

async function main(): Promise<void> {
  loadEnvFiles();
  mkdirSync(OUT, { recursive: true });
  const store = asRecord(JSON.parse(readFileSync(STORE, "utf8")));
  const fromStore = asArray(store.cases)
    .map(asRecord)
    .filter((item) => asText(item.omsAuditStatus) === "待审核")
    .map((item) => asText(item.vascNo))
    .filter(Boolean);
  const want = [...new Set([...fromStore, ...LIVE_PENDING])];
  console.log(`case-store 待审核 ${fromStore.length} 条: ${fromStore.join(",")}`);

  const client = await createTomClient();
  const checked: Array<Record<string, string>> = [];
  for (const orderNo of want) {
    try {
      const header = await headerOf(client, orderNo);
      const atoms = await atomsOf(client, orderNo);
      const allowed = atoms.some((atom) => isAllowedServiceAtom(atom));
      const codes = atoms.map((atom) => asText(atom.serviceCode)).filter(Boolean).join(",");
      const row = {
        orderNo,
        statusDesc: asText(header.statusDesc) || asText(header.status),
        isAuditThrough: asText(header.isAuditThrough),
        allowed: allowed ? "1" : "0",
        codes,
        source: fromStore.includes(orderNo) ? "case-store" : "prompt-example",
      };
      checked.push(row);
      console.log(`check ${orderNo} status=${row.statusDesc} allowed=${row.allowed} codes=${codes}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      checked.push({ orderNo, statusDesc: "ERROR", isAuditThrough: "", allowed: "0", codes: "", source: "error", error: msg.slice(0, 200) });
      console.log(`check ${orderNo} ERROR ${msg.slice(0, 120)}`);
    }
  }

  const still = checked.filter((row) => row.statusDesc.includes("待审核") && row.allowed === "1");
  let details: Array<Record<string, unknown>> = [];
  const pulledDates: string[] = [];
  if (still.length < 5) {
    console.log(`仍待审核且服务码允许的只有 ${still.length} 条，开始轮询近几天待审核单`);
    for (const date of localDatesBack(5)) {
      pulledDates.push(date);
      const pulled = await pullReviewOrders({
        date,
        statusDesc: "待审核",
        maxPages: 5,
        writeFiles: false,
        outDir: OUT,
      });
      details = details.concat(pulled.details as Array<Record<string, unknown>>);
      const pendingNow = details.filter((d) => asText(d.orderNo)).length;
      console.log(`pull ${date} details=${pulled.details.length} accumulated=${pendingNow}`);
      if (details.length >= 8) break;
    }
  }

  const byOrder = new Map<string, Record<string, unknown>>();
  for (const d of details) {
    const no = asText(d.orderNo);
    if (no && !byOrder.has(no)) byOrder.set(no, d);
  }

  const pickedNos: string[] = still.map((row) => row.orderNo);
  for (const d of byOrder.values()) {
    if (pickedNos.length >= 5) break;
    const no = asText(d.orderNo);
    if (!no || pickedNos.includes(no)) continue;
    const atoms = asArray(d.atoms).map(asRecord);
    if (!atoms.some((atom) => isAllowedServiceAtom(atom))) continue;
    pickedNos.push(no);
  }

  const pickedDetails = pickedNos
    .map((no) => byOrder.get(no))
    .filter(Boolean) as Array<Record<string, unknown>>;

  if (pickedDetails.length < pickedNos.length) {
    for (const no of pickedNos) {
      if (byOrder.has(no)) continue;
      const header = await headerOf(client, no);
      const atoms = await atomsOf(client, no);
      const d = { orderNo: no, listHeader: header, atoms, events: [], errors: [] };
      byOrder.set(no, d);
      pickedDetails.push(d);
    }
  }

  writeFileSync(resolve(OUT, "checked-status.json"), `${JSON.stringify({ checked, still, pulledDates, pickedNos }, null, 2)}\n`, "utf8");
  writeFileSync(resolve(OUT, "details.json"), `${JSON.stringify(pickedDetails, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ stillCount: still.length, pulled: byOrder.size, pickedNos, detailCount: pickedDetails.length }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
