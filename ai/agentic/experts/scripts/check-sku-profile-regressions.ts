/**
 * sku/profile 五项语义回归检查（纯本地，不调用 OpenAPI）
 */
import { execFileSync } from "child_process";
import path from "path";
import { mapItemToProfile } from "../shared/sku-item-page-list";
import { bundleCozeNodeCodeForExport } from "./coze-export/bundle-coze-node-code";

const root = path.resolve(__dirname, "..");
const tsNodeBin = path.join(root, "node_modules", "ts-node", "dist", "bin.js");
const project = path.join(root, "scripts", "tsconfig.json");
const nodeDir = path.join(root, "experts", "sku", "profile", "nodes");

function runNode(
  file: string,
  params: Record<string, unknown>,
  envOverrides: Record<string, string> = {}
): any {
  const out = execFileSync(
    process.execPath,
    [tsNodeBin, "-P", project, path.join(nodeDir, file), JSON.stringify(params)],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...envOverrides },
    }
  );
  return JSON.parse(out);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(values: unknown, expected: string, message: string) {
  assert(Array.isArray(values), `${message}: expected an array`);
  assert(values.includes(expected), `${message}: missing ${JSON.stringify(expected)}`);
}

function assertNotIncludes(values: unknown, expected: string, message: string) {
  assert(Array.isArray(values), `${message}: expected an array`);
  assert(!values.includes(expected), `${message}: unexpectedly found ${JSON.stringify(expected)}`);
}

function testApiMappingPreservesBooleanTriStateAndProvenance() {
  const mapped = mapItemToProfile(
    {
      skuCode: "SKU-API",
      status: 4,
      attributes: [{ attributeName: "battery", attributeValue: "N", areaCode: "ALL" }],
      declarations: [{ countryCode: "US" }],
    },
    { fetchProfile: "facts_core", importCountryCode: "US" }
  ) as any;

  assertEqual(mapped.specialFlags.isBattery, false, "explicit N must remain false");
  assertEqual(
    mapped.fieldProvenance["specialFlags.isBattery"],
    "api",
    "explicit N must retain API provenance"
  );
  assertEqual(mapped.specialFlags.isWithLiquid, null, "absent boolean must remain unknown");
  assertEqual(
    mapped.fieldProvenance["specialFlags.isWithLiquid"],
    "unknown",
    "absent boolean must have unknown provenance"
  );
  assertEqual(mapped.prohibitOutbound, null, "absent prohibitOutbound must not become false");
  assertEqual(
    mapped.fieldProvenance.prohibitOutbound,
    "unknown",
    "absent prohibitOutbound must have unknown provenance"
  );
  assertIncludes(
    mapped._missingFacts,
    "prohibit_outbound_unknown:SKU-API",
    "mapping must expose missing prohibitOutbound"
  );
  assertIncludes(
    mapped._missingFacts,
    "special_flag_unknown:isWithLiquid:SKU-API",
    "mapping must expose missing special flag"
  );

  const merged = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-API"],
    apiProfiles: [mapped],
    inputContext: {},
  });
  assertIncludes(
    merged.missingFacts,
    "prohibit_outbound_unknown:SKU-API",
    "mapped missing facts must be aggregated globally"
  );
  assert(
    !("_missingFacts" in merged.mergedProfiles[0]),
    "internal mapping gaps must not leak into the final SKU row"
  );

  const unknownStatus = mapItemToProfile(
    { skuCode: "SKU-STATUS-UNKNOWN", attributes: [], declarations: [] },
    { fetchProfile: "facts_core" }
  ) as any;
  assertEqual(unknownStatus.publishStatus, null, "absent API status must remain unknown");
  assertIncludes(
    unknownStatus._missingFacts,
    "publish_status_unknown:SKU-STATUS-UNKNOWN",
    "absent API status must be reported"
  );

  const unknownEnumStatus = mapItemToProfile(
    {
      skuCode: "SKU-STATUS-UNKNOWN-ENUM",
      status: 99,
      isActive: "Y",
      attributes: [],
      declarations: [],
    },
    { fetchProfile: "facts_core" }
  ) as any;
  assertEqual(
    unknownEnumStatus.publishStatus,
    null,
    "unknown numeric status must not fall back to isActive"
  );
  assertEqual(
    unknownEnumStatus.fieldProvenance.publishStatus,
    "unknown",
    "unknown numeric status must retain unknown provenance"
  );
  assertIncludes(
    unknownEnumStatus._missingFacts,
    "publish_status_unknown:SKU-STATUS-UNKNOWN-ENUM",
    "unknown numeric status must be reported"
  );
}

function testDerivedProfileDoesNotInventUnprovidedFacts() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-DER"],
    apiProfiles: [],
    inputContext: {
      previousOutput: {
        structured: {
          merchandiseList: [
            {
              skuCode: "SKU-DER",
              length: 20,
              width: 10,
              height: 5,
              weight: 1,
              hasBattery: true,
            },
          ],
        },
      },
    },
  });
  const row = result.mergedProfiles[0];

  assertEqual(row.publishStatus, null, "unprovided publish status must remain unknown");
  assertEqual(row.prohibitInbound, null, "unprovided inbound prohibition must remain unknown");
  assertEqual(row.prohibitOutbound, null, "unprovided outbound prohibition must remain unknown");
  assertEqual(row.specialFlags.isBattery, true, "provided battery flag must be retained");
  assertEqual(row.specialFlags.isWithLiquid, null, "unprovided special flag must remain unknown");
  assertEqual(row.managementMode.isBatchManager, null, "unprovided batch flag must remain unknown");
  assertEqual(row.managementMode.hasExpiry, null, "unprovided expiry flag must remain unknown");
  assertEqual(
    row.fieldProvenance["specialFlags.isBattery"],
    "derived",
    "known context fact must retain derived provenance"
  );
  assertIncludes(
    result.missingFacts,
    "publish_status_unknown:SKU-DER",
    "derived profile must report missing status"
  );
  assertIncludes(
    result.missingFacts,
    "management_mode_unknown:isBatchManager:SKU-DER",
    "derived profile must report missing batch fact"
  );
  assertIncludes(
    result.missingFacts,
    "supervisorMode_unknown:SKU-DER",
    "derived profile must report missing supervisor mode"
  );
  assertIncludes(
    result.missingFacts,
    "prohibit_fields_unconfirmed:SKU-DER",
    "derived profile must report incomplete prohibition facts"
  );
}

