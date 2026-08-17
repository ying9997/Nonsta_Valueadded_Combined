/**
 * 节点：本地 Runner 补拉预约单列表
 * FaaS 单文件闭环，无外部 import。
 */

type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

const BOOKING_LIST_ACTION = "winit.wh.inbound.booking.list";

function parseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function normalizeBooking(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const bookingNo = String(o.bookingNo ?? o.appointmentNo ?? "").trim();
  if (!bookingNo && !o.inboundOrderNo && !o.bookingStatus) return null;
  return {
    bookingNo,
    bookingStatus: String(o.bookingStatus ?? o.status ?? ""),
    appointmentDate: String(o.appointmentDate ?? o.bookingDate ?? ""),
    penaltyFee: Number(o.penaltyFee ?? o.violationFee ?? 0) || 0,
    penaltyReason: String(o.penaltyReason ?? o.violationReason ?? ""),
    inboundOrderNo: String(o.inboundOrderNo ?? ""),
    warehouseCode: String(o.warehouseCode ?? o.destWhCode ?? ""),
  };
}

function coerceList(parsed: unknown): unknown[] {
  if (parsed == null) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  if (o.output != null) return coerceList(o.output);
  if (o.code === "0" || o.code === 0) return coerceList(o.data);
  return Array.isArray(o.list) ? o.list : Array.isArray(o.records) ? o.records : [];
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
  if (params.skipApi === true) {
    return { bookingRecords: [] };
  }

  const pluginList = params.winitBookingPluginOutputList;
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
        const data = JSON.parse(actions[0].data) as Record<string, unknown>;
        const parsed = await runCozeWinitWorkflow(env, actions[0].action || BOOKING_LIST_ACTION, data);
        list = coerceList(parsed);
      } catch {
        list = [];
      }
    }
  }

  const bookingRecords = list.map(normalizeBooking).filter((r): r is Record<string, unknown> => r != null);
  return { bookingRecords };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-booking-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
