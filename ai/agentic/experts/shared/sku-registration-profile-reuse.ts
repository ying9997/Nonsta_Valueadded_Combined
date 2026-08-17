/** registration-guide 复用 sku/profile 快照时的统一安全门。 */

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

const TRUSTED_FACT_FIELDS = new Set([
  "status",
  "publishStatus",
  "estimateAuditDate",
  "isUrgent",
  "rejectReason",
  "standardScript",
  "prohibitInbound",
  "prohibitOutbound",
  "restrictionReason",
  "directShipmentRestriction",
  "prohibitSource",
  "supervisorMode",
  "itemType",
  "type",
  "registeredDimensions",
  "verifiedDimensions",
  "specialFlags",
  "managementMode",
  "applicableRules",
]);

const AUDIT_FACT_FIELDS = new Set([
  "status",
  "publishStatus",
  "estimateAuditDate",
  "isUrgent",
  "rejectReason",
  "standardScript",
]);

function isMeaningfulFact(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && !["unknown", "undefined", "null", "未知"].includes(normalized);
  }
  if (Array.isArray(value)) return value.some(isMeaningfulFact);
  if (value && typeof value === "object") {
    return Object.values(record(value)).some(isMeaningfulFact);
  }
  return false;
}

export function hasTrustedRegistrationFact(
  rowValue: unknown,
  intentTypeValue: unknown = ""
): boolean {
  const row = record(rowValue);
  const intentType = text(intentTypeValue).toLowerCase();
  if (["audit_status", "expedite", "resubmit"].includes(intentType)) {
    return [...AUDIT_FACT_FIELDS].some((field) => isMeaningfulFact(row[field]));
  }
  if (intentType === "blocked_inbound") {
    const publishStatus = text(row.publishStatus).toLowerCase();
    return Boolean(publishStatus) &&
      (publishStatus !== "published" || typeof row.prohibitInbound === "boolean");
  }
  return [...TRUSTED_FACT_FIELDS].some((field) => isMeaningfulFact(row[field]));
}

export function isRegistrationProfileScopeCompatible(
  scopeValue: unknown,
  customerCodeValue: unknown,
  importCountryCodeValue: unknown
): boolean {
  const scope = record(scopeValue);
  const customerCode = text(customerCodeValue).toUpperCase();
  const importCountryCode = text(importCountryCodeValue).toUpperCase();
  if (!customerCode || !hasOwn(scope, "customerCode")) return false;
  const sourceCustomerCode = text(scope.customerCode).toUpperCase();
  if (!sourceCustomerCode || sourceCustomerCode !== customerCode) return false;

  if (!hasOwn(scope, "importCountryCode")) return false;
  const sourceCountry = text(scope.importCountryCode).toUpperCase();
  if (importCountryCode) {
    return sourceCountry === importCountryCode || sourceCountry === "ALL";
  }
  return sourceCountry === "" || sourceCountry === "ALL";
}

function hasScopeFailure(
  snapshot: Record<string, unknown>,
  row: Record<string, unknown>,
  skuCode: string
): boolean {
  const suffix = `:${skuCode.toUpperCase()}`;
  const facts = [
    ...(Array.isArray(snapshot.missingFacts) ? snapshot.missingFacts : []),
    ...(Array.isArray(row._missingFacts) ? row._missingFacts : []),
  ].map(text);
  return facts.some((fact) => {
    const normalized = fact.toUpperCase();
    return (
      normalized.endsWith(suffix) &&
      (normalized.startsWith("SCOPE_MISMATCH:") || normalized.startsWith("SCOPE_UNKNOWN:"))
    );
  });
}

function compactFactValue(value: unknown): unknown {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map(compactFactValue).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const compacted: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record(value))) {
      const next = compactFactValue(nested);
      if (next !== undefined) compacted[key] = next;
    }
    return compacted;
  }
  return value;
}

export function findTrustedRegistrationProfileRow(
  snapshotValue: unknown,
  skuCodeValue: unknown,
  customerCodeValue: unknown,
  importCountryCodeValue: unknown,
  intentTypeValue: unknown = ""
): Record<string, unknown> | null {
  const snapshot = record(snapshotValue);
  const skuCode = text(skuCodeValue);
  const skus = Array.isArray(snapshot.skus) ? snapshot.skus : [];
  const row = skus
    .map(record)
    .find((candidate) => text(candidate.skuCode).toUpperCase() === skuCode.toUpperCase());
  if (
    !skuCode ||
    !row ||
    text(row.dataSource).toLowerCase() !== "api" ||
    hasScopeFailure(snapshot, row, skuCode) ||
    !isRegistrationProfileScopeCompatible(row.scope, customerCodeValue, importCountryCodeValue) ||
    !hasTrustedRegistrationFact(row, intentTypeValue)
  ) {
    return null;
  }
  return row;
}

export function buildSafeRegistrationProfileSnapshot(
  snapshotValue: unknown,
  skuCodeValue: unknown,
  customerCodeValue: unknown,
  importCountryCodeValue: unknown,
  intentTypeValue: unknown = ""
): Record<string, unknown> {
  const skuCode = text(skuCodeValue);
  const snapshot = record(snapshotValue);
  const sourceRows = Array.isArray(snapshot.skus) ? snapshot.skus : [];
  const sourceRow = sourceRows
    .map(record)
    .find((candidate) => text(candidate.skuCode).toUpperCase() === skuCode.toUpperCase());
  const scopeCompatible = Boolean(
    sourceRow &&
      text(sourceRow.dataSource).toLowerCase() === "api" &&
      !hasScopeFailure(snapshot, sourceRow, skuCode) &&
      isRegistrationProfileScopeCompatible(
        sourceRow.scope,
        customerCodeValue,
        importCountryCodeValue
      )
  );
  const targetSuffix = `:${skuCode.toUpperCase()}`;
  const missingFacts = scopeCompatible
    ? [
        ...(Array.isArray(snapshot.missingFacts) ? snapshot.missingFacts : []),
        ...(Array.isArray(sourceRow?._missingFacts) ? sourceRow._missingFacts : []),
      ]
        .map(text)
        .filter((fact) => fact.toUpperCase().endsWith(targetSuffix))
    : [];
  const row = findTrustedRegistrationProfileRow(
    snapshot,
    skuCode,
    customerCodeValue,
    importCountryCodeValue,
    intentTypeValue
  );
  if (!row) return missingFacts.length > 0 ? { missingFacts } : {};

  const safeRow: Record<string, unknown> = { skuCode, dataSource: "api" };
  for (const [key, value] of Object.entries(row)) {
    if (key === "skuCode" || key === "dataSource" || key === "scope" || key.startsWith("_")) {
      continue;
    }
    const compacted = compactFactValue(value);
    if (compacted !== undefined) safeRow[key] = compacted;
  }
  const sourceScope = record(row.scope);
  safeRow.scope = {
    customerCode: text(sourceScope.customerCode),
    importCountryCode: text(sourceScope.importCountryCode).toUpperCase() || null,
  };
  return { skus: [safeRow], missingFacts };
}
