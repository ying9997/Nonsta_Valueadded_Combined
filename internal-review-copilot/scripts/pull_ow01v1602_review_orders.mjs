#!/usr/bin/env node
/**
 * Pull OMS value-added orders for local internal-review dry runs.
 *
 * Default target:
 *   orderDate local date = 2026-09-02
 *   statusDesc contains 待审核
 *   service atom = OW01V1602 / 入库其他服务需求
 *
 * The script uses the shared Playwright cookies already used by the Python OMS
 * scripts, but relies only on Node 22+ built-in fetch.
 *
 * Callable:
 *   import { pullReviewOrders } from "./pull_ow01v1602_review_orders.mjs"
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve("D:/DA/Nonsta_Valueadded_Combined");
const AUTH_COOKIES = path.resolve("D:/DA/AI_EXPERT/TOM/共享认证/playwright_cookies.json");
const AJAX_OMS = "https://cnomstom.winit.com.cn/VasOrder/ajaxProcess";
const LIST_PAGE = "https://cnomstom.winit.com.cn/VasOrder/index";
const SERVICE_CODE = "OW01V1602";
const SERVICE_NAME = "入库其他服务需求";

function arg(name, fallback = "") {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function cookieHeader(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function loadSession() {
  const cookies = JSON.parse(await readFile(AUTH_COOKIES, "utf8"));
  const cookie = cookieHeader(cookies);
  const list = await fetch(LIST_PAGE, {
    headers: {
      cookie,
      "user-agent": "Mozilla/5.0",
    },
  });
  const text = await list.text();
  if (list.url.includes("cniam.winit.com.cn")) {
    throw new Error("Cookie 已失效，请先运行共享认证/auto_login.py");
  }
  const m = text.match(/window\.__CSRF_TOKEN__\s*=\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error("无法提取 OMS CSRF token");
  return { cookie, csrf: m[1] };
}

async function omsPost(session, params) {
  const body = new URLSearchParams(params);
  const resp = await fetch(AJAX_OMS, {
    method: "POST",
    headers: {
      cookie: session.cookie,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      "x-csrf-token": session.csrf,
      referer: LIST_PAGE,
      "user-agent": "Mozilla/5.0",
    },
    body,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  const data = await resp.json();
  if (data.status !== 1) throw new Error(`${params.api} failed: ${JSON.stringify(data.info ?? data).slice(0, 500)}`);
  return data;
}

function rows(info) {
  if (Array.isArray(info)) return info;
  if (info && typeof info === "object") {
    for (const k of ["content", "data", "rows"]) {
      if (Array.isArray(info[k])) return info[k];
    }
  }
  return [];
}

function localDate(ms) {
  if (!ms) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(Number(ms)));
}

function flattenHeader(row) {
  const warehouse = row.warehouse && typeof row.warehouse === "object" ? row.warehouse : {};
  const customer = row.customer && typeof row.customer === "object" ? row.customer : {};
  return {
    ...row,
    warehouseCode: warehouse.warehouseCode ?? row.warehouseCode ?? "",
    warehouseName: warehouse.warehouseName ?? row.warehouseName ?? "",
    customerCode: customer.customerCode ?? row.customerCode ?? "",
    customerName: customer.customerName ?? row.customerName ?? "",
    orderDateLocal: localDate(row.orderDate),
    createdLocal: localDate(row.created),
  };
}

async function pageAll(session, { targetDate, statusDescNeedle, maxPages, pageSize }) {
  const byOrder = new Map();
  for (let page = 0; page < maxPages; page += 1) {
    const start = page * pageSize;
    const data = await omsPost(session, {
      api: "oms.VaOrderService_pageQuery",
      draw: "1",
      start: String(start),
      length: String(pageSize),
      "where[orderDateStart]": `${targetDate} 00:00:00`,
      "where[orderDateEnd]": `${targetDate} 23:59:59`,
      "where[statusDesc]": statusDescNeedle,
    });
    const pageRows = rows(data.info);
    for (const row of pageRows) byOrder.set(row.orderNo, row);
    console.log(`page=${page + 1} got=${pageRows.length} accumulated=${byOrder.size}`);
    if (pageRows.length < pageSize) break;
  }
  return [...byOrder.values()];
}

async function getVasList(session, orderNo) {
  const data = await omsPost(session, {
    draw: "1",
    start: "0",
    length: "50",
    api: "oms.VaOrderService_getVasList",
    "where[orderNo]": orderNo,
  });
  return rows(data.info);
}

async function getEventOrders(session, orderNo, serviceCode, serviceSequence = "1") {
  const data = await omsPost(session, {
    draw: "1",
    start: "0",
    length: "50",
    api: "oms.VaOrderService_getEventOrder4VaAtom",
    "where[orderNo]": orderNo,
    "where[serviceCode]": serviceCode,
    "where[serviceSequence]": String(serviceSequence),
  });
  return Array.isArray(data.info) ? data.info : rows(data.info);
}

function hasTargetAtom(atoms) {
  return atoms.some((atom) => atom.serviceCode === SERVICE_CODE || String(atom.serviceName || "").includes(SERVICE_NAME));
}

function isTargetHeader(row, targetDate, statusDescNeedle) {
  const h = flattenHeader(row);
  if (h.orderDateLocal !== targetDate) return false;
  if (statusDescNeedle && !String(h.statusDesc || "").includes(statusDescNeedle)) return false;
  return true;
}

/**
 * @param {{
 *   date?: string,
 *   statusDesc?: string,
 *   maxPages?: number,
 *   pageSize?: number,
 *   outDir?: string,
 *   writeFiles?: boolean,
 * }} options
 */