function testProhibitInboundNeedsCompleteFalseEvidence() {
  const declarationFalseOnly = mapItemToProfile(
    {
      skuCode: "SKU-INBOUND-DECL-FALSE",
      status: 4,
      attributes: [],
      declarations: [{ countryCode: "US", isProhibitWarehousing: "N" }],
    },
    { fetchProfile: "facts_core", importCountryCode: "US" }
  ) as any;
  assertEqual(
    declarationFalseOnly.prohibitInbound,
    null,
    "declaration false plus unknown first-leg evidence must remain unknown"
  );
  assertEqual(
    declarationFalseOnly.fieldProvenance.prohibitInbound,
    "unknown",
    "partial false evidence must have unknown provenance"
  );
  assertIncludes(
    declarationFalseOnly._missingFacts,
    "prohibit_inbound_unknown:SKU-INBOUND-DECL-FALSE",
    "partial false evidence must be reported"
  );

  const firstLegFalseOnly = mapItemToProfile(
    {
      skuCode: "SKU-INBOUND-LEG-FALSE",
      status: 4,
      attributes: [{ attributeName: "firstLegType", attributeValue: "NS", areaCode: "ALL" }],
      declarations: [{ countryCode: "US" }],
    },
    { fetchProfile: "facts_core", importCountryCode: "US" }
  ) as any;
  assertEqual(
    firstLegFalseOnly.prohibitInbound,
    null,
    "unknown declaration plus explicit non-PI leg must remain unknown"
  );
  assertIncludes(
    firstLegFalseOnly._missingFacts,
    "prohibit_inbound_unknown:SKU-INBOUND-LEG-FALSE",
    "second partial false case must be reported"
  );

  const bothFalse = mapItemToProfile(
    {
      skuCode: "SKU-INBOUND-BOTH-FALSE",
      status: 4,
      attributes: [{ attributeName: "firstLegType", attributeValue: "NS", areaCode: "ALL" }],
      declarations: [{ countryCode: "US", isProhibitWarehousing: "N" }],
    },
    { fetchProfile: "facts_core", importCountryCode: "US" }
  ) as any;
  assertEqual(bothFalse.prohibitInbound, false, "two explicit false sources must produce false");
  assertEqual(
    bothFalse.fieldProvenance.prohibitInbound,
    "api",
    "complete false evidence must retain API provenance"
  );
  assertNotIncludes(
    bothFalse._missingFacts,
    "prohibit_inbound_unknown:SKU-INBOUND-BOTH-FALSE",
    "complete false evidence must not be reported missing"
  );

  const trueAndUnknown = mapItemToProfile(
    {
      skuCode: "SKU-INBOUND-TRUE",
      status: 4,
      attributes: [],
      declarations: [{ countryCode: "US", isProhibitWarehousing: "Y" }],
    },
    { fetchProfile: "facts_core", importCountryCode: "US" }
  ) as any;
  assertEqual(trueAndUnknown.prohibitInbound, true, "one explicit true source must dominate unknown");
}

function testProhibitOutboundStaysUnknownWithoutVerifiedContract() {
  const mapped = mapItemToProfile(
    {
      skuCode: "SKU-OUTBOUND-UNVERIFIED",
      status: 4,
      prohibitOutbound: "Y",
      attributes: [
        { attributeName: "prohibitOutbound", attributeValue: "N", areaCode: "ALL" },
      ],
      declarations: [],
    },
    { fetchProfile: "facts_core", importCountryCode: "US" }
  ) as any;

  assertEqual(mapped.prohibitOutbound, null, "unverified same-name fields must not become facts");
  assertEqual(
    mapped.fieldProvenance.prohibitOutbound,
    "unknown",
    "unverified outbound source must remain unknown"
  );
  assertIncludes(
    mapped._missingFacts,
    "prohibit_outbound_unknown:SKU-OUTBOUND-UNVERIFIED",
    "unverified outbound fact must be reported missing"
  );
}

function testDerivedMissingFactsOnlyDescribeActualGaps() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-DER-KNOWN"],
    apiProfiles: [],
    inputContext: {
      previousOutput: {
        structured: {
          merchandiseList: [
            {
              skuCode: "SKU-DER-KNOWN",
              supervisorMode: "SI",
              prohibitInbound: false,
              prohibitOutbound: false,
              length: 20,
              width: 10,
              height: 5,
              weight: 1,
              hasBattery: true,
            },
          ],
        },
      },
    },
  });
  const row = result.mergedProfiles[0];

  assertEqual(row.supervisorMode, "SI", "known supervisor mode must be retained");
  assertEqual(row.prohibitInbound, false, "explicit derived false inbound fact must be retained");
  assertEqual(row.prohibitOutbound, false, "explicit derived false outbound fact must be retained");
  assertEqual(
    row.fieldProvenance.prohibitInbound,
    "derived",
    "explicit derived false must retain provenance"
  );
  assertNotIncludes(
    result.missingFacts,
    "supervisorMode_unknown:SKU-DER-KNOWN",
    "known supervisor mode must not be reported unknown"
  );
  assertNotIncludes(
    result.missingFacts,
    "prohibit_fields_unconfirmed:SKU-DER-KNOWN",
    "two known prohibition facts must not be reported unconfirmed"
  );
}

