/**
 * 节点：校验并归一化商品编码列表
 * - 支持 productCode 同义（若 skuCodes 为空且有 productCodes 则不用；调用方应把 productCode 放入 skuCodes）
 * - 去重、上限 20
 * - 透传 fetchProfile（非法值回落 facts_core）
 */
const MAX_SKU_CODES = 20;
const VALID_FETCH_PROFILES = new Set([
  "facts_core",
  "audit_status",
  "barcode_third",
  "supplement_third_sku",
  "facts_compliance",
  "minimal",
]);

function normalizeFetchProfile(v: unknown): string {
  const value = typeof v === "string" ? v.trim() : "";
  return VALID_FETCH_PROFILES.has(value) ? value : "facts_core";
}

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const inputContext = asRecord(params.inputContext);
  const warehouseCode = asText(params.warehouseCode);
  const importCountryCode = asText(params.importCountryCode);
  const fetchProfile = normalizeFetchProfile(params.fetchProfile);

  const rawList = Array.isArray(params.skuCodes) ? params.skuCodes : [];
  const seen = new Set<string>();
  const normalizedSkuCodes: string[] = [];
  for (const item of rawList) {
    const code = asText(item);
    if (!code) continue;
    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalizedSkuCodes.push(code);
  }

  if (normalizedSkuCodes.length === 0) {
    return {
      normalizedSkuCodes: [],
      warehouseCode,
      importCountryCode,
      fetchProfile,
      skipApi: true,
      validationError: "skuCodes_required",
      inputContext,
    };
  }

  if (normalizedSkuCodes.length > MAX_SKU_CODES) {
    return {
      normalizedSkuCodes: normalizedSkuCodes.slice(0, MAX_SKU_CODES),
      warehouseCode,
      importCountryCode,
      fetchProfile,
      skipApi: false,
      validationError: `skuCodes_truncated_to_${MAX_SKU_CODES}`,
      inputContext,
    };
  }

  return {
    normalizedSkuCodes,
    warehouseCode,
    importCountryCode,
    fetchProfile,
    skipApi: false,
    validationError: "",
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-sku-codes")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
