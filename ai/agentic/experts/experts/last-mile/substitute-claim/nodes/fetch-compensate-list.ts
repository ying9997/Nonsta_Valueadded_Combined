/**
 * 节点：消费万邑通 `afs.customer.compensate.pageList` 插件响应或 Coze workflow/run 代理结果，产出 **compensateListFacts**。
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 一致。
 */

const COMPENSATE_OPENAPI_ACTION = "afs.customer.compensate.pageList";

/** 与 `design.md` §6、`prompts/kb.md` §5.1 一致；接口未列出的码不生成 label */
const COMPENSATE_STATUS_LABEL_ZH: Record<string, string> = {
  DRAFT: "草稿",
  SUBMITTED: "已提交",
  SUPPLIER_TO_SUBMITTED: "待提交供应商",
  SUBMITTED_SUPPLIER: "已提交供应商",
  SU_CONFIRMS_COMPENSATE: "供应商确认赔付",
  CLAIM_REJECTION_PENDING: "拒赔待确认",
  PENDING_PAYMENT: "待回款",
  RECEIVED_PAYMENT: "已回款",
  REPUDIATION_OF_CLAIMS: "拒绝赔付",
  ALREADY_RECEIVED: "已赔付客户",
  FINISH: "已完成",
  SUBMISSION_FAILED: "提交失败",
};

const COMPENSATE_TYPE_LABEL_ZH: Record<string, string> = {
  LS: "丢失",
  BK: "破损",
  PLS: "部分妥投",
  NR: "妥投未收到",
  SCM: "供应商多收费用",
};

function compensateEnumLabel(code: string, map: Record<string, string>): string | undefined {
  const k = code.trim().toUpperCase();
  if (!k) return undefined;
  const v = map[k];
  return v !== undefined ? v : undefined;
}

type OpenapiProxyWorkflowParameters = {
  action: string;
  customerCode: string;
  customerName: string;
  username: string;
  data: string;
};

interface CompensateRecord {
  compensateApplyNo?: string;
  businessNo?: string;
  trackingNo?: string;
  compensateStatus?: string;
  /** pageList 索赔类型枚举码，与 KB §5.1 对照 */
  compensateType?: string;
  compensateStatusLabel?: string;
  compensateTypeLabel?: string;
  applyTime?: string;
  acceptTime?: string;
  claimEndTime?: string;
  needSupMaterial?: string;
  raw: Record<string, unknown>;
}

