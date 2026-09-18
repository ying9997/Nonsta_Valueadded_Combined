import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { copilotDir } from "./env.ts";
import { asRecord, asText } from "./oms-adapter.ts";
import { queryDwsSql } from "./sku-consistency-check.ts";

export interface PersonHit {
  name: string;
  openId: string | null;
}

export interface RosterPerson {
  name: string;
  openId: string;
}

export interface SalesCsLookup {
  销售: PersonHit;
  客服: PersonHit;
  customerCode: string;
  source: "dws" | "empty";
}

const cache = new Map<string, SalesCsLookup>();
let rosterCache: RosterPerson[] | null = null;

export function exceptionRosterPath(): string {
  return resolve(copilotDir(), "config", "exception-group-roster.json");
}

export function loadExceptionRoster(): RosterPerson[] {
  if (rosterCache) return rosterCache;
  const path = exceptionRosterPath();
  if (!existsSync(path)) {
    rosterCache = [];
    return rosterCache;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as { members?: Array<{ name?: string; openId?: string }> };
  rosterCache = (raw.members || [])
    .map((item) => ({ name: String(item.name || "").trim(), openId: String(item.openId || "").trim() }))
    .filter((item) => item.name && item.openId.startsWith("ou_"));
  return rosterCache;
}

export function resetSalesCsCacheForTests(): void {
  cache.clear();
  rosterCache = null;
}

function norm(name: string): string {
  return name.replace(/\s+/g, "").replace(/[.,]/g, "").toLowerCase();
}

/** 先精确姓名，再忽略空格；短名字不用包含匹配，避免 刘佳 误中 刘佳音。 */
export function matchRosterName(query: string, roster: RosterPerson[]): PersonHit {
  const q = query.trim();
  if (!q) return { name: "", openId: null };
  const exact = roster.filter((item) => item.name === q);
  if (exact.length === 1) return { name: exact[0].name, openId: exact[0].openId };
  if (exact.length > 1) return { name: q, openId: null };
  const folded = roster.filter((item) => norm(item.name) === norm(q));
  if (folded.length === 1) return { name: folded[0].name, openId: folded[0].openId };
  if (q.length >= 3) {
    const contains = roster.filter((item) => item.name.includes(q) || q.includes(item.name));
    if (contains.length === 1) return { name: contains[0].name, openId: contains[0].openId };
  }
  return { name: q, openId: null };
}

function emptyLookup(customerCode: string): SalesCsLookup {
  return {
    customerCode,
    source: "empty",
    销售: { name: "销售", openId: null },
    客服: { name: "客服", openId: null },
  };
}

export async function lookupSalesCs(customerCode: string): Promise<SalesCsLookup> {
  const code = customerCode.trim();
  if (!/^\d{5,12}$/.test(code)) return emptyLookup(code);
  const hit = cache.get(code);
  if (hit) return hit;
  const roster = loadExceptionRoster();
  const sql =
    "SELECT winit_account_id, salesman, salesman_name, service_user_name, service_user_id " +
    "FROM bi_dw.dim_bpartner_account_info_t " +
    `WHERE winit_account_id = '${code}'`;
  const rows = await queryDwsSql(sql, 5);
  const row = asRecord(rows[0]);
  const salesName = asText(row.salesman);
  const csName = asText(row.service_user_name) || asText(row.service_user_id);
  const result: SalesCsLookup = {
    customerCode: code,
    source: salesName || csName ? "dws" : "empty",
    销售: salesName ? matchRosterName(salesName, roster) : { name: "销售", openId: null },
    客服: csName ? matchRosterName(csName, roster) : { name: "客服", openId: null },
  };
  cache.set(code, result);
  return result;
}

export function customerCodeFromDetail(detail?: Record<string, unknown>, facts?: { customerCode?: string }): string {
  if (asText(facts?.customerCode)) return asText(facts?.customerCode);
  const header = asRecord(detail?.listHeader);
  const customer = asRecord(header.customer);
  return asText(customer.customerCode) || asText(header.customerCode) || asText(detail?.customerCode);
}
