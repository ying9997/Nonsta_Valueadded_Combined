/**
 * 节点：为万邑通 **queryProductInventoryList4Page**（id/58）拼装 OpenAPI 请求体 JSON 字符串，供前置 Coze 插件 **`data`** 入参使用。
 * 单文件闭环，无外部 import。置于 **`fetch-sku-inventory` 与 openapi 插件上游**；**不作为**专家调用边界字段。
 *
 * 【输入】`main({ params })` → `params`（与 `fetch-sku-inventory` 对齐，来自 `inputs.*` 扁平）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | expression | string | 检测 SKU_QTY / SKU_QTY(wh=,sku=) |
 * | merchandiseCode / warehouseCodes | string（可选） | 无括号 SKU_QTY 时使用 |
 * | inventoryType / isActive / pageNo / pageSize | 可选 | id/58；默认 Warehouse / Y / 1 / 100 |
 *
 * 【输出】：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | winitRequestData | string | `JSON.stringify` 后的 id/58 请求体；无需拉库存时为 `""` |
 */

const SKU_QTY_BARE = "SKU_QTY";
const SKU_QTY_CALL_RE = /SKU_QTY\s*\(\s*wh\s*=\s*([^,)]+)\s*,\s*sku\s*=\s*([^)]+?)\s*\)/gi;

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

function expressionNeedsInventoryFetch(expr: string): boolean {
  return expr.includes(SKU_QTY_BARE);
}

async function main({ params }: { params: Record<string, unknown> }) {
  const expression = typeof params.expression === "string" ? params.expression : "";

  if (!expressionNeedsInventoryFetch(expression)) {
    return { winitRequestData: "" };
  }

  const calls = findSkuQtyCalls(expression);
  const remainder = remainderAfterCalls(expression, calls);

  if (calls.length > 0 && remainder.includes(SKU_QTY_BARE)) {
    return { winitRequestData: "" };
  }

  if (/SKU_QTY\s*\(/i.test(remainder)) {
    return { winitRequestData: "" };
  }

  const pageNum = coerceFiniteNumber(params.pageNo) ?? 1;
  const pageSize = coerceFiniteNumber(params.pageSize) ?? 100;
  const inventoryType =
    typeof params.inventoryType === "string" && params.inventoryType.trim()
      ? params.inventoryType.trim()
      : "Warehouse";
  const isActive =
    typeof params.isActive === "string" && params.isActive.trim() ? params.isActive.trim() : "Y";

  if (calls.length > 0) {
    const first = calls[0];
    if (!first.wh || !first.sku) {
      return { winitRequestData: "" };
    }
    const dataObj = buildQueryProductInventoryData({
      warehouseCode: first.wh,
      sku: first.sku,
      inventoryType,
      isActive,
      pageNum,
      pageSize,
      swapNameAndProductCode: false,
    });
    return { winitRequestData: JSON.stringify(dataObj) };
  }

  if (remainder.includes(SKU_QTY_BARE)) {
    const warehouseCodes = typeof params.warehouseCodes === "string" ? params.warehouseCodes : "";
    const merchandiseCode = typeof params.merchandiseCode === "string" ? params.merchandiseCode : "";
    if (!warehouseCodes.trim() || !merchandiseCode.trim()) {
      return { winitRequestData: "" };
    }
    const dataObj = buildQueryProductInventoryData({
      warehouseCode: warehouseCodes,
      sku: merchandiseCode,
      inventoryType,
      isActive,
      pageNum,
      pageSize,
      swapNameAndProductCode: false,
    });
    return { winitRequestData: JSON.stringify(dataObj) };
  }

  return { winitRequestData: "" };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-winit-inventory-data")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
