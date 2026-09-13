import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { envText, projectDir } from "./env.ts";
import { asRecord, asText } from "./oms-adapter.ts";

const OMS_HOST = "https://cnomstom.winit.com.cn";
const AJAX_PROCESS = `${OMS_HOST}/VasOrder/ajaxProcess`;
const AJAX_SAVE = `${OMS_HOST}/VasOrder/ajaxSave`;
const LIST_PAGE = `${OMS_HOST}/VasOrder/index`;
const UNUSUAL_INDEX = `${OMS_HOST}/UnusualEvent/index`;
const UNUSUAL_AJAX = `${OMS_HOST}/UnusualEvent/ajaxProcess`;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const AUTO_LOGIN = resolve(projectDir(), "../AI_EXPERT/TOM/共享认证/auto_login.py");
const DEFAULT_COOKIE = resolve(projectDir(), "../AI_EXPERT/TOM/共享认证/playwright_cookies.json");

export const FORBIDDEN_REVIEW_API = "vaOrderReview";

export interface TomClient {
  ajaxProcess(api: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>;
  ajaxSave(api: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
  setOrderReferer(orderNo: string): Promise<void>;
  ajaxUnusualEvent(api: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>;
  getPage(path: string): Promise<string>;
  cookiePath: string;
}

export function assertNotReviewApi(api: string): void {
  if (String(api).includes(FORBIDDEN_REVIEW_API)) {
    throw new Error("硬编码拦截：禁止调用 vaOrderReview（永不自动审核通过）");
  }
}

export function defaultTomCookiePath(): string {
  const fromEnv = envText("TOM_COOKIE_PATH");
  if (!fromEnv) return DEFAULT_COOKIE;
  if (isAbsolute(fromEnv)) return fromEnv;
  return resolve(projectDir(), "..", fromEnv);
}

function flatten(prefix: string, value: unknown, out: Record<string, string>): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(`${prefix}[${i}]`, item, out));
    return;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      flatten(prefix ? `${prefix}[${key}]` : key, item, out);
    }
    return;
  }
  out[prefix] = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

function encodeForm(params: Record<string, unknown>): string {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) flatten(key, value, flat);
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(flat)) usp.set(k, v);
  return usp.toString();
}

function cookieHeader(raw: unknown): string {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw).cookies)
      ? (asRecord(raw).cookies as unknown[])
      : [];
  return list
    .map(asRecord)
    .filter((c) => asText(c.name) && asText(c.value))
    .map((c) => `${asText(c.name)}=${asText(c.value)}`)
    .join("; ");
}

function loadCookieHeader(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`OMS Cookie 文件不存在：${path}。请先运行 AI_EXPERT/TOM/共享认证/auto_login.py`);
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const header = cookieHeader(parsed);
  if (!header) throw new Error(`OMS Cookie 文件为空：${path}`);
  return header;
}

function findPython(): { cmd: string; args: string[] } {
  const localPy = resolve(
    process.env.LOCALAPPDATA || "",
    "Programs",
    "Python",
  );
  const extra: string[] = [];
  if (existsSync(localPy)) {
    for (const name of readdirSync(localPy)) {
      const exe = resolve(localPy, name, "python.exe");
      if (existsSync(exe)) extra.push(exe);
    }
  }
  const cmds: Array<[string, string[]]> = [
    ...extra.map((exe) => [exe, []] as [string, string[]]),
    ["py", ["-3"]],
    ["python", []],
    ["python3", []],
  ];
  for (const [cmd, prefix] of cmds) {
    const probe = spawnSync(cmd, [...prefix, "-c", "print(1)"], {
      encoding: "utf8",
      timeout: 8000,
      windowsHide: true,
    });
    if (probe.status === 0 && String(probe.stdout).includes("1")) return { cmd, args: prefix };
  }
  throw new Error("未找到 python/py，无法自动续期 Cookie。请手动运行 AI_EXPERT/TOM/共享认证/auto_login.py");
}

function autoLoginScript(): string {
  const fromEnv = envText("TOM_AUTO_LOGIN_PATH");
  if (fromEnv) return isAbsolute(fromEnv) ? fromEnv : resolve(projectDir(), "..", fromEnv);
  const sibling = resolve(dirname(defaultTomCookiePath()), "auto_login.py");
  if (existsSync(sibling)) return sibling;
  return AUTO_LOGIN;
}

