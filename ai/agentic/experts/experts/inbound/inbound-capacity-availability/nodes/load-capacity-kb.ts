/**
 * 节点：load-capacity-kb — KB 降级语料（API Gap 时）
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const kbCapacity = str(params.kbCapacity);
  const kbFallbackNeeded = params.kbFallbackNeeded === true;
  const checkType = str(params.checkType) || "overall";
  const dataSource = str(params.dataSource) || "kb_only";

  return {
    capacityKb: kbCapacity,
    kbFallbackNeeded,
    kbScope: kbFallbackNeeded || dataSource === "kb_only" ? "fallback" : "supplement",
    checkType,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("load-capacity-kb")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
