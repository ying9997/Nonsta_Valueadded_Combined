/**
 * Resolve coze_workflow_id from Feishu Bitable expert register (same filter semantics as get-expert-registry).
 */

import { requireFeishuEnv } from "../sync-expert-register/env";
import type { RegistryRowResolved } from "./types";

const EXPERT_ID_FIELD = "expert_id";
const AVAILABLE_FIELD = "available";
const RELEASE_ID_FIELD = "release_id";
const VER_FIELD = "ver";
const COZE_WORKFLOW_ID_FIELD = "coze_workflow_id";

export function bitableCellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v).trim();
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "";
    const parts: string[] = [];
    for (const item of v) {
      if (item === null || item === undefined) continue;
      if (typeof item === "string") {
        parts.push(item);
        continue;
      }
      if (typeof item === "object" && item !== null && "text" in item) {
        const t = (item as { text?: unknown }).text;
        if (t !== undefined && t !== null) parts.push(String(t));
      }
    }
    return parts.join("").trim();
  }
  if (typeof v === "object" && v !== null && "text" in v) {
    return String((v as { text?: unknown }).text ?? "").trim();
  }
  if (typeof v === "object" && v !== null && "value" in v) {
    const val = (v as { value?: unknown }).value;
    if (Array.isArray(val)) return val.map((x) => String(x)).join(",").trim();
    if (val !== undefined && val !== null) return String(val).trim();
  }
  return String(v).trim();
}

function isBitableAvailableOn(fields: Record<string, unknown>): boolean {
  const raw = fields[AVAILABLE_FIELD];
  if (raw === true) return true;
  if (raw === false) return false;
  const s = bitableCellToString(raw);
  return s.toLowerCase() === "on";
}

function isBitableReleaseIdMatch(fields: Record<string, unknown>, expected: string): boolean {
  const want = expected.trim();
  if (!want) return true;
  return bitableCellToString(fields[RELEASE_ID_FIELD]) === want;
}

function buildRegistryRecordFilterForSingleExpert(
  expertId: string,
  releaseId: string
): Record<string, unknown> {
  const expertIdSubfilter = {
    conjunction: "and",
    conditions: [
      {
        field_name: EXPERT_ID_FIELD,
        operator: "is",
        value: [expertId],
      },
    ],
  };
  const conditions: Record<string, unknown>[] = [
    {
      field_name: AVAILABLE_FIELD,
      operator: "is",
      value: ["on"],
    },
    {
      field_name: RELEASE_ID_FIELD,
      operator: "is",
      value: [releaseId],
    },
  ];
  return {
    conjunction: "and",
    children: [
      expertIdSubfilter,
      {
        conjunction: "and",
        conditions,
      },
    ],
  };
}

async function feishuTenantToken(appId: string, appSecret: string): Promise<string> {
  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) {
    throw new Error(`Feishu token error: ${JSON.stringify(data)}`);
  }
  return String(data.tenant_access_token ?? "");
}

export interface RawRegistryMatch {
  expert_id: string;
  ver: string;
  coze_workflow_id: string;
  release_id: string;
}

function recordToMatch(fields: Record<string, unknown>, releaseId: string): RawRegistryMatch | null {
  if (!isBitableAvailableOn(fields)) return null;
  if (!isBitableReleaseIdMatch(fields, releaseId)) return null;
  const expert_id = bitableCellToString(fields[EXPERT_ID_FIELD]);
  if (!expert_id) return null;
  const coze_workflow_id = bitableCellToString(fields[COZE_WORKFLOW_ID_FIELD]);
  if (!coze_workflow_id) return null;
  return {
    expert_id,
    ver: bitableCellToString(fields[VER_FIELD]),
    coze_workflow_id,
    release_id: bitableCellToString(fields[RELEASE_ID_FIELD]) || releaseId,
  };
}

/**
 * Search all rows for expert_id + release_id + available; post-filter locally.
 * When multiple rows, sort `ver` descending and take the first unless `exactVer` is set.
 */
export async function searchRegistryRows(
  expertId: string,
  releaseId: string,
  exactVer?: string
): Promise<RawRegistryMatch[]> {
  const env = requireFeishuEnv();
  const token = await feishuTenantToken(env.appId, env.appSecret);
  const filter = buildRegistryRecordFilterForSingleExpert(expertId, releaseId);

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${env.appToken}/tables/${env.tableId}/records/search`;
  const matches: RawRegistryMatch[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 50; page++) {
    const body: Record<string, unknown> = {
      page_size: 500,
      filter,
    };
    if (pageToken) body.page_token = pageToken;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (data.code !== 0) {
      throw new Error(`Feishu bitable search error: ${JSON.stringify(data)}`);
    }
    const d = data.data as Record<string, unknown> | undefined;
    const items = (d?.items as unknown[]) ?? [];
    for (const it of items) {
      const rec = it as Record<string, unknown>;
      const fields = (rec.fields as Record<string, unknown>) ?? {};
      const m = recordToMatch(fields, releaseId);
      if (!m || m.expert_id !== expertId) continue;
      if (exactVer !== undefined && exactVer.trim() && m.ver !== exactVer.trim()) continue;
      matches.push(m);
    }
    pageToken = d?.page_token ? String(d.page_token) : undefined;
    if (!pageToken) break;
  }

  if (matches.length === 0) {
    await scanFallback(token, env.appToken, env.tableId, expertId, releaseId, exactVer, matches);
  }

  return matches;
}

/** When filter returns nothing (unsupported columns), scan pages like get-expert-registry. */
async function scanFallback(
  token: string,
  appToken: string,
  tableId: string,
  expertId: string,
  releaseId: string,
  exactVer: string | undefined,
  out: RawRegistryMatch[]
): Promise<void> {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;
  let pageToken: string | undefined;
  for (let page = 0; page < 50; page++) {
    const body: Record<string, unknown> = { page_size: 500 };
    if (pageToken) body.page_token = pageToken;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (data.code !== 0) {
      throw new Error(`Feishu bitable scan error: ${JSON.stringify(data)}`);
    }
    const d = data.data as Record<string, unknown> | undefined;
    const items = (d?.items as unknown[]) ?? [];
    for (const it of items) {
      const rec = it as Record<string, unknown>;
      const fields = (rec.fields as Record<string, unknown>) ?? {};
      const m = recordToMatch(fields, releaseId);
      if (!m || m.expert_id !== expertId) continue;
      if (exactVer !== undefined && exactVer.trim() && m.ver !== exactVer.trim()) continue;
      out.push(m);
    }
    pageToken = d?.page_token ? String(d.page_token) : undefined;
    if (!pageToken) break;
  }
}

export function pickLatestRow(matches: RawRegistryMatch[]): RegistryRowResolved | null {
  if (matches.length === 0) return null;
  const sorted = [...matches].sort((a, b) => {
    const va = a.ver || "";
    const vb = b.ver || "";
    if (va === vb) return 0;
    return va < vb ? 1 : -1;
  });
  const top = sorted[0]!;
  return {
    expert_id: top.expert_id,
    ver: top.ver,
    coze_workflow_id: top.coze_workflow_id,
    release_id: top.release_id,
  };
}

export async function resolveWorkflowIdForExpert(
  expertId: string,
  releaseId: string,
  exactVer?: string
): Promise<RegistryRowResolved | null> {
  const rows = await searchRegistryRows(expertId, releaseId, exactVer);
  if (rows.length === 0) return null;
  if (exactVer !== undefined && exactVer.trim()) {
    return pickLatestRow(rows);
  }
  return pickLatestRow(rows);
}
