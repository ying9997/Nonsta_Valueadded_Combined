/**
 * 节点：validate-input — 校验入参、解析国家码、模糊匹配产品名、推断 kbScope
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 【输入】`params` 字段（均为可选；但至少需满足「有效」条件之一）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | query | string | 用户咨询原文；与 customerIntent 一并参与国家/产品线/产品名提取 |
 * | customerIntent | string | 业务意图摘要；与 query 一并参与文本提取 |
 * | country | string | 目的国（支持 GB→UK、USA→US 等归一化） |
 * | destinationCountry | string | 同 country |
 * | productLine | string | 产品线过滤：psc / wf / pallet |
 * | enrichedContext | Record<string, unknown> | 上游合并上下文 |
 * | inputContext | unknown | 链式上下文 |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | valid | boolean | 是否通过校验 |
 * | error | string | 仅当 valid===false |
 * | customerIntent | string | 归一后意图 |
 * | countryResolved | string | ISO2 国家码 |
 * | countrySource | string | `""` \| `"param"` \| `"enrichedContext"` \| `"inferred"` |
 * | productLine | string | psc / wf / pallet / "" |
 * | directMatch | boolean | 是否模糊匹配到已知产品 |
 * | matchedProductNames | string[] | 匹配到的产品规范名 |
 * | kbScope | string | 知识加载范围 |
 * | enrichedContext | Record<string, unknown> | 含 analysisClock |
 * | inputContext | Record<string, unknown> | 默认 {} |
 */

// ─── 产品目录 ───────────────────────────────────────────────────────

interface CatalogEntry {
  name: string;
  aliases: string[];
  country: string;
  line: string; // "psc" | "wf" | "pallet"
}

