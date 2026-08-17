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

const order = { documentNo: "WO90000000001", packageList: [] };

const directBuild = runNode("build-outbound-return-detail.ts", {
  rawOrderData: { list: [] },
  outboundOrderNos: ["WO90000000001A"],
  query: "这个派送失败的订单退回到仓了吗？关联退货单是什么？",
});
assert(
  (directBuild.returnLookupMeta as Record<string, unknown>).intentMatched === true,
  "return fact intent must be detected"
);
assert((directBuild.actions as unknown[]).length === 1, "direct WO must query return order even without primary data");
const directAction = (directBuild.actions as Array<Record<string, unknown>>)[0]!;
assert(
  directAction.action === "rma.returnGoodsOrder.queryReturnOderList",
  "return action name mismatch"
);
assert(
  JSON.stringify(JSON.parse(String(directAction.data))) ===
    JSON.stringify({ outboundOrderNo: "WO90000000001", pageParams: { pageNo: 1, pageSize: 50 } }),
  "return query payload mismatch"
);

const resolvedBuild = runNode("build-outbound-return-detail.ts", {
  rawOrderData: { list: [order, order] },
  outboundOrderNos: ["TRACK-1"],
  query: "查询绑定的退货单状态",
});
assert((resolvedBuild.actions as unknown[]).length === 1, "resolved tracking input must dedupe WO actions");

const statusNegative = runNode("build-outbound-return-detail.ts", {
  rawOrderData: { list: [order] },
  outboundOrderNos: ["WO90000000001"],
  query: "这个出库单现在是什么状态？",
});
assert((statusNegative.actions as unknown[]).length === 0, "ordinary outbound status must not query returns");

const processNegative = runNode("build-outbound-return-detail.ts", {
  rawOrderData: { list: [order] },
  outboundOrderNos: ["WO90000000001"],
  query: "如何创建退货单？",
});
assert((processNegative.actions as unknown[]).length === 0, "return creation process must not trigger fact query");

const missingBuild = runNode("build-outbound-return-detail.ts", {
  rawOrderData: { list: [] },
  outboundOrderNos: ["TRACK-UNKNOWN"],
  query: "退货单到仓了吗？",
});
assert(
  (missingBuild.returnLookupMeta as Record<string, unknown>).missingOutboundOrderNo === true,
  "missing WO must be explicit"
);

const oversizedBuild = runNode("build-outbound-return-detail.ts", {
  rawOrderData: {
    list: Array.from({ length: 101 }, (_, index) => ({ documentNo: `WO9${String(index).padStart(10, "0")}` })),
  },
  query: "查询这些订单关联的退货单",
});
assert(
  (oversizedBuild.returnLookupMeta as Record<string, unknown>).requiresNarrowing === true,
  "over-limit return query must require narrowing"
);
assert((oversizedBuild.actions as unknown[]).length === 0, "over-limit return query must not silently truncate");

const successMerge = runNode("merge-outbound-return-detail.ts", {
  actionPlans: [{ outboundOrderNo: "WO90000000001" }],
  returnLookupMeta: { intentMatched: true },
  winitPluginOutputList: [
    {
      code: 0,
      data: JSON.stringify({
        pageParams: { pageNo: 1, pageSize: 50, totalCount: 2 },
        list: [
          {
            returnGoodsOrderNo: "RT16000000000001CN",
            outboundOrderNo: "WO90000000001",
            retrunReason: "DF",
            status: "OC",
            warehouseCode: "USKY5",
            completeTime: "2026-07-29 09:16:00",
            qtyItemNum: 1,
            shelveGoodsList: [{}],
          },
          {
            returnGoodsOrderNo: "RT-OTHER",
            outboundOrderNo: "WO90000000999",
            status: "CP",
          },
        ],
      }),
    },
  ],
});
const facts = successMerge.returnOrderFacts as Array<Record<string, unknown>>;
assert(facts.length === 1, "merge must retain only exact outbound matches");
assert(facts[0]?.returnReasonName === "派送失败", "DF must map to delivery failure");
assert(facts[0]?.statusName === "已完成", "OC must map to completed");
assert(facts[0]?.shelveGoodsCount === 1, "shelved goods count mismatch");
const successResult = (successMerge.returnLookupResults as Array<Record<string, unknown>>)[0]!;
assert(successResult.fetchStatus === "success", "matched return must be success");
assert(successResult.partial === false, "unrelated rows must not make a complete page partial");

const aliasMerge = runNode("merge-outbound-return-detail.ts", {
  actionPlans: [{ outboundOrderNo: "WO90000000001" }],
  winitPluginOutputList: [
    {
      code: "0",
      data: { list: [{ returnGoodsOrderNo: "RT2", outboundOrderNo: "WO90000000001", status: "CP" }] },
    },
  ],
});
assert(
  (aliasMerge.returnOrderFacts as Array<Record<string, unknown>>)[0]?.statusName === "已完成",
  "CP compatibility mapping must be kept"
);

const noDataMerge = runNode("merge-outbound-return-detail.ts", {
  actionPlans: [{ outboundOrderNo: "WO90000000001" }],
  winitPluginOutputList: [{ code: 0, data: JSON.stringify({ pageParams: { totalCount: 0 }, list: [] }) }],
});
assert(
  (noDataMerge.returnLookupResults as Array<Record<string, unknown>>)[0]?.fetchStatus === "no_data",
  "successful empty response must be no_data"
);

const errorMerge = runNode("merge-outbound-return-detail.ts", {
  actionPlans: [{ outboundOrderNo: "WO90000000001" }],
  winitPluginOutputList: [{ code: 1, msg: "03010250006", data: "用户不存在" }],
});
assert(
  (errorMerge.returnLookupResults as Array<Record<string, unknown>>)[0]?.fetchStatus === "service_error",
  "business failure must not become no_data"
);

const formattedSuccess = runNode("format-output.ts", {
  analysisResult: { structured: {}, analysis: "订单已完成原出库流程。" },
  returnOrderFacts: facts,
  returnLookupResults: successMerge.returnLookupResults,
  returnLookupMeta: { intentMatched: true },
  prunedOrderData: { list: [order] },
  language: "zh-CN",
});
assert(
  String(formattedSuccess.analysis).includes("RT16000000000001CN") &&
    String(formattedSuccess.analysis).includes("派送失败"),
  "format output must deterministically include return facts"
);
assert(
  Array.isArray((formattedSuccess.structured as Record<string, unknown>).returnOrders),
  "format output must expose structured return orders"
);

const formattedError = runNode("format-output.ts", {
  analysisResult: { structured: {}, analysis: "" },
  returnOrderFacts: [],
  returnLookupResults: errorMerge.returnLookupResults,
  returnLookupMeta: { intentMatched: true },
  prunedOrderData: { list: [order] },
  language: "zh-CN",
});
assert(
  String(formattedError.analysis).includes("不能据此判断不存在退货单"),
  "service error fallback must not become no return order"
);

console.log("outbound return tests passed");
