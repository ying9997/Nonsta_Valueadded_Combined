/**
 * H11: 拦截/换标场景下，原入库单 vs 新入库单 SKU 一致性校验。
 * 校验是增强不是门禁：超时、查不到都降级为 unknown，绝不卡住 pipeline。
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { envNumber, envText } from "./env.ts";
import { asArray, asRecord, asText } from "./oms-adapter.ts";
import { getOrCreateTomClient, type TomClient } from "./oms-tom-client.ts";
import type { AgentInput, ContextFacts, JsonRecord, MatchResult, SkuCheckResult, SkuMatchStatus } from "./types.ts";

const WI_RE = /WI\d{8,}/gi;
const WI_OK = /^WI\d{8,}$/;
const INTERCEPT_OMS_CODE = "202507021814";
const SKU_CHECK_TIMEOUT_MS_DEFAULT = 25_000;
const DWS_MCP_URL_DEFAULT = "http://172.16.3.40/winit-data-mcp/mcp";
const TARGET_SCENE_FRAGMENTS = [
  "inbound_package_barcode_batch_relabel",
  "inbound_aplus_relabel",
  "inbound_aplus_direct_shelve",
  "inbound_package_exception_relabel",
  "inbound_intercept_relabel",
  "inbound_oms_202507021814",
  "inbound_reshelve_change_wi_keep_sku",
  "inbound_label_identify",
];

export interface SkuCheckDeps {
  getClient?: () => Promise<TomClient>;
  queryEvents?: (client: TomClient, vascNo: string, serviceCode: string) => Promise<string[]>;
  querySkusByWi?: (wi: string) => Promise<string[]>;
  timeoutMs?: number;
}

export interface ExtractedWiPair {
  oldWi: string;
  newWi: string;
  allWis: string[];
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 超时 ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function uniqUpper(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function collectWis(...blobs: Array<string | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const blob of blobs) {
    for (const hit of asText(blob).match(WI_RE) || []) {
      const wi = hit.toUpperCase();
      if (seen.has(wi)) continue;
      seen.add(wi);
      out.push(wi);
    }
  }
  return out;
}

function requirementText(input: AgentInput): string {
  return [
    input.customerIntent,
    input.omsFacts?.customerRequirementDescription,
    input.omsFacts?.requirementBackground,
    input.providedFields?.VAS_ATTR_REL_RD,
    input.providedFields?.BEOR,
  ]
    .map((item) => asText(item))
    .filter(Boolean)
    .join("\n");
}

export function extractWiPair(input: AgentInput, contextFacts?: ContextFacts): ExtractedWiPair {
  const newFromField = asText(input.providedFields?.VAS_ATTR_REL_NWEON || input.omsFacts?.fieldValues?.VAS_ATTR_REL_NWEON).toUpperCase();
  const biz = asText(input.pageContext?.businessOrderNo || contextFacts?.businessOrderNo).toUpperCase();
  const text = requirementText(input);
  const allWis = collectWis(
    text,
    newFromField,
    biz,
    ...(contextFacts?.allBusinessOrderNos || []),
    ...((input.enrichedContext?.allBusinessOrderNos as string[]) || []),
  );

  let newWi = WI_OK.test(newFromField) ? newFromField : "";
  if (!newWi) {
    const marked = text.match(/新单\s*(?:入库单号)?[:：]?\s*(WI\d{8,})/i);
    if (marked) newWi = marked[1].toUpperCase();
  }

  let oldWi = "";
  const orig = text.match(/原(?:入库)?单(?:号)?[:：]?\s*(WI\d{8,})/i) || text.match(/原\s*(WI\d{8,})/i);
  if (orig) oldWi = orig[1].toUpperCase();
  if (!oldWi && WI_OK.test(biz) && biz !== newWi) oldWi = biz;
  if (!oldWi) oldWi = allWis.find((wi) => wi !== newWi) || "";
  if (!newWi) newWi = allWis.find((wi) => wi !== oldWi) || "";

  return { oldWi, newWi, allWis };
}

function sceneBlob(input: AgentInput, matchResult?: MatchResult, contextFacts?: ContextFacts): string {
  return [
    matchResult?.sceneKey,
    matchResult?.scenarioId,
    matchResult?.scenarioName,
    input.sceneKey,
    input.sceneName,
    input.sceneCode,
    contextFacts?.sceneKey,
    contextFacts?.sceneName,
    contextFacts?.sceneCode,
  ]
    .map((item) => asText(item))
    .filter(Boolean)
    .join("\n");
}

export function shouldCheckSkuConsistency(
  input: AgentInput,
  matchResult?: MatchResult,
  contextFacts?: ContextFacts,
): boolean {
  const scenes = sceneBlob(input, matchResult, contextFacts);
  const sceneHit =
    TARGET_SCENE_FRAGMENTS.some((frag) => scenes.includes(frag)) ||
    scenes.includes(INTERCEPT_OMS_CODE) ||
    /上架前拦截/.test(scenes);
  if (!sceneHit) return false;

  const text = requirementText(input);
  const hasInterceptKeyword = /原单|原入库单|拦截|截.*上架|更换.*标签/.test(text);
  const pair = extractWiPair(input, contextFacts);
  const biz = asText(input.pageContext?.businessOrderNo || contextFacts?.businessOrderNo);
  const hasMultipleWi = pair.allWis.length >= 2 || (pair.allWis.length >= 1 && Boolean(biz));
  return hasInterceptKeyword && hasMultipleWi;
}

export function compareSkus(oldSkus: string[], newSkus: string[]): SkuMatchStatus {
  if (!oldSkus.length || !newSkus.length) return "unknown";
  const oldSet = new Set(oldSkus.map((s) => s.toUpperCase()));
  const newSet = new Set(newSkus.map((s) => s.toUpperCase()));
  const allOldInNew = [...oldSet].every((s) => newSet.has(s));
  if (allOldInNew) return "consistent";
  const someOldInNew = [...oldSet].some((s) => newSet.has(s));
  return someOldInNew ? "partial" : "mismatch";
}

export function describeSkuDiff(oldSkus: string[], newSkus: string[], limit = 10): string {
  const oldSet = new Set(oldSkus.map((s) => s.toUpperCase()));
  const newSet = new Set(newSkus.map((s) => s.toUpperCase()));
  const onlyOld = oldSkus.filter((s) => !newSet.has(s.toUpperCase()));
  const onlyNew = newSkus.filter((s) => !oldSet.has(s.toUpperCase()));
  const sample = (items: string[]) =>
    items.slice(0, limit).join("、") + (items.length > limit ? ` 等共 ${items.length} 个` : items.length ? "" : "无");
  return `原单 ${oldSkus.length} 个 SKU、新单 ${newSkus.length} 个 SKU。原单有但新单没有：${sample(onlyOld)}；新单有但原单没有：${sample(onlyNew)}`;
}

function pickRows(info: unknown): JsonRecord[] {
  if (Array.isArray(info)) return info.map(asRecord);
  const rec = asRecord(info);
  for (const key of ["content", "data", "rows"]) {
    if (Array.isArray(rec[key])) return asArray(rec[key]).map(asRecord);
  }
  return [];
}

function skusFromEventRows(rows: JsonRecord[]): string[] {
  return uniqUpper(
    rows.flatMap((row) => [
      asText(row.merchandiseCode),
      asText(row.skuCode),
      asText(row.merchandiseSerno),
    ]),
  );
}

export async function queryEventSkus(
  client: TomClient,
  vascNo: string,
  serviceCode: string,
): Promise<string[]> {
  const events = await client.ajaxProcess("oms.VaOrderService_getEventOrder4VaAtom", {
    where: { orderNo: vascNo, serviceCode: serviceCode || "OW01V1602", serviceSequence: "1" },
    draw: "1",
    start: "0",
    length: "200",
  });
  return skusFromEventRows(pickRows(events.info));
}

function loadDotEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function loadWinitDataMcpEnv(): { url: string; token: string } {
  loadDotEnvFile(resolve(homedir(), ".secrets", "winit-data-mcp.env"));
  loadDotEnvFile(resolve(homedir(), ".secrets", "windatamcp.env"));
  return {
    url: envText("WINIT_DATA_MCP_URL", DWS_MCP_URL_DEFAULT),
    token: envText("WINIT_DATA_MCP_TOKEN") || envText("WINIT_DATA_TOKEN"),
  };
}

function parseSseJson(raw: string): JsonRecord {
  const payloads = collectSsePayloads(raw);
  if (!payloads.length) return { _raw: raw.slice(0, 3000) };
  if (payloads.length === 1) return payloads[0];
  return { _sseMerged: true, payloads };
}

function collectSsePayloads(raw: string): JsonRecord[] {
  const trimmed = (raw || "").trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? parsed.map(asRecord) : [asRecord(parsed)];
    } catch {
      /* fall through to SSE lines */
    }
  }
  const out: JsonRecord[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const chunk = line.slice(5).trim();
    if (!chunk || chunk === "[DONE]") continue;
    try {
      const parsed = JSON.parse(chunk) as unknown;
      if (Array.isArray(parsed)) out.push(...parsed.map(asRecord));
      else out.push(asRecord(parsed));
    } catch {
      /* ignore bad chunk */
    }
  }
  return out;
}

