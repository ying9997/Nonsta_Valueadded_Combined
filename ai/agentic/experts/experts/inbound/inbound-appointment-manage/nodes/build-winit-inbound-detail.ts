/**
 * 节点：为 winit.wh.inbound.getOrderDetail 组装插件批处理动作（表头 isIncludePackage=N）
 * FaaS 单文件闭环，无外部 import。
 */

const INBOUND_DETAIL_ACTION = "winit.wh.inbound.getOrderDetail";

type ActionPlan = { inputToken: string; queryBy: "orderNo" | "customerOrderNo" };

async function main({ params }: { params: Record<string, unknown> }) {
  const skipOrderDetail = params.skipOrderDetail === true;
  const wiOrderNos = ((params.wiOrderNos as string[]) ?? []).filter((o) => o?.trim());
  const customerRefNos = ((params.customerRefNos as string[]) ?? []).filter((o) => o?.trim());

  if (skipOrderDetail || (wiOrderNos.length === 0 && customerRefNos.length === 0)) {
    return {
      actions: [],
      orderDetailActionPlans: [],
      orderDetailActionsCount: 0,
      orderDetailActionName: INBOUND_DETAIL_ACTION,
      skipOrderDetail: true,
    };
  }

  const actionPlans: ActionPlan[] = [];
  for (const no of wiOrderNos) actionPlans.push({ inputToken: no, queryBy: "orderNo" });
  for (const ref of customerRefNos) actionPlans.push({ inputToken: ref, queryBy: "customerOrderNo" });

  const actions = actionPlans.map((p) => {
    const data: Record<string, string> = { isIncludePackage: "N" };
    if (p.queryBy === "orderNo") data.orderNo = p.inputToken;
    else data.customerOrderNo = p.inputToken;
    return { action: INBOUND_DETAIL_ACTION, data: JSON.stringify(data) };
  });

  return {
    actions,
    orderDetailActionPlans: actionPlans,
    orderDetailActionsCount: actions.length,
    orderDetailActionName: INBOUND_DETAIL_ACTION,
    skipOrderDetail: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-inbound-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
