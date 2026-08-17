/**
 * 节点：derive-stale-facts — 确定性计算停更天数阈值（3天/10天）
 * FaaS 单文件闭环，无外部 import。
 *
 * 输入：valid, error, query, trackingIds, outboundOrderNos, customerIntent, enrichedContext, inputContext
 * 输出：透传 query/trackingIds/outboundOrderNos/customerIntent/inputContext，并回写 enrichedContext.staleFacts
 */

interface StaleFacts {
  source: "upstream_noUpdateDays" | "computed_lastTrackingAt" | "unavailable";
  computedNoUpdateDays?: number;
  isOver3Days?: boolean;
  isOver10Days?: boolean;
  thresholdRule: "strict_gt";
  calcStatus: "ok" | "insufficient_data" | "invalid_date";
  calcNote: string;
  /** 当 computedScanFacts 中存在 Dscan/RDscan 且其时间与 lastTrackingAt 吻合时为 true；此时 isOver3Days / isOver10Days 被强制置为 false */
  isDelivered?: boolean;
  /** 3PL / 平台面单：此类订单不支持索赔，与停更天数无关 */
  isPlatformWaybill?: boolean;
  scanStateSummary?: "all_ascan" | "all_no_ascan" | "all_delivered" | "mixed" | "unknown";
  scanStates?: Array<{ trackingNo: string; state: "ascan" | "no_ascan" | "delivered" | "unknown" }>;
}

function asFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseMillis(v: unknown): number | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : undefined;
}

