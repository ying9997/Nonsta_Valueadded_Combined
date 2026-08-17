/**
 * 节点：SKU 差异路径剥离 packageList
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
    targetPackageNos: params.targetPackageNos as string[] | undefined,
    targetItemSernos: params.targetItemSernos as string[] | undefined,
    maxPackagesPerOrder: params.maxPackagesPerOrder as number | undefined,
    maxMerchandisePerPackage: params.maxMerchandisePerPackage as number | undefined,
  });

  return { rawOrderData: extracted, _detailExtractMeta, detailLevel, requiresNarrowing: _detailExtractMeta.requiresNarrowing };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("extract-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
