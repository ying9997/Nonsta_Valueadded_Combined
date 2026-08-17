/**
 * 节点：对出库单返回 JSON 执行剪枝
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | rawOrderData | Record<string, unknown> | 含 `list` 数组的万邑通原始结构 |
 * | maxPackagesPerOrder | number（可选） | 每单保留包裹数上限；默认见 DEFAULT_CONFIG |
 * | maxMerchandisePerPackage | number（可选） | 每包裹商品行上限 |
 * | includeItemList | boolean（可选） | 是否保留商品明细行 |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | prunedOrderData | Record<string, unknown> | `list` 已剪枝；每单可能含 **`isPlatformWaybill`**（见下）；根级 `_pruneMeta` |
 * | _pruneMeta | PruneMeta | 本文件内 interface：original/retained 包裹数、truncatedPackages 等 |
 *
 * **平台面单**（`list[]` 每项上 `isPlatformWaybill: boolean`）：`winitProductCode` 以 `OSF822` 开头（大小写不敏感），**或** `orderWinitProductName` 含 `3PL`（大小写不敏感）。
 */

// ========== 类型（本文件内闭环） ==========
interface PruneConfig {
  maxPackagesPerOrder: number;
  maxMerchandisePerPackage: number;
  includeItemList: boolean;
}

interface TruncatedPackageInfo {
  packageNum?: string;
  retainedMerchandise: number;
  originalMerchandise: number;
}

interface PruneMeta {
  originalPackageCount: number;
  retainedPackageCount: number;
  truncatedPackages: TruncatedPackageInfo[];
}

// ========== 默认配置 ==========
const DEFAULT_CONFIG: PruneConfig = {
  maxPackagesPerOrder: 10,
  maxMerchandisePerPackage: 20,
  includeItemList: false,
};

/** 平台面单：产品码 OSF822*，或下单产品名含 3PL */
function isPlatformWaybillOrder(o: Record<string, unknown>): boolean {
  const code = String(o.winitProductCode ?? "").trim().toUpperCase();
  if (code.startsWith("OSF822")) return true;
  const orderName = String(o.orderWinitProductName ?? "");
  if (orderName.toUpperCase().includes("3PL")) return true;
  return false;
}

/** 订单实际生效的产品编码：优先 orderWinitProductCode，回退 winitProductCode */
function effectiveProductCodeForOrder(o: Record<string, unknown>): string {
  return String(o.orderWinitProductCode || o.winitProductCode || "").trim();
}

/** 订单实际生效的产品名称：优先 orderWinitProductName，回退 winitProductName */
function effectiveProductNameForOrder(o: Record<string, unknown>): string {
  return String(o.orderWinitProductName || o.winitProductName || "").trim();
}

// ========== 主逻辑 ==========
function pruneMerchandiseList(
  merchandiseList: unknown[],
  maxMerchandise: number,
  includeItemList: boolean
): { pruned: unknown[]; originalCount: number } {
  const originalCount = merchandiseList.length;
  if (originalCount <= maxMerchandise) {
    const pruned = includeItemList
      ? merchandiseList
      : merchandiseList.map((m) => {
          const copy = { ...(m as Record<string, unknown>) };
          delete copy.itemList;
          delete copy.batchList;
          return copy;
        });
    return { pruned, originalCount };
  }

  const pruned = merchandiseList.slice(0, maxMerchandise).map((m) => {
    const copy = { ...(m as Record<string, unknown>) };
    if (!includeItemList) {
      delete copy.itemList;
      delete copy.batchList;
    }
    return copy;
  });
  (pruned as Record<string, unknown>[]).push({
    _truncated: true,
    _remainingCount: originalCount - maxMerchandise,
  });
  return { pruned, originalCount };
}

