/**
 * sku/registration-guide 节点级单测（mock LLM，不依赖真实 API）
 */
import { execFileSync } from "child_process";
import path from "path";

const root = path.resolve(__dirname, "..");
const tsNodeBin = path.join(root, "node_modules", "ts-node", "dist", "bin.js");
const project = path.join(root, "scripts", "tsconfig.json");
const nodeDir = path.join(root, "experts", "sku", "registration-guide", "nodes");

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

function testValidateExpedite() {
  const r = runNode("validate-intent.ts", {
    intentType: "expedite",
    skuCode: "SKU001",
    customerIntent: "要加急",
  });
  assertEqual(r.validationOk, true, "expedite ok");
  assertEqual(r.intentType, "expedite", "intent");
  assertEqual(r.skipAudit, false, "has sku should not skip audit stub");
}

function testValidateDetectCarriability() {
  const r = runNode("validate-intent.ts", {
    topic: "这个链接能不能发美国仓",
    productLink: "https://example.com/p",
  });
  assertEqual(r.intentType, "carriability", "detect carriability");
}

function testLoadKbByIntent() {
  const r = runNode("load-sku-kb.ts", {
    validationOk: true,
    intentType: "expedite",
    normalizedTopic: "加急",
    kbExpedite: "# expedite kb",
    kbCarriability: "# carriability",
    kbRegister: "# register",
    kbAuditResubmit: "",
    kbDirectShipment: "",
    kbAttributeChange: "",
    kbInboundBlocked: "",
    kbUnban: "",
  });
  assert(String(r.kbContent).includes("expedite kb"), "should include expedite");
  assertEqual(r.kbScope, "expedite", "scope");
}

function testFetchAuditSkip() {
  const skip = runNode("fetch-audit-status.ts", { skipApi: true, skuCode: "SKU001" });
  assertEqual(skip.skipAudit, true, "skip");
  assertEqual(skip.auditStatusHint, "", "empty hint");
}

function testResolveAuditFetch() {
  const expedite = runNode("resolve-audit-fetch.ts", {
    intentType: "expedite",
    skuCode: "SKU001",
    skipAudit: false,
  });
  assertEqual(expedite.shouldFetch, true, "expedite fetches");
  assertEqual(expedite.fetchProfile, "audit_status", "audit profile");

  const register = runNode("resolve-audit-fetch.ts", {
    intentType: "register",
    skuCode: "SKU001",
    skipAudit: false,
  });
  assertEqual(register.shouldFetch, false, "register no fetch");

  const blockedReuse = runNode("resolve-audit-fetch.ts", {
    intentType: "blocked_inbound",
    skuCode: "SKU001",
    customerCode: "CUSTOMER-A",
    skipAudit: false,
    profileSnapshot: {
      skus: [
        {
          skuCode: "SKU001",
          dataSource: "api",
          confidence: "high",
          publishStatus: "published",
          scope: { customerCode: "CUSTOMER-A", importCountryCode: null },
        },
      ],
    },
  });
  assertEqual(blockedReuse.shouldFetch, true, "incomplete snapshot must fetch missing inbound facts");
  assertEqual(blockedReuse.reuseProfileSnapshot, false, "incomplete snapshot reuse flag");
}

function testBuildAndMapAudit() {
  const built = runNode("build-audit-page-list.ts", {
    shouldFetch: true,
    skipApi: false,
    skuCode: "SKU001",
    importCountryCode: "US",
    fetchProfile: "audit_status",
  });
  assertEqual(built.actions.length, 1, "one action");
  assertEqual(built.actionName, "winit.item.page.list", "page.list");
  const data = JSON.parse(built.actions[0].data);
  assertEqual(data.queryType, undefined, "audit query must include published and returned rows");

  const mapped = runNode("fetch-audit-status.ts", {
    skuCode: "SKU001",
    importCountryCode: "US",
    fetchProfile: "audit_status",
    skipApi: false,
    winitPluginOutputList: [
      {
        data: JSON.stringify({
          list: [
            {
              skuCode: "SKU001",
              status: 3,
              isActive: "Y",
              attributes: [
                { attributeName: "estimateAuditDate", attributeValue: "2026-07-20 18:00:00", areaCode: "US" },
                { attributeName: "isUrgent", attributeValue: "N", areaCode: "US" },
              ],
              declarations: [
                {
                  countryCode: "US",
                  returnReason: "历史残留",
                  standardScript: "不应展示",
                  changeStatus: null,
                },
              ],
            },
          ],
        }),
      },
    ],
  });
  assert(String(mapped.auditStatusHint).includes("2026-07-20"), "hint has estimate date");
  assertEqual(mapped.rejectReason, "", "no return on auditing");
  assertEqual(mapped.estimateAuditDate, "2026-07-20 18:00:00", "estimate field");
}

function testFormatGoldenPaths() {
  const paths: Array<{ intent: string; branch: string; topic: string }> = [
    { intent: "expedite", branch: "guide_expedite", topic: "加急" },
    { intent: "carriability", branch: "guide_carriability", topic: "承运" },
    { intent: "register", branch: "guide_register", topic: "注册" },
    { intent: "resubmit", branch: "guide_resubmit", topic: "退回" },
  ];

  for (const p of paths) {
    const formatted = runNode("format-output.ts", {
      intentType: p.intent,
      needInfoHint: "",
      auditStatusHint: "",
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
    assertEqual(formatted.outputContext.expertId, "sku/registration-guide", "expertId");
    assert(formatted.enrichedContext["sku/registration-guide"], "enriched");
  }
}

function testFormatNeedInfoForced() {
  const formatted = runNode("format-output.ts", {
    intentType: "general",
    needInfoHint: "missing_topic_or_intent",
    analysisResult: { structured: { branch: "guide_register" }, analysis: "x" },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_info", "force need_info");
}

function main() {
  testValidateNeedInfo();
  testValidateExpedite();
  testValidateDetectCarriability();
  testLoadKbByIntent();
  testFetchAuditSkip();
  testResolveAuditFetch();
  testBuildAndMapAudit();
  testFormatGoldenPaths();
  testFormatNeedInfoForced();
  console.log("test-sku-registration-guide: all passed");
}

main();
