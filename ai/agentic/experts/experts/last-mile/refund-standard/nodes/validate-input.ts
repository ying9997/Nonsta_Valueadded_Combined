/**
 * 节点：validate-input — 校验入参并解析国家码（供 load-refund-knowledge 分片）
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 【输入】`params` 字段（均为可选；但至少需满足下方「有效」条件之一）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | scenario | string | 场景简述 |
 * | customerIntent | string | 用户意图 / 原始问句 |
 * | trackingIds | string[] | 运单号列表 |
 * | outboundOrderNos | string[] | 出库单号列表 |
 * | enrichedContext | Record<string, unknown> | 上游合并上下文（判空：非 null 且至少一个自有键） |
 * | inputContext | unknown | 链式上下文（原样归入输出；无效时兜底为 {}） |
 * | country | string | 目的国 / 分片国（支持 GB→UK、USA→US 等归一化） |
 * | destinationCountry | string | 同 manifest「目的地国」语义，与 country 择一 |
 * | destinationRegion | string | 部分上游用区域字段传国家码，参与解析 |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | valid | boolean | 是否通过校验 |
 * | error | string | 仅当 valid===false：错误说明 |
 * | scenario | string | 归一后场景（trim；无效时原样或 ""） |
 * | customerIntent | string | 归一后意图 |
 * | trackingIds | string[] | 非空字符串元素 |
 * | outboundOrderNos | string[] | 非空字符串元素 |
 * | enrichedContext | Record<string, unknown> | **输出前合并** `analysisClock`（当前 UTC）；默认 `{}` 也会带时钟 |
 * | inputContext | Record<string, unknown> | 默认 {} |
 * | countryResolved | string | ISO2 等归一码（如 US、DE、UK、DC）；无法解析时为 "" |
 * | countrySource | string | `""` \| `"param"` \| `"enrichedContext"`：国家解析来源 |
 */

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

