/**
 * 入库单 getOrderDetail 详情分层：detailLevel ↔ isIncludePackage、extract、SKU/包裹聚合
 * 官方 id/39：N 不返回 merchandiseList/packageList；无包裹分页 API
 */

export const INBOUND_DETAIL_ACTION = "winit.wh.inbound.getOrderDetail";

export type DetailLevel =
  | "header"
  | "sku_summary"
  | "sku_filtered"
  | "package_summary"
  | "package_detail"
  | "item_lookup";

export type IsIncludePackage = "Y" | "N";

export interface DetailExtractOptions {
  detailLevel: DetailLevel;
  targetMerchandiseCodes?: string[];
  targetPackageNos?: string[];
  targetItemSernos?: string[];
  maxPackagesPerOrder?: number;
  maxMerchandisePerPackage?: number;
  packageFetchThreshold?: number;
}

export interface DetailExtractMeta {
  detailLevel: DetailLevel;
  originalPackageCount: number;
  packagesDiscarded: boolean;
  merchandiseRowCount: number;
  requiresNarrowing?: boolean;
  largeOrderSkuOnly?: boolean;
  packagesRetained?: number;
}

export interface SkuPutawaySummary {
  totalSkus: number;
  completedSkus: number;
  partialSkus: number;
  pendingSkus: number;
  putawayRate: number;
  anomalySkus: Array<{
    merchandiseCode: string;
    quantity: number;
    actualQuantity: number;
    inspectionQty?: number;
  }>;
  targetSkusOnly: boolean;
}

export interface PackagePutawaySummary {
  totalPackages: number;
  byStatus: Record<string, number>;
  recentUnshelvedSample: Array<{
    packageNo?: string;
    sellerCaseNo?: string;
    status?: string;
    unloadingTime?: string;
    shelvesTime?: string;
  }>;
  expectedPackages?: number;
  receivedPackages?: number;
  discrepancy?: number;
}

const PLUGIN_BATCH_MAX_DEFAULT = 100;
const DEFAULT_MAX_PACKAGES = 50;
const DEFAULT_MAX_MERCH_PER_PKG = 20;
const DEFAULT_PACKAGE_THRESHOLD = 200;

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter(Boolean);
}

export function getPluginBatchMaxActions(): number {
  if (typeof process !== "undefined" && process.env?.COZE_WINIT_PLUGIN_BATCH_MAX) {
    const n = Number(process.env.COZE_WINIT_PLUGIN_BATCH_MAX);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return PLUGIN_BATCH_MAX_DEFAULT;
}

export function isIncludePackageForLevel(level: DetailLevel): IsIncludePackage {
  return level === "header" ? "N" : "Y";
}

/** 解析 detailLevel：兼容 includePackageDetails / checkPackageQty */
export function resolveDetailLevel(
  params: Record<string, unknown>,
  defaultLevel: DetailLevel
): DetailLevel {
  if (params.includePackageDetails === true) return "package_detail";
  const raw = str(params.detailLevel);
  const levels: DetailLevel[] = [
    "header",
    "sku_summary",
    "sku_filtered",
    "package_summary",
    "package_detail",
    "item_lookup",
  ];
  if (raw && levels.includes(raw as DetailLevel)) return raw as DetailLevel;
  if (params.checkPackageQty === true && defaultLevel === "header") return "package_summary";
  return defaultLevel;
}

/** 统一官方字段名与历史别名 */
export function normalizeInboundOrderFields(order: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...order };
  if (!copy.packageList && Array.isArray(copy.inboundPackageVos)) {
    copy.packageList = copy.inboundPackageVos;
  }
  if (!copy.merchandiseList && Array.isArray(copy.inboundMerchandiseVos)) {
    copy.merchandiseList = copy.inboundMerchandiseVos;
  }
  return copy;
}

export type InboundDetailActionPlan = {
  inputToken: string;
  queryBy: "orderNo" | "customerOrderNo";
};

