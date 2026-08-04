/**
 * 节点：合并已映射的 API 档案 + 订单 merchandise 派生降级
 */

import type {
  ProfileDataSource,
  ProfileFactSource,
  ProfileFetchMeta,
  ProfileRow,
  ProfileScope,
} from "../../../../shared/sku-item-page-list";

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
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

/** 已映射契约行（含 dataSource）直接采用；否则视为未映射 */
function isMappedProfile(row: ProfileRow): boolean {
  return row.dataSource === "api" || (row.publishStatus != null && row.specialFlags != null);
}

type DerivedProvenance = Extract<ProfileFactSource, "derived" | "unknown">;

const PROFILE_DATA_SOURCES = new Set<ProfileDataSource>(["api", "derived", "kb", "missing"]);

function toProfileRow(v: unknown): ProfileRow | null {
  const row = asRecord(v);
  const skuCode = asText(row.skuCode);
  const dataSource = asText(row.dataSource) as ProfileDataSource;
  const confidence = asText(row.confidence);
  if (!skuCode || !PROFILE_DATA_SOURCES.has(dataSource)) return null;
  if (confidence !== "high" && confidence !== "medium" && confidence !== "low") return null;
  return row as ProfileRow;
}

function currentScope(params: Record<string, unknown>): ProfileScope {
  const scope: ProfileScope = {
    customerCode: asText(params.customerCode) || null,
  };
  const importCountryCode = asText(params.importCountryCode).toUpperCase();
  if (importCountryCode) scope.importCountryCode = importCountryCode;
  return scope;
}

type ParsedScope = {
  customerCode: string | null;
  importCountryCode: string | null;
  hasCustomerCode: boolean;
  hasImportCountryCode: boolean;
};

function parseScope(value: unknown): ParsedScope {
  const scope = asRecord(value);
  return {
    customerCode: hasOwn(scope, "customerCode")
      ? asText(scope.customerCode).toUpperCase() || null
      : null,
    importCountryCode: hasOwn(scope, "importCountryCode")
      ? asText(scope.importCountryCode).toUpperCase() || null
      : null,
    hasCustomerCode: hasOwn(scope, "customerCode"),
    hasImportCountryCode: hasOwn(scope, "importCountryCode"),
  };
}

function scopeForNewRow(current: ProfileScope, sourceValue?: unknown): ProfileScope {
  const scope: ProfileScope = { customerCode: current.customerCode };
  if (hasOwn(asRecord(current), "importCountryCode")) {
    scope.importCountryCode = current.importCountryCode ?? null;
    return scope;
  }
  const source = parseScope(sourceValue);
  if (source.hasImportCountryCode) {
    scope.importCountryCode = source.importCountryCode;
  }
  return scope;
}

function checkScope(
  current: ProfileScope,
  sourceValue: unknown,
  skuCode: string
): { reusable: boolean; missingFacts: string[] } {
  const source = parseScope(sourceValue);
  const requested = parseScope(current);
  const facts: string[] = [];
  let unknown = false;

  if (!source.hasCustomerCode) {
    unknown = true;
  } else if (requested.customerCode == null) {
    if (source.customerCode != null && source.customerCode !== "ALL") {
      facts.push(`scope_mismatch:customerCode:${skuCode}`);
    }
  } else if (
    source.customerCode !== "ALL" &&
    (source.customerCode == null ||
      source.customerCode.toUpperCase() !== requested.customerCode.toUpperCase())
  ) {
    facts.push(`scope_mismatch:customerCode:${skuCode}`);
  }

  if (!source.hasImportCountryCode) {
    unknown = true;
  } else if (!requested.hasImportCountryCode || requested.importCountryCode == null) {
    if (source.importCountryCode != null && source.importCountryCode !== "ALL") {
      facts.push(`scope_mismatch:importCountryCode:${skuCode}`);
    }
  } else if (
    source.importCountryCode !== "ALL" &&
    (source.importCountryCode == null ||
      source.importCountryCode !== requested.importCountryCode)
  ) {
    facts.push(`scope_mismatch:importCountryCode:${skuCode}`);
  }

  if (unknown) facts.push(`scope_unknown:${skuCode}`);
  return { reusable: facts.length === 0, missingFacts: facts };
}

