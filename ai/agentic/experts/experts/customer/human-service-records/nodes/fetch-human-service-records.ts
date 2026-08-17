/**
 * 节点：fetch-human-service-records
 * 通过飞书 Wiki node token 解析 Bitable app token，再按 username 匹配客户邮箱查询。
 * 仓库不提交真实凭证；Coze 上线时通过节点安全配置或人工填充占位常量。
 */

const FEISHU_APP_ID = "__FEISHU_APP_ID__";
const FEISHU_APP_SECRET = "__FEISHU_APP_SECRET__";
const FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN = "__FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN__";
const FEISHU_HUMAN_SERVICE_TABLE_ID = "tbl3XLmGtZUm658z";
const FEISHU_HUMAN_SERVICE_VIEW_ID = "vew1laA6wo";

interface ValidationLite {
  canQuery?: boolean;
  identity?: {
    username?: string;
    customerCode?: string;
    customerName?: string;
  };
}

interface QueryScopeLite {
  queryStatus?: string;
  rejectReason?: string;
  serverDateHints?: string[];
  sortDirection?: string;
}

interface FieldMeta {
  field_id: string;
  field_name: string;
  type?: number;
  ui_type?: string;
}

interface HumanServiceRecord {
  recordId: string;
  conversationId: string;
  conversationStartedAt: string;
  messages: string;
  customerEmail: string;
  customerName: string;
  agentName: string;
  channel: string;
  categories: string[];
}

function stringParam(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function envValue(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return String(process.env[name] ?? "").trim();
}

function usableConfigValue(v: string): string {
  const s = String(v ?? "").trim();
  if (/^__[^_].*__$/.test(s)) return "";
  return s;
}

function configValue(params: Record<string, unknown>, paramKey: string, constantValue: string, envKey: string): string {
  return usableConfigValue(stringParam(params, paramKey)) || usableConfigValue(constantValue) || envValue(envKey);
}

function normalizeFieldName(s: string): string {
  return String(s ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

function cellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v).trim();
  }
  if (Array.isArray(v)) {
    const parts: string[] = [];
    for (const item of v) {
      const s = cellToString(item);
      if (s) parts.push(s);
    }
    return parts.join("").trim();
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.text !== undefined) return cellToString(o.text);
    if (o.name !== undefined) return cellToString(o.name);
    if (o.value !== undefined) return cellToString(o.value);
    if (o.link !== undefined) return cellToString(o.link);
  }
  return String(v).trim();
}

function categoriesFromFields(fields: Record<string, unknown>, names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    const s = cellToString(fields[name]);
    if (s) out.push(s);
  }
  return out;
}

async function feishuJson(url: string, init: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(url, init as RequestInit);
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) {
    throw new Error(JSON.stringify({ code: data.code, msg: data.msg, url }));
  }
  return data;
}