function testAllFetchProfilesCarryTriStateMetadata() {
  const raw = { skuCode: "SKU-SLICES", attributes: [], declarations: [] };

  const minimal = mapItemToProfile(raw, { fetchProfile: "minimal" }) as any;
  assertEqual(minimal.publishStatus, null, "minimal status must remain nullable");
  assertEqual(
    minimal.fieldProvenance.publishStatus,
    "unknown",
    "minimal status must carry provenance"
  );
  assertIncludes(
    minimal._missingFacts,
    "publish_status_unknown:SKU-SLICES",
    "minimal status gap must be explicit"
  );

  const audit = mapItemToProfile(raw, { fetchProfile: "audit_status" }) as any;
  assertEqual(audit.prohibitInbound, null, "audit prohibition must remain nullable");
  assertEqual(audit.isUrgent, null, "audit urgency must remain nullable");
  assertEqual(
    audit.fieldProvenance.prohibitInbound,
    "unknown",
    "audit prohibition must carry provenance"
  );
  assertEqual(
    audit.fieldProvenance.isUrgent,
    "unknown",
    "audit urgency must carry provenance"
  );
  assertIncludes(
    audit._missingFacts,
    "is_urgent_unknown:SKU-SLICES",
    "audit urgency gap must be explicit"
  );

  const barcode = mapItemToProfile(raw, { fetchProfile: "barcode_third" }) as any;
  assertEqual(
    barcode.managementMode.isBatchManager,
    null,
    "barcode slice must not hardcode missing batch management to false"
  );
  assertEqual(barcode.managementMode.hasExpiry, null, "barcode expiry must remain nullable");
  assertEqual(barcode.isSupportThirdSku, null, "barcode support flag must remain nullable");
  assertEqual(
    barcode.fieldProvenance["managementMode.isBatchManager"],
    "unknown",
    "barcode batch flag must carry provenance"
  );
  assertEqual(
    barcode.fieldProvenance.isSupportThirdSku,
    "unknown",
    "barcode support flag must carry provenance"
  );
  assertIncludes(
    barcode._missingFacts,
    "management_mode_unknown:isBatchManager:SKU-SLICES",
    "barcode batch gap must be explicit"
  );

  const core = mapItemToProfile(raw, { fetchProfile: "facts_core" }) as any;
  assertEqual(core.prohibitOutbound, null, "facts_core outbound fact must remain nullable");
  assertEqual(
    core.fieldProvenance.prohibitOutbound,
    "unknown",
    "facts_core outbound fact must carry provenance"
  );
  assertEqual(core.isUrgent, null, "facts_core urgency must remain nullable");
  assertEqual(
    core.fieldProvenance.isUrgent,
    "unknown",
    "facts_core urgency output must carry provenance"
  );

  const compliance = mapItemToProfile(raw, { fetchProfile: "facts_compliance" }) as any;
  assertEqual(compliance.dg, null, "facts_compliance dangerous flag must remain nullable");
  assertEqual(
    compliance.fieldProvenance["specialFlags.isDangerous"],
    "unknown",
    "facts_compliance dangerous flag must carry provenance"
  );
  assertEqual(
    compliance.fieldProvenance.dg,
    "unknown",
    "facts_compliance dg alias must carry provenance"
  );
  assertEqual(
    compliance.fieldProvenance.isUrgent,
    "unknown",
    "facts_compliance urgency output must carry provenance"
  );
  assertIncludes(
    compliance._missingFacts,
    "special_flag_unknown:isDangerous:SKU-SLICES",
    "facts_compliance dangerous gap must be explicit"
  );

  const supplement = mapItemToProfile(raw, { fetchProfile: "supplement_third_sku" }) as any;
  assertEqual(supplement.prohibitOutbound, null, "supplement slice must preserve core tri-state");
  assertEqual(
    supplement.fieldProvenance.prohibitOutbound,
    "unknown",
    "supplement slice must carry core provenance"
  );
  assertEqual(
    supplement.fieldProvenance.isUrgent,
    "unknown",
    "supplement urgency output must carry provenance"
  );
}

function testCountryScopedFactsDoNotLeakAcrossCountries() {
  const mapped = mapItemToProfile(
    {
      skuCode: "SKU-DE-REQUEST",
      status: 4,
      attributes: [
        { attributeName: "battery", attributeValue: "Y", areaCode: "US" },
        { attributeName: "firstLegType", attributeValue: "PI", areaCode: "US" },
      ],
      declarations: [
        { countryCode: "US", isProhibitWarehousing: "Y", firstLegType: "PI" },
      ],
    },
    { fetchProfile: "facts_core", importCountryCode: "DE" }
  ) as any;

  assertEqual(
    mapped.specialFlags.isBattery,
    null,
    "DE request must not reuse US-only special attributes"
  );
  assertEqual(
    mapped.fieldProvenance["specialFlags.isBattery"],
    "unknown",
    "country-mismatched special attribute must have unknown provenance"
  );
  assertIncludes(
    mapped._missingFacts,
    "special_flag_unknown:isBattery:SKU-DE-REQUEST",
    "country-mismatched special attribute must be reported missing"
  );
  assertEqual(mapped.prohibitInbound, null, "DE request must not reuse US-only prohibition data");
  assertEqual(
    mapped.fieldProvenance.prohibitInbound,
    "unknown",
    "country-mismatched prohibition must have unknown provenance"
  );
  assertIncludes(
    mapped._missingFacts,
    "prohibit_inbound_unknown:SKU-DE-REQUEST",
    "country-mismatched prohibition must be reported missing"
  );
}

