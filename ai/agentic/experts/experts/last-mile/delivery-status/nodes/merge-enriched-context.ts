/**
 * 节点：合并为 enrichedContext
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | trajectories | Trajectory[] | `fetch-trajectories` 产出 |
 * | fetchMeta | object（可选） | 拉数元信息（OpenAPI 批次数、兜底说明等） |
 * | outTrackingIds | string[] | fetch 透传的 trackingIds |
 * | outOutboundOrderNos | string[] | fetch 透传的 outboundOrderNos |
 * | outTrajectoryText | string | fetch 透传的 trajectoryText |
 *
 * 【输出】`enrichedContext` 含 `analysisClock`（参考 UTC 时钟）、`fetchMeta`、`carrierHints`（按轨迹摘要抽取承运商）、`orderDetails`（恒为空数组占位）、**`computedScanFacts`**（从节点确定性抽取的 Ascan/Dscan/RDscan 与派送失败启发式，供 LLM 与 `format-output` 合并进 `structured.scanFacts`）
 */

/** 与 fetch-trajectories 同形；使用独立类型名，避免与仓库内其他节点文件的 Trajectory* TS 声明合并 */
interface MergeEcNode {
  time?: string;
  status?: string;
  location?: string;
  description?: string;
}

interface MergeEcSummary {
  winitBucket?: string;
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
  dataSource?: string;
  carrierDataStatus?: "confirmed" | "unverified" | "no_data";
  accountScopeHint?: string;
  podInfoSummary?: string;
}

interface MergeEcTrajectory {
  trackingNo: string;
  nodes?: MergeEcNode[];
  summary?: MergeEcSummary;
}

interface OrderDetail {
  orderNo: string;
  trackingNos?: string[];
  products?: unknown[];
  package?: unknown;
  destination?: unknown;
  outboundTime?: string;
  fees?: unknown;
  raw?: unknown;
}

interface AnalysisClock {
  utcIso: string;
  timezoneLabel: string;
  note: string;
}

/** 与单条轨迹对齐的承运商标识，便于 LLM 写入 structured.carriers 及下游消费 */
interface CarrierHint {
  trackingNo: string;
  carrierCode?: string;
  standardCarrier?: string;
}

/** 从节点表抽取的扫描事件 */
interface MergeEcScanEvent {
  time?: string;
  location?: string;
  status?: string;
  description?: string;
}

/**
 * 每条 trackingNo 一条。RDscan 与 Dscan 分表，归类时 **RDscan 优先于 Dscan**（与 expert 口径一致）。
 * `deliveryFailureLikely` 为启发式，证据见 `deliveryFailureEvidence`；无 API 节点时 `dataSourceNote` 为 `no_nodes`。
 */
interface MergeEcPerTrackingScanFacts {
  trackingNo: string;
  ascanEvents: MergeEcScanEvent[];
  dscanEvents: MergeEcScanEvent[];
  rdscanEvents: MergeEcScanEvent[];
  deliveryFailureLikely: boolean;
  deliveryFailureEvidence?: string[];
  dataSourceNote?: "no_nodes" | "carrier_data_unverified";
}

interface EnrichedContext {
  trajectories: MergeEcTrajectory[];
  orderDetails: OrderDetail[];
  trajectoryText?: string;
  trackingIds: string[];
  outboundOrderNos: string[];
  analysisClock: AnalysisClock;
  fetchMeta?: Record<string, unknown>;
  carrierHints: CarrierHint[];
  /** 确定性扫描事实；无轨迹、仅文本路径时可为空数组 */
  computedScanFacts: MergeEcPerTrackingScanFacts[];
  /** 所有轨迹节点中最晚的时间（ISO8601），供下游专家（如 tracking-stale）做停更判定 */
  lastTrackingAt?: string;
  /** 从 lastTrackingAt 到 analysisClock.utcIso 的天数（向下取整），供下游专家优先使用 */
  noUpdateDays?: number;
  /** Ascan/Dscan/RDscan 中最晚的承运商扫描时间；仓库 DLI/DIC 等不得写入 */
  carrierLastScanAt?: string;
  /** SO/GTN/PKC/PAC/DIC/DLI 中最晚的仓库作业事件时间 */
  warehouseLastEventAt?: string;
}

function buildAnalysisClock(): AnalysisClock {
  return {
    utcIso: new Date().toISOString(),
    timezoneLabel: "UTC",
    note:
      "参考时钟为服务端 UTC（ISO8601）。轨迹节点时间多为事件发生地/承运商返回的本地时间或混用时区，与「当前时刻」比较时请显式区分二者，勿直接混算。",
  };
}

function buildCarrierHints(trajectories: MergeEcTrajectory[]): CarrierHint[] {
  return trajectories
    .filter((t) => Boolean(t.trackingNo))
    .map((t) => ({
      trackingNo: t.trackingNo,
      carrierCode: t.summary?.carrierCode,
      standardCarrier: t.summary?.standardCarrier,
    }));
}

