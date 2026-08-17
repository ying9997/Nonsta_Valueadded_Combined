/**
 * 节点：validate-intent — 归一合规深判意图；抽取 profile 快照
 */

type IntentType =
  | "carriability_deep"
  | "restricted"
  | "certificates"
  | "weee"
  | "ecommerce"
  | "brand"
  | "unban_deep"
  | "declaration"
  | "general";

const ALLOWED = new Set<string>([
  "carriability_deep",
  "restricted",
  "certificates",
  "weee",
  "ecommerce",
  "brand",
  "unban_deep",
  "declaration",
  "general",
]);

const INTENT_PATTERNS: Array<{ type: IntentType; patterns: RegExp[] }> = [
  { type: "weee", patterns: [/WEEE|德国.*类别|电器.*类别/i] },
  { type: "ecommerce", patterns: [/海关建议申报价|销售链接|电清关|链接是否合规|申报价/i] },
  { type: "certificates", patterns: [/MSDS|SDS|UN38\.?3|证书|GPSR|缺资料|资料证书/i] },
  { type: "brand", patterns: [/品牌备案|商标|授权|熏蒸|MDF|密度板/i] },
  { type: "declaration", patterns: [/申报要素|HS\s*码|申报品名|品名申报/i] },
  { type: "unban_deep", patterns: [/解禁条件|能否解禁|禁售.*原因|禁止入库.*原因|条件是否满足/i] },
  { type: "restricted", patterns: [/禁限运|禁运清单|限运|能不能发.*清单/i] },
  {
    type: "carriability_deep",
    patterns: [/能否发|能不能发|能否入|能不能入|新品.*承运|链接.*能不能|商品链接/i],
  },
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function detectIntent(text: string): IntentType {
  for (const { type, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return type;
  }
  return "general";
}

function extractProfileSnapshot(inputContext: Record<string, unknown>): Record<string, unknown> {
  const previousOutput = asRecord(inputContext.previousOutput);
  const structured = asRecord(previousOutput.structured);
  if (Array.isArray(structured.skus) && structured.skus.length > 0) {
    return { skus: structured.skus, missingFacts: structured.missingFacts ?? [] };
  }
  const enriched = asRecord(inputContext.enrichedContext);
  const profile = asRecord(enriched["sku/profile"]);
  if (Array.isArray(profile.skus) && profile.skus.length > 0) {
    return { skus: profile.skus, missingFacts: profile.missingFacts ?? [] };
  }
  return {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const topic = str(params.topic);
  const rawIntent = str(params.intentType).toLowerCase();
  const skuCode = str(params.skuCode) || str(params.productCode);
  const importCountryCode = str(params.importCountryCode).toUpperCase();
  const productLink = str(params.productLink);
  const categoryHint = str(params.categoryHint);
  const query = str(params.query);
  const customerIntent = str(params.customerIntent) || query;
  const inputContext = asRecord(params.inputContext);
  const profileSnapshot = extractProfileSnapshot(inputContext);

  let intentType: IntentType = "general";
  if (rawIntent && ALLOWED.has(rawIntent)) {
    intentType = rawIntent as IntentType;
  } else {
    intentType = detectIntent(`${topic} ${customerIntent} ${query}`);
  }

  const hasTopicOrIntent = topic.length > 0 || (rawIntent.length > 0 && ALLOWED.has(rawIntent));
  const normalizedTopic = topic || customerIntent || intentType;

  let needInfoHint = "";
  if (!hasTopicOrIntent && !customerIntent && !query) {
    needInfoHint = "missing_topic_or_intent";
  } else if (
    (intentType === "carriability_deep" || intentType === "ecommerce") &&
    !productLink &&
    !skuCode
  ) {
    needInfoHint = "prefer_product_link_or_sku";
  } else if (
    (intentType === "weee" || intentType === "certificates" || intentType === "unban_deep") &&
    !skuCode &&
    !importCountryCode
  ) {
    needInfoHint = "prefer_sku_or_country";
  } else if (
    (intentType === "restricted" || intentType === "carriability_deep" || intentType === "brand") &&
    !importCountryCode &&
    !/国|US|DE|UK|AU|CA|EU/i.test(`${topic} ${customerIntent}`)
  ) {
    needInfoHint = "prefer_import_country";
  }

  const validationOk = hasTopicOrIntent || customerIntent.length > 0 || query.length > 0;

  return {
    validationOk,
    intentType,
    normalizedTopic,
    skuCode,
    importCountryCode,
    productLink,
    categoryHint,
    customerIntent,
    needInfoHint: validationOk ? needInfoHint : "missing_topic_or_intent",
    profileSnapshot,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
