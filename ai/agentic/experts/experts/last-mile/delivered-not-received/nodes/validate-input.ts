/**
 * 节点：validate-input — 校验妥投未收到专家入参是否足以启动分析
 * FaaS 单文件闭环，无外部 import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】params：query, trackingIds, outboundOrderNos, customerIntent, enrichedContext, claimChannelKnown, inputContext
 * 【输出】原字段透传；valid 表示至少有一种事实来源；error 为校验失败说明。`enrichedContext` **始终**合并 **analysisClock**（当前 UTC，覆盖上游旧值）。
 * enrichedContext 可为编排侧「域索引」，本节点取 `last-mile/delivery-status` 最新一条并展开；亦可为旧版扁平对象。
 */

const EC_IDX_KEY_DS_DNR = "last-mile/delivery-status";

function extractDomainEntryDnr(ecIndex: unknown, domainKey: string): Record<string, unknown> {
  if (!ecIndex || typeof ecIndex !== "object" || Array.isArray(ecIndex)) return {};
  const entries = (ecIndex as Record<string, unknown>)[domainKey];
  if (!Array.isArray(entries) || entries.length === 0) return {};
  const last = entries[entries.length - 1];
  if (!last || typeof last !== "object" || Array.isArray(last)) return {};
  const { _meta: _m, ...rest } = last as Record<string, unknown>;
  return rest;
}

function resolveFlatEnrichedContextDnr(raw: unknown): Record<string, unknown> {
  const fromDomain = extractDomainEntryDnr(raw, EC_IDX_KEY_DS_DNR);
  if (Object.keys(fromDomain).length > 0) return fromDomain;
  if (raw !== undefined && raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const looksLikeDomainIndex = Object.keys(o).some((k) => k.includes("/") && Array.isArray(o[k]));
    if (looksLikeDomainIndex) return {};
    return { ...o };
  }
  return {};
}

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

/** 每次调用写入当前 UTC 参考时钟，供 LLM 冷静期等与「此刻」比较 */
function withAnalysisClock(ec: unknown): Record<string, unknown> {
  const base =
    ec !== undefined && ec !== null && typeof ec === "object" && !Array.isArray(ec)
      ? { ...(ec as Record<string, unknown>) }
      : {};
  base.analysisClock = buildAnalysisClock();
  return base;
}

type DnrEligibility = "eligible" | "ineligible" | "unknown";

interface DnrGuardResult {
  eligibility: DnrEligibility;
  hasScanFacts: boolean;
  hasAscan: boolean;
  hasDscan: boolean;
  hasRdscan: boolean;
  evidenceSource: string;
  reason: string;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const text = raw.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return raw;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return raw;
  }
}

function previousOutputScanFacts(inputContext: unknown): unknown[] | null {
  const context = asRecord(inputContext);
  if (!context) return null;
  const previous = asRecord(parseMaybeJson(context.previousOutput));
  if (!previous) return null;
  const result = asRecord(previous.result);
  const structured = asRecord(previous.structured) ?? asRecord(result?.structured);
  return structured && Array.isArray(structured.scanFacts) ? structured.scanFacts : null;
}

function eventCount(row: Record<string, unknown>, key: string): number {
  return Array.isArray(row[key]) ? (row[key] as unknown[]).length : 0;
}

function buildDnrGuard(enrichedContext: Record<string, unknown>, inputContext: unknown): DnrGuardResult {
  const computed = Array.isArray(enrichedContext.computedScanFacts)
    ? enrichedContext.computedScanFacts
    : null;
  const previous = previousOutputScanFacts(inputContext);
  const scanFacts = computed ?? previous;
  const source = computed ? "enrichedContext.computedScanFacts" : previous ? "inputContext.previousOutput.structured.scanFacts" : "";

  if (scanFacts && scanFacts.length > 0) {
    let hasAscan = false;
    let hasDscan = false;
    let hasRdscan = false;
    for (const item of scanFacts) {
      const row = asRecord(item);
      if (!row) continue;
      hasAscan = hasAscan || eventCount(row, "ascanEvents") > 0;
      hasDscan = hasDscan || eventCount(row, "dscanEvents") > 0;
      hasRdscan = hasRdscan || eventCount(row, "rdscanEvents") > 0;
    }
    if (hasDscan) {
      return {
        eligibility: "eligible",
        hasScanFacts: true,
        hasAscan,
        hasDscan,
        hasRdscan,
        evidenceSource: source,
        reason: "结构化扫描事实包含 Dscan，可进入妥投未收到判断",
      };
    }
    return {
      eligibility: "ineligible",
      hasScanFacts: true,
      hasAscan,
      hasDscan: false,
      hasRdscan,
      evidenceSource: source,
      reason: hasRdscan
        ? "结构化扫描事实仅包含 RDscan（退回妥投），不代表买家已妥投"
        : "结构化扫描事实明确无 Dscan，不属于妥投未收到",
    };
  }

  const deliveredEvent = asRecord(enrichedContext.deliveredEvent);
  if (deliveredEvent && Object.keys(deliveredEvent).length > 0) {
    return {
      eligibility: "eligible",
      hasScanFacts: false,
      hasAscan: false,
      hasDscan: true,
      hasRdscan: false,
      evidenceSource: "enrichedContext.deliveredEvent",
      reason: "上游提供了明确的结构化妥投事件",
    };
  }

  return {
    eligibility: "unknown",
    hasScanFacts: false,
    hasAscan: false,
    hasDscan: false,
    hasRdscan: false,
    evidenceSource: "",
    reason: "缺少可核验的 Dscan 或结构化妥投事件，不能仅凭用户表述认定妥投",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const flatEc = resolveFlatEnrichedContextDnr(params.enrichedContext);
  const hasEnriched = Object.keys(flatEc).length > 0;
  const hasIds = trackingIds.length > 0 || outboundOrderNos.length > 0;
  const ci = String(params.customerIntent ?? "").trim();
  const q = String(params.query ?? "").trim();
  const valid = hasIds || hasEnriched || ci.length > 0 || q.length > 0;
  const errMsg = "请至少提供 trackingIds、outboundOrderNos、enrichedContext、customerIntent 或 query 之一";
  const customerIntentOut = valid ? ci : `[输入校验] ${errMsg}`.trim();
  const enrichedContext = withAnalysisClock(hasEnriched ? flatEc : {});
  const dnrGuard = buildDnrGuard(enrichedContext, params.inputContext);

  const ret = {
    valid,
    error: valid ? "" : errMsg,
    query: q,
    trackingIds,
    outboundOrderNos,
    customerIntent: customerIntentOut,
    enrichedContext,
    claimChannelKnown: params.claimChannelKnown,
    inputContext: params.inputContext && typeof params.inputContext === "object" ? params.inputContext : {},
    dnrGuard,
  };
  return ret;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
