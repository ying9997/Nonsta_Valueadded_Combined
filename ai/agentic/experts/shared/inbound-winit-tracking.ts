/**
 * 入库轨迹 OpenAPI 常量与解析（queryOrderTracking / queryUnloadRecords*）
 */

export const ORDER_TRACKING_ACTION = "wh.tracking.queryOrderTracking";
export const UNLOAD_RECORDS_ACTION = "wh.tracking.queryUnloadRecords";
export const UNLOAD_RECORDS_FUZZY_ACTION = "wh.tracking.queryUnloadRecordsFuzzy";

export type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

export function parseCozeWorkflowDataField(data: unknown): unknown {
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

export function getCozeWinitEnv(): CozeWinitLocalEnv | null {
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

export async function runCozeWinitWorkflow(
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

function unwrapApiData(parsed: unknown): Record<string, unknown> | null {
  if (parsed == null || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (o.output != null && typeof o.output === "object") return unwrapApiData(o.output);
  if (o.code === "0" || o.code === 0) {
    const inner = o.data;
    if (typeof inner === "string") {
      try {
        return unwrapApiData(JSON.parse(inner));
      } catch {
        return null;
      }
    }
    if (inner != null && typeof inner === "object") return unwrapApiData(inner);
    return null;
  }
  if (o.trackingList != null || o.list != null) return o;
  return null;
}

export function coerceOrderTrackingPayload(parsed: unknown): { trackingList: unknown[] } | null {
  const o = unwrapApiData(parsed);
  if (!o) return null;
  const trackingList = Array.isArray(o.trackingList) ? o.trackingList : [];
  return { trackingList };
}

export function orderKeyFromToken(raw: string): string {
  return String(raw ?? "").trim().toUpperCase();
}

export function orderNosFromRawOrderData(rawOrderData: unknown): string[] {
  if (!rawOrderData || typeof rawOrderData !== "object") return [];
  const list = (rawOrderData as Record<string, unknown>).list;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const key = orderKeyFromToken(String((item as Record<string, unknown>).orderNo ?? ""));
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

export function buildOrderTrackingActions(orderNos: string[]): Array<{ action: string; data: string }> {
  return orderNos.map((orderNo) => ({
    action: ORDER_TRACKING_ACTION,
    data: JSON.stringify({ orderNo }),
  }));
}
