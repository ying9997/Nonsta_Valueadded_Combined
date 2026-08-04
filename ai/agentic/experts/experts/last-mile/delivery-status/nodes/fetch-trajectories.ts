/**
 * 节点：万邑通 OpenAPI id/56 `tracking.getOrderVerdorTracking` 主查 + 公开页兜底
 * 与 `workflow.json` 本节点 inputs/outputs 一致。
 *
 * 【主路径】Coze：`winitOpenapiData` ← 插件；本地：`COZE_*` 走 workflow/run 代理。
 * 【分批】每批 ≤30 个 trackingnos；首屏插件只覆盖第一批，其余批在代码内继续调代理（需环境变量）。
 * 【兜底】OpenAPI 对某键无结果时：非 `WO` 前缀可再调 `track.winit.com/.../getTracking`（无账号隔离，仅承运商跟踪号）。
 * 【输出】`outTrackingIds` / `outOutboundOrderNos` / `outTrajectoryText` 为入参透传，供 merge 单源拉线。
 */

const TRACKING_OPENAPI_ACTION = "tracking.getOrderVerdorTracking";
const WINIT_PUBLIC_TRACK_URL = "https://track.winit.com/tracking/Index/getTracking";
const MAX_OPENAPI_TRACKINGNOS = 30;

// ========== 类型 ==========
interface TrajectoryNode {
  time?: string;
  status?: string;
  location?: string;
  description?: string;
}

interface TrajectorySummary {
  winitBucket: string;
  nodeCount: number;
  masterOrderNo?: string;
  orderNo?: string;
  origin?: string;
  destination?: string;
  status?: string;
  carrierCode?: string;
  standardCarrier?: string;
  trackingUrl?: string;
  isTracked?: string;
  lastInfo?: string;
  created?: string;
  updated?: string;
  /** openapi | public_tracking */
  dataSource?: string;
  /** confirmed=已获得承运商轨迹；unverified=仅有仓库节点，无法确认承运商是否已扫描；no_data=无节点 */
  carrierDataStatus?: "confirmed" | "unverified" | "no_data";
  /** 如 openapi_miss_wo、openapi_miss_used_public_tracking */
  accountScopeHint?: string;
  podInfoSummary?: string;
}

interface Trajectory {
  trackingNo: string;
  nodes?: TrajectoryNode[];
  summary?: TrajectorySummary;
}

interface FetchMeta {
  openapiAction: string;
  queryKeyCount: number;
  openapiChunks: number;
  publicFallbackKeys: string[];
  notes: string[];
}

// ========== Coze 代理（与 fetch-sku-inventory 同构） ==========
type OpenapiProxyWorkflowParameters = {
  action: string;
  customerCode: string;
  customerName: string;
  username: string;
  data: string;
};

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
  baseUrl?: string;
} | null {
  if (typeof process === "undefined" || !process.env) return null;
  const apiToken = process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "";
  const workflowId = process.env.COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID ?? "";
  if (!apiToken || !workflowId) return null;
  return {
    apiToken,
    workflowId,
    baseUrl: process.env.COZE_API_BASE_URL,
  };
}

function mapWinitLanguage(lang: unknown): string {
  const t = String(lang ?? "")
    .trim()
    .toLowerCase();
  if (t.startsWith("zh_tw") || t === "zh-tw" || t === "zh-hant") return "zh_TW";
  if (t.startsWith("zh")) return "zh_CN";
  if (t.startsWith("en")) return "en_US";
  return "zh_CN";
}

function mergeQueryKeys(trackingIds: unknown, outboundOrderNos: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      const s = String(x ?? "").trim();
      if (!s) continue;
      const u = s.toUpperCase();
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(s);
    }
  };
  add(trackingIds);
  add(outboundOrderNos);
  return out;
}

function chunkStrings(keys: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i += size) out.push(keys.slice(i, i + size));
  return out;
}

