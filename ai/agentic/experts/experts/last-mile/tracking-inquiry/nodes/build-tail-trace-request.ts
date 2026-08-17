/**
 * 节点：build-tail-trace-request — 组装 TailTrace.getList 网关 data JSON 字符串
 * 形状对齐 scripts/test-winit-openapi-call.ts（service + data + sort）。
 */

interface InnerFilters {
  serialNumber: string;
  orderNo: string;
  trackingNo: string;
  shippingNo: string;
}

function buildInnerData(filters: InnerFilters): Record<string, unknown> {
  return {
    pageVo: { page: 1, pageSize: 20 },
    order: [{ name: "applicationTime", dir: "desc" }],
    serialNumber: filters.serialNumber,
    orderNo: filters.orderNo,
    trackingNo: filters.trackingNo,
    shippingNo: filters.shippingNo,
    checkingStatus: "",
    applicationTimeStart: "",
    applicationTimeEnd: "",
    endTimeStart: "",
    endTimeEnd: "",
    outWhTimeStart: "",
    outWhTimeEnd: "",
  };
}

/** 优先级：查件流水号 > 出库单号 > 轨迹号（仅填一类） */
function pickFilters(params: {
  inquiryIds: string[];
  outboundOrderNos: string[];
  trackingIds: string[];
}): InnerFilters {
  const empty = { serialNumber: "", orderNo: "", trackingNo: "", shippingNo: "" };
  if (params.inquiryIds.length > 0) {
    return { ...empty, serialNumber: params.inquiryIds[0] };
  }
  if (params.outboundOrderNos.length > 0) {
    return { ...empty, orderNo: params.outboundOrderNos[0] };
  }
  if (params.trackingIds.length > 0) {
    return { ...empty, trackingNo: params.trackingIds[0] };
  }
  return empty;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const branch = String(params.branch ?? "").trim();
  if (branch !== "query") {
    return { winitRequestData: "", queryHint: "non-query branch" };
  }

  const inquiryIds = Array.isArray(params.inquiryIds)
    ? (params.inquiryIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const filters = pickFilters({ inquiryIds, outboundOrderNos, trackingIds });
  const inner = buildInnerData(filters);

  const payload = {
    service: "TailTrace.getList",
    data: inner,
    sort: "asc",
    sortColumn: "",
  };

  return {
    winitRequestData: JSON.stringify(payload),
    queryHint: JSON.stringify({
      usedKeys: {
        serialNumber: !!filters.serialNumber,
        orderNo: !!filters.orderNo,
        trackingNo: !!filters.trackingNo,
      },
    }),
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-tail-trace-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
