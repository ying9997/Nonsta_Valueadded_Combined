/**
 * 四则运算求值（模板示例节点）
 * 单文件闭环，无外部 import —— 可直接复制到 Coze 代码节点。
 * 与 `workflow.json` 中本节点 `inputs` / `outputs` 一致。
 *
 * **库存占位符替换**依赖前置节点 **`fetch-sku-inventory`** 的 `skuResolutions` / `inventoryFetchOk`（本地 Runner 顺序在 `workflow.json` 中已固定）。
 * 不在本节点内调用 OpenAPI 或 `workflow/run`。Coze：将插件输出绑定到 **`fetch-sku-inventory`** 的节点入参（非开始节点对外字段）。
 *
 * 【输入】`main({ params })` → `params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | query | string | 上游 Agent 委托任务说明 |
 * | customerIntent | string | 客户问题/诉求摘要 |
 * | expression | string | 待求值算式；可含 SKU_QTY(wh=,sku=) 或 bare SKU_QTY |
 * | inputContext | object（可选） | 链式上下文 |
 * | skuResolutions | array（可选） | 前置 `fetch-sku-inventory` 产出 |
 * | inventoryFetchOk | boolean（可选） | 为 false 且算式含库存占位符时失败 |
 * | inventoryFetchError | object（可选） | `{ code, message }` |
 * | merchandiseCode | string（可选） | 无括号 SKU_QTY 时与 skuResolutions 中 sku 匹配（专家入参，见 manifest） |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | result | { structured: object; analysis: string } | structured 可含 skuResolutions、skuUsableQtyUsed |
 * | outputContext | { expertId, resultSummary, chainId? } | expertId=`arithmetic-formula` |
 * | branch | string | `with_review` / `skip_review` |
 */

const EXPERT_ID = "arithmetic-formula";
const SKU_QTY_BARE = "SKU_QTY";
const SKU_QTY_CALL_RE = /SKU_QTY\s*\(\s*wh\s*=\s*([^,)]+)\s*,\s*sku\s*=\s*([^)]+?)\s*\)/gi;

const SAFE_EXPR = /^[\d\s+\-*/().]+$/;

type SkuResolution = { warehouse: string; sku: string; usableQty: number };

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

function pairKey(wh: string, sku: string): string {
  return `${wh}\0${sku}`;
}

function normalizeSkuResolutions(raw: unknown): SkuResolution[] {
  if (!Array.isArray(raw)) return [];
  const out: SkuResolution[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const warehouse = typeof o.warehouse === "string" ? o.warehouse : "";
    const sku = typeof o.sku === "string" ? o.sku : "";
    const q = o.usableQty;
    const usableQty =
      typeof q === "number" && Number.isFinite(q)
        ? q
        : typeof q === "string" && q.trim() !== ""
          ? Number(q.trim())
          : NaN;
    if (!Number.isFinite(usableQty)) continue;
    out.push({ warehouse, sku, usableQty });
  }
  return out;
}

type InvErr = {
  ok: false;
  errorCode: string;
  message: string;
};

type SubstituteOk = {
  ok: true;
  expression: string;
  skuResolutions: SkuResolution[];
  bareOverrideQty?: number;
};

function resolutionMapFromList(list: SkuResolution[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of list) {
    m.set(pairKey(r.warehouse.trim(), r.sku.trim()), r.usableQty);
  }
  return m;
}

