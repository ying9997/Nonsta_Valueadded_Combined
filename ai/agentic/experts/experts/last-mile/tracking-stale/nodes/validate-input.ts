/**
 * 节点：validate-input — 校验轨迹长时间未更新专家入参
 * FaaS 单文件闭环，无外部 import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】params：query, trackingIds, outboundOrderNos, customerIntent, enrichedContext, inputContext
 * 【输出】原字段透传；valid 表示至少有一种事实入口；error 为校验失败说明。
 * enrichedContext 可为编排侧「域索引」（见 design-spec §8），本节点取 `last-mile/delivery-status` 最新一条快照并展开为扁平对象；亦可为旧版扁平对象。
 * enrichedContext 始终补齐 analysisClock（当前 UTC）。
 */

/** 编排侧域索引键：manifest.domain + "/" + manifest.id（本文件专用命名，避免与其他专家节点 TS 全局合并冲突） */
const EC_IDX_KEY_DS_STALE = "last-mile/delivery-status";
const EC_IDX_KEY_OUTBOUND_OS = "outbound/outbound-order-status";

function extractDomainEntryStale(ecIndex: unknown, domainKey: string): Record<string, unknown> {
  if (!ecIndex || typeof ecIndex !== "object" || Array.isArray(ecIndex)) return {};
  const entries = (ecIndex as Record<string, unknown>)[domainKey];
  if (!Array.isArray(entries) || entries.length === 0) return {};
  const last = entries[entries.length - 1];
  if (!last || typeof last !== "object" || Array.isArray(last)) return {};
  const { _meta: _m, ...rest } = last as Record<string, unknown>;
  return rest;
}

/** 顶层非域索引字段（如 hasClaimService、isPlatformWaybill），与域快照合并时保留 */
function extractTopLevelFactFieldsStale(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.includes("/") && Array.isArray(v)) continue;
    out[k] = v;
  }
  return out;
}

/** 从 outbound-order-status 域快照或 prunedOrderData 判定平台面单（3PL） */
function detectIsPlatformWaybillStale(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  if (o.isPlatformWaybill === true) return true;

  const entries = o[EC_IDX_KEY_OUTBOUND_OS];
  if (!Array.isArray(entries)) return false;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    if (e.isPlatformWaybill === true) return true;
    const pruned = e.prunedOrderData;
    if (!pruned || typeof pruned !== "object" || Array.isArray(pruned)) continue;
    const list = (pruned as Record<string, unknown>).list;
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && typeof item === "object" && !Array.isArray(item) && (item as Record<string, unknown>).isPlatformWaybill === true) {
        return true;
      }
    }
  }
  return false;
}

/** 上游 previousOutput.analysis 已明确 3PL / 平台面单时兜底标记 */
function detectPlatformWaybillFromPreviousOutputStale(inputContext: unknown): boolean {
  if (!inputContext || typeof inputContext !== "object" || Array.isArray(inputContext)) return false;
  const prev = (inputContext as Record<string, unknown>).previousOutput;
  if (!prev || typeof prev !== "object" || Array.isArray(prev)) return false;
  const analysis = String((prev as Record<string, unknown>).analysis ?? "");
  return /3PL|平台面单/i.test(analysis);
}

/** 域快照与顶层事实字段合并；兼容旧版纯扁平 enrichedContext */
function resolveFlatEnrichedContextStale(raw: unknown): Record<string, unknown> {
  const fromDomain = extractDomainEntryStale(raw, EC_IDX_KEY_DS_STALE);
  const fromOutbound = extractDomainEntryStale(raw, EC_IDX_KEY_OUTBOUND_OS);
  if (Object.keys(fromDomain).length > 0) {
    const topFacts =
      raw !== undefined && raw !== null && typeof raw === "object" && !Array.isArray(raw)
        ? extractTopLevelFactFieldsStale(raw as Record<string, unknown>)
        : {};
    return { ...fromOutbound, ...topFacts, ...fromDomain };
  }
  if (raw !== undefined && raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const looksLikeDomainIndex = Object.keys(o).some((k) => k.includes("/") && Array.isArray(o[k]));
    if (looksLikeDomainIndex) return {};
    return { ...o };
  }
  return {};
}

