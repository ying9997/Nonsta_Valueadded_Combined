import {
  CookieJar,
  HttpSession,
  isLikelyCsrfFailure,
  overseasObOrderAjaxProcess,
} from "winit-tom-adapter";
import { RelayReauthRequiredError } from "../errors/RelayReauthRequiredError.js";
import { getExchangeSessionStoreOrThrow } from "../config/getSessionStore.js";
import type { ExchangeSessionPayloadV1 } from "../exchange/sessionTypes.js";
import { deleteExchangeSession, getExchangeTokenTtlSec, saveExchangeSession } from "./exchangeSessionStore.js";

function isLikelyReauthError(message: string): boolean {
  if (isLikelyCsrfFailure(message)) return true;
  const m = message.toLowerCase();
  return m.includes("iam login") || m.includes("gettoken") || m.includes(" unauthoriz");
}

/**
 * 使用换票链路的 CookieJar 调 TOM；成功则回写会话存储中的 jar 快照。失败且疑似会话过期则删票并抛 {@link RelayReauthRequiredError}。
 */
export async function tomOrderByExchangeSession(
  accessToken: string,
  basePayload: ExchangeSessionPayloadV1,
  trackingNos: readonly string[],
): Promise<unknown> {
  const jar = CookieJar.fromSnapshotV1(basePayload.jar);
  const session = new HttpSession({ jar });
  const sessionStore = getExchangeSessionStoreOrThrow();
  const ttl = getExchangeTokenTtlSec();

  try {
    const data = await overseasObOrderAjaxProcess({
      session,
      baseUrl: basePayload.cnomstomBase ?? "https://cnomstom.winit.com.cn",
      pagePath: basePayload.ordersPage ?? "/OverseasOBOrder/index",
      referer: basePayload.ordersReferer,
      trackingNos,
    });
    const next: ExchangeSessionPayloadV1 = {
      v: 1,
      jar: jar.toSnapshotV1(),
      tenantId: basePayload.tenantId,
      cnomstomBase: basePayload.cnomstomBase,
      ordersPage: basePayload.ordersPage,
      ordersReferer: basePayload.ordersReferer,
    };
    await saveExchangeSession(sessionStore, accessToken, next, ttl);
    return data;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isLikelyReauthError(message)) {
      await deleteExchangeSession(sessionStore, accessToken);
      throw new RelayReauthRequiredError();
    }
    throw e;
  }
}