function testPartialDimensionsKeepItemTypeUnknown() {
  const complete = { length: 30, width: 20, height: 10, weight: 1, unit: "kg" };
  const missingFields = ["length", "width", "height"] as const;

  for (const field of missingFields) {
    const dimensions: Record<string, unknown> = { ...complete };
    delete dimensions[field];
    const skuCode = `SKU-NO-${field.toUpperCase()}`;
    const result = runNode("calc-item-type-from-kb.ts", {
      mergedProfiles: [
        {
          skuCode,
          dataSource: "derived",
          itemType: null,
          registeredDimensions: dimensions,
        },
      ],
      missingFacts: [],
    });

    assertEqual(result.skus[0].itemType, null, `missing ${field} must keep item type unknown`);
    assertIncludes(
      result.missingFacts,
      `itemType_unknown:${skuCode}`,
      `missing ${field} must be reported`
    );
  }

  for (const field of ["length", "width", "height", "weight"] as const) {
    const dimensions = { ...complete, [field]: 0 };
    const skuCode = `SKU-ZERO-${field.toUpperCase()}`;
    const result = runNode("calc-item-type-from-kb.ts", {
      mergedProfiles: [
        {
          skuCode,
          dataSource: "derived",
          itemType: null,
          registeredDimensions: dimensions,
        },
      ],
      missingFacts: [],
    });

    assertEqual(result.skus[0].itemType, null, `non-positive ${field} must keep item type unknown`);
  }
}

function testEnrichedProfileReusePreservesNestedFacts() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-REUSED"],
    apiProfiles: [],
    inputContext: {
      enrichedContext: {
        "sku/profile": {
          skus: [
            {
              skuCode: "SKU-REUSED",
              dataSource: "api",
              confidence: "high",
              scope: { customerCode: null, importCountryCode: null },
              supervisorMode: "SI",
              publishStatus: "published",
              prohibitInbound: false,
              prohibitOutbound: null,
              specialFlags: {
                isBattery: true,
                isWithLiquid: false,
                isWithPowder: null,
                isWithMagnetism: false,
                isFood: false,
                isDangerous: null,
                isFragile: true,
              },
              managementMode: {
                supervisorMode: "SI",
                isBatchManager: true,
                batchManagerType: "SHELF_LIFE",
                hasExpiry: true,
              },
              fieldProvenance: {
                "specialFlags.isBattery": "api",
                "specialFlags.isWithLiquid": "api",
                "managementMode.isBatchManager": "api",
                "managementMode.batchManagerType": "api",
                "managementMode.hasExpiry": "api",
              },
            },
          ],
        },
      },
    },
  });
  const row = result.mergedProfiles[0];

  assertEqual(row.dataSource, "api", "reused mapped profile must preserve its source");
  assertEqual(row.specialFlags.isBattery, true, "reused nested true flag must be preserved");
  assertEqual(row.specialFlags.isWithLiquid, false, "reused nested false flag must be preserved");
  assertEqual(row.specialFlags.isFragile, true, "reused nested fragile flag must be preserved");
  assertEqual(
    row.managementMode.isBatchManager,
    true,
    "reused nested batch-management flag must be preserved"
  );
  assertEqual(
    row.managementMode.batchManagerType,
    "SHELF_LIFE",
    "reused nested batch type must be preserved"
  );
  assertEqual(row.managementMode.hasExpiry, true, "reused nested expiry flag must be preserved");
  assertEqual(
    row.fieldProvenance["specialFlags.isWithLiquid"],
    "api",
    "reused field provenance must be preserved"
  );
}

function scopedProfile(
  skuCode: string,
  scope?: { customerCode: string | null; importCountryCode: string | null }
): Record<string, unknown> {
  return {
    skuCode,
    dataSource: "api",
    confidence: "high",
    publishStatus: "published",
    prohibitInbound: false,
    prohibitOutbound: null,
    specialFlags: {
      isBattery: true,
      isWithLiquid: false,
      isWithPowder: null,
      isWithMagnetism: false,
      isFood: false,
      isDangerous: null,
      isFragile: false,
    },
    managementMode: {
      supervisorMode: "SI",
      isBatchManager: false,
      batchManagerType: null,
      hasExpiry: false,
    },
    fieldProvenance: {
      "specialFlags.isBattery": "api",
      "specialFlags.isWithLiquid": "api",
      "managementMode.isBatchManager": "api",
    },
    ...(scope ? { scope } : {}),
  };
}

