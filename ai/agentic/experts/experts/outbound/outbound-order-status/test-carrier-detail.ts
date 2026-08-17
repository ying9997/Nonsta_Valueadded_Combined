import { spawnSync } from "node:child_process";
import * as path from "node:path";

const expertDir = __dirname;
const repoRoot = path.resolve(expertDir, "..", "..", "..");
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

const id54Order = {
  documentNo: "WO12106863128",
  status: "DLI",
  statusName: "派送中",
  trackingNo: "YWPHX010044034795",
  deliveryWayName: "Winit Fulfillment-7日达(2-7 Business Days)-Zonal-US",
  packageList: [{ packageNum: "WO12106863128A", trackingNo: "YWPHX010044034795" }],
};

const build = runNode("build-carrier-detail-winit.ts", {
  rawOrderData: { list: [id54Order] },
  query: "YWPHX010044034795对应的是哪个渠道商",
  customerIntent: "查询实际末端派送商",
});

const actions = build.actions as Array<Record<string, unknown>>;
assert(actions.length === 1, "carrier query should build one id/55 action");
assert(actions[0]?.action === "queryOutboundOrder", "action must be queryOutboundOrder");
assert(
  JSON.parse(String(actions[0]?.data)).outboundOrderNum === "WO12106863128",
  "id/55 action must use resolved WO"
);

const id55Detail = {
  total: 1,
  list: [
    {
      outboundOrderNum: "WO12106863128",
      trackingNum: "YWPHX010044034795",
      carrier: "US YANWEN",
      carrierServiceCode: "US YANWEN Ground",
      carrierServiceName: "US YANWEN Ground",
      carrierHasChange: "O",
    },
  ],
};

const merged = runNode("merge-carrier-detail.ts", {
  rawOrderData: { list: [id54Order] },
  actionPlans: build.actionPlans,
  winitPluginOutputList: [{ code: 0, data: JSON.stringify(id55Detail), msg: "操作成功" }],
});

const mergedOrders = (merged.rawOrderData as { list: Array<Record<string, unknown>> }).list;
assert(mergedOrders[0]?.carrier === "US YANWEN", "id/55 carrier must merge into id/54 order");
const carrierFacts = merged.carrierFacts as Array<Record<string, unknown>>;
assert(carrierFacts[0]?.carrier === "US YANWEN", "carrierFacts must expose actual carrier");
assert(
  carrierFacts[0]?.carrierServiceName === "US YANWEN Ground",
  "carrierFacts must expose carrier service"
);
assert(carrierFacts[0]?.source === "queryOutboundOrder", "carrier source must be id/55");

const fallback = runNode("merge-carrier-detail.ts", {
  rawOrderData: { list: [id54Order] },
  actionPlans: build.actionPlans,
  winitPluginOutputList: [{ code: 500, data: "", msg: "upstream error" }],
});
const fallbackOrders = (fallback.rawOrderData as { list: Array<Record<string, unknown>> }).list;
assert(fallbackOrders[0]?.status === "DLI", "id/55 failure must preserve id/54 order");
assert((fallback.carrierFacts as unknown[]).length === 0, "failure must not invent carrier facts");

const formatted = runNode("format-output.ts", {
  analysisResult: {
    structured: { orderIds: ["WO12106863128"], status: "DLI（派送中）" },
    analysis: "出库单正在派送。",
  },
  carrierFacts,
  inputContext: { chainId: "carrier-regression" },
});
const structured = formatted.structured as Record<string, unknown>;
const outputCarriers = structured.carriers as Array<Record<string, unknown>>;
assert(outputCarriers[0]?.carrier === "US YANWEN", "format-output must include deterministic carriers");
assert(
  outputCarriers[0]?.carrierServiceName === "US YANWEN Ground",
  "format-output must retain deterministic carrier service"
);

console.log("outbound carrier detail regression: PASS");
