/**
 * 节点：fetch-mks-quota — InboundSkuLimitAggChart 额度查询（Coze 代理），失败时 KB 降级
 * FaaS 单文件闭环，无外部 import。
 *
 * action: winit.huaweiDas.invoke
 * data: OPC/Detail/InboundSkuLimitAggChart（与卖家中心 ajaxProcess form 同构）
 */

const QUOTA_ACTION = "winit.huaweiDas.invoke";
const LIMIT_URI = "OPC/Detail/InboundSkuLimitAggChart";

type CozeWinitLocalEnv = {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  language: string;
};

type LimitRow = {
  limitValue?: unknown;
  limitValueRemain?: unknown;
  actValueInv?: unknown;
  actValueOnway?: unknown;
  limitItemName?: unknown;
  warehouseCode?: unknown;
  limitTypeName?: unknown;
  limitSkuAttr?: unknown;
  skuSizeClass?: unknown;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

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

function buildHuaweiDasPayload(warehouseCode: string): Record<string, unknown> {
  return {
    body: {
      countryCode: "",
      warehouseCode: warehouseCode || "",
      skuSizeClass: "",
      limitSkuAttr: "",
    },
    headers: { "x-stage": "RELEASE" },
    httpMethod: "POST",
    uri: LIMIT_URI,
  };
}

function extractLimitRows(parsed: unknown, depth = 0): LimitRow[] {
  if (parsed == null || depth > 8) return [];
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return [];
    try {
      return extractLimitRows(JSON.parse(trimmed) as unknown, depth + 1);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed as LimitRow[];
  if (typeof parsed !== "object") return [];

  const o = parsed as Record<string, unknown>;

  if (o.code != null && o.code !== "0" && o.code !== 0) {
    const msg = str(o.msg ?? o.info ?? o.message);
    if (msg) throw new Error(msg.slice(0, 120));
  }

  if (o.code === "0" || o.code === 0) return extractLimitRows(o.data, depth + 1);
  if (o.output != null) return extractLimitRows(o.output, depth + 1);
  if (o.status === 1 || o.status === "1") return extractLimitRows(o.data, depth + 1);

  const data = o.data;
  if (Array.isArray(data)) return data as LimitRow[];
  if (data != null && typeof data === "object") {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner as LimitRow[];
    return extractLimitRows(data, depth + 1);
  }

  return [];
}

function warehouseToken(code: string): string {
  return code.toUpperCase().replace(/\s+/g, "");
}

function matchesWarehouse(rowWarehouse: string, inputCode: string): boolean {
  const row = str(rowWarehouse);
  if (!row || row.includes(",")) return false;
  const token = warehouseToken(inputCode);
  if (!token) return false;
  const rowToken = warehouseToken(row.split(/\s+/)[0] ?? row);
  if (rowToken === token) return true;
  return warehouseToken(row).startsWith(token);
}

function isCbmItem(limitItemName: string): boolean {
  return limitItemName.includes("CBM");
}

function isSkuCountItem(limitItemName: string): boolean {
  return limitItemName === "SKU数量";
}

function isOrderLimit(limitTypeName: string): boolean {
  return limitTypeName === "限制下单";
}

function isAppointmentLimit(limitTypeName: string): boolean {
  return limitTypeName === "限制预约";
}

function rowUsed(row: LimitRow): number {
  const inv = num(row.actValueInv);
  const onway = num(row.actValueOnway);
  if (inv > 0 || onway > 0) return inv + onway;
  const total = num(row.limitValue);
  const remain = num(row.limitValueRemain);
  return Math.max(0, total - remain);
}

function buildFallbackSnapshot(warehouseCode: string, reason: string) {
  return {
    totalCbm: null,
    usedCbm: null,
    remainingCbm: null,
    totalSkuSlots: null,
    usedSkuSlots: null,
    remainingSkuSlots: null,
    apiAvailable: false,
    warehouseCode,
    message: reason,
  };
}

function aggregateWarehouseLimits(rows: LimitRow[], warehouseCode: string) {
  const matched = rows.filter((row) => {
    const wh = str(row.warehouseCode);
    const attr = str(row.limitSkuAttr);
    const type = str(row.limitTypeName);
    if (!matchesWarehouse(wh, warehouseCode)) return false;
    if (attr && attr !== "普货") return false;
    return isOrderLimit(type) || isAppointmentLimit(type);
  });

  const orderRows = matched.filter((row) => isOrderLimit(str(row.limitTypeName)));
  const sourceRows = orderRows.length > 0 ? orderRows : matched;

  let totalCbm = 0;
  let remainingCbm = 0;
  let usedCbm = 0;
  let totalSkuSlots = 0;
  let remainingSkuSlots = 0;
  let usedSkuSlots = 0;
  let cbmBuckets = 0;
  let skuBuckets = 0;

  for (const row of sourceRows) {
    const item = str(row.limitItemName);
    const total = num(row.limitValue);
    const remain = num(row.limitValueRemain);
    const used = rowUsed(row);

    if (isCbmItem(item)) {
      totalCbm += total;
      remainingCbm += remain;
      usedCbm += used;
      cbmBuckets += 1;
    } else if (isSkuCountItem(item)) {
      totalSkuSlots += total;
      remainingSkuSlots += remain;
      usedSkuSlots += used;
      skuBuckets += 1;
    }
  }

  return {
    totalCbm: cbmBuckets > 0 ? totalCbm : null,
    usedCbm: cbmBuckets > 0 ? usedCbm : null,
    remainingCbm: cbmBuckets > 0 ? remainingCbm : null,
    totalSkuSlots: skuBuckets > 0 ? totalSkuSlots : null,
    usedSkuSlots: skuBuckets > 0 ? usedSkuSlots : null,
    remainingSkuSlots: skuBuckets > 0 ? remainingSkuSlots : null,
    bucketCount: { cbm: cbmBuckets, sku: skuBuckets, matched: sourceRows.length },
  };
}

async function fetchInboundSkuLimitAggChart(
  env: CozeWinitLocalEnv,
  warehouseCode: string
): Promise<LimitRow[]> {
  const payloads = [buildHuaweiDasPayload(warehouseCode), buildHuaweiDasPayload("")];

  for (const payload of payloads) {
    const parsed = await runCozeWinitWorkflow(env, QUOTA_ACTION, payload);
    const rows = extractLimitRows(parsed);
    if (rows.length > 0) return rows;
  }

  throw new Error("额度接口返回空列表");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const validationOk = params.validationOk === true;
  const warehouseCode = String(params.warehouseCode ?? "").trim().toUpperCase();

  if (!validationOk || !warehouseCode) {
    return {
      quotaSnapshot: buildFallbackSnapshot(warehouseCode, "validation failed"),
      quotaFetchOk: false,
    };
  }

  const env = getCozeWinitEnv();
  if (!env) {
    return {
      quotaSnapshot: buildFallbackSnapshot(warehouseCode, "额度数据暂时无法实时获取（缺少 Coze 环境配置）"),
      quotaFetchOk: false,
    };
  }

  try {
    const rows = await fetchInboundSkuLimitAggChart(env, warehouseCode);
    const agg = aggregateWarehouseLimits(rows, warehouseCode);

    if (agg.bucketCount.matched === 0) {
      return {
        quotaSnapshot: buildFallbackSnapshot(
          warehouseCode,
          `额度数据暂时无法实时获取（未找到 ${warehouseCode} 对应额度项）`
        ),
        quotaFetchOk: false,
      };
    }

    return {
      quotaSnapshot: {
        totalCbm: agg.totalCbm,
        usedCbm: agg.usedCbm,
        remainingCbm: agg.remainingCbm,
        totalSkuSlots: agg.totalSkuSlots,
        usedSkuSlots: agg.usedSkuSlots,
        remainingSkuSlots: agg.remainingSkuSlots,
        apiAvailable: true,
        warehouseCode,
        message: "",
        dataSource: "winit.huaweiDas.invoke/InboundSkuLimitAggChart",
        limitBucketCount: agg.bucketCount,
      },
      quotaFetchOk: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      quotaSnapshot: buildFallbackSnapshot(warehouseCode, `额度数据暂时无法实时获取（${msg.slice(0, 120)}）`),
      quotaFetchOk: false,
    };
  }
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-mks-quota")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
