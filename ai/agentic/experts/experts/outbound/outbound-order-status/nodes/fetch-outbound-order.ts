/**
 * 节点：获取出库单详情
 * FaaS 单文件闭环，无跨文件 import。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【Coze 插件主查】`build-outbound-primary-winit` → **`cobra_winit_openapi_request`**（多槽）→ `merge-winit-outbound-plugin-batch` → 本节点；`winitOpenapiData` 为合并后的 JSON 字符串，与 design-spec §6 一致。
 * - **single**：id/55 `queryOutboundOrder`（经插件 → merge → 本节点）
 * - **batch**：批处理 id/55，由 `merge-winit-outbound-plugin-batch` 合并为 `winitOpenapiData`；`routeType` 为 batch 时**按去重后单号**解析（数组内重复 WO 只算一单）；未齐套或超批次数时在 `COZE_*` 下 `workflow/run` 补拉
 *
 * 【本地】无插件输出时仍走 `workflow/run` 全量拉取（需 COZE_API_TOKEN 等）。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | outboundOrderNos | string[] | 出库单号 |
 * | routeType | string | `"single"` \| `"batch"` |
 * | includeFeeBreakdown | boolean（可选） | id/145 费用明细 |
 * | includeTrackingSummary | boolean（可选） | id/56 轨迹摘要 |
 * | winitOpenapiData | string（可选） | 插件返回的 `data`（JSON 字符串）；单笔主查路径 |
 * | language | string（可选） | 框架顶层语言，预留 |
 *
 * 【输出】`rawOrderData`：万邑通规范体；多单见 `_fetchMeta`；可选 `_enrichment`。
 *
 * **单号规范**：`WO` + 数字为万邑通主单号；若带子单尾缀字母（如 `WO123456A`），调用 OpenAPI 前统一规范为 `WO123456`。
 */

// ========== 类型（本文件内闭环） ==========
interface RawOrderData {
  list?: Array<Record<string, unknown>>;
  currentPageSize?: number;
  total?: number;
  currentPageNum?: number;
  _fetchMeta?: Record<string, unknown>;
  _enrichment?: {
    feesByOrder?: Record<string, unknown>;
    tracking?: unknown;
  };
}

type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

interface CozeWinitWorkflowParameters {
  action: string;
  customerCode: string;
  customerName: string;
  data: string;
  language?: string | null;
  username: string;
}

interface RunCozeWinitWorkflowOptions {
  apiToken: string;
  workflowId: string;
  baseUrl?: string;
  parameters: CozeWinitWorkflowParameters;
}

/** 递归解析 Coze 返回的 data（常为 JSON 字符串，有时双重序列化） */
function parseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    const once = JSON.parse(data) as unknown;
    if (typeof once === "string") {
      try {
        return JSON.parse(once) as unknown;
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return data;
  }
}

