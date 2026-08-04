/** 解析 wh.inboundOrder.getOrderDetail，并在进入后续节点前完成白名单标准化。 */

import {
  getCozeWinitEnv,
  parseCozeWorkflowDataField,
  runCozeWinitWorkflow,
} from "../../../../shared/inbound-winit-tracking";
import {
  INBOUND_SUPPLEMENTAL_DETAIL_ACTION,
  coerceSupplementalDetailPayload,
  normalizeSupplementalDetail,
  type SupplementalActionPlan,
} from "../../../../shared/inbound-order-supplemental-detail";

type PluginItem = { data?: unknown };

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.skipApi === true || params.skipSupplementalDetail === true) {
    return {
      supplementalByOrderNo: {},
      _supplementalFetchMeta: { strategy: "skipped" },
    };
  }

  const actionPlans = (Array.isArray(params.supplementalActionPlans)
    ? params.supplementalActionPlans
    : []) as SupplementalActionPlan[];
  const expectedCustomerCode = String(params.customerCode ?? "").trim();
  const supplementalByOrderNo: Record<string, unknown> = {};
  const errors: string[] = [];

  const accept = (parsed: unknown, plan?: SupplementalActionPlan) => {
    const row = coerceSupplementalDetailPayload(parsed);
    if (!row) return;
    const normalized = normalizeSupplementalDetail(row, expectedCustomerCode);
    if (!normalized) {
      errors.push(`supplemental detail rejected for ${plan?.orderNo ?? "unknown"}`);
      return;
    }
    supplementalByOrderNo[normalized.orderNo] = normalized;
  };

  const pluginList = params.winitSupplementalPluginOutputList;
  if (Array.isArray(pluginList) && pluginList.length > 0) {
    for (let i = 0; i < pluginList.length; i++) {
      accept(parseCozeWorkflowDataField((pluginList[i] as PluginItem)?.data), actionPlans[i]);
    }
    return {
      supplementalByOrderNo,
      _supplementalFetchMeta: {
        strategy: "batch-plugin",
        actionPlanCount: actionPlans.length,
        resolvedCount: Object.keys(supplementalByOrderNo).length,
        errors: errors.length ? errors : undefined,
      },
    };
  }

  const actions = (Array.isArray(params.supplementalActions)
    ? params.supplementalActions
    : []) as Array<{ action: string; data: string }>;
  const env = getCozeWinitEnv();
  if (!env || actions.length === 0) {
    return {
      supplementalByOrderNo,
      _supplementalFetchMeta: {
        strategy: "local-fetch-skipped",
        reason: env ? "no actions" : "missing Coze env",
      },
    };
  }

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]!;
    try {
      const data = JSON.parse(action.data) as Record<string, unknown>;
      const parsed = await runCozeWinitWorkflow(
        env,
        action.action || INBOUND_SUPPLEMENTAL_DETAIL_ACTION,
        data,
      );
      accept(parsed, actionPlans[i]);
    } catch (error) {
      errors.push(String(error instanceof Error ? error.message : error));
    }
  }

  return {
    supplementalByOrderNo,
    _supplementalFetchMeta: {
      strategy: "local-proxy-supplemental-detail",
      resolvedCount: Object.keys(supplementalByOrderNo).length,
      errors: errors.length ? errors : undefined,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-supplemental-order-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