function factBelongsToSku(fact: string, skuCode: string): boolean {
  return fact.toUpperCase().endsWith(`:${skuCode.toUpperCase()}`);
}

function readDerivedBoolean(
  row: Record<string, unknown>,
  names: string[]
): { value: boolean | null; provenance: DerivedProvenance } {
  for (const name of names) {
    if (!hasOwn(row, name)) continue;
    const value = ynValue(row[name]);
    if (value != null) return { value, provenance: "derived" };
  }
  return { value: null, provenance: "unknown" };
}

function mapMerchandise(m: Record<string, unknown>, skuCode: string): ProfileRow {
  const weight = num(m.weight ?? m.registerWeight);
  const length = num(m.length ?? m.registerLength);
  const width = num(m.width ?? m.registerWidth);
  const height = num(m.height ?? m.registerHeight);
  const hasDims = length != null || width != null || height != null || weight != null;
  const publishStatus = asText(m.publishStatus) || null;
  const prohibitInbound = readDerivedBoolean(m, ["prohibitInbound"]);
  const prohibitOutbound = readDerivedBoolean(m, ["prohibitOutbound"]);
  const battery = readDerivedBoolean(m, ["hasBattery", "isBattery"]);
  const liquid = readDerivedBoolean(m, ["isWithLiquid", "isLiquid"]);
  const powder = readDerivedBoolean(m, ["isWithPowder", "isPowder"]);
  const magnetism = readDerivedBoolean(m, ["isWithMagnetism"]);
  const food = readDerivedBoolean(m, ["isFood"]);
  const dangerous = readDerivedBoolean(m, ["isDangerous"]);
  const fragile = readDerivedBoolean(m, ["isFragile"]);
  const batchManager = readDerivedBoolean(m, ["isBatchManager", "batchManagement"]);
  const batchManagerType = asText(m.batchManagerType ?? m.batchManagementType) || null;
  const explicitExpiry = readDerivedBoolean(m, ["hasExpiry"]);
  const hasExpiry =
    explicitExpiry.value != null
      ? explicitExpiry
      : batchManagerType != null
        ? {
            value:
              batchManagerType.toUpperCase().includes("SHELF") || batchManagerType.includes("ED"),
            provenance: "derived" as const,
          }
        : batchManager.value === false
          ? { value: false, provenance: "derived" as const }
          : { value: null, provenance: "unknown" as const };
  const supervisorMode = asText(m.supervisorMode) || null;
  const fieldProvenance: Record<string, DerivedProvenance> = {
    publishStatus: publishStatus == null ? "unknown" : "derived",
    prohibitInbound: prohibitInbound.provenance,
    prohibitOutbound: prohibitOutbound.provenance,
    "specialFlags.isBattery": battery.provenance,
    "specialFlags.isWithLiquid": liquid.provenance,
    "specialFlags.isWithPowder": powder.provenance,
    "specialFlags.isWithMagnetism": magnetism.provenance,
    "specialFlags.isFood": food.provenance,
    "specialFlags.isDangerous": dangerous.provenance,
    "specialFlags.isFragile": fragile.provenance,
    "managementMode.isBatchManager": batchManager.provenance,
    "managementMode.batchManagerType": batchManagerType == null ? "unknown" : "derived",
    "managementMode.hasExpiry": hasExpiry.provenance,
  };
  const missingFacts: string[] = [];
  if (publishStatus == null) missingFacts.push(`publish_status_unknown:${skuCode}`);
  if (prohibitInbound.value == null) missingFacts.push(`prohibit_inbound_unknown:${skuCode}`);
  if (prohibitOutbound.value == null) missingFacts.push(`prohibit_outbound_unknown:${skuCode}`);
  const specialFacts: Array<[string, boolean | null]> = [
    ["isBattery", battery.value],
    ["isWithLiquid", liquid.value],
    ["isWithPowder", powder.value],
    ["isWithMagnetism", magnetism.value],
    ["isFood", food.value],
    ["isDangerous", dangerous.value],
    ["isFragile", fragile.value],
  ];
  for (const [name, value] of specialFacts) {
    if (value == null) missingFacts.push(`special_flag_unknown:${name}:${skuCode}`);
  }
  if (batchManager.value == null) {
    missingFacts.push(`management_mode_unknown:isBatchManager:${skuCode}`);
  }
  if (batchManagerType == null) {
    missingFacts.push(`management_mode_unknown:batchManagerType:${skuCode}`);
  }
  if (hasExpiry.value == null) {
    missingFacts.push(`management_mode_unknown:hasExpiry:${skuCode}`);
  }

  return {
    skuCode,
    code: null,
    specification: null,
    supervisorMode,
    type: null,
    itemPackaging: null,
    isActive: null,
    publishStatus,
    prohibitInbound: prohibitInbound.value,
    prohibitOutbound: prohibitOutbound.value,
    prohibitReason: null,
    prohibitSource: "unknown",
    prohibitInboundReason: null,
    directShipmentRestriction: null,
    restrictionReason: null,
    rejectReason: null,
    itemType: null,
    registeredDimensions: hasDims
      ? { length, width, height, weight, unit: "kg" }
      : null,
    verifiedDimensions: null,
    specialFlags: {
      isBattery: battery.value,
      isWithLiquid: liquid.value,
      isWithPowder: powder.value,
      isWithMagnetism: magnetism.value,
      isFood: food.value,
      isDangerous: dangerous.value,
      isFragile: fragile.value,
    },
    managementMode: {
      supervisorMode,
      isBatchManager: batchManager.value,
      batchManagerType,
      hasExpiry: hasExpiry.value,
    },
    applicableRules: battery.value === true ? ["带电品需填报电池信息"] : [],
    handlingRequirements: [],
    fieldProvenance,
    _missingFacts: missingFacts,
    dataSource: "derived",
    confidence: "medium",
  };
}