function parseMarkdownTable(text: string): JsonRecord[] {
  const lines = text.split(/\r?\n/).map((ln) => ln.trim()).filter((ln) => ln.startsWith("|"));
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
  const rows: JsonRecord[] = [];
  for (const ln of lines.slice(1)) {
    if (/^\|?\s*-+/.test(ln)) continue;
    const values = ln.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (values.length !== headers.length) continue;
    const row: JsonRecord = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    rows.push(row);
  }
  return rows;
}

function extractJsonValues(text: string): unknown[] {
  const out: unknown[] = [];
  let i = 0;
  const s = text || "";
  while (i < s.length) {
    while (i < s.length && s[i] !== "{" && s[i] !== "[") i++;
    if (i >= s.length) break;
    const end = endOfJsonValue(s.slice(i));
    if (end < 0) break;
    try {
      out.push(JSON.parse(s.slice(i, i + end)));
      i += end;
    } catch {
      i++;
    }
  }
  return out;
}

function endOfJsonValue(s: string): number {
  if (!s.length) return -1;
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      const open = stack.pop();
      if ((ch === "}" && open !== "{") || (ch === "]" && open !== "[")) return -1;
      if (!stack.length) return i + 1;
    }
  }
  return -1;
}

function extractTextBlobs(payload: unknown): string {
  const rec = asRecord(payload);
  const chunks: string[] = [];
  if (typeof rec.result === "string") chunks.push(rec.result);
  const content = rec.content ?? asRecord(rec.result).content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") chunks.push(item);
      else chunks.push(asText(asRecord(item).text));
    }
  }
  if (typeof rec.text === "string") chunks.push(rec.text);
  return chunks.filter(Boolean).join("\n");
}

