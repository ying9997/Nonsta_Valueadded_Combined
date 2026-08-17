/**
 * 节点：按 fetchProfile 组装 winit.item.page.list 单次批量请求
 */
const PAGE_LIST_ACTION = "winit.item.page.list";
const VALID_FETCH_PROFILES = new Set([
  "facts_core",
  "audit_status",
  "barcode_third",
  "supplement_third_sku",
  "facts_compliance",
  "minimal",
]);

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeFetchProfile(value: unknown): string {
  const profile = asText(value);
  return VALID_FETCH_PROFILES.has(profile) ? profile : "facts_core";
}

function buildPageListAction(opts: {
  skuCodes: string[];
  importCountryCode?: string;
  fetchProfile: string;
}): { action: string; data: string } {
  const codes = opts.skuCodes.map(asText).filter(Boolean);
  const supplementThirdSku = opts.fetchProfile === "supplement_third_sku";
  const data: Record<string, unknown> = {
    pageVo: {
      pageNo: 1,
      pageSize: supplementThirdSku ? 50 : Math.min(Math.max(codes.length, 1), 20),
    },
    conditionQueryType: "equals",
  };
  const country = asText(opts.importCountryCode);
  if (country) data.importCountryCode = country;
  if (codes.length > 0) data.skuCodes = codes;
  if (supplementThirdSku) data.querySupplementType = "SUPPLEMENT_THRID_SKU";
  if (opts.fetchProfile === "audit_status") data.queryType = "REGISTERING";
  return { action: PAGE_LIST_ACTION, data: JSON.stringify(data) };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const fetchProfile = normalizeFetchProfile(params.fetchProfile);
  const importCountryCode =
    typeof params.importCountryCode === "string" ? params.importCountryCode.trim() : "";

  if (params.skipApi === true) {
    return {
      actions: [],
      actionPlans: [],
      winitPluginBatchActionsCount: 0,
      actionName: PAGE_LIST_ACTION,
      fetchProfile,
      importCountryCode,
      skipApi: true,
    };
  }

  const codes = ((params.normalizedSkuCodes as string[]) ?? []).filter(
    (c) => typeof c === "string" && c.trim()
  );
  const action = buildPageListAction({
    skuCodes: codes,
    importCountryCode: importCountryCode || undefined,
    fetchProfile,
  });

  const actionPlans = codes.map((skuCode) => ({ inputToken: skuCode, skuCode }));

  return {
    actions: [action],
    actionPlans,
    winitPluginBatchActionsCount: 1,
    actionName: PAGE_LIST_ACTION,
    fetchProfile,
    importCountryCode,
    skipApi: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-fetch-plan")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
