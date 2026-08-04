/**
 * 节点：加急 SKU 列表路径剥离 packageList
 */

import {
  extractInboundDetailBatch,
  resolveDetailLevel,
  type DetailLevel,
} from "../../../../shared/inbound-get-order-detail";

const DEFAULT_DETAIL_LEVEL: DetailLevel = "sku_summary";

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const detailLevel = resolveDetailLevel(params, DEFAULT_DETAIL_LEVEL);

  const { rawOrderData: extracted, _detailExtractMeta } = extractInboundDetailBatch(rawOrderData, {
    detailLevel,
    targetMerchandiseCodes: params.targetMerchandiseCodes as string[] | undefined,
  });

  return { rawOrderData: extracted, _detailExtractMeta, detailLevel };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("extract-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