function collectRowsFromUnknown(value: unknown, into: JsonRecord[]): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectRowsFromUnknown(item, into);
    return;
  }
  const rec = asRecord(value);
  if (Array.isArray(rec.payloads)) {
    for (const item of rec.payloads) collectRowsFromUnknown(item, into);
    return;
  }
  if (rec.result != null && rec.result !== rec) {
    collectRowsFromUnknown(rec.result, into);
    return;
  }
  if (Array.isArray(rec.rows)) {
    into.push(...rec.rows.map(asRecord));
    return;
  }
  if (
    asText(rec.merchandise_code) ||
    asText(rec.merchandiseCode) ||
    asText(rec.merchandise_serno) ||
    asText(rec.merchandiseSerno) ||
    asText(rec.order_no) ||
    asText(rec.winit_account_id) ||
    asText(rec.salesman)
  ) {
    into.push(rec);
    return;
  }
  const text = extractTextBlobs(rec);
  if (!text) return;
  const parsed = extractJsonValues(text);
  if (parsed.length) {
    for (const item of parsed) collectRowsFromUnknown(item, into);
    if (into.length) return;
  }
  const table = parseMarkdownTable(text);
  if (table.length) into.push(...table);
}

export function rowsFromDwsPayload(payload: unknown): JsonRecord[] {
  const rows: JsonRecord[] = [];
  collectRowsFromUnknown(payload, rows);
  return rows;
}

