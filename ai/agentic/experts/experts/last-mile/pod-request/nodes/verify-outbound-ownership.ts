/**
 * 节点：消费 `queryOutboundOrder` 批处理结果，校验出库单是否属于当前客户。
 * exportOutboundPod 无鉴权，仅对经本节点确认的 `verifiedOutboundOrderNos` 继续导出 POD。
 *
 * 【输入】branch、outboundOrderNos、actionPlans、winitPluginOutputList；
 *         本地兜底：customerCode / customerName / username
 * 【输出】verifiedOutboundOrderNos、rejectedOutboundOrderNos、ownershipStatus、ownershipNotes
 */

type OpenapiProxyWorkflowParameters = {
  action: string;
  customerCode: string;
  customerName: string;
  username: string;
  data: string;
};

type ActionPlan = {
  outboundOrderNum: string;
};

type OwnershipStatus = "verified" | "partial" | "none" | "skipped";

interface OwnershipFacts {
  verifiedOutboundOrderNos: string[];
  rejectedOutboundOrderNos: string[];
  ownershipStatus: OwnershipStatus;
  ownershipNotes: string[];
}

interface VerifyOwnershipResult extends OwnershipFacts {
  ownershipFacts: OwnershipFacts;
}

const VERIFY_OPENAPI_ACTION = "queryOutboundOrder";

function normalizeWoMainOrderNum(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const m = /^WO(\d+)[A-Za-z]*$/i.exec(s);
  if (m) return `WO${m[1]}`;
  return s;
}

