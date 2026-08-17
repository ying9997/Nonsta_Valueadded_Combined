/**
 * 节点：加急路径默认 sku_summary / isIncludePackage=Y
 */

import {
  buildInboundDetailActions,
  resolveDetailLevel,
  type DetailLevel,
} from "../../../../shared/inbound-get-order-detail";

const DEFAULT_DETAIL_LEVEL: DetailLevel = "sku_summary";

async function main({ params }: { params: Record<string, unknown> }) {
  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const customerRefNos = ((params.customerRefNos as string[]) ?? []).filter((o) => o?.trim());
  const detailLevel = resolveDetailLevel(params, DEFAULT_DETAIL_LEVEL);
  return buildInboundDetailActions(wiOrderNos, customerRefNos, detailLevel);
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
