/**
 * 节点：拉取抽验相关异常单（wh.inboundOrder.queryExceptionList）
 * FaaS 单文件闭环，无 external import。
 */

import { signFmsUrlDeep } from "../../../../shared/fms-token-url";

type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

const ORDER_EXCEPTION_DETAIL_ACTION = "wh.inboundOrder.queryExceptionList";
const SAMPLING_TYPES = /SAMPL|抽验|OW01V126/i;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function flattenOrderExceptionDetails(orderNo: string, items: unknown[]): unknown[] {
  const rows: unknown[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const exceptionName = str(o.exceptionName);
    const exceptionDesc = str(o.exceptionDesc);
    const details = Array.isArray(o.exceptionDetailList) ? o.exceptionDetailList : [];
    if (details.length === 0) {
      rows.push({
        orderNo,
        exceptionType: exceptionName,
        type: exceptionName,
        exceptionReason: exceptionDesc,
        errormsg: exceptionDesc,
      });
      continue;
    }
    for (const d of details) {
      if (!d || typeof d !== "object") continue;
      const detail = d as Record<string, unknown>;
      rows.push({
        orderNo,
        exceptionType: exceptionName,
        type: exceptionName,
        exceptionReason: exceptionDesc,
        errormsg: exceptionDesc,
        merchandiseCode: str(detail.merchandiseSerno),
        packageNo: str(detail.packageSerno),
      });
    }
  }
  return rows;
}

function coerceList(parsed: unknown, orderNoHint?: string): unknown[] {
  if (parsed == null) return [];
  if (Array.isArray(parsed)) {
    return orderNoHint ? flattenOrderExceptionDetails(orderNoHint, parsed) : parsed;
  }
  if (typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  if (o.output != null) return coerceList(o.output, orderNoHint);
  if (o.code === "0" || o.code === 0) return coerceList(o.data, orderNoHint);
  return Array.isArray(o.list) ? o.list : [];
}

function isSamplingRecord(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const type = String(o.exceptionType ?? o.type ?? o.exceptionName ?? "");
  const reason = String(o.exceptionReason ?? o.errormsg ?? o.exceptionDesc ?? "");
  return SAMPLING_TYPES.test(type) || SAMPLING_TYPES.test(reason);
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
  if (params.skipExceptionApi === true) {
    return { samplingExceptions: [] };
  }

  const pluginList = params.winitExceptionPluginOutputList;
  let list: unknown[] = [];
  if (Array.isArray(pluginList) && pluginList.length > 0) {
    const actions = (Array.isArray(params.actions) ? params.actions : []) as Array<{
      data: string;
    }>;
    for (let i = 0; i < pluginList.length; i++) {
      const item = pluginList[i] as { data?: unknown };
      let orderNoHint = "";
      try {
        orderNoHint = str(JSON.parse(actions[i]?.data ?? "{}").orderNo);
      } catch {
        /* ignore */
      }
      list.push(...coerceList(parseCozeWorkflowDataField(item?.data), orderNoHint || undefined));
    }
  } else {
    const actions = (Array.isArray(params.actions) ? params.actions : []) as Array<{
      action: string;
      data: string;
    }>;
    const env = getCozeWinitEnv();
    if (env && actions.length > 0) {
      for (const act of actions) {
        try {
          const data = JSON.parse(act.data) as Record<string, unknown>;
          const orderNoHint = str(data.orderNo);
          const parsed = await runCozeWinitWorkflow(
            env,
            act.action || ORDER_EXCEPTION_DETAIL_ACTION,
            data
          );
          list.push(...coerceList(parsed, orderNoHint || undefined));
        } catch {
          /* continue */
        }
      }
    }
  }

  const samplingExceptions = list.filter(isSamplingRecord);
  const selected = samplingExceptions.length > 0 ? samplingExceptions : list.slice(0, 20);
  return { samplingExceptions: signFmsUrlDeep(selected) };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-exception-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
