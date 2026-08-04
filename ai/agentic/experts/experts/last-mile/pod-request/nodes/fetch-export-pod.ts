/**
 * 节点：消费万邑通 `wh.outbound.exportOutboundPod` 插件响应或本地 `workflow/run` 代理结果，产出 **podExportFacts**。
 * 与 `workflow.json` 一致。guidance 分支或无请求体时不调 OpenAPI。
 *
 * **对客下载**：接口返回的完整 FMS URL（或相对路径 + 默认 `https://cnfmsstream.winit.com.cn` / 环境变量覆盖）经 **encodeURIComponent** 拼到
 * `https://seller.winit.com.cn/User/fmsFileDownload?url=`，写入 `podFileUrls`（直连 FMS 通常不可访问）。
 */

const POD_OPENAPI_ACTION = "wh.outbound.exportOutboundPod";

type OpenapiProxyWorkflowParameters = {
  action: string;
  customerCode: string;
  customerName: string;
  username: string;
  data: string;
};

interface OwnershipFacts {
  verifiedOutboundOrderNos?: string[];
  rejectedOutboundOrderNos?: string[];
  ownershipStatus?: string;
  ownershipNotes?: string[];
}

interface PodExportFacts {
  exportStatus:
    | "success"
    | "failed"
    | "skipped_no_outbound"
    | "skipped_no_env"
    | "skipped_invalid_response"
    | "skipped_not_owner";
  outboundOrderNos: string[];
  trackingIds: string[];
  podFileUrls: string[];
  podRawPaths: string[];
  verifiedOutboundOrderNos?: string[];
  rejectedOutboundOrderNos?: string[];
  ownershipStatus?: string;
  apiStatus?: unknown;
  apiInfo?: string;
  apiErrorCode?: string;
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

/**
 * 万邑通 FMS 文件流相对路径的默认根地址（与业务约定一致）。
 * 可通过环境变量 **`WINIT_POD_FILE_BASE_URL`** 或 **`WINIT_FILE_BASE_URL`** 覆盖（无末尾 `/`）。
 */
const DEFAULT_WINIT_FMS_FILE_BASE_URL = "https://cnfmsstream.winit.com.cn";

/** 相对路径 fileUrl 拼接用：优先读环境变量，否则使用默认 FMS 根址 */
function getPodFileBaseUrl(): string {
  if (typeof process === "undefined" || !process.env) return DEFAULT_WINIT_FMS_FILE_BASE_URL;
  const fromEnv = String(
    process.env.WINIT_POD_FILE_BASE_URL ?? process.env.WINIT_FILE_BASE_URL ?? ""
  )
    .trim()
    .replace(/\/+$/, "");
  return fromEnv || DEFAULT_WINIT_FMS_FILE_BASE_URL;
}

/** 卖家中心代理下载：内层 url 为接口返回的完整 FMS 地址（须 encodeURIComponent） */
const WINIT_SELLER_FMS_DOWNLOAD = "https://seller.winit.com.cn/User/fmsFileDownload";

function normalizeRawPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  return raw.trim().replace(/\\/g, "/");
}

/**
 * 解析出用于编码的内层 FMS URL：已为 http(s) 完整地址则直接用；否则与默认或环境变量中的 FMS 根址拼接。
 */
