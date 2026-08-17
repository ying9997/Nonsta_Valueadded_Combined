import { randomBytes } from "node:crypto";
import {
  buildGetTokenBodyFromJar,
  buildPasswordLoginBodyFromPlain,
  CookieJar,
  HttpSession,
  iamGetToken,
  iamLogin,
} from "winit-tom-adapter";
import { getExchangeSessionStoreOrThrow } from "../config/getSessionStore.js";
import { getRuntimeState } from "../config/runtimeState.js";
import type { ExchangeSessionPayloadV1 } from "../exchange/sessionTypes.js";
import type { TenantCredentials } from "../tenants/loadCredentials.js";
import { getExchangeTokenTtlSec, saveExchangeSession } from "./exchangeSessionStore.js";

function tomDefaultsFromSingleEnv(): {
  readonly cnomstomBase: string;
  readonly ordersPage: string;
  readonly ordersReferer: string | undefined;
} {
  return {
    cnomstomBase: process.env.WINIT_CNOMSTOM_BASE ?? "https://cnomstom.winit.com.cn",
    ordersPage: process.env.WINIT_ORDERS_PAGE ?? "/OverseasOBOrder/index",
    ordersReferer: process.env.WINIT_ORDERS_REFERER,
  };
}

function tomDefaultsFromTenant(t: TenantCredentials) {
  const d = tomDefaultsFromSingleEnv();
  return {
    cnomstomBase: t.cnomstomBase ?? d.cnomstomBase,
    ordersPage: t.ordersPage ?? d.ordersPage,
    ordersReferer: t.ordersReferer ?? d.ordersReferer,
  };
}

/**
 * 内存中 IAM 登录 + 写会话存储（仅 jar + TOM 元数据，无用户名密码）。
 */
export async function performPasswordExchange(input: {
  readonly username: string;
  readonly password: string;
  /** 多租户必填，与凭据文件 `tenants` 键一致 */
  readonly tenantId?: string;
}): Promise<{ accessToken: string; expiresIn: number; payload: ExchangeSessionPayloadV1 }> {
  const st = getRuntimeState();
  const jar = new CookieJar();
  const session = new HttpSession({ jar });
  const loginBody = buildPasswordLoginBodyFromPlain({
    username: input.username,
    password: input.password,
  });

  let tom: { cnomstomBase: string; ordersPage: string; ordersReferer: string | undefined };
  let syncHosts: string | undefined;
  let tenantId: string | undefined;
  if (st.kind === "multi") {
    if (!input.tenantId?.trim()) {
      throw new Error("tenantId is required in multi-tenant mode.");
    }
    tenantId = input.tenantId.trim();
    const t = st.tenants.get(tenantId);
    if (!t) {
      throw new Error(`Unknown tenantId: ${tenantId}`);
    }
    tom = tomDefaultsFromTenant(t);
    syncHosts = t.cookieSyncHosts;
    await iamLogin(session, jar, {
      loginBody,
      iamBase: t.iamBase,
      iamOrigin: t.iamOrigin,
      iamReferer: t.iamReferer,
      cookieSyncHosts: syncHosts,
    });
    await iamGetToken(session, jar, {
      getTokenBody: buildGetTokenBodyFromJar(jar),
      iamBase: t.iamBase,
      origin: t.iamOrigin,
      referer: t.iamReferer,
      cookieSyncHosts: syncHosts,
    });
  } else {
    tom = tomDefaultsFromSingleEnv();
    await iamLogin(session, jar, { loginBody });
    await iamGetToken(session, jar, { getTokenBody: buildGetTokenBodyFromJar(jar) });
  }

  const accessToken = randomBytes(32).toString("hex");
  const payload: ExchangeSessionPayloadV1 = {
    v: 1,
    jar: jar.toSnapshotV1(),
    tenantId,
    cnomstomBase: tom.cnomstomBase,
    ordersPage: tom.ordersPage,
    ordersReferer: tom.ordersReferer,
  };
  const ttl = getExchangeTokenTtlSec();
  const sessionStore = getExchangeSessionStoreOrThrow();
  await saveExchangeSession(sessionStore, accessToken, payload, ttl);
  return { accessToken, expiresIn: ttl, payload };
}