class WinitDataMcpClient {
  private sid = "";
  private rid = 0;
  private ready = false;

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly timeoutMs: number,
  ) {}

  private async post(payload: JsonRecord): Promise<JsonRecord> {
    this.rid += 1;
    const body = { ...payload, id: this.rid };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${this.token}`,
      "MCP-Protocol-Version": "2025-06-18",
    };
    if (this.sid) headers["Mcp-Session-Id"] = this.sid;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      const sid = res.headers.get("Mcp-Session-Id");
      if (sid) this.sid = sid;
      const raw = await res.text();
      return parseSseJson(raw);
    } finally {
      clearTimeout(timer);
    }
  }

  async initialize(): Promise<void> {
    if (this.ready) return;
    await this.post({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "internal-review-sku-check", version: "1" },
      },
    });
    await this.post({ jsonrpc: "2.0", method: "notifications/initialized" });
    this.ready = true;
  }

  async dwsQuery(sql: string, limit = 500): Promise<unknown> {
    await this.initialize();
    const resp = await this.post({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "dws_query", arguments: { sql, limit } },
    });
    if (resp.error) throw new Error(`DWS dws_query 失败: ${JSON.stringify(resp.error).slice(0, 240)}`);
    return resp.result ?? resp;
  }
}

let dwsClient: WinitDataMcpClient | null | undefined;

function getDwsClient(timeoutMs: number): WinitDataMcpClient | null {
  if (dwsClient !== undefined) return dwsClient;
  const { url, token } = loadWinitDataMcpEnv();
  if (!token) {
    dwsClient = null;
    return null;
  }
  dwsClient = new WinitDataMcpClient(url, token, timeoutMs);
  return dwsClient;
}

export function resetSkuCheckClientsForTests(): void {
  dwsClient = undefined;
}

/** Fail-soft DWS SELECT. No token / error → empty rows, never throw. */
export async function queryDwsSql(sql: string, limit = 50, timeoutMs = SKU_CHECK_TIMEOUT_MS_DEFAULT): Promise<JsonRecord[]> {
  const client = getDwsClient(timeoutMs);
  if (!client) {
    console.warn("dws query skipped: missing WINIT_DATA_MCP_TOKEN");
    return [];
  }
  try {
    const payload = await client.dwsQuery(sql, limit);
    const rows = rowsFromDwsPayload(payload);
    if (!rows.length && envText("DWS_DEBUG") === "1") {
      console.warn(`dws empty payload ${JSON.stringify(payload).slice(0, 800)}`);
    }
    return rows;
  } catch (err) {
    console.warn(`dws query failed: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

export interface InboundMerchandiseLine {
  merchandiseCode: string;
  merchandiseSerno: string;
}

export function linesFromInboundRows(rows: JsonRecord[]): InboundMerchandiseLine[] {
  const out: InboundMerchandiseLine[] = [];
  for (const row of rows) {
    const merchandiseCode = asText(row.merchandise_code) || asText(row.merchandiseCode);
    const merchandiseSerno = asText(row.merchandise_serno) || asText(row.merchandiseSerno);
    if (!merchandiseCode && !merchandiseSerno) continue;
    out.push({ merchandiseCode, merchandiseSerno });
  }
  return out;
}

export async function queryInboundMerchandiseFromDws(
  wi: string,
  timeoutMs = SKU_CHECK_TIMEOUT_MS_DEFAULT,
): Promise<InboundMerchandiseLine[]> {
  const orderNo = wi.trim().toUpperCase();
  if (!WI_OK.test(orderNo)) return [];
  const sql =
    "SELECT DISTINCT merchandise_code, merchandise_serno " +
    "FROM bi_dw.base_whs_inbound_merchandise_f " +
    `WHERE order_no = '${orderNo.replace(/'/g, "''")}' ` +
    "AND COALESCE(is_delete, 'N') <> 'Y' " +
    "ORDER BY merchandise_code";
  const rows = await queryDwsSql(sql, 500, timeoutMs);
  return linesFromInboundRows(rows);
}

export async function queryInboundSkusFromDws(wi: string, timeoutMs = SKU_CHECK_TIMEOUT_MS_DEFAULT): Promise<string[]> {
  const orderNo = wi.trim().toUpperCase();
  if (!WI_OK.test(orderNo)) return [];
  const client = getDwsClient(timeoutMs);
  if (!client) throw new Error("缺少 WINIT_DATA_MCP_TOKEN，无法查 DWS 入库商品");
  const sql =
    "SELECT DISTINCT merchandise_code, merchandise_serno " +
    "FROM bi_dw.base_whs_inbound_merchandise_f " +
    `WHERE order_no = '${orderNo.replace(/'/g, "''")}' ` +
    "AND COALESCE(is_delete, 'N') <> 'Y' " +
    "ORDER BY merchandise_code";
  const payload = await client.dwsQuery(sql, 500);
  const rows = rowsFromDwsPayload(payload);
  return uniqUpper(rows.map((row) => asText(row.merchandise_code) || asText(row.merchandiseCode)));
}

function emptyResult(over: Partial<SkuCheckResult> = {}): SkuCheckResult {
  return {
    triggered: false,
    oldWi: "",
    newWi: "",
    oldSkus: [],
    newSkus: [],
    match: "unknown",
    source: "none",
    ...over,
  };
}

async function loadSkus(
  wi: string,
  kind: "old" | "new",
  input: AgentInput,
  events: JsonRecord[],
  deps: SkuCheckDeps,
): Promise<{ skus: string[]; source: "events" | "dws" | "none" }> {
  if (kind === "old" && events.length) {
    const fromEvents = skusFromEventRows(events);
    if (fromEvents.length) return { skus: fromEvents, source: "events" };
  }
  if (kind === "old" && deps.queryEvents) {
    try {
      const client = deps.getClient ? await deps.getClient() : await getOrCreateTomClient();
      const fromApi = await deps.queryEvents(client, input.vascNo, input.serviceAtom);
      if (fromApi.length) return { skus: fromApi, source: "events" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`sku-check events ${input.vascNo}: ${msg}`);
    }
  } else if (kind === "old" && !deps.querySkusByWi) {
    try {
      const getClient = deps.getClient || getOrCreateTomClient;
      const client = await getClient();
      const fromApi = await queryEventSkus(client, input.vascNo, input.serviceAtom);
      if (fromApi.length) return { skus: fromApi, source: "events" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`sku-check events ${input.vascNo}: ${msg}`);
    }
  }
  if (!wi) return { skus: [], source: "none" };
  const query = deps.querySkusByWi || ((orderNo: string) => queryInboundSkusFromDws(orderNo, deps.timeoutMs));
  const skus = await query(wi);
  return { skus, source: skus.length ? "dws" : "none" };
}

export async function checkSkuConsistency(args: {
  input: AgentInput;
  matchResult?: MatchResult;
  contextFacts?: ContextFacts;
  events?: JsonRecord[];
  deps?: SkuCheckDeps;
}): Promise<SkuCheckResult> {
  const { input, matchResult, contextFacts, deps = {} } = args;
  const events = (args.events || []).map(asRecord);
  if (!shouldCheckSkuConsistency(input, matchResult, contextFacts)) {
    return emptyResult({ triggered: false });
  }
  const pair = extractWiPair(input, contextFacts);
  const timeoutMs = deps.timeoutMs ?? envNumber("SKU_CHECK_TIMEOUT_MS", SKU_CHECK_TIMEOUT_MS_DEFAULT);
  try {
    return await withTimeout(
      (async () => {
        const [oldLoaded, newLoaded] = await Promise.all([
          loadSkus(pair.oldWi, "old", input, events, { ...deps, timeoutMs }),
          loadSkus(pair.newWi, "new", input, [], { ...deps, timeoutMs }),
        ]);
        const oldSkus = oldLoaded.skus;
        const newSkus = newLoaded.skus;
        const match = compareSkus(oldSkus, newSkus);
        const source =
          oldLoaded.source === "none" && newLoaded.source === "none"
            ? "none"
            : oldLoaded.source === newLoaded.source
              ? oldLoaded.source
              : oldLoaded.source === "none"
                ? newLoaded.source
                : newLoaded.source === "none"
                  ? oldLoaded.source
                  : "mixed";
        return {
          triggered: true,
          oldWi: pair.oldWi,
          newWi: pair.newWi,
          oldSkus,
          newSkus,
          match,
          mismatchDetails: match === "consistent" || match === "unknown" ? undefined : describeSkuDiff(oldSkus, newSkus),
          source,
          error: match === "unknown" ? "查不到一侧或两侧 SKU" : undefined,
        } satisfies SkuCheckResult;
      })(),
      timeoutMs,
      "sku-consistency-check",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`sku-check skipped ${input.vascNo}: ${msg}`);
    return emptyResult({
      triggered: true,
      oldWi: pair.oldWi,
      newWi: pair.newWi,
      match: "unknown",
      source: "none",
      error: msg,
    });
  }
}

export async function checkSkuConsistencySafe(args: {
  input: AgentInput;
  matchResult?: MatchResult;
  contextFacts?: ContextFacts;
  events?: JsonRecord[];
  deps?: SkuCheckDeps;
}): Promise<SkuCheckResult> {
  try {
    return await checkSkuConsistency(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`sku-check safe ${args.input.vascNo}: ${msg}`);
    return emptyResult({ triggered: true, match: "unknown", error: msg });
  }
}

function previewSkus(skus: string[], limit = 15): string {
  if (!skus.length) return "未查到";
  const head = skus.slice(0, limit).join("、");
  return skus.length > limit ? `${head} 等共 ${skus.length} 个` : head;
}

/** 给审核员看的卡片提示，不写进仓库 SOP。 */
export function formatSkuCheckAuditorHint(result?: SkuCheckResult): string {
  if (!result?.triggered || result.match === "consistent") return "";
  const oldWi = result.oldWi || "未识别";
  const newWi = result.newWi || "未识别";
  if (result.match === "unknown") {
    return `【提示：本单AI识别到这是原入库单拦截后换新单上架（${oldWi} → ${newWi}），但未能核对两边 SKU 是否一致，请审核人员关注。】`;
  }
  const status = result.match === "mismatch" ? "SKU 不一致" : "SKU 仅部分一致";
  const oldN = result.oldSkus.length;
  const newN = result.newSkus.length;
  const sample =
    oldN && newN
      ? `，例如 ${previewSkus(result.oldSkus, 3)} vs ${previewSkus(result.newSkus, 3)}`
      : "";
  return `【提示：本单AI识别到原入库单 ${oldWi} 与新入库单 ${newWi} 的${status}（原单 ${oldN} 个、新单 ${newN} 个${sample}），请审核人员关注核对。】`;
}

/** @deprecated 使用 formatSkuCheckAuditorHint；保留别名避免旧引用断裂 */
export function formatSkuCheckPrompt(result?: SkuCheckResult): string {
  return formatSkuCheckAuditorHint(result);
}