function resolveFmsUrlForDownload(rawFromApi: string): string {
  const pathNorm = normalizeRawPath(rawFromApi);
  if (!pathNorm) return "";
  if (/^https?:\/\//i.test(pathNorm)) return pathNorm;
  const base = getPodFileBaseUrl();
  if (!base) return "";
  return pathNorm.startsWith("/") ? base + pathNorm : `${base}/${pathNorm}`;
}

/** 对客可打开的下载链接（经卖家网关，非直连 FMS） */
function buildSellerFmsDownloadUrl(fmsUrl: string): string {
  const t = fmsUrl.trim();
  if (!t) return "";
  return `${WINIT_SELLER_FMS_DOWNLOAD}?url=${encodeURIComponent(t)}`;
}

function extractBusinessPayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

/** 对象可能是 JSON 字符串（插件/网关多层序列化） */
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

const FILE_URL_KEYS = ["fileUrl", "fileURL", "FileUrl", "file_path", "filePath", "url"];
const NEST_UNDER_DATA_KEYS = ["data", "result", "payload", "body", "content"];

function pickFileUrlFromRecord(rec: Record<string, unknown>): string | undefined {
  for (const k of FILE_URL_KEYS) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** 在对象树中查找 fileUrl（有限深度，兼容 data 套 data、result 等） */
function findFileUrlDeep(obj: Record<string, unknown>, depth: number): string | undefined {
  if (depth <= 0) return undefined;
  const direct = pickFileUrlFromRecord(obj);
  if (direct) return direct;
  for (const key of NEST_UNDER_DATA_KEYS) {
    const rawChild = obj[key];
    const child = deepParseJsonValue(rawChild, 4);
    const childObj = extractBusinessPayload(child);
    if (childObj) {
      const got = findFileUrlDeep(childObj, depth - 1);
      if (got) return got;
    }
  }
  return undefined;
}

function readScalarFields(root: Record<string, unknown>): {
  status: unknown;
  code: unknown;
  info?: string;
  errorCode: string;
} {
  const status = root.status ?? root.Status ?? root.state;
  const code = root.code ?? root.Code;
  const info =
    typeof root.info === "string"
      ? root.info
      : typeof root.msg === "string"
        ? root.msg
        : typeof root.message === "string"
          ? root.message
          : undefined;
  const ecRaw = root.errorCode ?? root.error_code ?? root.errCode ?? "";
  const errorCode = ecRaw != null ? String(ecRaw) : "";
  return { status, code, info, errorCode };
}

/** 判断是否明确失败（有 fileUrl 时慎用） */
function isExplicitFailure(status: unknown): boolean {
  return (
    status === 0 ||
    status === "0" ||
    status === false ||
    status === "fail" ||
    status === "failed" ||
    status === "error"
  );
}

/**
 * 解析 exportOutboundPod 响应（兼容：data 为 JSON 字符串、fileUrl 深层嵌套、大小写字段）。
 */
function parseExportResponse(raw: unknown): {
  ok: boolean;
  fileUrl?: string;
  status?: unknown;
  info?: string;
  errorCode?: string;
} {
  const unwrapped = deepParseJsonValue(raw, 5);
  const root = extractBusinessPayload(unwrapped);
  if (!root) return { ok: false };

  const { status, code, info, errorCode } = readScalarFields(root);

  let fileUrl = findFileUrlDeep(root, 6);
  if (!fileUrl && root.data !== undefined) {
    const dataLayer = deepParseJsonValue(root.data, 4);
    const dataObj = extractBusinessPayload(dataLayer);
    if (dataObj) {
      fileUrl = findFileUrlDeep(dataObj, 5);
    }
  }

  const ecNorm = String(errorCode ?? "").trim();
  const codeOk = ecNorm === "";

  const codeIndicatesOk = code === 0 || code === "0";
  const strictStatusOk =
    status === 1 ||
    status === "1" ||
    status === true ||
    status === "success" ||
    (status === undefined && codeIndicatesOk);
  const failed = isExplicitFailure(status);

  let ok = Boolean(fileUrl && codeOk && strictStatusOk && !failed);
  if (!ok && fileUrl && codeOk && !failed) {
    ok = true;
  }

  return { ok, fileUrl, status, info, errorCode: ecNorm };
}

function asOwnershipFacts(raw: unknown): OwnershipFacts {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as OwnershipFacts;
  }
  return {};
}

async function main({ params }: { params: Record<string, unknown> }): Promise<{ podExportFacts: PodExportFacts }> {
  const branch = String(params.branch ?? "").trim();
  const trackingIds = Array.isArray(params.trackingIds)
    ? (params.trackingIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(params.outboundOrderNos)
    ? (params.outboundOrderNos as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const ownership = asOwnershipFacts(params.ownershipFacts);
  const verifiedOutboundOrderNos = Array.isArray(ownership.verifiedOutboundOrderNos)
    ? ownership.verifiedOutboundOrderNos.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const rejectedOutboundOrderNos = Array.isArray(ownership.rejectedOutboundOrderNos)
    ? ownership.rejectedOutboundOrderNos.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  const ownershipStatus = String(ownership.ownershipStatus ?? "").trim();

  const notes: string[] = [];
  if (Array.isArray(ownership.ownershipNotes)) {
    for (const n of ownership.ownershipNotes) {
      const s = String(n ?? "").trim();
      if (s) notes.push(s);
    }
  }

  const emptyFacts = (status: PodExportFacts["exportStatus"]): PodExportFacts => ({
    exportStatus: status,
    outboundOrderNos,
    trackingIds,
    podFileUrls: [],
    podRawPaths: [],
    verifiedOutboundOrderNos,
    rejectedOutboundOrderNos,
    ownershipStatus: ownershipStatus || undefined,
    notes,
  });

  if (branch !== "export") {
    notes.push("无万邑通出库单号（WO…）或未走 export 分支，跳过 exportOutboundPod");
    return { podExportFacts: emptyFacts("skipped_no_outbound") };
  }

  if (ownershipStatus === "none" || (outboundOrderNos.length > 0 && verifiedOutboundOrderNos.length === 0)) {
    if (!notes.some((n) => n.includes("客户归属"))) {
      notes.push("出库单未通过客户归属校验，跳过 exportOutboundPod（该接口无鉴权）");
    }
    return { podExportFacts: emptyFacts("skipped_not_owner") };
  }

  const winitRequestData = typeof params.winitRequestData === "string" ? params.winitRequestData.trim() : "";
  if (!winitRequestData) {
    notes.push("无已通过归属校验的出库单或 winitRequestData 为空，跳过 OpenAPI");
    return { podExportFacts: emptyFacts(verifiedOutboundOrderNos.length === 0 ? "skipped_not_owner" : "skipped_no_outbound") };
  }

  const env = getCozeOpenapiProxyEnv();
  const customerCode = String(params.customerCode ?? "").trim();
  const customerName = String(params.customerName ?? "").trim();
  const username = String(params.username ?? "").trim();

  const proxyCustomer = env
    ? { customerCode: env.customerCode, customerName: env.customerName, username: env.username }
    : { customerCode, customerName, username };

  let raw: unknown;
  const plug = params.winitOpenapiData;
  const hasPlug = plug != null && String(plug).trim() !== "";

  try {
    if (hasPlug) {
      raw = parseCozeWorkflowDataField(plug);
    } else if (env) {
      raw = await runCozeOpenapiProxyWorkflow({
        apiToken: env.apiToken,
        workflowId: env.workflowId,
        baseUrl: env.baseUrl,
        parameters: {
          action: POD_OPENAPI_ACTION,
          customerCode: proxyCustomer.customerCode,
          customerName: proxyCustomer.customerName,
          username: proxyCustomer.username,
          data: winitRequestData,
        },
      });
    } else {
      notes.push("无插件响应且无 Coze 代理环境变量（COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID 等），跳过 OpenAPI");
      return { podExportFacts: emptyFacts("skipped_no_env") };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    notes.push(`OpenAPI 调用异常：${msg}`);
    return {
      podExportFacts: {
        ...emptyFacts("failed"),
        apiInfo: msg,
      },
    };
  }

  const parsed = parseExportResponse(raw);
  if (!parsed.ok) {
    notes.push(
      parsed.fileUrl ? "响应未满足成功条件（status/errorCode）" : "响应中无有效 data.fileUrl"
    );
    return {
      podExportFacts: {
        ...emptyFacts("skipped_invalid_response"),
        podRawPaths: parsed.fileUrl ? [normalizeRawPath(parsed.fileUrl)] : [],
        apiStatus: parsed.status,
        apiInfo: parsed.info,
        apiErrorCode: parsed.errorCode,
      },
    };
  }

  const rawPath = normalizeRawPath(parsed.fileUrl);
  const fmsInnerUrl = resolveFmsUrlForDownload(parsed.fileUrl ?? "");
  const sellerDownloadUrl = fmsInnerUrl ? buildSellerFmsDownloadUrl(fmsInnerUrl) : "";
  const podFileUrls = sellerDownloadUrl ? [sellerDownloadUrl] : [];

  if (rawPath && !fmsInnerUrl && !/^https?:\/\//i.test(rawPath)) {
    notes.push("fileUrl 为相对路径但未能解析出完整 FMS 地址，podFileUrls 留空（异常，请检查解析逻辑）");
  }

  return {
    podExportFacts: {
      exportStatus: "success",
      outboundOrderNos: verifiedOutboundOrderNos.length ? verifiedOutboundOrderNos : outboundOrderNos,
      trackingIds,
      podFileUrls,
      podRawPaths: rawPath ? [rawPath] : [],
      verifiedOutboundOrderNos,
      rejectedOutboundOrderNos,
      ownershipStatus: ownershipStatus || undefined,
      apiStatus: parsed.status,
      apiInfo: parsed.info,
      apiErrorCode: parsed.errorCode,
      notes,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-export-pod")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
