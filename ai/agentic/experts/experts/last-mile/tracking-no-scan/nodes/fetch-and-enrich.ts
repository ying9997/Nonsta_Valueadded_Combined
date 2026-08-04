/**
 * 节点：fetch-and-enrich — 本专家自拉轨迹并合并为 enrichedContext
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【职责】根据 trackingIds（及未来出库单→单号解析）调用 Winit 公开轨迹接口拉数，推导 carrierScanDetected（仅节点 status SCAN/Ascan）、parcelCreatedAt、trajectorySummary；
 * 若 contextOverlay 已含可复用轨迹（有 nodes 或有效 summary）或显式 skipTrajectoryFetch / reuseUpstreamTrajectoryFacts，则**不再重复请求** Winit。
 * 再与 contextOverlay 合并其余字段（如 bulk、orderDetails）。
 *
 * 【输入】params：valid, query, trackingIds, outboundOrderNos, customerIntent, trajectoryText, contextOverlay, inputContext
 * 【输出】query, trackingIds, outboundOrderNos, customerIntent, enrichedContext（含 **analysisClock**，合并后由本节点覆盖为当前 UTC）, inputContext
 *
 * 轨迹拉取逻辑与 delivery-status/fetch-trajectories.ts 保持一致（须同步维护）。
 */

// ========== 类型（本文件内闭环） ==========
interface TrajectoryNode {
  time?: string;
  status?: string;
  location?: string;
  description?: string;
}

/** 从 Winit 记录抽取的精简元数据（不含 trace / lastTrack） */
interface TrajectorySummary {
  /** Winit 分桶：haveSignedIn / failed / transportation / sendPost / exception / noQuery / all 等 */
  winitBucket: string;
  nodeCount: number;
  masterOrderNo?: string;
  orderNo?: string;
  origin?: string;
  destination?: string;
  /** 单票级状态文案，如 Return to original warehouse、Void */
  status?: string;
  carrierCode?: string;
  standardCarrier?: string;
  trackingUrl?: string;
  isTracked?: string;
  lastInfo?: string;
  created?: string;
  updated?: string;
  carrierDataStatus?: "confirmed" | "unverified" | "no_data";
}

interface Trajectory {
  trackingNo: string;
  nodes?: TrajectoryNode[];
  summary?: TrajectorySummary;
}

type TnsScanStateKind = "ascan" | "no_ascan" | "delivered" | "unknown";
interface TnsScanState {
  trackingNo: string;
  state: TnsScanStateKind;
}

// ========== 配置 ==========
const WINIT_TRACK_URL = "https://track.winit.com/tracking/Index/getTracking";
const MAX_TRACKING_NO_PER_REQUEST = 100;

// ========== Winit 响应解析 ==========
function unwrapWinitData(apiJson: unknown): Record<string, unknown> {
  if (!apiJson || typeof apiJson !== "object") return {};
  const root = apiJson as Record<string, unknown>;
  const inner = root.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return root;
}

/** 与 Winit data 下各状态桶一致，含嵌套数组（如 noQuery） */
const WINIT_DATA_BUCKET_KEYS = [
  "sendPost",
  "transportation",
  "failed",
  "haveSignedIn",
  "exception",
  "noQuery",
  "all",
  "orderNosRepetitions",
] as const;

type BucketRow = { rec: Record<string, unknown>; bucket: string };