function uniqueWoOrders(rawNos: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawNos) {
    const normalized = normalizeWoMainOrderNum(String(raw ?? "").trim());
    if (!normalized || !/^WO\d+/i.test(normalized)) continue;
    const key = normalized.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
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

function extractBusinessPayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

function deepParseJsonValue(v: unknown, maxDepth: number): unknown {
  let cur: unknown = v;
  for (let d = 0; d < maxDepth; d++) {
    if (typeof cur !== "string") break;
    const t = cur.trim();
    if (!t.startsWith("{") && !t.startsWith("[")) break;
    try {
      cur = JSON.parse(t) as unknown;
    } catch {
      break;
    }
  }
  return cur;
}

function orderKeyFromRow(row: Record<string, unknown>): string {
  const raw = String(row.outboundOrderNum ?? row.orderNo ?? row.documentNo ?? "").trim();
  return normalizeWoMainOrderNum(raw).toUpperCase();
}

function coerceSingleOrder(parsed: unknown): Record<string, unknown> | null {
  const unwrapped = deepParseJsonValue(parsed, 5);
  const root = extractBusinessPayload(unwrapped);
  if (!root) return null;

  if (root.output != null && typeof root.output === "object") {
    return coerceSingleOrder(root.output);
  }

  if (root.code === "0" || root.code === 0) {
    const inner = root.data;
    if (inner != null) return coerceSingleOrder(inner);
    return null;
  }

  if (Array.isArray(root.list) && root.list.length > 0) {
    const first = root.list[0];
    if (first != null && typeof first === "object") return first as Record<string, unknown>;
    return null;
  }

  if (root.outboundOrderNum != null || root.orderNo != null || root.documentNo != null) {
    return root;
  }

  return null;
}

function asOutputList(raw: unknown): Array<{ data?: unknown }> {
  if (raw == null || !Array.isArray(raw)) return [];
  return raw as Array<{ data?: unknown }>;
}

async function runCozeOpenapiProxyWorkflow(options: {
  apiToken: string;
  workflowId: string;
  baseUrl?: string;
  parameters: OpenapiProxyWorkflowParameters;
}): Promise<unknown> {
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

function getCozeOpenapiProxyEnv(): {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  baseUrl?: string;
} | null {
  if (typeof process === "undefined" || !process.env) return null;
  const apiToken = process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "";
  const workflowId = process.env.COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID ?? "";
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
    baseUrl: process.env.COZE_API_BASE_URL,
  };
}

function buildOwnershipResult(requested: string[], verified: string[], notes: string[]): VerifyOwnershipResult {
  const verifiedSet = new Set(verified.map((x) => x.toUpperCase()));
  const rejected = requested.filter((x) => !verifiedSet.has(x.toUpperCase()));

  let ownershipStatus: OwnershipStatus;
  if (verified.length === 0) ownershipStatus = "none";
  else if (rejected.length > 0) ownershipStatus = "partial";
  else ownershipStatus = "verified";

  const ownershipFacts: OwnershipFacts = {
    verifiedOutboundOrderNos: verified,
    rejectedOutboundOrderNos: rejected,
    ownershipStatus,
    ownershipNotes: notes,
  };

  return {
    ...ownershipFacts,
    ownershipFacts,
  };
}

async function verifyViaPluginBatch(
  requested: string[],
  actionPlans: ActionPlan[],
  outputList: Array<{ data?: unknown }>
): Promise<VerifyOwnershipResult> {
  const notes: string[] = [];
  const verified: string[] = [];
  const verifiedKeys = new Set<string>();

  for (let i = 0; i < actionPlans.length; i++) {
    const plan = actionPlans[i];
    if (!plan) continue;
    const requestedNum = normalizeWoMainOrderNum(plan.outboundOrderNum);
    if (!requestedNum) continue;

    const slot = outputList[i]?.data;
    if (slot == null || String(slot).trim() === "") {
      notes.push(`出库单 ${requestedNum}：queryOutboundOrder 无返回，非当前客户或单号不存在`);
      continue;
    }

    const row = coerceSingleOrder(slot);
    if (!row) {
      notes.push(`出库单 ${requestedNum}：响应无法解析为有效出库单`);
      continue;
    }

    const key = orderKeyFromRow(row);
    const expectedKey = requestedNum.toUpperCase();
    if (!key || key !== expectedKey) {
      notes.push(`出库单 ${requestedNum}：返回单号 ${key || "空"} 与请求不一致`);
      continue;
    }

    if (!verifiedKeys.has(key)) {
      verifiedKeys.add(key);
      verified.push(requestedNum);
    }
  }

  for (const num of requested) {
    if (!verifiedKeys.has(num.toUpperCase())) {
      const alreadyNoted = notes.some((n) => n.includes(num));
      if (!alreadyNoted) {
        notes.push(`出库单 ${num}：未通过客户归属校验`);
      }
    }
  }

  if (verified.length > 0) {
    notes.unshift(`已通过 queryOutboundOrder 校验 ${verified.length}/${requested.length} 个出库单归属当前客户`);
  } else if (requested.length > 0) {
    notes.unshift("所有出库单均未通过客户归属校验，跳过 exportOutboundPod");
  }

  return buildOwnershipResult(requested, verified, notes);
}

async function verifyViaLocalProxy(
  requested: string[],
  proxyCustomer: { customerCode: string; customerName: string; username: string },
  env: NonNullable<ReturnType<typeof getCozeOpenapiProxyEnv>>
): Promise<VerifyOwnershipResult> {
  const notes: string[] = [];
  const verified: string[] = [];

  for (const num of requested) {
    try {
      const raw = await runCozeOpenapiProxyWorkflow({
        apiToken: env.apiToken,
        workflowId: env.workflowId,
        baseUrl: env.baseUrl,
        parameters: {
          action: VERIFY_OPENAPI_ACTION,
          customerCode: proxyCustomer.customerCode,
          customerName: proxyCustomer.customerName,
          username: proxyCustomer.username,
          data: JSON.stringify({ outboundOrderNum: num }),
        },
      });
      const row = coerceSingleOrder(raw);
      const key = row ? orderKeyFromRow(row) : "";
      if (row && key === num.toUpperCase()) {
        verified.push(num);
      } else {
        notes.push(`出库单 ${num}：queryOutboundOrder 无有效返回，非当前客户或单号不存在`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      notes.push(`出库单 ${num}：queryOutboundOrder 异常：${msg}`);
    }
  }

  if (verified.length > 0) {
    notes.unshift(`本地代理已通过 queryOutboundOrder 校验 ${verified.length}/${requested.length} 个出库单`);
  } else if (requested.length > 0) {
    notes.unshift("所有出库单均未通过客户归属校验，跳过 exportOutboundPod");
  }

  return buildOwnershipResult(requested, verified, notes);
}

async function main({ params }: { params: Record<string, unknown> }): Promise<VerifyOwnershipResult> {
  const branch = String(params.branch ?? "").trim();
  const requested = uniqueWoOrders(
    Array.isArray(params.outboundOrderNos)
      ? (params.outboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
      : []
  );

  if (branch !== "export" || requested.length === 0) {
    const ownershipFacts: OwnershipFacts = {
      verifiedOutboundOrderNos: [],
      rejectedOutboundOrderNos: [],
      ownershipStatus: "skipped",
      ownershipNotes: ["非 export 分支或无出库单号，跳过客户归属校验"],
    };
    return { ...ownershipFacts, ownershipFacts };
  }

  const actionPlans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as ActionPlan[];
  const outputList = asOutputList(params.winitPluginOutputList);
  const hasPluginBatch = outputList.length > 0 && actionPlans.length > 0;

  if (hasPluginBatch) {
    return verifyViaPluginBatch(requested, actionPlans, outputList);
  }

  const env = getCozeOpenapiProxyEnv();
  const customerCode = String(params.customerCode ?? "").trim();
  const customerName = String(params.customerName ?? "").trim();
  const username = String(params.username ?? "").trim();
  const proxyCustomer = env
    ? { customerCode: env.customerCode, customerName: env.customerName, username: env.username }
    : { customerCode, customerName, username };

  if (env && proxyCustomer.customerCode && proxyCustomer.customerName && proxyCustomer.username) {
    return verifyViaLocalProxy(requested, proxyCustomer, env);
  }

  const ownershipFacts: OwnershipFacts = {
    verifiedOutboundOrderNos: [],
    rejectedOutboundOrderNos: requested,
    ownershipStatus: "none",
    ownershipNotes: [
      "无 queryOutboundOrder 插件批处理结果且无 Coze 代理环境变量，无法校验客户归属，跳过 exportOutboundPod",
    ],
  };
  return { ...ownershipFacts, ownershipFacts };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("verify-outbound-ownership")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
