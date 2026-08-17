/**
 * 节点：为 winit.wh.inbound.getOrderDetail 组装插件批处理动作
 */

const INBOUND_DETAIL_ACTION = "winit.wh.inbound.getOrderDetail";
const PLUGIN_BATCH_MAX_ACTIONS_DEFAULT = 100;

function getPluginBatchMaxActions(): number {
  if (typeof process !== "undefined" && process.env?.COZE_WINIT_PLUGIN_BATCH_MAX) {
    const n = Number(process.env.COZE_WINIT_PLUGIN_BATCH_MAX);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return PLUGIN_BATCH_MAX_ACTIONS_DEFAULT;
}

type ActionPlan = { inputToken: string; queryBy: "orderNo" | "customerOrderNo" };

async function main({ params }: { params: Record<string, unknown> }) {
  const skipApi = params.skipApi === true;
  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const customerRefNos = ((params.customerRefNos as string[]) ?? []).filter((o) => o?.trim());

  if (skipApi) {
    return {
      actions: [],
      actionPlans: [],
      winitPluginBatchActionsCount: 0,
      actionName: INBOUND_DETAIL_ACTION,
      skipApi: true,
    };
  }

  const actionPlans: ActionPlan[] = [];
  for (const no of wiOrderNos) actionPlans.push({ inputToken: no, queryBy: "orderNo" });
  for (const ref of customerRefNos) actionPlans.push({ inputToken: ref, queryBy: "customerOrderNo" });

  const forPlugin = actionPlans.slice(0, getPluginBatchMaxActions());
  const actions = forPlugin.map((p) => {
    const data: Record<string, string> = {};
    if (p.queryBy === "orderNo") data.orderNo = p.inputToken;
    else data.customerOrderNo = p.inputToken;
    return { action: INBOUND_DETAIL_ACTION, data: JSON.stringify(data) };
  });

  return {
    actions,
    actionPlans: forPlugin,
    winitPluginBatchActionsCount: actions.length,
    actionName: INBOUND_DETAIL_ACTION,
    skipApi: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
