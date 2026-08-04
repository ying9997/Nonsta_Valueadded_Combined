/**
 * 节点：解析海外验查询意图与模式
 */

const VALID_INTENTS = new Set(["progress", "mode_faq"]);
const VALID_MODES = new Set(["with_carton", "without_carton", "forecast", "auto"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeIntent(raw: unknown): string {
  const t = str(raw).toLowerCase();
  return VALID_INTENTS.has(t) ? t : "progress";
}

function normalizeMode(raw: unknown): string {
  const t = str(raw).toLowerCase();
  return VALID_MODES.has(t) ? t : "auto";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const intent = normalizeIntent(params.intent);
  const inspectionMode = normalizeMode(params.inspectionMode);
  const modeTopic = str(params.modeTopic) || "packing_list_vs_forecast";
  const inboundOrderNos = ((params.inboundOrderNos as string[]) ?? [])
    .map((o) => String(o ?? "").trim())
    .filter(Boolean);

  if (intent === "mode_faq") {
    return {
      intent,
      inspectionMode,
      modeTopic,
      skipApi: true,
      validationOk: true,
      inboundOrderNos,
    };
  }

  const validationOk = inboundOrderNos.length > 0;
  return {
    intent,
    inspectionMode,
    modeTopic,
    skipApi: !validationOk,
    validationOk,
    error: validationOk ? "" : "progress 意图需提供 inboundOrderNos",
    inboundOrderNos,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("resolve-overseas-query")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