function collectRecordsWithBucket(data: Record<string, unknown>): BucketRow[] {
  const out: BucketRow[] = [];
  for (const key of WINIT_DATA_BUCKET_KEYS) {
    if (key === "orderNosRepetitions") continue;
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
  const keys = [
    "unfindNo",
    "trackingNo",
    "tracking_no",
    "wayBillNo",
    "waybillNo",
    "trackNo",
    "expressNo",
    "orderNo",
  ];
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function tryExtractNodes(record: Record<string, unknown>): TrajectoryNode[] {
  const listKeys = [
    "trace",
    "trackList",
    "trackingList",
    "details",
    "detailList",
    "history",
    "events",
    "trajectory",
    "trackDetails",
    "list",
    "traceList",
  ];
  for (const k of listKeys) {
    const arr = record[k];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const nodes: TrajectoryNode[] = [];
    for (const row of arr) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      nodes.push({
        time: pickString(r, ["date", "time", "trackTime", "createTime", "operateTime", "trackingDate"]),
        status: pickString(r, ["trackingType", "eventCode", "status", "trackStatus", "state", "info", "trackingStatus", "eventStatus"]),
        location: pickString(r, ["location", "place", "address", "city", "country", "trackingPlace"]),
        description: pickString(r, ["eventDescription", "description", "info", "remark", "content", "detail", "context"]),
      });
    }
    if (nodes.length > 0) return nodes;
  }
  return [];
}

/** Winit 一条记录可通过跟踪号、主单号、子单号等多键命中（如仅订单号查询时 trackingNo 可能为空串） */
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

function buildSummary(rec: Record<string, unknown>, winitBucket: string, nodeCount: number): TrajectorySummary {
  const s: TrajectorySummary = { winitBucket, nodeCount };
  const m = pickString(rec, ["masterOrderNo"]);
  if (m) s.masterOrderNo = m;
  const on = pickString(rec, ["orderNo"]);
  if (on) s.orderNo = on;
  const o = pickString(rec, ["origin"]);
  if (o) s.origin = o;
  const d = pickString(rec, ["destination"]);
  if (d) s.destination = d;
  const st = pickString(rec, ["status"]);
  if (st) s.status = st;
  const cc = pickString(rec, ["carrierCode"]);
  if (cc) s.carrierCode = cc;
  const sc = pickString(rec, ["standardCarrier"]);
  if (sc) s.standardCarrier = sc;
  const tu = pickString(rec, ["trackingUrl"]);
  if (tu) s.trackingUrl = tu;
  const it = pickString(rec, ["isTracked"]);
  if (it) s.isTracked = it;
  const li = pickString(rec, ["lastInfo"]);
  if (li) s.lastInfo = li;
  const cr = pickString(rec, ["created"]);
  if (cr) s.created = cr;
  const up = pickString(rec, ["updated"]);
  if (up) s.updated = up;
  return s;
}

function parseWinitToTrajectories(apiJson: unknown, requestedIds: string[]): Trajectory[] {
  const data = unwrapWinitData(apiJson);
  const rows = collectRecordsWithBucket(data);
  const byNo = indexRecordsForLookup(rows);

  return requestedIds.map((id) => {
    const trackingNo = id.trim();
    const hit = byNo.get(trackingNo.toUpperCase());
    const rec = hit?.rec;
    const bucket = hit?.bucket ?? "unknown";
    const nodes = rec ? tryExtractNodes(rec) : [];
    const t: Trajectory = { trackingNo, nodes };
    if (rec) t.summary = buildSummary(rec, bucket, nodes.length);
    return t;
  });
}

/** 无全局 FormData 时（旧 Node / 部分 FaaS）手动拼 multipart，与浏览器 FormData 行为等价 */
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

async function postWinitTracking(trackingNoString: string): Promise<unknown> {
  let init: RequestInit;

  if (typeof FormData !== "undefined") {
    const formData = new FormData();
    formData.append("trackingNoString", trackingNoString);
    init = { method: "POST", body: formData };
  } else {
    const { body, contentType } = buildMultipartTrackingBody(trackingNoString);
    init = {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    };
  }

  const response = await fetch(WINIT_TRACK_URL, init);

  if (!response.ok) {
    throw new Error(`[fetch-and-enrich] Winit HTTP ${response.status}`);
  }

  return response.json();
}

// ========== 主逻辑 ==========
async function fetchTrajectories(trackingIds: string[]): Promise<Trajectory[]> {
  const unique = [...new Set(trackingIds.map((s) => String(s).trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const trajectories: Trajectory[] = [];

  for (let i = 0; i < unique.length; i += MAX_TRACKING_NO_PER_REQUEST) {
    const batch = unique.slice(i, i + MAX_TRACKING_NO_PER_REQUEST);
    const trackingNoString = batch.join(",");
    const data = await postWinitTracking(trackingNoString);
    trajectories.push(...parseWinitToTrajectories(data, batch));
  }

  return trajectories;
}

// ========== 本专家：事实推导与合并 ==========
/** 仅认节点 status 为 SCAN / Ascan（不扫 trajectoryText / description，避免「无扫描」假阳性） */
function detectScanInTrajectories(trajectories: Trajectory[]): boolean {
  for (const t of trajectories) {
    for (const n of t.nodes ?? []) {
      if (/^(a-?scan|scan)$/i.test(String(n.status ?? "").trim())) return true;
    }
  }
  return false;
}

function dedupeTrajectories(rows: Trajectory[]): Trajectory[] {
  const byTracking = new Map<string, Trajectory>();
  for (const row of rows) {
    const trackingNo = String(row.trackingNo ?? "").trim();
    if (!trackingNo) continue;
    const key = trackingNo.toUpperCase();
    const current = byTracking.get(key);
    const currentScore = (current?.nodes?.length ?? 0) * 100 + (current?.summary ? Object.keys(current.summary).length : 0);
    const nextScore = (row.nodes?.length ?? 0) * 100 + (row.summary ? Object.keys(row.summary).length : 0);
    if (!current || nextScore > currentScore) byTracking.set(key, { ...row, trackingNo });
  }
  return [...byTracking.values()];
}

function tnsEventCount(row: Record<string, unknown>, key: string): number {
  return Array.isArray(row[key]) ? (row[key] as unknown[]).length : 0;
}

function tnsStatePriority(state: TnsScanStateKind): number {
  if (state === "delivered") return 4;
  if (state === "ascan") return 3;
  if (state === "no_ascan") return 2;
  return 1;
}

function buildScanStates(
  context: Record<string, unknown>,
  trackingIds: string[],
  trajectories: Trajectory[]
): { scanStates: TnsScanState[]; scanStateSummary: string } {
  const byTracking = new Map<string, TnsScanState>();
  const carrierDataUnverified = new Set<string>();
  const facts = Array.isArray(context.computedScanFacts) ? context.computedScanFacts : [];
  for (const raw of facts) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const trackingNo = String(row.trackingNo ?? "").trim();
    if (!trackingNo) continue;
    let state: TnsScanStateKind = "unknown";
    if (row.dataSourceNote === "carrier_data_unverified") {
      state = "unknown";
      carrierDataUnverified.add(trackingNo.toUpperCase());
    }
    else if (tnsEventCount(row, "dscanEvents") > 0 || tnsEventCount(row, "rdscanEvents") > 0) state = "delivered";
    else if (tnsEventCount(row, "ascanEvents") > 0) state = "ascan";
    else if (
      ["ascanEvents", "dscanEvents", "rdscanEvents"].every((key) => Array.isArray(row[key])) &&
      row.dataSourceNote !== "no_nodes"
    ) state = "no_ascan";
    const key = trackingNo.toUpperCase();
    const current = byTracking.get(key);
    if (carrierDataUnverified.has(key) && state === "no_ascan") continue;
    if (state === "unknown" && row.dataSourceNote === "carrier_data_unverified" && current?.state === "no_ascan") {
      byTracking.set(key, { trackingNo, state });
      continue;
    }
    if (!current || tnsStatePriority(state) > tnsStatePriority(current.state)) {
      byTracking.set(key, { trackingNo, state });
    }
  }

  for (const trajectory of trajectories) {
    const trackingNo = String(trajectory.trackingNo ?? "").trim();
    if (!trackingNo) continue;
    const key = trackingNo.toUpperCase();
    if (byTracking.has(key)) continue;
    if (trajectory.summary?.carrierDataStatus === "unverified") {
      byTracking.set(key, { trackingNo, state: "unknown" });
      continue;
    }
    const nodes = trajectory.nodes ?? [];
    const hasDelivered = nodes.some((node) => /^rdscans?$|^dscans?$/i.test(String(node.status ?? "").trim()));
    const hasAscan = nodes.some((node) => /^(a-?scan|scan)$/i.test(String(node.status ?? "").trim()));
    byTracking.set(key, {
      trackingNo,
      state: hasDelivered ? "delivered" : hasAscan ? "ascan" : nodes.length > 0 ? "no_ascan" : "unknown",
    });
  }

  for (const trackingNo of trackingIds) {
    const key = trackingNo.toUpperCase();
    if (!byTracking.has(key)) {
      byTracking.set(key, {
        trackingNo,
        state: context.ascanDetected === false ? "no_ascan" : context.ascanDetected === true ? "ascan" : "unknown",
      });
    }
  }

  const scanStates = [...byTracking.values()];
  const states = new Set(scanStates.map((item) => item.state));
  const scanStateSummary =
    states.has("unknown") ? "unknown" :
    states.size > 1 ? "mixed" :
    states.has("delivered") ? "all_delivered" :
    states.has("ascan") ? "all_ascan" :
    states.has("no_ascan") ? "all_no_ascan" : "unknown";
  return { scanStates, scanStateSummary };
}

function computeNoScanAgeDays(context: Record<string, unknown>, clock: AnalysisClock): number | undefined {
  const explicit = Number(context.noScanAgeDays ?? context.noUpdateDays);
  if (Number.isFinite(explicit) && explicit >= 0) return Math.floor(explicit);
  const warehouseAt = String(context.warehouseLastEventAt ?? "").trim();
  const nowMs = Date.parse(clock.utcIso);
  const warehouseMs = Date.parse(warehouseAt);
  if (!warehouseAt || !Number.isFinite(nowMs) || !Number.isFinite(warehouseMs) || nowMs < warehouseMs) return undefined;
  return Math.floor((nowMs - warehouseMs) / 86400000);
}

function pickParcelCreatedAt(trajectories: Trajectory[]): string | undefined {
  let best: string | undefined;
  for (const t of trajectories) {
    const c = t.summary?.created?.trim();
    if (c && (!best || c.length >= best.length)) best = c;
  }
  return best;
}

function compactTrajectorySummary(trajectories: Trajectory[], trajectoryText: string): string {
  const lines = trajectories.map((t) => ({
    trackingNo: t.trackingNo,
    nodeCount: t.nodes?.length ?? 0,
    bucket: t.summary?.winitBucket,
    lastInfo: t.summary?.lastInfo,
    created: t.summary?.created,
  }));
  return JSON.stringify({ trajectories: lines, pastedTextLength: trajectoryText.length });
}

/** 前序专家/编排已提供可复用的轨迹明细（有节点或有效 summary），避免重复打 Winit */
function overlayHasReusableTrajectories(overlay: Record<string, unknown>): boolean {
  const arr = overlay.trajectories;
  if (!Array.isArray(arr) || arr.length === 0) return false;
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Trajectory;
    if ((t.nodes?.length ?? 0) > 0) return true;
    const s = t.summary;
    if (s && (String(s.lastInfo ?? "").trim() !== "" || String(s.created ?? "").trim() !== "")) return true;
  }
  return false;
}

/** 显式跳过拉轨迹，或已有可复用轨迹 */
function shouldSkipTrajectoryFetch(overlay: Record<string, unknown>): boolean {
  if (overlay.skipTrajectoryFetch === true || overlay.reuseUpstreamTrajectoryFacts === true) {
    return true;
  }
  return overlayHasReusableTrajectories(overlay);
}

/** 与 delivery-status merge-enriched-context 同形，供 LLM 将「距今」与 parcelCreatedAt 等对齐全 */
interface AnalysisClock {
  utcIso: string;
  timezoneLabel: string;
  note: string;
}

function buildAnalysisClock(): AnalysisClock {
  return {
    utcIso: new Date().toISOString(),
    timezoneLabel: "UTC",
    note:
      "参考时钟为服务端 UTC（ISO8601）。轨迹节点时间多为事件发生地/承运商返回的本地时间或混用时区，与「当前时刻」比较时请显式区分二者，勿直接混算。",
  };
}

function mergeSelfWithOverlay(
  self: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...self };
  for (const [k, v] of Object.entries(overlay)) {
    if (v === undefined) continue;
    if (k === "trajectories" && Array.isArray(v) && v.length > 0) {
      out.trajectories = v;
      continue;
    }
    if (k === "orderDetails" && Array.isArray(v) && v.length > 0) {
      out.orderDetails = v;
      continue;
    }
    if (k === "fetchMeta" && v && typeof v === "object" && !Array.isArray(v)) {
      out.upstreamFetchMeta = v;
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const valid = params.valid !== false;
  const query = String(params.query ?? "");
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const customerIntent = String(params.customerIntent ?? "");
  const trajectoryText =
    typeof params.trajectoryText === "string" ? params.trajectoryText.trim() : "";
  const contextOverlay =
    params.contextOverlay !== undefined &&
    params.contextOverlay !== null &&
    typeof params.contextOverlay === "object" &&
    !Array.isArray(params.contextOverlay)
      ? (params.contextOverlay as Record<string, unknown>)
      : {};
  const inputContext =
    params.inputContext !== undefined && params.inputContext !== null && typeof params.inputContext === "object"
      ? (params.inputContext as Record<string, unknown>)
      : {};

  // 出库单 → 跟踪号 API 对接后在此展开；当前仅使用入参 trackingIds
  const overlayTrackingIds = Array.isArray(contextOverlay.trackingIds)
    ? (contextOverlay.trackingIds as unknown[]).map((item) => String(item).trim()).filter(Boolean)
    : [];
  const resolvedTrackingIds = [...new Set([...trackingIds, ...overlayTrackingIds])];

  const skipFetch = shouldSkipTrajectoryFetch(contextOverlay);

  let trajectories: Trajectory[] = [];
  let fetchError: string | undefined;

  if (skipFetch && Array.isArray(contextOverlay.trajectories)) {
    trajectories = dedupeTrajectories(contextOverlay.trajectories as Trajectory[]);
  } else if (!skipFetch && valid && resolvedTrackingIds.length > 0) {
    try {
      trajectories = dedupeTrajectories(await fetchTrajectories(resolvedTrackingIds));
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
      trajectories = [];
    }
  }

  const carrierFromSelf = detectScanInTrajectories(trajectories);
  const parcelCreatedAt = pickParcelCreatedAt(trajectories);
  const analysisClock = buildAnalysisClock();
  const scanFacts = buildScanStates(contextOverlay, resolvedTrackingIds, trajectories);
  const noScanAgeDays = computeNoScanAgeDays(contextOverlay, analysisClock);

  const trajectorySummaryStr =
    typeof contextOverlay.trajectorySummary === "string" &&
    contextOverlay.trajectorySummary.trim() !== "" &&
    skipFetch
      ? contextOverlay.trajectorySummary
      : compactTrajectorySummary(trajectories, trajectoryText);

  const orderDetailsFromOverlay = Array.isArray(contextOverlay.orderDetails)
    ? contextOverlay.orderDetails
    : [];

  const selfCtx: Record<string, unknown> = {
    trajectories,
    trajectorySummary: trajectorySummaryStr,
    carrierScanDetected: carrierFromSelf,
    ...scanFacts,
    noScanAgeDays,
    parcelCreatedAt,
    trackingIds: resolvedTrackingIds,
    outboundOrderNos,
    trajectoryText: trajectoryText || undefined,
    orderDetails: orderDetailsFromOverlay,
    fetchMeta: {
      expertNode: "fetch-and-enrich",
      fetchedAt: new Date().toISOString(),
      trackingIdsRequested: resolvedTrackingIds.length,
      fetchError,
      skippedTrajectoryFetch: skipFetch,
      skipReason: skipFetch
        ? contextOverlay.skipTrajectoryFetch === true || contextOverlay.reuseUpstreamTrajectoryFacts === true
          ? "explicit_flag"
          : "reusable_upstream_trajectories"
        : undefined,
    },
    inputValid: valid,
    validationError: valid ? "" : String(params.error ?? ""),
  };

  const enrichedContext = mergeSelfWithOverlay(selfCtx, contextOverlay);
  enrichedContext.carrierScanDetected =
    scanFacts.scanStateSummary === "all_ascan" ||
    scanFacts.scanStateSummary === "all_delivered" ||
    carrierFromSelf ||
    contextOverlay.carrierScanDetected === true;
  enrichedContext.scanStates = scanFacts.scanStates;
  enrichedContext.scanStateSummary = scanFacts.scanStateSummary;
  enrichedContext.noScanAgeDays = noScanAgeDays;

  delete enrichedContext.skipTrajectoryFetch;
  delete enrichedContext.reuseUpstreamTrajectoryFacts;

  enrichedContext.analysisClock = analysisClock;

  return {
    query,
    trackingIds: resolvedTrackingIds,
    outboundOrderNos,
    customerIntent,
    enrichedContext,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-and-enrich")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
