/**
 * 节点：build-basic-info-request — 拼装 wh.va.order.basicInfo 请求体。
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
  const orderNo = asText(orderStatusInput.vasOrderNo);
  const skip = orderNo.length === 0;
  const data = skip ? {} : { orderNo };

  return {
    basicInfoRequestData: skip ? "" : JSON.stringify(data),
    basicInfoActionPlan: {
      action: "wh.va.order.basicInfo",
      data,
      skip,
    },
    orderStatusInput,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-basic-info-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "build-basic-info-request failed");
      process.exit(1);
    });
}
