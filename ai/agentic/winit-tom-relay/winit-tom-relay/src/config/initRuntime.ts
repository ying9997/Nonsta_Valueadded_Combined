import { loadTenantCredentialsFile } from "../tenants/loadCredentials.js";
import { ensureSessionStoreBaseDir, FileSessionStore } from "../sessionStore/fileSessionStore.js";
import { resolveSessionDir } from "../sessionStore/resolveSessionDir.js";
import { isExchangeEnabled } from "./exchangeEnabled.js";
import { setRuntimeState } from "./runtimeState.js";

/**
 * 单租户：仅依赖 `RELAY_API_KEYS` + 进程内 `WINIT_*`（与 winit-tom-adapter 一致）。
 * 多租户：需 `RELAY_TENANT_CREDENTIALS_FILE`、`RELAY_TENANT_KEY_MAP`、本地会话目录（默认项目根 `sessions`）。
 * `RELAY_EXCHANGE_ENABLED=1` 时单租户需会话目录存换票会话。
 */
export async function initRuntimeFromEnv(): Promise<void> {
  const credPath = process.env.RELAY_TENANT_CREDENTIALS_FILE?.trim();
  const ex = isExchangeEnabled();
  const sessionBaseDir = resolveSessionDir(import.meta.url);

  if (credPath) {
    const keyMapJson = process.env.RELAY_TENANT_KEY_MAP?.trim();
    if (!keyMapJson) {
      throw new Error("Multi-tenant mode requires RELAY_TENANT_KEY_MAP (JSON object: apiKey -> tenantId).");
    }
    const rawMap = JSON.parse(keyMapJson) as Record<string, string>;
    if (typeof rawMap !== "object" || rawMap === null || Array.isArray(rawMap)) {
      throw new Error("RELAY_TENANT_KEY_MAP must be a JSON object.");
    }
    const keyToTenant = new Map<string, string>();
    for (const [k, v] of Object.entries(rawMap)) {
      if (typeof v !== "string" || !v.trim()) {
        throw new Error("RELAY_TENANT_KEY_MAP values must be non-empty tenantId strings.");
      }
      keyToTenant.set(k.trim(), v.trim());
    }
    const tenants = loadTenantCredentialsFile(credPath);
    for (const id of keyToTenant.values()) {
      if (!tenants.has(id)) {
        throw new Error(`RELAY_TENANT_KEY_MAP references missing tenant in credentials file: ${id}`);
      }
    }
    await ensureSessionStoreBaseDir(sessionBaseDir);
    const sessionStore = new FileSessionStore(sessionBaseDir);
    setRuntimeState({ kind: "multi", keyToTenant, tenants, sessionStore });
    return;
  }
  if (!process.env.RELAY_API_KEYS?.trim()) {
    console.warn("winit-tom-relay: RELAY_API_KEYS is empty; single-tenant /v1 will return 503.");
  }
  if (ex) {
    await ensureSessionStoreBaseDir(sessionBaseDir);
    const sessionStore = new FileSessionStore(sessionBaseDir);
    setRuntimeState({ kind: "single", sessionStoreForExchange: sessionStore });
    return;
  }
  setRuntimeState({ kind: "single" });
}
