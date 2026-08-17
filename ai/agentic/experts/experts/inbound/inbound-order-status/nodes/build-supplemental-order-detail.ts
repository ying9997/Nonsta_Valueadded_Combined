/** 为 wh.inboundOrder.getOrderDetail 组装补充详情批处理动作。 */

import { orderNosFromRawOrderData } from "../../../../shared/inbound-winit-tracking";
import {
  INBOUND_SUPPLEMENTAL_DETAIL_ACTION,
  buildSupplementalDetailActions,
} from "../../../../shared/inbound-order-supplemental-detail";

const PLUGIN_BATCH_MAX_ACTIONS_DEFAULT = 100;

function getPluginBatchMaxActions(): number {
  const value = typeof process !== "undefined" ? process.env?.COZE_WINIT_PLUGIN_BATCH_MAX : undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 1
    ? Math.floor(number)
    : PLUGIN_BATCH_MAX_ACTIONS_DEFAULT;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const includeOrderTimeDetails = params.includeOrderTimeDetails !== false;
  if (params.skipApi === true || !includeOrderTimeDetails) {
    return {
      supplementalActions: [],
      supplementalActionPlans: [],
      supplementalBatchActionsCount: 0,
      supplementalActionName: INBOUND_SUPPLEMENTAL_DETAIL_ACTION,
      skipSupplementalDetail: true,
    };
  }

  const orderNos = orderNosFromRawOrderData(params.rawOrderData).slice(0, getPluginBatchMaxActions());
  const { actions, actionPlans } = buildSupplementalDetailActions(orderNos);
  return {
    supplementalActions: actions,
    supplementalActionPlans: actionPlans,
    supplementalBatchActionsCount: actions.length,
    supplementalActionName: INBOUND_SUPPLEMENTAL_DETAIL_ACTION,
    skipSupplementalDetail: actions.length === 0,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-supplemental-order-detail")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