function substituteSkuPlaceholders(expression: string, params: Record<string, unknown>): SubstituteOk | InvErr {
  const fetchFailed = params.inventoryFetchOk === false;
  const fetchErrRaw = params.inventoryFetchError;
  const fetchErr =
    fetchErrRaw && typeof fetchErrRaw === "object" && fetchErrRaw !== null && !Array.isArray(fetchErrRaw)
      ? (fetchErrRaw as Record<string, unknown>)
      : null;

  const calls = findSkuQtyCalls(expression);
  const remainder = remainderAfterCalls(expression, calls);

  if (calls.length > 0 && remainder.includes(SKU_QTY_BARE)) {
    return {
      ok: false,
      errorCode: "inventory_ambiguous",
      message: "请勿在同一算式中混用 SKU_QTY(wh=,sku=) 与无括号的 SKU_QTY。",
    };
  }

  if (/SKU_QTY\s*\(/i.test(remainder)) {
    return {
      ok: false,
      errorCode: "inventory_placeholder_malformed",
      message:
        "存在无法解析的 SKU_QTY(…)；请使用 SKU_QTY(wh=仓库编码, sku=商品编码)，注意逗号与括号配对。",
    };
  }

  if (!expression.includes(SKU_QTY_BARE)) {
    return { ok: true, expression, skuResolutions: [] };
  }

  if (fetchFailed && fetchErr) {
    const code = String(fetchErr.code ?? "inventory_failed");
    const message = String(fetchErr.message ?? "前置库存节点失败");
    return { ok: false, errorCode: code, message };
  }

  const skuResolutions = normalizeSkuResolutions(params.skuResolutions);
  const qtyMap = resolutionMapFromList(skuResolutions);

  for (const c of calls) {
    if (!c.wh || !c.sku) {
      return {
        ok: false,
        errorCode: "inventory_missing_params",
        message: "SKU_QTY(wh=, sku=) 中 wh 与 sku 均不能为空。",
      };
    }
  }

  const qtyByPair = new Map<string, number>();
  for (const c of calls) {
    const k = pairKey(c.wh, c.sku);
    let q = qtyMap.get(k);
    if (q === undefined) {
      q = qtyMap.get(pairKey(c.wh.trim(), c.sku.trim()));
    }
    if (q === undefined) {
      return {
        ok: false,
        errorCode: "inventory_missing_upstream",
        message: `缺少仓库「${c.wh}」SKU「${c.sku}」的可用库存；请确认前置 fetch-sku-inventory 已执行且 skuResolutions 已绑定。`,
      };
    }
    qtyByPair.set(k, q);
  }

  let work = expression;
  const sortedCalls = [...calls].sort((a, b) => b.index - a.index);
  for (const c of sortedCalls) {
    const k = pairKey(c.wh, c.sku);
    const q = qtyByPair.get(k);
    if (q === undefined) {
      return { ok: false, errorCode: "inventory_missing_upstream", message: "内部错误：未匹配到库存数量。" };
    }
    work = work.slice(0, c.index) + String(q) + work.slice(c.index + c.full.length);
  }

  let outResolutions: SkuResolution[] = [];
  let bareOverrideQty: number | undefined;

  if (remainder.includes(SKU_QTY_BARE)) {
    const mc = typeof params.merchandiseCode === "string" ? params.merchandiseCode.trim() : "";
    let bareQty: number | undefined;
    if (skuResolutions.length === 1) {
      bareQty = skuResolutions[0].usableQty;
    } else if (mc && skuResolutions.length > 0) {
      const hits = skuResolutions.filter((r) => r.sku.trim() === mc);
      if (hits.length === 1) bareQty = hits[0].usableQty;
    }
    if (bareQty === undefined) {
      return {
        ok: false,
        errorCode: "inventory_missing_upstream",
        message:
          "无括号 SKU_QTY 需要前置 fetch 提供 skuResolutions：仅一条记录，或与专家入参 merchandiseCode 能唯一匹配一条。",
      };
    }
    work = work.split(SKU_QTY_BARE).join(String(bareQty));
    if (calls.length === 0) {
      if (skuResolutions.length === 1) {
        outResolutions = [...skuResolutions];
        const r0 = outResolutions[0];
        if (r0.warehouse === "" && r0.sku === "") {
          bareOverrideQty = bareQty;
          outResolutions = [];
        }
      } else {
        const hit =
          mc && skuResolutions.length > 0
            ? skuResolutions.find((r) => r.sku.trim() === mc)
            : undefined;
        outResolutions = [
          {
            warehouse: hit?.warehouse ?? "",
            sku: hit?.sku ?? mc,
            usableQty: bareQty,
          },
        ];
      }
    }
  } else if (calls.length > 0) {
    outResolutions = [...skuResolutions];
  }

  return { ok: true, expression: work, skuResolutions: outResolutions, bareOverrideQty };
}

function expressionNeedsInventoryPass(expr: string): boolean {
  return expr.includes(SKU_QTY_BARE);
}

function getChainId(params: Record<string, unknown>): string | undefined {
  const ic = params.inputContext;
  if (ic && typeof ic === "object" && "chainId" in ic) {
    const c = (ic as Record<string, unknown>).chainId;
    return typeof c === "string" ? c : undefined;
  }
  return undefined;
}

function evaluateArithmetic(raw: string): {
  valid: boolean;
  value?: number;
  expressionNormalized: string;
  errorCode?: string;
} {
  const expressionNormalized = raw.replace(/\s+/g, "");
  if (!expressionNormalized) {
    return { valid: false, expressionNormalized: "", errorCode: "empty" };
  }
  if (!SAFE_EXPR.test(raw)) {
    return { valid: false, expressionNormalized, errorCode: "invalid_chars" };
  }
  if (raw.includes("**") || raw.includes("//")) {
    return { valid: false, expressionNormalized, errorCode: "invalid_chars" };
  }
  try {
    const fn = new Function(`"use strict"; return (${expressionNormalized});`);
    const v = fn();
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { valid: false, expressionNormalized, errorCode: "non_finite" };
    }
    return { valid: true, value: v, expressionNormalized };
  } catch {
    return { valid: false, expressionNormalized, errorCode: "syntax" };
  }
}