interface StaleOutboundOrderFact {
  outboundOrderNo?: string;
  effectiveProductCode?: string;
  effectiveProductName?: string;
  isPlatformWaybill?: boolean;
}

function selectOutboundOrderFactStale(
  ec: Record<string, unknown>,
  outboundOrderNos: string[]
): StaleOutboundOrderFact | undefined {
  const facts = Array.isArray(ec.orderFacts) ? ec.orderFacts : [];
  const rows = facts.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
  if (rows.length === 0) return undefined;
  const wanted = new Set(outboundOrderNos.map((item) => item.toUpperCase()));
  const selected =
    rows.find((item) => wanted.has(String(item.outboundOrderNo ?? "").trim().toUpperCase())) ??
    (rows.length === 1 ? rows[0] : undefined);
  if (!selected) return undefined;
  return {
    outboundOrderNo: String(selected.outboundOrderNo ?? "").trim() || undefined,
    effectiveProductCode: String(selected.effectiveProductCode ?? "").trim() || undefined,
    effectiveProductName: String(selected.effectiveProductName ?? "").trim() || undefined,
    isPlatformWaybill: selected.isPlatformWaybill === true,
  };
}

/** 当前仓库权威赔付表：美国 Winit Fulfillment 7 日达（含分区/定制变体）支持丢失类代客索赔。 */
function isKnownUsSevenDayClaimProductStale(name: unknown): boolean {
  return /Winit\s*Fulfillment\s*-?\s*7日达/i.test(String(name ?? ""));
}

function applyDeterministicClaimFactsStale(
  ec: Record<string, unknown>,
  outboundOrderNos: string[]
): Record<string, unknown> {
  const out = { ...ec };
  const orderFact = selectOutboundOrderFactStale(out, outboundOrderNos);
  if (orderFact) {
    out.effectiveProductCode = orderFact.effectiveProductCode;
    out.effectiveProductName = orderFact.effectiveProductName;
    if (orderFact.isPlatformWaybill === true) out.isPlatformWaybill = true;
  }

  if (out.isPlatformWaybill === true) {
    out.hasClaimService = false;
    out.claimFactSource = "platform_waybill";
    return out;
  }
  if (typeof out.hasClaimService === "boolean") {
    out.claimFactSource = "upstream_explicit";
    return out;
  }
  if (isKnownUsSevenDayClaimProductStale(out.effectiveProductName)) {
    out.hasClaimService = true;
    out.isDomestic = true;
    out.claimFactSource = "policy_us_fulfillment_7day";
  }
  return out;
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
      "参考时钟为服务端 UTC（ISO8601）。轨迹节点时间可能为承运商本地时间，与当前时刻比较时请先统一时区。",
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
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];

  const query = String(params.query ?? "").trim();
  const customerIntent = String(params.customerIntent ?? "").trim();

  let flatEc = resolveFlatEnrichedContextStale(params.enrichedContext);
  const inputContext =
    params.inputContext && typeof params.inputContext === "object" && !Array.isArray(params.inputContext)
      ? params.inputContext
      : {};
  if (
    detectIsPlatformWaybillStale(params.enrichedContext) ||
    detectPlatformWaybillFromPreviousOutputStale(inputContext)
  ) {
    flatEc.isPlatformWaybill = true;
    flatEc.hasClaimService = false;
  }
  flatEc = applyDeterministicClaimFactsStale(flatEc, outboundOrderNos);
  const hasEnriched = Object.keys(flatEc).length > 0;

  const hasIds = trackingIds.length > 0 || outboundOrderNos.length > 0;
  const valid = hasIds || hasEnriched || query.length > 0 || customerIntent.length > 0;
  const error = valid
    ? ""
    : "请至少提供 trackingIds、outboundOrderNos、enrichedContext、customerIntent 或 query 之一";

  return {
    valid,
    error,
    query,
    trackingIds,
    outboundOrderNos,
    customerIntent: valid ? customerIntent : `[输入校验] ${error}`,
    enrichedContext: withAnalysisClock(hasEnriched ? flatEc : {}),
    inputContext,
  };
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
