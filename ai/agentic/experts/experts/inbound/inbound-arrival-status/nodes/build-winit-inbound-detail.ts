/**
 * 节点：getOrderDetail 批处理（默认 header；checkPackageQty → package_summary）
 */

import {
  buildInboundDetailActions,
  resolveDetailLevel,
  type DetailLevel,
} from "../../../../shared/inbound-get-order-detail";

const DEFAULT_DETAIL_LEVEL: DetailLevel = "header";

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
