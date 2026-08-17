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
    ["-r", "ts-node/register/transpile-only", path.join(expertDir, "nodes", file), JSON.stringify(params)],
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

const order = {
  documentNo: "WO90000000001",
  status: "CF",
  warehouseCode: "USAA1",
  warehouseName: "Synthetic Warehouse",
  packageList: [
    { packageNum: "WO90000000001A", trackingNos: ["TRACK-A"] },
    { packageNum: "WO90000000001B", trackingNos: ["TRACK-B"] },
  ],
};

// 1. 中文时效意图触发；2. 跟踪号只匹配对应子单；3. payload 三字段固定。
const trackingBuild = runNode("build-outbound-timing-detail.ts", {
  rawOrderData: { list: [order] },
  outboundOrderNos: ["TRACK-B"],
  query: "TRACK-B 的货物什么时候发货？",
  customerIntent: "查询预计出库时间",
});
assert(trackingBuild.timingIntentMatched === true, "timing intent must be detected");
const trackingActions = trackingBuild.actions as Array<Record<string, unknown>>;
assert(trackingActions.length === 1, "tracking query must call only its matching package");
assert(trackingActions[0]?.action === "wh.outbound.getPackageDetail", "timing action name mismatch");
assert(
  JSON.stringify(JSON.parse(String(trackingActions[0]?.data))) ===
    JSON.stringify({ shippingNo: "WO90000000001B", orderNo: "WO90000000001", containerSerno: "" }),
  "timing payload must contain exact shippingNo/orderNo/containerSerno"
);

// 4. 普通状态查询不触发额外接口。
const negativeBuild = runNode("build-outbound-timing-detail.ts", {
  rawOrderData: { list: [order] },
  outboundOrderNos: ["TRACK-B"],
  query: "这个订单现在是什么状态？",
  customerIntent: "查询状态",
});
assert((negativeBuild.actions as unknown[]).length === 0, "non-timing query must create zero timing actions");

// 5. 实际尺寸重量意图触发，并且 trackingNo 只匹配对应子单。
const measurementBuild = runNode("build-outbound-timing-detail.ts", {
  rawOrderData: { list: [order] },
  outboundOrderNos: ["TRACK-A"],
  query: "需要这票包裹的实际尺寸信息和重量",
  customerIntent: "查询实际长宽高与称重",
});
assert(measurementBuild.measurementIntentMatched === true, "measurement intent must be detected");
assert(measurementBuild.timingIntentMatched === false, "measurement-only query must not be timing intent");
assert((measurementBuild.actions as unknown[]).length === 1, "measurement query must call one matching package");
assert(
  (measurementBuild.actionPlans as Array<Record<string, unknown>>)[0]?.shippingNo === "WO90000000001A",
  "measurement query must keep the exact tracking-to-package mapping"
);

const unrelatedWeightBuild = runNode("build-outbound-timing-detail.ts", {
  rawOrderData: { list: [order] },
  outboundOrderNos: ["TRACK-A"],
  query: "这个产品有哪些重量限制？",
});
assert(
  (unrelatedWeightBuild.actions as unknown[]).length === 0,
  "generic product weight policy must not trigger package detail"
);

// 6. 主单查询覆盖全部子单并去重。
const mainBuild = runNode("build-outbound-timing-detail.ts", {
  rawOrderData: { list: [order, order] },
  outboundOrderNos: ["WO90000000001"],
  query: "这个出库单预计什么时候出库？",
});
assert((mainBuild.actions as unknown[]).length === 2, "main order query must dedupe and cover both packages");

// 7. 超过批处理上限不得静默截断。
const oversizedOrder = {
  ...order,
  packageList: Array.from({ length: 101 }, (_, index) => ({
    packageNum: `WO90000000001P${index}`,
    trackingNos: [`TRACK-${index}`],
  })),
};
const oversizedBuild = runNode("build-outbound-timing-detail.ts", {
  rawOrderData: { list: [oversizedOrder] },
  outboundOrderNos: ["WO90000000001"],
  query: "什么时候发货？",
});
assert(oversizedBuild.requiresNarrowing === true, "over-limit request must require narrowing");
assert((oversizedBuild.actions as unknown[]).length === 0, "over-limit request must not return partial actions");

