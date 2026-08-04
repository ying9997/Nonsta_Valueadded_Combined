import type { FeishuBitableEnv } from "./env";

export async function feishuTenantToken(appId: string, appSecret: string): Promise<string> {
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

export interface BitableFieldMeta {
  field_id: string;
  field_name: string;
  type: number;
}

export async function feishuListTableFields(
  token: string,
  appToken: string,
  tableId: string
): Promise<BitableFieldMeta[]> {
  const out: BitableFieldMeta[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ page_size: "100" });
    if (pageToken) q.set("page_token", pageToken);
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields?${q}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json()) as Record<string, unknown>;
    if (data.code !== 0) {
      throw new Error(`Feishu list fields error: ${JSON.stringify(data)}`);
    }
    const d = data.data as Record<string, unknown> | undefined;
    const items = (d?.items as unknown[]) ?? [];
    for (const it of items) {
      const f = it as Record<string, unknown>;
      out.push({
        field_id: String(f.field_id ?? ""),
        field_name: String(f.field_name ?? ""),
        type: Number(f.type ?? 0),
      });
    }
    pageToken = d?.page_token ? String(d.page_token) : undefined;
    if (!pageToken) break;
  }
  return out;
}

/** 按 expert 主键列精确查找，返回第一条记录的 record_id（无则 undefined） */
export async function feishuFindRecordIdByExpertId(
  token: string,
  appToken: string,
  tableId: string,
  expertId: string,
  expertIdFieldName: string
): Promise<string | undefined> {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;
  const body = {
    filter: {
      conjunction: "and" as const,
      conditions: [
        {
          field_name: expertIdFieldName,
          operator: "is" as const,
          value: [expertId],
        },
      ],
    },
    page_size: 10,
  };
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
  const first = items[0] as Record<string, unknown> | undefined;
  return first?.record_id ? String(first.record_id) : undefined;
}

/**
 * 按 expert_id + ver 精确查找（多维表 ver 列建议为**文本**；数字列请改用数值 filter）。
 * 返回第一条 record_id。
 */
export async function feishuFindRecordIdByExpertIdAndVer(
  token: string,
  appToken: string,
  tableId: string,
  expertId: string,
  expertIdFieldName: string,
  ver: string,
  verFieldName: string,
  releaseId?: string,
  releaseIdFieldName?: string
): Promise<string | undefined> {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;
  const conditions: Array<{
    field_name: string;
    operator: "is";
    value: string[];
  }> = [
    {
      field_name: expertIdFieldName,
      operator: "is",
      value: [expertId],
    },
    {
      field_name: verFieldName,
      operator: "is",
      value: [ver],
    },
  ];
  const rid = releaseId?.trim();
  if (rid && releaseIdFieldName?.trim()) {
    conditions.push({
      field_name: releaseIdFieldName.trim(),
      operator: "is",
      value: [rid],
    });
  }
  const body = {
    filter: {
      conjunction: "and" as const,
      conditions,
    },
    page_size: 10,
  };
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
  const first = items[0] as Record<string, unknown> | undefined;
  return first?.record_id ? String(first.record_id) : undefined;
}

export async function feishuBatchCreateRecords(
  token: string,
  appToken: string,
  tableId: string,
  records: Array<{ fields: Record<string, unknown> }>
): Promise<void> {
  if (records.length === 0) return;
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ records }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) {
    throw new Error(`Feishu batch_create error: ${JSON.stringify(data)}`);
  }
}

export async function feishuBatchUpdateRecords(
  token: string,
  appToken: string,
  tableId: string,
  records: Array<{ record_id: string; fields: Record<string, unknown> }>
): Promise<void> {
  if (records.length === 0) return;
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_update`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ records }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) {
    throw new Error(`Feishu batch_update error: ${JSON.stringify(data)}`);
  }
}

export async function getTenantToken(env: FeishuBitableEnv): Promise<string> {
  return feishuTenantToken(env.appId, env.appSecret);
}