function clampNonNegativeInt(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

/**
 * 防御性检查：若 computedScanFacts 中存在 Dscan / RDscan 妥投事件，
 * 且其时间与停更判定的参考时间（lastTrackingAt 或由 noUpdateDays 反推）接近（< 24h），
 * 则认为轨迹已妥投，不应按停更处理。
 */
function checkDeliverySuppression(ec: Record<string, unknown>): { isDelivered: boolean; deliveryNote?: string } {
  const scanFacts = ec.computedScanFacts;
  if (!Array.isArray(scanFacts) || scanFacts.length === 0) return { isDelivered: false };

  // 收集所有 Dscan / RDscan 事件，找到最晚的那条
  let latestDeliveryMs = -Infinity;
  let deliveryType = "";
  for (const sf of scanFacts) {
    if (!sf || typeof sf !== "object") continue;
    const s = sf as Record<string, unknown>;
    for (const key of ["dscanEvents", "rdscanEvents"]) {
      const events = s[key];
      if (!Array.isArray(events)) continue;
      for (const ev of events) {
        if (!ev || typeof ev !== "object") continue;
        const time = (ev as Record<string, unknown>).time;
        if (typeof time !== "string") continue;
        const ms = Date.parse(time);
        if (Number.isFinite(ms) && ms > latestDeliveryMs) {
          latestDeliveryMs = ms;
          deliveryType = key === "rdscanEvents" ? "RDscan（退回妥投）" : "Dscan（妥投）";
        }
      }
    }
  }

  if (latestDeliveryMs < 0) return { isDelivered: false };

  // 找出停更判定所用的参考时间
  let referenceMs: number | undefined;

  const lastTrackingAtMs = parseMillis(ec.lastTrackingAt);
  if (lastTrackingAtMs !== undefined) {
    referenceMs = lastTrackingAtMs;
  } else {
    // 没有 lastTrackingAt 时，尝试从 noUpdateDays + analysisClock 反推
    const noUpdateDays = asFiniteNumber(ec.noUpdateDays);
    const clock = ec.analysisClock && typeof ec.analysisClock === "object" && !Array.isArray(ec.analysisClock)
      ? (ec.analysisClock as Record<string, unknown>)
      : {};
    const nowMs = parseMillis(clock.utcIso);
    if (noUpdateDays !== undefined && nowMs !== undefined) {
      referenceMs = nowMs - noUpdateDays * 86400000;
    }
  }

  if (referenceMs === undefined) return { isDelivered: false };

  const diffHours = Math.abs(referenceMs - latestDeliveryMs) / 3600000;
  const ONE_DAY_MS = 86400000;
  if (Math.abs(referenceMs - latestDeliveryMs) < ONE_DAY_MS) {
    return {
      isDelivered: true,
      deliveryNote:
        `检测到最新${deliveryType}事件时间与停更参考时间接近（差约 ${Math.round(diffHours)}h < 24h），` +
        `轨迹已妥投，豁免停更判定。`,
    };
  }

  return { isDelivered: false };
}

function buildFacts(ec: Record<string, unknown>): StaleFacts {
  const noUpdateDays = asFiniteNumber(ec.noUpdateDays);
  if (noUpdateDays !== undefined) {
    const d = clampNonNegativeInt(noUpdateDays);
    const base: StaleFacts = {
      source: "upstream_noUpdateDays",
      computedNoUpdateDays: d,
      isOver3Days: d > 3,
      isOver10Days: d > 10,
      thresholdRule: "strict_gt",
      calcStatus: "ok",
      calcNote: "使用上游 noUpdateDays 作为阈值判断依据（strict > 3 / > 10）。",
    };
    const delivery = checkDeliverySuppression(ec);
    if (delivery.isDelivered) {
      return {
        ...base,
        isDelivered: true,
        isOver3Days: false,
        isOver10Days: false,
        computedNoUpdateDays: 0,
        calcNote: (base.calcNote + " " + (delivery.deliveryNote ?? "")).trim(),
      };
    }
    return { ...base, isDelivered: false };
  }

  const lastTrackingAt = parseMillis(ec.lastTrackingAt);
  const analysisClock =
    ec.analysisClock && typeof ec.analysisClock === "object" && !Array.isArray(ec.analysisClock)
      ? (ec.analysisClock as Record<string, unknown>)
      : {};
  const nowMs = parseMillis(analysisClock.utcIso);

  if (lastTrackingAt === undefined || nowMs === undefined) {
    return {
      source: "unavailable",
      thresholdRule: "strict_gt",
      calcStatus: "insufficient_data",
      calcNote: "缺少可计算字段（noUpdateDays 或 lastTrackingAt + analysisClock.utcIso）。",
    };
  }

  if (nowMs < lastTrackingAt) {
    return {
      source: "computed_lastTrackingAt",
      thresholdRule: "strict_gt",
      calcStatus: "invalid_date",
      calcNote: "analysisClock.utcIso 早于 lastTrackingAt，日期数据异常。",
    };
  }

  const days = clampNonNegativeInt((nowMs - lastTrackingAt) / 86400000);
  const base: StaleFacts = {
    source: "computed_lastTrackingAt",
    computedNoUpdateDays: days,
    isOver3Days: days > 3,
    isOver10Days: days > 10,
    thresholdRule: "strict_gt",
    calcStatus: "ok",
    calcNote: "由 lastTrackingAt 与 analysisClock.utcIso 计算停更天数（strict > 3 / > 10）。",
  };
  const delivery = checkDeliverySuppression(ec);
  if (delivery.isDelivered) {
    return {
      ...base,
      isDelivered: true,
      isOver3Days: false,
      isOver10Days: false,
      computedNoUpdateDays: 0,
      calcNote: (base.calcNote + " " + (delivery.deliveryNote ?? "")).trim(),
    };
  }
  return { ...base, isDelivered: false };
}

type ScanStateKind = "ascan" | "no_ascan" | "delivered" | "unknown";

function eventCount(row: Record<string, unknown>, key: string): number {
  return Array.isArray(row[key]) ? (row[key] as unknown[]).length : 0;
}

function statePriority(state: ScanStateKind): number {
  if (state === "delivered") return 4;
  if (state === "ascan") return 3;
  if (state === "no_ascan") return 2;
  return 1;
}

function scanStateFromRow(row: Record<string, unknown>): ScanStateKind {
  if (eventCount(row, "dscanEvents") > 0 || eventCount(row, "rdscanEvents") > 0) return "delivered";
  if (eventCount(row, "ascanEvents") > 0) return "ascan";
  const hasStructuredArrays = ["ascanEvents", "dscanEvents", "rdscanEvents"].every((key) => Array.isArray(row[key]));
  if (hasStructuredArrays && row.dataSourceNote !== "no_nodes") return "no_ascan";
  return "unknown";
}

function buildScanStateFacts(
  ec: Record<string, unknown>,
  trackingIds: string[]
): Pick<StaleFacts, "scanStateSummary" | "scanStates"> {
  const byTracking = new Map<string, { trackingNo: string; state: ScanStateKind }>();
  const rows = Array.isArray(ec.computedScanFacts) ? ec.computedScanFacts : [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const trackingNo = String(row.trackingNo ?? "").trim();
    if (!trackingNo) continue;
    const state = scanStateFromRow(row);
    const key = trackingNo.toUpperCase();
    const current = byTracking.get(key);
    if (!current || statePriority(state) > statePriority(current.state)) {
      byTracking.set(key, { trackingNo, state });
    }
  }

  let fallbackSummary: StaleFacts["scanStateSummary"];
  if (byTracking.size === 0 && typeof ec.ascanDetected === "boolean") {
    const state: ScanStateKind = ec.ascanDetected ? "ascan" : "no_ascan";
    fallbackSummary = state === "ascan" ? "all_ascan" : "all_no_ascan";
    for (const trackingNo of trackingIds) byTracking.set(trackingNo.toUpperCase(), { trackingNo, state });
  }

  for (const trackingNo of trackingIds) {
    const key = trackingNo.toUpperCase();
    if (!byTracking.has(key)) byTracking.set(key, { trackingNo, state: "unknown" });
  }

  const scanStates = [...byTracking.values()];
  const distinct = new Set(scanStates.map((item) => item.state));
  let scanStateSummary: StaleFacts["scanStateSummary"] = fallbackSummary ?? "unknown";
  if (distinct.size > 1) scanStateSummary = "mixed";
  else if (distinct.has("ascan")) scanStateSummary = "all_ascan";
  else if (distinct.has("no_ascan")) scanStateSummary = "all_no_ascan";
  else if (distinct.has("delivered")) scanStateSummary = "all_delivered";

  return { scanStateSummary, scanStates };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const ec =
    params.enrichedContext && typeof params.enrichedContext === "object" && !Array.isArray(params.enrichedContext)
      ? ({ ...(params.enrichedContext as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  ec.staleFacts = { ...buildFacts(ec), ...buildScanStateFacts(ec, trackingIds) };
  if (ec.isPlatformWaybill === true) {
    const sf = ec.staleFacts as StaleFacts;
    ec.staleFacts = { ...sf, isPlatformWaybill: true };
  }
  if (ec.claimFactSource === "policy_us_fulfillment_7day" && typeof ec.claimWindowStatus !== "string") {
    const days = (ec.staleFacts as StaleFacts).computedNoUpdateDays;
    if (typeof days === "number") {
      ec.claimWindowStatus = days < 11 ? "not_open_yet" : days <= 45 ? "in_window" : "out_of_window";
    }
  }

  return {
    query: String(params.query ?? "").trim(),
    trackingIds,
    outboundOrderNos: Array.isArray(params.outboundOrderNos)
      ? (params.outboundOrderNos as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : [],
    customerIntent: String(params.customerIntent ?? "").trim(),
    enrichedContext: ec,
    inputContext: params.inputContext && typeof params.inputContext === "object" ? params.inputContext : {},
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("derive-stale-facts")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
