/**
 * 节点：消费万邑通 TailTrace.getList 插件响应或 Coze workflow/run 代理，产出 **tailTraceFacts**。
 * FaaS 单文件闭环。逻辑对齐 docs/experts/last-mile/tracking-inquiry.md「五·补充」。
 */

const SUBMISSION_GUIDANCE_URL = "https://seller.winit.com.cn/Tracking/create";
const TAIL_GATEWAY_ACTION = "tail.claim.ai.v1.gateway";

type OpenapiProxyWorkflowParameters = {
  action: string;
  customerCode: string;
  customerName: string;
  username: string;
  data: string;
};

interface TailTraceRecord {
  serialNumber?: string;
  orderNo?: string;
  trackingNo?: string;
  shippingNo?: string;
  checkingStatus?: string;
  checkingType?: string;
  applicationTime?: number | string;
  acceptTime?: number | string;
  endTime?: number | string;
  checkingResults?: number | string;
  feedbackMsg?: string;
  returnReasons?: string;
}

interface TailTraceFacts {
  submissionGuidanceUrl: string;
  listStatus:
    | "success"
    | "empty"
    | "failed"
    | "skipped_no_query"
    | "skipped_no_env"
    | "skipped_invalid_response";
  queryKeys?: { inquiryIds: string[]; trackingIds: string[]; outboundOrderNos: string[] };
  querySent?: Record<string, unknown>;
  records: TailTraceRecord[];
  primarySerialNumber?: string;
  primaryCheckingStatus?: string;
  primaryCheckingType?: string;
  sopBranch?: string;
  elapsedBizDays?: number | null;
  applicationTimeLocal?: string;
  analysisTimeLocal?: string;
  calendarSource?: "weekday_only";
  slaBand?: "within_1_day" | "within_3_days" | "within_10_days" | "over_10_days" | "unknown";
  canEscalateUrgent?: boolean | null;
  rawTopKeys?: string[];
  apiCode?: unknown;
  apiMsg?: string;
  notes: string[];
}

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

