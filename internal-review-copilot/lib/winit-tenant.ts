import { readFileSync } from "node:fs";
import { join } from "node:path";
import { copilotDir } from "./env.ts";

export interface WinitTenant {
  tenantKey: string;
  label: string;
}

interface WhitelistFile {
  tenants?: Array<{ tenant_key?: string; label?: string }>;
}

let cached: WinitTenant[] | null = null;

export function loadWinitTenants(): WinitTenant[] {
  if (cached) return cached;
  const path = join(copilotDir(), "config", "winit-tenant-whitelist.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as WhitelistFile;
  const tenants: WinitTenant[] = [];
  for (const item of raw.tenants || []) {
    const tenantKey = String(item.tenant_key || "").trim();
    if (!tenantKey) continue;
    tenants.push({ tenantKey, label: String(item.label || tenantKey) });
  }
  cached = tenants;
  return tenants;
}

export function winitTenantKeys(): Set<string> {
  return new Set(loadWinitTenants().map((item) => item.tenantKey));
}

/** 空 key 一律不算内部（拿不到企业标识时走禁止使用 / 巡检标红）。 */
export function isWinitTenant(tenantKey: string | null | undefined): boolean {
  const key = String(tenantKey || "").trim();
  if (!key) return false;
  return winitTenantKeys().has(key);
}

export function resetWinitTenantCacheForTests(): void {
  cached = null;
}