const plan = (trackingBuild.actionPlans as Array<Record<string, unknown>>)[0];
const detail = {
  orderNo: "WO90000000001",
  shippingNo: "WO90000000001B",
  trackingNo: "TRACK-B",
  status: "CF",
  orderTime: "2026-01-02 09:00:00",
  estimateOutWhTimeLocal: "2026-01-02 19:00:00",
  estimateOutWhTime: "2026-01-03 07:00:00",
  outWhTime: null,
  warehouseCode: "USAA1",
  warehouseName: "Synthetic Warehouse",
  slaList: [{ slaName: "尾程派送", serviceStandardTime: 5, serviceCompletionTime: null, status: "IP" }],
  labelFileUrl: "https://sensitive.invalid/label.pdf",
  containerList: [{ internalId: 123 }],
  estimateWeight: 9.99,
  estimateVolume: 9.99,
  estimateContainerList: [
    { packageLength: 99, packageWidth: 99, packageHeight: 99, packageWeight: 99, packageVolume: 99 },
  ],
  actualWeight: 0.5,
  actualVolume: 0.003952,
  actualContainerList: [
    { packageLength: 38, packageWidth: 26, packageHeight: 4, packageWeight: 0.5, packageVolume: 0.003952 },
  ],
};

// 8. 成功响应提取本地/标准时间，过滤敏感和大字段。
const merged = runNode("merge-outbound-timing-detail.ts", {
  actionPlans: [plan],
  winitPluginOutputList: [{ code: 0, data: JSON.stringify(detail), msg: "操作成功" }],
  requiresNarrowing: false,
});
const timing = (merged.outboundTimingFacts as Array<Record<string, unknown>>)[0];
assert(timing.fetchStatus === "success", "usable detail must be success");
assert(timing.estimateOutWhTimeLocal === "2026-01-02 19:00:00", "local outbound time missing");
assert(timing.estimateOutWhTime === "2026-01-03 07:00:00", "standard outbound time missing");
assert(timing.expectedOutboundTime === "2026-01-03 07:00:00", "primary expected time must be retained");
assert(timing.expectedOutboundTimeBasis === "system", "display time basis must be explicit");
assert(!("labelFileUrl" in timing) && !("containerList" in timing), "sensitive or bulky fields must be dropped");

const measurement = (merged.packageMeasurementFacts as Array<Record<string, unknown>>)[0];
assert(measurement.fetchStatus === "success", "actual measurement must be success");
assert(measurement.actualWeightKg === 0.5, "actual weight must use actualWeight");
assert(measurement.actualVolumeM3 === 0.003952, "actual volume must use actualVolume");
const containers = measurement.actualContainers as Array<Record<string, unknown>>;
assert(containers[0]?.lengthCm === 38, "actual length must come from actualContainerList");
assert(containers[0]?.widthCm === 26, "actual width must come from actualContainerList");
assert(containers[0]?.heightCm === 4, "actual height must come from actualContainerList");
assert(containers[0]?.weightKg === 0.5, "actual container weight must be retained");
assert(JSON.stringify(measurement).includes("9.99") === false, "estimated values must not leak into actual facts");

// 9. 字符串化嵌套 data 兼容，并保留实际出库时间。
const completed = runNode("merge-outbound-timing-detail.ts", {
  actionPlans: [plan],
  winitPluginOutputList: [
    {
      code: "0",
      data: JSON.stringify({ data: JSON.stringify({ ...detail, outWhTime: "2026-01-02 18:30:00" }) }),
    },
  ],
});
assert(
  (completed.outboundTimingFacts as Array<Record<string, unknown>>)[0]?.outWhTime === "2026-01-02 18:30:00",
  "actual outbound time must survive nested response parsing"
);

