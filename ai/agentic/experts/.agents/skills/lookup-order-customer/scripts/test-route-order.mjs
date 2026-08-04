#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const router = path.join(scriptDir, "route-order.mjs");

function route(identifier, hint = "") {
  const args = [router, identifier, "--json"];
  if (hint) args.push("--hint", hint);
  return JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" }));
}

const cases = [
  ["WI49616707", "", "inbound-order", "supported"],
  ["WO11375010754", "", "outbound-order", "supported"],
  ["V106075100", "", "value-add-order", "supported"],
  ["VASC000000294237", "", "value-add-order", "supported"],
  ["TO20260310001", "", "transport-order", "partial"],
  ["CLM20250401001", "", "claim-order", "gap"],
  ["POD-20250401-001", "", "pod-record", "partial"],
  ["TA240710381", "", "tracking-inquiry-record", "partial"],
  ["opaque-booking-id", "预约单", "booking-order", "supported"],
  ["opaque-identifier", "", "unknown-identifier", "gap"]
];

for (const [identifier, hint, expectedId, expectedStatus] of cases) {
  const result = route(identifier, hint);
  const candidate = result.candidates[0];
  assert.equal(candidate.id, expectedId, `${identifier} should route to ${expectedId}`);
  assert.equal(candidate.status, expectedStatus, `${identifier} should be ${expectedStatus}`);
  assert.deepEqual(result.fallbackFields, ["customerCode", "customerName", "username"]);
}

console.log(`Route regression: PASS (${cases.length} cases)`);