type ContextCandidates = {
  merchandise: Map<string, Record<string, unknown>>;
  profiles: Map<string, { row: ProfileRow; missingFacts: string[] }>;
};

function collectContextCandidates(inputContext: Record<string, unknown>): ContextCandidates {
  const merchandise = new Map<string, Record<string, unknown>>();
  const profiles = new Map<string, { row: ProfileRow; missingFacts: string[] }>();
  const previousOutput = asRecord(inputContext.previousOutput);
  const structured = asRecord(previousOutput.structured);
  const lists: unknown[] = [];
  if (Array.isArray(structured.merchandiseList)) lists.push(...structured.merchandiseList);
  if (Array.isArray(previousOutput.merchandiseList)) lists.push(...previousOutput.merchandiseList);

  const enriched = asRecord(inputContext.enrichedContext);
  for (const v of Object.values(enriched)) {
    const rec = asRecord(v);
    const containerMissingFacts = Array.isArray(rec.missingFacts)
      ? rec.missingFacts.map(String)
      : [];
    const containerScope = asRecord(rec.scope);
    if (Array.isArray(rec.merchandiseList)) lists.push(...rec.merchandiseList);
    if (Array.isArray(rec.skus)) {
      for (const s of rec.skus) {
        const sourceRow = toProfileRow(s);
        if (sourceRow) {
          const row: ProfileRow =
            sourceRow.scope == null && Object.keys(containerScope).length > 0
              ? { ...sourceRow, scope: containerScope as ProfileScope }
              : sourceRow;
          profiles.set(row.skuCode.toUpperCase(), {
            row,
            missingFacts: containerMissingFacts.filter((fact) =>
              factBelongsToSku(fact, row.skuCode)
            ),
          });
        }
      }
    }
  }

  for (const item of lists) {
    const row = asRecord(item);
    const code = asText(row.skuCode ?? row.merchandiseCode ?? row.productCode);
    if (code) merchandise.set(code.toUpperCase(), row);
  }
  return { merchandise, profiles };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const requested = ((params.normalizedSkuCodes as string[]) ?? []).map((c) => asText(c)).filter(Boolean);
  const apiProfiles = (Array.isArray(params.apiProfiles) ? params.apiProfiles : [])
    .map(toProfileRow)
    .filter((row): row is ProfileRow => row != null);
  const inputContext = asRecord(params.inputContext);
  const context = collectContextCandidates(inputContext);
  const scope = currentScope(params);
  const fetchMeta = asRecord(params.fetchMeta) as ProfileFetchMeta;
  const fetchError = asText(fetchMeta.error);
  const fetchSource = asText(fetchMeta.source).toLowerCase();
  const fetchStrategy = asText(fetchMeta.strategy).toLowerCase();
  const apiUnavailable =
    fetchError !== "" ||
    fetchSource === "none" ||
    fetchSource === "unavailable" ||
    fetchStrategy === "no-plugin-no-env" ||
    fetchStrategy === "unavailable";
  const missingFacts: string[] = [];
  const mergedProfiles: ProfileRow[] = [];

  const apiByCode = new Map<string, ProfileRow>();
  for (const row of apiProfiles) {
    const req = asText(row._requestedSkuCode) || asText(row.skuCode);
    if (req) apiByCode.set(req.toUpperCase(), row);
  }

  for (const code of requested) {
    const key = code.toUpperCase();
    const apiRow = apiByCode.get(key);
    if (apiRow && isMappedProfile(apiRow)) {
      const mapped: ProfileRow = { ...apiRow, scope: scopeForNewRow(scope, apiRow.scope) };
      delete mapped._requestedSkuCode;
      const mappedMissingFacts = Array.isArray(mapped._missingFacts)
        ? mapped._missingFacts.map(String)
        : [];
      delete mapped._missingFacts;
      missingFacts.push(...mappedMissingFacts);
      if (!Array.isArray(mapped.applicableRules)) mapped.applicableRules = [];
      if (mapped.type == null) {
        missingFacts.push(`box_suite_type_unknown:${code}`);
      }
      if (mapped.prohibitSource === "unknown") {
        missingFacts.push(`prohibit_source_unknown:${code}`);
      }
      mergedProfiles.push(mapped);
      continue;
    }

    if (apiUnavailable) {
      if (fetchError) missingFacts.push(`profile_fetch_error:${code}`);
      missingFacts.push(`api_unavailable:${code}`);
    }

    const contextProfile = context.profiles.get(key);
    let contextProfileBlocked = false;
    if (contextProfile) {
      const scopeCheck = checkScope(scope, contextProfile.row.scope, code);
      if (!scopeCheck.reusable) {
        missingFacts.push(...scopeCheck.missingFacts);
        contextProfileBlocked = true;
      } else {
        const reused: ProfileRow = { ...contextProfile.row, skuCode: code };
        delete reused._requestedSkuCode;
        const reusedMissingFacts = Array.isArray(reused._missingFacts)
          ? reused._missingFacts.map(String)
          : [];
        delete reused._missingFacts;
        const contextMissingFacts = contextProfile.missingFacts.filter(
          (fact) => !(apiUnavailable && fact === `sku_not_found:${code}`)
        );
        missingFacts.push(...reusedMissingFacts, ...contextMissingFacts);
        if (
          reused.dataSource === "missing" &&
          !apiUnavailable &&
          !contextProfile.missingFacts.some((fact) => fact === `sku_not_found:${code}`)
        ) {
          missingFacts.push(`sku_not_found:${code}`);
        }
        mergedProfiles.push(reused);
        continue;
      }
    }

    const merch = contextProfileBlocked ? undefined : context.merchandise.get(key);
    if (merch) {
      const derived: ProfileRow = { ...mapMerchandise(merch, code), scope };
      const derivedMissingFacts = Array.isArray(derived._missingFacts)
        ? derived._missingFacts.map(String)
        : [];
      delete derived._missingFacts;
      const derivedGaps = apiUnavailable ? [] : [`api_miss_derived:${code}`];
      if (!asText(derived.supervisorMode)) {
        derivedGaps.push(`supervisorMode_unknown:${code}`);
      }
      if (derived.prohibitInbound == null || derived.prohibitOutbound == null) {
        derivedGaps.push(`prohibit_fields_unconfirmed:${code}`);
      }
      missingFacts.push(...derivedGaps, ...derivedMissingFacts);
      mergedProfiles.push(derived);
      continue;
    }

    if (!apiUnavailable) missingFacts.push(`sku_not_found:${code}`);
    mergedProfiles.push({
      skuCode: code,
      dataSource: "missing",
      confidence: "low",
      scope,
    });
  }

  return { mergedProfiles, missingFacts: [...new Set(missingFacts)] };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("derive-from-context")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
