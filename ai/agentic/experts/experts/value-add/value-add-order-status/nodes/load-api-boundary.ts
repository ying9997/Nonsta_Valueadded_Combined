/**
 * 节点：load-api-boundary — 汇总增值单 API 和状态语义切片。
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
  const apiBoundaryKb = [
    "# api-boundary",
    asText(params.kbApiBoundary),
    "# status-semantics",
    asText(params.kbStatusSemantics),
    "# fee-goods-boundary",
    asText(params.kbFeeGoodsBoundary),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");

  return {
    apiBoundaryKb,
    orderStatusInput: asRecord(params.orderStatusInput),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-api-boundary")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "load-api-boundary failed");
      process.exit(1);
    });
}
