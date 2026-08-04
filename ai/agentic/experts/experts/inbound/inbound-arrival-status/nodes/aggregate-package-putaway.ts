/**
 * 节点：package_summary 聚合（按 status / 卸货时间统计）
 */

import {
  aggregatePackagePutaway,
  normalizeInboundOrderFields,
} from "../../../../shared/inbound-get-order-detail";

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];

  const summaries = list
    .filter((item) => item && typeof item === "object")
    .map((item) => aggregatePackagePutaway(normalizeInboundOrderFields(item as Record<string, unknown>)));

  const primary = summaries[0] ?? {
    totalPackages: 0,
    byStatus: {},
    recentUnshelvedSample: [],
  };

  return {
    packagePutawaySummary: primary,
    packagePutawaySummaries: summaries,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("aggregate-package-putaway")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
