/**
 * 节点：本地 Runner 补拉入库单详情（无插件输出时走 Coze workflow/run 代理）
 */

type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

const INBOUND_DETAIL_ACTION = "winit.wh.inbound.getOrderDetail";

function parseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    const once = JSON.parse(data) as unknown;
    if (typeof once === "string") {
      try {
        return JSON.parse(once) as unknown;
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return data;
  }
}

function coerceDetailPayload(parsed: unknown): Record<string, unknown> | null {
  if (parsed == null || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (o.output != null && typeof o.output === "object") return coerceDetailPayload(o.output);
  if (o.code === "0" || o.code === 0) {
    const inner = o.data;
    if (typeof inner === "string") {
      try {
        return coerceDetailPayload(JSON.parse(inner));
      } catch {
        return null;
      }
    }
    if (inner != null && typeof inner === "object") return coerceDetailPayload(inner);
    return null;
  }
  if (o.orderNo != null || o.inboundOrderNum != null || o.inboundOrderNo != null) return o;
  return null;
}

async function runCozeWinitWorkflow(
  env: CozeWinitLocalEnv,
  action: string,
  data: Record<string, unknown>
): Promise<unknown> {
  const baseUrl = (process.env.COZE_API_BASE_URL ?? "https://api.coze.cn").replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/v1/workflow/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: env.workflowId,
      parameters: {
        action,
        customerCode: env.customerCode,
        customerName: env.customerName,
        username: env.username,
        language: env.language || "zh_CN",
        data: JSON.stringify(data),
      },
    }),
  });
  const text = await res.text();
  const body = JSON.parse(text) as Record<string, unknown>;
  if (!res.ok || (body.code !== 0 && body.code !== "0")) {
    throw new Error(`Coze workflow failed: ${String(body.msg ?? text).slice(0, 300)}`);
  }
  return parseCozeWorkflowDataField(body.data);
}

function getCozeWinitEnv(): CozeWinitLocalEnv | null {
  if (typeof process === "undefined" || !process.env) return null;
  const apiToken = process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "";
  const workflowId =
    process.env.COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID ?? process.env.COZE_WINIT_WORKFLOW_ID ?? "";
  const customerCode = process.env.COZE_WINIT_CUSTOMER_CODE ?? "";
  const customerName = process.env.COZE_WINIT_CUSTOMER_NAME ?? "";
  const username = process.env.COZE_WINIT_USERNAME ?? "";
  if (!apiToken || !workflowId || !customerCode || !customerName || !username) return null;
  return {
    apiToken,
    workflowId,
    customerCode,
    customerName,
    username,
    language: process.env.COZE_WINIT_LANGUAGE ?? "zh_CN",
  };
}

function mergePluginOutputs(params: Record<string, unknown>): Record<string, unknown> {
  type ActionPlan = { inputToken: string; queryBy: string };
  const actionPlans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as ActionPlan[];
  const outputList = (Array.isArray(params.winitPluginOutputList) ? params.winitPluginOutputList : []) as Array<{
    data?: unknown;
  }>;
  const rowsByKey = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < outputList.length; i++) {
    const row = coerceDetailPayload(parseCozeWorkflowDataField(outputList[i]?.data));
    if (!row) continue;
    const key = String(row.orderNo ?? row.inboundOrderNum ?? "").trim().toUpperCase();
    if (key) rowsByKey.set(key, row);
  }
  const list = Array.from(rowsByKey.values());
  return {
    list,
    total: list.length,
    _fetchMeta: {
      strategy: "detail-only",
      batchPluginMerged: true,
      actionPlanCount: actionPlans.length,
      resolvedCount: list.length,
    },
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.skipApi === true) {
    return { rawOrderData: { list: [], total: 0, _fetchMeta: { strategy: "kb-only" } } };
  }

  const pluginList = params.winitPluginOutputList;
  if (Array.isArray(pluginList) && pluginList.length > 0) {
    return { rawOrderData: mergePluginOutputs(params) };
  }

  const actions = (Array.isArray(params.actions) ? params.actions : []) as Array<{
    action: string;
    data: string;
  }>;
  const env = getCozeWinitEnv();
  const list: Record<string, unknown>[] = [];
  const errors: string[] = [];

  if (!env) {
    return {
      rawOrderData: {
        list: [],
        total: 0,
        _fetchMeta: { strategy: "local-fetch-skipped", reason: "missing Coze env" },
      },
    };
  }

  for (const act of actions) {
    try {
      const data = JSON.parse(act.data) as Record<string, unknown>;
      const parsed = await runCozeWinitWorkflow(env, act.action || INBOUND_DETAIL_ACTION, data);
      const row = coerceDetailPayload(parsed);
      if (row) list.push(row);
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e));
    }
  }

  return {
    rawOrderData: {
      list,
      total: list.length,
      _fetchMeta: { strategy: "local-proxy-detail", resolvedCount: list.length, errors: errors.length ? errors : undefined },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-inbound-order")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
