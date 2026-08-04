/**
 * 节点：build-vas-list-request — 拼装 wh.va.order.getVasList 请求体。
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

function asBoolDefault(value: unknown, fallback: boolean): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function clampPageSize(value: unknown): number {
  const n = Number(value);
  const int = Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
  return Math.max(1, Math.min(200, int));
}

async function main({ params }: { params: Record<string, unknown> }) {
  const orderStatusInput = asRecord(params.orderStatusInput);
  const basicInfoFacts = asRecord(params.basicInfoFacts);
  const orderNo = asText(basicInfoFacts.orderNo) || asText(orderStatusInput.vasOrderNo);
  const businessNo = orderNo ? "" : asText(orderStatusInput.businessNo);
  const includeAtoms = asBoolDefault(orderStatusInput.includeAtoms, true);
  const skip = !includeAtoms || (!orderNo && !businessNo);
  const data: Record<string, unknown> = skip
    ? {}
    : {
        pageNum: 1,
        pageSize: clampPageSize(orderStatusInput.maxAtomRows),
      };
  if (orderNo) data.orderNo = orderNo;
  if (!orderNo && businessNo) data.businessNo = businessNo;

  return {
    vasListRequestData: skip ? "" : JSON.stringify(data),
    vasListActionPlan: {
      action: "wh.va.order.getVasList",
      data,
      skip,
    },
    orderStatusInput,
    basicInfoFacts,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-vas-list-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "build-vas-list-request failed");
      process.exit(1);
    });
}