function trajectoryCompleteness(t: MergeEcTrajectory): number {
  const summaryValues = t.summary ? Object.values(t.summary).filter((v) => v !== undefined && v !== "").length : 0;
  return (t.nodes?.length ?? 0) * 100 + summaryValues;
}

/** 同一 OpenAPI 行可能同时被 WO 与 trackingNo 命中；以实际 trackingNo 去重，保留事实更完整的一条。 */
function dedupeTrajectories(rows: MergeEcTrajectory[]): MergeEcTrajectory[] {
  const byTracking = new Map<string, MergeEcTrajectory>();
  for (const row of rows) {
    const trackingNo = String(row.trackingNo ?? "").trim();
    if (!trackingNo) continue;
    const key = trackingNo.toUpperCase();
    const current = byTracking.get(key);
    if (!current || trajectoryCompleteness(row) > trajectoryCompleteness(current)) {
      byTracking.set(key, { ...row, trackingNo });
    }
  }
  return [...byTracking.values()];
}

/** 与 expert 中 trackingType 口径一致：RDscan 优先；仅当整段状态码为 Dscan（非 RD）时计入妥投向 Dscan */
function classifyScanType(status?: string): "ascan" | "dscan" | "rdscan" | null {
  const s = (status ?? "").trim();
  if (!s) return null;
  if (/^rdscans?$/i.test(s)) return "rdscan";
  if (/^dscans?$/i.test(s)) return "dscan";
  if (/^ascan$/i.test(s)) return "ascan";
  return null;
}

/**
 * 派送失败/异常派送启发式：以英文描述为主，与主 Prompt「自然语言优先」一致。
 * 误报可能存在于含 exception 的泛化句，故要求与下述子串之一同现或强匹配。
 */
const DELIVERY_FAILURE_TEXT_RE =
  /(failed delivery|delivery failed|deliver(y)? fail|undelivered|undeliver|recipient not available|no one (?:at )?home|could not deliver|unable to deliver|delivery exception|\brefused\b|not available for delivery|incorrect address|incomplete address|address (?:is )?incorrect|access issues|failed to deliver|attempted delivery|delivery attempted)/i;

function nodeToEvent(n: MergeEcNode): MergeEcScanEvent {
  return {
    time: n.time,
    location: n.location,
    status: n.status,
    description: n.description,
  };
}

function snippetForEvidence(n: MergeEcNode): string {
  const parts = [n.time, n.status, n.location, n.description].filter((x) => (x ?? "").toString().trim());
  const s = parts.join(" | ");
  return s.length > 280 ? `${s.slice(0, 277)}...` : s;
}

function hasDeliveryFailureTextNode(n: MergeEcNode): boolean {
  const blob = `${n.description ?? ""} ${n.status ?? ""}`;
  return DELIVERY_FAILURE_TEXT_RE.test(blob);
}

/**
 * 对每条轨迹扫描 `nodes`：按序归类 Ascan / Dscan / RDscan，并汇总派送失败信号。
 */
function buildComputedScanFacts(trajectories: MergeEcTrajectory[]): MergeEcPerTrackingScanFacts[] {
  const out: MergeEcPerTrackingScanFacts[] = [];
  for (const t of trajectories) {
    if (!t.trackingNo) continue;
    const nodes = t.nodes ?? [];
    if (t.summary?.carrierDataStatus === "unverified") {
      out.push({
        trackingNo: t.trackingNo,
        ascanEvents: [],
        dscanEvents: [],
        rdscanEvents: [],
        deliveryFailureLikely: false,
        dataSourceNote: "carrier_data_unverified",
      });
      continue;
    }
    if (nodes.length === 0) {
      const row: MergeEcPerTrackingScanFacts = {
        trackingNo: t.trackingNo,
        ascanEvents: [],
        dscanEvents: [],
        rdscanEvents: [],
        deliveryFailureLikely: t.summary?.winitBucket === "failed",
        dataSourceNote: "no_nodes",
      };
      if (row.deliveryFailureLikely) {
        row.deliveryFailureEvidence = ["winitBucket=failed (summary)"];
      }
      out.push(row);
      continue;
    }
    const ascanEvents: MergeEcScanEvent[] = [];
    const dscanEvents: MergeEcScanEvent[] = [];
    const rdscanEvents: MergeEcScanEvent[] = [];
    const evidence: string[] = [];
    if (t.summary?.winitBucket === "failed") {
      evidence.push("winitBucket=failed (summary)");
    }
    for (const n of nodes) {
      const kind = classifyScanType(n.status);
      if (kind === "rdscan") rdscanEvents.push(nodeToEvent(n));
      else if (kind === "dscan") dscanEvents.push(nodeToEvent(n));
      else if (kind === "ascan") ascanEvents.push(nodeToEvent(n));
      if (hasDeliveryFailureTextNode(n)) {
        const sn = snippetForEvidence(n);
        if (sn && !evidence.includes(sn)) {
          evidence.push(sn);
        }
      }
    }
    const limit = 8;
    const deliveryFailureLikely = evidence.length > 0;
    out.push({
      trackingNo: t.trackingNo,
      ascanEvents,
      dscanEvents,
      rdscanEvents,
      deliveryFailureLikely,
      deliveryFailureEvidence: deliveryFailureLikely ? evidence.slice(0, limit) : undefined,
    });
  }
  return out;
}