function isWinitOrderStyleKey(key: string): boolean {
  return /^WO\d/i.test(key.trim());
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** 从 OpenAPI / Coze 插件多层字符串中解出 `data` 轨迹数组 */
function extractOpenapiTrajectoryRowsFromPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  let cur: unknown = raw;
  if (typeof cur === "string") {
    try {
      cur = JSON.parse(cur) as unknown;
    } catch {
      return [];
    }
    if (Array.isArray(cur)) return cur;
  }
  for (let depth = 0; depth < 5; depth++) {
    if (!cur || typeof cur !== "object") return [];
    /** id/56 成功时 `data` 为数组；Coze 双重 JSON 字符串解析后此处常为数组，不能再读 `.data` */
    if (Array.isArray(cur)) return cur;
    const o = cur as Record<string, unknown>;
    const d = o.data;
    if (Array.isArray(d)) {
      const c = o.code;
      const bizFailed = c !== undefined && c !== null && c !== "" && c !== 0 && c !== "0";
      return bizFailed ? [] : d;
    }
    if (typeof d === "string") {
      try {
        cur = JSON.parse(d) as unknown;
        continue;
      } catch {
        return [];
      }
    }
    if (d && typeof d === "object" && !Array.isArray(d)) {
      cur = d;
      continue;
    }
    return [];
  }
  return [];
}

function tryExtractNodes(record: Record<string, unknown>): TrajectoryNode[] {
  const arr = record.trace;
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const nodes: TrajectoryNode[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    nodes.push({
      time: pickString(r, ["date", "time"]),
      status: pickString(r, ["trackingType", "eventCode", "eventStatus"]),
      location: pickString(r, ["location"]),
      description: pickString(r, ["eventDescription", "description"]),
    });
  }
  return nodes;
}

const WAREHOUSE_EVENT_CODES = new Set(["SO", "GTN", "PKC", "PAC", "DIC", "DLI"]);

function hasCarrierEvidenceInRecord(record: Record<string, unknown>): boolean {
  const trace = record.trace;
  if (!Array.isArray(trace)) return false;
  return trace.some((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    const rec = row as Record<string, unknown>;
    const type = String(rec.type ?? "").trim().toUpperCase();
    const trackingType = String(rec.trackingType ?? "").trim();
    const eventCode = String(rec.eventCode ?? "").trim().toUpperCase();
    return type === "V" || trackingType !== "" || rec.firstActiveTracking === true ||
      (eventCode !== "" && !WAREHOUSE_EVENT_CODES.has(eventCode) && type !== "S");
  });
}

function hasCarrierEvidenceInNodes(nodes: TrajectoryNode[] | undefined): boolean {
  return (nodes ?? []).some((node) => {
    const status = String(node.status ?? "").trim().toUpperCase();
    return status !== "" && !WAREHOUSE_EVENT_CODES.has(status);
  });
}

function mergeTrajectoryNodes(primary: TrajectoryNode[], supplemental: TrajectoryNode[]): TrajectoryNode[] {
  const seen = new Set<string>();
  const merged: TrajectoryNode[] = [];
  for (const node of [...primary, ...supplemental]) {
    const key = [node.time, node.status, node.location, node.description]
      .map((value) => String(value ?? "").trim().toUpperCase())
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(node);
  }
  return merged.sort((a, b) => {
    const aMs = Date.parse(String(a.time ?? ""));
    const bMs = Date.parse(String(b.time ?? ""));
    if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
    return bMs - aMs;
  });
}

function summarizePods(rec: Record<string, unknown>): string | undefined {
  const list = rec.podInfoList;
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const n = list.length;
  const first = list[0];
  if (first && typeof first === "object") {
    const fmt = pickString(first as Record<string, unknown>, ["formatType"]);
    return `${n} 个 POD 链接（${fmt ?? "未知格式"}，链接约 30 分钟有效）`;
  }
  return `${n} 个 POD 链接（约 30 分钟有效）`;
}

function mapOpenapiRowToTrajectory(requestedKey: string, rec: Record<string, unknown>): Trajectory {
  const nodes = tryExtractNodes(rec);
  const tn = pickString(rec, ["trackingNo"]) || requestedKey;
  const summary: TrajectorySummary = {
    winitBucket: "openapi",
    nodeCount: nodes.length,
    dataSource: "openapi",
    carrierDataStatus: hasCarrierEvidenceInRecord(rec) ? "confirmed" : nodes.length > 0 ? "unverified" : "no_data",
    masterOrderNo: pickString(rec, ["masterOrderNo"]),
    orderNo: pickString(rec, ["orderNo"]),
    origin: pickString(rec, ["origin"]),
    destination: pickString(rec, ["destination"]),
    status: pickString(rec, ["status"]),
    carrierCode: pickString(rec, ["carrierCode"]),
    standardCarrier: pickString(rec, ["standardCarrier"]),
    trackingUrl: pickString(rec, ["trackingUrl"]),
    isTracked: pickString(rec, ["isTracked"]),
    podInfoSummary: summarizePods(rec),
  };
  return { trackingNo: tn, nodes, summary };
}

