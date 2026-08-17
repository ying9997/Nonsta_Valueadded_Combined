/** 校验并规范化尾程面单查询输入。 */

const SHIPPING_LABEL_MAX_INPUTS = 10;

function shippingLabelStringList(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const rawIdentifierValues = Array.isArray(params.orderIdentifiers)
    ? params.orderIdentifiers as unknown[]
    : params.orderIdentifiers == null
      ? []
      : [params.orderIdentifiers];
  const rawIdentifierCount = rawIdentifierValues.filter((value) => String(value ?? "").trim()).length;
  const orderIdentifiers = shippingLabelStringList(params.orderIdentifiers);
  const customerCode = String(params.customerCode ?? "").trim();
  const username = String(params.username ?? "").trim();

  let valid = true;
  let errorCode = "";
  let errorMessage = "";

  if (orderIdentifiers.length === 0) {
    valid = false;
    errorCode = "need_input";
    errorMessage = "请提供出库单号、包裹号、trackingNo 或卖家订单号。";
  } else if (rawIdentifierCount > SHIPPING_LABEL_MAX_INPUTS) {
    valid = false;
    errorCode = "too_many_inputs";
    errorMessage = `单次最多查询 ${SHIPPING_LABEL_MAX_INPUTS} 个标识，请分批提交。`;
  } else if (!customerCode || !username) {
    valid = false;
    errorCode = "missing_account_context";
    errorMessage = "当前登录信息不完整，无法确认订单归属；请重新登录后再查询。";
  }

  return {
    valid,
    errorCode,
    errorMessage,
    orderIdentifiers,
    requestedIdentifiers: orderIdentifiers,
    customerCode,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("validate-input")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}