export function buildInboundDetailActions(
  wiOrderNos: string[],
  customerRefNos: string[],
  detailLevel: DetailLevel
): {
  actions: Array<{ action: string; data: string }>;
  actionPlans: InboundDetailActionPlan[];
  winitPluginBatchActionsCount: number;
  actionName: string;
  detailLevel: DetailLevel;
  isIncludePackage: IsIncludePackage;
} {
  const actionPlans: InboundDetailActionPlan[] = [];
  for (const no of wiOrderNos) {
    if (no?.trim()) actionPlans.push({ inputToken: no.trim(), queryBy: "orderNo" });
  }
  for (const ref of customerRefNos) {
    if (ref?.trim()) actionPlans.push({ inputToken: ref.trim(), queryBy: "customerOrderNo" });
  }

  const isIncludePackage = isIncludePackageForLevel(detailLevel);
  const maxActions = getPluginBatchMaxActions();
  const forPlugin = actionPlans.slice(0, maxActions);

  const actions = forPlugin.map((p) => {
    const data: Record<string, string> = { isIncludePackage };
    if (p.queryBy === "orderNo") data.orderNo = p.inputToken;
    else data.customerOrderNo = p.inputToken;
    return { action: INBOUND_DETAIL_ACTION, data: JSON.stringify(data) };
  });

  return {
    actions,
    actionPlans: forPlugin,
    winitPluginBatchActionsCount: actions.length,
    actionName: INBOUND_DETAIL_ACTION,
    detailLevel,
    isIncludePackage,
  };
}

function pruneMerchandiseList(
  merchandiseList: unknown[],
  maxMerchandise: number,
  includeItemList: boolean
): unknown[] {
  const mapRow = (m: unknown) => {
    const copy = { ...(m as Record<string, unknown>) };
    if (!includeItemList) {
      delete copy.itemList;
      delete copy.batchList;
    }
    return copy;
  };
  if (merchandiseList.length <= maxMerchandise) {
    return merchandiseList.map(mapRow);
  }
  const pruned = merchandiseList.slice(0, maxMerchandise).map(mapRow);
  pruned.push({ _truncated: true, _remainingCount: merchandiseList.length - maxMerchandise });
  return pruned;
}

function prunePackageList(
  packageList: unknown[],
  maxPackages: number,
  maxMerchandise: number,
  includeItemList: boolean,
  targetPackageNos?: string[]
): unknown[] {
  let list = packageList;
  if (targetPackageNos?.length) {
    const targets = new Set(targetPackageNos.map((t) => t.toUpperCase()));
    list = packageList.filter((pkg) => {
      const p = pkg as Record<string, unknown>;
      const keys = [p.packageNo, p.sellerCaseNo, p.packageNum, p.barcode].map(str);
      return keys.some((k) => k && targets.has(k.toUpperCase()));
    });
  }

  if (list.length <= maxPackages) {
    return list.map((pkg) => {
      const p = pkg as Record<string, unknown>;
      const merchList = (p.merchandiseList as unknown[]) ?? [];
      const copy = { ...p };
      if (merchList.length > 0) {
        copy.merchandiseList = pruneMerchandiseList(merchList, maxMerchandise, includeItemList);
      }
      if (!includeItemList) delete copy.itemList;
      return copy;
    });
  }

  const sorted = [...list].sort((a, b) => {
    const pa = a as Record<string, unknown>;
    const pb = b as Record<string, unknown>;
    const sa = str(pa.status).toUpperCase();
    const sb = str(pb.status).toUpperCase();
    const unshelved = (s: string) => (s === "SCP" || s === "SHD" ? 1 : 0);
    if (unshelved(sa) !== unshelved(sb)) return unshelved(sa) - unshelved(sb);
    return str(pb.unloadingTime ?? pb.shelvesTime).localeCompare(str(pa.unloadingTime ?? pa.shelvesTime));
  });

  const retained = sorted.slice(0, maxPackages).map((pkg) => {
    const p = pkg as Record<string, unknown>;
    const merchList = (p.merchandiseList as unknown[]) ?? [];
    const copy = { ...p };
    if (merchList.length > 0) {
      copy.merchandiseList = pruneMerchandiseList(merchList, maxMerchandise, includeItemList);
    }
    return copy;
  });
  retained.push({ _truncated: true, _remainingCount: list.length - maxPackages });
  return retained;
}