interface CompensateListFacts {
  branch: "query" | "guidance" | "skip";
  listStatus:
    | "success"
    | "empty"
    | "failed"
    | "skipped_guidance"
    | "skipped_no_query"
    | "skipped_no_env"
    | "skipped_invalid_response";
  /** 与 pageList 请求一致的查询键快照，供 format-output 写入 structured.queryKeys */
  queryKeys?: { trackingIds: string[]; outboundOrderNos: string[]; claimIds: string[] };
  querySent?: Record<string, unknown>;
  records: CompensateRecord[];
  rawTopKeys?: string[];
  apiCode?: unknown;
  apiMsg?: string;
  notes: string[];
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

function asRecord(x: unknown): Record<string, unknown> | null {
  if (x !== null && typeof x === "object" && !Array.isArray(x)) return x as Record<string, unknown>;
  return null;
}

function isExplicitEmptyList(inner: unknown): boolean {
  const r = asRecord(inner);
  if (!r) return false;
  for (const k of ["list", "records", "rows", "items", "dataList"]) {
    const v = r[k];
    if (Array.isArray(v) && v.length === 0) return true;
  }
  const data = r.data;
  const dr = asRecord(data);
  if (dr) {
    for (const k of ["list", "records", "rows", "items"]) {
      const v = dr[k];
      if (Array.isArray(v) && v.length === 0) return true;
    }
  }
  return false;
}

function extractListArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];

  const directKeys = ["list", "records", "rows", "items", "content", "dataList"];
  for (const k of directKeys) {
    const v = root[k];
    if (Array.isArray(v)) return v;
  }

  const data = root.data;
  const dr = asRecord(data);
  if (dr) {
    for (const k of directKeys) {
      const v = dr[k];
      if (Array.isArray(v)) return v;
    }
    const pageVo = dr.pageVo;
    const pv = asRecord(pageVo);
    if (pv) {
      for (const k of directKeys) {
        const v = pv[k];
        if (Array.isArray(v)) return v;
      }
    }
  }

  for (const v of Object.values(root)) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null && !Array.isArray(v[0])) {
      return v;
    }
  }
  return [];
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function normalizeRecord(row: unknown): CompensateRecord | null {
  const o = asRecord(row);
  if (!o) return null;
  const compensateStatus = pickStr(o, ["compensateStatus", "status", "applyStatus", "claimStatus"]);
  const compensateType = pickStr(o, ["compensateType", "claimType"]);
  return {
    compensateApplyNo: pickStr(o, ["compensateApplyNo", "applyNo", "applyOrderNo", "compensateNo", "id"]),
    businessNo: pickStr(o, ["businessNo", "outboundOrderNo", "orderNo", "businessOrderNo"]),
    trackingNo: pickStr(o, ["trackingNo", "trackingNumber", "expressNo", "waybillNo"]),
    compensateStatus,
    compensateType,
    compensateStatusLabel: compensateEnumLabel(compensateStatus, COMPENSATE_STATUS_LABEL_ZH),
    compensateTypeLabel: compensateEnumLabel(compensateType, COMPENSATE_TYPE_LABEL_ZH),
    applyTime: pickStr(o, ["applyTime", "applyDate", "gmtCreate", "createTime"]),
    acceptTime: pickStr(o, ["acceptTime", "acceptDate", "gmtAccept"]),
    claimEndTime: pickStr(o, ["claimEndTime", "claimEndDate", "endTime"]),
    needSupMaterial: pickStr(o, ["isHaveToSupMaterial", "needSupMaterial", "needMaterial"]),
    raw: o,
  };
}

function unwrapBusinessEnvelope(raw: unknown): { inner: unknown; apiCode?: unknown; apiMsg?: string } {
  const root = asRecord(raw);
  if (!root) return { inner: raw };

  const code = root.code ?? root.status;
  const msg = pickStr(root, ["msg", "message", "info", "errorMsg"]);

  const data = root.data;
  if (data !== undefined) {
    const parsed = parseCozeWorkflowDataField(data);
    return { inner: parsed, apiCode: code, apiMsg: msg || undefined };
  }

  return { inner: raw, apiCode: code, apiMsg: msg || undefined };
}

