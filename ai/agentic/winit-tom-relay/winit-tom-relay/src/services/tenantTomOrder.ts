import type { FastifyBaseLogger } from "fastify";
import type { CookieJarSnapshotV1 } from "winit-tom-adapter";
import {
  buildGetTokenBodyFromJar,
  CookieJar,
  HttpSession,
  iamGetToken,
  iamLogin,
  isLikelyCsrfFailure,
  overseasObOrderAjaxProcess,
} from "winit-tom-adapter";
import { getRuntimeState } from "../config/runtimeState.js";
import type { SessionStore } from "../sessionStore/types.js";
import type { TenantCredentials } from "../tenants/loadCredentials.js";

function sessionLogicalKey(tenantId: string): string {
  return `winit-tom-relay:session:${tenantId}`;
}

function createMutex() {
  let queue = Promise.resolve();
  return function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const result = queue.then(() => fn());
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

const tenantLoginMutex = new Map<string, ReturnType<typeof createMutex>>();

function mutexForTenant(tenantId: string): ReturnType<typeof createMutex> {
  let m = tenantLoginMutex.get(tenantId);
  if (!m) {
    m = createMutex();
    tenantLoginMutex.set(tenantId, m);
  }
  return m;
}

async function performTenantIam(
  jar: CookieJar,
  session: HttpSession,
  creds: TenantCredentials,
): Promise<void> {
  const sync = creds.cookieSyncHosts;
  await iamLogin(session, jar, {
    loginBody: creds.iamLogin,
    iamBase: creds.iamBase,
    iamOrigin: creds.iamOrigin,
    iamReferer: creds.iamReferer,
    cookieSyncHosts: sync,
  });
  await iamGetToken(session, jar, {
    getTokenBody: buildGetTokenBodyFromJar(jar),
    iamBase: creds.iamBase,
    origin: creds.iamOrigin,
    referer: creds.iamReferer,
    cookieSyncHosts: sync,
  });
}

/**
 * 多租户：文件会话存储 + 进程内登录互斥 + CSRF 失败时使会话失效并重登一次。
 */
export async function tomOrderByTrackingForTenant(
  tenantId: string,
  creds: TenantCredentials,
  trackingNos: readonly string[],
  log?: FastifyBaseLogger,
): Promise<unknown> {
  const r = getRuntimeState();
  if (r.kind !== "multi") {
    throw new Error("tomOrderByTrackingForTenant requires multi-tenant runtime");
  }
  const store: SessionStore = r.sessionStore;
  const ttl = Number(process.env.RELAY_TENANT_SESSION_TTL_SEC ?? "2700");
  const sk = sessionLogicalKey(tenantId);

  const runOnce = async (attempt: number): Promise<unknown> => {
    let raw = await store.get(sk);
    let jar: CookieJar;

    if (raw) {
      jar = CookieJar.fromSnapshotV1(JSON.parse(raw) as CookieJarSnapshotV1);
    } else {
      await mutexForTenant(tenantId)(async () => {
        const again = await store.get(sk);
        if (again) {
          return;
        }
        const j = new CookieJar();
        const s = new HttpSession({ jar: j });
        await performTenantIam(j, s, creds);
        await store.setWithTtl(sk, JSON.stringify(j.toSnapshotV1()), ttl);
        log?.info({ msg: "relay: IAM session stored", tenantId }, "tenant_session");
      });
      raw = await store.get(sk);
      if (!raw) {
        throw new Error("Tenant session missing after login (session store write failed?)");
      }
      jar = CookieJar.fromSnapshotV1(JSON.parse(raw) as CookieJarSnapshotV1);
    }

    const session = new HttpSession({ jar });
    try {
      return await overseasObOrderAjaxProcess({
        session,
        baseUrl: creds.cnomstomBase ?? "https://cnomstom.winit.com.cn",
        pagePath: creds.ordersPage ?? "/OverseasOBOrder/index",
        referer: creds.ordersReferer,
        trackingNos,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt > 0 || !isLikelyCsrfFailure(msg)) {
        throw e;
      }
      log?.warn({ msg: "relay: TOM likely session/CSRF issue, invalidating tenant session", tenantId }, "tenant_session");
      await store.del(sk);
      return runOnce(attempt + 1);
    }
  };

  return runOnce(0);
}
