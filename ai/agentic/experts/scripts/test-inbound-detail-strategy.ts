#!/usr/bin/env npx ts-node
/**
 * 单元测试：inbound getOrderDetail detailLevel / extract / aggregate
 */
import {
  buildInboundDetailActions,
  extractInboundOrderDetail,
  aggregateSkuPutaway,
  aggregatePackagePutaway,
  resolveDetailLevel,
  isIncludePackageForLevel,
} from "../shared/inbound-get-order-detail";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// header → N
assert(isIncludePackageForLevel("header") === "N", "header should be N");
assert(isIncludePackageForLevel("sku_summary") === "Y", "sku_summary should be Y");

const batchN = buildInboundDetailActions(["WI123"], [], "header");
const dataN = JSON.parse(batchN.actions[0]!.data);
assert(dataN.isIncludePackage === "N", "build header should request N");

const batchY = buildInboundDetailActions(["WI123"], [], "sku_summary");
const dataY = JSON.parse(batchY.actions[0]!.data);
assert(dataY.isIncludePackage === "Y", "build sku_summary should request Y");

const mockOrder = {
  orderNo: "WI123",
  totalPackageQty: 3,
  totalMerchandiseQty: 100,
  packageList: [{ packageNo: "P1", status: "SCP" }, { packageNo: "P2", status: "UD" }],
  merchandiseList: [
    { merchandiseCode: "SKU-A", quantity: 50, actualQuantity: 50 },
    { merchandiseCode: "SKU-B", quantity: 50, actualQuantity: 30 },
  ],
};

const { order: skuOrder, meta: skuMeta } = extractInboundOrderDetail(mockOrder, {
  detailLevel: "sku_summary",
});
assert(skuOrder.packageList === undefined, "sku_summary should drop packageList");
assert(Array.isArray(skuOrder.merchandiseList), "sku_summary should keep merchandiseList");
assert(skuMeta.packagesDiscarded === true, "packagesDiscarded flag");

const skuSummary = aggregateSkuPutaway(skuOrder.merchandiseList as unknown[]);
assert(skuSummary.totalSkus === 2, "totalSkus");
assert(skuSummary.completedSkus === 1, "completedSkus");
assert(skuSummary.partialSkus === 1, "partialSkus");
assert(skuSummary.anomalySkus.length === 1, "anomalySkus");

const { order: pkgSummaryOrder } = extractInboundOrderDetail(mockOrder, {
  detailLevel: "package_summary",
});
const pkgSummary = aggregatePackagePutaway(pkgSummaryOrder);
assert(pkgSummary.byStatus.SCP === 1, "package byStatus SCP");
assert(pkgSummary.byStatus.UD === 1, "package byStatus UD");

const level = resolveDetailLevel({ checkPackageQty: true }, "header");
assert(level === "package_summary", "checkPackageQty upgrades to package_summary");

console.log("OK: inbound-get-order-detail tests passed");
