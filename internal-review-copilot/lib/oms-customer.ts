/**
 * 增值单 pageQuery 里客户名可能被打星。用同一接口按单号再取一次明文名称。
 */
import { asArray, asRecord, asText, customerNameFromHeader, type JsonRecord } from "./oms-adapter.ts";
import { isMaskedCustomerName } from "./customer-display.ts";
import { createTomClient } from "./oms-tom-client.ts";

const cacheByCode = new Map<string, string>();
const cacheByOrder = new Map<string, string>();

function pageQueryRows(list: JsonRecord): JsonRecord[] {
  const info = list.info;
  if (Array.isArray(info)) return info.map(asRecord);
  const rec = asRecord(info);
  return asArray(rec.content || rec.data).map(asRecord);
}

function pickName(row: JsonRecord): { code: string; name: string } {
  const customer = asRecord(row.customer);
  const nested = asText(customer.customerName);
  const flat = asText(row.customerName);
  const name = !isMaskedCustomerName(nested) ? nested : !isMaskedCustomerName(flat) ? flat : nested || flat;
  const code = asText(customer.customerCode) || asText(row.customerCode);
  return { code, name };
}

function remember(code: string, orderNo: string, name: string): void {
  if (isMaskedCustomerName(name)) return;
  if (code) cacheByCode.set(code, name);
  if (orderNo) cacheByOrder.set(orderNo, name);
}

export function applyCustomerName(detail: JsonRecord, name: string): void {
  if (isMaskedCustomerName(name)) return;
  const header = asRecord(detail.listHeader);
  header.customerName = name;
  const customer = asRecord(header.customer);
  if (Object.keys(customer).length) customer.customerName = name;
  detail.listHeader = header;
}

export async function lookupCustomerName(orderNo: string, customerCode = ""): Promise<string> {
  const code = customerCode.trim();
  if (code && cacheByCode.has(code)) return cacheByCode.get(code) || "";
  if (orderNo && cacheByOrder.has(orderNo)) return cacheByOrder.get(orderNo) || "";
  if (!orderNo) return "";
  try {
    const client = await createTomClient();
    await client.setOrderReferer(orderNo);
    const list = await client.ajaxProcess("oms.VaOrderService_pageQuery", {
      where: { orderNo },
      draw: "1",
      start: "0",
      length: "5",
    });
    const row = pageQueryRows(asRecord(list)).find((item) => asText(item.orderNo) === orderNo) || {};
    const picked = pickName(row);
    remember(picked.code || code, orderNo, picked.name);
    return isMaskedCustomerName(picked.name) ? "" : picked.name;
  } catch (err) {
    console.warn(`customer_name_lookup_skip ${orderNo}: ${err instanceof Error ? err.message : err}`);
    return "";
  }
}

export async function enrichDetailsCustomerNames(details: JsonRecord[]): Promise<JsonRecord[]> {
  for (const detail of details) {
    const header = asRecord(detail.listHeader);
    const customer = asRecord(header.customer);
    const current = customerNameFromHeader(header);
    if (!isMaskedCustomerName(current)) {
      remember(asText(header.customerCode) || asText(customer.customerCode), asText(detail.orderNo), current);
      continue;
    }
    const orderNo = asText(detail.orderNo) || asText(header.orderNo);
    const code = asText(header.customerCode) || asText(customer.customerCode);
    const name = await lookupCustomerName(orderNo, code);
    if (name) applyCustomerName(detail, name);
  }
  return details;
}
