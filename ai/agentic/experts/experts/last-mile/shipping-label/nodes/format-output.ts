/** 生成稳定的结构化结果与对客面单下载说明。 */

type OrderResult = {
  orderNo?: string;
  matchedFrom?: string[];
  result?: string;
  businessCode?: string;
  message?: string;
  labels?: Array<{ trackingNo?: string; labelUrls?: string[] }>;
};

function shippingLabelOutputArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function shippingLabelFailureLine(order: OrderResult): string {
  const orderNo = String(order.orderNo ?? "订单").trim() || "订单";
  const message = String(order.message ?? "未获取到尾程面单").trim();
  return `- ${orderNo}：${message}`;
}

function shippingLabelSuccessLines(order: OrderResult): string[] {
  const orderNo = String(order.orderNo ?? "").trim();
  const lines = [`- 出库单 ${orderNo}`];
  for (const group of order.labels ?? []) {
    const trackingNo = String(group.trackingNo ?? "").trim();
    if (trackingNo) lines.push(`  - trackingNo：${trackingNo}`);
    for (const [index, url] of (group.labelUrls ?? []).entries()) {
      lines.push(`  - [下载面单 PDF ${index + 1}](${url})`);
    }
  }
  return lines;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const valid = params.valid === true;
  const errorCode = String(params.errorCode ?? "").trim();
  const errorMessage = String(params.errorMessage ?? "").trim();
  const requestedIdentifiers = shippingLabelOutputArray(params.requestedIdentifiers).map(String);
  const resolution = params.resolution && typeof params.resolution === "object"
    ? params.resolution as Record<string, unknown>
    : {};
  const orderResults = shippingLabelOutputArray(params.orderResults) as OrderResult[];
  const unresolvedIdentifiers = shippingLabelOutputArray(params.unresolvedIdentifiers) as Array<Record<string, unknown>>;
  const tooManyMatches = resolution.tooManyMatches === true;

  const successOrders = orderResults.filter((order) => order.result === "success");
  const failedOrders = orderResults.filter((order) => order.result !== "success");
  const labelFileCount = successOrders.reduce(
    (sum, order) => sum + (order.labels ?? []).reduce((inner, group) => inner + (group.labelUrls?.length ?? 0), 0),
    0
  );

  let status: "success" | "partial_success" | "failed" | "need_input" | "too_many_matches";
  if (!valid && errorCode === "need_input") status = "need_input";
  else if (tooManyMatches) status = "too_many_matches";
  else if (!valid) status = "failed";
  else if (successOrders.length > 0 && failedOrders.length + unresolvedIdentifiers.length === 0) status = "success";
  else if (successOrders.length > 0) status = "partial_success";
  else status = "failed";

  const structured = {
    status,
    requestedIdentifiers,
    orders: orderResults,
    unresolvedIdentifiers,
    summary: {
      requestedCount: requestedIdentifiers.length,
      resolvedOrderCount: Number(resolution.resolvedOrderCount ?? orderResults.length),
      successOrderCount: successOrders.length,
      failedOrderCount: failedOrders.length + unresolvedIdentifiers.length,
      labelFileCount,
    },
  };

  const sections: string[] = [];
  if (!valid) {
    sections.push(errorMessage || "当前无法查询尾程面单，请稍后重试。");
  } else if (tooManyMatches) {
    sections.push("匹配到的出库订单超过 20 个，请缩小查询范围后重试。");
  } else {
    if (successOrders.length > 0) {
      sections.push("已获取以下尾程面单：");
      for (const order of successOrders) sections.push(...shippingLabelSuccessLines(order));
      sections.push("链接通常约 60 分钟有效，请尽快下载。面单仅供查询、留档或申诉，不可用于实际发货打印。");
    }
    if (failedOrders.length > 0 || unresolvedIdentifiers.length > 0) {
      sections.push("以下订单或标识未获取到面单：");
      for (const order of failedOrders) sections.push(shippingLabelFailureLine(order));
      for (const item of unresolvedIdentifiers) {
        const identifier = String(item.identifier ?? "标识").trim() || "标识";
        const reason = String(item.reason ?? "未匹配到出库订单").trim();
        sections.push(`- ${identifier}：${reason}`);
      }
    }
  }
  const analysis = sections.join("\n");

  const inputContext = params.inputContext && typeof params.inputContext === "object"
    ? params.inputContext as Record<string, unknown>
    : {};
  const successOrderNos = successOrders.map((order) => String(order.orderNo ?? "").trim()).filter(Boolean);
  const failedOrderNos = failedOrders.map((order) => String(order.orderNo ?? "").trim()).filter(Boolean);
  const resultSummary = `尾程面单查询：成功 ${successOrders.length} 单，未获取 ${failedOrders.length + unresolvedIdentifiers.length} 项。`;

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "shipping-label",
      resultSummary,
      chainId: String(inputContext.chainId ?? ""),
    },
    enrichedContext: {
      shippingLabelQuery: {
        queriedAtUtc: new Date().toISOString(),
        orderNos: orderResults.map((order) => String(order.orderNo ?? "").trim()).filter(Boolean),
        successOrderNos,
        failedOrderNos,
        unresolvedIdentifiers: unresolvedIdentifiers.map((item) => String(item.identifier ?? "").trim()).filter(Boolean),
      },
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((result) => process.stdout.write(JSON.stringify(result)));
}

