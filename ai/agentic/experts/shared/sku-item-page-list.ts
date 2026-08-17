/**
 * winit.item.page.list — 请求组装与响应剪枝映射（SKU 域共享）
 * Coze 导出时由 bundle 内联到代码节点。
 */

export const PAGE_LIST_ACTION = "winit.item.page.list";

export type FetchProfile =
  | "facts_core"
  | "audit_status"
  | "barcode_third"
  | "supplement_third_sku"
  | "facts_compliance"
  | "minimal";

export type TriState = boolean | null;
export type ProfileDataSource = "api" | "derived" | "kb" | "missing";
export type ProfileConfidence = "high" | "medium" | "low";
export type ProfileFactSource = "api" | "derived" | "unknown";

export type ProfileScope = {
  /** null 表示显式无租户；来源 scope/属性缺失才表示未知。 */
  customerCode: string | null;
  /** 缺少属性表示国别未知；null 表示显式无国别事实，ALL 表示全局事实。 */
  importCountryCode?: string | null;
};

export type ProfileFetchMeta = {
  requested?: number;
  found?: number;
  source?: string;
  strategy?: string;
  fetchProfile?: FetchProfile | string;
  pruned?: boolean;
  error?: string;
  [key: string]: unknown;
};

export type ProfileDimensions = {
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  unit: string;
};

export type ProfileSpecialFlags = {
  isBattery: TriState;
  isWithLiquid: TriState;
  isWithPowder: TriState;
  isWithMagnetism: TriState;
  isFood: TriState;
  isDangerous: TriState;
  isFragile: TriState;
};

export type ProfileManagementMode = {
  supervisorMode: string | null;
  isBatchManager: TriState;
  batchManagerType: string | null;
  hasExpiry: TriState;
};

export type ProfileRow = {
  skuCode: string;
  dataSource: ProfileDataSource;
  confidence: ProfileConfidence;
  publishStatus?: string | null;
  isUrgent?: TriState;
  dg?: TriState;
  prohibitInbound?: TriState;
  prohibitOutbound?: TriState;
  itemType?: string | null;
  registeredDimensions?: ProfileDimensions | null;
  verifiedDimensions?: ProfileDimensions | null;
  specialFlags?: ProfileSpecialFlags;
  managementMode?: ProfileManagementMode;
  fieldProvenance?: Record<string, ProfileFactSource>;
  scope?: ProfileScope;
  _missingFacts?: string[];
  _requestedSkuCode?: string;
  [key: string]: unknown;
};

const VALID_PROFILES = new Set<string>([
  "facts_core",
  "audit_status",
  "barcode_third",
  "supplement_third_sku",
  "facts_compliance",
  "minimal",
]);

export function normalizeFetchProfile(v: unknown): FetchProfile {
  const s = typeof v === "string" ? v.trim() : "";
  if (VALID_PROFILES.has(s)) return s as FetchProfile;
  return "facts_core";
}

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function ynTrue(v: unknown): boolean {
  const s = asText(v).toUpperCase();
  return s === "Y" || s === "TRUE" || s === "1";
}

