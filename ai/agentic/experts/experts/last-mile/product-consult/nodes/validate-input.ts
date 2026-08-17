/**
 * 节点：validate-input — 校验入参、解析国家码、提取商品信息、确定知识加载范围
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 【输入】`params` 字段（均为可选）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | customerIntent | string | 用户意图 |
 * | country | string | 目的国 ISO2 |
 * | destinationCountry | string | 同 country |
 * | goodsType | string | 商品类型描述 |
 * | goodsWeight | string | 商品重量（如 5kg） |
 * | goodsDimensions | string | 商品尺寸（如 30x20x10cm） |
 * | enrichedContext | object | 上游合并上下文 |
 * | inputContext | object | 链式上下文 |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | valid | boolean | 是否通过校验 |
 * | error | string | 仅当 valid===false |
 * | countryResolved | string | ISO2 国家码 |
 * | countrySource | string | 国家解析来源 |
 * | goodsInfo | object | 商品信息 |
 * | kbScope | string | 知识加载范围 |
 * | enrichedContext | object | 含 analysisClock |
 * | inputContext | object | 默认 {} |
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

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeCountryCode(s: string): string | undefined {
  const u = s.trim().toUpperCase();
  if (u === "GB" || u === "UNITED KINGDOM" || u === "GREAT BRITAIN") return "UK";
  if (u === "USA" || u === "UNITED STATES") return "US";
  if (u === "DEU" || u === "GERMANY") return "DE";
  if (u === "CAN" || u === "CANADA") return "CA";
  if (u === "AUS" || u === "AUSTRALIA") return "AU";
  if (/^[A-Z]{2}$/.test(u)) return u;
  return undefined;
}

function extractCountry(params: Record<string, unknown>): { countryResolved: string; countrySource: string } {
  const tryStr = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? normalizeCountryCode(v) : undefined;

  let c =
    tryStr(params.country) ??
    tryStr(params.destinationCountry);
  if (c) return { countryResolved: c, countrySource: "param" };

  const ec = params.enrichedContext;
  if (ec && typeof ec === "object" && !Array.isArray(ec)) {
    const o = ec as Record<string, unknown>;
    c =
      tryStr(o.country) ??
      tryStr(o.destinationCountry) ??
      tryStr(o.destinationRegion) ??
      tryStr(o.countryCode);
    if (c) return { countryResolved: c, countrySource: "enrichedContext" };
  }
  return { countryResolved: "", countrySource: "" };
}

interface GoodsInfo {
  type: string;
  weight: string;
  dimensions: string;
}

function extractGoodsInfo(params: Record<string, unknown>): GoodsInfo {
  return {
    type: isNonEmptyString(params.goodsType) ? String(params.goodsType).trim() : "",
    weight: isNonEmptyString(params.goodsWeight) ? String(params.goodsWeight).trim() : "",
    dimensions: isNonEmptyString(params.goodsDimensions) ? String(params.goodsDimensions).trim() : "",
  };
}

const SUPPORTED_COUNTRIES = ["US", "UK", "DE", "AU", "CA"];

function determineKbScope(countryResolved: string): string {
  if (!countryResolved) return "index";
  if (!SUPPORTED_COUNTRIES.includes(countryResolved)) return "index";
  return `delivery-${countryResolved.toLowerCase()}`;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const customerIntent = isNonEmptyString(params.customerIntent) ? String(params.customerIntent).trim() : "";
  const { countryResolved, countrySource } = extractCountry(params);
  const goodsInfo = extractGoodsInfo(params);
  const enrichedContext = withAnalysisClock(params.enrichedContext);
  const inputContext = params.inputContext ?? {};
  const kbScope = determineKbScope(countryResolved);

  const hasIntent = customerIntent.length > 0;
  const hasCountry = countryResolved.length > 0;
  const hasGoods = goodsInfo.type || goodsInfo.weight || goodsInfo.dimensions;

  const valid = hasIntent || hasCountry || hasGoods;

  return valid
    ? { valid: true, customerIntent, countryResolved, countrySource, goodsInfo, kbScope, enrichedContext, inputContext }
    : {
        valid: false,
        error: "至少提供 customerIntent、country/destinationCountry 或商品信息之一",
        customerIntent,
        countryResolved,
        countrySource,
        goodsInfo,
        kbScope,
        enrichedContext,
        inputContext,
      };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => { console.error(e); process.exit(1); });
}
