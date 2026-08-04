/**
 * sku/profile 节点级单测（mock，不依赖真实 OpenAPI）
 */
import { execFileSync } from "child_process";
import path from "path";
import {
  mapItemToProfile,
  shouldExposeReturnFields,
  buildPageListData,
} from "../shared/sku-item-page-list";

const root = path.resolve(__dirname, "..");
const tsNodeBin = path.join(root, "node_modules", "ts-node", "dist", "bin.js");
const project = path.join(root, "scripts", "tsconfig.json");
const nodeDir = path.join(root, "experts", "sku", "profile", "nodes");

function runNode(file: string, params: Record<string, unknown>): any {
  const out = execFileSync(
    process.execPath,
    [tsNodeBin, "-P", project, path.join(nodeDir, file), JSON.stringify(params)],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  return JSON.parse(out);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function sampleRawItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skuCode: "SKU001",
    code: "M001",
    status: 4,
    isActive: "Y",
    specification: "spec",
    sizeWeight: {
      registerLength: 10,
      registerWidth: 8,
      registerHeight: 5,
      registerWeight: 0.5,
      length: 10,
      width: 8,
      height: 5,
      weight: 0.48,
    },
    attributes: [
      { attributeName: "supervisorMode", attributeValue: "SI", areaCode: "ALL" },
      { attributeName: "packaging", attributeValue: "LOGISTICS", areaCode: null },
      { attributeName: "battery", attributeValue: "Y", areaCode: "ALL" },
      { attributeName: "liquid", attributeValue: "N", areaCode: "ALL" },
      { attributeName: "firstLegType", attributeValue: "NS", areaCode: "ALL" },
      { attributeName: "estimateAuditDate", attributeValue: "2026-07-20 18:00:00", areaCode: "US" },
      { attributeName: "isUrgent", attributeValue: "N", areaCode: "US" },
    ],
    declarations: [
      {
        countryCode: "US",
        firstLegType: "AIR",
        isProhibitWarehousing: "N",
        status: 4,
        changeStatus: null,
        returnReason: "历史残留退回原因",
        standardScript: "不应展示",
      },
    ],
    skuCodeThirds: ["FNSKU-1"],
    ...overrides,
  };
}

function testValidateRequiresSkuCodes() {
  const empty = runNode("validate-sku-codes.ts", { skuCodes: [] });
  assertEqual(empty.skipApi, true, "empty skuCodes should skip api");
  assertEqual(empty.validationError, "skuCodes_required", "should require skuCodes");
  assertEqual(empty.fetchProfile, "facts_core", "default fetchProfile");

  const ok = runNode("validate-sku-codes.ts", {
    skuCodes: [" sku-a ", "SKU-A", "sku-b"],
    fetchProfile: "audit_status",
    inputContext: { chainId: "c1" },
  });
  assertEqual(ok.skipApi, false, "valid codes should not skip");
  assertEqual(ok.normalizedSkuCodes.length, 2, "should dedupe case-insensitively");
  assertEqual(ok.fetchProfile, "audit_status", "passthrough fetchProfile");
}

function testResolveFetchPlan() {
  const built = runNode("resolve-fetch-plan.ts", {
    skipApi: false,
    normalizedSkuCodes: ["SKU001", "SKU002"],
    importCountryCode: "US",
    fetchProfile: "facts_core",
  });
  assertEqual(built.actions.length, 1, "single batch action");
  assertEqual(built.actionName, "winit.item.page.list", "action name");
  assertEqual(built.actionPlans.length, 2, "plans for each sku");
  const data = JSON.parse(built.actions[0].data);
  assertEqual(data.skuCodes.length, 2, "skuCodes array");
  assertEqual(data.importCountryCode, "US", "importCountryCode");
  assertEqual(data.pageVo.pageSize, 2, "pageSize matches count");
}

function testLibMappingAndReturnRules() {
  const data = buildPageListData({
    skuCodes: ["A"],
    fetchProfile: "audit_status",
    importCountryCode: "US",
  });
  assertEqual(data.queryType, "REGISTERING", "audit queryType");

  const mapped = mapItemToProfile(sampleRawItem(), {
    fetchProfile: "facts_core",
    importCountryCode: "US",
  });
  assertEqual(mapped.publishStatus, "published", "status 4 → published");
  assertEqual(mapped.supervisorMode, "SI", "supervisorMode from attrs");
  assertEqual((mapped.specialFlags as any).isBattery, true, "battery");
  assertEqual(mapped.directShipmentRestriction, "seller_direct", "NS → seller_direct");
  assertEqual(mapped.rejectReason, null, "no return on published without changeStatus=5");
  assert(!shouldExposeReturnFields(4, { changeStatus: null }), "status4 no changeStatus");
  assert(shouldExposeReturnFields(5, {}), "status5 exposes");

  const returned = mapItemToProfile(
    sampleRawItem({
      status: 5,
      declarations: [
        {
          countryCode: "US",
          isProhibitWarehousing: "Y",
          returnReason: "申报不符",
          standardScript: "请修改申报要素后重提",
          changeStatus: null,
        },
      ],
    }),
    { fetchProfile: "audit_status", importCountryCode: "US" }
  );
  assertEqual(returned.rejectReason, "申报不符", "return reason when status=5");
  assertEqual(returned.estimateAuditDate, "2026-07-20 18:00:00", "estimateAuditDate");
  assertEqual(returned.prohibitInbound, true, "prohibit inbound");
}

