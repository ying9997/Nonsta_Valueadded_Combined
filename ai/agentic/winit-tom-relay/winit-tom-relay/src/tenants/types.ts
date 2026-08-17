import type { ExchangeSessionPayloadV1 } from "../exchange/sessionTypes.js";
import type { TenantCredentials } from "./loadCredentials.js";
export type { TenantCredentials } from "./loadCredentials.js";

export interface MultiRelayContext {
  readonly mode: "multi";
  readonly tenantId: string;
  readonly credentials: TenantCredentials;
  /** For logs (hashed or plain per RELAY_LOG_TENANT_MODE). */
  readonly tenantIdLog: string;
}

export interface SingleRelayContext {
  readonly mode: "single";
}

/** 经 `POST /v1/auth/exchange` 换得的 access token；会话仅存本地会话目录（jar 快照），无持久用户名密码。 */
export interface ExchangeRelayContext {
  readonly mode: "exchange";
  readonly accessToken: string;
  readonly sessionPayload: ExchangeSessionPayloadV1;
  /** 日志/指标用（含 single 无 tenantId 时）。 */
  readonly tenantIdLog: string;
}

export type RelayContext = MultiRelayContext | SingleRelayContext | ExchangeRelayContext;
