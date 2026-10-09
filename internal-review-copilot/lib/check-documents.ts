import { asArray, asRecord, asText } from "./oms-adapter.ts";
import { isOutboundOrder } from "./order-category.ts";
import { isWoNo } from "./wo-numbers.ts";
import type { ContextFacts, JsonRecord } from "./types.ts";

function isWiNo(value: string): boolean {
  return /^WI\d{6,}$/.test(value);
}

/**
 * Soft document-existence / ownership check.
 * Never hard-pass or hard-fail the pipeline. Unverifiable cases get a risk flag.
 * Outbound orders bind WO as the primary business order (inbound uses WI / EB).
 */
export function checkDocuments(detail: JsonRecord, context: ContextFacts): string[] {
  const flags: string[] = [];
  const header = asRecord(detail.listHeader);
  const headerCustomer = asText(asRecord(header.customer).customerCode) || context.customerCode;
  const headerWarehouse = asText(asRecord(header.warehouse).warehouseCode) || context.warehouseCode;
  const events = asArray(detail.events).map(asRecord);
  const eventNos = new Set(
    events
      .map((ev) => asText(ev.eventNo) || asText(ev.businessNo) || asText(ev._eventNo))
      .filter(Boolean)
      .map((no) => no.toUpperCase()),
  );

  const boundEbs = context.allEventNos.map((no) => no.toUpperCase());
  const boundBiz = context.allBusinessOrderNos.map((no) => no.toUpperCase());
  const boundWis = boundBiz.filter(isWiNo);
  const boundWos = boundBiz.filter(isWoNo);
  const outbound = isOutboundOrder(context);

  if (!boundEbs.length && !boundWis.length && !boundWos.length) {
    flags.push("单据归属未验证");
    return flags;
  }

  let verified = false;
  for (const eb of boundEbs) {
    if (eventNos.has(eb)) verified = true;
  }

  const business = asRecord(header.businessOrder);
  const headerBiz = asText(business.businessNo).toUpperCase();
  if (headerBiz && boundBiz.includes(headerBiz)) verified = true;
  if (outbound && headerBiz && isWoNo(headerBiz) && boundWos.includes(headerBiz)) verified = true;

  for (const ev of events) {
    const evBiz = (asText(ev.eventNo) || asText(ev.businessNo) || asText(ev._eventNo)).toUpperCase();
    if (evBiz && boundWos.includes(evBiz)) verified = true;
    const evCustomer = asText(ev.customerCode) || asText(asRecord(ev.customer).customerCode);
    const evWarehouse = asText(ev.warehouseCode) || asText(asRecord(ev.warehouse).warehouseCode);
    if (evCustomer && headerCustomer && evCustomer !== headerCustomer) {
      flags.push("单据归属未验证");
      return [...new Set(flags)];
    }
    if (evWarehouse && headerWarehouse && evWarehouse !== headerWarehouse) {
      flags.push("单据归属未验证");
      return [...new Set(flags)];
    }
  }

  if (!verified) flags.push("单据归属未验证");
  return [...new Set(flags)];
}
