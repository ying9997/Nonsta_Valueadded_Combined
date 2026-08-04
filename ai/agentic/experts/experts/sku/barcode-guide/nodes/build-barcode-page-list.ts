/**
 * 节点：组装 barcode 场景的 page.list action
 */
const PAGE_LIST_ACTION = "winit.item.page.list";

type BarcodeFetchProfile = "barcode_third" | "supplement_third_sku";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function normalizeFetchProfile(v: unknown): BarcodeFetchProfile {
  return str(v) === "supplement_third_sku" ? "supplement_third_sku" : "barcode_third";
}

function buildPageListAction(params: {
  skuCode: string;
  skuCodeThird: string;
  fetchProfile: BarcodeFetchProfile;
}): { action: string; data: string } {
  const data: Record<string, unknown> = {
    pageVo: {
      pageNo: 1,
      pageSize: params.fetchProfile === "supplement_third_sku" ? 50 : 1,
    },
    conditionQueryType: "equals",
  };

  if (params.fetchProfile === "supplement_third_sku") {
    data.querySupplementType = "SUPPLEMENT_THRID_SKU";
    if (params.skuCode) data.skuCodes = [params.skuCode];
  } else {
    if (params.skuCode) data.skuCodes = [params.skuCode];
    if (params.skuCodeThird) data.thirdItemCodes = [params.skuCodeThird];
  }

  return { action: PAGE_LIST_ACTION, data: JSON.stringify(data) };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const skipApi = params.skipApi === true || params.shouldFetch === false;
  const skuCode = str(params.skuCode);
  const skuCodeThird = str(params.skuCodeThird);
  const fetchProfile = params.fetchProfile
    ? normalizeFetchProfile(params.fetchProfile)
    : "barcode_third";

  if (skipApi) {
    return {
      actions: [],
      actionPlans: [],
      winitPluginBatchActionsCount: 0,
      actionName: PAGE_LIST_ACTION,
      fetchProfile,
      skipApi: true,
    };
  }

  const action = buildPageListAction({
    skuCode,
    skuCodeThird,
    fetchProfile,
  });

  return {
    actions: [action],
    actionPlans: skuCode ? [{ inputToken: skuCode, skuCode }] : [{ inputToken: "supplement", skuCode: "" }],
    winitPluginBatchActionsCount: 1,
    actionName: PAGE_LIST_ACTION,
    fetchProfile,
    skipApi: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-barcode-page-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
