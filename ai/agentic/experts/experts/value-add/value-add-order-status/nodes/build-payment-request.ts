/**
 * 节点：build-payment-request — 拼装 wh.va.order.getPaymentList 请求体。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const statusFacts = asRecord(params.statusFacts);
  const orderNo = asText(statusFacts.orderNo) || asText(orderStatusInput.vasOrderNo);
  const includePayment = orderStatusInput.includePayment === true;
  const skip = !includePayment || !orderNo;
  const data = skip ? {} : { orderNo, manualentryFlag: false };

  return {
    paymentRequestData: skip ? "" : JSON.stringify(data),
    paymentActionPlan: {
      action: "wh.va.order.getPaymentList",
      data,
      skip,
      reason: includePayment ? (orderNo ? "" : "missing_orderNo") : "includePayment_false",
    },
    orderStatusInput,
    statusFacts,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-payment-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "build-payment-request failed");
      process.exit(1);
    });
}
