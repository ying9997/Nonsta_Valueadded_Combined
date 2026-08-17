/**
 * 节点：page.list rawItems → 契约 apiProfiles（剪枝映射）
 */
const DROPPED_SECTIONS = ["outPackaging", "translates", "rawAttributes", "fullDeclarations"];
const VALID_FETCH_PROFILES = new Set([
  "facts_core",
  "audit_status",
  "barcode_third",
  "supplement_third_sku",
  "facts_compliance",
  "minimal",
]);

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeFetchProfile(v: unknown): string {
  const value = asText(v);
  return VALID_FETCH_PROFILES.has(value) ? value : "facts_core";
}

function ynValue(v: unknown): boolean | null {
  const value = asText(v).toUpperCase();
  if (value === "Y" || value === "TRUE" || value === "1") return true;
  if (value === "N" || value === "FALSE" || value === "0") return false;
  return null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const value = Number(v);
  return Number.isFinite(value) ? value : null;
}

function mapPublishStatus(value: unknown): string | null {
  const status = num(value);
  if (status === 1 || status === 2) return "draft";
  if (status === 3) return "auditing";
  if (status === 4) return "published";
  if (status === 5) return "returned";
  if (status === 6) return "inactive";
  const active = asText(value).toUpperCase();
  if (active === "Y") return "published";
  if (active === "N") return "inactive";
  return null;
}

type AttrRow = { attributeName?: unknown; attributeValue?: unknown; areaCode?: unknown };

function pickAttr(attrs: unknown, name: string, country?: string): AttrRow | null {
  if (!Array.isArray(attrs)) return null;
  const wanted = name.toLowerCase();
  const rows = attrs.filter(
    (value): value is AttrRow =>
      value != null &&
      typeof value === "object" &&
      asText((value as AttrRow).attributeName).toLowerCase() === wanted
  );
  const requestedCountry = asText(country).toUpperCase();
  if (requestedCountry) {
    const exact = rows.find((row) => asText(row.areaCode).toUpperCase() === requestedCountry);
    if (exact) return exact;
  }
  return (
    rows.find((row) => asText(row.areaCode).toUpperCase() === "ALL") ??
    rows.find((row) => !asText(row.areaCode)) ??
    null
  );
}

function pickAttrValue(attrs: unknown, name: string, country?: string): string {
  return asText(pickAttr(attrs, name, country)?.attributeValue);
}

function pickDeclaration(value: unknown, country?: string): Record<string, unknown> | null {
  if (!Array.isArray(value)) return null;
  const rows = value.filter(
    (row): row is Record<string, unknown> =>
      row != null && typeof row === "object" && !Array.isArray(row)
  );
  const requestedCountry = asText(country).toUpperCase();
  if (requestedCountry) {
    const exact = rows.find((row) => asText(row.countryCode).toUpperCase() === requestedCountry);
    if (exact) return exact;
  }
  return (
    rows.find((row) => asText(row.countryCode).toUpperCase() === "ALL") ??
    rows.find((row) => !asText(row.countryCode)) ??
    null
  );
}

function hasCountrySpecificRows(raw: Record<string, unknown>): boolean {
  const attrs = Array.isArray(raw.attributes) ? raw.attributes : [];
  const declarations = Array.isArray(raw.declarations) ? raw.declarations : [];
  return attrs.some((value) => {
    const country = asText(asRecord(value).areaCode).toUpperCase();
    return country !== "" && country !== "ALL";
  }) || declarations.some((value) => {
    const country = asText(asRecord(value).countryCode).toUpperCase();
    return country !== "" && country !== "ALL";
  });
}

