/**
 * 节点：按 detailLevel 剥离 packageList / merchandiseList（默认 header）
 */

import {
  extractInboundDetailBatch,
  resolveDetailLevel,
  type DetailLevel,
} from "../../../../shared/inbound-get-order-detail";

const DEFAULT_DETAIL_LEVEL: DetailLevel = "header";

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

  return { rawOrderData: extracted, _detailExtractMeta, detailLevel };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("extract-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
