/**
 * 节点：route-intent — SOP 类 intent=KB only；query/penalty=API + 可选 OMS 表头
 * FaaS 单文件闭环，无外部 import。
 */

const KB_ONLY_INTENTS = new Set([
  "create_guide",
  "modify_guide",
  "cancel_guide",
  "split_shipment",
]);
const API_INTENTS = new Set(["query", "penalty", "pod_guide"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function hasOrderLookup(params: Record<string, unknown>): boolean {
  const nos = Array.isArray(params.inboundOrderNos) ? params.inboundOrderNos : [];
  return nos.length > 0 || str(params.bookingNo).length > 0;
}

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.validationOk !== true) {
    return {
      routePath: "invalid",
      skipApi: true,
      skipOrderDetail: true,
      kbOnly: true,
    };
  }

  const intent = str(params.intent) || "create_guide";
  const hasLookup = hasOrderLookup(params);
  const kbOnlyIntent = KB_ONLY_INTENTS.has(intent);
  const apiIntent = API_INTENTS.has(intent);
  const kbOnly = kbOnlyIntent || (intent === "pod_guide" && !hasLookup);
  const skipApi = kbOnly || !apiIntent;
  const skipOrderDetail = skipApi || !hasLookup;

  return {
    routePath: kbOnly ? "kb_only" : "api_chain",
    skipApi,
    skipOrderDetail,
    kbOnly,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("route-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