function testFetchAndPrune() {
  const listPayload = {
    pageNo: 1,
    pageSize: 20,
    totalCount: 1,
    list: [sampleRawItem()],
  };
  const fetched = runNode("fetch-sku-profile.ts", {
    skipApi: false,
    normalizedSkuCodes: ["SKU001"],
    fetchProfile: "facts_core",
    actionPlans: [{ inputToken: "SKU001", skuCode: "SKU001" }],
    winitPluginOutputList: [{ data: JSON.stringify(listPayload) }],
  });
  assertEqual(fetched.rawItems.length, 1, "should find one raw item");
  assertEqual(fetched.fetchMeta.source, "winit.item.page.list", "source page.list");
  assert(Array.isArray(fetched.rawItems[0].attributes), "raw still has attributes");

  const pruned = runNode("prune-and-map-item.ts", {
    rawItems: fetched.rawItems,
    fetchMeta: fetched.fetchMeta,
    fetchProfile: "facts_core",
    importCountryCode: "US",
  });
  assertEqual(pruned.apiProfiles.length, 1, "mapped one");
  assertEqual(pruned.apiProfiles[0].supervisorMode, "SI", "mapped supervisorMode");
  assertEqual(pruned.fetchMeta.pruned, true, "pruned flag");
  assert(!Array.isArray(pruned.apiProfiles[0].attributes), "no raw attributes");
}

function testDeriveApiAndMerchandiseFallback() {
  const mapped = mapItemToProfile(sampleRawItem(), {
    fetchProfile: "facts_core",
    importCountryCode: "US",
    requestedSkuCode: "SKU001",
  });
  const derived = runNode("derive-from-context.ts", {
    normalizedSkuCodes: ["SKU001", "SKU-MISS", "SKU-DER"],
    apiProfiles: [mapped],
    inputContext: {
      chainId: "c1",
      previousOutput: {
        structured: {
          merchandiseList: [{ skuCode: "SKU-DER", weight: 1.2, hasBattery: true }],
        },
      },
    },
  });
  assertEqual(derived.mergedProfiles.length, 3, "three profiles");
  assertEqual(derived.mergedProfiles[0].dataSource, "api", "api hit");
  assertEqual(derived.mergedProfiles[0].specialFlags.isBattery, true, "battery flag");
  assertEqual(derived.mergedProfiles[1].confidence, "low", "miss should be low");
  assert(
    derived.missingFacts.some((f: string) => f === "sku_not_found:SKU-MISS"),
    "should mark sku_not_found"
  );
  assertEqual(derived.mergedProfiles[2].dataSource, "derived", "merchandise derive");
  assertEqual(derived.mergedProfiles[2].specialFlags.isBattery, true, "derived battery");
}

function testCalcItemTypeAndFormat() {
  const calc = runNode("calc-item-type-from-kb.ts", {
    mergedProfiles: [
      {
        skuCode: "SKU001",
        dataSource: "api",
        confidence: "high",
        registeredDimensions: { length: 10, width: 8, height: 5, weight: 0.5, unit: "kg" },
        specialFlags: { isBattery: true },
        managementMode: { supervisorMode: "SI" },
        supervisorMode: "SI",
        itemType: null,
      },
    ],
    missingFacts: ["prohibit_source_unknown:SKU001"],
  });
  assertEqual(calc.skus[0].itemType, "small", "small item type");

  const formatted = runNode("format-output.ts", {
    skus: calc.skus,
    missingFacts: calc.missingFacts,
    fetchMeta: {
      requested: 1,
      found: 1,
      source: "winit.item.page.list",
      fetchProfile: "facts_core",
      pruned: true,
    },
    validationError: "",
    inputContext: { chainId: "chain-x" },
  });
  assertEqual(formatted.outputContext.expertId, "sku/profile", "expertId");
  assert(formatted.enrichedContext["sku/profile"], "enrichedContext key");
  assertEqual(formatted.structured.skus[0].itemType, "small", "structured itemType");
  assert(String(formatted.analysis).includes("SKU001"), "analysis mentions sku");
}

function testFormatNeedInfo() {
  const formatted = runNode("format-output.ts", {
    skus: [],
    missingFacts: [],
    fetchMeta: {},
    validationError: "skuCodes_required",
    inputContext: {},
  });
  assertEqual(formatted.structured.missingFacts[0], "skuCodes_required", "need skuCodes");
  assert(String(formatted.analysis).includes("skuCodes"), "analysis prompts skuCodes");
}

function main() {
  testValidateRequiresSkuCodes();
  testResolveFetchPlan();
  testLibMappingAndReturnRules();
  testFetchAndPrune();
  testDeriveApiAndMerchandiseFallback();
  testCalcItemTypeAndFormat();
  testFormatNeedInfo();
  console.log("test-sku-profile: all passed");
}

main();
