import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { bundleCozeNodeCodeForExport } from "./coze-export/bundle-coze-node-code";

const root = path.resolve(__dirname, "..");
const nodeDir = path.join(root, "experts", "sku", "registration-guide", "nodes");
const promptDir = path.join(root, "experts", "sku", "registration-guide", "prompts");
const tsNodeBin = path.join(root, "node_modules", "ts-node", "dist", "bin.js");
const project = path.join(root, "scripts", "tsconfig.json");

function runNode(file: string, params: Record<string, unknown>): any {
  const output = execFileSync(
    process.execPath,
    [tsNodeBin, "-P", project, path.join(nodeDir, file), JSON.stringify(params)],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(output);
}

function readPrompt(file: string): string {
  return fs.readFileSync(path.join(promptDir, file), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual: string, expected: string, message: string): void {
  assert(actual.includes(expected), `${message}: missing ${JSON.stringify(expected)}`);
}

function assertFetchAuditContract(actual: Record<string, unknown>, message: string): void {
  const expectedKeys = [
    "auditStatusHint",
    "auditFactStatus",
    "rejectReason",
    "estimateAuditDate",
    "skipAudit",
    "dataSource",
    "fetchSource",
  ].sort();
  assertEqual(
    Object.keys(actual).sort().join("|"),
    expectedKeys.join("|"),
    `${message} output keys`
  );
  for (const key of expectedKeys.filter((key) => key !== "skipAudit")) {
    assertEqual(typeof actual[key], "string", `${message} ${key} type`);
  }
  assertEqual(typeof actual.skipAudit, "boolean", `${message} skipAudit type`);
}

const failures: string[] = [];
const filters = process.argv.slice(2).map((value) => value.toLowerCase());

function check(name: string, fn: () => void): void {
  if (filters.length > 0 && !filters.some((filter) => name.toLowerCase().includes(filter))) return;
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`[FAIL] ${name}: ${message}`);
  }
}