/** 遍历所有轨迹的所有节点，取最晚的一条节点时间作为 lastTrackingAt，并与 analysisClock 计算 noUpdateDays */
function computeLatestTrackingAt(
  trajectories: MergeEcTrajectory[],
  clock: AnalysisClock
): { lastTrackingAt?: string; noUpdateDays?: number } {
  let latestMs = -Infinity;
  let latestIso: string | undefined;

  for (const t of trajectories) {
    for (const n of t.nodes ?? []) {
      if (!n.time) continue;
      const ms = Date.parse(n.time);
      if (Number.isFinite(ms) && ms > latestMs) {
        latestMs = ms;
        latestIso = new Date(ms).toISOString();
      }
    }
  }

  if (latestIso === undefined) return {};

  const nowMs = Date.parse(clock.utcIso);
  if (!Number.isFinite(nowMs) || nowMs < latestMs) {
    // 时钟异常（早于最后轨迹时间），只返回 lastTrackingAt，不计算天数
    return { lastTrackingAt: latestIso };
  }

  const days = Math.floor((nowMs - latestMs) / 86400000);
  return { lastTrackingAt: latestIso, noUpdateDays: days };
}

function computeTypedEventTimes(
  trajectories: MergeEcTrajectory[]
): { carrierLastScanAt?: string; warehouseLastEventAt?: string } {
  let carrierMs = -Infinity;
  let warehouseMs = -Infinity;

  for (const t of trajectories) {
    for (const n of t.nodes ?? []) {
      if (!n.time) continue;
      const ms = Date.parse(n.time);
      if (!Number.isFinite(ms)) continue;
      if (classifyScanType(n.status) !== null) carrierMs = Math.max(carrierMs, ms);
      if (/^(SO|GTN|PKC|PAC|DIC|DLI)$/i.test(String(n.status ?? "").trim())) {
        warehouseMs = Math.max(warehouseMs, ms);
      }
    }
  }

  return {
    carrierLastScanAt: Number.isFinite(carrierMs) ? new Date(carrierMs).toISOString() : undefined,
    warehouseLastEventAt: Number.isFinite(warehouseMs) ? new Date(warehouseMs).toISOString() : undefined,
  };
}

function merge(input: {
  trajectories?: MergeEcTrajectory[];
  fetchMeta?: Record<string, unknown>;
  outTrajectoryText?: string;
  outTrackingIds?: string[];
  outOutboundOrderNos?: string[];
}): EnrichedContext {
  const trajectories = dedupeTrajectories(input.trajectories ?? []);
  const fetchMeta = input.fetchMeta;
  const trajectoryText = input.outTrajectoryText?.trim() || undefined;

  const trackingIds = [...new Set((input.outTrackingIds ?? []).filter(Boolean).map(String))];
  const outboundOrderNos = [...new Set((input.outOutboundOrderNos ?? []).filter(Boolean).map(String))];

  for (const t of trajectories) {
    if (t.trackingNo && !trackingIds.includes(t.trackingNo)) trackingIds.push(t.trackingNo);
    const s = t.summary;
    if (s?.orderNo && !outboundOrderNos.includes(s.orderNo)) outboundOrderNos.push(s.orderNo);
    if (s?.masterOrderNo && !outboundOrderNos.includes(s.masterOrderNo)) outboundOrderNos.push(s.masterOrderNo);
  }

  const computedScanFacts = buildComputedScanFacts(trajectories);
  const analysisClock = buildAnalysisClock();
  const trackingTime = computeLatestTrackingAt(trajectories, analysisClock);
  const typedEventTimes = computeTypedEventTimes(trajectories);

  return {
    trajectories,
    orderDetails: [],
    trajectoryText,
    trackingIds,
    outboundOrderNos,
    analysisClock,
    fetchMeta,
    carrierHints: buildCarrierHints(trajectories),
    computedScanFacts,
    ...trackingTime,
    ...typedEventTimes,
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const enrichedContext = merge({
    trajectories: params.trajectories as MergeEcTrajectory[] | undefined,
    fetchMeta: params.fetchMeta as Record<string, unknown> | undefined,
    outTrajectoryText: params.outTrajectoryText as string | undefined,
    outTrackingIds: params.outTrackingIds as string[] | undefined,
    outOutboundOrderNos: params.outOutboundOrderNos as string[] | undefined,
  });
  return { enrichedContext };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-enriched-context")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
