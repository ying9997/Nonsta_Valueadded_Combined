/**
 * 节点：拉取 queryOrderTracking 并归并为 trackingByOrderNo
 */

import {
  ORDER_TRACKING_ACTION,
  coerceOrderTrackingPayload,
  getCozeWinitEnv,
  parseCozeWorkflowDataField,
  runCozeWinitWorkflow,
} from "../../../../shared/inbound-winit-tracking";

type ActionPlan = { orderNo: string };

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.skipApi === true || params.skipTracking === true) {
    return {
      trackingByOrderNo: {},
      _trackingFetchMeta: { strategy: "skipped" },
    };
  }

  type PluginItem = { data?: unknown };
  const pluginList = params.winitTrackingPluginOutputList;
  const actionPlans = (Array.isArray(params.trackingActionPlans)
    ? params.trackingActionPlans
    : []) as ActionPlan[];
  const trackingByOrderNo: Record<string, unknown[]> = {};
  const errors: string[] = [];

  if (Array.isArray(pluginList) && pluginList.length > 0) {
    for (let i = 0; i < pluginList.length; i++) {
      const plan = actionPlans[i];
      const parsed = parseCozeWorkflowDataField((pluginList[i] as PluginItem)?.data);
      const row = coerceOrderTrackingPayload(parsed);
      if (!row || !plan?.orderNo) continue;
      trackingByOrderNo[plan.orderNo.trim().toUpperCase()] = row.trackingList;
    }
    return {
      trackingByOrderNo,
      _trackingFetchMeta: {
        strategy: "batch-plugin",
        actionPlanCount: actionPlans.length,
        resolvedCount: Object.keys(trackingByOrderNo).length,
      },
    };
  }

  const actions = (Array.isArray(params.trackingActions) ? params.trackingActions : []) as Array<{
    action: string;
    data: string;
  }>;
  const env = getCozeWinitEnv();

  if (!env || actions.length === 0) {
    return {
      trackingByOrderNo: {},
      _trackingFetchMeta: {
        strategy: "local-fetch-skipped",
        reason: env ? "no actions" : "missing Coze env",
      },
    };
  }

  for (let i = 0; i < actions.length; i++) {
    const act = actions[i];
    const plan = actionPlans[i];
    try {
      const data = JSON.parse(act.data) as Record<string, unknown>;
      const parsed = await runCozeWinitWorkflow(env, act.action || ORDER_TRACKING_ACTION, data);
      const row = coerceOrderTrackingPayload(parsed);
      if (row && plan?.orderNo) {
        trackingByOrderNo[plan.orderNo.trim().toUpperCase()] = row.trackingList;
      }
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e));
    }
  }

  return {
    trackingByOrderNo,
    _trackingFetchMeta: {
      strategy: "local-proxy-tracking",
      resolvedCount: Object.keys(trackingByOrderNo).length,
      errors: errors.length ? errors : undefined,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-order-tracking")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
