import { asArray, asRecord, asText } from "./oms-adapter.ts";
import type { AgentInput, JsonRecord } from "./types.ts";

export interface PackageInfoPage {
  content?: unknown[];
  rows?: unknown[];
  data?: unknown[];
  total?: unknown;
  totalElements?: unknown;
}

export interface OrderQuantityFacts {
  itemQty?: unknown;
  merchandiseQty?: unknown;
}

export interface PackageInfoFactsDeps {
  resolveSystemOrderNo?: (wiNo: string, input: AgentInput) => Promise<string>;
  queryPackageInfos: (systemOrderNo: string) => Promise<PackageInfoPage | JsonRecord | null | undefined>;
  querySystemOrderQuantities?: (systemOrderNo: string, input: AgentInput) => Promise<OrderQuantityFacts | null | undefined>;
}

export interface PackageInfoFactEnrichment {
  queriedSystemOrderNos: string[];
  skippedOrderNos: string[];
  addedFactLines: string[];
}

const WI_NO_RE = /WI\d{6,}/gi;
const SYSTEM_ORDER_NO_RE = /^WI\d{9}$/i;

function uniq(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asText(value);
  if (!text) return null;
  const num = Number(text.replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

function pushFact(lines: string[], label: string, value: unknown): void {
  const num = toFiniteNumber(value);
  const text = num == null ? asText(value) : String(num);
  if (!text) return;
  lines.push(`${label}：${text}`);
}

export function isSystemOrderNo(value: string): boolean {
  return SYSTEM_ORDER_NO_RE.test(value.trim());
}

export function extractWiNos(text: string): string[] {
  return uniq((text.match(WI_NO_RE) || []).map((item) => item.toUpperCase()));
}

export function packageInfoCandidateOrderNos(input: AgentInput): string[] {
  return uniq([
    asText(input.providedFields.VAS_ATTR_REL_NWEON),
    asText(input.providedFields["上架入库单号"]),
    input.pageContext.businessOrderNo,
    ...((input.enrichedContext.allBusinessOrderNos as string[] | undefined) || []),
    ...extractWiNos(input.customerIntent || ""),
  ].filter(Boolean).map((item) => item.toUpperCase()));
}

function pageRows(page: PackageInfoPage | JsonRecord | null | undefined): JsonRecord[] {
  const rec = asRecord(page);
  return asArray(rec.content || rec.rows || rec.data).map(asRecord);
}

function pageTotal(page: PackageInfoPage | JsonRecord | null | undefined): number | null {
  const rec = asRecord(page);
  return toFiniteNumber(rec.totalElements) ?? toFiniteNumber(rec.total) ?? null;
}

export function packageInfoKnownFactLines(
  systemOrderNo: string,
  page: PackageInfoPage | JsonRecord | null | undefined,
  quantities: OrderQuantityFacts | null | undefined = {},
): string[] {
  const rows = pageRows(page);
  const total = pageTotal(page) ?? rows.length;
  if (!total || total <= 0) return [];

  const lines: string[] = [`上架系统订单号：${systemOrderNo}`];
  pushFact(lines, "增值包裹数量", total);
  pushFact(lines, "增值单品数量", quantities?.itemQty);
  pushFact(lines, "增值商品数量", quantities?.merchandiseQty);

  const skuQtys = uniq(
    rows
      .map((row) => toFiniteNumber(row.skuQty))
      .filter((num): num is number => num != null)
      .map(String),
  );
  if (skuQtys.length === 1) lines.push(`每包SKU数量：${skuQtys[0]}`);
  return lines;
}

function mergeKnownFactLines(input: AgentInput, factLines: string[]): string[] {
  const current = [
    ...((input.omsFacts.knownFactLines as string[] | undefined) || []),
    ...((input.enrichedContext.knownFactLines as string[] | undefined) || []),
  ];
  const merged = uniq([...current, ...factLines]);
  input.omsFacts.knownFactLines = merged;
  input.enrichedContext.knownFactLines = merged;
  return merged;
}

export async function enrichPackageInfoKnownFacts(
  input: AgentInput,
  deps: PackageInfoFactsDeps | undefined,
): Promise<PackageInfoFactEnrichment> {
  const enrichment: PackageInfoFactEnrichment = {
    queriedSystemOrderNos: [],
    skippedOrderNos: [],
    addedFactLines: [],
  };
  if (!deps) return enrichment;

  for (const wiNo of packageInfoCandidateOrderNos(input)) {
    let systemOrderNo = isSystemOrderNo(wiNo) ? wiNo : "";
    if (!systemOrderNo && deps.resolveSystemOrderNo) {
      try {
        systemOrderNo = (await deps.resolveSystemOrderNo(wiNo, input)).trim().toUpperCase();
      } catch {
        enrichment.skippedOrderNos.push(wiNo);
        continue;
      }
    }
    if (!isSystemOrderNo(systemOrderNo)) {
      enrichment.skippedOrderNos.push(wiNo);
      continue;
    }

    let page: PackageInfoPage | JsonRecord | null | undefined;
    let quantities: OrderQuantityFacts | null | undefined = null;
    try {
      page = await deps.queryPackageInfos(systemOrderNo);
      enrichment.queriedSystemOrderNos.push(systemOrderNo);
      quantities = deps.querySystemOrderQuantities
        ? await deps.querySystemOrderQuantities(systemOrderNo, input)
        : null;
    } catch {
      enrichment.skippedOrderNos.push(systemOrderNo);
      continue;
    }
    const factLines = packageInfoKnownFactLines(systemOrderNo, page, quantities);
    if (!factLines.length) continue;

    mergeKnownFactLines(input, factLines);
    enrichment.addedFactLines.push(...factLines);
    break;
  }

  return {
    ...enrichment,
    queriedSystemOrderNos: uniq(enrichment.queriedSystemOrderNos),
    skippedOrderNos: uniq(enrichment.skippedOrderNos),
    addedFactLines: uniq(enrichment.addedFactLines),
  };
}
