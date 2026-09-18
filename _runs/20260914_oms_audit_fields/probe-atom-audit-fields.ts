/**
 * Probe audit-related fields on an already-approved VAS order.
 *
 *   npx tsx _runs/20260914_oms_audit_fields/probe-atom-audit-fields.ts --order VASC000000315774
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../../internal-review-copilot/lib/env.ts";
import { asArray, asRecord, asText } from "../../internal-review-copilot/lib/oms-adapter.ts";
import { createTomClient } from "../../internal-review-copilot/lib/oms-tom-client.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

const AUDIT_KEY = /audit|审核|opinion|remark|through|approve|reviewer|审核员/i;

function walk(
  value: unknown,
  path: string,
  hits: Array<{ path: string; value: string }>,
): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${path}[${i}]`, hits));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = path ? `${path}.${k}` : k;
      if (AUDIT_KEY.test(k)) {
        const shown =
          v == null || typeof v === "string" || typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : JSON.stringify(v).slice(0, 400);
        hits.push({ path: next, value: shown });
      }
      walk(v, next, hits);
    }
  }
}

async function main(): Promise<void> {
  loadEnvFiles();
  const orderNo = arg("order", "VASC000000315774");
  const outDir = resolve(projectDir(), "_runs/20260914_oms_audit_fields");
  mkdirSync(outDir, { recursive: true });
  const client = await createTomClient();
  await client.setOrderReferer(orderNo);

  const vas = await client.ajaxProcess("oms.VaOrderService_getVasList", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "20",
  });
  const atoms = asArray(asRecord(vas.info).content).map(asRecord);
  const atom = atoms.find((item) => asText(item.orderNo) === orderNo) || atoms[0] || {};

  const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
    where: { orderNo },
    draw: "1",
    start: "0",
    length: "5",
  });
  const headers = asArray(asRecord(list.info).content || asRecord(list.info).data).map(asRecord);
  const header = headers.find((item) => asText(item.orderNo) === orderNo) || headers[0] || {};

  const atomHits: Array<{ path: string; value: string }> = [];
  const headerHits: Array<{ path: string; value: string }> = [];
  walk(atom, "atom", atomHits);
  walk(header, "header", headerHits);

  writeFileSync(resolve(outDir, `${orderNo}.atom.json`), `${JSON.stringify(atom, null, 2)}\n`, "utf8");
  writeFileSync(resolve(outDir, `${orderNo}.header.json`), `${JSON.stringify(header, null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(outDir, `${orderNo}.audit-hits.json`),
    `${JSON.stringify({ orderNo, atomKeys: Object.keys(atom), headerKeys: Object.keys(header), atomHits, headerHits }, null, 2)}\n`,
    "utf8",
  );

  console.log(`[probe] ${orderNo}`);
  console.log(`[probe] atom keys: ${Object.keys(atom).join(", ")}`);
  console.log(`[probe] header keys: ${Object.keys(header).join(", ")}`);
  console.log("[probe] atom audit-like hits:");
  for (const hit of atomHits) console.log(`  ${hit.path} = ${hit.value}`);
  if (!atomHits.length) console.log("  (none)");
  console.log("[probe] header audit-like hits:");
  for (const hit of headerHits) console.log(`  ${hit.path} = ${hit.value}`);
  if (!headerHits.length) console.log("  (none)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
