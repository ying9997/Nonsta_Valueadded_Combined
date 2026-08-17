/**
 * 节点：为 wh.tracking.queryOrderTracking 组装批处理动作
 * - 从 rawOrderData.list[].orderNo 提取 WI 单号（客户参考号查详情后亦会解析出 orderNo）
 */

import {
  ORDER_TRACKING_ACTION,
  buildOrderTrackingActions,
  orderNosFromRawOrderData,
} from "../../../../shared/inbound-winit-tracking";

const PLUGIN_BATCH_MAX_ACTIONS_DEFAULT = 100;

function getPluginBatchMaxActions(): number {
  if (typeof process !== "undefined" && process.env?.COZE_WINIT_PLUGIN_BATCH_MAX) {
    const n = Number(process.env.COZE_WINIT_PLUGIN_BATCH_MAX);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return PLUGIN_BATCH_MAX_ACTIONS_DEFAULT;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const skipApi = params.skipApi === true;
  const includeTracking = params.includeTracking !== false;

  if (skipApi || !includeTracking) {
    return {
      trackingActions: [],
      trackingActionPlans: [],
      winitTrackingBatchActionsCount: 0,
      trackingActionName: ORDER_TRACKING_ACTION,
      skipTracking: true,
    };
  }

  const orderNos = orderNosFromRawOrderData(params.rawOrderData);
  const maxActions = getPluginBatchMaxActions();
  const forPlugin = orderNos.slice(0, maxActions);
  const trackingActions = buildOrderTrackingActions(forPlugin);
  const trackingActionPlans = forPlugin.map((orderNo) => ({ orderNo }));

  return {
    trackingActions,
    trackingActionPlans,
    winitTrackingBatchActionsCount: trackingActions.length,
    trackingActionName: ORDER_TRACKING_ACTION,
    skipTracking: trackingActions.length === 0,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-order-tracking")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
