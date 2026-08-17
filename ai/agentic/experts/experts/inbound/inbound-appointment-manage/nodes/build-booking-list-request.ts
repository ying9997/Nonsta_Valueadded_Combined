/**
 * 节点：为预约 list 组装请求
 * OpenAPI 规格：winit.wh.inbound.booking.list（见 booking-api-reference.md）
 * Coze 代理注册名默认 winit.wh.inbound.booking.list，可用 COZE_WINIT_BOOKING_LIST_ACTION 覆盖
 * FaaS 单文件闭环，无外部 import。
 */

const BOOKING_LIST_ACTION =
  (typeof process !== "undefined" && process.env?.COZE_WINIT_BOOKING_LIST_ACTION?.trim()) ||
  "winit.wh.inbound.booking.list";

async function main({ params }: { params: Record<string, unknown> }) {
  const skipApi = params.skipApi === true;
  const inboundOrderNos = ((params.inboundOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const bookingNo = typeof params.bookingNo === "string" ? params.bookingNo.trim() : "";

  if (skipApi) {
    return { actions: [], bookingActionName: BOOKING_LIST_ACTION, skipApi: true };
  }

  const data: Record<string, unknown> = { pageNum: 1, pageSize: 50 };
  if (bookingNo) data.bookingNo = bookingNo;
  if (inboundOrderNos.length > 0) data.inboundOrderNos = inboundOrderNos;

  return {
    actions: [{ action: BOOKING_LIST_ACTION, data: JSON.stringify(data) }],
    bookingActionName: BOOKING_LIST_ACTION,
    skipApi: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-booking-list-request")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