function testEnrichedReuseRejectsMismatchedOrUnknownScope() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: [
      "SKU-TENANT",
      "SKU-COUNTRY",
      "SKU-GLOBAL-TENANT",
      "SKU-GLOBAL-COUNTRY",
      "SKU-NO-SCOPE",
    ],
    apiProfiles: [],
    customerCode: "CUSTOMER-B",
    importCountryCode: "DE",
    inputContext: {
      enrichedContext: {
        "sku/profile": {
          skus: [
            scopedProfile("SKU-TENANT", {
              customerCode: "CUSTOMER-A",
              importCountryCode: "DE",
            }),
            scopedProfile("SKU-COUNTRY", {
              customerCode: "CUSTOMER-B",
              importCountryCode: "US",
            }),
            scopedProfile("SKU-GLOBAL-TENANT", {
              customerCode: null,
              importCountryCode: "DE",
            }),
            scopedProfile("SKU-GLOBAL-COUNTRY", {
              customerCode: "CUSTOMER-B",
              importCountryCode: null,
            }),
            scopedProfile("SKU-NO-SCOPE"),
          ],
        },
      },
    },
  });

  for (const row of result.mergedProfiles) {
    assertEqual(row.dataSource, "missing", `${row.skuCode} must not reuse an unsafe scoped row`);
  }
  assertIncludes(
    result.missingFacts,
    "scope_mismatch:customerCode:SKU-TENANT",
    "cross-tenant reuse must be rejected explicitly"
  );
  assertIncludes(
    result.missingFacts,
    "scope_mismatch:importCountryCode:SKU-COUNTRY",
    "cross-country reuse must be rejected explicitly"
  );
  assertIncludes(
    result.missingFacts,
    "scope_mismatch:customerCode:SKU-GLOBAL-TENANT",
    "a tenant request must not reuse an explicitly tenantless row"
  );
  assertIncludes(
    result.missingFacts,
    "scope_mismatch:importCountryCode:SKU-GLOBAL-COUNTRY",
    "a country request must not reuse an explicitly countryless row"
  );
  assertIncludes(
    result.missingFacts,
    "scope_unknown:SKU-NO-SCOPE",
    "missing source scope must be rejected explicitly"
  );
}

function testEnrichedReuseRejectsSpecificScopeWhenRequestIsUnscoped() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-COUNTRY-SPECIFIC", "SKU-TENANT-SPECIFIC"],
    apiProfiles: [],
    inputContext: {
      enrichedContext: {
        "sku/profile": {
          skus: [
            scopedProfile("SKU-COUNTRY-SPECIFIC", {
              customerCode: null,
              importCountryCode: "US",
            }),
            scopedProfile("SKU-TENANT-SPECIFIC", {
              customerCode: "CUSTOMER-A",
              importCountryCode: null,
            }),
          ],
        },
      },
    },
  });

  for (const row of result.mergedProfiles) {
    assertEqual(
      row.dataSource,
      "missing",
      `${row.skuCode} must not reuse a specific scope for an unscoped request`
    );
  }
  assertIncludes(
    result.missingFacts,
    "scope_mismatch:importCountryCode:SKU-COUNTRY-SPECIFIC",
    "unscoped country request must reject a US-specific row"
  );
  assertIncludes(
    result.missingFacts,
    "scope_mismatch:customerCode:SKU-TENANT-SPECIFIC",
    "unscoped tenant request must reject a CUSTOMER-A-specific row"
  );
}

function testEnrichedReuseAllowsExactAllAndMatchingUnscopedScope() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-EXACT", "SKU-ALL"],
    apiProfiles: [],
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    inputContext: {
      enrichedContext: {
        "sku/profile": {
          skus: [
            scopedProfile("SKU-EXACT", {
              customerCode: "CUSTOMER-A",
              importCountryCode: "DE",
            }),
            scopedProfile("SKU-ALL", {
              customerCode: "CUSTOMER-A",
              importCountryCode: "ALL",
            }),
          ],
        },
      },
    },
  });

  for (const row of result.mergedProfiles) {
    assertEqual(row.dataSource, "api", `${row.skuCode} must reuse an allowed scoped row`);
    assertEqual(row.specialFlags.isBattery, true, `${row.skuCode} nested facts must survive reuse`);
  }

  const unscoped = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-UNSCOPED"],
    apiProfiles: [],
    inputContext: {
      enrichedContext: {
        "sku/profile": {
          skus: [
            scopedProfile("SKU-UNSCOPED", {
              customerCode: null,
              importCountryCode: null,
            }),
          ],
        },
      },
    },
  });
  assertEqual(
    unscoped.mergedProfiles[0].dataSource,
    "api",
    "two explicitly unscoped dimensions may be reused"
  );
}

function testApiAndDerivedRowsPersistCurrentScope() {
  const mapped = mapItemToProfile(
    {
      skuCode: "SKU-SCOPE-API",
      status: 4,
      attributes: [],
      declarations: [],
    },
    { fetchProfile: "facts_core", importCountryCode: "DE" }
  );
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-SCOPE-API", "SKU-SCOPE-DERIVED"],
    apiProfiles: [mapped],
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    inputContext: {
      previousOutput: {
        structured: {
          merchandiseList: [
            {
              skuCode: "SKU-SCOPE-DERIVED",
              length: 20,
              width: 10,
              height: 5,
              weight: 1,
              hasBattery: true,
            },
          ],
        },
      },
    },
  });

  for (const row of result.mergedProfiles) {
    assertEqual(row.scope.customerCode, "CUSTOMER-A", `${row.skuCode} must persist tenant scope`);
    assertEqual(row.scope.importCountryCode, "DE", `${row.skuCode} must persist country scope`);
  }
}