const PRODUCT_CATALOG: CatalogEntry[] = [
  // ── Pallet ──
  { name: "FedEx Freight Economy", aliases: ["FedEx Freight"], country: "US", line: "pallet" },
  { name: "DB SCHENKER Standard Delivery", aliases: ["DB SCHENKER", "SCHENKER"], country: "DE", line: "pallet" },

  // ── WF US ──
  { name: "Winit Fulfillment-7日达", aliases: ["7日达", "Fulfillment 7", "WF-7", "WF7"], country: "US", line: "wf" },
  { name: "Winit Fulfillment-5日达", aliases: ["5日达", "Fulfillment 5", "WF-5", "WF5"], country: "US", line: "wf" },
  { name: "Winit Fulfillment-3日达", aliases: ["3日达", "Fulfillment 3", "WF-3", "WF3"], country: "US", line: "wf" },
  { name: "Winit Fulfillment-2日达", aliases: ["2日达", "Fulfillment 2", "WF-2", "WF2"], country: "US", line: "wf" },
  { name: "Shipping with Amazon", aliases: ["SWA", "Amazon Logistics SWA", "Amazon Shipping"], country: "US", line: "wf" },

  // ── WF UK ──
  { name: "Winit Fulfillment-Standard", aliases: ["WF Standard"], country: "UK", line: "wf" },
  { name: "Winit Fulfillment-Express", aliases: ["WF Express"], country: "UK", line: "wf" },
  { name: "DHL Next Day", aliases: [], country: "UK", line: "wf" },

  // ── WF DE ──
  { name: "Winit Fulfillment-Economy", aliases: ["WF Economy"], country: "DE", line: "wf" },
  { name: "Winit Fulfillment-Standard", aliases: [], country: "DE", line: "wf" },
  { name: "DHL Express-Worldwide", aliases: ["DHL Express Worldwide"], country: "DE", line: "wf" },
  { name: "DHL Paket", aliases: [], country: "DE", line: "wf" },

  // ── WF AU ──
  { name: "Winit Fulfillment-Economy", aliases: [], country: "AU", line: "wf" },
  { name: "Winit Fulfillment-Standard", aliases: [], country: "AU", line: "wf" },
  { name: "Winit Fulfillment-Express", aliases: [], country: "AU", line: "wf" },
  { name: "AuPost International NZ Delivery", aliases: ["NZ Delivery", "新西兰"], country: "AU", line: "wf" },

  // ── PSC US ──
  { name: "USPS Ground Advantage", aliases: ["USPS GA", "USPS Ground"], country: "US", line: "psc" },
  { name: "USPS Priority Mail", aliases: [], country: "US", line: "psc" },
  { name: "UPS SurePost", aliases: [], country: "US", line: "psc" },
  { name: "UPS Ground", aliases: [], country: "US", line: "psc" },
  { name: "UPS 3 Day Select", aliases: [], country: "US", line: "psc" },
  { name: "UPS Next Day Air", aliases: ["UPS Next Day"], country: "US", line: "psc" },
  { name: "OnTrac Ground", aliases: ["OnTrac"], country: "US", line: "psc" },
  { name: "FedEx Ground", aliases: [], country: "US", line: "psc" },
  { name: "FedEx 2Day", aliases: [], country: "US", line: "psc" },
  { name: "FedEx Standard Overnight", aliases: ["FedEx Overnight"], country: "US", line: "psc" },
  { name: "UPS Hundredweight", aliases: [], country: "US", line: "psc" },

  // ── PSC UK ──
  { name: "Royal Mail Untracked 24", aliases: ["RM Untracked 24"], country: "UK", line: "psc" },
  { name: "Royal Mail Untracked 48", aliases: ["RM Untracked 48"], country: "UK", line: "psc" },
  { name: "Royal Mail Tracked 24", aliases: ["RM Tracked 24"], country: "UK", line: "psc" },
  { name: "Royal Mail Tracked 48", aliases: ["RM Tracked 48"], country: "UK", line: "psc" },
  { name: "DHL Domestic Next Day", aliases: [], country: "UK", line: "psc" },
  { name: "EVRi Standard 24", aliases: ["EVRi 24", "Evri 24"], country: "UK", line: "psc" },
  { name: "EVRi Standard 48", aliases: ["EVRi 48", "Evri 48"], country: "UK", line: "psc" },
  { name: "XDP 1 Man", aliases: ["XDP"], country: "UK", line: "psc" },
  { name: "XDP 2 Man", aliases: [], country: "UK", line: "psc" },
  { name: "DPD Parcel", aliases: ["DPD"], country: "UK", line: "psc" },
  { name: "FedEx Economy", aliases: [], country: "UK", line: "psc" },

  // ── PSC DE ──
  { name: "DE Post Untracked Letter", aliases: ["DE Post Letter"], country: "DE", line: "psc" },
  { name: "DHL Kleinpaket", aliases: ["Kleinpaket"], country: "DE", line: "psc" },
  { name: "DE Post Warenpost", aliases: ["Warenpost"], country: "DE", line: "psc" },
  { name: "DHL Domestic Paket", aliases: ["DHL Paket Domestic"], country: "DE", line: "psc" },
  { name: "DHL Express Domestic", aliases: [], country: "DE", line: "psc" },
  { name: "DPD Domestic", aliases: ["DPD"], country: "DE", line: "psc" },
  { name: "UPS Standard Single", aliases: [], country: "DE", line: "psc" },
  { name: "UPS Standard Multiple", aliases: [], country: "DE", line: "psc" },
  { name: "Winit Parcel-EU", aliases: ["Parcel EU"], country: "DE", line: "psc" },

  // ── PSC AU ──
  { name: "AU Post Large Letter", aliases: ["AU Post Letter"], country: "AU", line: "psc" },
  { name: "AUPOST Parcel Post eParcel", aliases: ["Parcel Post eParcel", "eParcel"], country: "AU", line: "psc" },
  { name: "AU Post Express Post Parcel", aliases: ["Express Post", "AUPost Express"], country: "AU", line: "psc" },
  { name: "MCS Economy", aliases: ["MCS"], country: "AU", line: "psc" },
  { name: "PFL Courier", aliases: ["PFL"], country: "AU", line: "psc" },
  { name: "Aramex Courier", aliases: ["Aramex"], country: "AU", line: "psc" },
  { name: "AU Mix Economy", aliases: ["AU Mix"], country: "AU", line: "psc" },
  { name: "TOLL Priority", aliases: ["TOLL"], country: "AU", line: "psc" },
  { name: "TOLL IPEC", aliases: [], country: "AU", line: "psc" },
  { name: "Direct Freight", aliases: [], country: "AU", line: "psc" },
  { name: "Allied Express", aliases: ["Allied"], country: "AU", line: "psc" },

  // ── PSC CA ──
  { name: "UPS Standard Single", aliases: [], country: "CA", line: "psc" },
  { name: "UNI Domestic", aliases: ["UNI"], country: "CA", line: "psc" },
  { name: "Canada Post Expedited", aliases: ["Canada Post"], country: "CA", line: "psc" },
  { name: "UPS Standard Multiple", aliases: [], country: "CA", line: "psc" },
  { name: "Purolator Ground", aliases: ["Purolator"], country: "CA", line: "psc" },
];

