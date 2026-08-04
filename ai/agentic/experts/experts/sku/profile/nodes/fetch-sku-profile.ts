/**
 * 节点：合并 winit.item.page.list 插件输出为 rawItems（尚未剪枝）
 */
const PAGE_LIST_ACTION = "winit.item.page.list";

type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

function parseCozeWorkflowDataField(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data !== "string") return data;
  try {
    const once = JSON.parse(data) as unknown;
    if (typeof once === "string") {
      try {
        return JSON.parse(once) as unknown;
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return data;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function asFiniteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coercePageList(parsed: unknown): {
  list: Record<string, unknown>[];
  totalCount: number | null;
} {
  if (parsed == null) return { list: [], totalCount: null };
  if (Array.isArray(parsed)) {
    const list = parsed.filter(
      (value): value is Record<string, unknown> =>
        value != null && typeof value === "object" && !Array.isArray(value)
    );
    return { list, totalCount: parsed.length };
  }
  if (typeof parsed !== "object") return { list: [], totalCount: null };
  const record = parsed as Record<string, unknown>;
  if (record.output != null) return coercePageList(record.output);
  if (record.code === "0" || record.code === 0) return coercePageList(record.data);
  if (Array.isArray(record.list)) {
    const list = record.list.filter(
      (value): value is Record<string, unknown> =>
        value != null && typeof value === "object" && !Array.isArray(value)
    );
    return {
      list,
      totalCount: asFiniteNumber(record.totalCount) ?? record.list.length,
    };
  }
  if (record.skuCode != null || record.code != null) return { list: [record], totalCount: 1 };
  return { list: [], totalCount: null };
}

function hasPageListShape(value: unknown): boolean {
  const parsed = parseCozeWorkflowDataField(value);
  if (Array.isArray(parsed)) return true;
  const record = asRecord(parsed);
  if (Object.keys(record).length === 0) return false;
  if (hasOwn(record, "output")) return hasPageListShape(record.output);
  if (Array.isArray(record.list)) return true;
  return record.skuCode != null || (record.code != null && !hasOwn(record, "data"));
}

function safeResponseMessage(value: unknown): string {
  return asText(value).replace(/\s+/g, " ").slice(0, 120);
}

function inspectPageListResponse(
  value: unknown,
  errorPrefix: "plugin_response" | "local_proxy"
): { list: Record<string, unknown>[]; error: string | null } {
  const parsed = parseCozeWorkflowDataField(value);
  const record = asRecord(parsed);
  const looksLikeEnvelope =
    hasOwn(record, "code") &&
    (hasOwn(record, "data") || hasOwn(record, "msg")) &&
    !hasOwn(record, "skuCode");

  if (looksLikeEnvelope) {
    const code = asText(record.code);
    if (code !== "0") {
      const message = safeResponseMessage(record.msg);
      return {
        list: [],
        error: `${errorPrefix}_error:${code || "unknown"}${message ? `:${message}` : ""}`,
      };
    }
    const successfulEmptyResult =
      typeof record.data === "string" && record.data.trim() === "";
    if (!successfulEmptyResult && !hasPageListShape(record.data)) {
      return { list: [], error: `${errorPrefix}_invalid_data` };
    }
  } else if (!hasPageListShape(parsed)) {
    return { list: [], error: `${errorPrefix}_invalid_data` };
  }

  return { list: coercePageList(parsed).list, error: null };
}

async function runCozeWinitWorkflow(
  env: CozeWinitLocalEnv,
  action: string,
  data: Record<string, unknown>
): Promise<unknown> {
  const baseUrl = (process.env.COZE_API_BASE_URL ?? "https://api.coze.cn").replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/v1/workflow/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: env.workflowId,
      parameters: {
        action,
        customerCode: env.customerCode,
        customerName: env.customerName,
        username: env.username,
        language: env.language || "zh_CN",
        data: JSON.stringify(data),
      },
    }),
  });
  const text = await res.text();
  const body = JSON.parse(text) as Record<string, unknown>;
  if (!res.ok || (body.code !== 0 && body.code !== "0")) {
    throw new Error(`Coze workflow failed: ${String(body.msg ?? text).slice(0, 300)}`);
  }
  return parseCozeWorkflowDataField(body.data);
}

function getCozeWinitEnv(): CozeWinitLocalEnv | null {
  if (typeof process === "undefined" || !process.env) return null;
  const apiToken = process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "";
  const workflowId =
    process.env.COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID ?? process.env.COZE_WINIT_WORKFLOW_ID ?? "";
  const customerCode = process.env.COZE_WINIT_CUSTOMER_CODE ?? "";
  const customerName = process.env.COZE_WINIT_CUSTOMER_NAME ?? "";
  const username = process.env.COZE_WINIT_USERNAME ?? "";
  if (!apiToken || !workflowId || !customerCode || !customerName || !username) return null;
  return {
    apiToken,
    workflowId,
    customerCode,
    customerName,
    username,
    language: process.env.COZE_WINIT_LANGUAGE ?? "zh_CN",
  };
}