function testEnrichedContainerMissingFactsPropagatePerSku() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-CONTEXT-FACT", "SKU-CONTEXT-MISSING"],
    apiProfiles: [],
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    inputContext: {
      enrichedContext: {
        "sku/profile": {
          skus: [
            scopedProfile("SKU-CONTEXT-FACT", {
              customerCode: "CUSTOMER-A",
              importCountryCode: "DE",
            }),
            {
              skuCode: "SKU-CONTEXT-MISSING",
              dataSource: "missing",
              confidence: "low",
              scope: { customerCode: "CUSTOMER-A", importCountryCode: "DE" },
            },
          ],
          missingFacts: [
            "special_flag_unknown:isDangerous:SKU-CONTEXT-FACT",
            "sku_not_found:SKU-CONTEXT-MISSING",
            "special_flag_unknown:isFood:OTHER-SKU",
          ],
        },
      },
    },
  });

  assertIncludes(
    result.missingFacts,
    "special_flag_unknown:isDangerous:SKU-CONTEXT-FACT",
    "matched row must inherit its container missing fact"
  );
  assertIncludes(
    result.missingFacts,
    "sku_not_found:SKU-CONTEXT-MISSING",
    "reused missing row must inherit sku_not_found"
  );
  assertNotIncludes(
    result.missingFacts,
    "special_flag_unknown:isFood:OTHER-SKU",
    "container facts for another SKU must not leak"
  );
  assertEqual(
    result.mergedProfiles[1].dataSource,
    "missing",
    "container missing row must preserve dataSource"
  );
}

function testUnscopedCountrySpecificResultCannotBecomeGlobal() {
  const mapped = mapItemToProfile(
    {
      skuCode: "SKU-US-ONLY",
      status: 4,
      attributes: [
        { attributeName: "battery", attributeValue: "Y", areaCode: "US" },
        { attributeName: "firstLegType", attributeValue: "PI", areaCode: "US" },
      ],
      declarations: [
        { countryCode: "US", isProhibitWarehousing: "Y", firstLegType: "PI" },
      ],
    },
    { fetchProfile: "facts_core" }
  ) as any;

  assertEqual(
    mapped.specialFlags.isBattery,
    null,
    "unscoped request must not read a US-only special attribute"
  );
  assertEqual(
    mapped.prohibitInbound,
    null,
    "unscoped request must not read a US-only declaration"
  );

  const stageOne = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-US-ONLY"],
    apiProfiles: [mapped],
    customerCode: "CUSTOMER-A",
    inputContext: {},
  });
  const stageOneRow = stageOne.mergedProfiles[0];
  assert(
    !Object.prototype.hasOwnProperty.call(stageOneRow.scope, "importCountryCode"),
    "US-specific source without requested country must persist unknown country scope"
  );

  const stageTwo = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-US-ONLY"],
    apiProfiles: [],
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    inputContext: {
      enrichedContext: {
        "sku/profile": {
          skus: stageOne.mergedProfiles,
          missingFacts: stageOne.missingFacts,
        },
      },
    },
  });

  assertEqual(
    stageTwo.mergedProfiles[0].dataSource,
    "missing",
    "DE request must not reuse an unscoped row sourced from US-only data"
  );
  assertIncludes(
    stageTwo.missingFacts,
    "scope_unknown:SKU-US-ONLY",
    "second stage must explain unknown import-country scope"
  );
}

function testNotFoundKeepsOnlyIdentifierMetadata() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-MISSING"],
    apiProfiles: [],
    inputContext: {},
  });
  const row = result.mergedProfiles[0];
  const keys = Object.keys(row).sort().join(",");

  assertEqual(row.dataSource, "missing", "not-found row must use missing source");
  assertEqual(
    keys,
    ["confidence", "dataSource", "scope", "skuCode"].sort().join(","),
    "not-found row must not contain placeholder business facts"
  );
  assertIncludes(result.missingFacts, "sku_not_found:SKU-MISSING", "not-found fact must be explicit");
}

function testFetchFailureIsNotReportedAsSkuNotFound() {
  const result = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU-FETCH-ERROR"],
    apiProfiles: [],
    fetchMeta: {
      requested: 1,
      found: 0,
      source: "none",
      strategy: "no-plugin-no-env",
      error: "winit_env_unavailable",
    },
    inputContext: {},
  });

  assertIncludes(
    result.missingFacts,
    "profile_fetch_error:SKU-FETCH-ERROR",
    "fetch errors must be distinguished from a valid empty result"
  );
  assertIncludes(
    result.missingFacts,
    "api_unavailable:SKU-FETCH-ERROR",
    "unavailable API must be explicit"
  );
  assertNotIncludes(
    result.missingFacts,
    "sku_not_found:SKU-FETCH-ERROR",
    "fetch failure must not be reported as an authoritative not-found result"
  );
  assertEqual(
    result.mergedProfiles[0].dataSource,
    "missing",
    "fetch failure still returns identifier-only metadata"
  );
}

function assertFetchFailureDoesNotBecomeNotFound(
  skuCode: string,
  fetchMeta: Record<string, unknown>
) {
  const derived = runNode("derive-from-context.ts", {
    normalizedSkuCodes: [skuCode],
    apiProfiles: [],
    fetchMeta,
    inputContext: {},
  });
  assertIncludes(
    derived.missingFacts,
    `profile_fetch_error:${skuCode}`,
    "fetch-node error metadata must reach derive"
  );
  assertIncludes(
    derived.missingFacts,
    `api_unavailable:${skuCode}`,
    "fetch-node API failure must be marked unavailable"
  );
  assertNotIncludes(
    derived.missingFacts,
    `sku_not_found:${skuCode}`,
    "fetch-node failure must never become an authoritative not-found result"
  );
}