function ynValue(v: unknown): boolean | null {
  const s = asText(v).toUpperCase();
  if (s === "Y" || s === "TRUE" || s === "1") return true;
  if (s === "N" || s === "FALSE" || s === "0") return false;
  return null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStatusInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function truncateForLlm(script: string, maxLen = 500): string {
  const s = asText(script);
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…（详见万邑联）`;
}

export function mapPublishStatus(status: unknown): string | null {
  const n = toStatusInt(status);
  switch (n) {
    case 1:
    case 2:
      return "draft";
    case 3:
      return "auditing";
    case 4:
      return "published";
    case 5:
      return "returned";
    case 6:
      return "inactive";
    default: {
      // legacy flat isActive fallback
      const active = asText(status).toUpperCase();
      if (active === "Y") return "published";
      if (active === "N") return "inactive";
      return null;
    }
  }
}

export function shouldExposeReturnFields(
  itemStatus: unknown,
  declaration: Record<string, unknown> | null
): boolean {
  const item = toStatusInt(itemStatus);
  if (item === 5) return true;
  if (item === 4 && declaration) {
    const changeStatus = toStatusInt(declaration.changeStatus);
    return changeStatus === 5;
  }
  return false;
}

type AttrRow = {
  attributeName?: unknown;
  attributeValue?: unknown;
  areaCode?: unknown;
};

function attrNameKey(name: unknown): string {
  return asText(name).toLowerCase();
}

/**
 * 按进口国匹配 attributes：优先精确国别 → ALL → null/空。
 * 指定或未指定国别时都不得回退其他国家首条。
 */
export function pickAttr(
  attrs: unknown,
  name: string,
  country?: string
): AttrRow | null {
  if (!Array.isArray(attrs)) return null;
  const want = attrNameKey(name);
  const rows = attrs.filter(
    (a) => a && typeof a === "object" && attrNameKey((a as AttrRow).attributeName) === want
  ) as AttrRow[];
  if (rows.length === 0) return null;
  const c = asText(country).toUpperCase();
  if (c) {
    const exact = rows.find((r) => asText(r.areaCode).toUpperCase() === c);
    if (exact) return exact;
  }
  const all = rows.find((r) => asText(r.areaCode).toUpperCase() === "ALL");
  if (all) return all;
  const global = rows.find((r) => !asText(r.areaCode));
  if (global) return global;
  return null;
}

export function pickAttrValue(attrs: unknown, name: string, country?: string): string {
  const row = pickAttr(attrs, name, country);
  return row ? asText(row.attributeValue) : "";
}

export function pickDeclaration(
  declarations: unknown,
  country?: string
): Record<string, unknown> | null {
  if (!Array.isArray(declarations) || declarations.length === 0) return null;
  const rows = declarations.filter((d) => d && typeof d === "object") as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const c = asText(country).toUpperCase();
  if (c) {
    const exact = rows.find((r) => asText(r.countryCode).toUpperCase() === c);
    if (exact) return exact;
  }
  const all = rows.find((r) => asText(r.countryCode).toUpperCase() === "ALL");
  if (all) return all;
  const global = rows.find((r) => !asText(r.countryCode));
  if (global) return global;
  return null;
}

function hasCountrySpecificRows(raw: Record<string, unknown>): boolean {
  const attrs = Array.isArray(raw.attributes) ? raw.attributes : [];
  const declarations = Array.isArray(raw.declarations) ? raw.declarations : [];
  const hasSpecificAttr = attrs.some((value) => {
    const row = asRecord(value);
    const areaCode = asText(row.areaCode).toUpperCase();
    return areaCode !== "" && areaCode !== "ALL";
  });
  const hasSpecificDeclaration = declarations.some((value) => {
    const row = asRecord(value);
    const countryCode = asText(row.countryCode).toUpperCase();
    return countryCode !== "" && countryCode !== "ALL";
  });
  return hasSpecificAttr || hasSpecificDeclaration;
}

function scopeForMappedRow(raw: Record<string, unknown>, country: string): ProfileScope {
  const scope: ProfileScope = { customerCode: null };
  if (country) {
    scope.importCountryCode = country.toUpperCase();
  } else if (!hasCountrySpecificRows(raw)) {
    scope.importCountryCode = null;
  }
  return scope;
}

export type BuildPageListOpts = {
  skuCodes?: string[];
  importCountryCode?: string;
  fetchProfile?: FetchProfile | string;
  thirdItemCodes?: string[];
  pageNo?: number;
  pageSize?: number;
};

export function buildPageListData(opts: BuildPageListOpts): Record<string, unknown> {
  const profile = normalizeFetchProfile(opts.fetchProfile);
  const codes = (opts.skuCodes ?? []).map((c) => asText(c)).filter(Boolean);
  const pageNo = opts.pageNo ?? 1;
  let pageSize = opts.pageSize ?? Math.min(Math.max(codes.length, 1), 20);
  if (profile === "supplement_third_sku") {
    pageSize = Math.min(opts.pageSize ?? 50, 50);
  } else {
    pageSize = Math.min(pageSize, 20);
  }

  const data: Record<string, unknown> = {
    pageVo: { pageNo, pageSize },
    conditionQueryType: "equals",
  };

  const country = asText(opts.importCountryCode);
  if (country) data.importCountryCode = country;

  if (profile === "supplement_third_sku") {
    data.querySupplementType = "SUPPLEMENT_THRID_SKU";
    if (codes.length > 0) data.skuCodes = codes;
    return data;
  }

  if (codes.length > 0) data.skuCodes = codes;

  const thirds = (opts.thirdItemCodes ?? []).map((c) => asText(c)).filter(Boolean);
  if (thirds.length > 0) data.thirdItemCodes = thirds;

  if (profile === "audit_status") {
    data.queryType = "REGISTERING";
  }

  return data;
}

export function buildPageListAction(opts: BuildPageListOpts): {
  action: string;
  data: string;
} {
  return {
    action: PAGE_LIST_ACTION,
    data: JSON.stringify(buildPageListData(opts)),
  };
}

function mapFirstLegType(
  firstLegType: string
): { directShipmentRestriction: string | null; prohibitInboundFromLeg: boolean | null } {
  const t = firstLegType.toUpperCase();
  if (t === "NS") return { directShipmentRestriction: "seller_direct", prohibitInboundFromLeg: false };
  if (t === "NL") return { directShipmentRestriction: "unlimited", prohibitInboundFromLeg: false };
  if (t === "PI") return { directShipmentRestriction: null, prohibitInboundFromLeg: true };
  return { directShipmentRestriction: null, prohibitInboundFromLeg: null };
}

type FieldProvenance = Extract<ProfileFactSource, "api" | "unknown">;

function readBooleanFact(
  attrs: unknown,
  attrNames: string[],
  raw: Record<string, unknown>,
  rawNames: string[],
  country?: string
): { value: boolean | null; provenance: FieldProvenance } {
  for (const name of attrNames) {
    const row = pickAttr(attrs, name, country);
    if (row) {
      const value = ynValue(row.attributeValue);
      if (value != null) return { value, provenance: "api" };
    }
  }
  for (const name of rawNames) {
    if (!hasOwn(raw, name)) continue;
    const value = ynValue(raw[name]);
    if (value != null) return { value, provenance: "api" };
  }
  return { value: null, provenance: "unknown" };
}

function readRecordBooleanFact(
  record: Record<string, unknown> | null,
  names: string[]
): { value: boolean | null; provenance: FieldProvenance } {
  if (!record) return { value: null, provenance: "unknown" };
  for (const name of names) {
    if (!hasOwn(record, name)) continue;
    const value = ynValue(record[name]);
    if (value != null) return { value, provenance: "api" };
  }
  return { value: null, provenance: "unknown" };
}

function combineBooleanEvidence(values: Array<boolean | null>): boolean | null {
  if (values.some((value) => value === true)) return true;
  if (values.every((value) => value === false)) return false;
  return null;
}

export type MapItemOpts = {
  fetchProfile?: FetchProfile | string;
  importCountryCode?: string;
  requestedSkuCode?: string;
};

/**
 * 将 page.list 单条 raw item 映射为 profile 契约（按 fetchProfile 裁剪字段）
 */
export function mapItemToProfile(
  raw: Record<string, unknown>,
  opts: MapItemOpts = {}
): ProfileRow {
  const profile = normalizeFetchProfile(opts.fetchProfile);
  const country = asText(opts.importCountryCode);
  const requested = asText(opts.requestedSkuCode) || asText(raw.skuCode);
  const attrs = raw.attributes;
  const decl = pickDeclaration(raw.declarations, country);
  const sw = asRecord(raw.sizeWeight);
  const skuCode = asText(raw.skuCode) || requested;
  const publishStatus = hasOwn(raw, "status")
    ? mapPublishStatus(raw.status)
    : mapPublishStatus(raw.isActive);

  const supervisorMode =
    pickAttrValue(attrs, "supervisorMode", country) || asText(raw.supervisorMode) || null;
  const packaging =
    pickAttrValue(attrs, "packaging", country) ||
    pickAttrValue(attrs, "itemPackaging", country) ||
    asText(raw.itemPackaging) ||
    null;

  const firstLegRaw =
    (decl ? asText(decl.firstLegType) : "") ||
    pickAttrValue(attrs, "firstLegType", country);
  // attributes.firstLegType 用 NS/NL/PI；declarations.firstLegType 可能是 AIR/SEA — 仅当是限制码时映射
  const firstLegForLimit = /^(NS|NL|PI)$/i.test(firstLegRaw)
    ? firstLegRaw
    : pickAttrValue(attrs, "firstLegType", country);
  const leg = mapFirstLegType(firstLegForLimit);

  const prohibitFromDecl = readRecordBooleanFact(decl, ["isProhibitWarehousing"]);
  const prohibitInbound = combineBooleanEvidence([
    prohibitFromDecl.value,
    leg.prohibitInboundFromLeg,
  ]);
  // page.list SoT 未确认禁止出库字段；同名 raw/attribute 不作为 API 事实。
  const prohibitOutboundFact = { value: null, provenance: "unknown" as const };

  const regLen = num(sw.registerLength ?? raw.registerLength);
  const regWidth = num(sw.registerWidth ?? raw.registerWidth);
  const regHeight = num(sw.registerHeight ?? raw.registerHeight);
  const regWeight = num(sw.registerWeight ?? raw.registerWeight);
  const hasReg = regLen != null || regWidth != null || regHeight != null || regWeight != null;

  const verLen = num(sw.length);
  const verWidth = num(sw.width);
  const verHeight = num(sw.height);
  const verWeight = num(sw.weight);
  const hasVer = verLen != null || verWidth != null || verHeight != null || verWeight != null;

  const battery = readBooleanFact(attrs, ["battery"], raw, ["isBattery"], country);
  const liquid = readBooleanFact(attrs, ["liquid"], raw, ["isWithLiquid"], country);
  const powder = readBooleanFact(attrs, ["powder"], raw, ["isWithPowder"], country);
  const magnetism = readBooleanFact(
    attrs,
    ["magnetism"],
    raw,
    ["isWithMagnetism"],
    country
  );
  const food = readBooleanFact(attrs, ["food"], raw, ["isFood"], country);
  const dg = readBooleanFact(attrs, ["dg"], raw, ["isDangerous", "dg"], country);
  const fragile = readBooleanFact(
    attrs,
    ["fragileLabel"],
    raw,
    ["isFragile"],
    country
  );

  const batchMgmt = readBooleanFact(
    attrs,
    ["batchManagement"],
    raw,
    ["isBatchManager"],
    country
  );
  const batchType =
    pickAttrValue(attrs, "batchManagementType", country) || asText(raw.batchManagerType) || null;
  const hasExpiry =
    batchType != null
      ? asText(batchType).toUpperCase().includes("SHELF") || asText(batchType).includes("ED")
      : batchMgmt.value === false
        ? false
        : null;

  const exposeReturn = shouldExposeReturnFields(raw.status, decl);
  const returnReason = exposeReturn && decl ? asText(decl.returnReason) || null : null;
  const standardScript = exposeReturn && decl ? asText(decl.standardScript) || null : null;

  const estimateAuditDate = pickAttrValue(attrs, "estimateAuditDate", country) || null;
  const isUrgentFact = readBooleanFact(attrs, ["isUrgent"], raw, [], country);
  const isUrgent = isUrgentFact.value;

  const skuCodeThirds = Array.isArray(raw.skuCodeThirds)
    ? (raw.skuCodeThirds as unknown[]).map((x) => asText(x)).filter(Boolean)
    : [];
  const isSupportThirdSkuFact = readBooleanFact(
    attrs,
    ["isSupportThirdSku"],
    raw,
    [],
    country
  );
  const isSupportThirdSku = isSupportThirdSkuFact.value;

  const hasSuit = ynTrue(pickAttrValue(attrs, "hasSuitBoxItem", country));
  const typeHint = hasSuit ? "SUITE" : null;

  const baseFieldProvenance: Record<string, FieldProvenance> = {
    publishStatus: publishStatus == null ? "unknown" : "api",
  };
  const baseMissingFacts: string[] = [];
  if (publishStatus == null) baseMissingFacts.push(`publish_status_unknown:${skuCode}`);

  const base: ProfileRow = {
    skuCode,
    code: asText(raw.code) || null,
    specification: asText(raw.specification) || null,
    isActive: asText(raw.isActive) || null,
    publishStatus,
    _requestedSkuCode: requested || asText(raw.skuCode),
    dataSource: "api",
    confidence: "high",
    fieldProvenance: baseFieldProvenance,
    _missingFacts: baseMissingFacts,
    scope: scopeForMappedRow(raw, country),
  };

  if (profile === "minimal") {
    return base;
  }

  if (profile === "barcode_third") {
    const barcodeFieldProvenance: Record<string, FieldProvenance> = {
      ...baseFieldProvenance,
      isSupportThirdSku: isSupportThirdSkuFact.provenance,
      "managementMode.isBatchManager": batchMgmt.provenance,
      "managementMode.batchManagerType": batchType == null ? "unknown" : "api",
      "managementMode.hasExpiry": hasExpiry == null ? "unknown" : "api",
    };
    const barcodeMissingFacts = [...baseMissingFacts];
    if (isSupportThirdSku == null) {
      barcodeMissingFacts.push(`third_sku_support_unknown:${skuCode}`);
    }
    if (batchMgmt.value == null) {
      barcodeMissingFacts.push(`management_mode_unknown:isBatchManager:${skuCode}`);
    }
    if (batchType == null) {
      barcodeMissingFacts.push(`management_mode_unknown:batchManagerType:${skuCode}`);
    }
    if (hasExpiry == null) {
      barcodeMissingFacts.push(`management_mode_unknown:hasExpiry:${skuCode}`);
    }
    return {
      ...base,
      supervisorMode,
      skuCodeThirds,
      isSupportThirdSku,
      managementMode: {
        supervisorMode,
        isBatchManager: batchMgmt.value,
        batchManagerType: batchType,
        hasExpiry,
      },
      fieldProvenance: barcodeFieldProvenance,
      _missingFacts: barcodeMissingFacts,
    };
  }

  if (profile === "audit_status") {
    const auditFieldProvenance: Record<string, FieldProvenance> = {
      ...baseFieldProvenance,
      prohibitInbound: prohibitInbound == null ? "unknown" : "api",
      isUrgent: isUrgentFact.provenance,
    };
    const auditMissingFacts = [...baseMissingFacts];
    if (prohibitInbound == null) {
      auditMissingFacts.push(`prohibit_inbound_unknown:${skuCode}`);
    }
    if (isUrgent == null) auditMissingFacts.push(`is_urgent_unknown:${skuCode}`);
    return {
      ...base,
      supervisorMode,
      rejectReason: returnReason,
      standardScript,
      estimateAuditDate: estimateAuditDate || null,
      isUrgent,
      prohibitInbound,
      directShipmentRestriction: leg.directShipmentRestriction,
      fieldProvenance: auditFieldProvenance,
      _missingFacts: auditMissingFacts,
    };
  }

  // facts_core / facts_compliance / default
  const fieldProvenance: Record<string, FieldProvenance> = {
    ...baseFieldProvenance,
    prohibitInbound: prohibitInbound == null ? "unknown" : "api",
    prohibitOutbound: prohibitOutboundFact.provenance,
    isUrgent: isUrgentFact.provenance,
    "specialFlags.isBattery": battery.provenance,
    "specialFlags.isWithLiquid": liquid.provenance,
    "specialFlags.isWithPowder": powder.provenance,
    "specialFlags.isWithMagnetism": magnetism.provenance,
    "specialFlags.isFood": food.provenance,
    "specialFlags.isDangerous": dg.provenance,
    "specialFlags.isFragile": fragile.provenance,
    "managementMode.isBatchManager": batchMgmt.provenance,
    "managementMode.batchManagerType": batchType == null ? "unknown" : "api",
    "managementMode.hasExpiry": hasExpiry == null ? "unknown" : "api",
  };
  const missingFacts: string[] = [...baseMissingFacts];
  if (prohibitInbound == null) missingFacts.push(`prohibit_inbound_unknown:${skuCode}`);
  if (prohibitOutboundFact.value == null) {
    missingFacts.push(`prohibit_outbound_unknown:${skuCode}`);
  }
  const specialFacts: Array<[string, boolean | null]> = [
    ["isBattery", battery.value],
    ["isWithLiquid", liquid.value],
    ["isWithPowder", powder.value],
    ["isWithMagnetism", magnetism.value],
    ["isFood", food.value],
    ["isDangerous", dg.value],
    ["isFragile", fragile.value],
  ];
  for (const [name, value] of specialFacts) {
    if (value == null) missingFacts.push(`special_flag_unknown:${name}:${skuCode}`);
  }
  if (batchMgmt.value == null) {
    missingFacts.push(`management_mode_unknown:isBatchManager:${skuCode}`);
  }
  if (batchType == null) {
    missingFacts.push(`management_mode_unknown:batchManagerType:${skuCode}`);
  }
  if (hasExpiry == null) {
    missingFacts.push(`management_mode_unknown:hasExpiry:${skuCode}`);
  }

  const out: ProfileRow = {
    ...base,
    supervisorMode,
    type: typeHint,
    itemPackaging: packaging,
    prohibitInbound,
    prohibitOutbound: prohibitOutboundFact.value,
    prohibitReason: null,
    prohibitSource: "unknown",
    prohibitInboundReason: prohibitInbound ? "isProhibitWarehousing_or_PI" : null,
    directShipmentRestriction: leg.directShipmentRestriction,
    restrictionReason: null,
    rejectReason: returnReason,
    standardScript,
    estimateAuditDate: estimateAuditDate || null,
    isUrgent,
    itemType: null,
    registeredDimensions: hasReg
      ? { length: regLen, width: regWidth, height: regHeight, weight: regWeight, unit: "kg" }
      : null,
    verifiedDimensions: hasVer
      ? { length: verLen, width: verWidth, height: verHeight, weight: verWeight, unit: "kg" }
      : null,
    specialFlags: {
      isBattery: battery.value,
      isWithLiquid: liquid.value,
      isWithPowder: powder.value,
      isWithMagnetism: magnetism.value,
      isFood: food.value,
      isDangerous: dg.value,
      isFragile: fragile.value,
    },
    managementMode: {
      supervisorMode,
      isBatchManager: batchMgmt.value,
      batchManagerType: batchType,
      hasExpiry,
    },
    fieldProvenance,
    _missingFacts: missingFacts,
    applicableRules: [] as string[],
    handlingRequirements: [] as string[],
  };

  if (battery.value === true) {
    (out.applicableRules as string[]).push("带电品需填报电池信息");
  }

  if (profile === "facts_compliance") {
    out.hsCode = decl ? asText(decl.hsCode) || null : null;
    out.declareName = decl ? asText(decl.declareName) || null : null;
    out.itemLink = pickAttrValue(attrs, "itemLink", country) || null;
    out.dg = dg.value;
    fieldProvenance.dg = dg.provenance;
  }

  if (skuCodeThirds.length > 0) out.skuCodeThirds = skuCodeThirds;

  return out;
}

export function buildAuditStatusHint(profile: Record<string, unknown>, skuCode: string): string {
  const parts: string[] = [];
  const code = asText(profile.skuCode) || skuCode;
  parts.push(`SKU ${code}`);
  const ps = asText(profile.publishStatus);
  if (ps) parts.push(`发布态：${ps}`);
  const est = asText(profile.estimateAuditDate);
  if (est) {
    parts.push(`应维护完成时间：${est}`);
  } else {
    parts.push("应维护完成时间：暂无（请在万邑联商品维护任务中核实）");
  }
  if (profile.isUrgent === true) parts.push("已加急：是");
  if (profile.isUrgent === false) parts.push("已加急：否");
  const reject = asText(profile.rejectReason);
  const script = truncateForLlm(asText(profile.standardScript), 500);
  if (reject) parts.push(`退回原因：${reject}`);
  if (script) parts.push(`退回说明：${script}`);
  return parts.join("；");
}

export const DROPPED_SECTIONS = ["outPackaging", "translates", "rawAttributes", "fullDeclarations"];

/**
 * 从 plugin / workflow 解析出的 payload 中提取 list[]
 */
export function coercePageList(parsed: unknown): {
  list: Record<string, unknown>[];
  totalCount: number | null;
} {
  if (parsed == null) return { list: [], totalCount: null };
  if (Array.isArray(parsed)) {
    return {
      list: parsed.filter((x) => x && typeof x === "object") as Record<string, unknown>[],
      totalCount: parsed.length,
    };
  }
  if (typeof parsed !== "object") return { list: [], totalCount: null };
  const o = parsed as Record<string, unknown>;
  if (o.output != null) return coercePageList(o.output);
  if (o.code === "0" || o.code === 0) return coercePageList(o.data);
  if (Array.isArray(o.list)) {
    return {
      list: o.list.filter((x) => x && typeof x === "object") as Record<string, unknown>[],
      totalCount: num(o.totalCount) ?? o.list.length,
    };
  }
  if (o.skuCode != null || o.code != null) {
    return { list: [o], totalCount: 1 };
  }
  return { list: [], totalCount: null };
}