check("generic resubmit is not blocked by missing SKU", () => {
  const result = runNode("validate-intent.ts", {
    intentType: "resubmit",
    topic: "商品注册退回是什么意思，修改后怎么重新提交",
  });
  assertEqual(result.intentType, "resubmit", "intent");
  assertEqual(result.needInfoHint, "", "generic resubmit hint");

  const formatted = runNode("format-output.ts", {
    intentType: "resubmit",
    auditFactStatus: "",
    analysisResult: {
      structured: { branch: "need_info", sopSteps: [], missingInfo: ["SKU编码"] },
      analysis: "请先提供 SKU。",
    },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "guide_resubmit", "generic resubmit branch");
  assertEqual(formatted.structured.sopSteps.length, 3, "generic resubmit steps");
  assertIncludes(formatted.analysis, "重新提交审核", "generic resubmit answer");
});

check("handoff branch never claims an unexecuted transfer", () => {
  const formatted = runNode("format-output.ts", {
    intentType: "carriability",
    analysisResult: {
      structured: {
        branch: "handoff_compliance",
        sopSteps: ["目前已为您转人工合规专席处理"],
      },
      analysis: "已为您转人工合规专席进行处理，请您耐心等待后续回复。",
    },
    inputContext: {},
  });
  assert(!formatted.analysis.includes("已为您转"), "analysis must not claim completed handoff");
  assertIncludes(formatted.analysis, "需要人工合规专席进一步确认", "analysis handoff boundary");
  assert(!formatted.structured.sopSteps[0].includes("已为您转"), "steps must not claim completed handoff");
});

check("generic unpublished flow is not blocked by missing SKU", () => {
  const result = runNode("validate-intent.ts", {
    intentType: "blocked_inbound",
    topic: "商品未发布导致无法下入库单怎么办",
  });
  assertEqual(result.needInfoHint, "", "generic blocked flow hint");
});

check("broad registration topic becomes deterministic need_info", () => {
  const validated = runNode("validate-intent.ts", {
    intentType: "general",
    topic: "商品注册",
    query: "商品注册",
  });
  assertEqual(validated.needInfoHint, "ambiguous_general", "ambiguous hint");

  const formatted = runNode("format-output.ts", {
    intentType: "general",
    needInfoHint: validated.needInfoHint,
    analysisResult: {
      structured: { branch: "guide_register", sopSteps: ["generic"] },
      analysis: "generic answer",
    },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_info", "ambiguous branch");
});

check("unverified operations become deterministic need_human", () => {
  const cases = [
    { topic: "怎么批量修改已注册商品的尺寸信息", reason: "batch_modify_existing" },
    { topic: "审核退回说空运要电池资料，但实际走陆运怎么办", reason: "transport_material_dispute" },
    { topic: "带电商品走陆运，退回要求上传MSDS/UN38.3怎么办", reason: "transport_material_dispute" },
    { topic: "商品已提交审核后怎么撤回或删除", reason: "audit_withdrawal_or_deletion" },
    { topic: "商品正在审核，如何删掉", reason: "audit_withdrawal_or_deletion" },
  ];
  for (const { topic, reason } of cases) {
    const validated = runNode("validate-intent.ts", { topic, query: topic });
    assertEqual(validated.needInfoHint, "need_human_unverified_operation", topic);
    assertEqual(validated.needHumanReason, reason, `${topic} reason`);
    const formatted = runNode("format-output.ts", {
      intentType: validated.intentType,
      needInfoHint: validated.needInfoHint,
      needHumanReason: validated.needHumanReason,
      analysisResult: { structured: { branch: "guide_register" }, analysis: "guess" },
      inputContext: {},
    });
    assertEqual(formatted.structured.branch, "need_human", `${topic} branch`);
    const expectedPhrase =
      reason === "batch_modify_existing"
        ? "批量修改现有商品"
        : reason === "transport_material_dispute"
          ? "运输方式与资料要求"
          : "审核中的商品能否撤回或删除";
    assertIncludes(formatted.analysis, expectedPhrase, `${topic} targeted explanation`);
  }
});

check("ordinary operations are not over-routed to need_human", () => {
  const ordinaryMaterial = runNode("validate-intent.ts", {
    topic: "空运电池资料有什么要求",
    query: "空运电池资料有什么要求",
  });
  assert(ordinaryMaterial.needInfoHint !== "need_human_unverified_operation", "ordinary material question");

  const attributeChange = runNode("validate-intent.ts", {
    topic: "取消带电属性",
    query: "取消带电属性",
  });
  assertEqual(attributeChange.intentType, "attribute_change", "attribute intent");
  assert(attributeChange.needInfoHint !== "need_human_unverified_operation", "attribute change routing");

  const attributeChangeAfterSubmission = runNode("validate-intent.ts", {
    topic: "商品提交审核后怎么取消带电属性",
    query: "商品提交审核后怎么取消带电属性",
  });
  assertEqual(attributeChangeAfterSubmission.intentType, "attribute_change", "submitted attribute intent");
  assert(
    attributeChangeAfterSubmission.needInfoHint !== "need_human_unverified_operation",
    "submitted attribute change must not be treated as audit withdrawal"
  );
  assertEqual(attributeChangeAfterSubmission.needHumanReason, "", "submitted attribute reason");

  const singleModify = runNode("validate-intent.ts", {
    topic: "批量注册后修改其中一个SKU",
    query: "批量注册后修改其中一个SKU",
  });
  assert(singleModify.needInfoHint !== "need_human_unverified_operation", "single modify after bulk registration");
});

check("ambiguous or under-specified questions become deterministic need_info", () => {
  const cases = [
    {
      topic: "商品链接在哪里查询",
      expectedHint: "ambiguous_product_link_lookup",
    },
    {
      topic: "商品证书是否必填",
      expectedHint: "missing_compliance_context",
    },
  ];

  for (const item of cases) {
    const validated = runNode("validate-intent.ts", {
      topic: item.topic,
      query: item.topic,
    });
    assertEqual(validated.needInfoHint, item.expectedHint, `${item.topic} hint`);
    const formatted = runNode("format-output.ts", {
      intentType: validated.intentType,
      needInfoHint: validated.needInfoHint,
      analysisResult: { structured: { branch: "guide_register" }, analysis: "guess" },
      inputContext: {},
    });
    assertEqual(formatted.structured.branch, "need_info", `${item.topic} branch`);
  }

  const contextual = runNode("validate-intent.ts", {
    topic: "美国带电商品是否需要上传MSDS",
    query: "美国带电商品是否需要上传MSDS",
    importCountryCode: "US",
  });
  assert(
    contextual.needInfoHint !== "missing_compliance_context",
    "certificate question with product attribute and country should not be blocked as under-specified"
  );

  const existingLink = runNode("validate-intent.ts", {
    topic: "已注册商品的商品链接在哪里查询",
    query: "已注册商品的商品链接在哪里查询",
  });
  assertEqual(existingLink.intentType, "modify", "existing product link intent");
  assert(existingLink.needInfoHint !== "ambiguous_product_link_lookup", "existing product link is qualified");

  const registrationLink = runNode("validate-intent.ts", {
    topic: "注册时商品链接怎么填",
    query: "注册时商品链接怎么填",
  });
  assertEqual(registrationLink.intentType, "register", "registration link intent");
  assert(registrationLink.needInfoHint !== "ambiguous_product_link_lookup", "registration link is qualified");
});

check("audit no-data result has explicit realtime-fact marker", () => {
  const result = runNode("fetch-audit-status.ts", {
    skuCode: "NO-DATA-SKU",
    fetchProfile: "audit_status",
    skipApi: false,
    winitPluginOutputList: [],
  });
  assertIncludes(result.auditStatusHint, "当前未取得实时审核事实", "no-data marker");
  assertEqual(result.dataSource, "fallback_self_serve", "fallback source");
  assertEqual(result.auditFactStatus, "not_found", "fallback fact status");
});

check("audit API facts require an exact requested-SKU match", () => {
  const target = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    fetchProfile: "audit_status",
    skipApi: false,
    winitPluginOutputList: [
      {
        data: JSON.stringify({
          list: [{ skuCode: "TARGET", status: 3, attributes: [], declarations: [] }],
        }),
      },
    ],
  });
  assertEqual(target.dataSource, "api", "matching target source");
  assertEqual(target.auditFactStatus, "has_fact", "matching target fact status");
  assert(!String(target.auditStatusHint).includes("当前未取得实时审核事实"), "matching target should use API facts");

  for (const row of [{ skuCode: "OTHER", status: 5 }, {}]) {
    const mismatch = runNode("fetch-audit-status.ts", {
      skuCode: "TARGET",
      fetchProfile: "audit_status",
      skipApi: false,
      winitPluginOutputList: [{ data: JSON.stringify({ list: [row] }) }],
    });
    assertEqual(mismatch.dataSource, "fallback_self_serve", "mismatched target source");
    assertEqual(mismatch.auditFactStatus, "not_found", "mismatched target fact status");
    assertIncludes(mismatch.auditStatusHint, "当前未取得实时审核事实", "mismatch marker");
  }
});

check("profile snapshot reuse requires exact trusted and compatible scope", () => {
  const baseParams = {
    intentType: "blocked_inbound",
    skuCode: "TARGET",
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    skipAudit: false,
  };
  const trustedRow = {
    skuCode: "TARGET",
    dataSource: "api",
    confidence: "high",
    publishStatus: "published",
    prohibitInbound: false,
    scope: { customerCode: "CUSTOMER-A", importCountryCode: "DE" },
  };

  const reusable = runNode("resolve-audit-fetch.ts", {
    ...baseParams,
    profileSnapshot: { skus: [trustedRow] },
  });
  assertEqual(reusable.shouldFetch, false, "compatible API row should skip facts API");
  assertEqual(reusable.reuseProfileSnapshot, true, "compatible API row reuse flag");
  assertEqual(reusable.customerCode, "CUSTOMER-A", "customer scope passthrough");

  const unsafeRows = [
    { ...trustedRow, skuCode: "OTHER" },
    { ...trustedRow, dataSource: "derived" },
    { ...trustedRow, dataSource: "kb" },
    { ...trustedRow, dataSource: "missing" },
    { ...trustedRow, scope: { customerCode: "CUSTOMER-B", importCountryCode: "DE" } },
    { ...trustedRow, scope: { customerCode: "CUSTOMER-A", importCountryCode: "US" } },
    { ...trustedRow, scope: { customerCode: "CUSTOMER-A", importCountryCode: null } },
    { ...trustedRow, scope: { customerCode: "CUSTOMER-A" } },
    { ...trustedRow, scope: { importCountryCode: "DE" } },
    { ...trustedRow, scope: {} },
  ];

  for (const row of unsafeRows) {
    const result = runNode("resolve-audit-fetch.ts", {
      ...baseParams,
      profileSnapshot: { skus: [row] },
    });
    assertEqual(result.shouldFetch, true, `unsafe row must fetch: ${JSON.stringify(row)}`);
    assertEqual(result.skipApi, false, `unsafe row must not skip API: ${JSON.stringify(row)}`);
    assertEqual(result.reuseProfileSnapshot, false, `unsafe row must not be reused: ${JSON.stringify(row)}`);
  }
});

check("intent-specific fact sufficiency prevents unsafe reuse", () => {
  const incompleteInbound = runNode("resolve-audit-fetch.ts", {
    intentType: "blocked_inbound",
    skuCode: "TARGET",
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    skipAudit: false,
    profileSnapshot: {
      skus: [
        {
          skuCode: "TARGET",
          dataSource: "api",
          publishStatus: "published",
          prohibitInbound: null,
          _missingFacts: ["prohibit_inbound_unknown:TARGET"],
          scope: { customerCode: "CUSTOMER-A", importCountryCode: "DE" },
        },
      ],
    },
  });
  assertEqual(incompleteInbound.shouldFetch, true, "unknown inbound prohibition must fetch facts");
  assertEqual(incompleteInbound.skipApi, false, "unknown inbound prohibition must not skip API");
  assertEqual(incompleteInbound.reuseProfileSnapshot, false, "incomplete inbound row reuse flag");
  assert(
    Array.isArray(incompleteInbound.profileSnapshot.missingFacts) &&
      incompleteInbound.profileSnapshot.missingFacts.includes("prohibit_inbound_unknown:TARGET"),
    "safe snapshot must retain the target inbound fact gap"
  );

  const incompleteAudit = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    fetchProfile: "audit_status",
    skipApi: false,
    winitPluginOutputList: [
      { data: JSON.stringify({ list: [{ skuCode: "TARGET", supervisorMode: "SKU" }] }) },
    ],
  });
  assertEqual(incompleteAudit.auditFactStatus, "not_found", "supervisor mode is not an audit fact");
  assertEqual(incompleteAudit.dataSource, "fallback_self_serve", "incomplete audit row fallback");
});

