/**
 * 节点：validate-vas-order-input — 校验增值单状态查询入参。
 * FaaS 单文件闭环，无外部 import。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown): boolean {
  return value === true || value === "true";
}

function asBoolDefault(value: unknown, fallback: boolean): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function asPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function main({ params }: { params: Record<string, unknown> }) {
  const vasOrderNo = asText(params.vasOrderNo);
  const businessNo = asText(params.businessNo);
  const hasPreferredId = vasOrderNo.length > 0;
  const hasAuxiliaryId = businessNo.length > 0;
  const asksPreOrderQuote = !hasPreferredId && !hasAuxiliaryId && (asBool(params.includePrepayment) || asBool(params.includePayment));
  const inputContext = asRecord(params.inputContext);
  const maxAtomRows = clamp(asPositiveInt(params.maxAtomRows, 20), 1, 200);

  return {
    orderStatusInput: {
      vasOrderNo,
      businessNo,
      includeAtoms: asBoolDefault(params.includeAtoms, true),
      includePayment: asBool(params.includePayment),
      includePrepayment: asBool(params.includePrepayment),
      includeGoods: asBool(params.includeGoods),
      parentGoodsId: asPositiveNumber(params.parentGoodsId),
      maxAtomRows,
      enrichedContext: asRecord(params.enrichedContext),
      validationOk: hasPreferredId || hasAuxiliaryId,
      outputPath: hasPreferredId
        ? "query_by_vas_order_no"
        : hasAuxiliaryId
          ? "query_by_business_no"
          : asksPreOrderQuote
            ? "pre_quote_not_supported"
          : "missing_vas_order_no",
      validationMessage: hasPreferredId
        ? ""
        : hasAuxiliaryId
          ? "将先通过业务单号辅助定位增值单；不唯一时需要补充增值单号。"
          : asksPreOrderQuote
            ? "未下单前报价不属于增值单状态查询范围；本专家只能解释已提交或已有增值单的状态和费用事实。"
          : "请提供增值单号。",
    },
    inputContext,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-vas-order-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "validate-vas-order-input failed");
      process.exit(1);
    });
}