async function main({ params }: { params: Record<string, unknown> }): Promise<{ compensateListFacts: CompensateListFacts }> {
  const rawBranch = String(params.branch ?? "").trim();
  const branch: CompensateListFacts["branch"] =
    rawBranch === "query" || rawBranch === "guidance" ? rawBranch : "skip";
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const claimIds = Array.isArray(params.claimIds)
    ? (params.claimIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const notes: string[] = [];

  const emptyFacts = (status: CompensateListFacts["listStatus"], extra?: Partial<CompensateListFacts>): CompensateListFacts => ({
    branch,
    listStatus: status,
    queryKeys: extra?.queryKeys,
    querySent: extra?.querySent,
    records: [],
    rawTopKeys: extra?.rawTopKeys,
    apiCode: extra?.apiCode,
    apiMsg: extra?.apiMsg,
    notes,
  });

  if (branch === "guidance") {
    notes.push("guidance 流程/材料咨询，无需查询键，跳过 afs.customer.compensate.pageList");
    return { compensateListFacts: emptyFacts("skipped_guidance") };
  }

  if (branch !== "query") {
    notes.push("无有效文本意图或查询键，跳过 afs.customer.compensate.pageList");
    return { compensateListFacts: emptyFacts("skipped_no_query") };
  }

  const queryKeysSnap = { trackingIds, outboundOrderNos, claimIds };

  const winitRequestData = typeof params.winitRequestData === "string" ? params.winitRequestData.trim() : "";
  let querySent: Record<string, unknown> | undefined;
  try {
    querySent = winitRequestData ? (JSON.parse(winitRequestData) as Record<string, unknown>) : undefined;
  } catch {
    querySent = undefined;
  }

  if (!winitRequestData) {
    notes.push("winitRequestData 为空，跳过 OpenAPI");
    return { compensateListFacts: emptyFacts("skipped_no_query", { querySent, queryKeys: queryKeysSnap }) };
  }

  const env = getCozeOpenapiProxyEnv();
  const customerCode = String(params.customerCode ?? "").trim();
  const customerName = String(params.customerName ?? "").trim();
  const username = String(params.username ?? "").trim();

  const proxyCustomer = env
    ? { customerCode: env.customerCode, customerName: env.customerName, username: env.username }
    : { customerCode, customerName, username };

  const plug = params.winitOpenapiData;
  const hasPlug = plug != null && String(plug).trim() !== "";

  let raw: unknown;
  try {
    if (hasPlug) {
      raw = parseCozeWorkflowDataField(plug);
    } else if (env) {
      raw = await runCozeOpenapiProxyWorkflow({
        apiToken: env.apiToken,
        workflowId: env.workflowId,
        baseUrl: env.baseUrl,
        parameters: {
          action: COMPENSATE_OPENAPI_ACTION,
          customerCode: proxyCustomer.customerCode,
          customerName: proxyCustomer.customerName,
          username: proxyCustomer.username,
          data: winitRequestData,
        },
      });
    } else {
      notes.push("无插件响应且无 Coze 代理环境变量（COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID 等），跳过 OpenAPI");
      return { compensateListFacts: emptyFacts("skipped_no_env", { querySent, queryKeys: queryKeysSnap }) };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    notes.push(`OpenAPI 调用异常：${msg}`);
    return {
      compensateListFacts: {
        branch,
        listStatus: "failed",
        queryKeys: queryKeysSnap,
        querySent,
        records: [],
        notes,
        apiMsg: msg,
      },
    };
  }

  const unwrapped = unwrapBusinessEnvelope(raw);
  const inner = unwrapped.inner;
  const rows = extractListArray(inner);
  const top = asRecord(inner) ?? asRecord(raw);
  const queryKeys = queryKeysSnap;

  if (!rows.length) {
    if (isExplicitEmptyList(inner)) {
      notes.push("接口返回列表为空（命中空数组）");
      return {
        compensateListFacts: {
          branch,
          listStatus: "empty",
          queryKeys,
          querySent,
          records: [],
          apiCode: unwrapped.apiCode,
          apiMsg: unwrapped.apiMsg,
          notes,
        },
      };
    }
    notes.push("响应中未解析到列表数组（兼容路径均未命中）；请提供真实返回样例以收紧解析");
    return {
      compensateListFacts: {
        branch,
        listStatus: "skipped_invalid_response",
        queryKeys,
        querySent,
        records: [],
        rawTopKeys: top ? Object.keys(top).slice(0, 40) : Object.keys(asRecord(raw) ?? {}).slice(0, 40),
        apiCode: unwrapped.apiCode,
        apiMsg: unwrapped.apiMsg,
        notes,
      },
    };
  }

  const records: CompensateRecord[] = [];
  for (const row of rows) {
    const n = normalizeRecord(row);
    if (n) records.push(n);
  }

  if (!records.length) {
    notes.push("列表存在但行对象无法归一化");
    return {
      compensateListFacts: {
        branch,
        listStatus: "skipped_invalid_response",
        queryKeys,
        querySent,
        records: [],
        rawTopKeys: top ? Object.keys(top).slice(0, 40) : [],
        notes,
      },
    };
  }

  return {
    compensateListFacts: {
      branch,
      listStatus: "success",
      queryKeys,
      querySent,
      records,
      apiCode: unwrapped.apiCode,
      apiMsg: unwrapped.apiMsg,
      notes,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-compensate-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