function withAnalysisClock(ec: unknown): Record<string, unknown> {
  const base =
    ec !== undefined && ec !== null && typeof ec === "object" && !Array.isArray(ec)
      ? { ...(ec as Record<string, unknown>) }
      : {};
  base.analysisClock = buildAnalysisClock();
  return base;
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeCountryCode(s: string): string | undefined {
  const u = s.trim().toUpperCase();
  if (u === "GB" || u === "UNITED KINGDOM" || u === "GREAT BRITAIN") return "UK";
  if (u === "USA" || u === "UNITED STATES") return "US";
  if (u === "DEU" || u === "GERMANY") return "DE";
  if (u === "CAN" || u === "CANADA") return "CA";
  if (u === "BEL" || u === "BELGIUM") return "BE";
  if (u === "DC") return "DC";
  if (/^[A-Z]{2}$/.test(u)) return u;
  return undefined;
}

function extractCountryForShard(params: Record<string, unknown>): { countryResolved: string; countrySource: string } {
  const tryStr = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? normalizeCountryCode(v) : undefined;

  let c =
    tryStr(params.countryResolved) ??
    tryStr(params.country) ??
    tryStr(params.destinationCountry) ??
    tryStr(params.destinationRegion);
  if (c) {
    return { countryResolved: c, countrySource: "param" };
  }
  const ec = params.enrichedContext;
  if (ec && typeof ec === "object" && !Array.isArray(ec)) {
    const o = ec as Record<string, unknown>;
    c =
      tryStr(o.country) ??
      tryStr(o.destinationCountry) ??
      tryStr(o.destinationRegion) ??
      tryStr(o.countryCode);
    if (c) {
      return { countryResolved: c, countrySource: "enrichedContext" };
    }
  }
  return { countryResolved: "", countrySource: "" };
}

function enrichedContextHasContent(v: unknown): boolean {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.keys(v as object).length > 0;
}

type ScenarioApplicability = "applicable" | "inapplicable" | "not_checked";

interface RefundScenarioGuard {
  scenarioApplicability: ScenarioApplicability;
  isOrderSpecific: boolean;
  isDnrRequest: boolean;
  hasScanFacts: boolean;
  hasDscan: boolean;
  reason: string;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

function latestDomainEntry(raw: unknown, key: string): Record<string, unknown> | null {
  const index = asRecord(raw);
  const entries = index?.[key];
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return asRecord(entries[entries.length - 1]);
}

function extractScanFacts(raw: unknown): unknown[] | null {
  const direct = asRecord(raw);
  const delivery = latestDomainEntry(raw, "last-mile/delivery-status") ?? direct;
  return delivery && Array.isArray(delivery.computedScanFacts)
    ? delivery.computedScanFacts
    : null;
}

function buildScenarioGuard(
  scenario: string,
  customerIntent: string,
  trackingIds: string[],
  outboundOrderNos: string[],
  enrichedContext: unknown
): RefundScenarioGuard {
  const isOrderSpecific = trackingIds.length > 0 || outboundOrderNos.length > 0;
  const isDnrRequest = /(妥投未收到|签收.*未收到|已妥投.*未收到|\bDNR\b|delivered.*not\s+received)/i.test(
    `${scenario} ${customerIntent}`
  );
  const scanFacts = extractScanFacts(enrichedContext);
  let hasDscan = false;
  if (scanFacts) {
    for (const item of scanFacts) {
      const row = asRecord(item);
      if (row && Array.isArray(row.dscanEvents) && row.dscanEvents.length > 0) {
        hasDscan = true;
        break;
      }
    }
  }

  if (isOrderSpecific && isDnrRequest && scanFacts) {
    return hasDscan
      ? {
          scenarioApplicability: "applicable",
          isOrderSpecific,
          isDnrRequest,
          hasScanFacts: true,
          hasDscan: true,
          reason: "具体订单的结构化扫描事实包含 Dscan，可匹配妥投未收到条款",
        }
      : {
          scenarioApplicability: "inapplicable",
          isOrderSpecific,
          isDnrRequest,
          hasScanFacts: true,
          hasDscan: false,
          reason: "具体订单的结构化扫描事实明确无 Dscan，不适用妥投未收到条款",
        };
  }

  return {
    scenarioApplicability: "not_checked",
    isOrderSpecific,
    isDnrRequest,
    hasScanFacts: Boolean(scanFacts),
    hasDscan,
    reason: isOrderSpecific && isDnrRequest
      ? "缺少结构化扫描事实，不能判断具体订单是否适用妥投未收到条款"
      : "非具体订单 DNR 场景，不启用订单事实拦截",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const scenario = isNonEmptyString(params.scenario) ? String(params.scenario).trim() : "";
  const customerIntent = isNonEmptyString(params.customerIntent) ? String(params.customerIntent).trim() : "";
  const trackingIds = ((params.trackingIds as string[]) ?? []).filter((t) => typeof t === "string" && t.trim());
  const outboundOrderNos = ((params.outboundOrderNos as string[]) ?? []).filter(
    (o) => typeof o === "string" && o.trim()
  );
  const enrichedContext = params.enrichedContext;
  const inputContext = params.inputContext;
  const { countryResolved, countrySource } = extractCountryForShard(params);
  const scenarioGuard = buildScenarioGuard(
    scenario,
    customerIntent,
    trackingIds,
    outboundOrderNos,
    enrichedContext
  );

  const hasScenario = scenario.length > 0;
  const hasIntent = customerIntent.length > 0;
  const hasEnriched = enrichedContextHasContent(enrichedContext);
  const hasTracking = trackingIds.length > 0;
  const hasOrder = outboundOrderNos.length > 0;

  const valid =
    hasScenario || hasIntent || hasEnriched || hasTracking || hasOrder;

  const ret = valid
    ? {
        valid: true,
        scenario,
        customerIntent,
        trackingIds,
        outboundOrderNos,
        enrichedContext: withAnalysisClock(enrichedContext ?? {}),
        inputContext: inputContext ?? {},
        countryResolved,
        countrySource,
        scenarioGuard,
      }
    : {
        valid: false,
        error:
          "至少提供 scenario、customerIntent、enrichedContext（非空对象）、trackingIds 或 outboundOrderNos 之一",
        scenario: params.scenario ?? "",
        customerIntent: params.customerIntent ?? "",
        trackingIds: params.trackingIds ?? [],
        outboundOrderNos: params.outboundOrderNos ?? [],
        enrichedContext: withAnalysisClock(enrichedContext ?? {}),
        inputContext: inputContext ?? {},
        countryResolved,
        countrySource,
        scenarioGuard,
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