check("profile snapshot country scope is compatible in both directions", () => {
  for (const importCountryCode of ["DE", "ALL"]) {
    const result = runNode("resolve-audit-fetch.ts", {
      intentType: "direct_shipment",
      skuCode: "TARGET",
      customerCode: "CUSTOMER-A",
      importCountryCode: "DE",
      skipAudit: false,
      profileSnapshot: {
        skus: [
          {
            skuCode: "TARGET",
            dataSource: "api",
            confidence: "high",
            publishStatus: "published",
            scope: { customerCode: "CUSTOMER-A", importCountryCode },
          },
        ],
      },
    });
    assertEqual(result.reuseProfileSnapshot, true, `explicit ${String(importCountryCode)} country scope`);
  }

  for (const sourceCountry of [null, "ALL"]) {
    const result = runNode("resolve-audit-fetch.ts", {
      intentType: "direct_shipment",
      skuCode: "TARGET",
      customerCode: "CUSTOMER-A",
      skipAudit: false,
      profileSnapshot: {
        skus: [
          {
            skuCode: "TARGET",
            dataSource: "api",
            confidence: "high",
            publishStatus: "published",
            scope: { customerCode: "CUSTOMER-A", importCountryCode: sourceCountry },
          },
        ],
      },
    });
    assertEqual(result.reuseProfileSnapshot, true, `unscoped request accepts ${String(sourceCountry)}`);
  }

  const unscopedRejectsCountrySpecific = runNode("resolve-audit-fetch.ts", {
    intentType: "direct_shipment",
    skuCode: "TARGET",
    customerCode: "CUSTOMER-A",
    skipAudit: false,
    profileSnapshot: {
      skus: [
        {
          skuCode: "TARGET",
          dataSource: "api",
          confidence: "high",
          publishStatus: "published",
          scope: { customerCode: "CUSTOMER-A", importCountryCode: "DE" },
        },
      ],
    },
  });
  assertEqual(unscopedRejectsCountrySpecific.reuseProfileSnapshot, false, "unscoped request rejects DE row");
  assertEqual(unscopedRejectsCountrySpecific.shouldFetch, true, "unscoped request fetches facts");

  const missingCurrentTenant = runNode("resolve-audit-fetch.ts", {
    intentType: "blocked_inbound",
    skuCode: "TARGET",
    importCountryCode: "DE",
    skipAudit: false,
    profileSnapshot: {
      skus: [
        {
          skuCode: "TARGET",
          dataSource: "api",
          confidence: "high",
          publishStatus: "published",
          scope: { customerCode: "CUSTOMER-A", importCountryCode: "DE" },
        },
      ],
    },
  });
  assertEqual(missingCurrentTenant.reuseProfileSnapshot, false, "missing current tenant is unsafe");
  assertEqual(missingCurrentTenant.shouldFetch, true, "missing current tenant must fetch");
});