/** POST /v1/workflow/run，成功时返回已解析的 `data` 字段内容 */
async function runCozeWinitWorkflow(options: RunCozeWinitWorkflowOptions): Promise<unknown> {
  const baseFromEnv = typeof process !== "undefined" ? process.env?.COZE_API_BASE_URL : undefined;
  const baseUrl = (options.baseUrl ?? baseFromEnv ?? "https://api.coze.cn").replace(/\/$/, "");
  const url = `${baseUrl}/v1/workflow/run`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: String(options.workflowId),
      parameters: options.parameters,
    }),
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Coze workflow/run 响应非 JSON（HTTP ${res.status}）: ${text.slice(0, 500)}`);
  }

  const obj = body as Record<string, unknown>;

  if (!res.ok) {
    const msg = String(obj.msg ?? obj.message ?? text);
    throw new Error(`Coze workflow/run HTTP ${res.status}: ${msg.slice(0, 500)}`);
  }

  const code = obj.code;
  if (code !== 0 && code !== "0") {
    const msg = String(obj.msg ?? obj.message ?? "unknown");
    const debug = obj.debug_url != null ? ` debug_url=${String(obj.debug_url)}` : "";
    throw new Error(`Coze workflow 失败 code=${String(code)} msg=${msg}${debug}`);
  }

  return parseCozeWorkflowDataField(obj.data);
}

function getCozeWinitEnv(): CozeWinitLocalEnv | null {
  if (typeof process === "undefined" || !process.env) return null;
  const apiToken = process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "";
  const workflowId = process.env.COZE_WINIT_WORKFLOW_ID ?? "";
  const customerCode = process.env.COZE_WINIT_CUSTOMER_CODE ?? "";
  const customerName = process.env.COZE_WINIT_CUSTOMER_NAME ?? "";
  const username = process.env.COZE_WINIT_USERNAME ?? "";
  if (!apiToken || !workflowId || !customerCode || !customerName || !username) {
    return null;
  }
  const language = process.env.COZE_WINIT_LANGUAGE ?? "";
  return { apiToken, workflowId, customerCode, customerName, username, language };
}

const DEFAULT_WINIT_LANGUAGE = "zh_CN";

async function invokeWinitOpenapiViaCoze(
  env: CozeWinitLocalEnv,
  input: { action: string; data: Record<string, unknown>; language?: string | null }
): Promise<unknown> {
  const language =
    input.language !== undefined && input.language !== null && String(input.language).trim() !== ""
      ? String(input.language).trim()
      : env.language.trim() !== ""
        ? env.language.trim()
        : DEFAULT_WINIT_LANGUAGE;
  return runCozeWinitWorkflow({
    apiToken: env.apiToken,
    workflowId: env.workflowId,
    parameters: {
      action: input.action,
      customerCode: env.customerCode,
      customerName: env.customerName,
      username: env.username,
      language,
      data: JSON.stringify(input.data),
    },
  });
}

// ========== 直连万邑通预留配置（本文件内闭环） ==========
const WINIT_DIRECT = {
  baseUrl: (typeof process !== "undefined" && process.env?.WINIT_API_BASE_URL) || "https://openapi.winit.com.cn/openapi/service",
  token: (typeof process !== "undefined" && process.env?.WINIT_API_TOKEN) || "",
};

function defaultListDateRangeForFetch(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function getListDateRange(): { start: string; end: string } {
  if (typeof process !== "undefined" && process.env) {
    const s = process.env.COZE_WINIT_LIST_DATE_START;
    const e = process.env.COZE_WINIT_LIST_DATE_END;
    if (s && e) return { start: s, end: e };
  }
  return defaultListDateRangeForFetch();
}

function getMultiFetchStrategy(): "detail" | "list" {
  const raw = (typeof process !== "undefined" && process.env?.COZE_WINIT_MULTI_FETCH_STRATEGY?.trim().toLowerCase()) || "detail";
  return raw === "list" ? "list" : "detail";
}

function getOpenapiConcurrency(): number {
  const n = Number(typeof process !== "undefined" ? process.env?.COZE_WINIT_OPENAPI_CONCURRENCY : undefined);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 4;
}

/** WO + 数字；末尾连续字母为子单/子包裹后缀，万邑通 OpenAPI 仅需主单号 */
function normalizeWoMainOrderNumForOpenapi(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const m = /^WO(\d+)[A-Za-z]*$/i.exec(s);
  if (m) return `WO${m[1]}`;
  return s;
}

/** 去重并保持顺序 */
function normalizeOutboundOrderNosList(nos: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of nos) {
    const c = normalizeWoMainOrderNumForOpenapi(n);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/**
 * queryOutboundOrder 的 data 体（官方仅一项必填）
 * @see https://developer.winit.com.cn/document/detail/id/55.html — outboundOrderNum String 必填
 */
function buildQueryOutboundOrderData(outboundOrderNum: string): { outboundOrderNum: string } {
  const num = normalizeWoMainOrderNumForOpenapi(outboundOrderNum);
  if (!num) {
    throw new Error("queryOutboundOrder: outboundOrderNum 不能为空");
  }
  return { outboundOrderNum: num };
}

/**
 * queryOutboundOrderList 的 data 体（与请求示例字段类型一致）
 * @see https://developer.winit.com.cn/document/detail/id/54.html
 */
function buildQueryOutboundOrderListData(args: {
  dateOrderedStartDate: string;
  dateOrderedEndDate: string;
  pageSize: number;
  pageNum: number;
  outboundOrderNum?: string;
  warehouseId?: string;
  sellerOrderNo?: string;
  trackingNo?: string;
  status?: string;
}): Record<string, string> {
  const data: Record<string, string> = {
    dateOrderedStartDate: args.dateOrderedStartDate,
    dateOrderedEndDate: args.dateOrderedEndDate,
    pageSize: String(args.pageSize),
    pageNum: String(args.pageNum),
  };
  const opt = (v: string | undefined) => v?.trim();
  const on = opt(args.outboundOrderNum);
  if (on) {
    const parts = on
      .split(",")
      .map((p) => normalizeWoMainOrderNumForOpenapi(p))
      .filter(Boolean);
    if (parts.length) data.outboundOrderNum = [...new Set(parts)].join(",");
  }
  const wid = opt(args.warehouseId);
  if (wid) data.warehouseId = wid;
  const son = opt(args.sellerOrderNo);
  if (son) data.sellerOrderNo = son;
  const tn = opt(args.trackingNo);
  if (tn) data.trackingNo = tn;
  const st = opt(args.status);
  if (st) data.status = st;
  return data;
}

/** @see id/145 */
function buildQueryOutboundOrderFeeData(businessDocumentNo: string): Record<string, unknown> {
  return {
    businessDocumentNo: normalizeWoMainOrderNumForOpenapi(businessDocumentNo),
    sellerNo: "",
    trackingNo: "",
    destinationWarehouse: "",
    orderDateFrom: "",
    orderDateTo: "",
    pageParams: {
      pageSize: "200",
      pageNo: "1",
    },
  };
}

/**
 * 将工作流 / 万邑通返回 JSON 规范为 RawOrderData（兼容 envelope 与多种 list 形态）
 */
function coerceToRawOrderData(parsed: unknown): RawOrderData {
  if (parsed == null) {
    return { list: [] };
  }
  if (typeof parsed !== "object") {
    return { list: [] };
  }
  const o = parsed as Record<string, unknown>;

  if (o.output != null && typeof o.output === "object") {
    return coerceToRawOrderData(o.output);
  }

  if (o.code === "0" || o.code === 0) {
    const inner = o.data;
    if (inner != null && typeof inner === "string") {
      try {
        return coerceToRawOrderData(JSON.parse(inner) as unknown);
      } catch {
        return { list: [] };
      }
    }
    if (inner != null && typeof inner === "object") {
      return coerceToRawOrderData(inner);
    }
    return { list: [] };
  }

  if (Array.isArray(o.list)) {
    const out: RawOrderData = {
      list: o.list as Array<Record<string, unknown>>,
      currentPageSize: o.currentPageSize as number | undefined,
      total: o.total as number | undefined,
      currentPageNum: o.currentPageNum as number | undefined,
    };
    if (o._fetchMeta != null && typeof o._fetchMeta === "object") {
      out._fetchMeta = o._fetchMeta as Record<string, unknown>;
    }
    return out;
  }

  if (o.outboundOrderNum != null || o.outboundOrderNo != null) {
    return { list: [o as Record<string, unknown>] };
  }

  return { list: [] };
}

/** id/54 列表项用 documentNo，与 id/55 的 outboundOrderNum 对齐，便于下游 LLM */
function normalizeOrderAliases(order: Record<string, unknown>): Record<string, unknown> {
  const doc = order.documentNo;
  const hasOut =
    order.outboundOrderNum != null && String(order.outboundOrderNum).trim() !== "";
  if (!hasOut && doc != null && String(doc).trim() !== "") {
    return { ...order, outboundOrderNum: String(doc).trim() };
  }
  return order;
}

function normalizeRawOrderDataAliases(data: RawOrderData): RawOrderData {
  if (!data.list?.length) return data;
  return { ...data, list: data.list.map(normalizeOrderAliases) };
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]!, idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchMultiViaDetail(
  coze: CozeWinitLocalEnv,
  outboundOrderNos: string[]
): Promise<RawOrderData> {
  const concurrency = getOpenapiConcurrency();
  const chunks = await mapPool(outboundOrderNos, concurrency, async (num) => {
    const parsed = await invokeWinitOpenapiViaCoze(coze, {
      action: "queryOutboundOrder",
      data: buildQueryOutboundOrderData(num),
    });
    return normalizeRawOrderDataAliases(coerceToRawOrderData(parsed));
  });

  const list: Record<string, unknown>[] = [];
  for (let i = 0; i < outboundOrderNos.length; i++) {
    const row = chunks[i]?.list?.[0];
    if (row) list.push(row);
  }

  return {
    list,
    total: list.length,
    currentPageNum: 1,
    currentPageSize: list.length,
    _fetchMeta: {
      strategy: "detail",
      requestedCount: outboundOrderNos.length,
      resolvedCount: list.length,
    },
  };
}

async function fetchMultiViaListPaged(
  coze: CozeWinitLocalEnv,
  outboundOrderNos: string[],
  opts?: {
    startPage?: number;
    initialMerged?: Map<string, Record<string, unknown>>;
    seedTotal?: number;
  }
): Promise<RawOrderData> {
  const requested = new Set(outboundOrderNos.map((s) => normalizeWoMainOrderNumForOpenapi(s)).filter(Boolean));
  const range = getListDateRange();
  const pageSize = Number(process.env?.COZE_WINIT_LIST_PAGE_SIZE ?? "50") || 50;
  const maxPages = Number(process.env?.COZE_WINIT_LIST_MAX_PAGES ?? "200") || 200;
  const listStatus = process.env?.COZE_WINIT_LIST_STATUS?.trim() || undefined;
  const warehouseId = process.env?.COZE_WINIT_LIST_WAREHOUSE_ID?.trim() || undefined;

  const merged = opts?.initialMerged ?? new Map<string, Record<string, unknown>>();
  let lastTotal = opts?.seedTotal ?? 0;
  const startPage = opts?.startPage ?? 1;

  for (let pageNum = startPage; pageNum <= maxPages; pageNum++) {
    const dataObj = buildQueryOutboundOrderListData({
      dateOrderedStartDate: range.start,
      dateOrderedEndDate: range.end,
      pageSize,
      pageNum,
      outboundOrderNum: [...requested].join(","),
      warehouseId,
      status: listStatus,
    });
    const parsed = await invokeWinitOpenapiViaCoze(coze, {
      action: "queryOutboundOrderList",
      data: { ...dataObj },
    });
    const chunk = normalizeRawOrderDataAliases(coerceToRawOrderData(parsed));
    lastTotal = Number(chunk.total ?? 0);
    const rows = chunk.list ?? [];
    for (const row of rows) {
      const key = normalizeWoMainOrderNumForOpenapi(
        String(row.outboundOrderNum ?? row.documentNo ?? "").trim()
      );
      if (key && requested.has(key)) {
        merged.set(key, row);
      }
    }
    if (merged.size >= requested.size) break;
    if (rows.length === 0) break;
    if (lastTotal > 0 && pageNum * pageSize >= lastTotal) break;
  }

  const list = outboundOrderNos
    .map((n) => merged.get(normalizeWoMainOrderNumForOpenapi(n)))
    .filter(Boolean) as Record<string, unknown>[];

  return {
    list,
    total: list.length,
    currentPageNum: 1,
    currentPageSize: list.length,
    _fetchMeta: {
      strategy: "list",
      requestedCount: requested.size,
      resolvedCount: list.length,
      listTotalFromApi: lastTotal,
    },
  };
}

function orderKeyFromRow(row: Record<string, unknown>): string {
  return normalizeWoMainOrderNumForOpenapi(
    String(row.outboundOrderNum ?? row.documentNo ?? "").trim()
  );
}

function collectTrackingNosFromOrders(list: Record<string, unknown>[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  for (const o of list) {
    const tn = o.trackingNum ?? o.winitTrackingNo;
    if (typeof tn === "string") push(tn);
    if (out.length >= max) return out;

    const pkgs = (o.packageList as unknown[]) ?? [];
    for (const p of pkgs) {
      const tnos = (p as Record<string, unknown>).trackingNos as unknown;
      if (Array.isArray(tnos)) {
        for (const t of tnos) {
          push(String(t));
          if (out.length >= max) return out;
        }
      }
    }
  }
  return out;
}

async function enrichOptionalApis(
  coze: CozeWinitLocalEnv | null,
  base: RawOrderData,
  opts: { includeFeeBreakdown: boolean; includeTrackingSummary: boolean }
): Promise<RawOrderData> {
  const list = base.list ?? [];
  if (list.length === 0) return base;
  if (!coze) return base;

  const enrichment: NonNullable<RawOrderData["_enrichment"]> = { ...(base._enrichment ?? {}) };

  if (opts.includeFeeBreakdown) {
    const keys = [...new Set(list.map(orderKeyFromRow).filter(Boolean))];
    const concurrency = getOpenapiConcurrency();
    const feesByOrder: Record<string, unknown> = {};
    await mapPool(keys, concurrency, async (wo) => {
      try {
        const parsed = await invokeWinitOpenapiViaCoze(coze, {
          action: "sms.incomeSettlement.queryOutboundOrderFee",
          data: buildQueryOutboundOrderFeeData(wo),
        });
        feesByOrder[wo] = parsed;
      } catch (e) {
        feesByOrder[wo] = {
          _error: e instanceof Error ? e.message : String(e),
        };
      }
    });
    enrichment.feesByOrder = feesByOrder;
  }

  if (opts.includeTrackingSummary) {
    const nos = collectTrackingNosFromOrders(list, 30);
    if (nos.length > 0) {
      try {
        const lang =
          coze.language.trim() !== "" ? coze.language.trim() : DEFAULT_WINIT_LANGUAGE;
        const parsed = await invokeWinitOpenapiViaCoze(coze, {
          action: "tracking.getOrderVerdorTracking",
          data: { trackingnos: nos.join(","), language: lang },
        });
        enrichment.tracking = parsed;
      } catch (e) {
        enrichment.tracking = { _error: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  const hasEnrichment = enrichment.feesByOrder != null || enrichment.tracking != null;
  if (!hasEnrichment) return base;

  return { ...base, _enrichment: enrichment };
}

async function fetchOutboundOrdersViaCoze(
  coze: CozeWinitLocalEnv,
  outboundOrderNos: string[],
  routeType: "single" | "batch",
  opts: { includeFeeBreakdown: boolean; includeTrackingSummary: boolean }
): Promise<RawOrderData> {
  let base: RawOrderData;

  if (routeType === "single") {
    const dataObj = buildQueryOutboundOrderData(outboundOrderNos[0] ?? "");
    const parsed = await invokeWinitOpenapiViaCoze(coze, {
      action: "queryOutboundOrder",
      data: dataObj,
    });
    base = normalizeRawOrderDataAliases(coerceToRawOrderData(parsed));
  } else if (getMultiFetchStrategy() === "list") {
    base = await fetchMultiViaListPaged(coze, outboundOrderNos);
  } else {
    base = await fetchMultiViaDetail(coze, outboundOrderNos);
  }

  return enrichOptionalApis(coze, base, opts);
}

function isWinitPluginPrimaryPayload(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

// ========== 主逻辑 ==========
async function fetchOutboundOrders(
  outboundOrderNos: string[],
  routeType: "single" | "batch",
  opts: { includeFeeBreakdown: boolean; includeTrackingSummary: boolean },
  primaryFromPlugin?: unknown
): Promise<RawOrderData> {
  const unique = normalizeOutboundOrderNosList(outboundOrderNos.filter(Boolean) as string[]);
  if (unique.length === 0) {
    return { list: [] };
  }

  if (
    routeType === "single" &&
    unique.length >= 1 &&
    isWinitPluginPrimaryPayload(primaryFromPlugin)
  ) {
    const raw =
      typeof primaryFromPlugin === "string"
        ? parseCozeWorkflowDataField(primaryFromPlugin)
        : primaryFromPlugin;
    const base = normalizeRawOrderDataAliases(coerceToRawOrderData(raw));
    const coze = getCozeWinitEnv();
    try {
      return await enrichOptionalApis(coze, base, opts);
    } catch (err) {
      console.error(
        "[fetch-outbound-order] 可选增强（费用/轨迹）失败:",
        err instanceof Error ? err.message : err
      );
      throw err;
    }
  }

  // batch 且含插件数据：去重后可能只剩 1 个单号（如上游重复传入同一 WO），须与 routeType 一致处理
  if (
    routeType === "batch" &&
    unique.length >= 1 &&
    isWinitPluginPrimaryPayload(primaryFromPlugin)
  ) {
    const raw =
      typeof primaryFromPlugin === "string"
        ? parseCozeWorkflowDataField(primaryFromPlugin)
        : primaryFromPlugin;
    const firstChunk = normalizeRawOrderDataAliases(coerceToRawOrderData(raw));
    const meta = firstChunk._fetchMeta as Record<string, unknown> | undefined;
    const fromBatchMerge = meta?.batchPluginMerged === true;

    const requestedKeys = new Set(unique.map((n) => normalizeWoMainOrderNumForOpenapi(n)));
    const merged = new Map<string, Record<string, unknown>>();
    for (const row of firstChunk.list ?? []) {
      const key = orderKeyFromRow(row);
      if (key && requestedKeys.has(key)) merged.set(key, row);
    }
    const cozeBatch = getCozeWinitEnv();

    let base: RawOrderData;

    if (fromBatchMerge) {
      if (merged.size >= requestedKeys.size) {
        const list = unique
          .map((n) => merged.get(normalizeWoMainOrderNumForOpenapi(n)))
          .filter(Boolean) as Record<string, unknown>[];
        base = {
          list,
          total: list.length,
          currentPageNum: 1,
          currentPageSize: list.length,
          _fetchMeta: {
            strategy: "detail",
            requestedCount: unique.length,
            resolvedCount: list.length,
            primaryViaPlugin: true,
            batchPluginMerged: true,
          },
        };
      } else if (cozeBatch) {
        const missing = unique.filter((n) => !merged.has(normalizeWoMainOrderNumForOpenapi(n)));
        const extra = await fetchMultiViaDetail(cozeBatch, missing);
        const exList = extra.list ?? [];
        for (let i = 0; i < missing.length; i++) {
          const k = normalizeWoMainOrderNumForOpenapi(missing[i]!);
          const row = exList[i];
          if (row && !merged.has(k)) merged.set(k, row);
        }
        const list = unique
          .map((n) => merged.get(normalizeWoMainOrderNumForOpenapi(n)))
          .filter(Boolean) as Record<string, unknown>[];
        base = {
          list,
          total: list.length,
          currentPageNum: 1,
          currentPageSize: list.length,
          _fetchMeta: {
            strategy: "detail",
            requestedCount: unique.length,
            resolvedCount: list.length,
            primaryViaPlugin: true,
            batchPluginMerged: true,
            supplementedDetailViaWorkflow: true,
          },
        };
      } else {
        const list = unique
          .map((n) => merged.get(normalizeWoMainOrderNumForOpenapi(n)))
          .filter(Boolean) as Record<string, unknown>[];
        base = {
          list,
          total: list.length,
          currentPageNum: 1,
          currentPageSize: list.length,
          _fetchMeta: {
            strategy: "detail",
            requestedCount: unique.length,
            resolvedCount: list.length,
            primaryViaPlugin: true,
            batchPluginMerged: true,
            partialNoCozeEnv: true,
          },
        };
      }
    } else {
      const pluginTotal = Number(firstChunk.total ?? 0);

      if (merged.size >= requestedKeys.size) {
        const list = unique
          .map((n) => merged.get(normalizeWoMainOrderNumForOpenapi(n)))
          .filter(Boolean) as Record<string, unknown>[];
        base = {
          list,
          total: list.length,
          currentPageNum: 1,
          currentPageSize: list.length,
          _fetchMeta: {
            strategy: "list",
            requestedCount: unique.length,
            resolvedCount: list.length,
            listTotalFromApi: pluginTotal,
            primaryViaPlugin: true,
          },
        };
      } else if (cozeBatch) {
        if (getMultiFetchStrategy() === "list") {
          base = await fetchMultiViaListPaged(cozeBatch, unique, {
            startPage: 2,
            initialMerged: merged,
            seedTotal: pluginTotal,
          });
          base = {
            ...base,
            _fetchMeta: { ...(base._fetchMeta ?? {}), primaryViaPlugin: true },
          };
        } else {
          const missing = unique.filter((n) => !merged.has(normalizeWoMainOrderNumForOpenapi(n)));
          const extra = await fetchMultiViaDetail(cozeBatch, missing);
          const exList = extra.list ?? [];
          for (let i = 0; i < missing.length; i++) {
            const k = normalizeWoMainOrderNumForOpenapi(missing[i]!);
            const row = exList[i];
            if (row && !merged.has(k)) merged.set(k, row);
          }
          const list = unique
            .map((n) => merged.get(normalizeWoMainOrderNumForOpenapi(n)))
            .filter(Boolean) as Record<string, unknown>[];
          base = {
            list,
            total: list.length,
            currentPageNum: 1,
            currentPageSize: list.length,
            _fetchMeta: {
              strategy: "detail",
              requestedCount: unique.length,
              resolvedCount: list.length,
              primaryViaPlugin: true,
              supplementedDetailViaWorkflow: true,
            },
          };
        }
      } else {
        const list = unique
          .map((n) => merged.get(normalizeWoMainOrderNumForOpenapi(n)))
          .filter(Boolean) as Record<string, unknown>[];
        base = {
          list,
          total: list.length,
          currentPageNum: 1,
          currentPageSize: list.length,
          _fetchMeta: {
            strategy: "list",
            requestedCount: unique.length,
            resolvedCount: list.length,
            listTotalFromApi: pluginTotal,
            primaryViaPlugin: true,
            partialNoCozeEnv: true,
          },
        };
      }
    }

    try {
      return await enrichOptionalApis(cozeBatch, base, opts);
    } catch (err) {
      console.error(
        "[fetch-outbound-order] batch 插件路径（可选增强）失败:",
        err instanceof Error ? err.message : err
      );
      throw err;
    }
  }

  const coze = getCozeWinitEnv();
  if (coze) {
    try {
      return await fetchOutboundOrdersViaCoze(coze, unique, routeType, opts);
    } catch (err) {
      console.error(
        "[fetch-outbound-order] Coze Workflow 调用失败:",
        err instanceof Error ? err.message : err
      );
      throw err;
    }
  }

  if (WINIT_DIRECT.token) {
    console.warn("[fetch-outbound-order] 已配置 WINIT_API_TOKEN 但未实现直连，仍返回空列表");
  }

  console.warn(
    "[fetch-outbound-order] 占位：请配置 COZE_API_TOKEN + COZE_WINIT_WORKFLOW_ID + COZE_WINIT_* 客户信息以走 Coze 代理。outboundOrderNos:",
    unique,
    "routeType:",
    routeType
  );
  return { list: [] };
}

function boolParam(v: unknown, defaultVal: boolean): boolean {
  if (v === undefined || v === null) return defaultVal;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return defaultVal;
}

/** Coze 入口 */
async function main({ params }: { params: Record<string, unknown> }) {
  const outboundOrderNos = (params.outboundOrderNos as string[]) ?? [];
  const routeType = (params.routeType as "single" | "batch") ?? "batch";
  const includeFeeBreakdown = boolParam(params.includeFeeBreakdown, false);
  const includeTrackingSummary = boolParam(params.includeTrackingSummary, false);
  const primaryFromPlugin = params.winitOpenapiData;
  const rawOrderData = await fetchOutboundOrders(
    outboundOrderNos,
    routeType,
    {
      includeFeeBreakdown,
      includeTrackingSummary,
    },
    primaryFromPlugin
  );
  const ret = { "rawOrderData": rawOrderData };
  return ret;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-outbound-order")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
