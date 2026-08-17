/**
 * 节点：为万邑通 OpenAPI `afs.customer.compensate.pageList` 拼装请求体 JSON 字符串。
 * 置于 openapi 插件上游；**不作为**专家调用边界顶层字段。
 *
 * 【输入】branch、trackingIds、outboundOrderNos、claimIds
 * 【输出】winitRequestData：JSON.stringify(payload)；非 query 分支为空串
 */

function joinCsv(arr: string[]): string {
  return arr.filter(Boolean).join(",");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const branch = String(params.branch ?? "").trim();
  if (branch !== "query") {
    return { winitRequestData: "" };
  }

  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const claimIds = Array.isArray(params.claimIds)
    ? (params.claimIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const payload = {
    pageVo: { page: 1, pageSize: 20 },
    source: "CUSTOMER",
    compensateStatus: "",
    compensateApplyNos: joinCsv(claimIds),
    businessNos: joinCsv(outboundOrderNos),
    trackingNos: joinCsv(trackingIds),
    warehouseCodes: "",
    deliveryMethods: "",
    applyStartDate: "",
    applyEndDate: "",
    acceptStartDate: "",
    acceptEndDate: "",
    claimEndStartDate: "",
    claimEndEndDate: "",
    isHaveToSupMaterial: "",
  };

  return { winitRequestData: JSON.stringify(payload) };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-compensate-list-data")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