// 10. code=0 空 data 与非零业务码必须分开。
const empty = runNode("merge-outbound-timing-detail.ts", {
  actionPlans: [plan],
  winitPluginOutputList: [{ code: 0, data: "", msg: "操作成功" }],
});
assert(
  (empty.outboundTimingFacts as Array<Record<string, unknown>>)[0]?.fetchStatus === "no_data",
  "empty success must be no_data"
);
const failed = runNode("merge-outbound-timing-detail.ts", {
  actionPlans: [plan],
  winitPluginOutputList: [{ code: "03010250006", data: "", msg: "synthetic error" }],
});
assert(
  (failed.outboundTimingFacts as Array<Record<string, unknown>>)[0]?.fetchStatus === "service_error",
  "non-zero code must be service_error"
);

// 11. 只有预估字段时，实际测量必须为 no_data；多箱实际值必须逐箱保留。
const estimateOnly = runNode("merge-outbound-timing-detail.ts", {
  actionPlans: [plan],
  winitPluginOutputList: [
    {
      code: 0,
      data: JSON.stringify({
        orderNo: "WO90000000001",
        shippingNo: "WO90000000001B",
        estimateWeight: 1.2,
        estimateVolume: 0.01,
        estimateContainerList: [{ packageLength: 10, packageWidth: 10, packageHeight: 10 }],
      }),
    },
  ],
});
const estimateOnlyMeasurement = (estimateOnly.packageMeasurementFacts as Array<Record<string, unknown>>)[0];
assert(estimateOnlyMeasurement.fetchStatus === "no_data", "estimate-only detail must not become actual data");
assert(!("actualWeightKg" in estimateOnlyMeasurement), "estimate weight must not fill actual weight");

const multiContainer = runNode("merge-outbound-timing-detail.ts", {
  actionPlans: [plan],
  winitPluginOutputList: [
    {
      code: 0,
      data: JSON.stringify({
        ...detail,
        actualContainerList: [
          { containerSerno: "C1", packageLength: 10, packageWidth: 8, packageHeight: 6, packageWeight: 0.2 },
          { containerSerno: "C2", packageLength: 20, packageWidth: 18, packageHeight: 16, packageWeight: 0.3 },
        ],
      }),
    },
  ],
});
assert(
  ((multiContainer.packageMeasurementFacts as Array<Record<string, unknown>>)[0]?.actualContainers as unknown[]).length === 2,
  "multiple actual containers must remain separate"
);

// 12. format-output 必须用确定性事实覆盖 LLM 同名字段。
const formatted = runNode("format-output.ts", {
  analysisResult: {
    structured: { outboundTimings: [{ estimateOutWhTimeLocal: "hallucinated" }] },
    analysis: "订单预计按查询结果出库。",
  },
  outboundTimingFacts: merged.outboundTimingFacts,
  packageMeasurementFacts: merged.packageMeasurementFacts,
  carrierFacts: [],
  inputContext: { chainId: "timing-regression" },
});
const outputTimings = (formatted.structured as Record<string, unknown>).outboundTimings as Array<
  Record<string, unknown>
>;
assert(outputTimings[0]?.estimateOutWhTimeLocal === "2026-01-02 19:00:00", "deterministic timing must win");
const outputMeasurements = (formatted.structured as Record<string, unknown>).packageMeasurements as Array<
  Record<string, unknown>
>;
assert(outputMeasurements[0]?.actualWeightKg === 0.5, "deterministic measurement must win");

// 13. 摘要超长时必须在完整标点处结束，不能截成“；4”一类残句。
const longAnalysis =
  "您的货物已于2026-01-02 18:30:00实际出库。当前状态为派送中；承运商为测试承运商；" +
  "这是用于填充摘要长度的说明文字。".repeat(12) +
  "最后一项不应被截断成残句。";
const summarized = runNode("format-output.ts", {
  analysisResult: { structured: {}, analysis: longAnalysis },
  carrierFacts: [],
  outboundTimingFacts: [],
});
const resultSummary = (summarized.outputContext as Record<string, unknown>).resultSummary as string;
assert(resultSummary.length <= 200, "result summary must keep its length limit");
assert(/[。！？；…]$/.test(resultSummary), "result summary must end at a readable boundary");

console.log("outbound timing and measurement detail regression: PASS (13 groups, skipped 0)");