// ─── 工具函数 ───────────────────────────────────────────────────────

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
  if (u === "AUS" || u === "AUSTRALIA") return "AU";
  if (u === "英国") return "UK";
  if (u === "美国") return "US";
  if (u === "德国") return "DE";
  if (u === "澳洲" || u === "澳大利亚") return "AU";
  if (u === "加拿大") return "CA";
  if (/^[A-Z]{2}$/.test(u)) return u;
  return undefined;
}

function normalizeProductLine(v: unknown): string {
  if (typeof v !== "string") return "";
  const u = v.trim().toLowerCase();
  if (u === "psc" || u === "parcel") return "psc";
  if (u === "wf" || u === "fulfillment") return "wf";
  if (u === "pallet" || u === "托盘") return "pallet";
  return "";
}

/** 从自然语言文本中推断产品线 */
const TEXT_LINE_PATTERNS: Array<{ pattern: RegExp; line: string }> = [
  { pattern: /托盘|pallet|freight/i, line: "pallet" },
  { pattern: /fulfillment|履约|WF[^a-z]|Winit\s*Fulfillment/i, line: "wf" },
  { pattern: /PSC|标准尾程|Parcel\s*Service/i, line: "psc" },
];

function extractProductLineFromText(text: string): string {
  if (!text) return "";
  for (const { pattern, line } of TEXT_LINE_PATTERNS) {
    if (pattern.test(text)) return line;
  }
  return "";
}

function enrichedContextHasContent(v: unknown): boolean {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.keys(v as object).length > 0;
}

// ─── 国家解析 ───────────────────────────────────────────────────────

/** 从自然语言文本中提取国家关键词（中文国名 / 英文国名 / ISO2） */
const TEXT_COUNTRY_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /美国|USA?|United\s+States/i, code: "US" },
  { pattern: /英国|UK|GB|United\s+Kingdom|Great\s+Britain/i, code: "UK" },
  { pattern: /德国|DEU?|Germany/i, code: "DE" },
  { pattern: /澳洲|澳大利亚|AUSTR?|Australia/i, code: "AU" },
  { pattern: /加拿大|CAN|Canada/i, code: "CA" },
];

function extractCountryFromText(text: string): string | undefined {
  if (!text) return undefined;
  for (const { pattern, code } of TEXT_COUNTRY_PATTERNS) {
    if (pattern.test(text)) return code;
  }
  return undefined;
}

function extractCountryForShard(params: Record<string, unknown>): { countryResolved: string; countrySource: string } {
  const tryStr = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? normalizeCountryCode(v) : undefined;

  // 1. 结构化字段
  let c =
    tryStr(params.countryResolved) ??
    tryStr(params.country) ??
    tryStr(params.destinationCountry);
  if (c) return { countryResolved: c, countrySource: "param" };

  // 2. enrichedContext
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

  // 3. 从 query / customerIntent 自然语言中提取
  const queryText = typeof params.query === "string" ? params.query : "";
  const intentText = typeof params.customerIntent === "string" ? params.customerIntent : "";
  c = extractCountryFromText(queryText) ?? extractCountryFromText(intentText);
  if (c) return { countryResolved: c, countrySource: "text" };

  return { countryResolved: "", countrySource: "" };
}

// ─── 产品名模糊匹配 ─────────────────────────────────────────────────

interface MatchResult {
  directMatch: boolean;
  matchedProductNames: string[];
  inferredCountry: string;
  inferredLine: string;
}

/**
 * 尝试从候选字符串中匹配已知产品。
 * 匹配策略：
 *   1. 标准名大小写不敏感子串匹配
 *   2. alias 大小写不敏感子串匹配
 *   3. 从候选文本中提取国家后缀（如 "-US"、"-DE"）
 */
function fuzzyMatchProducts(candidates: string[]): MatchResult {
  const result: MatchResult = { directMatch: false, matchedProductNames: [], inferredCountry: "", inferredLine: "" };
  const matchedEntries = new Set<string>();

  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    const input = raw.trim().toUpperCase();

    // 从候选文本中提取国家后缀（如 "FedEx Freight Economy-US (3-7 business days)" → "US"）
    const countrySuffixMatch = input.match(/[-–—]\s*([A-Z]{2})\b/);

    for (const entry of PRODUCT_CATALOG) {
      if (matchedEntries.has(entry.name + "|" + entry.country)) continue;

      const nameUpper = entry.name.toUpperCase();
      const matched =
        input.includes(nameUpper) ||
        nameUpper.includes(input) ||
        entry.aliases.some((a) => {
          const aUpper = a.toUpperCase();
          return input.includes(aUpper) || aUpper.includes(input);
        });

      if (matched) {
        matchedEntries.add(entry.name + "|" + entry.country);
        result.matchedProductNames.push(entry.name);
        // 推断国家和产品线
        if (!result.inferredCountry) {
          result.inferredCountry = countrySuffixMatch ? countrySuffixMatch[1] : entry.country;
        }
        if (!result.inferredLine) result.inferredLine = entry.line;
      }
    }
  }

  result.directMatch = result.matchedProductNames.length > 0;
  return result;
}

