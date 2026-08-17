/**
 * 节点：merge-capacity-signal — 组装 MKS 额度查询上下文
 * FaaS 单文件闭环，无外部 import。
 */

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

async function main({ params }: { params: Record<string, unknown> }) {
  const quotaSnapshot = (params.quotaSnapshot ?? {}) as Record<string, unknown>;
  const warehouseCode = str(params.warehouseCode);
  const checkType = str(params.checkType) || "overall";
  const cargoProfile = params.cargoProfile ?? null;
  const quotaFetchOk = params.quotaFetchOk === true;

  const apiAvailable = quotaSnapshot.apiAvailable === true;
  const dataSource = apiAvailable ? "api" : "kb_only";
  const dataQuality = apiAvailable ? "real" : "mock";

  return {
    mergedCapacity: {
      warehouseCode,
      checkType,
      quotaSnapshot,
      cargoProfile,
    },
    dataSource,
    dataQuality,
    quotaFetchOk,
    kbFallbackNeeded: !quotaFetchOk,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("merge-capacity-signal")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
