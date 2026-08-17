import { spawnSync } from "node:child_process";
import * as path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const expertDir = path.join(repoRoot, "experts", "last-mile", "shipping-label");
const tsconfig = path.join(repoRoot, "scripts", "tsconfig.json");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runNode(file: string, params: Record<string, unknown>): Record<string, unknown> {
  const result = spawnSync(
    process.execPath,
    [
      "-r",
      "ts-node/register/transpile-only",
      path.join(expertDir, "nodes", file),
      JSON.stringify(params),
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, TS_NODE_PROJECT: tsconfig },
    }
  );
  if (result.status !== 0) {
    throw new Error(`${file} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  assert(Array.isArray(value), "expected array");
  return value as Array<Record<string, unknown>>;
}

function testValidation(): void {
  const missing = runNode("validate-input.ts", { orderIdentifiers: [] });
  assert(missing.valid === false, "empty identifiers must be rejected");
  assert(missing.errorCode === "need_input", "empty identifiers must use need_input");

  const normalized = runNode("validate-input.ts", {
    orderIdentifiers: [" WO123A ", "TRACK-1", "TRACK-1", ""],
    customerCode: "10001",
    username: "user@example.com",
  });
  assert(normalized.valid === true, "valid identifiers and account context must pass");
  assert(
    JSON.stringify(normalized.orderIdentifiers) === JSON.stringify(["WO123A", "TRACK-1"]),
    "identifiers must be trimmed and deduplicated"
  );

  const tooMany = runNode("validate-input.ts", {
    orderIdentifiers: Array.from({ length: 11 }, (_, i) => `WO${1000 + i}`),
    customerCode: "10001",
    username: "user@example.com",
  });
  assert(tooMany.valid === false, "more than ten identifiers must be rejected");
  assert(tooMany.errorCode === "too_many_inputs", "input limit needs a stable error code");

  const tooManyDuplicates = runNode("validate-input.ts", {
    orderIdentifiers: Array.from({ length: 11 }, () => "WO123"),
    customerCode: "10001",
    username: "user@example.com",
  });
  assert(tooManyDuplicates.valid === false, "raw non-empty input count must not exceed ten");

  const missingIdentity = runNode("validate-input.ts", { orderIdentifiers: ["WO123"] });
  assert(missingIdentity.valid === false, "missing account context must be rejected before plugins");
  assert(missingIdentity.errorCode === "missing_account_context", "account error must be explicit");
  assert(
    missingIdentity.errorMessage === "当前登录信息不完整，无法确认订单归属；请重新登录后再查询。",
    "missing account context must explain the identity problem without automatic human handoff"
  );
}

function testResolutionBuildAndMerge(): Record<string, unknown> {
  const built = runNode("build-order-resolution-actions.ts", {
    valid: true,
    orderIdentifiers: ["WO123A", "TRACK-1", "SELLER-1"],
  });
  const actions = asArray(built.actions);
  const plans = asArray(built.actionPlans);
  const direct = asArray(built.directOrders);
  assert(direct.length === 1, "WO package identifiers must resolve without an API call");
  assert(direct[0]?.orderNo === "WO123", "WO package suffix must normalize to the main order");
  assert(actions.length === 4, "each ambiguous identifier needs tracking and seller actions");
  assert(plans[0]?.queryBy === "trackingNo", "tracking lookup must be attempted first");
  assert(plans[1]?.queryBy === "sellerOrderNo", "seller lookup must be the fallback");
  assert(actions.every((x) => x.action === "queryOutboundOrderList"), "resolution action mismatch");

  const trackingData = JSON.parse(String(actions[0]?.data)) as Record<string, unknown>;
  const sellerData = JSON.parse(String(actions[1]?.data)) as Record<string, unknown>;
  assert(trackingData.trackingNo === "TRACK-1", "tracking action must carry the original token");
  assert(sellerData.sellerOrderNo === "TRACK-1", "seller fallback must carry the original token");

  const outputList = [
    {
      code: "0",
      msg: "操作成功",
      data: JSON.stringify({
        list: [
          { outboundOrderNum: "WO200" },
          { outboundOrderNum: "WO201" },
        ],
      }),
    },
    {
      code: "0",
      msg: "操作成功",
      data: JSON.stringify({ list: [{ outboundOrderNum: "WO999" }] }),
    },
    { code: "0", msg: "操作成功", data: JSON.stringify({ list: [] }) },
    {
      code: "0",
      msg: "操作成功",
      data: JSON.stringify({ list: [{ documentNo: "WO300A" }] }),
    },
  ];

  const merged = runNode("merge-order-resolution.ts", {
    requestedIdentifiers: built.requestedIdentifiers,
    directOrders: built.directOrders,
    actionPlans: built.actionPlans,
    resolutionPluginOutputList: outputList,
  });
  const orders = asArray((merged.resolution as Record<string, unknown>).orders);
  const orderNos = orders.map((x) => x.orderNo);
  assert(
    JSON.stringify(orderNos) === JSON.stringify(["WO123", "WO200", "WO201", "WO300"]),
    "resolution must keep direct orders, all tracking matches, seller fallback, and input order"
  );
  assert(!orderNos.includes("WO999"), "seller matches must be ignored when tracking matched");
  const trackingOrders = orders.filter((x) =>
    Array.isArray(x.matchedFrom) && (x.matchedFrom as unknown[]).includes("TRACK-1")
  );
  assert(trackingOrders.length === 2, "all matches within the selected lookup type must be retained");
  return merged.resolution as Record<string, unknown>;
}

function testResolvedOrderSafetyCap(): void {
  const directOrders = Array.from({ length: 21 }, (_, i) => ({
    inputIdentifier: `WO${1000 + i}`,
    orderNo: `WO${1000 + i}`,
  }));
  const merged = runNode("merge-order-resolution.ts", {
    requestedIdentifiers: directOrders.map((x) => x.inputIdentifier),
    directOrders,
    actionPlans: [],
    resolutionPluginOutputList: [],
  });
  const resolution = merged.resolution as Record<string, unknown>;
  assert(resolution.tooManyMatches === true, "more than 20 resolved WO orders must stop the batch");

  const labels = runNode("build-label-actions.ts", {
    valid: true,
    customerCode: "10001",
    resolution,
  });
  assert(asArray(labels.actions).length === 0, "label calls must not be truncated silently");
}

function testLabelBuildMergeAndOutput(resolution: Record<string, unknown>): void {
  const built = runNode("build-label-actions.ts", {
    valid: true,
    customerCode: "10001",
    resolution,
  });
  const actions = asArray(built.actions);
  const plans = asArray(built.actionPlans);
  assert(actions.length === 4, "each unique resolved WO must produce one label action");
  assert(actions.every((x) => x.action === "wh.outbound.getMaskedLabelUrl"), "label action mismatch");
  const firstData = JSON.parse(String(actions[0]?.data)) as Record<string, unknown>;
  assert(firstData.orderNo === "WO123", "label request must use the normalized WO main order");
  assert(firstData.customerCode === "10001", "customerCode must also be inside business data");
  assert(!("trackingNo" in firstData), "trackingNo must stay omitted so all package labels return");

  const merged = runNode("merge-label-results.ts", {
    resolution,
    actionPlans: plans,
    labelPluginOutputList: [
      {
        code: "0",
        msg: "操作成功",
        data: JSON.stringify({
          maskedLabelUrlList: [
            { trackingNo: "TRACK-A", labelUrls: ["https://example.com/a.pdf"] },
            { trackingNo: "TRACK-B", labelUrls: ["https://example.com/b.pdf"] },
          ],
        }),
      },
      { code: "0", msg: "操作成功", data: JSON.stringify({ maskedLabelUrlList: [] }) },
      { code: 2020249908, msg: "订单当前状态不支持查询", data: "" },
      { code: "03010250007", msg: "身份校验失败", data: "" },
    ],
  });

  const orders = asArray(merged.orderResults);
  assert(orders[0]?.result === "success", "non-empty label list must be success");
  assert(asArray(orders[0]?.labels).length === 2, "all tracking label groups must be retained");
  assert(orders[1]?.result === "no_label", "empty success response must be no_label");
  assert(
    orders[1]?.message === "查询已完成，但当前没有返回可下载的尾程面单文件。",
    "empty success response must explain that no label file was returned"
  );
  assert(orders[2]?.result === "not_supported", "known eligibility rejection must be not_supported");
  assert(orders[2]?.businessCode === "02020249908", "business code leading zero must survive");
  assert(
    orders[2]?.message ===
      "订单尚未完成出库，因此暂时无法获取尾程面单。请待订单完成出库后再自助查询。",
    "02020249908 must explain that the order has not completed outbound processing"
  );
  assert(!String(orders[2]?.message ?? "").includes("人工"), "not-outbound orders must not be sent to human support");
  assert(orders[3]?.result === "forbidden", "identity failure must be forbidden");
  assert(
    orders[3]?.message ===
      "账号权限或订单归属校验未通过，因此无法查询该订单。请确认使用该订单所属账号登录。",
    "forbidden responses must explain the account or ownership check"
  );

  const notFoundError = runNode("merge-label-results.ts", {
    resolution,
    actionPlans: [plans[0]],
    labelPluginOutputList: [{ code: "02020249100", msg: "订单不存在", data: "" }],
  });
  assert(
    asArray(notFoundError.orderResults)[0]?.message ===
      "当前账号下未找到对应的出库订单，请核对订单标识和订单归属。",
    "not-found responses must explain what the user should verify"
  );

  const unsupportedWithoutReason = runNode("merge-label-results.ts", {
    resolution,
    actionPlans: [plans[0]],
    labelPluginOutputList: [{ code: "02020249999", msg: "当前状态不支持查询", data: "" }],
  });
  assert(
    asArray(unsupportedWithoutReason.orderResults)[0]?.message ===
      "接口返回该订单当前不支持查询，但未提供更具体的业务原因。",
    "generic unsupported responses must disclose that no specific reason was provided"
  );

  const genericError = runNode("merge-label-results.ts", {
    resolution,
    actionPlans: [plans[0]],
    labelPluginOutputList: [{ code: 1, msg: "公共请求失败", data: "" }],
  });
  const genericErrorOrders = asArray(genericError.orderResults);
  assert(genericErrorOrders[0]?.result === "service_error", "generic errors must stay service_error");
  assert(genericErrorOrders[0]?.businessCode === "1", "ordinary short codes must not be zero-padded");
  assert(
    genericErrorOrders[0]?.message ===
      "本次查询未返回可确认的业务原因，暂时无法获取尾程面单。",
    "unknown business errors must state that the reason is unconfirmed"
  );

  const invalidResponse = runNode("merge-label-results.ts", {
    resolution,
    actionPlans: [plans[0]],
    labelPluginOutputList: [],
  });
  const invalidResponseOrders = asArray(invalidResponse.orderResults);
  assert(invalidResponseOrders[0]?.businessCode === "-1", "missing responses must use the internal sentinel code");
  assert(
    invalidResponseOrders[0]?.message ===
      "面单查询未返回有效结果，暂时无法确认具体原因。请稍后重新查询。",
    "missing or malformed responses must explain the invalid result"
  );

  const reasonByMessage = runNode("merge-label-results.ts", {
    resolution,
    actionPlans: [plans[0], plans[1]],
    labelPluginOutputList: [
      { code: "X-NOT-OUTBOUND", msg: "订单尚未出库，不支持查询", data: "" },
      { code: "X-EXPIRED", msg: "已超过可查询时限（出库后30天内可查）", data: "" },
    ],
  });
  const reasonByMessageOrders = asArray(reasonByMessage.orderResults);
  assert(
    reasonByMessageOrders[0]?.message ===
      "订单尚未完成出库，因此暂时无法获取尾程面单。请待订单完成出库后再自助查询。",
    "confirmed not-outbound message must retain its reason even if the business code changes"
  );
  assert(
    reasonByMessageOrders[1]?.message ===
      "尾程面单已支持自助查询，但该订单已超过可查询时限（出库后 30 天内可查）。",
    "confirmed expiry message must retain its reason even if the business code changes"
  );

  const expiredEligibilityError = runNode("merge-label-results.ts", {
    resolution,
    actionPlans: [plans[0]],
    labelPluginOutputList: [
      { code: 2020249909, msg: "已超过可查询时限（出库后30天内可查）", data: "" },
    ],
  });
  const expiredEligibilityErrorOrders = asArray(expiredEligibilityError.orderResults);
  assert(
    expiredEligibilityErrorOrders[0]?.result === "not_supported",
    "confirmed 02020249909 expiry must be not_supported"
  );
  assert(
    expiredEligibilityErrorOrders[0]?.businessCode === "02020249909",
    "expiry business code must preserve its leading zero"
  );
  assert(
    expiredEligibilityErrorOrders[0]?.message ===
      "尾程面单已支持自助查询，但该订单已超过可查询时限（出库后 30 天内可查）。",
    "confirmed expiry must use an accurate customer-facing message"
  );

  const formattedExpired = runNode("format-output.ts", {
    valid: true,
    requestedIdentifiers: ["WO123A"],
    resolution: { requestedIdentifiers: ["WO123A"], resolvedOrderCount: 1 },
    unresolvedIdentifiers: [],
    orderResults: expiredEligibilityError.orderResults,
    inputContext: { chainId: "shipping-label-expired-regression" },
  });
  const expiredAnalysis = String(formattedExpired.analysis ?? "");
  assert(
    expiredAnalysis.includes("尾程面单已支持自助查询"),
    "expiry answer must not imply that labels are only available from human support"
  );
  assert(expiredAnalysis.includes("出库后 30 天内可查"), "expiry answer must explain the 30-day limit");
  assert(!expiredAnalysis.includes("仅支持人工客服"), "expiry answer must not contain the obsolete manual-only policy");
  assert(!expiredAnalysis.includes("转人工"), "expiry answer must not trigger an automatic human handoff");

  const formatted = runNode("format-output.ts", {
    valid: true,
    requestedIdentifiers: resolution.requestedIdentifiers,
    unresolvedIdentifiers: (resolution.unresolvedIdentifiers as unknown[]) ?? [],
    orderResults: merged.orderResults,
    inputContext: { chainId: "shipping-label-regression" },
    customerCode: "SECRET-CUSTOMER",
    username: "secret@example.com",
    sign: "SECRET-SIGN",
  });
  const structured = formatted.structured as Record<string, unknown>;
  assert(structured.status === "partial_success", "mixed result batch must be partial_success");
  const analysis = String(formatted.analysis ?? "");
  assert(analysis.includes("https://example.com/a.pdf"), "customer answer must contain successful links");
  assert(analysis.includes("约 60 分钟"), "customer answer must warn about link validity");
  assert(analysis.includes("不可用于实际发货打印"), "customer answer must state the print restriction");
  assert(analysis.includes("未获取到面单"), "customer answer must include per-order failures");
  assert(!analysis.includes("SECRET-CUSTOMER"), "customerCode must not leak into analysis");
  assert(!analysis.includes("secret@example.com"), "username must not leak into analysis");
  assert(!analysis.includes("SECRET-SIGN"), "signature must not leak into analysis");

  const outputContext = formatted.outputContext as Record<string, unknown>;
  const enrichedContext = formatted.enrichedContext as Record<string, unknown>;
  assert(!JSON.stringify(outputContext).includes("example.com"), "outputContext must not retain signed URLs");
  assert(!JSON.stringify(enrichedContext).includes("example.com"), "enrichedContext must not retain signed URLs");
  assert(outputContext.expertId === "shipping-label", "outputContext expertId mismatch");
  assert(outputContext.chainId === "shipping-label-regression", "chainId must be preserved");
}

function main(): void {
  testValidation();
  const resolution = testResolutionBuildAndMerge();
  testResolvedOrderSafetyCap();
  testLabelBuildMergeAndOutput(resolution);
  console.log("shipping-label regression: PASS");
}

main();
