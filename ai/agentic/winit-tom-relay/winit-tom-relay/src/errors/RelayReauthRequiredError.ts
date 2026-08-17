/**
 * TOM/IAM 会话已失效，上游须重新调用 `POST /v1/auth/exchange`；本错误**不得**将 Cookie/密码写入日志 message。
 */
export class RelayReauthRequiredError extends Error {
  override readonly name = "RelayReauthRequiredError";
  static readonly code = "REAUTH_REQUIRED" as const;

  constructor() {
    super("Session expired or invalid. Call POST /v1/auth/exchange with credentials again.");
  }
}
