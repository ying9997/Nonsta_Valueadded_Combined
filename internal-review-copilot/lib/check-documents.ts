import { asArray, asRecord, asText } from "./oms-adapter.ts";
import type { ContextFacts, JsonRecord } from "./types.ts";

/**
 * Soft document-existence / ownership check.
 * Never hard-pass or hard-fail the pipeline. Unverifiable cases get a risk flag.
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
  const boundWis = context.allBusinessOrderNos.map((no) => no.toUpperCase());

  if (!boundEbs.length && !boundWis.length) {
    flags.push("单据归属未验证");
    return flags;
  }

  let verified = false;
  for (const eb of boundEbs) {
    if (eventNos.has(eb)) verified = true;
  }

  const business = asRecord(header.businessOrder);
  const headerWi = asText(business.businessNo).toUpperCase();
  if (headerWi && boundWis.includes(headerWi)) verified = true;

  for (const ev of events) {
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