check("empty API profile shells are not reusable facts", () => {
  const emptyShell = {
    skuCode: "TARGET",
    dataSource: "api",
    confidence: "high",
    scope: { customerCode: "CUSTOMER-A", importCountryCode: "DE" },
  };
  const resolved = runNode("resolve-audit-fetch.ts", {
    intentType: "blocked_inbound",
    skuCode: "TARGET",
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    skipAudit: false,
    profileSnapshot: { skus: [emptyShell] },
  });
  assertEqual(resolved.reuseProfileSnapshot, false, "empty shell reuse flag");
  assertEqual(resolved.shouldFetch, true, "empty shell must fetch");
  assertEqual(Object.keys(resolved.profileSnapshot).length, 0, "empty shell must be cleaned");

  const fetched = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    reuseProfileSnapshot: true,
    skipApi: true,
    profileSnapshot: { skus: [emptyShell] },
  });
  assertEqual(fetched.auditFactStatus, "not_found", "empty snapshot shell fact status");
  assertEqual(fetched.auditStatusHint, "", "empty snapshot shell hint");

  const pluginShell = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    importCountryCode: "DE",
    skipApi: false,
    winitPluginOutputList: [{ data: JSON.stringify({ list: [{ skuCode: "TARGET" }] }) }],
  });
  assertEqual(pluginShell.auditFactStatus, "not_found", "empty plugin shell fact status");
  assertEqual(pluginShell.dataSource, "fallback_self_serve", "empty plugin shell fallback");
  assertIncludes(pluginShell.auditStatusHint, "当前未取得实时审核事实", "empty plugin shell marker");
});

