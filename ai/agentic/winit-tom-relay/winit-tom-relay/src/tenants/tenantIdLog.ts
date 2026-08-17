import { createHash } from "node:crypto";

/**
 * 日志 / 指标用的租户标识：默认取 sha256 短前缀，避免高基数时泄露业务 ID（可按 RELAY_LOG_TENANT_MODE=plain 回退）。
 */
export function tenantIdForLog(tenantId: string): string {
  if (process.env.RELAY_LOG_TENANT_MODE === "plain") {
    return tenantId;
  }
  return createHash("sha256").update(tenantId, "utf8").digest("hex").slice(0, 12);
}
