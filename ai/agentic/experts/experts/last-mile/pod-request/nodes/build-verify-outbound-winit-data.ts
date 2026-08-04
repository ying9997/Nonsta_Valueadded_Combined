/**
 * 节点：为 `queryOutboundOrder`（id/55）组装插件批处理动作，用于 POD 导出前的客户归属校验。
 * exportOutboundPod 无鉴权，须先经本节点 + 插件确认出库单属于当前客户。
 *
 * 【输入】branch、`outboundOrderNos`
 * 【输出】`actions`（批处理插件）、`actionPlans`（与 actions 一一对应）
 */

type ActionPlan = {
  outboundOrderNum: string;
};

function normalizeWoMainOrderNum(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const m = /^WO(\d+)[A-Za-z]*$/i.exec(s);
  if (m) return `WO${m[1]}`;
  return s;
}

function uniqueWoOrders(rawNos: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawNos) {
    const normalized = normalizeWoMainOrderNum(String(raw ?? "").trim());
    if (!normalized || !/^WO\d+/i.test(normalized)) continue;
    const key = normalized.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const branch = String(params.branch ?? "").trim();
  const list = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  if (branch !== "export" || list.length === 0) {
    return { actions: [], actionPlans: [] as ActionPlan[] };
  }

  const outboundOrderNos = uniqueWoOrders(list);
  const actionPlans: ActionPlan[] = outboundOrderNos.map((outboundOrderNum) => ({ outboundOrderNum }));

  const actions = actionPlans.map((p) => ({
    action: "queryOutboundOrder",
    data: JSON.stringify({ outboundOrderNum: p.outboundOrderNum }),
  }));

  return { actions, actionPlans };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-verify-outbound-winit-data")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
