/**
 * 节点：合并 booking.list 与 getOrderDetail 表头，确定性输出预约摘要
 * FaaS 单文件闭环，无外部 import。
 */

const BOOKING_STATUS_LABELS: Record<string, string> = {
  WBO: "待预约确认",
  WABO: "待审批",
  SBO: "预约成功",
  RBO: "已到仓",
  EXRBO: "到仓异常",
  CANCEL: "已取消",
};

type BookingRecord = {
  bookingNo: string;
  bookingStatus: string;
  bookingStatusLabel: string;
  appointmentDate: string;
  penaltyFee: number | null;
  penaltyReason: string;
  inboundOrderNo: string;
  warehouseCode: string;
  source: string;
  dataQuality: string;
};

function statusLabel(code: string): string {
  const key = code.trim().toUpperCase();
  return BOOKING_STATUS_LABELS[key] ?? "";
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeApiRecord(raw: unknown): BookingRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const bookingNo = str(o.bookingNo ?? o.appointmentNo);
  if (!bookingNo && !o.inboundOrderNo && !o.bookingStatus && !o.status) return null;
  const fee = numOrNull(o.penaltyFee ?? o.violationFee);
  const bookingStatus = str(o.bookingStatus ?? o.status);
  return {
    bookingNo,
    bookingStatus,
    bookingStatusLabel: statusLabel(bookingStatus),
    appointmentDate: str(o.appointmentDate ?? o.bookingDate),
    penaltyFee: fee,
    penaltyReason: str(o.penaltyReason ?? o.violationReason),
    inboundOrderNo: str(o.inboundOrderNo ?? o.orderNo),
    warehouseCode: str(o.warehouseCode ?? o.destWhCode),
    source: "booking_api",
    dataQuality: "real",
  };
}

function orderHeaderHint(row: Record<string, unknown>): BookingRecord | null {
  const bookingNo = str(row.bookingNo ?? row.inboundBookingNo);
  const orderNo = str(row.orderNo ?? row.inboundOrderNum);
  const status = str(row.inboundBookingStatus ?? row.bookingStatus);
  if (!bookingNo && !status) return null;
  return {
    bookingNo,
    bookingStatus: status,
    bookingStatusLabel: statusLabel(status),
    appointmentDate: str(row.appointmentDate ?? row.bookingDate ?? row.expectedSendwarehouseTime),
    penaltyFee: null,
    penaltyReason: "",
    inboundOrderNo: orderNo,
    warehouseCode: str(row.destWhCode ?? row.warehouseCode),
    source: "order_header_fallback",
    dataQuality: bookingNo ? "partial" : "status_only",
  };
}

function coerceBookingList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  return [];
}

function coerceOrderList(rawOrderData: unknown): Record<string, unknown>[] {
  if (rawOrderData == null || typeof rawOrderData !== "object") return [];
  const list = (rawOrderData as { list?: unknown[] }).list;
  if (!Array.isArray(list)) return [];
  return list.filter((r): r is Record<string, unknown> => r != null && typeof r === "object");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = str(params.intent) || "query";
  const apiRecords = coerceBookingList(params.bookingRecords)
    .map(normalizeApiRecord)
    .filter((r): r is BookingRecord => r != null);

  const seen = new Set(apiRecords.map((r) => `${r.bookingNo}|${r.inboundOrderNo}`));
  const merged: BookingRecord[] = [...apiRecords];

  if (apiRecords.length === 0) {
    for (const row of coerceOrderList(params.rawOrderData)) {
      const hint = orderHeaderHint(row);
      if (!hint) continue;
      const key = `${hint.bookingNo}|${hint.inboundOrderNo}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(hint);
      }
    }
  }

  const penaltyFees = merged.map((r) => r.penaltyFee).filter((f): f is number => f != null);
  const totalPenaltyFee = penaltyFees.length > 0 ? penaltyFees.reduce((a, b) => a + b, 0) : null;

  let dataQuality: string;
  if (apiRecords.length > 0) dataQuality = "booking_api";
  else if (merged.length > 0) dataQuality = "order_header_fallback";
  else dataQuality = "missing";

  const requiresManualAction =
    (intent === "query" || intent === "penalty") && merged.length === 0;

  return {
    bookingSummary: {
      records: merged,
      recordCount: merged.length,
      totalPenaltyFee,
      dataQuality,
      requiresManualAction,
      hasPenaltyFeeField: penaltyFees.length > 0,
    },
    bookingRecords: merged,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("summarize-booking-records")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