function indexOpenapiRows(rows: unknown[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const add = (k: string | undefined, rec: Record<string, unknown>) => {
    const t = k?.trim();
    if (!t) return;
    map.set(t.toUpperCase(), rec);
  };
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    add(pickString(rec, ["trackingNo"]), rec);
    add(pickString(rec, ["orderNo"]), rec);
    add(pickString(rec, ["masterOrderNo"]), rec);
  }
  return map;
}

function lookupOpenapiRow(index: Map<string, Record<string, unknown>>, key: string): Record<string, unknown> | undefined {
  const hit = index.get(key.trim().toUpperCase());
  if (hit) return hit;
  return undefined;
}

// ========== 公开轨迹页（兜底） ==========
function unwrapWinitData(apiJson: unknown): Record<string, unknown> {
  if (!apiJson || typeof apiJson !== "object") return {};
  const root = apiJson as Record<string, unknown>;
  const inner = root.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return root;
}

const WINIT_DATA_BUCKET_KEYS = [
  "sendPost",
  "transportation",
  "failed",
  "haveSignedIn",
  "exception",
  "noQuery",
  "all",
] as const;

type BucketRow = { rec: Record<string, unknown>; bucket: string };

function collectRecordsWithBucket(data: Record<string, unknown>): BucketRow[] {
  const out: BucketRow[] = [];
  for (const key of WINIT_DATA_BUCKET_KEYS) {
    const v = data[key];
    if (!Array.isArray(v)) continue;
    const bucket = String(key);
    for (const item of v) {
      if (Array.isArray(item)) {
        for (const sub of item) {
          if (sub && typeof sub === "object") out.push({ rec: sub as Record<string, unknown>, bucket });
        }
      } else if (item && typeof item === "object") {
        out.push({ rec: item as Record<string, unknown>, bucket });
      }
    }
  }
  return out;
}

