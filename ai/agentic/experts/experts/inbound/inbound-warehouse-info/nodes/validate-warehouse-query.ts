/**
 * 节点：validate-warehouse-query — 校验 warehouseCode 或 country 至少其一，规范化编码与 topic
 * FaaS 单文件闭环，无外部 import。
 */

const VALID_TOPICS = new Set([
  "address",
  "contact",
  "hours",
  "cutoff",
  "type",
  "capabilities",
  "rules",
  "all",
]);

const WAREHOUSE_ALIASES: Record<string, string> = {
  US_LAX_01: "USWC",
  USLAX01: "USWC",
  UKLON01: "UK",
  UK_LON_01: "UK",
  UKLE: "UK",
  DELON01: "DE",
  DE_LON_01: "DE",
  AUSYD01: "AU",
  AU_SYD_01: "AU",
  AUSY: "AU",
};

const COUNTRY_ALIASES: Record<string, string> = {
  GB: "UK",
  USA: "US",
  UNITEDSTATES: "US",
  UNITEDKINGDOM: "UK",
  GERMANY: "DE",
  DEU: "DE",
  AUSTRALIA: "AU",
  AUS: "AU",
  CANADA: "CA",
  CAN: "CA",
  BELGIUM: "BE",
  BEL: "BE",
  英国: "UK",
  美国: "US",
  德国: "DE",
  澳洲: "AU",
  澳大利亚: "AU",
  加拿大: "CA",
  比利时: "BE",
};

const COUNTRY_WAREHOUSE_PREFIX: Record<string, string[]> = {
  US: ["USTX", "USWC", "USWC2", "USWC5", "USKY3", "USKY5", "USNJ", "USNJ2", "USGA"],
  UK: ["UK", "UKGF", "UKTW"],
  DE: ["DE", "DEBR", "DEBR2"],
  AU: ["AU", "AUSY", "AUME"],
  CA: ["CATO"],
  BE: ["BE"],
};

function normalizeWarehouseCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().toUpperCase().replace(/[\s_-]+/g, "");
  if (!trimmed) return "";
  if (WAREHOUSE_ALIASES[trimmed]) return WAREHOUSE_ALIASES[trimmed];
  const withUnderscore = raw.trim().toUpperCase();
  if (WAREHOUSE_ALIASES[withUnderscore]) return WAREHOUSE_ALIASES[withUnderscore];
  return trimmed;
}

function normalizeCountry(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const u = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!u) return "";
  if (COUNTRY_ALIASES[u]) return COUNTRY_ALIASES[u];
  if (/^[A-Z]{2}$/.test(u)) return u;
  return "";
}

function normalizeTopic(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "all";
  const t = raw.trim().toLowerCase();
  return VALID_TOPICS.has(t) ? t : "all";
}

function inferCountryFromWarehouse(code: string): string {
  for (const [country, codes] of Object.entries(COUNTRY_WAREHOUSE_PREFIX)) {
    if (codes.some((c) => code === c || code.startsWith(c))) return country;
  }
  if (code.startsWith("US")) return "US";
  if (code.startsWith("UK")) return "UK";
  if (code.startsWith("DE")) return "DE";
  if (code.startsWith("AU")) return "AU";
  if (code.startsWith("CA")) return "CA";
  return "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const warehouseCode = normalizeWarehouseCode(params.warehouseCode);
  let country = normalizeCountry(params.country);
  const topic = normalizeTopic(params.topic);
  const customerIntent =
    typeof params.customerIntent === "string" ? params.customerIntent.trim() : "";
  const inputContext = params.inputContext ?? {};

  if (warehouseCode && !country) {
    country = inferCountryFromWarehouse(warehouseCode);
  }

  const validationOk = warehouseCode.length > 0 || country.length > 0;
  const queryType = warehouseCode ? "exact" : country ? "country_search" : "invalid";

  return validationOk
    ? {
        validationOk: true,
        queryType,
        warehouseCode,
        country,
        topic,
        customerIntent,
        inputContext,
      }
    : {
        validationOk: false,
        error: "至少提供 warehouseCode 或 country 之一",
        queryType,
        warehouseCode,
        country,
        topic,
        customerIntent,
        inputContext,
      };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-warehouse-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
