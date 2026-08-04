/**
 * 节点：按算式中的 SKU_QTY / SKU_QTY(wh=,sku=) 拉取万邑通 **queryProductInventoryList4Page**（[文档 id/58](https://developer.winit.com.cn/document/detail/id/58.html)）可用库存 **qtyAvailable**，经 Coze workflow/run 代理。
 * 单文件闭环，无外部 import。置于 `evaluate-expression` **之前**；产出 `skuResolutions` 供求值节点替换占位符。
 * **`action`**（OpenAPI 方法名）为本节点与 Coze 插件侧**内置默认**（见 `nodes/winit-openapi-plugin.ts`），**不作为**专家调用边界顶层字段。
 * Coze：前置 **`build-winit-inventory-data`** 拼装插件请求体；openapi 插件将**响应**绑定到 `skuUsableQty`。请求体 **`data`** 不由开始节点传入。
 *
 * 【输入】`main({ params })` → `params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | expression | string | 用于检测占位符；来自 `inputs.expression` |
 * | skuUsableQty | number \| string（可选） | 插件预取时传入 |
 * | warehouseCodes / merchandiseCode | string（可选） | 无括号 SKU_QTY 时使用 |
 * | inventoryType / isActive / pageNo / pageSize | 可选 | 见 id/58；默认 Warehouse / Y / 1 / 100 |
 * | winitRequestData | string（可选） | 前置 `build-winit-inventory-data` 产出；**首轮**（swap=false）`workflow/run` 优先用此字符串作 `parameters.data`，否则本地拼装 |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | skuResolutions | { warehouse, sku, usableQty }[] | usableQty 对应接口 **qtyAvailable** |
 * | inventoryFetchOk | boolean | false 时求值节点应短路失败 |
 * | inventoryFetchError | null \| { code: string; message: string } | 失败原因 |
 * | inventoryBranch | string | `inventory_skip` / `inventory_ready` / `inventory_failed`（勿与求值节点 `branch` 混用） |
 */

const SKU_QTY_BARE = "SKU_QTY";
/** 万邑通 OpenAPI 接口名（id/58）；与旧 pageInv 不同，部分 Coze 代理需 `winit.inventory.type.*` 形态，可用环境变量覆盖 */
const QUERY_PRODUCT_INVENTORY_ACTION = "queryProductInventoryList4Page";

function resolveInventoryOpenapiAction(): string {
  if (typeof process !== "undefined" && process.env?.COZE_WINIT_INVENTORY_ACTION?.trim()) {
    return process.env.COZE_WINIT_INVENTORY_ACTION.trim();
  }
  return QUERY_PRODUCT_INVENTORY_ACTION;
}
const SKU_QTY_CALL_RE = /SKU_QTY\s*\(\s*wh\s*=\s*([^,)]+)\s*,\s*sku\s*=\s*([^)]+?)\s*\)/gi;

