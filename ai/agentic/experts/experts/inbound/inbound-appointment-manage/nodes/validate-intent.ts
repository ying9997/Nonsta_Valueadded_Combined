/**
 * 节点：validate-intent — 校验 intent 与 query/penalty 所需单号
 * FaaS 单文件闭环，无外部 import。
 */

const VALID_INTENTS = new Set([
  "query",
  "create_guide",
  "modify_guide",
  "cancel_guide",
  "split_shipment",
  "penalty",
  "pod_guide",
]);
const API_REQUIRED_INTENTS = new Set(["query", "penalty"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function coerceOrderNos(params: Record<string, unknown>): string[] {
  const fromArray = Array.isArray(params.inboundOrderNos)
    ? (params.inboundOrderNos as string[]).map((o) => String(o).trim()).filter(Boolean)
    : [];
  const single = str(params.inboundOrderNo);
  if (single && !fromArray.includes(single)) fromArray.unshift(single);
  return fromArray;
}

function detectIntent(rawIntent: string, query: string, customerIntent: string): string {
  const aliases: Record<string, string> = {
    how_to_book: "create_guide",
    how_to_cancel: "cancel_guide",
    how_to_modify: "modify_guide",
    how_to_change_time: "modify_guide",
    status: "query",
    penalty_dispute: "penalty",
    split_shipment: "split_shipment",
    download_pod: "pod_guide",
    pod_download: "pod_guide",
  };
  const t = rawIntent.trim().toLowerCase();
  if (VALID_INTENTS.has(t)) return t;
  if (aliases[t]) return aliases[t];

  const text = `${query} ${customerIntent}`;
  if (/分批|拆单|后缀\s*[ABC]|未到仓待办/i.test(text)) return "split_shipment";
  if (/违规费|扣费|申诉|未预约/i.test(text)) return "penalty";
  if (/取消预约|取消/i.test(text)) return "cancel_guide";
  if (/改.*时间|修改预约|改约/i.test(text)) return "modify_guide";
  if (/下载.*POD|POD.*下载|签收证明|签收.*PDF|exportPod|预约.*POD/i.test(text)) return "pod_guide";
  if (/预约状态|预约码|查预约|WBO|WABO|SBO|RBO|EXRBO/i.test(text)) return "query";
  if (/怎么预约|如何预约|预约流程/i.test(text)) return "create_guide";
  return "create_guide";
}

function detectDeliveryWayHint(explicit: string, query: string, customerIntent: string): string {
  if (explicit) return explicit.toUpperCase();
  const text = `${query} ${customerIntent}`.toUpperCase();
  if (/整柜|FCL|DROP|LIVE/.test(text)) return "FCL";
  if (/散货|LCL|卡车/.test(text)) return "LCL";
  if (/快递|EXPRESS|COURIER|面单/.test(text)) return "EXPRESS";
  return "";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const query = str(params.query);
  const customerIntent = str(params.customerIntent);
  const intent = detectIntent(str(params.intent) || "create_guide", query, customerIntent);
  const inboundOrderNos = coerceOrderNos(params);
  const bookingNo = str(params.bookingNo);
  const warehouseCode = str(params.warehouseCode).toUpperCase();
  const deliveryWayHint = detectDeliveryWayHint(str(params.deliveryWayHint), query, customerIntent);
  const inputContext = params.inputContext ?? {};

  const needsApiKey = API_REQUIRED_INTENTS.has(intent);
  const hasLookupKey = inboundOrderNos.length > 0 || bookingNo.length > 0;
  const validationOk = !needsApiKey || hasLookupKey;

  return validationOk
    ? {
        validationOk: true,
        intent,
        inboundOrderNos,
        bookingNo,
        warehouseCode,
        deliveryWayHint,
        query,
        customerIntent,
        inputContext,
      }
    : {
        validationOk: false,
        error: "query/penalty 场景需提供 inboundOrderNos、inboundOrderNo 或 bookingNo",
        intent,
        inboundOrderNos,
        bookingNo,
        warehouseCode,
        deliveryWayHint,
        query,
        customerIntent,
        inputContext,
      };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
