/**
 * sku/barcode-guide 节点级单测（mock LLM，不依赖真实 API）
 */
import { execFileSync } from "child_process";
import path from "path";

const root = path.resolve(__dirname, "..");
const tsNodeBin = path.join(root, "node_modules", "ts-node", "dist", "bin.js");
const project = path.join(root, "scripts", "tsconfig.json");
const nodeDir = path.join(root, "experts", "sku", "barcode-guide", "nodes");

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

function testValidatePrint() {
  const r = runNode("validate-intent.ts", {
    intentType: "print",
    skuCode: "FGBX001",
    supervisorMode: "SI",
    customerIntent: "要打印标签",
  });
  assertEqual(r.validationOk, true, "print ok");
  assertEqual(r.intentType, "print", "intent");
  assertEqual(r.supervisorMode, "SI", "mode");
}

function testValidateProductCodeAlias() {
  const r = runNode("validate-intent.ts", {
    intentType: "print",
    productCode: "PC-001",
    topic: "打印",
  });
  assertEqual(r.skuCode, "PC-001", "productCode aliases to skuCode");
}

function testValidateDetectScanFail() {
  const r = runNode("validate-intent.ts", {
    topic: "仓库扫不上这个码",
  });
  assertEqual(r.intentType, "scan_fail", "detect scan_fail");
  assertEqual(r.needInfoHint, "prefer_sku_code", "prefer sku for scan_fail");
}

function testValidateDetectThirdPartyAdd() {
  const r = runNode("validate-intent.ts", {
    topic: "缺第三方商品条码怎么补",
    skuCode: "SKU1",
  });
  assertEqual(r.intentType, "third_party_add", "detect add");
  assertEqual(r.needInfoHint, "prefer_sku_code_third", "prefer third");
}

function testLoadKbByIntent() {
  const r = runNode("load-barcode-kb.ts", {
    validationOk: true,
    intentType: "print",
    normalizedTopic: "打印",
    kbPrint: "# print kb",
    kbThirdPartyAdd: "# add",
    kbThirdPartyDelete: "# delete",
    kbThirdPartyQuery: "# query",
    kbScanFail: "# scan",
  });
  assert(String(r.kbContent).includes("print kb"), "should include print");
  assertEqual(r.kbScope, "print", "scope");
}

function testFormatGoldenPaths() {
  const paths: Array<{ intent: string; branch: string; topic: string }> = [
    { intent: "print", branch: "guide_print", topic: "打印" },
    { intent: "third_party_add", branch: "guide_third_party_add", topic: "绑码" },
    { intent: "third_party_query", branch: "guide_third_party_query", topic: "查询" },
    { intent: "third_party_delete", branch: "guide_third_party_delete", topic: "删除" },
    { intent: "scan_fail", branch: "guide_scan_fail", topic: "扫不上" },
  ];

  for (const p of paths) {
    const formatted = runNode("format-output.ts", {
      intentType: p.intent,
      needInfoHint: "",
      inputContext: { chainId: "c1" },
      analysisResult: {
        structured: {
          branch: p.branch,
          topicMatched: p.topic,
          sopSteps: ["step1"],
          confidence: "high",
        },
        analysis: `${p.topic}指引`,
      },
    });
    assertEqual(formatted.structured.branch, p.branch, `${p.intent} branch`);
    assertEqual(formatted.outputContext.expertId, "sku/barcode-guide", "expertId");
    assert(formatted.enrichedContext["sku/barcode-guide"], "enriched");
  }
}

function testFormatNeedInfoForced() {
  const formatted = runNode("format-output.ts", {
    intentType: "general",
    needInfoHint: "missing_topic_or_intent",
    analysisResult: { structured: { branch: "guide_print" }, analysis: "x" },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_info", "force need_info");
}

function testResolveAndFetchBarcode() {
  const resolve = runNode("resolve-barcode-fetch.ts", {
    intentType: "third_party_query",
    skuCode: "SKU001",
  });
  assertEqual(resolve.shouldFetch, true, "query fetches");
  assertEqual(resolve.fetchProfile, "barcode_third", "barcode profile");

  const noSku = runNode("resolve-barcode-fetch.ts", {
    intentType: "print",
    skuCode: "",
  });
  assertEqual(noSku.shouldFetch, false, "print without sku skips");

  const supplement = runNode("resolve-barcode-fetch.ts", {
    intentType: "third_party_add",
    skuCode: "",
    customerIntent: "缺第三方商品条码待办怎么处理",
    normalizedTopic: "缺第三方商品条码",
  });
  assertEqual(supplement.fetchProfile, "supplement_third_sku", "supplement list");

  const built = runNode("build-barcode-page-list.ts", {
    shouldFetch: true,
    skipApi: false,
    skuCode: "SKU001",
    fetchProfile: "barcode_third",
  });
  assertEqual(built.actions.length, 1, "one action");
  assertEqual(built.actionName, "winit.item.page.list", "page.list");

  const snap = runNode("fetch-barcode-snapshot.ts", {
    skuCode: "SKU001",
    fetchProfile: "barcode_third",
    skipApi: false,
    winitPluginOutputList: [
      {
        data: JSON.stringify({
          list: [
            {
              skuCode: "SKU001",
              status: 4,
              attributes: [{ attributeName: "supervisorMode", attributeValue: "SI", areaCode: "ALL" }],
              skuCodeThirds: ["FNSKU-AAA"],
            },
          ],
        }),
      },
    ],
  });
  assertEqual(snap.barcodeSnapshot.supervisorMode, "SI", "mode from attrs");
  assertEqual(snap.barcodeSnapshot.skuCodeThirds[0], "FNSKU-AAA", "thirds");
  assert(String(snap.barcodeSnapshotText).includes("FNSKU-AAA"), "text has third");
}

function main() {
  testValidateNeedInfo();
  testValidatePrint();
  testValidateProductCodeAlias();
  testValidateDetectScanFail();
  testValidateDetectThirdPartyAdd();
  testLoadKbByIntent();
  testResolveAndFetchBarcode();
  testFormatGoldenPaths();
  testFormatNeedInfoForced();
  console.log("test-sku-barcode-guide: all passed");
}

main();
