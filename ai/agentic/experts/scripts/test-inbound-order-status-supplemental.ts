#!/usr/bin/env npx ts-node
/** 脱敏 fixture：验证补充详情时间覆盖、归属校验与字段白名单。 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildSupplementalDetailActions,
  coerceSupplementalDetailPayload,
  normalizeSupplementalDetail,
} from "../shared/inbound-order-supplemental-detail";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runCodeNode(relativePath: string, params: Record<string, unknown>): Record<string, unknown> {
  const nodePath = path.join(__dirname, "..", relativePath);
  const tsconfigPath = path.join(__dirname, "tsconfig.json");
  const result = spawnSync(
    process.execPath,
    [require.resolve("ts-node/dist/bin.js"), "-P", tsconfigPath, nodePath, JSON.stringify(params)],
    { encoding: "utf8" },
  );
  assert(result.status === 0, `${relativePath} failed: ${result.stderr || result.stdout}`);
  assert(result.stdout.trim(), `${relativePath} returned no output`);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

const fixturePath = path.join(__dirname, "fixtures", "inbound-order-status-supplemental.fixture.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Record<string, unknown>;

const { actions, actionPlans } = buildSupplementalDetailActions([" wi00000001 "]);
assert(actionPlans[0]?.orderNo === "WI00000001", "orderNo should be normalized");
assert(actions[0]?.action === "wh.inboundOrder.getOrderDetail", "supplemental action mismatch");
assert(JSON.parse(actions[0]!.data).orderNo === "WI00000001", "action data mismatch");

const normalized = normalizeSupplementalDetail(fixture, "10000000");
assert(normalized, "matching customer detail should be accepted");
assert(
  normalized.forecast.expectedSendwarehouseTime === "2026-08-01 06:00:00",
  "expected send-to-warehouse time missing",
);
assert(
  normalized.forecast.forecastWarehouseTime === "2026-08-01 08:00:00",
  "forecast warehouse-arrival time missing",
);

const expectedOrderTimeKeys = [
  "orderDate", "shelveCompletedDate", "voidDate", "awhDate", "dicDate", "dioDate",
  "pickupDate", "pickupCompletedDate", "estimateShelveCompletedDate", "goalShelveDate",
  "targetWarehouseArrivalTime", "unloadStartDate", "unloadDate", "estimateUnloadDate",
  "mergeDate", "receiptCompletionDate", "estimateDeliveryDate", "targetShelveTime",
  "targetShelveTimeLocal", "estimateShelveTime", "estimateShelveTimeLocal",
  "actualShelveTime", "actualShelveTimeLocal",
];
assert(
  JSON.stringify(Object.keys(normalized.orderTimes)) === JSON.stringify(expectedOrderTimeKeys),
  "orderKeyTimeNode whitelist is incomplete or unstable",
);
assert(
  Object.prototype.hasOwnProperty.call(normalized.orderTimes, "actualShelveTime"),
  "null time fields must be retained",
);
assert(normalized.orderTimes.actualShelveTime === null, "null time should stay null");
assert(normalized.pickupTimes.advanceBookingTime === 24, "pickup timing missing");

const serialized = JSON.stringify(normalized);
for (const forbidden of [
  "customerName", "customerEmail", "declarationAmount", "merchandiseList",
  "shippingAddress", "pickupAddress", "goodsValue", "internalForecastNote",
  "unapprovedInternalTime", "must-not-pass",
]) {
  assert(!serialized.includes(forbidden), `forbidden field leaked: ${forbidden}`);
}

assert(
  normalizeSupplementalDetail({ ...fixture, customerCode: "20000000" }, "10000000") === null,
  "mismatched customer must be rejected",
);
const withoutCustomerCode = { ...fixture };
delete withoutCustomerCode.customerCode;
assert(
  normalizeSupplementalDetail(withoutCustomerCode, "10000000") === null,
  "missing returned customerCode must be rejected when customer context exists",
);

const derivePath = path.join(
  "experts", "inbound", "inbound-order-status", "nodes", "derive-order-status-evidence.ts",
);
const baseOrder = {
  orderNo: normalized.orderNo,
  status: "TS",
  winitProductCode: "OW01011001",
  supplementalOrderDetail: normalized,
  trackingList: [{ trackingCode: "DEPARTED", trackingDesc: "in transit", trackingDate: "2026-07-20 10:00:00" }],
};
const tsDerived = runCodeNode(derivePath, { prunedOrderData: { list: [baseOrder] } });
const tsPrimary = ((tsDerived.orderStatusEvidence as Record<string, unknown>).primary ?? {}) as Record<string, unknown>;
assert(tsPrimary.expectedSendwarehouseTime === "2026-08-01 06:00:00", "TS expected send time lost");
assert(tsPrimary.forecastWarehouseTime === "2026-08-01 08:00:00", "TS forecast arrival time lost");
assert(tsPrimary.requiresManualTransitVerification === true, "TS manual verification boundary missing");
assert(tsPrimary.timeZone === "unknown", "unknown timezone marker missing");

const arrivedSupplemental = {
  ...normalized,
  status: "PEWC",
  orderTimes: { ...normalized.orderTimes, awhDate: "2026-08-01 08:30:00" },
};
const arrivedDerived = runCodeNode(derivePath, {
  prunedOrderData: { list: [{ ...baseOrder, status: "PEWC", supplementalOrderDetail: arrivedSupplemental }] },
});
const arrivedPrimary = ((arrivedDerived.orderStatusEvidence as Record<string, unknown>).primary ?? {}) as Record<string, unknown>;
assert(arrivedPrimary.warehouseArrivalVerified === true, "PEWC actual warehouse arrival not verified");
assert(arrivedPrimary.actualWarehouseArrivalTime === "2026-08-01 08:30:00", "actual arrival time lost");
assert(
  (arrivedPrimary.evidenceWarnings as string[]).includes("ACTUAL_TIME_TAKES_PRECEDENCE_OVER_FORECAST"),
  "actual-over-forecast precedence warning missing",
);

const shelvedSupplemental = {
  ...normalized,
  status: "SHD",
  orderTimes: { ...normalized.orderTimes, actualShelveTime: "2026-08-02 12:00:00" },
};
const multiDerived = runCodeNode(derivePath, {
  prunedOrderData: {
    list: [
      { ...baseOrder, status: "EWC", supplementalOrderDetail: { ...normalized, status: "EWC" } },
      { ...baseOrder, orderNo: "WI00000002", status: "SHD", supplementalOrderDetail: shelvedSupplemental },
      { orderNo: "WI00000003", status: "TS", trackingList: [] },
    ],
  },
});
const multiEvidence = multiDerived.orderStatusEvidence as { orders: Record<string, unknown>[] };
assert(multiEvidence.orders.length === 3, "multi-order evidence count mismatch");
assert(multiEvidence.orders[0]?.warehouseArrivalVerified === true, "EWC status should verify warehouse arrival");
assert(multiEvidence.orders[1]?.actualShelveTime === "2026-08-02 12:00:00", "SHD actual shelve time lost");
assert(multiEvidence.orders[2]?.expectedSendwarehouseTime === null, "missing forecast should remain null");
assert(
  (multiEvidence.orders[2]?.dataCoverage as Record<string, unknown>).forecastWarehouseTime === "not_returned",
  "missing field coverage mismatch",
);

const formatPath = path.join(
  "experts", "inbound", "inbound-order-status", "nodes", "format-output.ts",
);
const formatted = runCodeNode(formatPath, {
  analysisResult: {
    structured: { actualWarehouseArrivalTime: "forged", expectedSendwarehouseTime: "forged" },
    analysis: "当前无异常。",
  },
  orderStatusEvidence: arrivedDerived.orderStatusEvidence,
});
const formattedStructured = formatted.structured as Record<string, unknown>;
assert(
  formattedStructured.actualWarehouseArrivalTime === "2026-08-01 08:30:00",
  "deterministic actual time must override LLM output",
);
assert(
  formattedStructured.expectedSendwarehouseTime === "2026-08-01 06:00:00",
  "deterministic forecast must override LLM output",
);
assert(
  String(formatted.analysis).includes("不能据此判断无异常"),
  "unsupported no-exception claim should be replaced",
);

const realFixtureFlag = process.argv.indexOf("--real-fixture");
if (realFixtureFlag >= 0) {
  const realFixtureArg = process.argv[realFixtureFlag + 1];
  assert(realFixtureArg, "--real-fixture requires a path");
  const realDoc = JSON.parse(fs.readFileSync(path.resolve(realFixtureArg), "utf8")) as {
    request?: { body?: { parameters?: Record<string, unknown> } };
    response?: { businessResponse?: unknown };
  };
  const parameters = realDoc.request?.body?.parameters ?? {};
  const realRow = coerceSupplementalDetailPayload(realDoc.response?.businessResponse);
  assert(realRow, "saved real response payload not recognized");
  const realNormalized = normalizeSupplementalDetail(realRow, String(parameters.customerCode ?? ""));
  assert(realNormalized, "saved real response ownership or normalization failed");

  const actionData = JSON.parse(String(parameters.data ?? "{}")) as Record<string, unknown>;
  assert(
    !actionData.orderNo || realNormalized.orderNo === String(actionData.orderNo).toUpperCase(),
    "saved real response order mismatch",
  );
  assert(realNormalized.forecast.expectedSendwarehouseTime, "real expected send time missing");
  assert(realNormalized.forecast.forecastWarehouseTime, "real forecast arrival time missing");

  const realSerialized = JSON.stringify(realNormalized);
  for (const forbidden of [
    "customerCode", "customerName", "username", "declarationAmount", "merchandiseList",
    "invoiceDeclaration", "shippingAddress",
  ]) {
    assert(!realSerialized.includes(forbidden), `real response leaked forbidden field: ${forbidden}`);
  }
  console.log("OK: saved real response normalized and sanitized");
}

console.log("OK: inbound-order-status supplemental detail tests passed");
