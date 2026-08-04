/**
 * 节点：route-intent — submit_guide=KB only；status/progress=OMS 链
 * FaaS 单文件闭环，无外部 import。
 */

const PRE_SHIP_STATUSES = new Set(["OD", "TS"]);
const POST_ARRIVAL_STATUSES = new Set(["PEWC", "EWC"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeSubTopic(intent: string, subTopic: string): string {
  if (subTopic) return subTopic;
  if (intent === "submit_guide") return "submit_guide";
  if (intent === "progress") return "sampling_result";
  return "status";
}

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.validationOk !== true) {
    return {
      routePath: "invalid",
      skipOms: true,
      fetchExceptions: false,
      normalizedSubTopic: "",
      normalizedPhase: "",
    };
  }

  const intent = str(params.intent) || "submit_guide";
  const subTopic = str(params.subTopic);
  const phaseInput = str(params.phase);
  const normalizedSubTopic = normalizeSubTopic(intent, subTopic);

  if (intent === "submit_guide") {
    return {
      routePath: "kb_only",
      skipOms: true,
      fetchExceptions: false,
      normalizedSubTopic,
      normalizedPhase: phaseInput || "pre_ship",
    };
  }

  const normalizedPhase =
    phaseInput || (intent === "progress" ? "post_arrival" : intent === "status" ? "pre_ship" : "pre_ship");

  const fetchExceptions = intent === "progress" || normalizedSubTopic === "sampling_result";

  return {
    routePath: "oms_chain",
    skipOms: false,
    fetchExceptions,
    normalizedSubTopic,
    normalizedPhase,
    _statusHints: {
      preShipStatuses: Array.from(PRE_SHIP_STATUSES),
      postArrivalStatuses: Array.from(POST_ARRIVAL_STATUSES),
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("route-intent")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
