/**
 * 节点：validate-intent — 规范化操作意图，决定是否拉取订单详情
 * FaaS 单文件闭环，无外部 import。
 */

type OrderIntent = "create" | "modify" | "close" | "cancel" | "general";

const VALID_INTENTS = new Set<OrderIntent>(["create", "modify", "close", "cancel", "general"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeIntent(raw: unknown): OrderIntent {
  const s = str(raw).toLowerCase();
  if (VALID_INTENTS.has(s as OrderIntent)) return s as OrderIntent;
  if (/新建|创建|下单|create/i.test(s)) return "create";
  if (/修改|变更|modify/i.test(s)) return "modify";
  if (/关闭|close/i.test(s)) return "close";
  if (/取消|撤销|cancel/i.test(s)) return "cancel";
  return "general";
}

function extractEnabledProducts(inputContext: unknown): string[] {
  if (!inputContext || typeof inputContext !== "object" || Array.isArray(inputContext)) return [];
  const ctx = inputContext as Record<string, unknown>;
  const prev = ctx.previousOutput;
  if (!prev || typeof prev !== "object" || Array.isArray(prev)) return [];
  const structured = (prev as Record<string, unknown>).structured;
  if (!structured || typeof structured !== "object" || Array.isArray(structured)) return [];
  const products = (structured as Record<string, unknown>).enabledProducts;
  return Array.isArray(products) ? products.map((p) => String(p)) : [];
}

function extractHasSelfInspection(inputContext: unknown): boolean {
  if (!inputContext || typeof inputContext !== "object" || Array.isArray(inputContext)) return false;
  const prev = (inputContext as Record<string, unknown>).previousOutput;
  if (!prev || typeof prev !== "object" || Array.isArray(prev)) return false;
  const structured = (prev as Record<string, unknown>).structured;
  if (!structured || typeof structured !== "object") return false;
  return (structured as Record<string, unknown>).hasSelfInspection === true;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = normalizeIntent(params.intent);
  const inboundOrderNo = str(params.inboundOrderNo).toUpperCase();
  const targetWarehouseCode = str(params.targetWarehouseCode).toUpperCase();
  const targetPsc = str(params.targetPsc);
  const customerIntent = str(params.customerIntent);
  const inputContext = params.inputContext ?? {};
  const enabledProducts = extractEnabledProducts(inputContext);
  const hasSelfInspection = extractHasSelfInspection(inputContext);

  const needsOrderDetail = ["modify", "close", "cancel"].includes(intent) && inboundOrderNo.length > 0;
  const skipApi = !needsOrderDetail;

  let validationOk = true;
  let error = "";
  if (["modify", "close", "cancel"].includes(intent) && !inboundOrderNo) {
    validationOk = false;
    error = `${intent} 意图需提供 inboundOrderNo`;
  }

  return {
    validationOk,
    error,
    intent,
    inboundOrderNo,
    targetWarehouseCode,
    targetPsc,
    customerIntent,
    inputContext,
    enabledProducts,
    hasSelfInspection,
    needsOrderDetail,
    skipApi,
    wiOrderNos: inboundOrderNo ? [inboundOrderNo] : [],
    customerRefNos: [] as string[],
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