export async function pullReviewOrders(options = {}) {
  const targetDate = options.date || "2026-09-02";
  const statusDescNeedle = options.statusDesc || "待审核";
  const maxPages = Number(options.maxPages ?? 20);
  const pageSize = Number(options.pageSize ?? 50);
  const outDir = path.resolve(
    ROOT,
    options.outDir || `_runs/${targetDate.replaceAll("-", "")}_ow01v1602_review_orders`,
  );
  const writeFiles = options.writeFiles !== false;

  if (writeFiles) await mkdir(outDir, { recursive: true });
  const session = await loadSession();
  const pageRows = await pageAll(session, { targetDate, statusDescNeedle, maxPages, pageSize });
  const targetHeaders = pageRows.filter((row) => isTargetHeader(row, targetDate, statusDescNeedle));
  console.log(`candidate headers after date/status filter=${targetHeaders.length}`);

  const details = [];
  for (const [idx, row] of targetHeaders.entries()) {
    const orderNo = row.orderNo;
    const atoms = await getVasList(session, orderNo);
    if (!hasTargetAtom(atoms)) continue;
    const events = [];
    for (const atom of atoms.filter((a) => a.serviceCode === SERVICE_CODE || String(a.serviceName || "").includes(SERVICE_NAME))) {
      const evs = await getEventOrders(session, orderNo, atom.serviceCode || SERVICE_CODE, atom.serviceSequence || "1");
      for (const ev of evs) {
        events.push({ ...ev, _orderNo: orderNo, _serviceCode: atom.serviceCode, _serviceSequence: atom.serviceSequence || "1" });
      }
    }
    details.push({
      orderNo,
      listHeader: flattenHeader(row),
      atoms,
      events,
      errors: [],
    });
    console.log(`[${idx + 1}/${targetHeaders.length}] kept ${orderNo} atoms=${atoms.length} events=${events.length}`);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    targetDate,
    statusDescNeedle,
    serviceCode: SERVICE_CODE,
    serviceName: SERVICE_NAME,
    pageRows: pageRows.length,
    candidateHeaders: targetHeaders.length,
    detailCount: details.length,
    outDir,
  };
  if (writeFiles) {
    await writeFile(path.join(outDir, "pagequery_raw.json"), JSON.stringify({ rows: pageRows }, null, 2), "utf8");
    await writeFile(path.join(outDir, "details.json"), JSON.stringify(details, null, 2), "utf8");
    await writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  }
  console.log(JSON.stringify(summary, null, 2));
  return { summary, details, pageRows, outDir };
}

async function main() {
  await pullReviewOrders({
    date: arg("date", "2026-09-02"),
    statusDesc: arg("status-desc", "待审核"),
    maxPages: Number(arg("max-pages", "20")),
    pageSize: Number(arg("page-size", "50")),
    outDir: arg("out", ""),
  });
}

const isCli = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
