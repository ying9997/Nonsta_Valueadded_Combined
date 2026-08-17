/**
 * 节点：build-sub-goods-request — 拼装 wh.va.order.getSubGoods 请求体。
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

function asPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clampPageSize(value: unknown): number {
  const n = Number(value);
  const int = Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
  return Math.max(1, Math.min(200, int));
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const statusFacts = asRecord(params.statusFacts);
  const orderNo = asText(statusFacts.orderNo) || asText(orderStatusInput.vasOrderNo);
  const parentId = asPositiveNumber(orderStatusInput.parentGoodsId);
  const includeGoods = orderStatusInput.includeGoods === true;
  const skip = !includeGoods || !orderNo || parentId == null;
  const data = skip
    ? {}
    : {
        orderNo,
        parentId,
        pageVo: {
          pageNum: 1,
          pageSize: clampPageSize(orderStatusInput.maxAtomRows),
        },
      };

  return {
    subGoodsRequestData: skip ? "" : JSON.stringify(data),
    subGoodsActionPlan: {
      action: "wh.va.order.getSubGoods",
      data,
      skip,
      reason: includeGoods ? (orderNo ? (parentId == null ? "missing_parentGoodsId" : "") : "missing_orderNo") : "includeGoods_false",
    },
    orderStatusInput,
    statusFacts,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-sub-goods-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "build-sub-goods-request failed");
      process.exit(1);
    });
}
