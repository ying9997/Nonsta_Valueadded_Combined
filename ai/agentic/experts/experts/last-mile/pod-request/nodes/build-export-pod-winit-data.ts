/**
 * 节点：为万邑通 OpenAPI `wh.outbound.exportOutboundPod` 拼装请求体 JSON 字符串。
 * 置于 openapi 插件上游；**不作为**专家调用边界字段。
 *
 * 【输入】branch、`verifiedOutboundOrderNos`（经 queryOutboundOrder 校验后的出库单号）
 * 【输出】`winitRequestData`：`{"outboundOrderNoList":[...]}` 的 JSON.stringify；非 export 分支或列表为空时为 `""`
 */

async function main({ params }: { params: Record<string, unknown> }) {
  const branch = String(params.branch ?? "").trim();
  const list = Array.isArray(params.verifiedOutboundOrderNos)
    ? (params.verifiedOutboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  if (branch !== "export" || list.length === 0) {
    return { winitRequestData: "" };
  }

  const body = { outboundOrderNoList: list };
  return { winitRequestData: JSON.stringify(body) };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-export-pod-winit-data")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