async function tenantToken(appId: string, appSecret: string): Promise<string> {
  const data = await feishuJson("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  return String(data.tenant_access_token ?? "");
}

async function wikiNodeToBitableAppToken(token: string, wikiNodeToken: string): Promise<string> {
  const url =
    "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?" +
    new URLSearchParams({ token: wikiNodeToken }).toString();
  const data = await feishuJson(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = data.data as Record<string, unknown> | undefined;
  const node = d?.node as Record<string, unknown> | undefined;
  return String(node?.obj_token ?? "");
}

async function listFields(token: string, appToken: string, tableId: string): Promise<FieldMeta[]> {
  const out: FieldMeta[] = [];
  let pageToken = "";
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ page_size: "100" });
    if (pageToken) q.set("page_token", pageToken);
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields?${q}`;
    const data = await feishuJson(url, { headers: { Authorization: `Bearer ${token}` } });
    const d = data.data as Record<string, unknown> | undefined;
    const items = (d?.items as unknown[]) ?? [];
    for (const item of items) {
      const f = item as Record<string, unknown>;
      out.push({
        field_id: String(f.field_id ?? ""),
        field_name: String(f.field_name ?? ""),
        type: Number(f.type ?? 0),
        ui_type: String(f.ui_type ?? ""),
      });
    }
    pageToken = d?.page_token ? String(d.page_token) : "";
    if (!pageToken) break;
  }
  return out;
}

function requireField(fields: FieldMeta[], label: string): string {
  const want = normalizeFieldName(label);
  const found = fields.find((f) => normalizeFieldName(f.field_name) === want);
  if (!found?.field_name) throw new Error(`missing_field:${label}`);
  return found.field_name;
}

function optionalField(fields: FieldMeta[], label: string): string {
  const want = normalizeFieldName(label);
  return fields.find((f) => normalizeFieldName(f.field_name) === want)?.field_name ?? "";
}

function buildFilter(fieldMap: Record<string, string>, identity: ValidationLite["identity"], dateHints: string[]) {
  const identityFilter = {
    conjunction: "and",
    conditions: [
      { field_name: fieldMap.customerEmail, operator: "is", value: [identity?.username ?? ""] },
    ],
  };
  if (!dateHints.length) return identityFilter;
  return {
    conjunction: "and",
    children: [
      identityFilter,
      {
        conjunction: "or",
        conditions: dateHints.map((d) => ({
          field_name: fieldMap.conversationStartedAt,
          operator: "contains",
          value: [d],
        })),
      },
    ],
  };
}

function sortRecordsNewestFirst(records: HumanServiceRecord[]): HumanServiceRecord[] {
  return records.sort((a, b) => String(b.conversationStartedAt).localeCompare(String(a.conversationStartedAt)));
}

async function searchRecords(
  token: string,
  appToken: string,
  tableId: string,
  viewId: string,
  fieldMap: Record<string, string>,
  validation: ValidationLite,
  queryScope: QueryScopeLite
): Promise<{ records: HumanServiceRecord[]; recordsTruncated: boolean; pageCount: number }> {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;
  const records: HumanServiceRecord[] = [];
  const categoryFields = [
    fieldMap.classifications,
    fieldMap.category1,
    fieldMap.category2,
    fieldMap.category3,
    fieldMap.sceneCategory,
  ].filter(Boolean);
  const fieldNames = [
    fieldMap.customerEmail,
    fieldMap.customerName,
    fieldMap.messages,
    fieldMap.conversationId,
    fieldMap.conversationStartedAt,
    fieldMap.agentName,
    fieldMap.channel,
    ...categoryFields,
  ].filter(Boolean);
  let pageToken = "";
  let recordsTruncated = false;
  let pageCount = 0;
  const seenPageTokens = new Set<string>();
  while (true) {
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        recordsTruncated = true;
        break;
      }
      seenPageTokens.add(pageToken);
    }
    pageCount++;
    const body: Record<string, unknown> = {
      page_size: 100,
      view_id: viewId,
      field_names: fieldNames,
      filter: buildFilter(fieldMap, validation.identity, queryScope.serverDateHints ?? []),
    };
    if (fieldMap.conversationStartedAt) {
      body.sort = [
        {
          field_name: fieldMap.conversationStartedAt,
          desc: queryScope.sortDirection !== "asc",
        },
      ];
    }
    if (pageToken) body.page_token = pageToken;
    const data = await feishuJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const d = data.data as Record<string, unknown> | undefined;
    const items = (d?.items as unknown[]) ?? [];
    for (const item of items) {
      const rec = item as Record<string, unknown>;
      const fields = (rec.fields as Record<string, unknown>) ?? {};
      records.push({
        recordId: String(rec.record_id ?? ""),
        conversationId: cellToString(fields[fieldMap.conversationId]) || String(rec.record_id ?? ""),
        conversationStartedAt: cellToString(fields[fieldMap.conversationStartedAt]),
        messages: cellToString(fields[fieldMap.messages]),
        customerEmail: cellToString(fields[fieldMap.customerEmail]),
        customerName: cellToString(fields[fieldMap.customerName]),
        agentName: cellToString(fields[fieldMap.agentName]),
        channel: cellToString(fields[fieldMap.channel]),
        categories: categoriesFromFields(fields, categoryFields),
      });
    }
    pageToken = d?.page_token ? String(d.page_token) : "";
    if (!pageToken) break;
  }
  return { records: sortRecordsNewestFirst(records), recordsTruncated, pageCount };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validation = (params.validation ?? {}) as ValidationLite;
  const queryScope = (params.queryScope ?? {}) as QueryScopeLite;
  if (validation.canQuery !== true) {
    return {
      humanServiceRecords: {
        fetchStatus: "skipped_identity",
        records: [],
        recordsTruncated: false,
        identityMatched: false,
      },
    };
  }
  if (queryScope.queryStatus === "rejected_too_old") {
    return {
      humanServiceRecords: {
        fetchStatus: "rejected_too_old",
        rejectReason: queryScope.rejectReason || "older_than_six_months",
        records: [],
        recordsTruncated: false,
        identityMatched: true,
      },
    };
  }
  if (queryScope.queryStatus === "rejected_today_unavailable") {
    return {
      humanServiceRecords: {
        fetchStatus: "rejected_today_unavailable",
        rejectReason: queryScope.rejectReason || "today_records_available_tomorrow",
        records: [],
        recordsTruncated: false,
        identityMatched: true,
      },
    };
  }

  const appId = configValue(params, "feishuAppId", FEISHU_APP_ID, "FEISHU_APP_ID");
  const appSecret = configValue(params, "feishuAppSecret", FEISHU_APP_SECRET, "FEISHU_APP_SECRET");
  const wikiNodeToken = configValue(
    params,
    "feishuHumanServiceWikiNodeToken",
    FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN,
    "FEISHU_HUMAN_SERVICE_WIKI_NODE_TOKEN"
  );
  const tableId = configValue(
    params,
    "feishuHumanServiceTableId",
    FEISHU_HUMAN_SERVICE_TABLE_ID,
    "FEISHU_HUMAN_SERVICE_TABLE_ID"
  );
  const viewId = configValue(
    params,
    "feishuHumanServiceViewId",
    FEISHU_HUMAN_SERVICE_VIEW_ID,
    "FEISHU_HUMAN_SERVICE_VIEW_ID"
  );

  if (!appId || !appSecret || !wikiNodeToken || !tableId || !viewId) {
    return {
      humanServiceRecords: {
        fetchStatus: "missing_config",
        records: [],
        recordsTruncated: false,
        identityMatched: false,
      },
    };
  }

  try {
    const token = await tenantToken(appId, appSecret);
    const appToken = await wikiNodeToBitableAppToken(token, wikiNodeToken);
    if (!appToken) throw new Error("wiki_node_missing_bitable_obj_token");
    const fields = await listFields(token, appToken, tableId);
    const fieldMap = {
      customerEmail: requireField(fields, "客户邮箱"),
      customerName: requireField(fields, "客户"),
      messages: requireField(fields, "messages"),
      conversationId: optionalField(fields, "对话组ID"),
      conversationStartedAt: requireField(fields, "对话开始时间"),
      agentName: optionalField(fields, "客服"),
      channel: optionalField(fields, "渠道"),
      classifications: optionalField(fields, "classifications"),
      category1: optionalField(fields, "对话分类_1"),
      category2: optionalField(fields, "对话分类_2"),
      category3: optionalField(fields, "对话分类_3"),
      sceneCategory: optionalField(fields, "场景分类"),
    };
    const result = await searchRecords(token, appToken, tableId, viewId, fieldMap, validation, queryScope);
    return {
      humanServiceRecords: {
        fetchStatus: "ok",
        records: result.records,
        recordsTruncated: result.recordsTruncated,
        identityMatched: true,
        pageCount: result.pageCount,
        fieldMap,
      },
    };
  } catch (e) {
    return {
      humanServiceRecords: {
        fetchStatus: "fetch_failed",
        fetchError: e instanceof Error ? e.message : String(e),
        records: [],
        recordsTruncated: false,
        identityMatched: false,
      },
    };
  }
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-human-service-records")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
