import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { copilotDir, envText } from "./env.ts";

const FEISHU_HOST = "https://open.feishu.cn/open-apis";
const SKEW_MS = 60_000;

export type TokenSource = "user_env" | "user_file" | "tenant";

export interface UserTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  expire_at: number;
  created_at: string;
  name?: string;
  open_id?: string;
  scope?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function userTokenFilePath(): string {
  return resolve(copilotDir(), ".feishu-user-token.json");
}

export function isUserTokenExpired(saved: UserTokenData, now = Date.now()): boolean {
  return !saved.expire_at || now >= saved.expire_at - SKEW_MS;
}

export function normalizeUserToken(raw: Record<string, unknown>, extra: Partial<UserTokenData> = {}): UserTokenData {
  const expiresIn = Number(raw.expires_in ?? 7200) || 7200;
  const createdAt = extra.created_at || new Date().toISOString();
  const expireAt =
    Number(raw.expire_at) ||
    Date.parse(String(raw.created_at || createdAt)) + expiresIn * 1000 ||
    Date.now() + expiresIn * 1000;
  return {
    access_token: String(raw.access_token || ""),
    refresh_token: String(raw.refresh_token || extra.refresh_token || ""),
    expires_in: expiresIn,
    refresh_expires_in: Number(raw.refresh_expires_in || 0) || undefined,
    expire_at: expireAt,
    created_at: createdAt,
    name: extra.name || (raw.name ? String(raw.name) : undefined),
    open_id: extra.open_id || (raw.open_id ? String(raw.open_id) : undefined),
    scope: extra.scope || (raw.scope ? String(raw.scope) : undefined),
  };
}

export function readUserTokenFile(): UserTokenData | null {
  const file = userTokenFilePath();
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const saved = normalizeUserToken(raw);
    if (!saved.access_token) return null;
    return saved;
  } catch {
    return null;
  }
}

export function writeUserTokenFile(data: UserTokenData): string {
  const file = userTokenFilePath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return file;
}

export async function getAppAccessToken(): Promise<string> {
  const appId = envText("FEISHU_APP_ID");
  const appSecret = envText("FEISHU_APP_SECRET");
  if (!appId || !appSecret) throw new Error("缺少 FEISHU_APP_ID / FEISHU_APP_SECRET");
  const res = await fetch(`${FEISHU_HOST}/auth/v3/app_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) throw new Error(`获取 app_access_token 失败: ${JSON.stringify(data)}`);
  return String(data.app_access_token || "");
}

async function oidcPost(path: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const appToken = await getAppAccessToken();
  const res = await fetch(`${FEISHU_HOST}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${appToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) throw new Error(`飞书 OIDC ${path} 失败: ${JSON.stringify(data)}`);
  return asRecord(data.data);
}

export async function exchangeCodeForUserToken(code: string): Promise<UserTokenData> {
  const data = await oidcPost("/authen/v1/oidc/access_token", {
    grant_type: "authorization_code",
    code,
  });
  return normalizeUserToken(data);
}

export async function refreshUserToken(refreshToken: string): Promise<UserTokenData | null> {
  try {
    const data = await oidcPost("/authen/v1/oidc/refresh_access_token", {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    return normalizeUserToken(data, { refresh_token: String(data.refresh_token || refreshToken) });
  } catch (err) {
    console.warn(`user_access_token refresh 失败，将降级为机器人身份：${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function getFeishuUserInfo(userAccessToken: string): Promise<{ name: string; open_id: string }> {
  const res = await fetch(`${FEISHU_HOST}/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) throw new Error(`获取用户信息失败: ${JSON.stringify(data)}`);
  const info = asRecord(data.data);
  return { name: String(info.name || ""), open_id: String(info.open_id || "") };
}

export async function loadValidUserToken(): Promise<{ token: string; source: TokenSource; profile?: UserTokenData } | null> {
  const envToken = envText("FEISHU_USER_ACCESS_TOKEN");
  if (envToken) return { token: envToken, source: "user_env" };

  let saved = readUserTokenFile();
  if (!saved) return null;
  if (!isUserTokenExpired(saved)) return { token: saved.access_token, source: "user_file", profile: saved };
  if (!saved.refresh_token) {
    console.warn("user_access_token 已过期且没有 refresh_token，降级为机器人身份");
    return null;
  }
  const refreshed = await refreshUserToken(saved.refresh_token);
  if (!refreshed) return null;
  const next = normalizeUserToken(refreshed, {
    name: saved.name,
    open_id: saved.open_id,
    refresh_token: refreshed.refresh_token || saved.refresh_token,
  });
  writeUserTokenFile(next);
  return { token: next.access_token, source: "user_file", profile: next };
}

export function oauthRedirectUri(): string {
  return envText("FEISHU_REDIRECT_URI") || "http://localhost:9988/callback";
}

export function oauthPort(): number {
  const fromEnv = Number(envText("FEISHU_OAUTH_PORT") || "");
  if (fromEnv) return fromEnv;
  try {
    const url = new URL(oauthRedirectUri());
    return Number(url.port || 9988) || 9988;
  } catch {
    return 9988;
  }
}

/** Empty = do not pass scope; Feishu grants all user-identity scopes already enabled on the app. */
export const USER_SEND_SCOPES = "";

export function buildAuthorizeUrl(appId: string, redirectUri: string, state: string, scope = USER_SEND_SCOPES): string {
  const q = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  if (scope) q.set("scope", scope);
  return `${FEISHU_HOST}/authen/v1/authorize?${q}`;
}
