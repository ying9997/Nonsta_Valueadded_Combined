/**
 * 节点：merge-enhancement-data — 合并 P2 费用/货物增强事实。
 * FaaS 单文件闭环，无外部 import。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const statusFacts = asRecord(params.statusFacts);
  const paymentFacts = asRecord(params.paymentFacts);
  const prepaymentFacts = asRecord(params.prepaymentFacts);
  const goodsFacts = asRecord(params.goodsFacts);
  const missingEvidence = [...asArray(statusFacts.missingEvidence)];
  if (orderStatusInput.includeGoods === true && !orderStatusInput.parentGoodsId) {
    missingEvidence.push("parentGoodsId");
  }

  return {
    statusFacts: {
      ...statusFacts,
      paymentSummary: paymentFacts.paymentSummary ?? null,
      prepaymentSummary: prepaymentFacts.prepaymentSummary ?? null,
      goodsSummary: goodsFacts.goodsSummary ?? null,
      missingEvidence,
      optionalFetchFailures: [
        ...asArray(statusFacts.optionalFetchFailures),
        ...asArray(paymentFacts.optionalFetchFailures),
        ...asArray(prepaymentFacts.optionalFetchFailures),
        ...asArray(goodsFacts.optionalFetchFailures),
      ],
    },
    orderStatusInput,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-enhancement-data")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "merge-enhancement-data failed");
      process.exit(1);
    });
}
