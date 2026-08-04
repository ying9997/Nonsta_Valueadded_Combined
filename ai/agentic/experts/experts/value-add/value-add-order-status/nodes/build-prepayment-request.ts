/**
 * 节点：build-prepayment-request — 拼装 wh.va.order.getPrepaymentList 请求体。
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
  const includePrepayment = orderStatusInput.includePrepayment === true;
  const skip = !includePrepayment || !orderNo;
  const data = skip ? {} : { orderNo, manualentryFlag: false };

  return {
    prepaymentRequestData: skip ? "" : JSON.stringify(data),
    prepaymentActionPlan: {
      action: "wh.va.order.getPrepaymentList",
      data,
      skip,
      reason: includePrepayment ? (orderNo ? "" : "missing_orderNo") : "includePrepayment_false",
    },
    orderStatusInput,
    statusFacts,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-prepayment-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "build-prepayment-request failed");
      process.exit(1);
    });
}