type OpenapiProxyWorkflowParameters = {
  action: string;
  customerCode: string;
  customerName: string;
  username: string;
  data: string;
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

async function runCozeOpenapiProxyWorkflow(options: {
  apiToken: string;
  workflowId: string;
  baseUrl?: string;
  parameters: OpenapiProxyWorkflowParameters;
}): Promise<unknown> {
  const baseFromEnv = typeof process !== "undefined" ? process.env?.COZE_API_BASE_URL : undefined;
  const baseUrl = (options.baseUrl ?? baseFromEnv ?? "https://api.coze.cn").replace(/\/$/, "");
  const url = `${baseUrl}/v1/workflow/run`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: String(options.workflowId),
      parameters: options.parameters,
    }),
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Coze workflow/run 响应非 JSON（HTTP ${res.status}）: ${text.slice(0, 500)}`);
  }

  const obj = body as Record<string, unknown>;

  if (!res.ok) {
    const msg = String(obj.msg ?? obj.message ?? text);
    throw new Error(`Coze workflow/run HTTP ${res.status}: ${msg.slice(0, 500)}`);
  }

  const code = obj.code;
  if (code !== 0 && code !== "0") {
    const msg = String(obj.msg ?? obj.message ?? "unknown");
    const debug = obj.debug_url != null ? ` debug_url=${String(obj.debug_url)}` : "";
    throw new Error(`Coze workflow 失败 code=${String(code)} msg=${msg}${debug}`);
  }

  return parseCozeWorkflowDataField(obj.data);
}

function getCozeOpenapiProxyEnv(): {
  apiToken: string;
  workflowId: string;
  customerCode: string;
  customerName: string;
  username: string;
  baseUrl?: string;
} | null {
  if (typeof process === "undefined" || !process.env) return null;
  const apiToken = process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "";
  const workflowId = process.env.COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID ?? "";
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
    baseUrl: process.env.COZE_API_BASE_URL,
  };
}

/** id/58 请求体 data；含空格的商品串走 name，否则走 productCode；swap 时对调二者尝试 */
function buildQueryProductInventoryData(args: {
  warehouseCode: string;
  sku: string;
  inventoryType: string;
  isActive: string;
  pageNum: number;
  pageSize: number;
  swapNameAndProductCode: boolean;
}): Record<string, unknown> {
  const t = args.sku.trim();
  let productCode = "";
  let name = "";
  const spaced = /\s/.test(t);
  if (!args.swapNameAndProductCode) {
    if (spaced) name = t;
    else productCode = t;
  } else {
    if (spaced) productCode = t;
    else name = t;
  }
  return {
    inventoryType: args.inventoryType.trim() || "Warehouse",
    warehouseCode: args.warehouseCode.trim(),
    isActive: args.isActive.trim() || "Y",
    productCode,
    name,
    DOITier: "",
    categoryID: "",
    specification: "",
    pageNum: String(args.pageNum),
    pageSize: String(args.pageSize),
  };
}

function coerceFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function trimSkuArg(raw: string): string {
  let t = raw.trim();
  if (t.length >= 2) {
    const q = t[0];
    if ((q === '"' || q === "'") && t[t.length - 1] === q) {
      t = t.slice(1, -1).trim();
    }
  }
  return t;
}

type SkuCallMatch = { full: string; wh: string; sku: string; index: number };

function findSkuQtyCalls(expression: string): SkuCallMatch[] {
  const re = new RegExp(SKU_QTY_CALL_RE.source, "gi");
  const out: SkuCallMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(expression)) !== null) {
    out.push({
      full: m[0],
      wh: trimSkuArg(m[1]),
      sku: trimSkuArg(m[2]),
      index: m.index,
    });
  }
  return out;
}

function remainderAfterCalls(expression: string, calls: SkuCallMatch[]): string {
  let s = expression;
  const sorted = [...calls].sort((a, b) => b.index - a.index);
  for (const c of sorted) {
    s = s.slice(0, c.index) + s.slice(c.index + c.full.length);
  }
  return s;
}

function unwrapDataField(o: Record<string, unknown>): Record<string, unknown> {
  let d: unknown = o.data;
  if (typeof d === "string") {
    try {
      d = JSON.parse(d) as unknown;
    } catch {
      return o;
    }
  }
  if (d && typeof d === "object") return d as Record<string, unknown>;
  return o;
}

/** 解析万邑通 OpenAPI 风格或仅 data 片段；返回 list 与业务 code */
function parseWinitInventoryListPayload(parsed: unknown): {
  ok: boolean;
  list: unknown[];
  msg: string;
} {
  let cur: unknown = parsed;
  if (typeof cur === "string") {
    try {
      cur = JSON.parse(cur) as unknown;
    } catch {
      return { ok: false, list: [], msg: "响应非 JSON" };
    }
  }
  if (cur == null || typeof cur !== "object") {
    return { ok: false, list: [], msg: "空响应" };
  }

  const root = cur as Record<string, unknown>;
  const c = root.code;
  /** 万邑通部分响应在成功时 code 为空串，仅带 msg「操作成功」；空串不得按失败处理 */
  const bizFailed =
    c !== undefined && c !== null && c !== "" && c !== 0 && c !== "0";
  if (bizFailed) {
    let msg = String(root.msg ?? "接口业务失败");
    const innerData = root.data;
    if (typeof innerData === "string" && innerData.includes("No handler found")) {
      msg = `${msg}（代理未注册该 action 对应路由：${innerData.slice(0, 200)}）`;
    }
    return { ok: false, list: [], msg };
  }

  const inner = unwrapDataField(root);
  const list = inner.list;
  if (!Array.isArray(list)) {
    return { ok: true, list: [], msg: "" };
  }
  return { ok: true, list, msg: "" };
}

function findMatchingInventoryRow(
  list: unknown[],
  warehouseCode: string,
  sku: string
): Record<string, unknown> | null {
  const whU = warehouseCode.trim().toUpperCase();
  const skuT = sku.trim();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const wc = String(r.warehouseCode ?? "").trim().toUpperCase();
    if (wc !== whU) continue;
    const pc = String(r.productCode ?? "").trim();
    const nm = String(r.name ?? "").trim();
    const en = String(r.eName ?? "").trim();
    if (pc === skuT || nm === skuT || en === skuT) {
      return r;
    }
  }
  return null;
}

function pairKey(wh: string, sku: string): string {
  return `${wh}\0${sku}`;
}

async function fetchUsableQtyForWhSku(
  env: NonNullable<ReturnType<typeof getCozeOpenapiProxyEnv>>,
  params: Record<string, unknown>,
  warehouseCode: string,
  sku: string
): Promise<
  | { ok: true; qty: number }
  | { ok: false; errorCode: string; message: string }
> {
  const pageNum = coerceFiniteNumber(params.pageNo) ?? 1;
  const pageSize = coerceFiniteNumber(params.pageSize) ?? 100;
  const inventoryType =
    typeof params.inventoryType === "string" && params.inventoryType.trim()
      ? params.inventoryType.trim()
      : "Warehouse";
  const isActive =
    typeof params.isActive === "string" && params.isActive.trim() ? params.isActive.trim() : "Y";

  if (!warehouseCode.trim() || !sku.trim()) {
    return {
      ok: false,
      errorCode: "inventory_missing_params",
      message: "拉取 queryProductInventoryList4Page 需 warehouseCode 与商品（sku/merchandiseCode）。",
    };
  }

  const attempts: boolean[] = [false, true];

  for (const swap of attempts) {
    const winitRequestDataRaw = params.winitRequestData;
    const prebuilt =
      !swap &&
      typeof winitRequestDataRaw === "string" &&
      winitRequestDataRaw.trim() !== "";
    const dataStr = prebuilt
      ? winitRequestDataRaw.trim()
      : JSON.stringify(
          buildQueryProductInventoryData({
            warehouseCode,
            sku,
            inventoryType,
            isActive,
            pageNum,
            pageSize,
            swapNameAndProductCode: swap,
          })
        );

    let raw: unknown;
    try {
      raw = await runCozeOpenapiProxyWorkflow({
        apiToken: env.apiToken,
        workflowId: env.workflowId,
        baseUrl: env.baseUrl,
        parameters: {
          action: resolveInventoryOpenapiAction(),
          customerCode: env.customerCode,
          customerName: env.customerName,
          username: env.username,
          data: dataStr,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, errorCode: "inventory_remote", message: msg.slice(0, 500) };
    }

    const parsed = parseWinitInventoryListPayload(raw);
    if (!parsed.ok) {
      return { ok: false, errorCode: "inventory_remote", message: parsed.msg.slice(0, 500) };
    }

    const row = findMatchingInventoryRow(parsed.list, warehouseCode, sku);
    if (row) {
      const qty = coerceFiniteNumber(row.qtyAvailable);
      if (qty == null) {
        return {
          ok: false,
          errorCode: "inventory_empty",
          message: "库存接口已匹配行但未解析到 qtyAvailable。",
        };
      }
      return { ok: true, qty };
    }
  }

  return {
    ok: false,
    errorCode: "inventory_empty",
    message:
      "queryProductInventoryList4Page 未在 list 中匹配到指定仓库与商品（请核对 warehouseCode、productCode/商品名称与 id/58 入参）。",
  };
}

function expressionNeedsInventoryFetch(expr: string): boolean {
  return expr.includes(SKU_QTY_BARE);
}

async function main({ params }: { params: Record<string, unknown> }) {
  const expression = typeof params.expression === "string" ? params.expression : "";

  const okSkip = {
    skuResolutions: [] as { warehouse: string; sku: string; usableQty: number }[],
    inventoryFetchOk: true,
    inventoryFetchError: null as { code: string; message: string } | null,
    inventoryBranch: "inventory_skip" as const,
  };

  if (!expressionNeedsInventoryFetch(expression)) {
    return okSkip;
  }

  const calls = findSkuQtyCalls(expression);
  const remainder = remainderAfterCalls(expression, calls);

  if (calls.length > 0 && remainder.includes(SKU_QTY_BARE)) {
    return {
      skuResolutions: [],
      inventoryFetchOk: false,
      inventoryFetchError: {
        code: "inventory_ambiguous",
        message: "请勿在同一算式中混用 SKU_QTY(wh=,sku=) 与无括号的 SKU_QTY。",
      },
      inventoryBranch: "inventory_failed" as const,
    };
  }

  if (/SKU_QTY\s*\(/i.test(remainder)) {
    return {
      skuResolutions: [],
      inventoryFetchOk: false,
      inventoryFetchError: {
        code: "inventory_placeholder_malformed",
        message:
          "存在无法解析的 SKU_QTY(…)；请使用 SKU_QTY(wh=仓库编码, sku=商品编码)，注意逗号与括号配对。",
      },
      inventoryBranch: "inventory_failed" as const,
    };
  }

  const directOverride = coerceFiniteNumber(params.skuUsableQty);
  const uniquePairs = new Map<string, { wh: string; sku: string }>();
  for (const c of calls) {
    if (!c.wh || !c.sku) {
      return {
        skuResolutions: [],
        inventoryFetchOk: false,
        inventoryFetchError: {
          code: "inventory_missing_params",
          message: "SKU_QTY(wh=, sku=) 中 wh 与 sku 均不能为空。",
        },
        inventoryBranch: "inventory_failed" as const,
      };
    }
    uniquePairs.set(pairKey(c.wh, c.sku), { wh: c.wh, sku: c.sku });
  }

  if (calls.length > 0 && directOverride != null && uniquePairs.size > 1) {
    return {
      skuResolutions: [],
      inventoryFetchOk: false,
      inventoryFetchError: {
        code: "inventory_ambiguous",
        message:
          "算式含多个不同 SKU_QTY(wh=,sku=) 时不能使用单一 skuUsableQty；请分别拉取或拆分工作流。",
      },
      inventoryBranch: "inventory_failed" as const,
    };
  }

  const skuResolutions: { warehouse: string; sku: string; usableQty: number }[] = [];

  if (calls.length > 0) {
    if (directOverride != null) {
      for (const { wh, sku } of uniquePairs.values()) {
        skuResolutions.push({ warehouse: wh, sku, usableQty: directOverride });
      }
    } else {
      const env = getCozeOpenapiProxyEnv();
      if (!env) {
        return {
          skuResolutions: [],
          inventoryFetchOk: false,
          inventoryFetchError: {
            code: "inventory_unconfigured",
            message:
              "算式含 SKU_QTY(wh=,sku=) 但未提供 skuUsableQty，且未配置 COZE_API_TOKEN + COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID + COZE_WINIT_CUSTOMER_CODE + COZE_WINIT_CUSTOMER_NAME + COZE_WINIT_USERNAME。",
          },
          inventoryBranch: "inventory_failed" as const,
        };
      }
      const seen = new Set<string>();
      for (const { wh, sku } of uniquePairs.values()) {
        const k = pairKey(wh, sku);
        if (seen.has(k)) continue;
        seen.add(k);
        const r = await fetchUsableQtyForWhSku(env, params, wh, sku);
        if (!r.ok) {
          return {
            skuResolutions: [],
            inventoryFetchOk: false,
            inventoryFetchError: { code: r.errorCode, message: r.message },
            inventoryBranch: "inventory_failed" as const,
          };
        }
        skuResolutions.push({ warehouse: wh, sku, usableQty: r.qty });
      }
    }
  }

  if (remainder.includes(SKU_QTY_BARE)) {
    if (directOverride != null && calls.length === 0) {
      const wc = typeof params.warehouseCodes === "string" ? params.warehouseCodes : "";
      const mc = typeof params.merchandiseCode === "string" ? params.merchandiseCode : "";
      return {
        skuResolutions: [{ warehouse: wc, sku: mc, usableQty: directOverride }],
        inventoryFetchOk: true,
        inventoryFetchError: null,
        inventoryBranch: "inventory_ready" as const,
      };
    }
    const env = getCozeOpenapiProxyEnv();
    if (!env) {
      return {
        skuResolutions: [],
        inventoryFetchOk: false,
        inventoryFetchError: {
          code: "inventory_unconfigured",
          message:
            "算式含无括号 SKU_QTY 但未配置代理环境变量，或未传 skuUsableQty（可由前置插件写入）。",
        },
        inventoryBranch: "inventory_failed" as const,
      };
    }
    const warehouseCodes = typeof params.warehouseCodes === "string" ? params.warehouseCodes : "";
    const merchandiseCode = typeof params.merchandiseCode === "string" ? params.merchandiseCode : "";
    const r = await fetchUsableQtyForWhSku(env, params, warehouseCodes, merchandiseCode);
    if (!r.ok) {
      return {
        skuResolutions: [],
        inventoryFetchOk: false,
        inventoryFetchError: { code: r.errorCode, message: r.message },
        inventoryBranch: "inventory_failed" as const,
      };
    }
    skuResolutions.push({
      warehouse: warehouseCodes.trim(),
      sku: merchandiseCode.trim(),
      usableQty: r.qty,
    });
  }

  return {
    skuResolutions,
    inventoryFetchOk: true,
    inventoryFetchError: null,
    inventoryBranch: "inventory_ready" as const,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("fetch-sku-inventory")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
