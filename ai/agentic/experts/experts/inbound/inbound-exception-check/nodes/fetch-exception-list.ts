/**
 * 节点：本地 Runner 补拉入库单异常（list / queryExceptionList）
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

const EXCEPTION_LIST_ACTION = "wh.inboundOrderException.list";
const ORDER_EXCEPTION_DETAIL_ACTION = "wh.inboundOrder.queryExceptionList";

type ExceptionLookupStatus =
  | "success_with_records"
  | "success_empty"
  | "api_error"
  | "parse_error"
  | "partial_failure"
  | "skipped";

type CoercedExceptionList = {
  list: unknown[];
  total: number;
  recognized: boolean;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

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

function coerceExceptionList(parsed: unknown, orderNoHint?: string): CoercedExceptionList {
  if (parsed == null || parsed === "") return { list: [], total: 0, recognized: true };

  if (Array.isArray(parsed)) {
    const orderNo = orderNoHint ?? "";
    const list = orderNo ? flattenOrderExceptionDetails(orderNo, parsed) : parsed;
    return { list, total: list.length, recognized: true };
  }

  if (typeof parsed !== "object") return { list: [], total: 0, recognized: false };
  const o = parsed as Record<string, unknown>;
  if (o.output != null) return coerceExceptionList(o.output, orderNoHint);

  if (o.code === "0" || o.code === 0) {
    const inner = o.data;
    if (typeof inner === "string") {
      try {
        return coerceExceptionList(JSON.parse(inner), orderNoHint);
      } catch {
        return inner.trim() === ""
          ? { list: [], total: 0, recognized: true }
          : { list: [], total: 0, recognized: false };
      }
    }
    if (inner != null) return coerceExceptionList(inner, orderNoHint);
    return { list: [], total: 0, recognized: true };
  }

  const hasListField = Array.isArray(o.list) || Array.isArray(o.records);
  if (!hasListField) return { list: [], total: 0, recognized: false };
  const list = Array.isArray(o.list) ? o.list : (o.records as unknown[]);
  const pageParams = (o.pageParams ?? {}) as Record<string, unknown>;
  const total =
    typeof pageParams.totalCount === "number"
      ? pageParams.totalCount
      : typeof o.totalCount === "number"
        ? o.totalCount
        : typeof o.total === "number"
          ? o.total
          : list.length;
  return { list, total, recognized: true };
}

function resolveLookupStatus(
  resolvedCount: number,
  emptySuccessCount: number,
  apiErrorCount: number,
  parseErrorCount: number,
): ExceptionLookupStatus {
  if (apiErrorCount > 0 || parseErrorCount > 0) {
    if (resolvedCount > 0 || emptySuccessCount > 0) return "partial_failure";
    return apiErrorCount > 0 ? "api_error" : "parse_error";
  }
  return resolvedCount > 0 ? "success_with_records" : "success_empty";
}

function pluginError(item: Record<string, unknown>): string | null {
  const code = item.code;
  if (code === 0 || code === "0") return null;
  if (code == null) return "plugin code missing";
  return `plugin code=${String(code)}`;
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
    return {
      rawExceptionData: {
        list: [],
        total: 0,
        _fetchMeta: { strategy: "skipped", status: "skipped", requestCount: 0, resolvedCount: 0 },
      },
    };
  }

  const pluginList = params.winitExceptionPluginOutputList ?? params.winitPluginOutputList;
  if (Array.isArray(pluginList) && pluginList.length > 0) {
    const allList: unknown[] = [];
    let total = 0;
    let emptySuccessCount = 0;
    let apiErrorCount = 0;
    let parseErrorCount = 0;
    const errors: string[] = [];
    const plans = (Array.isArray(params.exceptionActionPlans) ? params.exceptionActionPlans : []) as Array<{
      orderNo?: string;
    }>;
    for (let i = 0; i < pluginList.length; i++) {
      const item = (pluginList[i] ?? {}) as Record<string, unknown>;
      const error = pluginError(item);
      if (error) {
        apiErrorCount += 1;
        errors.push(error);
        continue;
      }
      const orderNoHint = str(plans[i]?.orderNo);
      const parsed = parseCozeWorkflowDataField(item.data);
      const { list, total: t, recognized } = coerceExceptionList(parsed, orderNoHint || undefined);
      if (!recognized) {
        parseErrorCount += 1;
        errors.push(`unrecognized response at batch index ${i}`);
        continue;
      }
      if (list.length === 0) emptySuccessCount += 1;
      allList.push(...list);
      total += t;
    }
    const signedList = signFmsUrlDeep(allList) as unknown[];
    const status = resolveLookupStatus(signedList.length, emptySuccessCount, apiErrorCount, parseErrorCount);
    return {
      rawExceptionData: {
        list: signedList,
        total: total || signedList.length,
        _fetchMeta: {
          strategy: "plugin-batch",
          status,
          requestCount: pluginList.length,
          resolvedCount: signedList.length,
          emptySuccessCount,
          apiErrorCount,
          parseErrorCount,
          errors: errors.length ? errors : undefined,
        },
      },
    };
  }

  const actions = (Array.isArray(params.actions) ? params.actions : []) as Array<{
    action: string;
    data: string;
  }>;
  const env = getCozeWinitEnv();
  if (!env || actions.length === 0) {
    return {
      rawExceptionData: {
        list: [],
        total: 0,
        _fetchMeta: {
          strategy: "skipped",
          status: "skipped",
          requestCount: actions.length,
          resolvedCount: 0,
        },
      },
    };
  }

  const errors: string[] = [];
  const allList: unknown[] = [];
  let total = 0;
  let emptySuccessCount = 0;
  let parseErrorCount = 0;
  for (const act of actions) {
    try {
      const data = JSON.parse(act.data) as Record<string, unknown>;
      const orderNoHint = str(data.orderNo);
      const action = act.action || EXCEPTION_LIST_ACTION;
      const parsed = await runCozeWinitWorkflow(
        env,
        action,
        data
      );
      const result = coerceExceptionList(parsed, orderNoHint || undefined);
      if (!result.recognized) {
        parseErrorCount += 1;
        errors.push(`unrecognized response for action ${action}`);
        continue;
      }
      if (result.list.length === 0) emptySuccessCount += 1;
      allList.push(...result.list);
      total += result.total;
    } catch (e) {
      errors.push(e instanceof SyntaxError ? "invalid action data" : "exception lookup request failed");
    }
  }

  const signedList = signFmsUrlDeep(allList) as unknown[];
  const apiErrorCount = errors.length - parseErrorCount;
  const status = resolveLookupStatus(signedList.length, emptySuccessCount, apiErrorCount, parseErrorCount);
  return {
    rawExceptionData: {
      list: signedList,
      total: total || signedList.length,
      _fetchMeta: {
        strategy: "local-proxy",
        status,
        requestCount: actions.length,
        resolvedCount: signedList.length,
        emptySuccessCount,
        apiErrorCount,
        parseErrorCount,
        errors: errors.length ? errors : undefined,
      },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-exception-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
