/**
 * 节点：validate-psc-query — 规范化 warehouseCode / country / productLine / filterCodes
 * FaaS 单文件闭环，无外部 import。
 */

const SELF_INSPECTION_CODES = new Set(["OW01021", "OW01022"]);
const OVERSEAS_INSPECTION_CODES = new Set(["OW01031", "OW01032"]);

const PRODUCT_LINE_ALIASES: Record<string, string[]> = {
  自验: ["OW01021", "OW01022"],
  SI: ["OW01021"],
  QSI: ["OW01022"],
  快速自验: ["OW01022"],
  海外验: ["OW01031", "OW01032"],
  头程: ["OW01011"],
  标准头程: ["OW01011"],
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeWarehouseCode(raw: unknown): string {
  const s = str(raw);
  return s ? s.toUpperCase().replace(/[\s_-]+/g, "") : "";
}

function normalizeCountry(raw: unknown): string {
  const s = str(raw).toUpperCase();
  if (!s) return "";
  const aliases: Record<string, string> = {
    GB: "UK",
    USA: "US",
    UNITEDSTATES: "US",
    UNITEDKINGDOM: "UK",
    GERMANY: "DE",
    DEU: "DE",
    AUSTRALIA: "AU",
    CANADA: "CA",
    BELGIUM: "BE",
    英国: "UK",
    美国: "US",
    德国: "DE",
    澳洲: "AU",
    澳大利亚: "AU",
    加拿大: "CA",
    比利时: "BE",
  };
  if (aliases[s]) return aliases[s];
  return /^[A-Z]{2}$/.test(s) ? s : "";
}

function coerceStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) return p.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      return raw
        .split(/[,，、\s]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function expandProductLine(productLine: string): string[] {
  if (!productLine) return [];
  const upper = productLine.toUpperCase();
  if (/^OW01\d+/.test(upper)) return [upper];
  for (const [key, codes] of Object.entries(PRODUCT_LINE_ALIASES)) {
    if (productLine.includes(key) || upper === key.toUpperCase()) return codes;
  }
  return [];
}

function mergeFilterCodes(filterCodes: string[], productLine: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...filterCodes, ...expandProductLine(productLine)]) {
    const code = c.toUpperCase();
    if (!seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const warehouseCode = normalizeWarehouseCode(params.warehouseCode);
  const country = normalizeCountry(params.country);
  const productLine = str(params.productLine);
  const filterCodes = mergeFilterCodes(coerceStringArray(params.filterCodes), productLine);
  const customerIntent = str(params.customerIntent);
  const query = str(params.query);
  const inputContext = params.inputContext ?? {};

  return {
    validationOk: true,
    warehouseCode,
    country,
    productLine,
    filterCodes,
    query,
    customerIntent,
    inputContext,
    _meta: {
      hasWarehouseFilter: warehouseCode.length > 0,
      hasCodeFilter: filterCodes.length > 0,
      selfInspectionCodes: Array.from(SELF_INSPECTION_CODES),
      overseasInspectionCodes: Array.from(OVERSEAS_INSPECTION_CODES),
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-psc-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