function prunePackageList(
  packageList: unknown[],
  maxPackages: number,
  maxMerchandise: number,
  includeItemList: boolean
): { pruned: unknown[]; meta: TruncatedPackageInfo[] } {
  const originalCount = packageList.length;
  const truncatedPackages: TruncatedPackageInfo[] = [];

  if (originalCount <= maxPackages) {
    const pruned = packageList.map((pkg) => {
      const p = pkg as Record<string, unknown>;
      const merchList = (p.merchandiseList as unknown[]) ?? [];
      const { pruned: prunedMerch } = pruneMerchandiseList(merchList, maxMerchandise, includeItemList);
      const copy = { ...p };
      if (merchList.length > 0) copy.merchandiseList = prunedMerch;
      if (merchList.length > maxMerchandise) {
        truncatedPackages.push({
          packageNum: p.packageNum as string,
          retainedMerchandise: maxMerchandise,
          originalMerchandise: merchList.length,
        });
      }
      return copy;
    });
    return { pruned, meta: truncatedPackages };
  }

  const retained = packageList.slice(0, maxPackages).map((pkg) => {
    const p = pkg as Record<string, unknown>;
    const merchList = (p.merchandiseList as unknown[]) ?? [];
    const { pruned: prunedMerch } = pruneMerchandiseList(merchList, maxMerchandise, includeItemList);
    const copy = { ...p };
    if (merchList.length > 0) copy.merchandiseList = prunedMerch;
    if (merchList.length > maxMerchandise) {
      truncatedPackages.push({
        packageNum: p.packageNum as string,
        retainedMerchandise: maxMerchandise,
        originalMerchandise: merchList.length,
      });
    }
    return copy;
  });

  (retained as Record<string, unknown>[]).push({
    _truncated: true,
    _remainingCount: originalCount - maxPackages,
  });

  return {
    pruned: retained,
    meta: truncatedPackages,
  };
}

function pruneOrderList(
  list: unknown[],
  config: PruneConfig
): { prunedList: unknown[]; pruneMeta: PruneMeta } {
  let totalOriginalPackages = 0;
  let totalRetainedPackages = 0;
  const allTruncatedPackages: TruncatedPackageInfo[] = [];

  const prunedList = list.map((order) => {
    const o = order as Record<string, unknown>;
    const packageList = (o.packageList as unknown[]) ?? [];
    totalOriginalPackages += packageList.length;

    const { pruned, meta } = prunePackageList(
      packageList,
      config.maxPackagesPerOrder,
      config.maxMerchandisePerPackage,
      config.includeItemList
    );

    const retainedCount = Array.isArray(pruned)
      ? pruned.filter((p) => !(p as Record<string, unknown>)._truncated).length
      : 0;
    totalRetainedPackages += retainedCount;
    allTruncatedPackages.push(...meta);

    return { ...o, packageList: pruned, isPlatformWaybill: isPlatformWaybillOrder(o), effectiveProductCode: effectiveProductCodeForOrder(o), effectiveProductName: effectiveProductNameForOrder(o) };
  });

  const pruneMeta: PruneMeta = {
    originalPackageCount: totalOriginalPackages,
    retainedPackageCount: totalRetainedPackages,
    truncatedPackages: allTruncatedPackages,
  };

  return { prunedList, pruneMeta };
}

/** Coze 入口 */
async function main({ params }: { params: Record<string, unknown> }) {
  const rawOrderData = (params.rawOrderData ?? {}) as Record<string, unknown>;
  const list = (rawOrderData.list as unknown[]) ?? [];

  const config: PruneConfig = {
    maxPackagesPerOrder: (params.maxPackagesPerOrder as number) ?? DEFAULT_CONFIG.maxPackagesPerOrder,
    maxMerchandisePerPackage:
      (params.maxMerchandisePerPackage as number) ?? DEFAULT_CONFIG.maxMerchandisePerPackage,
    includeItemList: (params.includeItemList as boolean) ?? DEFAULT_CONFIG.includeItemList,
  };

  const { prunedList, pruneMeta } = pruneOrderList(list, config);

  const prunedOrderData = { ...rawOrderData, list: prunedList, _pruneMeta: pruneMeta };

  const ret = {
    "prunedOrderData": prunedOrderData,
    "_pruneMeta": pruneMeta,
  };
  return ret;
}

// 仅当以本文件为入口运行时执行，Coze 不会触发
if (typeof process !== "undefined" && process.argv[1]?.includes("prune-outbound-json")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