function pickTrackingNoFromRecord(rec: Record<string, unknown>): string | undefined {
  const keys = ["unfindNo", "trackingNo", "tracking_no", "wayBillNo", "waybillNo", "trackNo", "expressNo", "orderNo"];
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function indexRecordsForLookup(rows: BucketRow[]): Map<string, BucketRow> {
  const map = new Map<string, BucketRow>();
  const add = (rawKey: string | undefined, row: BucketRow) => {
    const k = rawKey?.trim();
    if (!k) return;
    map.set(k.toUpperCase(), row);
  };
  for (const row of rows) {
    const { rec } = row;
    add(pickString(rec, ["trackingNo", "tracking_no"]), row);
    add(pickString(rec, ["masterOrderNo"]), row);
    const orderNo = pickString(rec, ["orderNo"]);
    add(orderNo, row);
    if (orderNo && orderNo.length > 1 && /[A-Za-z]$/.test(orderNo)) {
      add(orderNo.slice(0, -1), row);
    }
    add(pickString(rec, ["unfindNo"]), row);
    add(pickTrackingNoFromRecord(rec), row);
  }
  return map;
}

function buildPublicSummary(rec: Record<string, unknown>, winitBucket: string, nodeCount: number): TrajectorySummary {
  const s: TrajectorySummary = {
    winitBucket,
    nodeCount,
    dataSource: "public_tracking",
    carrierDataStatus: hasCarrierEvidenceInRecord(rec) ? "confirmed" : nodeCount > 0 ? "unverified" : "no_data",
    accountScopeHint: "openapi_miss_used_public_tracking",
    masterOrderNo: pickString(rec, ["masterOrderNo"]),
    orderNo: pickString(rec, ["orderNo"]),
    origin: pickString(rec, ["origin"]),
    destination: pickString(rec, ["destination"]),
    status: pickString(rec, ["status"]),
    carrierCode: pickString(rec, ["carrierCode"]),
    standardCarrier: pickString(rec, ["standardCarrier"]),
    trackingUrl: pickString(rec, ["trackingUrl"]),
    isTracked: pickString(rec, ["isTracked"]),
    lastInfo: pickString(rec, ["lastInfo"]),
    created: pickString(rec, ["created"]),
    updated: pickString(rec, ["updated"]),
  };
  return s;
}

function parsePublicPageToTrajectory(apiJson: unknown, requestedId: string): Trajectory {
  const data = unwrapWinitData(apiJson);
  const rows = collectRecordsWithBucket(data);
  const byNo = indexRecordsForLookup(rows);
  const trackingNo = requestedId.trim();
  const hit = byNo.get(trackingNo.toUpperCase());
  const rec = hit?.rec;
  const bucket = hit?.bucket ?? "unknown";
  const nodes = rec ? tryExtractNodes(rec) : [];
  const t: Trajectory = { trackingNo, nodes };
  if (rec) t.summary = buildPublicSummary(rec, bucket, nodes.length);
  else t.summary = { winitBucket: bucket, nodeCount: 0, dataSource: "public_tracking", carrierDataStatus: "no_data" };
  return t;
}

function mergeOpenapiWithPublic(openapi: Trajectory, publicTrajectory: Trajectory): Trajectory {
  const nodes = mergeTrajectoryNodes(openapi.nodes ?? [], publicTrajectory.nodes ?? []);
  return {
    ...openapi,
    nodes,
    summary: {
      ...(publicTrajectory.summary ?? { winitBucket: "public" }),
      ...(openapi.summary ?? { winitBucket: "openapi" }),
      nodeCount: nodes.length,
      dataSource: "openapi+public_tracking",
      carrierDataStatus: hasCarrierEvidenceInNodes(publicTrajectory.nodes) ? "confirmed" : "unverified",
      accountScopeHint: "openapi_partial_used_public_tracking",
    },
  };
}

function dedupeTrajectoriesByTrackingNo(trajectories: Trajectory[]): Trajectory[] {
  const byTracking = new Map<string, Trajectory>();
  for (const trajectory of trajectories) {
    const trackingNo = String(trajectory.trackingNo ?? "").trim();
    if (!trackingNo) continue;
    const key = trackingNo.toUpperCase();
    const current = byTracking.get(key);
    if (!current) {
      byTracking.set(key, trajectory);
      continue;
    }
    const currentConfirmed = current.summary?.carrierDataStatus === "confirmed";
    const nextConfirmed = trajectory.summary?.carrierDataStatus === "confirmed";
    if ((!currentConfirmed && nextConfirmed) ||
      (currentConfirmed === nextConfirmed && (trajectory.nodes?.length ?? 0) > (current.nodes?.length ?? 0))) {
      byTracking.set(key, trajectory);
    }
  }
  return [...byTracking.values()];
}

function buildMultipartTrackingBody(trackingNoString: string): { body: string; contentType: string } {
  const boundary = `----winitTrack${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
  const crlf = "\r\n";
  const body =
    `--${boundary}${crlf}` +
    `Content-Disposition: form-data; name="trackingNoString"${crlf}${crlf}` +
    trackingNoString +
    `${crlf}--${boundary}--${crlf}`;
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function postWinitPublicTracking(trackingNoString: string): Promise<unknown> {
  let init: RequestInit;
  if (typeof FormData !== "undefined") {
    const formData = new FormData();
    formData.append("trackingNoString", trackingNoString);
    init = { method: "POST", body: formData };
  } else {
    const { body, contentType } = buildMultipartTrackingBody(trackingNoString);
    init = { method: "POST", headers: { "Content-Type": contentType }, body };
  }
  const response = await fetch(WINIT_PUBLIC_TRACK_URL, init);
  if (!response.ok) {
    throw new Error(`[fetch-trajectories] 公开轨迹 HTTP ${response.status}`);
  }
  return response.json();
}

// ========== 主逻辑 ==========
async function main({ params }: { params: Record<string, unknown> }) {
  const trackingIds = (params.trackingIds as string[]) ?? [];
  const outboundOrderNos = (params.outboundOrderNos as string[]) ?? [];
  const outTrajectoryText = String(params.trajectoryText ?? "").trim();
  const language = mapWinitLanguage(params.language);

  const queryKeys = mergeQueryKeys(trackingIds, outboundOrderNos);
  const notes: string[] = [];
  const publicFallbackKeys: string[] = [];
  const publicFallbackCache = new Map<string, { trajectory?: Trajectory; error?: string }>();

  const loadPublicFallback = async (trackingNo: string): Promise<{ trajectory?: Trajectory; error?: string }> => {
    const normalized = trackingNo.trim();
    const cacheKey = normalized.toUpperCase();
    const cached = publicFallbackCache.get(cacheKey);
    if (cached) return cached;
    if (!publicFallbackKeys.some((item) => item.toUpperCase() === cacheKey)) publicFallbackKeys.push(normalized);
    try {
      const pubJson = await postWinitPublicTracking(normalized);
      const trajectory = parsePublicPageToTrajectory(pubJson, normalized);
      const result = { trajectory };
      publicFallbackCache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result = { error: error instanceof Error ? error.message : String(error) };
      publicFallbackCache.set(cacheKey, result);
      return result;
    }
  };

  const retPassthrough = {
    trajectories: [] as Trajectory[],
    fetchMeta: {
      openapiAction: TRACKING_OPENAPI_ACTION,
      queryKeyCount: 0,
      openapiChunks: 0,
      publicFallbackKeys: [] as string[],
      notes: [] as string[],
    } satisfies FetchMeta,
    outTrackingIds: trackingIds.filter((x) => String(x).trim()),
    outOutboundOrderNos: outboundOrderNos.filter((x) => String(x).trim()),
    outTrajectoryText,
  };

  if (queryKeys.length === 0) {
    notes.push("无单号，跳过 OpenAPI（仅文本轨迹由 merge 处理）");
    retPassthrough.fetchMeta = { ...retPassthrough.fetchMeta, notes };
    return retPassthrough;
  }

  const env = getCozeOpenapiProxyEnv();
  const customerCode = String(params.customerCode ?? "").trim();
  const customerName = String(params.customerName ?? "").trim();
  const username = String(params.username ?? "").trim();

  // 业务上下文必须来自本次调用（例如 Coze 日志），不得被 .env 的默认客户覆盖。
  const proxyCustomer = { customerCode, customerName, username };
  const hasProxyCustomer = Boolean(customerCode && customerName && username);

  const chunks = chunkStrings(queryKeys, MAX_OPENAPI_TRACKINGNOS);
  const openapiRowsAccum: unknown[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i]!;
    let raw: unknown;

    if (i === 0) {
      const plug = params.winitOpenapiData;
      const hasPlug = plug != null && String(plug).trim() !== "";
      if (hasPlug) {
        raw = parseCozeWorkflowDataField(plug);
      } else if (env && hasProxyCustomer) {
        const dataStr =
          typeof params.winitRequestData === "string" && params.winitRequestData.trim()
            ? params.winitRequestData.trim()
            : JSON.stringify({ trackingnos: ch.join(","), language });
        raw = await runCozeOpenapiProxyWorkflow({
          apiToken: env.apiToken,
          workflowId: env.workflowId,
          baseUrl: env.baseUrl,
          parameters: {
            action: TRACKING_OPENAPI_ACTION,
            customerCode: proxyCustomer.customerCode,
            customerName: proxyCustomer.customerName,
            username: proxyCustomer.username,
            data: dataStr,
          },
        });
      } else {
        notes.push(
          env
            ? "首屏无插件响应且缺少本次调用的 customerCode/customerName/username，跳过 OpenAPI"
            : "首屏无插件响应且无 Coze 代理环境变量，跳过 OpenAPI"
        );
        break;
      }
    } else {
      if (!env || !hasProxyCustomer) {
        notes.push(
          !env
            ? `余下 ${chunks.length - 1} 批需 COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID 等环境变量，已跳过`
            : `余下 ${chunks.length - 1} 批缺少本次调用的 customerCode/customerName/username，已跳过`
        );
        break;
      }
      const dataStr = JSON.stringify({ trackingnos: ch.join(","), language });
      raw = await runCozeOpenapiProxyWorkflow({
        apiToken: env.apiToken,
        workflowId: env.workflowId,
        baseUrl: env.baseUrl,
        parameters: {
          action: TRACKING_OPENAPI_ACTION,
          customerCode: proxyCustomer.customerCode,
          customerName: proxyCustomer.customerName,
          username: proxyCustomer.username,
          data: dataStr,
        },
      });
    }

    const rows = extractOpenapiTrajectoryRowsFromPayload(raw);
    openapiRowsAccum.push(...rows);
  }

  const openapiIndex = indexOpenapiRows(openapiRowsAccum);
  const trajectories: Trajectory[] = [];

  for (const key of queryKeys) {
    const row = lookupOpenapiRow(openapiIndex, key);
    if (row) {
      let trajectory = mapOpenapiRowToTrajectory(key, row);
      const resolvedTrackingNo = trajectory.trackingNo.trim();
      if (trajectory.summary?.carrierDataStatus === "unverified" && !isWinitOrderStyleKey(resolvedTrackingNo)) {
        const fallback = await loadPublicFallback(resolvedTrackingNo);
        if (fallback.trajectory && hasCarrierEvidenceInNodes(fallback.trajectory.nodes)) {
          trajectory = mergeOpenapiWithPublic(trajectory, fallback.trajectory);
          notes.push(
            `「${resolvedTrackingNo}」OpenAPI 仅返回仓库节点，已用公开轨迹补充承运商扫描；公开结果仅作数据完整性兜底。`
          );
        } else {
          trajectory.summary = {
            ...(trajectory.summary ?? { winitBucket: "openapi", nodeCount: trajectory.nodes?.length ?? 0 }),
            carrierDataStatus: "unverified",
            accountScopeHint: "openapi_warehouse_only_carrier_unverified",
          };
          notes.push(
            fallback.error
              ? `「${resolvedTrackingNo}」OpenAPI 仅返回仓库节点，公开轨迹兜底失败：${fallback.error}；无法确认承运商是否已扫描。`
              : `「${resolvedTrackingNo}」OpenAPI 仅返回仓库节点，公开轨迹也未返回承运商扫描；无法确认实际是否已上网。`
          );
        }
      }
      trajectories.push(trajectory);
      continue;
    }

    if (isWinitOrderStyleKey(key)) {
      notes.push(
        `OpenAPI 未返回「${key}」；该键为 WO 万邑通单号形态，不作公开轨迹页查询。请提示客户：可能不在当前绑定账号数据范围内。`
      );
      trajectories.push({
        trackingNo: key,
        nodes: [],
        summary: {
          winitBucket: "openapi_miss",
          nodeCount: 0,
          dataSource: "none",
          carrierDataStatus: "no_data",
          accountScopeHint: "openapi_miss_wo_not_public_trackable",
        },
      });
      continue;
    }

    const fallback = await loadPublicFallback(key);
    if (fallback.trajectory) {
      const t = fallback.trajectory;
      if (!t.summary) t.summary = { winitBucket: "public", nodeCount: t.nodes?.length ?? 0 };
      t.summary.accountScopeHint = "openapi_miss_used_public_tracking";
      t.summary.dataSource = "public_tracking";
      trajectories.push(t);
      notes.push(
        `「${key}」OpenAPI 无数据，已用公开轨迹接口兜底；请向客户说明：可能不在当前账号权限范围内，公开结果仅供参考。`
      );
    } else {
      notes.push(`「${key}」公开兜底失败：${fallback.error ?? "unknown"}`);
      trajectories.push({
        trackingNo: key,
        nodes: [],
        summary: {
          winitBucket: "error",
          nodeCount: 0,
          dataSource: "none",
          carrierDataStatus: "no_data",
          accountScopeHint: "fetch_failed",
        },
      });
    }
  }

  const fetchMeta: FetchMeta = {
    openapiAction: TRACKING_OPENAPI_ACTION,
    queryKeyCount: queryKeys.length,
    openapiChunks: chunks.length,
    publicFallbackKeys,
    notes,
  };

  return {
    trajectories: dedupeTrajectoriesByTrackingNo(trajectories),
    fetchMeta,
    outTrackingIds: retPassthrough.outTrackingIds,
    outOutboundOrderNos: retPassthrough.outOutboundOrderNos,
    outTrajectoryText,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-trajectories")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
