/**
 * 节点：validate-input — 校验轨迹无上网专家入参是否足以启动分析
 * FaaS 单文件闭环，无外部 import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】params：query, trackingIds, outboundOrderNos, customerIntent, trajectoryText, enrichedContext（可选覆盖层）, inputContext
 * 【输出】原字段透传；contextOverlay 供 fetch-and-enrich 与自拉取结果合并；valid 表示至少有一种启动来源
 */

const TNS_DELIVERY_CONTEXT_KEY = "last-mile/delivery-status";

function resolveTrackingNoScanOverlay(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const entries = source[TNS_DELIVERY_CONTEXT_KEY];
  if (!Array.isArray(entries) || entries.length === 0) return { ...source };
  const last = entries[entries.length - 1];
  const delivery = last && typeof last === "object" && !Array.isArray(last)
    ? { ...(last as Record<string, unknown>) }
    : {};
  delete delivery._meta;
  const topLevel: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.includes("/") && Array.isArray(value)) continue;
    topLevel[key] = value;
  }
  return { ...topLevel, ...delivery };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];
  const trajectoryText = String(params.trajectoryText ?? "").trim();
  const ec = resolveTrackingNoScanOverlay(params.enrichedContext);
  const hasOverlay =
    ec !== undefined &&
    ec !== null &&
    typeof ec === "object" &&
    !Array.isArray(ec) &&
    Object.keys(ec).length > 0;
  const hasIds = trackingIds.length > 0 || outboundOrderNos.length > 0;
  const hasText = trajectoryText.length > 0;
  const ci = String(params.customerIntent ?? "").trim();
  const q = String(params.query ?? "").trim();
  const valid = hasIds || hasText || hasOverlay || ci.length > 0 || q.length > 0;
  const errMsg =
    "请至少提供 trackingIds、outboundOrderNos、trajectoryText、enrichedContext（覆盖层）、customerIntent 或 query 之一";
  const customerIntentOut = valid ? ci : `[输入校验] ${errMsg}`.trim();

  const ret = {
    valid,
    error: valid ? "" : errMsg,
    query: q,
    trackingIds,
    outboundOrderNos,
    customerIntent: customerIntentOut,
    trajectoryText,
    contextOverlay: hasOverlay ? ec : {},
    inputContext: params.inputContext && typeof params.inputContext === "object" ? params.inputContext : {},
  };
  return ret;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