function readBooleanFact(
  attrs: unknown,
  attrNames: string[],
  raw: Record<string, unknown>,
  rawNames: string[],
  country?: string
): { value: boolean | null; provenance: "api" | "unknown" } {
  for (const name of attrNames) {
    const row = pickAttr(attrs, name, country);
    if (!row) continue;
    const value = ynValue(row.attributeValue);
    if (value != null) return { value, provenance: "api" };
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
): { value: boolean | null; provenance: "api" | "unknown" } {
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

function mapItemToProfile(
  raw: Record<string, unknown>,
  opts: { fetchProfile?: unknown; importCountryCode?: string; requestedSkuCode?: string }
): Record<string, unknown> {
  const profile = normalizeFetchProfile(opts.fetchProfile);
  const country = asText(opts.importCountryCode);
  const requested = asText(opts.requestedSkuCode) || asText(raw.skuCode);
  const attrs = raw.attributes;
  const declaration = pickDeclaration(raw.declarations, country);
  const sizeWeight = asRecord(raw.sizeWeight);
  const skuCode = asText(raw.skuCode) || requested;
  const publishStatus = hasOwn(raw, "status")
    ? mapPublishStatus(raw.status)
    : mapPublishStatus(raw.isActive);
  const supervisorMode =
    pickAttrValue(attrs, "supervisorMode", country) || asText(raw.supervisorMode) || null;
  const itemPackaging =
    pickAttrValue(attrs, "packaging", country) ||
    pickAttrValue(attrs, "itemPackaging", country) ||
    asText(raw.itemPackaging) ||
    null;

  const firstLegRaw =
    (declaration ? asText(declaration.firstLegType) : "") ||
    pickAttrValue(attrs, "firstLegType", country);
  const firstLegForLimit = /^(NS|NL|PI)$/i.test(firstLegRaw)
    ? firstLegRaw
    : pickAttrValue(attrs, "firstLegType", country);
  const firstLeg = firstLegForLimit.toUpperCase();
  const directShipmentRestriction =
    firstLeg === "NS" ? "seller_direct" : firstLeg === "NL" ? "unlimited" : null;
  const prohibitFromLeg = firstLeg === "PI" ? true : firstLeg === "NS" || firstLeg === "NL" ? false : null;
  const prohibitFromDeclaration = readRecordBooleanFact(declaration, ["isProhibitWarehousing"]);
  const prohibitInbound = combineBooleanEvidence([
    prohibitFromDeclaration.value,
    prohibitFromLeg,
  ]);

  const battery = readBooleanFact(attrs, ["battery"], raw, ["isBattery"], country);
  const liquid = readBooleanFact(attrs, ["liquid"], raw, ["isWithLiquid"], country);
  const powder = readBooleanFact(attrs, ["powder"], raw, ["isWithPowder"], country);
  const magnetism = readBooleanFact(attrs, ["magnetism"], raw, ["isWithMagnetism"], country);
  const food = readBooleanFact(attrs, ["food"], raw, ["isFood"], country);
  const dangerous = readBooleanFact(attrs, ["dg"], raw, ["isDangerous", "dg"], country);
  const fragile = readBooleanFact(attrs, ["fragileLabel"], raw, ["isFragile"], country);
  const batchManagement = readBooleanFact(
    attrs,
    ["batchManagement"],
    raw,
    ["isBatchManager"],
    country
  );
  const batchManagerType =
    pickAttrValue(attrs, "batchManagementType", country) || asText(raw.batchManagerType) || null;
  const hasExpiry = batchManagerType != null
    ? batchManagerType.toUpperCase().includes("SHELF") || batchManagerType.includes("ED")
    : batchManagement.value === false
      ? false
      : null;
  const isUrgentFact = readBooleanFact(attrs, ["isUrgent"], raw, [], country);
  const estimateAuditDate = pickAttrValue(attrs, "estimateAuditDate", country) || null;
  const itemStatus = num(raw.status);
  const declarationStatus = declaration ? num(declaration.changeStatus) : null;
  const exposeReturn = itemStatus === 5 || (itemStatus === 4 && declarationStatus === 5);
  const rejectReason = exposeReturn && declaration ? asText(declaration.returnReason) || null : null;
  const standardScript = exposeReturn && declaration ? asText(declaration.standardScript) || null : null;
  const skuCodeThirds = Array.isArray(raw.skuCodeThirds)
    ? raw.skuCodeThirds.map(asText).filter(Boolean)
    : [];
  const isSupportThirdSkuFact = readBooleanFact(attrs, ["isSupportThirdSku"], raw, [], country);

  const fieldProvenance: Record<string, "api" | "unknown"> = {
    publishStatus: publishStatus == null ? "unknown" : "api",
  };
  const missingFacts: string[] = [];
  if (publishStatus == null) missingFacts.push(`publish_status_unknown:${skuCode}`);
  const scope: Record<string, unknown> = { customerCode: null };
  if (country) scope.importCountryCode = country.toUpperCase();
  else if (!hasCountrySpecificRows(raw)) scope.importCountryCode = null;
  const base: Record<string, unknown> = {
    skuCode,
    code: asText(raw.code) || null,
    specification: asText(raw.specification) || null,
    isActive: asText(raw.isActive) || null,
    publishStatus,
    _requestedSkuCode: requested || asText(raw.skuCode),
    dataSource: "api",
    confidence: "high",
    fieldProvenance,
    _missingFacts: missingFacts,
    scope,
  };
  if (profile === "minimal") return base;

  if (profile === "barcode_third") {
    fieldProvenance.isSupportThirdSku = isSupportThirdSkuFact.provenance;
    fieldProvenance["managementMode.isBatchManager"] = batchManagement.provenance;
    fieldProvenance["managementMode.batchManagerType"] = batchManagerType == null ? "unknown" : "api";
    fieldProvenance["managementMode.hasExpiry"] = hasExpiry == null ? "unknown" : "api";
    if (isSupportThirdSkuFact.value == null) missingFacts.push(`third_sku_support_unknown:${skuCode}`);
    if (batchManagement.value == null) missingFacts.push(`management_mode_unknown:isBatchManager:${skuCode}`);
    if (batchManagerType == null) missingFacts.push(`management_mode_unknown:batchManagerType:${skuCode}`);
    if (hasExpiry == null) missingFacts.push(`management_mode_unknown:hasExpiry:${skuCode}`);
    return {
      ...base,
      supervisorMode,
      skuCodeThirds,
      isSupportThirdSku: isSupportThirdSkuFact.value,
      managementMode: {
        supervisorMode,
        isBatchManager: batchManagement.value,
        batchManagerType,
        hasExpiry,
      },
    };
  }

  fieldProvenance.prohibitInbound = prohibitInbound == null ? "unknown" : "api";
  fieldProvenance.isUrgent = isUrgentFact.provenance;
  if (prohibitInbound == null) missingFacts.push(`prohibit_inbound_unknown:${skuCode}`);
  if (isUrgentFact.value == null) missingFacts.push(`is_urgent_unknown:${skuCode}`);
  if (profile === "audit_status") {
    return {
      ...base,
      supervisorMode,
      rejectReason,
      standardScript,
      estimateAuditDate,
      isUrgent: isUrgentFact.value,
      prohibitInbound,
      directShipmentRestriction,
    };
  }

  const specialFacts: Array<[string, { value: boolean | null; provenance: "api" | "unknown" }]> = [
    ["isBattery", battery],
    ["isWithLiquid", liquid],
    ["isWithPowder", powder],
    ["isWithMagnetism", magnetism],
    ["isFood", food],
    ["isDangerous", dangerous],
    ["isFragile", fragile],
  ];
  fieldProvenance.prohibitOutbound = "unknown";
  for (const [name, fact] of specialFacts) {
    fieldProvenance[`specialFlags.${name}`] = fact.provenance;
    if (fact.value == null) missingFacts.push(`special_flag_unknown:${name}:${skuCode}`);
  }
  fieldProvenance["managementMode.isBatchManager"] = batchManagement.provenance;
  fieldProvenance["managementMode.batchManagerType"] = batchManagerType == null ? "unknown" : "api";
  fieldProvenance["managementMode.hasExpiry"] = hasExpiry == null ? "unknown" : "api";
  missingFacts.push(`prohibit_outbound_unknown:${skuCode}`);
  if (batchManagement.value == null) missingFacts.push(`management_mode_unknown:isBatchManager:${skuCode}`);
  if (batchManagerType == null) missingFacts.push(`management_mode_unknown:batchManagerType:${skuCode}`);
  if (hasExpiry == null) missingFacts.push(`management_mode_unknown:hasExpiry:${skuCode}`);

  const registeredDimensions = {
    length: num(sizeWeight.registerLength ?? raw.registerLength),
    width: num(sizeWeight.registerWidth ?? raw.registerWidth),
    height: num(sizeWeight.registerHeight ?? raw.registerHeight),
    weight: num(sizeWeight.registerWeight ?? raw.registerWeight),
    unit: "kg",
  };
  const verifiedDimensions = {
    length: num(sizeWeight.length),
    width: num(sizeWeight.width),
    height: num(sizeWeight.height),
    weight: num(sizeWeight.weight),
    unit: "kg",
  };
  const hasRegisteredDimensions = Object.values(registeredDimensions).slice(0, 4).some((value) => value != null);
  const hasVerifiedDimensions = Object.values(verifiedDimensions).slice(0, 4).some((value) => value != null);
  const out: Record<string, unknown> = {
    ...base,
    supervisorMode,
    type: ynValue(pickAttrValue(attrs, "hasSuitBoxItem", country)) === true ? "SUITE" : null,
    itemPackaging,
    prohibitInbound,
    prohibitOutbound: null,
    prohibitReason: null,
    prohibitSource: "unknown",
    prohibitInboundReason: prohibitInbound ? "isProhibitWarehousing_or_PI" : null,
    directShipmentRestriction,
    restrictionReason: null,
    rejectReason,
    standardScript,
    estimateAuditDate,
    isUrgent: isUrgentFact.value,
    itemType: null,
    registeredDimensions: hasRegisteredDimensions ? registeredDimensions : null,
    verifiedDimensions: hasVerifiedDimensions ? verifiedDimensions : null,
    specialFlags: Object.fromEntries(specialFacts.map(([name, fact]) => [name, fact.value])),
    managementMode: {
      supervisorMode,
      isBatchManager: batchManagement.value,
      batchManagerType,
      hasExpiry,
    },
    applicableRules: battery.value === true ? ["带电品需填报电池信息"] : [],
    handlingRequirements: [],
  };
  if (profile === "facts_compliance") {
    out.hsCode = declaration ? asText(declaration.hsCode) || null : null;
    out.declareName = declaration ? asText(declaration.declareName) || null : null;
    out.itemLink = pickAttrValue(attrs, "itemLink", country) || null;
    out.dg = dangerous.value;
    fieldProvenance.dg = dangerous.provenance;
  }
  if (skuCodeThirds.length > 0) out.skuCodeThirds = skuCodeThirds;
  return out;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const fetchProfile = normalizeFetchProfile(params.fetchProfile);
  const importCountryCode = asText(params.importCountryCode);
  const rawItems = (Array.isArray(params.rawItems) ? params.rawItems : []) as Record<
    string,
    unknown
  >[];
  const prevMeta =
    params.fetchMeta && typeof params.fetchMeta === "object"
      ? (params.fetchMeta as Record<string, unknown>)
      : {};

  const apiProfiles = rawItems.map((raw) =>
    mapItemToProfile(raw, {
      fetchProfile,
      importCountryCode: importCountryCode || undefined,
      requestedSkuCode: asText(raw._requestedSkuCode) || asText(raw.skuCode),
    })
  );

  return {
    apiProfiles,
    fetchMeta: {
      ...prevMeta,
      found: apiProfiles.length,
      fetchProfile,
      pruned: true,
      droppedSections: DROPPED_SECTIONS,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("prune-and-map-item")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
