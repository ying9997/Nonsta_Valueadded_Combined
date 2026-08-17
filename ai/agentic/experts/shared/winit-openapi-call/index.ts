/**
 * Coze 代码节点：万邑通 Cobra OpenAPI 直连（MD5 签名 + POST JSON）。
 * FaaS 单文件闭环；**无 Node 模块依赖**（MD5 为内联纯 JS，UTF-8 与 Python 一致）；需全局 `fetch`。
 * **内部函数与类型统一 `woc` / `Woc` 前缀**（Winit Openapi Call），减轻与 Coze 沙箱或注入全局的命名冲突。
 * **入口**：`async function main({ params }: Args): Promise<Output>`（Coze 约定）。Coze 粘贴版若禁止 `export`，请删除本文件中的 `export` 与 `export { … }`。
 *
 * 【入参】`params`：`action`、`data`、`language`、`customerCode`、`customerName`、`username`、
 * **`SIGN_TOKEN`（或 `signToken`）**、**`CLIENT_ID`（或 `clientId`）**（必填，用于签名与请求体）；
 * 可选：`gatewayAction`、`serviceUrl`。
 * 【出参】`return ret`：`code`（Integer）、`data`（String）、`msg`（String）。
 *
 * 说明：部分业务网关（如 `tail.claim.ai.v1.gateway`）成功时可能返回 `code: -1` 且 `msg: "Success"`，
 * 与常见 `code === 0` 不同；请结合具体接口约定判断成功与否。
 *
 * 【排障】若出现 `request sandbox failed` / `invalid status code: 500`：多为 Coze **外网沙箱**拒绝代理、
 * 域名未白名单或上游 HTTP 非 2xx。请在项目/工作流安全设置中放行 `cobra.winit.com` 的外网请求，
 * 或改用工作流内的 **万邑通 OpenAPI 插件节点**（不走代码节点直连）。
 */

/** 与 Coze 工具侧一致的网关 action */
const DEFAULT_GATEWAY_ACTION = "winit.openapi";

const DEFAULT_SERVICE_URL = "https://cobra.winit.com/service";
const DEFAULT_FORMAT = "json";
const DEFAULT_PLATFORM = "coze";
const DEFAULT_SIGN_METHOD = "md5";
const DEFAULT_VERSION = "1.0";
const DEFAULT_LANGUAGE = "zh_CN";

/**
 * 从 `params` 读取凭证字段，兼容 Coze 大写蛇形与小写驼峰。
 */
function wocParamCredential(raw: Record<string, unknown>, upperKey: string, camelKey: string): string {
  const u = raw[upperKey];
  const c = raw[camelKey];
  if (u !== undefined && u !== null && String(u).trim() !== "") return String(u).trim();
  if (c !== undefined && c !== null && String(c).trim() !== "") return String(c).trim();
  return "";
}

/**
 * Coze 代码节点元数据：入口参数包装（平台约定名称 `Args`）。
 */
export interface Args {
  params: Record<string, unknown>;
}

/**
 * Coze 代码节点元数据：标准出参（平台约定名称 `Output`）。
 */
export interface Output {
  code: number;
  data: string;
  msg: string;
}

export interface WocCallInput {
  action: string;
  data: string;
  language?: string;
  customerCode: string;
  customerName: string;
  username: string;
  /** 签名盐值，对应原内置 SIGN_TOKEN；勿外泄 */
  signToken: string;
  /** 客户端 ID，对应原内置 CLIENT_ID */
  clientId: string;
}

export type WocCallResult = Output;

export interface WocCallOptions {
  gatewayAction?: string;
  serviceUrl?: string;
  /** 若设置则覆盖 `input.signToken` */
  signToken?: string;
  /** 若设置则覆盖 `input.clientId` */
  clientId?: string;
  fetchImpl?: typeof fetch;
}

/** 仓库/其他 TS 引用兼容别名 */
export type WinitOpenApiCallInput = WocCallInput;
export type WinitOpenApiCallResult = Output;
export type WinitOpenApiCallOptions = WocCallOptions;

