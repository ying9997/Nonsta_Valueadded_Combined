/**
 * 节点：拉取 TMS 运输单 queryPage
 */

const TMS_QUERY_PAGE_ACTION =
  (typeof process !== "undefined" && process.env?.COZE_WINIT_TMS_QUERY_PAGE_ACTION?.trim()) ||
  "tms.transportorder.queryPage";

type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

function parseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function coerceList(parsed: unknown): unknown[] {
  if (parsed == null) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  if (o.output != null) return coerceList(o.output);
  if (o.code === "0" || o.code === 0) return coerceList(o.data);
  return Array.isArray(o.list) ? o.list : [];
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

async function main({ params }: { params: Record<string, unknown> }) {
  if (params.skipTms === true) {
    return { tmsRawList: [] };
  }

  const pluginList = params.winitTmsPluginOutputList;
  let list: unknown[] = [];
  if (Array.isArray(pluginList) && pluginList.length > 0) {
    for (const item of pluginList as Array<{ data?: unknown }>) {
      list.push(...coerceList(parseCozeWorkflowDataField(item?.data)));
    }
  } else {
    const actions = (Array.isArray(params.actions) ? params.actions : []) as Array<{
      action: string;
      data: string;
    }>;
    const env = getCozeWinitEnv();
    if (env && actions.length > 0) {
      try {
        for (const act of actions) {
          const data = JSON.parse(act.data) as Record<string, unknown>;
          const parsed = await runCozeWinitWorkflow(env, act.action || TMS_QUERY_PAGE_ACTION, data);
          list.push(...coerceList(parsed));
        }
      } catch {
        list = [];
      }
    }
  }

  return { tmsRawList: list };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-tms-transport-order")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