check("fetch audit status keeps a complete Coze output contract", () => {
  const missingSku = runNode("fetch-audit-status.ts", {});
  assertFetchAuditContract(missingSku, "missing SKU");

  const skipped = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    skipApi: true,
  });
  assertFetchAuditContract(skipped, "skip API");

  const reused = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    customerCode: "CUSTOMER-A",
    importCountryCode: "DE",
    skipApi: true,
    reuseProfileSnapshot: true,
    profileSnapshot: {},
  });
  assertFetchAuditContract(reused, "profile snapshot reuse");

  const pluginError = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    skipApi: false,
    winitPluginOutputList: [{ code: 500, msg: "plugin failed", data: "" }],
  });
  assertFetchAuditContract(pluginError, "outer plugin error");
  assertEqual(pluginError.auditFactStatus, "error", "outer plugin error fact status");
  assertEqual(pluginError.dataSource, "api_error", "outer plugin error data source");
});

check("fetch audit status stays within the proven Coze code envelope", () => {
  const nodePath = path.join(nodeDir, "fetch-audit-status.ts");
  const bundled = bundleCozeNodeCodeForExport(nodePath, root);
  assert(!bundled.includes("/* coze-inline: shared/"), "fetch audit node must not inline shared modules");
  assert(
    Buffer.byteLength(bundled, "utf8") <= 20_000,
    `fetch audit node exceeds the proven Coze size envelope: ${Buffer.byteLength(bundled, "utf8")}`
  );
});

check("lightweight audit mapping preserves verified source semantics", () => {
  const runApiRow = (row: Record<string, unknown>) =>
    runNode("fetch-audit-status.ts", {
      skuCode: "TARGET",
      importCountryCode: "US",
      skipApi: false,
      winitPluginOutputList: [
        { code: 0, msg: "success", data: JSON.stringify({ list: [row] }) },
      ],
    });

  const nullStatus = runApiRow({ skuCode: "TARGET", status: null, isActive: "Y" });
  assertEqual(nullStatus.auditFactStatus, "not_found", "null status must not fall back to isActive");

  const changedAfterPublish = runApiRow({
    skuCode: "TARGET",
    status: 4,
    declarations: [
      {
        countryCode: "US",
        changeStatus: 5,
        returnReason: "需要补充资料",
        standardScript: "请补充申报资料",
      },
    ],
  });
  assertEqual(changedAfterPublish.auditFactStatus, "has_fact", "published change return fact status");
  assertEqual(changedAfterPublish.rejectReason, "需要补充资料", "published change return reason");

  const unverifiedFlatFields = runApiRow({
    skuCode: "TARGET",
    estimateAuditDate: "2099-01-01",
    isUrgent: "Y",
  });
  assertEqual(
    unverifiedFlatFields.auditFactStatus,
    "not_found",
    "unverified flat audit fields must not become facts"
  );

  const unverifiedFlatReturnFields = runApiRow({
    skuCode: "TARGET",
    status: 5,
    rejectReason: "不可信顶层退回原因",
    standardScript: "不可信顶层退回说明",
  });
  assertEqual(unverifiedFlatReturnFields.auditFactStatus, "has_fact", "returned publish status fact");
  assertEqual(unverifiedFlatReturnFields.rejectReason, "", "flat return fields must not be trusted");
  assert(
    !String(unverifiedFlatReturnFields.auditStatusHint).includes("不可信顶层"),
    "flat return fields must not enter the audit hint"
  );

  const fractionalStatus = runApiRow({ skuCode: "TARGET", status: 5.9 });
  assertEqual(fractionalStatus.auditFactStatus, "not_found", "fractional status must stay unknown");

  const unsupportedBooleanSpelling = runApiRow({
    skuCode: "TARGET",
    attributes: [
      { attributeName: "isUrgent", attributeValue: "YES", areaCode: "US" },
    ],
  });
  assertEqual(
    unsupportedBooleanSpelling.auditFactStatus,
    "not_found",
    "unsupported boolean spelling must stay unknown"
  );

  const directBusinessRow = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    importCountryCode: "US",
    skipApi: false,
    winitPluginOutputList: [
      {
        code: 0,
        msg: "success",
        data: JSON.stringify({ skuCode: "TARGET", code: "PRODUCT-CODE", status: 3 }),
      },
    ],
  });
  assertEqual(directBusinessRow.auditFactStatus, "has_fact", "direct business row fact status");
  assertEqual(directBusinessRow.dataSource, "api", "direct business row data source");

  const unwrappedBusinessRow = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    importCountryCode: "US",
    skipApi: false,
    winitPluginOutputList: [{ skuCode: "TARGET", code: "PRODUCT-CODE", status: 3 }],
  });
  assertEqual(unwrappedBusinessRow.auditFactStatus, "has_fact", "unwrapped business row fact status");
  assertEqual(unwrappedBusinessRow.dataSource, "api", "unwrapped business row data source");

  const snapshotEstimate = runNode("fetch-audit-status.ts", {
    skuCode: "TARGET",
    customerCode: "CUSTOMER-A",
    importCountryCode: "US",
    reuseProfileSnapshot: true,
    profileSnapshot: {
      skus: [
        {
          skuCode: "TARGET",
          dataSource: "api",
          publishStatus: "auditing",
          estimateAuditDate: "2026-07-20",
          scope: { customerCode: "CUSTOMER-A", importCountryCode: "US" },
        },
      ],
    },
  });
  assertEqual(snapshotEstimate.auditFactStatus, "has_fact", "snapshot estimate fact status");
  assertEqual(snapshotEstimate.estimateAuditDate, "2026-07-20", "snapshot estimate passthrough");
});