function testPluginErrorResponseBecomesFetchError() {
  const skuCode = "SKU-PLUGIN-500";
  const fetched = runNode("fetch-sku-profile.ts", {
    normalizedSkuCodes: [skuCode],
    fetchProfile: "facts_core",
    actionPlans: [{ inputToken: skuCode, skuCode }],
    winitPluginOutputList: [
      { data: { code: 500, msg: "upstream failed", data: null } },
    ],
  });

  assertEqual(fetched.rawItems.length, 0, "failed plugin response must not yield API rows");
  assert(
    String(fetched.fetchMeta.error ?? "").includes("500") &&
      String(fetched.fetchMeta.error ?? "").includes("upstream failed"),
    "plugin error metadata must retain safe code and message context"
  );
  assertEqual(
    fetched.fetchMeta.source,
    "winit.item.page.list",
    "plugin error must identify its API source"
  );
  assertEqual(
    fetched.fetchMeta.strategy,
    "plugin-batch-error",
    "plugin error must identify the failed strategy"
  );
  assertFetchFailureDoesNotBecomeNotFound(skuCode, fetched.fetchMeta);

  const invalidSkuCode = "SKU-PLUGIN-INVALID";
  const invalid = runNode("fetch-sku-profile.ts", {
    normalizedSkuCodes: [invalidSkuCode],
    fetchProfile: "facts_core",
    actionPlans: [{ inputToken: invalidSkuCode, skuCode: invalidSkuCode }],
    winitPluginOutputList: [{ data: { code: 0, msg: "ok", data: null } }],
  });
  assertEqual(
    invalid.fetchMeta.error,
    "plugin_response_invalid_data",
    "successful envelope with invalid data must still be a fetch error"
  );
  assertEqual(
    invalid.fetchMeta.strategy,
    "plugin-batch-error",
    "invalid plugin data must identify the failed strategy"
  );
  assertFetchFailureDoesNotBecomeNotFound(invalidSkuCode, invalid.fetchMeta);
}

function testSuccessfulEmptyPluginResponseBecomesNotFound() {
  const skuCode = "SKU-NOT-FOUND";
  for (const output of [
    { data: { code: 0, msg: "操作成功", data: "" } },
    { data: "" },
  ]) {
    const fetched = runNode("fetch-sku-profile.ts", {
      normalizedSkuCodes: [skuCode],
      fetchProfile: "facts_core",
      actionPlans: [{ inputToken: skuCode, skuCode }],
      winitPluginOutputList: [output],
    });

    assertEqual(fetched.rawItems.length, 0, "successful empty response must have no rows");
    assertEqual(fetched.fetchMeta.strategy, "plugin-batch", "empty success must keep success strategy");
    assertEqual(fetched.fetchMeta.error, undefined, "empty success must not create fetch error");

    const derived = runNode("derive-from-context.ts", {
      normalizedSkuCodes: [skuCode],
      apiProfiles: [],
      fetchMeta: fetched.fetchMeta,
      inputContext: {},
    });
    assertIncludes(derived.missingFacts, `sku_not_found:${skuCode}`, "empty success must become not found");
    assertNotIncludes(derived.missingFacts, `api_unavailable:${skuCode}`, "empty success must not become unavailable");
  }
}

function testLocalProxyThrowBecomesFetchError() {
  const skuCode = "SKU-PROXY-THROW";
  const fetched = runNode(
    "fetch-sku-profile.ts",
    {
      normalizedSkuCodes: [skuCode],
      fetchProfile: "facts_core",
      actions: [{ action: "winit.item.page.list", data: "{}" }],
      actionPlans: [{ inputToken: skuCode, skuCode }],
      winitPluginOutputList: [],
    },
    {
      COZE_API_BASE_URL: "http://127.0.0.1:1",
      COZE_API_TOKEN: "test-token",
      COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID: "test-workflow",
      COZE_WINIT_CUSTOMER_CODE: "TEST-CUSTOMER",
      COZE_WINIT_CUSTOMER_NAME: "Test Customer",
      COZE_WINIT_USERNAME: "test-user",
    }
  );

  assertEqual(fetched.rawItems.length, 0, "proxy throw must not yield API rows");
  assertEqual(
    fetched.fetchMeta.error,
    "local_proxy_error",
    "proxy throw must be explicit without exposing exception details"
  );
  assertEqual(
    fetched.fetchMeta.source,
    "winit.item.page.list",
    "proxy throw must identify its API source"
  );
  assertEqual(
    fetched.fetchMeta.strategy,
    "local-proxy-error",
    "proxy throw must identify the failed strategy"
  );
  assertFetchFailureDoesNotBecomeNotFound(skuCode, fetched.fetchMeta);
}

function testMissingWeightKeepsItemTypeUnknown() {
  const result = runNode("calc-item-type-from-kb.ts", {
    mergedProfiles: [
      {
        skuCode: "SKU-NO-WEIGHT",
        dataSource: "derived",
        itemType: null,
        registeredDimensions: { length: 30, width: 20, height: 10, weight: null, unit: "kg" },
      },
    ],
    missingFacts: [],
  });

  assertEqual(result.skus[0].itemType, null, "missing weight must not produce a definite item type");
  assertIncludes(
    result.missingFacts,
    "itemType_unknown:SKU-NO-WEIGHT",
    "missing weight must be reported"
  );
}

