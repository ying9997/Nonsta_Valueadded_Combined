/**
 * 节点：validate-input — 校验是否具备启动「承运商/自提点联系方式」分析的最小事实
 * FaaS 单文件闭环，无外部 import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】params：query, trackingIds, carrierCode, region, customerIntent, enrichedContext, inputContext
 * 【输出】透传；valid 表示至少有一种定位线索；enrichedContext 合并 analysisClock（UTC）。
 * enrichedContext 可为编排侧「域索引」，本节点取 `last-mile/delivery-status` 最新一条并展开；亦可为旧版扁平对象。
 */

const EC_IDX_KEY_DS_CC = "last-mile/delivery-status";

function extractDomainEntryCc(ecIndex: unknown, domainKey: string): Record<string, unknown> {
  if (!ecIndex || typeof ecIndex !== "object" || Array.isArray(ecIndex)) return {};
  const entries = (ecIndex as Record<string, unknown>)[domainKey];
  if (!Array.isArray(entries) || entries.length === 0) return {};
  const last = entries[entries.length - 1];
  if (!last || typeof last !== "object" || Array.isArray(last)) return {};
  const { _meta: _m, ...rest } = last as Record<string, unknown>;
  return rest;
}

function resolveFlatEnrichedContextCc(raw: unknown): Record<string, unknown> {
  const fromDomain = extractDomainEntryCc(raw, EC_IDX_KEY_DS_CC);
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
    note: "参考时钟为服务端 UTC（ISO8601）。",
  };
}

function withAnalysisClock(ec: unknown): Record<string, unknown> {
  const base =
    ec !== undefined && ec !== null && typeof ec === "object" && !Array.isArray(ec)
      ? { ...(ec as Record<string, unknown>) }
      : {};
  base.analysisClock = buildAnalysisClock();
  return base;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const carrierCode = String(params.carrierCode ?? "").trim();
  const region = String(params.region ?? "").trim();
  const ci = String(params.customerIntent ?? "").trim();
  const q = String(params.query ?? "").trim();
  const flatEc = resolveFlatEnrichedContextCc(params.enrichedContext);
  const hasEnriched = Object.keys(flatEc).length > 0;

  const hasIds = trackingIds.length > 0;
  const hasCarrier = carrierCode.length > 0;
  const hasRegion = region.length > 0;
  const hasText = ci.length > 0 || q.length > 0;

  const valid = hasIds || hasCarrier || hasRegion || hasEnriched || hasText;
  const errMsg =
    "请至少提供 trackingIds、carrierCode、region、enrichedContext、customerIntent 或 query 之一";
  const customerIntentOut = valid ? ci : `[输入校验] ${errMsg}`.trim();

  const ret = {
    valid,
    error: valid ? "" : errMsg,
    query: q,
    trackingIds,
    carrierCode,
    region,
    customerIntent: customerIntentOut,
    enrichedContext: withAnalysisClock(hasEnriched ? flatEc : {}),
    inputContext: params.inputContext && typeof params.inputContext === "object" ? params.inputContext : {},
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
