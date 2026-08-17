import { readFileSync } from "node:fs";
import { z } from "zod";

const tenantValue = z.object({
  iamLogin: z.unknown(),
  iamBase: z.string().optional(),
  iamOrigin: z.string().optional(),
  iamReferer: z.string().optional(),
  cookieSyncHosts: z.string().optional(),
  cnomstomBase: z.string().optional(),
  ordersPage: z.string().optional(),
  ordersReferer: z.string().optional(),
});

const fileSchema = z.object({
  tenants: z.record(z.string(), tenantValue),
});

export type TenantCredentials = z.infer<typeof tenantValue>;

export function loadTenantCredentialsFile(path: string): Map<string, TenantCredentials> {
  const raw = readFileSync(path, "utf8");
  const data = fileSchema.parse(JSON.parse(raw) as unknown);
  return new Map(Object.entries(data.tenants));
}
