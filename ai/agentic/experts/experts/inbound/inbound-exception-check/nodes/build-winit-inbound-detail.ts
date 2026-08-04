/**
 * 节点：getOrderDetail 批处理（默认 sku_summary / isIncludePackage=Y）
 */

import {
  buildInboundDetailActions,
  resolveDetailLevel,
  type DetailLevel,
} from "../../../../shared/inbound-get-order-detail";

const DEFAULT_DETAIL_LEVEL: DetailLevel = "sku_summary";

async function main({ params }: { params: Record<string, unknown> }) {
  const useListMode = params.useListMode === true;
  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const customerRefNos = ((params.customerRefNos as string[]) ?? []).filter((o) => o?.trim());
  const skipDetailApi = useListMode || (wiOrderNos.length === 0 && customerRefNos.length === 0);

  if (skipDetailApi) {
    return {
      actions: [],
      actionPlans: [],
      winitPluginBatchActionsCount: 0,
      actionName: "winit.wh.inbound.getOrderDetail",
      skipDetailApi: true,
      detailLevel: DEFAULT_DETAIL_LEVEL,
      isIncludePackage: "Y" as const,
    };
  }

  const detailLevel = resolveDetailLevel(params, DEFAULT_DETAIL_LEVEL);
  const batch = buildInboundDetailActions(wiOrderNos, customerRefNos, detailLevel);
  return { ...batch, skipDetailApi: false };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
