/**
 * 节点：为 winit.wh.pms.getWinitProducts 组装插件批处理动作
 * 文档：https://developer.winit.com.cn/document/detail/id/28.html
 * FaaS 单文件闭环，无 external import。
 */

const GET_WINIT_PRODUCTS_ACTION = "winit.wh.pms.getWinitProducts";

const ALL_PRODUCT_TYPES = ["OW0101", "OW0102", "OW0103"] as const;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function coerceStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

/** 将 filterCodes / productLine 映射为 getWinitProducts 的 productType 入参 */
function resolveProductTypes(filterCodes: string[], productLine: string): string[] {
  const hints = [...filterCodes, productLine].map((h) => h.toUpperCase()).filter(Boolean);
  if (hints.length === 0) return [...ALL_PRODUCT_TYPES];

  const types = new Set<string>();
  for (const h of hints) {
    if (h.startsWith("OW0101") || h.includes("头程") || h.includes("标准")) types.add("OW0101");
    if (
      h.startsWith("OW0102") ||
      h === "OW01021" ||
      h === "OW01022" ||
      h.includes("自验") ||
      h === "SI" ||
      h === "QSI"
    ) {
      types.add("OW0102");
    }
    if (
      h.startsWith("OW0103") ||
      h.startsWith("OW0104") ||
      h === "OW01031" ||
      h === "OW01032" ||
      h.includes("海外验")
    ) {
      types.add("OW0103");
    }
  }

  return types.size > 0 ? Array.from(types) : [...ALL_PRODUCT_TYPES];
}

async function main({ params }: { params: Record<string, unknown> }) {
  const skipApi = params.validationOk !== true;

  if (skipApi) {
    return {
      actions: [],
      actionPlans: [],
      winitPluginBatchActionsCount: 0,
      actionName: GET_WINIT_PRODUCTS_ACTION,
      skipApi: true,
      productTypes: [],
    };
  }

  const filterCodes = coerceStringArray(params.filterCodes).map((c) => c.toUpperCase());
  const productLine = str(params.productLine);
  const productTypes = resolveProductTypes(filterCodes, productLine);

  const actions = productTypes.map((productType) => ({
    action: GET_WINIT_PRODUCTS_ACTION,
    data: JSON.stringify({ productType }),
  }));

  const actionPlans = productTypes.map((productType) => ({
    inputToken: productType,
    queryBy: "getWinitProducts" as const,
    productType,
  }));

  return {
    actions,
    actionPlans,
    winitPluginBatchActionsCount: actions.length,
    actionName: GET_WINIT_PRODUCTS_ACTION,
    skipApi: false,
    productTypes,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-available-product-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
