/**
 * 节点：根级 merchandiseList → skuPutawaySummary（LLM 主输入）
 */

import {
  aggregateSkuPutaway,
  normalizeInboundOrderFields,
} from "../../../../shared/inbound-get-order-detail";

async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];
  const targetMerchandiseCodes = params.targetMerchandiseCodes as string[] | undefined;

  const summaries = list
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const order = normalizeInboundOrderFields(item as Record<string, unknown>);
      const merch = (order.merchandiseList as unknown[]) ?? [];
      return aggregateSkuPutaway(merch, targetMerchandiseCodes);
    });

  const primary = summaries[0] ?? {
    totalSkus: 0,
    completedSkus: 0,
    partialSkus: 0,
    pendingSkus: 0,
    putawayRate: 0,
    anomalySkus: [],
    targetSkusOnly: false,
  };

  return {
    skuPutawaySummary: primary,
    skuPutawaySummaries: summaries,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("aggregate-sku-putaway")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
