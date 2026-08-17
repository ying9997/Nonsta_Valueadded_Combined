/**
 * 节点：校验清关资料管理意图与必填参数
 */

const VALID_INTENTS = new Set(["upload", "register_importer", "query_importer", "general"]);

const COUNTRY_ALIASES: Record<string, string> = {
  GB: "UK",
  USA: "US",
  UNITEDSTATES: "US",
  UNITEDKINGDOM: "UK",
  GERMANY: "DE",
  DEU: "DE",
  BELGIUM: "BE",
  BEL: "BE",
  EUROPE: "EU",
  英国: "UK",
  美国: "US",
  德国: "DE",
  比利时: "BE",
  欧盟: "EU",
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeCountry(raw: unknown): string {
  const u = str(raw).toUpperCase().replace(/\s+/g, "");
  if (!u) return "";
  if (COUNTRY_ALIASES[u]) return COUNTRY_ALIASES[u];
  if (/^[A-Z]{2}$/.test(u)) return u;
  return "";
}

function normalizeIntent(raw: unknown): string {
  const t = str(raw).toLowerCase();
  return VALID_INTENTS.has(t) ? t : "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = normalizeIntent(params.intent);
  const country = normalizeCountry(params.country);
  const inboundOrderNo = str(params.inboundOrderNo);
  const transportOrderNo = str(params.transportOrderNo);
  const importerCode = str(params.importerCode);
  const customerIntent = str(params.customerIntent);
  const inputContext = params.inputContext ?? {};

  if (!intent) {
    return {
      validationOk: false,
      error: "intent 必填：upload / register_importer / query_importer / general",
      intent: "",
      country,
      inboundOrderNo,
      transportOrderNo,
      importerCode,
      customerIntent,
      inputContext,
    };
  }

  if (!country) {
    return {
      validationOk: false,
      error: "country 必填（UK / EU / DE / BE 等）",
      intent,
      country: "",
      inboundOrderNo,
      transportOrderNo,
      importerCode,
      customerIntent,
      inputContext,
    };
  }

  if (intent === "query_importer" && !importerCode) {
    // importerCode 可选：无则返回该国全部 IOR 列表（getVendorInfo）
  }

  return {
    validationOk: true,
    intent,
    country,
    inboundOrderNo,
    transportOrderNo,
    importerCode,
    customerIntent,
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-doc-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