async function runCozeOpenapiProxyWorkflow(options: {
  apiToken: string;
  workflowId: string;
  baseUrl?: string;
  parameters: OpenapiProxyWorkflowParameters;
}): Promise<unknown> {
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

function getCozeOpenapiProxyEnv(): {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  baseUrl?: string;
} | null {
  if (typeof process === "undefined" || !process.env) return null;
  const apiToken = process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "";
  const workflowId = process.env.COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID ?? "";
  const customerCode = process.env.COZE_WINIT_CUSTOMER_CODE ?? "";
  const customerName = process.env.COZE_WINIT_CUSTOMER_NAME ?? "";
  const username = process.env.COZE_WINIT_USERNAME ?? "";
  if (!apiToken || !workflowId || !customerCode || !customerName || !username) return null;
  return {
    apiToken,
    workflowId,
    customerCode,
    customerName,
    username,
    baseUrl: process.env.COZE_API_BASE_URL,
  };
}

function asRecord(x: unknown): Record<string, unknown> | null {
  if (x !== null && typeof x === "object" && !Array.isArray(x)) return x as Record<string, unknown>;
  return null;
}

function isExplicitEmptyList(inner: unknown): boolean {
  const r = asRecord(inner);
  if (!r) return false;
  for (const k of ["list", "records", "rows", "items", "dataList", "content"]) {
    const v = r[k];
    if (Array.isArray(v) && v.length === 0) return true;
  }
  const data = r.data;
  const dr = asRecord(data);
  if (dr) {
    for (const k of ["list", "records", "rows", "items", "content"]) {
      const v = dr[k];
      if (Array.isArray(v) && v.length === 0) return true;
    }
  }
  return false;
}

function extractListArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];

  const directKeys = ["list", "records", "rows", "items", "content", "dataList"];
  for (const k of directKeys) {
    const v = root[k];
    if (Array.isArray(v)) return v;
  }

  const data = root.data;
  const dr = asRecord(data);
  if (dr) {
    for (const k of directKeys) {
      const v = dr[k];
      if (Array.isArray(v)) return v;
    }
  }

  for (const v of Object.values(root)) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null && !Array.isArray(v[0])) {
      return v;
    }
  }
  return [];
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  }
  return undefined;
}

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function parseBusinessTime(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw >= 1_000_000_000_000 ? raw : raw >= 1_000_000_000 ? raw * 1000 : null;
  }
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return parseBusinessTime(Number(text));

  const localMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (localMatch) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = localMatch;
    return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) - 8, Number(mm), Number(ss));
  }

  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function shanghaiDateParts(epochMs: number): { year: number; month: number; day: number } {
  const shifted = new Date(epochMs + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function formatShanghaiTime(epochMs: number): string {
  const shifted = new Date(epochMs + SHANGHAI_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(
    shifted.getUTCHours()
  )}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
}

function resolveAnalysisTime(params: Record<string, unknown>): number {
  const clock = asRecord(params.analysisClock);
  return parseBusinessTime(clock?.utcIso) ?? Date.now();
}

/** 申请日不计，分析日计入；周一至周五视为工作日，暂不扣除法定节假日。 */
function countWeekdaysExclusiveStart(startMs: number, endMs: number): number | null {
  const start = shanghaiDateParts(startMs);
  const end = shanghaiDateParts(endMs);
  let cursor = Date.UTC(start.year, start.month - 1, start.day);
  const endDate = Date.UTC(end.year, end.month - 1, end.day);
  if (endDate < cursor) return null;

  let count = 0;
  for (cursor += 24 * 60 * 60 * 1000; cursor <= endDate; cursor += 24 * 60 * 60 * 1000) {
    const weekday = new Date(cursor).getUTCDay();
    if (weekday >= 1 && weekday <= 5) count += 1;
  }
  return count;
}

function deriveSlaBand(elapsedBizDays: number | null): TailTraceFacts["slaBand"] {
  if (elapsedBizDays === null) return "unknown";
  if (elapsedBizDays <= 1) return "within_1_day";
  if (elapsedBizDays <= 3) return "within_3_days";
  if (elapsedBizDays <= 10) return "within_10_days";
  return "over_10_days";
}

function normalizeRecord(row: unknown): TailTraceRecord | null {
  const o = asRecord(row);
  if (!o) return null;
  const applicationTime = pickNum(o, ["applicationTime", "gmtCreate", "createTime"]);
  const acceptTime = pickNum(o, ["acceptTime", "gmtAccept"]);
  const endTime = pickNum(o, ["endTime"]);
  const checkingResults = o.checkingResults;
  return {
    serialNumber: pickStr(o, ["serialNumber", "traceSerialNumber"]),
    orderNo: pickStr(o, ["orderNo", "businessNo", "outboundOrderNo"]),
    trackingNo: pickStr(o, ["trackingNo", "trackingNumber", "expressNo"]),
    shippingNo: pickStr(o, ["shippingNo"]),
    checkingStatus: pickStr(o, ["checkingStatus", "status"]),
    checkingType: pickStr(o, ["checkingType"]),
    applicationTime: applicationTime ?? pickStr(o, ["applicationTime"]),
    acceptTime: acceptTime ?? pickStr(o, ["acceptTime"]),
    endTime: endTime ?? pickStr(o, ["endTime"]),
    checkingResults:
      typeof checkingResults === "number" || typeof checkingResults === "string" ? checkingResults : undefined,
    feedbackMsg: pickStr(o, ["feedbackMsg"]),
    returnReasons: pickStr(o, ["returnReasons"]),
  };
}

function unwrapBusinessEnvelope(raw: unknown): { inner: unknown; apiCode?: unknown; apiMsg?: string } {
  const root = asRecord(raw);
  if (!root) return { inner: raw };

  const code = root.code ?? root.status;
  const msg = pickStr(root, ["msg", "message", "info", "errorMsg"]);

  const data = root.data;
  if (data !== undefined) {
    const parsed = parseCozeWorkflowDataField(data);
    return { inner: parsed, apiCode: code, apiMsg: msg || undefined };
  }

  return { inner: raw, apiCode: code, apiMsg: msg || undefined };
}

function timeRank(r: TailTraceRecord): number {
  const a = r.applicationTime;
  if (typeof a === "number") return a;
  const n = Number(a);
  return Number.isFinite(n) ? n : 0;
}

function pickPrimary(records: TailTraceRecord[]): TailTraceRecord | null {
  if (!records.length) return null;
  return [...records].sort((x, y) => timeRank(y) - timeRank(x))[0] ?? null;
}

function hasAcceptTime(r: TailTraceRecord): boolean {
  const a = r.acceptTime;
  if (a === undefined || a === null) return false;
  if (typeof a === "number") return !Number.isNaN(a) && a !== 0;
  return String(a).trim() !== "";
}

/** 对齐 docs/experts/last-mile/tracking-inquiry.md「五·补充」 */
function deriveSopBranch(primary: TailTraceRecord | null, listStatus: TailTraceFacts["listStatus"]): string {
  if (listStatus !== "success" || !primary) {
    if (listStatus === "empty") return "case1_no_record";
    if (listStatus === "skipped_no_query") return "guidance_only";
    if (listStatus === "skipped_no_env") return "skipped_env";
    if (listStatus === "failed") return "fetch_failed";
    if (listStatus === "skipped_invalid_response") return "parse_failed";
    return "unknown";
  }

  const st = (primary.checkingStatus ?? "").trim().toUpperCase();
  if (st === "SU") {
    return hasAcceptTime(primary) ? "case3_supplier" : "case2_pending_accept";
  }
  if (st === "NSC") return "supplement_nsc";
  if (st === "SSC") return "case3_supplier";
  if (st === "WCR") return "supplement_wcr";
  if (st === "CP") return "case4_done";
  if (st === "RT") return "supplement_rt";
  if (st === "CC") return "supplement_cc";
  return "unknown";
}

async function main({ params }: { params: Record<string, unknown> }): Promise<{ tailTraceFacts: TailTraceFacts }> {
  const branch = String(params.branch ?? "").trim();
  const inquiryIds = Array.isArray(params.inquiryIds)
    ? (params.inquiryIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const notes: string[] = [];

  const emptyFacts = (status: TailTraceFacts["listStatus"], extra?: Partial<TailTraceFacts>): TailTraceFacts => ({
    submissionGuidanceUrl: SUBMISSION_GUIDANCE_URL,
    listStatus: status,
    queryKeys: extra?.queryKeys,
    querySent: extra?.querySent,
    records: [],
    primaryCheckingStatus: extra?.primaryCheckingStatus,
    primaryCheckingType: extra?.primaryCheckingType,
    sopBranch: extra?.sopBranch ?? deriveSopBranch(null, status),
    elapsedBizDays: null,
    rawTopKeys: extra?.rawTopKeys,
    apiCode: extra?.apiCode,
    apiMsg: extra?.apiMsg,
    notes,
  });

  if (branch !== "query") {
    notes.push("非 query 分支，跳过 TailTrace.getList");
    return {
      tailTraceFacts: emptyFacts("skipped_no_query", {
        sopBranch: "guidance_only",
        queryKeys: { inquiryIds, trackingIds, outboundOrderNos },
      }),
    };
  }

  const queryKeysSnap = { inquiryIds, trackingIds, outboundOrderNos };

  const winitRequestData = typeof params.winitRequestData === "string" ? params.winitRequestData.trim() : "";
  let querySent: Record<string, unknown> | undefined;
  try {
    querySent = winitRequestData ? (JSON.parse(winitRequestData) as Record<string, unknown>) : undefined;
  } catch {
    querySent = undefined;
  }

  if (!winitRequestData) {
    notes.push("winitRequestData 为空，跳过 OpenAPI");
    return {
      tailTraceFacts: emptyFacts("skipped_no_query", {
        querySent,
        queryKeys: queryKeysSnap,
        sopBranch: "guidance_only",
      }),
    };
  }

  const env = getCozeOpenapiProxyEnv();
  const customerCode = String(params.customerCode ?? "").trim();
  const customerName = String(params.customerName ?? "").trim();
  const username = String(params.username ?? "").trim();

  const proxyCustomer = env
    ? { customerCode: env.customerCode, customerName: env.customerName, username: env.username }
    : { customerCode, customerName, username };

  const plug = params.winitOpenapiData;
  const hasPlug = plug != null && String(plug).trim() !== "";

  let raw: unknown;
  try {
    if (hasPlug) {
      raw = parseCozeWorkflowDataField(plug);
    } else if (env) {
      raw = await runCozeOpenapiProxyWorkflow({
        apiToken: env.apiToken,
        workflowId: env.workflowId,
        baseUrl: env.baseUrl,
        parameters: {
          action: TAIL_GATEWAY_ACTION,
          customerCode: proxyCustomer.customerCode,
          customerName: proxyCustomer.customerName,
          username: proxyCustomer.username,
          data: winitRequestData,
        },
      });
    } else {
      notes.push("无插件响应且无 Coze 代理环境变量，跳过 OpenAPI");
      return {
        tailTraceFacts: emptyFacts("skipped_no_env", { querySent, queryKeys: queryKeysSnap }),
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    notes.push(`OpenAPI 调用异常：${msg}`);
    return {
      tailTraceFacts: {
        submissionGuidanceUrl: SUBMISSION_GUIDANCE_URL,
        listStatus: "failed",
        queryKeys: queryKeysSnap,
        querySent,
        records: [],
        sopBranch: "fetch_failed",
        elapsedBizDays: null,
        notes,
        apiMsg: msg,
      },
    };
  }

  const unwrapped = unwrapBusinessEnvelope(raw);
  const inner = unwrapped.inner;
  const rows = extractListArray(inner);
  const top = asRecord(inner) ?? asRecord(raw);

  if (!rows.length) {
    if (isExplicitEmptyList(inner)) {
      notes.push("接口返回列表为空");
      return {
        tailTraceFacts: {
          submissionGuidanceUrl: SUBMISSION_GUIDANCE_URL,
          listStatus: "empty",
          queryKeys: queryKeysSnap,
          querySent,
          records: [],
          sopBranch: "case1_no_record",
          elapsedBizDays: null,
          apiCode: unwrapped.apiCode,
          apiMsg: unwrapped.apiMsg,
          notes,
        },
      };
    }
    notes.push("响应中未解析到列表数组");
    return {
      tailTraceFacts: {
        submissionGuidanceUrl: SUBMISSION_GUIDANCE_URL,
        listStatus: "skipped_invalid_response",
        queryKeys: queryKeysSnap,
        querySent,
        records: [],
        sopBranch: "parse_failed",
        elapsedBizDays: null,
        rawTopKeys: top ? Object.keys(top).slice(0, 40) : [],
        apiCode: unwrapped.apiCode,
        apiMsg: unwrapped.apiMsg,
        notes,
      },
    };
  }

  const records: TailTraceRecord[] = [];
  for (const row of rows) {
    const n = normalizeRecord(row);
    if (n) records.push(n);
  }

  if (!records.length) {
    notes.push("列表存在但行对象无法归一化");
    return {
      tailTraceFacts: {
        submissionGuidanceUrl: SUBMISSION_GUIDANCE_URL,
        listStatus: "skipped_invalid_response",
        queryKeys: queryKeysSnap,
        querySent,
        records: [],
        sopBranch: "parse_failed",
        elapsedBizDays: null,
        rawTopKeys: top ? Object.keys(top).slice(0, 40) : [],
        notes,
      },
    };
  }

  const primary = pickPrimary(records);
  const sopBranch = deriveSopBranch(primary, "success");
  const applicationTimeMs = parseBusinessTime(primary?.applicationTime);
  const analysisTimeMs = resolveAnalysisTime(params);
  const elapsedBizDays = applicationTimeMs === null ? null : countWeekdaysExclusiveStart(applicationTimeMs, analysisTimeMs);

  if (applicationTimeMs === null) notes.push("缺少可解析的申请时间，未计算工作日");
  notes.push("工作日按 Asia/Shanghai 周一至周五计算，申请日不计；暂未接入法定节假日日历");

  return {
    tailTraceFacts: {
      submissionGuidanceUrl: SUBMISSION_GUIDANCE_URL,
      listStatus: "success",
      queryKeys: queryKeysSnap,
      querySent,
      records,
      primarySerialNumber: primary?.serialNumber,
      primaryCheckingStatus: primary?.checkingStatus,
      primaryCheckingType: primary?.checkingType,
      sopBranch,
      elapsedBizDays,
      applicationTimeLocal: applicationTimeMs === null ? undefined : formatShanghaiTime(applicationTimeMs),
      analysisTimeLocal: formatShanghaiTime(analysisTimeMs),
      calendarSource: "weekday_only",
      slaBand: deriveSlaBand(elapsedBizDays),
      canEscalateUrgent: elapsedBizDays === null ? null : elapsedBizDays > 3,
      apiCode: unwrapped.apiCode,
      apiMsg: unwrapped.apiMsg,
      notes,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-tail-trace-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
