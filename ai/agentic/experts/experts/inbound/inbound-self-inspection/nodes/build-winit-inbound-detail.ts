/**
 * 节点：为 winit.wh.inbound.getOrderDetail 组装插件批处理动作
 * FaaS 单文件闭环，无外部 import。
 */

const INBOUND_DETAIL_ACTION = "winit.wh.inbound.getOrderDetail";

type ActionPlan = { inputToken: string; queryBy: "orderNo" | "customerOrderNo" };

async function main({ params }: { params: Record<string, unknown> }) {
  const skipOms = params.skipOms === true;
  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const customerRefNos = ((params.customerRefNos as string[]) ?? []).filter((o) => o?.trim());

  if (skipOms || (wiOrderNos.length === 0 && customerRefNos.length === 0)) {
    return {
      actions: [],
      actionPlans: [],
      winitPluginBatchActionsCount: 0,
      actionName: INBOUND_DETAIL_ACTION,
      skipOms: true,
    };
  }

  const actionPlans: ActionPlan[] = [];
  for (const no of wiOrderNos) actionPlans.push({ inputToken: no, queryBy: "orderNo" });
  for (const ref of customerRefNos) actionPlans.push({ inputToken: ref, queryBy: "customerOrderNo" });

  const actions = actionPlans.map((p) => {
    const data: Record<string, string> = {};
    if (p.queryBy === "orderNo") data.orderNo = p.inputToken;
    else data.customerOrderNo = p.inputToken;
    return { action: INBOUND_DETAIL_ACTION, data: JSON.stringify(data) };
  });

  return {
    actions,
    actionPlans,
    winitPluginBatchActionsCount: actions.length,
    actionName: INBOUND_DETAIL_ACTION,
    skipOms: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