function indexBySku(list: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of list) {
    const code = String(row.skuCode ?? "").trim().toUpperCase();
    if (code && !map.has(code)) map.set(code, row);
  }
  return map;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const requested = ((params.normalizedSkuCodes as string[]) ?? []).filter((c) => c?.trim());
  const fetchProfile =
    typeof params.fetchProfile === "string" && params.fetchProfile.trim()
      ? params.fetchProfile.trim()
      : "facts_core";

  if (params.skipApi === true) {
    return {
      rawItems: [],
      fetchMeta: {
        requested: requested.length,
        found: 0,
        source: "skipped",
        strategy: "skip",
        fetchProfile,
        pruned: false,
      },
    };
  }

  type ActionPlan = { inputToken: string; skuCode: string };
  const actionPlans = (Array.isArray(params.actionPlans) ? params.actionPlans : []) as ActionPlan[];
  const outputList = (Array.isArray(params.winitPluginOutputList)
    ? params.winitPluginOutputList
    : []) as Array<{ code?: unknown; data?: unknown; msg?: unknown; error?: unknown }>;

  let allRows: Record<string, unknown>[] = [];
  let strategy = "none";
  const fetchErrors: string[] = [];

  if (outputList.length > 0) {
    strategy = "plugin-batch";
    for (let i = 0; i < outputList.length; i++) {
      const item = outputList[i] ?? {};
      const outer = asRecord(item);
      const hasOuterFailure =
        (hasOwn(outer, "code") && asText(outer.code) !== "0") || asText(outer.error) !== "";
      const directBatchEmpty =
        !hasOuterFailure && typeof item.data === "string" && item.data.trim() === "";
      const inspected = directBatchEmpty
        ? { list: [] as Record<string, unknown>[], error: null as string | null }
        : inspectPageListResponse(hasOuterFailure ? item : item.data, "plugin_response");
      const { list, error } = inspected;
      if (error) fetchErrors.push(error);
      allRows.push(...list);
    }
    if (fetchErrors.length > 0) strategy = "plugin-batch-error";
  } else {
    const actions = (Array.isArray(params.actions) ? params.actions : []) as Array<{
      action: string;
      data: string;
    }>;
    const env = getCozeWinitEnv();
    if (!env) {
      return {
        rawItems: [],
        fetchMeta: {
          requested: requested.length,
          found: 0,
          source: "none",
          strategy: "no-plugin-no-env",
          fetchProfile,
          pruned: false,
          error: "winit_env_unavailable",
        },
      };
    }
    strategy = "local-proxy";
    for (const a of actions) {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(a.data || "{}") as Record<string, unknown>;
      } catch {
        data = {};
      }
      try {
        const parsed = await runCozeWinitWorkflow(env, a.action || PAGE_LIST_ACTION, data);
        const { list, error } = inspectPageListResponse(parsed, "local_proxy");
        if (error) fetchErrors.push(error);
        allRows.push(...list);
      } catch {
        fetchErrors.push("local_proxy_error");
      }
    }
    if (fetchErrors.length > 0) strategy = "local-proxy-error";
  }

  const bySku = indexBySku(allRows);
  const plans = actionPlans.length > 0 ? actionPlans : requested.map((skuCode) => ({ skuCode, inputToken: skuCode }));
  const rawItems: Record<string, unknown>[] = [];

  for (const plan of plans) {
    const req = String(plan.skuCode ?? plan.inputToken ?? "").trim();
    if (!req) continue;
    const hit = bySku.get(req.toUpperCase());
    if (hit) {
      rawItems.push({ ...hit, _requestedSkuCode: req });
    }
  }

  // supplement / no plans: return all rows with requested tag
  if (plans.length === 0 && allRows.length > 0) {
    for (const row of allRows) {
      rawItems.push({ ...row, _requestedSkuCode: String(row.skuCode ?? "") });
    }
  }

  const fetchMeta: Record<string, unknown> = {
    requested: requested.length,
    found: rawItems.length,
    source: PAGE_LIST_ACTION,
    strategy,
    fetchProfile,
    pruned: false,
  };
  if (fetchErrors.length > 0) {
    fetchMeta.error = [...new Set(fetchErrors)].join(";");
  }

  return {
    rawItems,
    fetchMeta,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-sku-profile")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "fetch-sku-profile failed");
      process.exit(1);
    });
}
