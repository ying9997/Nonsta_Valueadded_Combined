import type { SessionStore } from "../sessionStore/types.js";
import { isExchangeEnabled } from "./exchangeEnabled.js";
import { getRuntimeState } from "./runtimeState.js";

function sessionStoreFromState(): SessionStore | undefined {
  const st = getRuntimeState();
  if (st.kind === "multi") {
    return st.sessionStore;
  }
  if (st.kind === "single" && st.sessionStoreForExchange) {
    return st.sessionStoreForExchange;
  }
  return undefined;
}

/** 鉴权阶段查询换票会话：未启用换票或未初始化会话目录时返回 `undefined`。 */
export function getExchangeSessionStoreIfAvailable(): SessionStore | undefined {
  if (!isExchangeEnabled()) {
    return undefined;
  }
  return sessionStoreFromState();
}

/** 换票与会话读写使用的 `SessionStore`（多租户与单租户+换票共用同一套目录实现）。 */
export function getExchangeSessionStoreOrThrow(): SessionStore {
  if (!isExchangeEnabled()) {
    throw new Error("Password exchange is not enabled (RELAY_EXCHANGE_ENABLED).");
  }
  const s = sessionStoreFromState();
  if (!s) {
    throw new Error(
      "Exchange session store is not initialised. Set RELAY_EXCHANGE_ENABLED=1 and ensure the session directory exists (RELAY_SESSION_STORE_DIR or default project sessions/).",
    );
  }
  return s;
}