function filterItemLookup(packageList: unknown[], targetItemSernos: string[]): unknown[] {
  const targets = new Set(targetItemSernos.map((t) => t.toUpperCase()));
  const out: unknown[] = [];
  for (const pkg of packageList) {
    const p = pkg as Record<string, unknown>;
    const merchList = (p.merchandiseList as unknown[]) ?? [];
    const keptMerch: unknown[] = [];
    for (const m of merchList) {
      const row = m as Record<string, unknown>;
      const items = (row.itemList as unknown[]) ?? [];
      const hitItems = items.filter((it) => {
        const i = it as Record<string, unknown>;
        return targets.has(str(i.itemSerno).toUpperCase());
      });
      if (hitItems.length > 0) {
        keptMerch.push({ ...row, itemList: hitItems });
      }
    }
    if (keptMerch.length > 0) {
      out.push({ ...p, merchandiseList: keptMerch });
    }
  }
  return out;
}

export function extractInboundOrderDetail(
  order: Record<string, unknown>,
  options: DetailExtractOptions
): { order: Record<string, unknown>; meta: DetailExtractMeta } {
  const normalized = normalizeInboundOrderFields(order);
  const level = options.detailLevel;
  const maxPackages = options.maxPackagesPerOrder ?? DEFAULT_MAX_PACKAGES;
  const maxMerch = options.maxMerchandisePerPackage ?? DEFAULT_MAX_MERCH_PER_PKG;
  const threshold = options.packageFetchThreshold ?? DEFAULT_PACKAGE_THRESHOLD;
  const targetSkus = arr(options.targetMerchandiseCodes as unknown);
  const targetPkgs = arr(options.targetPackageNos as unknown);
  const targetItems = arr(options.targetItemSernos as unknown);

  const packageList = (normalized.packageList as unknown[]) ?? [];
  const merchandiseList = (normalized.merchandiseList as unknown[]) ?? [];
  const totalPackageQty = num(normalized.totalPackageQty) || packageList.length;

  const meta: DetailExtractMeta = {
    detailLevel: level,
    originalPackageCount: packageList.length,
    packagesDiscarded: false,
    merchandiseRowCount: merchandiseList.length,
  };

  const copy = { ...normalized };

  if (level === "header") {
    delete copy.packageList;
    delete copy.inboundPackageVos;
    delete copy.merchandiseList;
    delete copy.inboundMerchandiseVos;
    meta.packagesDiscarded = packageList.length > 0;
    return { order: copy, meta };
  }

  if (level === "sku_summary" || level === "sku_filtered") {
    delete copy.packageList;
    delete copy.inboundPackageVos;
    meta.packagesDiscarded = packageList.length > 0;
    if (totalPackageQty > threshold) meta.largeOrderSkuOnly = true;

    let merch = merchandiseList;
    if (level === "sku_filtered" && targetSkus.length > 0) {
      const set = new Set(targetSkus.map((s) => s.toUpperCase()));
      merch = merchandiseList.filter((m) => {
        const code = str((m as Record<string, unknown>).merchandiseCode).toUpperCase();
        return set.has(code);
      });
      meta.merchandiseRowCount = merch.length;
    }
    copy.merchandiseList = merch;
    delete copy.inboundMerchandiseVos;
    return { order: copy, meta };
  }

  if (level === "package_summary") {
    delete copy.packageList;
    delete copy.inboundPackageVos;
    meta.packagesDiscarded = true;
    copy._packageListForAggregate = packageList;
    return { order: copy, meta };
  }

  if (level === "package_detail" || level === "item_lookup") {
    if (
      totalPackageQty > threshold &&
      targetPkgs.length === 0 &&
      targetItems.length === 0
    ) {
      delete copy.packageList;
      delete copy.inboundPackageVos;
      meta.requiresNarrowing = true;
      meta.packagesDiscarded = true;
      return { order: copy, meta };
    }

    const includeItemList = level === "item_lookup";
    let pruned: unknown[];
    if (level === "item_lookup" && targetItems.length > 0) {
      pruned = filterItemLookup(packageList, targetItems);
    } else {
      pruned = prunePackageList(packageList, maxPackages, maxMerch, includeItemList, targetPkgs);
    }
    copy.packageList = pruned;
    delete copy.inboundPackageVos;
    meta.packagesRetained = pruned.filter((p) => !(p as Record<string, unknown>)._truncated).length;
    return { order: copy, meta };
  }

  return { order: copy, meta };
}