export function refreshTomCookies(): void {
  const script = autoLoginScript();
  if (!existsSync(script)) {
    throw new Error(`找不到 auto_login.py：${script}`);
  }
  const py = findPython();
  const authDir = resolve(script, "..");
  const code = [
    "import sys",
    `sys.path.insert(0, r${JSON.stringify(authDir)})`,
    "from auto_login import do_login",
    "do_login(True)",
  ].join("\n");
  const result = spawnSync(py.cmd, [...py.args, "-c", code], {
    encoding: "utf8",
    timeout: 180_000,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").slice(0, 500);
    throw new Error(`auto_login.py 续期失败：${err || `exit ${result.status}`}`);
  }
}

export function isOmsAuthExpired(
  res: { url: string; text: string; status: number },
  parsed?: Record<string, unknown>,
): boolean {
  if (res.status === 302 && /cniam|#\/login/i.test(res.url)) return true;
  if (/cniam\.winit\.com\.cn|#\/login/i.test(res.url)) return true;
  const info = parsed
    ? `${asText(parsed.info)} ${asText(parsed.msg)} ${asText(parsed.message)} ${JSON.stringify(parsed.info || "")}`
    : "";
  return /登录超时|请重新登录/.test(`${res.text || ""}\n${info}`);
}

async function omsFetch(
  url: string,
  init: { method?: string; body?: string; cookie: string; csrf?: string; referer?: string },
): Promise<{ url: string; text: string; status: number }> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Cookie: init.cookie,
    Referer: init.referer || LIST_PAGE,
  };
  if (init.body != null) {
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    headers["X-Requested-With"] = "XMLHttpRequest";
  }
  if (init.csrf) headers["x-csrf-token"] = init.csrf;
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const res = await fetch(url, {
      method: init.method || "GET",
      body: init.body,
      headers,
      redirect: "follow",
    });
    return { url: res.url, text: await res.text(), status: res.status };
  } finally {
    if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
  }
}

function extractCsrf(html: string): string {
  const m = html.match(/window\.__CSRF_TOKEN__\s*=\s*['"]([^'"]+)['"]/);
  return m?.[1] || "";
}

export async function createTomClient(): Promise<TomClient> {
  const cookiePath = defaultTomCookiePath();
  let cookie = loadCookieHeader(cookiePath);
  let csrf = "";
  let referer = LIST_PAGE;

  const renewOnce = (alreadyRetried: boolean, what: string): void => {
    if (alreadyRetried) {
      throw new Error(`Cookie 失效：auto_login 后续期仍${what}，请手动登录`);
    }
    console.warn("OMS 登录超时或跳转 IAM，正在调用 auto_login.py 续期…");
    refreshTomCookies();
    cookie = loadCookieHeader(cookiePath);
  };

  const ensureSession = async (pageUrl: string, retried = false): Promise<void> => {
    const page = await omsFetch(pageUrl, { cookie, referer: pageUrl });
    if (isOmsAuthExpired(page)) {
      renewOnce(retried, "跳转 IAM / 登录超时");
      await ensureSession(pageUrl, true);
      return;
    }
    if (page.status >= 400) throw new Error(`OMS 页面 HTTP ${page.status}: ${pageUrl}`);
    const token = extractCsrf(page.text);
    if (!token) throw new Error("无法从 OMS 页面提取 CSRF，请重新 auto_login.py");
    csrf = token;
    referer = pageUrl;
  };

  await ensureSession(LIST_PAGE);

  const postJson = async (
    url: string,
    api: string,
    params: Record<string, unknown>,
    retried = false,
  ): Promise<Record<string, unknown>> => {
    assertNotReviewApi(api);
    const body = encodeForm({ api, ...params });
    const res = await omsFetch(url, { method: "POST", body, cookie, csrf, referer });
    let data: Record<string, unknown> | undefined;
    try {
      data = JSON.parse(res.text) as Record<string, unknown>;
    } catch {
      data = undefined;
    }
    if (isOmsAuthExpired(res, data)) {
      renewOnce(retried, `${api} 登录超时/跳转 IAM`);
      await ensureSession(referer || LIST_PAGE);
      return postJson(url, api, params, true);
    }
    if (!data) throw new Error(`OMS ${api} 返回非 JSON：${res.text.slice(0, 200)}`);
    if (Number(data.status) !== 1) {
      throw new Error(`${api} 失败: ${asText(data.info) || JSON.stringify(data).slice(0, 240)}`);
    }
    return data;
  };

  return {
    cookiePath,
    async setOrderReferer(orderNo: string) {
      await ensureSession(`${OMS_HOST}/VasOrder/detail/isFill/Y/orderNo/${orderNo}/isView/N`);
    },
    async ajaxProcess(api: string, params: Record<string, unknown> = {}) {
      return postJson(AJAX_PROCESS, api, params);
    },
    async ajaxUnusualEvent(api: string, params: Record<string, unknown> = {}) {
      await ensureSession(UNUSUAL_INDEX);
      return postJson(UNUSUAL_AJAX, api, params);
    },
    async getPage(path: string, retried = false): Promise<string> {
      const url = path.startsWith("http") ? path : `${OMS_HOST}${path.startsWith("/") ? path : `/${path}`}`;
      const page = await omsFetch(url, { cookie, referer: url });
      if (isOmsAuthExpired(page)) {
        renewOnce(retried, "跳转 IAM / 登录超时");
        return this.getPage(path, true);
      }
      if (page.status >= 400) throw new Error(`OMS 页面 HTTP ${page.status}: ${url}`);
      return page.text;
    },
    async ajaxSave(api: string, params: Record<string, unknown>) {
      return postJson(AJAX_SAVE, api, {
        form: JSON.stringify(params),
        jsondata: "true",
      });
    },
  };
}

let tomClientPromise: Promise<TomClient> | null = null;

export async function getOrCreateTomClient(): Promise<TomClient> {
  if (!tomClientPromise) {
    tomClientPromise = createTomClient().catch((err) => {
      tomClientPromise = null;
      throw err;
    });
  }
  return tomClientPromise;
}