function wocRemoveNulls<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.filter((item) => item != null).map((item) => wocRemoveNulls(item)) as T;
  }
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      out[k] = wocRemoveNulls(v);
    }
    return out as T;
  }
  return obj;
}

/** 等价 Python json.dumps(..., sort_keys=True, separators=(',', ':')) */
function wocStableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => wocStableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${wocStableStringify(record[k])}`);
  return `{${pairs.join(",")}}`;
}

function wocBuildSignatureString(
  action: string,
  appKey: string,
  data: Record<string, unknown>,
  format: string,
  platform: string,
  signMethod: string,
  timestamp: number,
  version: string
): string {
  const baseParams: Record<string, string | number> = {
    action,
    app_key: appKey,
    data: wocStableStringify(data),
    format,
    platform,
    sign_method: signMethod,
    timestamp,
    version,
  };
  const sortedKeys = Object.keys(baseParams).sort();
  return sortedKeys.map((key) => `${key}${baseParams[key]}`).join("");
}

// ---------- 纯 JS MD5（UTF-8），对齐 Python hashlib.md5(s.encode("utf-8")).hexdigest().upper() ----------
// 算法源自 MIT: https://github.com/blueimp/JavaScript-MD5（RFC 1321 / Paul Johnston）

function wocMd5SafeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16);
  return ((msw << 16) | (lsw & 0xffff)) >>> 0;
}

function wocMd5BitRotateLeft(num: number, cnt: number): number {
  return ((num << cnt) | (num >>> (32 - cnt))) >>> 0;
}

function wocMd5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return wocMd5SafeAdd(wocMd5BitRotateLeft(wocMd5SafeAdd(wocMd5SafeAdd(a, q), wocMd5SafeAdd(x, t)), s), b) >>> 0;
}

function wocMd5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return wocMd5cmn((b & c) | (~b & d), a, b, x, s, t) >>> 0;
}

function wocMd5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return wocMd5cmn((b & d) | (c & ~d), a, b, x, s, t) >>> 0;
}

function wocMd5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return wocMd5cmn(b ^ c ^ d, a, b, x, s, t) >>> 0;
}

function wocMd5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return wocMd5cmn(c ^ (b | ~d), a, b, x, s, t) >>> 0;
}

function wocMd5BinlMD5(x: number[], len: number): number[] {
  x[len >> 5] |= 0x80 << len % 32;
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = wocMd5ff(a, b, c, d, x[i]!, 7, -680876936);
    d = wocMd5ff(d, a, b, c, x[i + 1]!, 12, -389564586);
    c = wocMd5ff(c, d, a, b, x[i + 2]!, 17, 606105819);
    b = wocMd5ff(b, c, d, a, x[i + 3]!, 22, -1044525330);
    a = wocMd5ff(a, b, c, d, x[i + 4]!, 7, -176418897);
    d = wocMd5ff(d, a, b, c, x[i + 5]!, 12, 1200080426);
    c = wocMd5ff(c, d, a, b, x[i + 6]!, 17, -1473231341);
    b = wocMd5ff(b, c, d, a, x[i + 7]!, 22, -45705983);
    a = wocMd5ff(a, b, c, d, x[i + 8]!, 7, 1770035416);
    d = wocMd5ff(d, a, b, c, x[i + 9]!, 12, -1958414417);
    c = wocMd5ff(c, d, a, b, x[i + 10]!, 17, -42063);
    b = wocMd5ff(b, c, d, a, x[i + 11]!, 22, -1990404162);
    a = wocMd5ff(a, b, c, d, x[i + 12]!, 7, 1804603682);
    d = wocMd5ff(d, a, b, c, x[i + 13]!, 12, -40341101);
    c = wocMd5ff(c, d, a, b, x[i + 14]!, 17, -1502002290);
    b = wocMd5ff(b, c, d, a, x[i + 15]!, 22, 1236535329);

    a = wocMd5gg(a, b, c, d, x[i + 1]!, 5, -165796510);
    d = wocMd5gg(d, a, b, c, x[i + 6]!, 9, -1069501632);
    c = wocMd5gg(c, d, a, b, x[i + 11]!, 14, 643717713);
    b = wocMd5gg(b, c, d, a, x[i]!, 20, -373897302);
    a = wocMd5gg(a, b, c, d, x[i + 5]!, 5, -701558691);
    d = wocMd5gg(d, a, b, c, x[i + 10]!, 9, 38016083);
    c = wocMd5gg(c, d, a, b, x[i + 15]!, 14, -660478335);
    b = wocMd5gg(b, c, d, a, x[i + 4]!, 20, -405537848);
    a = wocMd5gg(a, b, c, d, x[i + 9]!, 5, 568446438);
    d = wocMd5gg(d, a, b, c, x[i + 14]!, 9, -1019803690);
    c = wocMd5gg(c, d, a, b, x[i + 3]!, 14, -187363961);
    b = wocMd5gg(b, c, d, a, x[i + 8]!, 20, 1163531501);
    a = wocMd5gg(a, b, c, d, x[i + 13]!, 5, -1444681467);
    d = wocMd5gg(d, a, b, c, x[i + 2]!, 9, -51403784);
    c = wocMd5gg(c, d, a, b, x[i + 7]!, 14, 1735328473);
    b = wocMd5gg(b, c, d, a, x[i + 12]!, 20, -1926607734);

    a = wocMd5hh(a, b, c, d, x[i + 5]!, 4, -378558);
    d = wocMd5hh(d, a, b, c, x[i + 8]!, 11, -2022574463);
    c = wocMd5hh(c, d, a, b, x[i + 11]!, 16, 1839030562);
    b = wocMd5hh(b, c, d, a, x[i + 14]!, 23, -35309556);
    a = wocMd5hh(a, b, c, d, x[i + 1]!, 4, -1530992060);
    d = wocMd5hh(d, a, b, c, x[i + 4]!, 11, 1272893353);
    c = wocMd5hh(c, d, a, b, x[i + 7]!, 16, -155497632);
    b = wocMd5hh(b, c, d, a, x[i + 10]!, 23, -1094730640);
    a = wocMd5hh(a, b, c, d, x[i + 13]!, 4, 681279174);
    d = wocMd5hh(d, a, b, c, x[i]!, 11, -358537222);
    c = wocMd5hh(c, d, a, b, x[i + 3]!, 16, -722521979);
    b = wocMd5hh(b, c, d, a, x[i + 6]!, 23, 76029189);
    a = wocMd5hh(a, b, c, d, x[i + 9]!, 4, -640364487);
    d = wocMd5hh(d, a, b, c, x[i + 12]!, 11, -421815835);
    c = wocMd5hh(c, d, a, b, x[i + 15]!, 16, 530742520);
    b = wocMd5hh(b, c, d, a, x[i + 2]!, 23, -995338651);

    a = wocMd5ii(a, b, c, d, x[i]!, 6, -198630844);
    d = wocMd5ii(d, a, b, c, x[i + 7]!, 10, 1126891415);
    c = wocMd5ii(c, d, a, b, x[i + 14]!, 15, -1416354905);
    b = wocMd5ii(b, c, d, a, x[i + 5]!, 21, -57434055);
    a = wocMd5ii(a, b, c, d, x[i + 12]!, 6, 1700485571);
    d = wocMd5ii(d, a, b, c, x[i + 3]!, 10, -1894986606);
    c = wocMd5ii(c, d, a, b, x[i + 10]!, 15, -1051523);
    b = wocMd5ii(b, c, d, a, x[i + 1]!, 21, -2054922799);
    a = wocMd5ii(a, b, c, d, x[i + 8]!, 6, 1873313359);
    d = wocMd5ii(d, a, b, c, x[i + 15]!, 10, -30611744);
    c = wocMd5ii(c, d, a, b, x[i + 6]!, 15, -1560198380);
    b = wocMd5ii(b, c, d, a, x[i + 13]!, 21, 1309151649);
    a = wocMd5ii(a, b, c, d, x[i + 4]!, 6, -145523070);
    d = wocMd5ii(d, a, b, c, x[i + 11]!, 10, -1120210379);
    c = wocMd5ii(c, d, a, b, x[i + 2]!, 15, 718787259);
    b = wocMd5ii(b, c, d, a, x[i + 9]!, 21, -343485551);

    a = wocMd5SafeAdd(a, olda) >>> 0;
    b = wocMd5SafeAdd(b, oldb) >>> 0;
    c = wocMd5SafeAdd(c, oldc) >>> 0;
    d = wocMd5SafeAdd(d, oldd) >>> 0;
  }

  return [a, b, c, d];
}

function wocMd5Binl2rstr(input: number[]): string {
  let output = "";
  const length32 = input.length * 32;
  for (let i = 0; i < length32; i += 8) {
    output += String.fromCharCode((input[i >> 5]! >>> i % 32) & 0xff);
  }
  return output;
}

function wocMd5Rstr2binl(input: string): number[] {
  const output: number[] = [];
  output[(input.length >> 2) - 1] = undefined as unknown as number;
  for (let i = 0; i < output.length; i += 1) {
    output[i] = 0;
  }
  const length8 = input.length * 8;
  for (let i = 0; i < length8; i += 8) {
    output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
  }
  return output;
}

function wocMd5Str2rstrUTF8(input: string): string {
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(input);
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      out += String.fromCharCode(bytes[i]!);
    }
    return out;
  }
  const esc = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p: string) =>
    String.fromCharCode(parseInt(p, 16))
  );
  return esc;
}

function wocMd5RstrMD5(s: string): string {
  return wocMd5Binl2rstr(wocMd5BinlMD5(wocMd5Rstr2binl(s), s.length * 8));
}

function wocMd5Rstr2hex(input: string): string {
  const hexTab = "0123456789abcdef";
  let output = "";
  for (let i = 0; i < input.length; i++) {
    const x = input.charCodeAt(i);
    output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f);
  }
  return output;
}

function wocMd5UpperHex(s: string): string {
  return wocMd5Rstr2hex(wocMd5RstrMD5(wocMd5Str2rstrUTF8(s))).toUpperCase();
}

function wocParseBusinessData(raw: string): unknown {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return raw;
  }
}

function wocNormalizeResultDataToString(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw) as unknown;
      if (typeof once === "object" && once !== null) {
        return JSON.stringify(once);
      }
      return raw;
    } catch {
      return raw;
    }
  }
  if (typeof raw === "object") {
    return JSON.stringify(raw);
  }
  return String(raw);
}

function wocOptionalString(p: Record<string, unknown>, key: string): string | undefined {
  const v = p[key];
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function wocParamsDataToJsonString(data: unknown): string {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function wocOptionsFromParams(raw: Record<string, unknown>): WocCallOptions | undefined {
  const gatewayAction = wocOptionalString(raw, "gatewayAction");
  const serviceUrl = wocOptionalString(raw, "serviceUrl");
  if (!gatewayAction && !serviceUrl) return undefined;
  return { gatewayAction, serviceUrl };
}

function wocFormatUnknownError(err: unknown): string {
  if (err instanceof Error) {
    const c = (err as Error & { cause?: unknown }).cause;
    const causeStr = c != null ? ` cause=${wocFormatUnknownError(c)}` : "";
    return `${err.name}: ${err.message}${causeStr}`;
  }
  return String(err);
}

async function wocPerformWinitOpenApiCall(
  input: WocCallInput,
  options?: WocCallOptions
): Promise<WocCallResult> {
  const gatewayAction = options?.gatewayAction ?? DEFAULT_GATEWAY_ACTION;
  const serviceUrl = options?.serviceUrl ?? DEFAULT_SERVICE_URL;
  const token = String(options?.signToken ?? input.signToken ?? "").trim();
  const clientId = String(options?.clientId ?? input.clientId ?? "").trim();
  if (!token || !clientId) {
    return {
      code: -1,
      data: "",
      msg: "signToken 与 clientId 不能为空：请在 params 中传入 SIGN_TOKEN（或 signToken）、CLIENT_ID（或 clientId）。",
    };
  }
  const fetchFn = options?.fetchImpl ?? fetch;

  const businessData = wocParseBusinessData(input.data);

  const bodyData: Record<string, unknown> = {
    data: businessData,
    action: String(input.action ?? ""),
    customerCode: String(input.customerCode ?? ""),
    customerName: String(input.customerName ?? ""),
  };

  const timestamp = Date.now();
  const format = DEFAULT_FORMAT;
  const platform = DEFAULT_PLATFORM;
  const signMethod = DEFAULT_SIGN_METHOD;
  const version = DEFAULT_VERSION;
  const language = input.language?.trim() || DEFAULT_LANGUAGE;

  const content =
    token +
    wocBuildSignatureString(
      gatewayAction,
      String(input.username ?? ""),
      bodyData,
      format,
      platform,
      signMethod,
      timestamp,
      version
    ) +
    token;
  const signData = wocMd5UpperHex(content);

  const payload = {
    action: gatewayAction,
    app_key: String(input.username ?? ""),
    client_id: clientId,
    client_sign: signData,
    data: bodyData,
    format,
    language,
    platform,
    sign: signData,
    sign_method: signMethod,
    timestamp,
    version,
  };

  let res: Response;
  try {
    res = await fetchFn(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (compatible; CozeWorkflow/1.0)",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err) {
    const m = wocFormatUnknownError(err);
    const host = (() => {
      try {
        return new URL(serviceUrl).host;
      } catch {
        return "目标主机";
      }
    })();
    return {
      code: -1,
      data: "",
      msg: `[网络/沙箱] ${m}。若含 request sandbox 或 invalid status code：请在 Coze 外网/域名白名单中放行 ${host}，或改用「万邑通 OpenAPI」插件节点代替代码节点直连。`,
    };
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    return {
      code: -1,
      data: "",
      msg: `[读响应失败] ${wocFormatUnknownError(err)}`,
    };
  }

  if (!res.ok) {
    return {
      code: -1,
      data: "",
      msg: `HTTP ${res.status} ${res.statusText}: ${text.slice(0, 800)}`,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    const ret: WocCallResult = {
      code: -1,
      data: "",
      msg: `响应非 JSON（HTTP ${res.status}）: ${text.slice(0, 500)}`,
    };
    return ret;
  }

  const code = Number(parsed.code ?? -1);
  const msg = String(parsed.msg ?? parsed.message ?? "");

  if (code !== 0) {
    const ret: WocCallResult = {
      code,
      msg,
      data: wocNormalizeResultDataToString(parsed.data),
    };
    return ret;
  }

  const dataField = wocRemoveNulls(parsed.data);
  const ret: WocCallResult = {
    code: 0,
    msg,
    data: wocNormalizeResultDataToString(dataField),
  };
  return ret;
}

/**
 * Coze 工作流代码节点入口（声明须与平台一致）。
 */
async function main({ params }: Args): Promise<Output> {
  try {
    const raw = params ?? {};
    const opt = wocOptionsFromParams(raw);
    const signToken = wocParamCredential(raw, "SIGN_TOKEN", "signToken");
    const clientId = wocParamCredential(raw, "CLIENT_ID", "clientId");
    if (!signToken || !clientId) {
      return {
        code: -1,
        data: "",
        msg: "缺少必填参数：SIGN_TOKEN（或 signToken）与 CLIENT_ID（或 clientId）。",
      };
    }
    const input: WocCallInput = {
      action: String(raw.action ?? ""),
      data: wocParamsDataToJsonString(raw.data),
      language: raw.language !== undefined && raw.language !== null ? String(raw.language) : undefined,
      customerCode: String(raw.customerCode ?? ""),
      customerName: String(raw.customerName ?? ""),
      username: String(raw.username ?? ""),
      signToken,
      clientId,
    };
    return await wocPerformWinitOpenApiCall(input, opt);
  } catch (err) {
    return {
      code: -1,
      data: "",
      msg: `[节点异常] ${wocFormatUnknownError(err)}`,
    };
  }
}

export async function callWinitOpenApi(
  input: WinitOpenApiCallInput,
  options?: WinitOpenApiCallOptions
): Promise<WinitOpenApiCallResult> {
  try {
    return await wocPerformWinitOpenApiCall(input, options);
  } catch (err) {
    return {
      code: -1,
      data: "",
      msg: `[调用异常] ${wocFormatUnknownError(err)}`,
    };
  }
}