export function extractInboundDetailBatch(
  rawOrderData: Record<string, unknown>,
  options: DetailExtractOptions
): {
  rawOrderData: Record<string, unknown>;
  _detailExtractMeta: { orders: DetailExtractMeta[]; requiresNarrowing: boolean };
} {
  const list = (rawOrderData.list as unknown[]) ?? [];
  const extracted: unknown[] = [];
  const metas: DetailExtractMeta[] = [];
  let requiresNarrowing = false;

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { order, meta } = extractInboundOrderDetail(item as Record<string, unknown>, options);
    extracted.push(order);
    metas.push(meta);
    if (meta.requiresNarrowing) requiresNarrowing = true;
  }

  return {
    rawOrderData: { ...rawOrderData, list: extracted, _detailExtractMeta: { orders: metas, requiresNarrowing } },
    _detailExtractMeta: { orders: metas, requiresNarrowing },
  };
}

function effectiveParts(row: Record<string, unknown>): number {
  const spn = num(row.standardPartsNum);
  return spn > 0 ? spn : 1;
}

export function aggregateSkuPutaway(
  merchandiseList: unknown[],
  targetMerchandiseCodes?: string[]
): SkuPutawaySummary {
  let rows = merchandiseList.filter((m) => m && typeof m === "object") as Record<string, unknown>[];
  const targetSkusOnly = (targetMerchandiseCodes?.length ?? 0) > 0;
  if (targetSkusOnly) {
    const set = new Set(targetMerchandiseCodes!.map((s) => s.toUpperCase()));
    rows = rows.filter((r) => set.has(str(r.merchandiseCode).toUpperCase()));
  }

  let completedSkus = 0;
  let partialSkus = 0;
  let pendingSkus = 0;
  const anomalySkus: SkuPutawaySummary["anomalySkus"] = [];

  for (const row of rows) {
    const parts = effectiveParts(row);
    const expected = num(row.quantity) * parts;
    const actual = num(row.actualQuantity) * parts;
    const inspectionQty = num(row.inspectionQty) * parts;

    if (actual >= expected && expected > 0) completedSkus++;
    else if (actual > 0) partialSkus++;
    else pendingSkus++;

    // 以验收量为准判断异常：验收量存在时用它比较，否则回退到上架量
    // 避免「已验收通过但未上架」被误判为数量差异
    const effectiveReceived = inspectionQty > 0 ? inspectionQty : actual;
    if (expected > 0 && effectiveReceived !== expected) {
      anomalySkus.push({
        merchandiseCode: str(row.merchandiseCode),
        quantity: expected,
        actualQuantity: actual,
        inspectionQty: inspectionQty || undefined,
      });
    }
  }

  const totalSkus = rows.length;
  const putawayRate = totalSkus > 0 ? Math.round((completedSkus / totalSkus) * 100) / 100 : 0;

  return {
    totalSkus,
    completedSkus,
    partialSkus,
    pendingSkus,
    putawayRate,
    anomalySkus: anomalySkus.slice(0, 50),
    targetSkusOnly,
  };
}

export function aggregatePackagePutaway(
  order: Record<string, unknown>,
  packageListOverride?: unknown[]
): PackagePutawaySummary {
  const packageList =
    packageListOverride ??
    (order._packageListForAggregate as unknown[]) ??
    (order.packageList as unknown[]) ??
    [];
  const byStatus: Record<string, number> = {};
  const unshelved: PackagePutawaySummary["recentUnshelvedSample"] = [];

  for (const pkg of packageList) {
    if (!pkg || typeof pkg !== "object") continue;
    const p = pkg as Record<string, unknown>;
    if (p._truncated) continue;
    const status = str(p.status) || "UNKNOWN";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    const shelved = ["SCP", "SHD"].includes(status.toUpperCase());
    if (!shelved && unshelved.length < 10) {
      unshelved.push({
        packageNo: str(p.packageNo) || undefined,
        sellerCaseNo: str(p.sellerCaseNo) || undefined,
        status,
        unloadingTime: str(p.unloadingTime) || undefined,
        shelvesTime: str(p.shelvesTime) || undefined,
      });
    }
  }

  const expectedPackages = num(order.totalPackageQty ?? order.orderPackageQty);
  const receivedPackages = num(order.actualOrderPackageQty) || packageList.length;

  return {
    totalPackages: packageList.filter((p) => !(p as Record<string, unknown>)?._truncated).length,
    byStatus,
    recentUnshelvedSample: unshelved,
    expectedPackages: expectedPackages || undefined,
    receivedPackages: receivedPackages || undefined,
    discrepancy:
      expectedPackages > 0 ? expectedPackages - receivedPackages : undefined,
  };
}