function testSummaryMentionsAllConfirmedSpecialFlags() {
  const result = runNode("format-output.ts", {
    skus: [
      {
        skuCode: "SKU-FLAGS",
        dataSource: "api",
        itemType: "small",
        supervisorMode: "SI",
        specialFlags: {
          isBattery: false,
          isWithLiquid: false,
          isWithPowder: false,
          isWithMagnetism: true,
          isFood: false,
          isDangerous: true,
          isFragile: true,
        },
        managementMode: { supervisorMode: "SI" },
      },
    ],
    missingFacts: [],
    fetchMeta: {},
    inputContext: {},
  });
  const analysis = String(result.analysis);

  assertEqual(
    result.structured.fetchMeta.strategy,
    "unknown",
    "format output must keep fetchMeta.strategy serializable"
  );

  assert(analysis.includes("磁性"), "summary must mention confirmed magnetism");
  assert(analysis.includes("危险品"), "summary must mention confirmed dangerous goods");
  assert(analysis.includes("易碎"), "summary must mention confirmed fragile flag");
  assert(!analysis.includes("无特殊属性标记"), "summary must not deny confirmed special flags");
}

function testSummaryDistinguishesFullyUnknownFlags() {
  const result = runNode("format-output.ts", {
    skus: [
      {
        skuCode: "SKU-ALL-UNKNOWN",
        dataSource: "api",
        itemType: null,
        supervisorMode: null,
        specialFlags: {
          isBattery: null,
          isWithLiquid: null,
          isWithPowder: null,
          isWithMagnetism: null,
          isFood: null,
          isDangerous: null,
          isFragile: null,
        },
        managementMode: { supervisorMode: null },
      },
    ],
    missingFacts: [],
    fetchMeta: {},
    inputContext: {},
  });
  const analysis = String(result.analysis);

  assert(analysis.includes("特殊属性未完整确认"), "fully unknown flags must be described as unknown");
  assert(!analysis.includes("无特殊属性标记"), "fully unknown flags must not be described as all false");
}

function testTypeOnlyImportsDoNotInlineSharedRuntime() {
  for (const file of ["derive-from-context.ts", "calc-item-type-from-kb.ts"]) {
    const bundled = bundleCozeNodeCodeForExport(path.join(nodeDir, file), root);
    assert(!bundled.includes("/* coze-inline: shared/"), `${file} must not inline type-only imports`);
    assert(
      Buffer.byteLength(bundled, "utf8") <= 20_000,
      `${file} exceeds type-only Coze code envelope`
    );
  }
}

const cases: Array<[string, () => void]> = [
  ["api boolean tri-state and provenance", testApiMappingPreservesBooleanTriStateAndProvenance],
  ["derived facts remain unknown", testDerivedProfileDoesNotInventUnprovidedFacts],
  ["inbound false requires complete evidence", testProhibitInboundNeedsCompleteFalseEvidence],
  ["outbound source stays unverified", testProhibitOutboundStaysUnknownWithoutVerifiedContract],
  ["derived gaps are conditional", testDerivedMissingFactsOnlyDescribeActualGaps],
  ["six fetch profiles carry tri-state metadata", testAllFetchProfilesCarryTriStateMetadata],
  ["country-scoped facts do not leak", testCountryScopedFactsDoNotLeakAcrossCountries],
  ["partial dimensions keep item type unknown", testPartialDimensionsKeepItemTypeUnknown],
  ["enriched mapped profiles preserve nested facts", testEnrichedProfileReusePreservesNestedFacts],
  ["enriched reuse rejects unsafe scope", testEnrichedReuseRejectsMismatchedOrUnknownScope],
  [
    "enriched reuse rejects specific scope for unscoped requests",
    testEnrichedReuseRejectsSpecificScopeWhenRequestIsUnscoped,
  ],
  [
    "enriched reuse accepts exact all and matching unscoped scope",
    testEnrichedReuseAllowsExactAllAndMatchingUnscopedScope,
  ],
  ["new rows persist current scope", testApiAndDerivedRowsPersistCurrentScope],
  ["container missing facts propagate per SKU", testEnrichedContainerMissingFactsPropagatePerSku],
  ["unscoped country-specific result is not global", testUnscopedCountrySpecificResultCannotBecomeGlobal],
  ["not-found row has no business placeholders", testNotFoundKeepsOnlyIdentifierMetadata],
  ["fetch failure is not sku not found", testFetchFailureIsNotReportedAsSkuNotFound],
  ["plugin error response becomes fetch error", testPluginErrorResponseBecomesFetchError],
  ["successful empty plugin response becomes not found", testSuccessfulEmptyPluginResponseBecomesNotFound],
  ["local proxy throw becomes fetch error", testLocalProxyThrowBecomesFetchError],
  ["missing weight keeps item type unknown", testMissingWeightKeepsItemTypeUnknown],
  ["summary covers confirmed special flags", testSummaryMentionsAllConfirmedSpecialFlags],
  ["summary distinguishes fully unknown flags", testSummaryDistinguishesFullyUnknownFlags],
  ["type-only imports do not inline shared runtime", testTypeOnlyImportsDoNotInlineSharedRuntime],
];

function main() {
  const filters = process.argv.slice(2).map((value) => value.toLowerCase());
  const selectedCases = filters.length > 0
    ? cases.filter(([name]) => filters.some((filter) => name.toLowerCase().includes(filter)))
    : cases;
  assert(selectedCases.length > 0, `no profile cases matched filters: ${filters.join(", ")}`);
  const failures: string[] = [];
  for (const [name, run] of selectedCases) {
    try {
      run();
      console.log(`PASS ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.error(`FAIL ${name}: ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} sku/profile regression case(s) failed`);
  }
  console.log("check-sku-profile-regressions: all passed");
}

main();