// ─── kbScope 推断 ───────────────────────────────────────────────────

const SUPPORTED_COUNTRIES = new Set(["US", "UK", "DE", "AU", "CA"]);

function determineKbScope(
  countryResolved: string,
  productLine: string,
  directMatch: boolean,
): string {
  if (directMatch) return "direct";

  const hasCountry = countryResolved !== "" && SUPPORTED_COUNTRIES.has(countryResolved);
  const hasLine = productLine === "psc" || productLine === "wf" || productLine === "pallet";

  if (hasCountry && hasLine) return `${productLine}-${countryResolved}`;
  if (hasCountry) return `all-${countryResolved}`;
  if (hasLine) return `${productLine}-all`;
  return "index";
}

// ─── 主入口 ─────────────────────────────────────────────────────────

async function main({ params }: { params: Record<string, unknown> }) {
  const customerIntent = isNonEmptyString(params.customerIntent) ? String(params.customerIntent).trim() : "";
  const enrichedContext = params.enrichedContext;
  const inputContext = params.inputContext;

  const queryText = typeof params.query === "string" ? params.query : "";
  const intentText = typeof params.customerIntent === "string" ? params.customerIntent : "";
  const combinedText = queryText + " " + intentText;

  // 1. 从文本中提取国家（query + customerIntent）
  let countryFromText = extractCountryFromText(queryText) ?? extractCountryFromText(intentText) ?? "";

  // 2. 从文本中提取产品线
  let lineFromText = extractProductLineFromText(combinedText);

  // 3. 从文本中模糊匹配产品名（query + customerIntent 整句都作为候选）
  const textCandidates = [queryText, intentText].filter(Boolean);
  const matchResult = fuzzyMatchProducts(textCandidates);

  const allMatchedNames = matchResult.matchedProductNames;
  const directMatch = allMatchedNames.length > 0;
  const inferredFromProduct = directMatch ? matchResult.inferredCountry : "";
  const inferredLineFromProduct = directMatch ? matchResult.inferredLine : "";

  // 4. 国家优先级：结构化字段 > 文本提取 > 产品名推断
  let { countryResolved, countrySource } = extractCountryForShard(params);
  if (!countryResolved && countryFromText) {
    countryResolved = countryFromText;
    countrySource = "text";
  }
  if (!countryResolved && inferredFromProduct) {
    countryResolved = inferredFromProduct;
    countrySource = "inferred";
  }

  // 6. 产品线优先级：结构化字段 > 文本提取 > 产品名推断
  let productLine = normalizeProductLine(params.productLine);
  if (!productLine) productLine = lineFromText;
  if (!productLine) productLine = inferredLineFromProduct;

  // 7. 推断 kbScope
  const kbScope = determineKbScope(countryResolved, productLine, directMatch);

  // 8. 校验（有 query 就算有效）
  const hasQuery = queryText.trim().length > 0;
  const hasIntent = customerIntent.length > 0;
  const hasEnriched = enrichedContextHasContent(enrichedContext);
  const hasCountry = countryResolved.length > 0;
  const valid = hasQuery || hasIntent || hasEnriched || hasCountry;

  const ret = valid
    ? {
        valid: true as const,
        customerIntent,
        countryResolved,
        countrySource,
        productLine,
        directMatch,
        matchedProductNames: allMatchedNames,
        kbScope,
        enrichedContext: withAnalysisClock(enrichedContext ?? {}),
        inputContext: inputContext ?? {},
      }
    : {
        valid: false as const,
        error: "至少提供 query、customerIntent 或 enrichedContext（非空对象）之一",
        customerIntent: params.customerIntent ?? "",
        countryResolved,
        countrySource,
        productLine,
        directMatch: false,
        matchedProductNames: [],
        kbScope,
        enrichedContext: withAnalysisClock(enrichedContext ?? {}),
        inputContext: inputContext ?? {},
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