check("forced snapshot reuse never marks missing or scope-incompatible rows as facts", () => {
  const trustedRow = {
    skuCode: "TARGET",
    dataSource: "api",
    confidence: "high",
    publishStatus: "published",
    scope: { customerCode: "CUSTOMER-A", importCountryCode: "DE" },
  };
  const unsafeSnapshots = [
    {
      skus: [
        {
          ...trustedRow,
          dataSource: "missing",
          confidence: "low",
        },
      ],
    },
    {
      skus: [
        {
          ...trustedRow,
          scope: { customerCode: "CUSTOMER-B", importCountryCode: "DE" },
        },
      ],
    },
    {
      skus: [{ ...trustedRow, scope: { customerCode: "CUSTOMER-A" } }],
    },
    {
      skus: [trustedRow],
      missingFacts: ["scope_mismatch:customerCode:TARGET"],
    },
    {
      skus: [{ ...trustedRow, _missingFacts: ["scope_unknown:TARGET"] }],
    },
  ];

  for (const profileSnapshot of unsafeSnapshots) {
    const result = runNode("fetch-audit-status.ts", {
      skuCode: "TARGET",
      customerCode: "CUSTOMER-A",
      importCountryCode: "DE",
      reuseProfileSnapshot: true,
      skipApi: true,
      profileSnapshot,
    });
    assertEqual(
      result.auditFactStatus,
      "not_found",
      `unsafe snapshot fact: ${JSON.stringify(profileSnapshot)}`
    );
    assertEqual(result.dataSource, "profile_snapshot_rejected", "unsafe snapshot source");
    assertEqual(result.auditStatusHint, "", "unsafe snapshot must not emit a fact hint");
  }
});

