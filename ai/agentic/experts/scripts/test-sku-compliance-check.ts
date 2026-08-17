/**
 * sku/compliance-check 节点级单测（mock LLM，不依赖真实 API）
 */
import { execFileSync } from "child_process";
import path from "path";

const root = path.resolve(__dirname, "..");
const tsNodeBin = path.join(root, "node_modules", "ts-node", "dist", "bin.js");
const project = path.join(root, "scripts", "tsconfig.json");
const nodeDir = path.join(root, "experts", "sku", "compliance-check", "nodes");

function runNode(file: string, params: Record<string, unknown>): any {
  const out = execFileSync(
    process.execPath,
    [tsNodeBin, "-P", project, path.join(nodeDir, file), JSON.stringify(params)],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(out);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function testValidateNeedInfo() {
  const r = runNode("validate-intent.ts", {});
  assertEqual(r.validationOk, false, "empty should fail validation");
  assertEqual(r.needInfoHint, "missing_topic_or_intent", "need topic");
}

function testValidateCertificates() {
  const r = runNode("validate-intent.ts", {
    intentType: "certificates",
    skuCode: "SKU001",
    importCountryCode: "de",
    customerIntent: "缺 MSDS",
  });
  assertEqual(r.validationOk, true, "ok");
  assertEqual(r.intentType, "certificates", "intent");
  assertEqual(r.importCountryCode, "DE", "country upper");
}

function testValidateDetectWeee() {
  const r = runNode("validate-intent.ts", {
    topic: "德国 WEEE 类别对不对",
  });
  assertEqual(r.intentType, "weee", "detect weee");
}

function testResolveFetch() {
  const fetch = runNode("resolve-compliance-fetch.ts", {
    intentType: "certificates",
    skuCode: "SKU001",
  });
  assertEqual(fetch.shouldFetch, true, "certificates fetches");
  assertEqual(fetch.fetchProfile, "facts_compliance", "profile");

  const reuse = runNode("resolve-compliance-fetch.ts", {
    intentType: "certificates",
    skuCode: "SKU001",
    profileSnapshot: { skus: [{ skuCode: "SKU001", publishStatus: "published" }] },
  });
  assertEqual(reuse.shouldFetch, false, "reuse snapshot");
  assertEqual(reuse.reuseProfileSnapshot, true, "reuse flag");

  const carriability = runNode("resolve-compliance-fetch.ts", {
    intentType: "carriability_deep",
    skuCode: "SKU001",
  });
  assertEqual(carriability.shouldFetch, false, "carriability no fetch by default");
}

function testBuildAndSnapshot() {
  const built = runNode("build-compliance-page-list.ts", {
    shouldFetch: true,
    skipApi: false,
    skuCode: "SKU001",
    importCountryCode: "DE",
    fetchProfile: "facts_compliance",
  });
  assertEqual(built.actions.length, 1, "one action");
  assertEqual(built.actionName, "winit.item.page.list", "page.list");

  const snap = runNode("fetch-compliance-snapshot.ts", {
    skuCode: "SKU001",
    importCountryCode: "DE",
    skipApi: false,
    winitPluginOutputList: [
      {
        data: JSON.stringify({
          list: [
            {
              skuCode: "SKU001",
              status: 4,
              attributes: [
                { attributeName: "battery", attributeValue: "Y", areaCode: "ALL" },
                { attributeName: "dg", attributeValue: "Y", areaCode: "DE" },
              ],
              declarations: [
                {
                  countryCode: "DE",
                  hsCode: "85183000",
                  declareName: "Headset",
                  isProhibitWarehousing: "N",
                },
              ],
            },
          ],
        }),
      },
    ],
  });
  assert(String(snap.complianceSnapshotText).includes("SKU001"), "text has sku");
  assert(String(snap.complianceSnapshotText).includes("HS"), "text has hs");
}

function testLoadKb() {
  const r = runNode("load-compliance-kb.ts", {
    validationOk: true,
    intentType: "certificates",
    normalizedTopic: "证书",
    kbCarriabilityDeep: "# c",
    kbRestricted: "# r",
    kbCertificates: "# cert kb",
    kbWeee: "# w",
    kbEcommerce: "# e",
    kbBrand: "# b",
    kbUnbanDeep: "# u",
    kbDeclaration: "# d",
  });
  assert(String(r.kbContent).includes("cert kb"), "include cert");
  assertEqual(r.kbScope, "certificates", "scope");
}

function testFormat() {
  const formatted = runNode("format-output.ts", {
    intentType: "certificates",
    needInfoHint: "",
    complianceSnapshotText: "SKU SKU001；带电",
    inputContext: { chainId: "c1" },
    analysisResult: {
      structured: {
        branch: "guide_certificates",
        complianceVerdict: "fail",
        missingDocuments: ["MSDS", "UN38.3"],
        sopSteps: ["上传证书"],
        confidence: "high",
      },
      analysis: "请补齐电池证书。",
    },
  });
  assertEqual(formatted.structured.branch, "guide_certificates", "branch");
  assertEqual(formatted.structured.complianceVerdict, "fail", "verdict");
  assertEqual(formatted.structured.missingDocuments.length, 2, "docs");
  assertEqual(formatted.outputContext.expertId, "sku/compliance-check", "expertId");
  assert(formatted.enrichedContext["sku/compliance-check"], "enriched");
}

function testFormatNeedInfo() {
  const formatted = runNode("format-output.ts", {
    intentType: "general",
    needInfoHint: "missing_topic_or_intent",
    analysisResult: { structured: { branch: "guide_certificates" }, analysis: "x" },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_info", "force need_info");
}

function main() {
  testValidateNeedInfo();
  testValidateCertificates();
  testValidateDetectWeee();
  testResolveFetch();
  testBuildAndSnapshot();
  testLoadKb();
  testFormat();
  testFormatNeedInfo();
  console.log("test-sku-compliance-check: all passed");
}

main();