async function main({ params }: { params: Record<string, unknown> }) {
  const query = typeof params.query === "string" ? params.query : "";
  const customerIntent = typeof params.customerIntent === "string" ? params.customerIntent : "";
  const expression = typeof params.expression === "string" ? params.expression : "";

  const chainId = getChainId(params);

  let substitutedExpression = expression;
  let skuResolutions: SkuResolution[] = [];
  let bareOverrideQty: number | undefined;

  if (expressionNeedsInventoryPass(expression)) {
    const sub = substituteSkuPlaceholders(expression, params);
    if (!sub.ok) {
      let analysis = sub.message;
      if (customerIntent) analysis += ` 客户诉求摘要：${customerIntent}`;
      const structured = {
        valid: false,
        expressionNormalized: expression.replace(/\s+/g, ""),
        errorCode: sub.errorCode,
      };
      return {
        result: { structured, analysis },
        outputContext: {
          expertId: EXPERT_ID,
          resultSummary: `失败:${sub.errorCode}`,
          chainId,
        },
        branch: "skip_review" as const,
      };
    }
    substitutedExpression = sub.expression;
    skuResolutions = sub.skuResolutions;
    bareOverrideQty = sub.bareOverrideQty;
  }

  const ev = evaluateArithmetic(substitutedExpression);

  let analysis: string;
  if (ev.valid && ev.value !== undefined) {
    analysis = `算式 ${ev.expressionNormalized} = ${ev.value}`;
    if (skuResolutions.length > 0) {
      const parts = skuResolutions.map((r) => `${r.warehouse}/${r.sku}→${r.usableQty}`);
      analysis += `（库存替换：${parts.join("；")}）`;
    }
    if (customerIntent) analysis += `。客户侧诉求：${customerIntent}`;
    if (query) analysis += `。上游任务：${query}`;
  } else {
    const hint =
      ev.errorCode === "empty"
        ? "请提供非空 expression（算式字符串）。"
        : ev.errorCode === "invalid_chars"
          ? "算式仅支持数字与 + - * / 括号（请先完成库存占位符替换）。"
          : ev.errorCode === "syntax"
            ? "算式语法无效，请检查括号与运算符。"
            : "无法得到有限数值（如除零或未定义运算）。";
    analysis = hint;
    if (customerIntent) analysis += ` 客户诉求摘要：${customerIntent}`;
  }

  const skuUsableQtyUsed =
    skuResolutions.length === 1 ? skuResolutions[0].usableQty : bareOverrideQty != null ? bareOverrideQty : undefined;

  const structured: Record<string, unknown> = {
    valid: ev.valid,
    ...(ev.valid && ev.value !== undefined ? { value: ev.value } : {}),
    expressionNormalized: ev.expressionNormalized,
    ...(ev.errorCode ? { errorCode: ev.errorCode } : {}),
    ...(skuUsableQtyUsed != null ? { skuUsableQtyUsed } : {}),
    ...(skuResolutions.length > 0 ? { skuResolutions } : {}),
  };

  const resultSummary = ev.valid ? `=${ev.value}` : `失败:${ev.errorCode ?? "unknown"}`;

  const branch = ev.valid ? "with_review" : "skip_review";

  return {
    result: {
      structured,
      analysis,
    },
    outputContext: {
      expertId: EXPERT_ID,
      resultSummary,
      chainId,
    },
    branch,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("evaluate-expression")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