check("plugin errors are distinct from not-found and force safe human handling", () => {
  for (const payload of [
    { code: 500, msg: "系统异常" },
    { code: "10001", message: "服务不可用" },
  ]) {
    const result = runNode("fetch-audit-status.ts", {
      skuCode: "TARGET",
      importCountryCode: "DE",
      skipApi: false,
      winitPluginOutputList: [{ data: JSON.stringify(payload) }],
    });
    assertEqual(result.auditFactStatus, "error", `plugin error status: ${JSON.stringify(payload)}`);
    assertEqual(result.dataSource, "api_error", "plugin error source");
    assertIncludes(result.auditStatusHint, "暂不可用", "safe plugin error marker");
    assert(!result.auditStatusHint.includes("系统异常"), "raw plugin errors must not be exposed");
  }

  const formatted = runNode("format-output.ts", {
    intentType: "audit_status",
    needInfoHint: "",
    auditFactStatus: "error",
    auditStatusHint: "实时审核接口暂不可用，请稍后重试。",
    analysisResult: {
      structured: { branch: "guide_expedite", sopSteps: ["审核已经完成"] },
      analysis: "审核已经完成。",
    },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_human", "plugin error safe branch");
  assert(!formatted.analysis.includes("审核已经完成"), "plugin error removes invented audit fact");
  assertIncludes(formatted.analysis, "暂不可用", "plugin error remains visible");
  assertIncludes(formatted.analysis, "人工", "plugin error handoff");
});

check("resubmit no-data output is distinct and escalates", () => {
  const marker = "当前未取得实时审核事实：请在万邑联查看。";
  const formatted = runNode("format-output.ts", {
    intentType: "resubmit",
    needInfoHint: "",
    auditStatusHint: marker,
    auditFactStatus: "not_found",
    analysisResult: {
      structured: { branch: "guide_resubmit", sopSteps: ["check"] },
      analysis: "请查看退回原因。",
    },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_human", "no-data resubmit branch");
  assertIncludes(formatted.analysis, "当前未取得实时审核事实", "visible no-data marker");
});

check("resubmit no-data output removes unverified LLM rejection details", () => {
  const marker = "当前未取得实时审核事实：请在万邑联查看。";
  const formatted = runNode("format-output.ts", {
    intentType: "resubmit",
    needInfoHint: "",
    auditStatusHint: marker,
    auditFactStatus: "not_found",
    analysisResult: {
      structured: {
        branch: "guide_resubmit",
        rejectReason: "电池资料不合格",
        sopSteps: ["上传 MSDS 和 UN38.3", "重新提交审核"],
        prerequisites: ["有效电池报告"],
      },
      analysis: "系统已确认因电池资料不合格退回，请上传报告后重提。",
    },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_human", "sanitized branch");
  assertEqual(formatted.structured.rejectReason, null, "unverified reject reason");
  assert(
    !JSON.stringify(formatted.structured.sopSteps).includes("MSDS") &&
      !JSON.stringify(formatted.structured.sopSteps).includes("重新提交"),
    "unverified SOP details must be removed"
  );
  assertEqual(formatted.structured.prerequisites.length, 0, "unverified prerequisites");
  assertIncludes(formatted.analysis, "当前未取得实时审核事实", "sanitized marker");
  assertIncludes(formatted.analysis, "人工", "sanitized handoff");
  assert(!formatted.analysis.includes("电池资料不合格"), "unverified analysis reason must be removed");
});

check("all audit-fact intents sanitize invented status and timing when realtime facts are missing", () => {
  const marker = "当前未取得实时审核事实。请在万邑联「商品维护任务」中查看。";
  for (const intentType of ["audit_status", "expedite"]) {
    const formatted = runNode("format-output.ts", {
      intentType,
      needInfoHint: "",
      auditStatusHint: marker,
      auditFactStatus: "not_found",
      analysisResult: {
        structured: {
          branch: "guide_expedite",
          auditStatusHint: "审核已通过，预计明天完成",
          rejectReason: "电池资料不合格",
          sopSteps: ["等待到明天即可完成", "上传电池报告后重新提交"],
          prerequisites: ["MSDS"],
          expediteEligible: true,
        },
        analysis: "系统显示审核已通过，预计明天完成；此前因电池资料不合格退回。",
      },
      inputContext: {},
    });

    assertEqual(formatted.structured.branch, "need_human", `${intentType} safe branch`);
    assertEqual(formatted.structured.rejectReason, null, `${intentType} reject reason`);
    assertEqual(formatted.structured.prerequisites.length, 0, `${intentType} prerequisites`);
    assertEqual(formatted.structured.expediteEligible, false, `${intentType} expedite eligibility`);
    assertEqual(formatted.structured.auditStatusHint, marker, `${intentType} audit marker`);
    const serialized = JSON.stringify({
      sopSteps: formatted.structured.sopSteps,
      analysis: formatted.analysis,
    });
    for (const invented of ["审核已通过", "明天完成", "电池资料不合格", "上传电池报告"]) {
      assert(!serialized.includes(invented), `${intentType} must remove invented fact: ${invented}`);
    }
    assertIncludes(formatted.analysis, "当前未取得实时审核事实", `${intentType} visible marker`);
  }
});

check("format-output uses explicit auditFactStatus instead of Chinese marker matching", () => {
  const formatted = runNode("format-output.ts", {
    intentType: "audit_status",
    needInfoHint: "",
    auditFactStatus: "not_found",
    auditStatusHint: "实时数据暂不可用，请到维护任务页面自助查看。",
    analysisResult: {
      structured: { branch: "guide_expedite", sopSteps: ["审核已完成"] },
      analysis: "审核已完成。",
    },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "need_human", "explicit not-found branch");
  assert(!formatted.analysis.includes("审核已完成"), "explicit status removes invented fact");
  assertIncludes(formatted.analysis, "实时数据暂不可用", "explicit status preserves system hint");
});

check("non-audit intents ignore unrelated not-found audit hints", () => {
  const marker = "当前未取得实时审核事实。请在维护任务页面查看。";
  const formatted = runNode("format-output.ts", {
    intentType: "register",
    needInfoHint: "",
    auditFactStatus: "not_found",
    auditStatusHint: marker,
    analysisResult: {
      structured: { branch: "guide_register", sopSteps: ["填写商品信息"] },
      analysis: "请按注册流程填写商品信息。",
    },
    inputContext: {},
  });
  assertEqual(formatted.structured.branch, "guide_register", "non-audit branch");
  assertEqual(formatted.structured.auditStatusHint, null, "non-audit structured hint");
  assert(!formatted.analysis.includes("当前未取得实时审核事实"), "non-audit analysis hint");
});

check("workflow passes explicit auditFactStatus to format-output", () => {
  const workflow = JSON.parse(
    fs.readFileSync(path.join(root, "experts", "sku", "registration-guide", "workflow.json"), "utf8")
  );
  const resolveNode = workflow.nodes.find((node: any) => node.id === "resolve-audit-fetch");
  const fetchNode = workflow.nodes.find((node: any) => node.id === "fetch-audit-status");
  const llmNode = workflow.nodes.find((node: any) => node.id === "llm-analyze");
  const formatNode = workflow.nodes.find((node: any) => node.id === "format-output");
  assert(resolveNode.inputs.includes("customerCode"), "resolve customer scope input");
  assert(resolveNode.outputs.includes("customerCode"), "resolve customer scope output");
  assert(resolveNode.outputs.includes("profileSnapshot"), "resolve safe profile output");
  assert(fetchNode.inputs.includes("customerCode"), "fetch customer scope input");
  assert(fetchNode.outputs.includes("auditFactStatus"), "fetch output port");
  assert(fetchNode.outputs.includes("dataSource"), "fetch data source output port");
  assert(fetchNode.outputs.includes("fetchSource"), "fetch source output port");
  assert(fetchNode.cozeIo.outputs.auditFactStatus, "fetch Coze output schema");
  assert(fetchNode.cozeIo.outputs.dataSource, "fetch data source Coze output schema");
  assert(fetchNode.cozeIo.outputs.fetchSource, "fetch source Coze output schema");
  assert(llmNode.inputs.includes("auditFactStatus"), "LLM input wiring");
  assert(formatNode.inputs.includes("auditFactStatus"), "format input wiring");

  const configText = fs.readFileSync(
    path.join(root, "experts", "sku", "registration-guide", "coze.config.yml"),
    "utf8"
  );
  const config = parseYaml(configText) as any;
  const bindings = config.inputBindings;
  assertEqual(bindings["resolve-audit-fetch"].customerCode.ref, "__start__", "resolve customer ref");
  assertEqual(bindings["resolve-audit-fetch"].customerCode.path, "customerCode", "resolve customer path");
  assertEqual(bindings["fetch-audit-status"].customerCode.ref, "resolve-audit-fetch", "fetch customer ref");
  assertEqual(bindings["fetch-audit-status"].profileSnapshot.ref, "resolve-audit-fetch", "fetch safe profile ref");
  assertEqual(bindings["llm-analyze"].profileSnapshot.ref, "resolve-audit-fetch", "LLM safe profile ref");
  assertEqual(bindings["llm-analyze"].needHumanReason.ref, "validate-intent", "LLM human reason ref");
  assertEqual(bindings["llm-analyze"].auditFactStatus.ref, "fetch-audit-status", "LLM fact status ref");
  assertEqual(bindings["format-output"].needHumanReason.ref, "validate-intent", "format human reason ref");
  assertEqual(bindings["format-output"].auditFactStatus.ref, "fetch-audit-status", "format fact status ref");
});

check("registration design documents tenant scope and safe audit fact contract", () => {
  const design = fs.readFileSync(
    path.join(root, "experts", "sku", "registration-guide", "design.md"),
    "utf8"
  );
  assertIncludes(design, "`customerCode`", "top-level customer scope");
  assertIncludes(design, "精确进口国或 `ALL`", "country scope rule");
  assertIncludes(design, "`auditFactStatus=error`", "plugin error contract");
  assertIncludes(design, "空壳行", "empty shell contract");
});

check("multi-country fact is present in runtime registration KB", () => {
  const kb = readPrompt("kb-register.md");
  assertIncludes(kb, "同一 SKU 可按多个进口国维护", "multi-country rule");
  assertIncludes(kb, "属性/合规可能不同", "country-specific differences");
  assertIncludes(kb, "按进口国分别维护申报信息", "country declaration maintenance");
});

check("runtime KB covers duplicate SKU without destructive claims", () => {
  const kb = readPrompt("kb-register.md");
  assertIncludes(kb, "重复商品编码", "duplicate SKU handling");
  assertIncludes(kb, "先检查是否已有同编码商品记录", "existing record check");
  assertIncludes(kb, "不得直接删除或覆盖已有记录", "destructive operation guard");
});

check("runtime prompts prohibit unsupported operation guesses", () => {
  const main = readPrompt("main.md");
  const register = readPrompt("kb-register.md");
  const resubmit = readPrompt("kb-audit-resubmit.md");
  assertIncludes(main, "need_human_unverified_operation", "policy hint");
  assertIncludes(main, "不得仅因 `prefer_sku_code`", "advisory SKU rule");
  assertIncludes(register, "批量修改", "batch modify boundary");
  assertIncludes(register, "审核中撤回/删除", "withdraw boundary");
  assertIncludes(resubmit, "运输方式与电池资料要求存在争议", "transport dispute boundary");
});

if (failures.length > 0) {
  console.error(`\ncheck-sku-registration-guide-regressions: ${failures.length} failed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("check-sku-registration-guide-regressions: all passed");
