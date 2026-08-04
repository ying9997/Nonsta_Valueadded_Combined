/**
 * 可选共享：通过 Coze「工作流运行」API 调用万邑通 OpenAPI 插件。
 * 出库专家已在 `experts/outbound/outbound-order-status/nodes/fetch-outbound-order.ts` 内联等价逻辑（单文件闭环）；本模块可留作其它专家复用。
 */

export interface CozeWinitWorkflowParameters {
  action: string;
  customerCode: string;
  customerName: string;
  /** WINIT `data` 对象经 JSON.stringify 后的字符串 */
  data: string;
  language?: string | null;
  username: string;
}

export interface RunCozeWinitWorkflowOptions {
  apiToken: string;
  workflowId: string;
  /** 默认 https://api.coze.cn，可通过 COZE_API_BASE_URL 覆盖 */
  baseUrl?: string;
  parameters: CozeWinitWorkflowParameters;
}

/**
 * 递归解析 Coze 返回的 data（常为 JSON 字符串，有时双重序列化）
 */
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

/**
 * POST /v1/workflow/run，成功时返回已解析的 `data` 字段内容（对象 / 数组 / 原始值）
 */
export async function runCozeWinitWorkflow(options: RunCozeWinitWorkflowOptions): Promise<unknown> {
  const baseFromEnv = typeof process !== "undefined" ? process.env?.COZE_API_BASE_URL : undefined;
  const baseUrl = (options.baseUrl ?? baseFromEnv ?? "https://api.coze.cn").replace(/\/$/, "");
  const url = `${baseUrl}/v1/workflow/run`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: String(options.workflowId),
      parameters: options.parameters,
    }),
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Coze workflow/run 响应非 JSON（HTTP ${res.status}）: ${text.slice(0, 500)}`);
  }

  const obj = body as Record<string, unknown>;

  if (!res.ok) {
    const msg = String(obj.msg ?? obj.message ?? text);
    throw new Error(`Coze workflow/run HTTP ${res.status}: ${msg.slice(0, 500)}`);
  }

  const code = obj.code;
  if (code !== 0 && code !== "0") {
    const msg = String(obj.msg ?? obj.message ?? "unknown");
    const debug = obj.debug_url != null ? ` debug_url=${String(obj.debug_url)}` : "";
    throw new Error(`Coze workflow 失败 code=${String(code)} msg=${msg}${debug}`);
  }

  return parseCozeWorkflowDataField(obj.data);
}
