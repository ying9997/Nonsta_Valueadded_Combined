/**
 * 节点：validate-intent — 校验 intent / subTopic / inboundOrderNos
 * FaaS 单文件闭环，无外部 import。
 */

const VALID_INTENTS = new Set(["submit_guide", "status", "progress"]);
const OMS_REQUIRED_INTENTS = new Set(["status", "progress"]);

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

function detectIntent(rawIntent: string, subTopic: string): string {
  if (VALID_INTENTS.has(rawIntent)) return rawIntent;
  if (/提交|怎么验|PDA|API|Excel/i.test(subTopic)) return "submit_guide";
  if (/抽验|费用|结果/i.test(subTopic)) return "progress";
  if (/状态|进度/i.test(subTopic)) return "status";
  return "submit_guide";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const subTopic = str(params.subTopic);
  const intent = detectIntent(str(params.intent), subTopic);
  const phase = str(params.phase);
  const inboundOrderNos = coerceOrderNos(params);
  const customerIntent = str(params.customerIntent);
  const query = str(params.query);
  const inputContext = params.inputContext ?? {};

  const needsOrders = OMS_REQUIRED_INTENTS.has(intent);
  const validationOk = !needsOrders || inboundOrderNos.length > 0;

  return validationOk
    ? {
        validationOk: true,
        intent,
        subTopic,
        phase,
        inboundOrderNos,
        query,
        customerIntent,
        inputContext,
      }
    : {
        validationOk: false,
        error: "status/progress 场景需提供 inboundOrderNos 或 inboundOrderNo",
        intent,
        subTopic,
        phase,
        inboundOrderNos,
        query,
        customerIntent,
        inputContext,
      };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
