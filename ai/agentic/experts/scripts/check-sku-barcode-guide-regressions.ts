/**
 * Offline regression checks for sku/barcode-guide business boundaries.
 *
 * Runs local nodes with synthetic inputs and inspects prompt/KB source files.
 * It does not call an LLM, Coze, Winit OpenAPI, or any external service.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { bundleCozeNodeCodeForExport } from "./coze-export/bundle-coze-node-code";

const repoRoot = path.resolve(__dirname, "..");
const expertDir = path.join(repoRoot, "experts", "sku", "barcode-guide");
const nodeDir = path.join(expertDir, "nodes");
const promptDir = path.join(expertDir, "prompts");
const tsNodeBin = require.resolve("ts-node/dist/bin.js");

let failed = false;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(promptDir, name), "utf8");
}

function runNode(file: string, params: Record<string, unknown>): Record<string, unknown> {
  const stdout = execFileSync(
    process.execPath,
    [
      tsNodeBin,
      "-P",
      path.join(repoRoot, "scripts", "tsconfig.json"),
      path.join(nodeDir, file),
      JSON.stringify(params),
    ],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return JSON.parse(stdout) as Record<string, unknown>;
}

function includesAll(text: string, fragments: string[], label: string) {
  for (const fragment of fragments) {
    assert(text.includes(fragment), `${label} missing rule fragment: ${fragment}`);
  }
}

function checkThirdPartyConceptsAndCustomerVocabulary() {
  const kb = readPrompt("kb-third-party-query.md");
  const main = readPrompt("main.md");

  includesAll(
    kb,
    [
      "第三方商品条码",
      "商品编码",
      "第三方单品条码",
      "SI",
      "权限",
      "FNSKU",
      "平台侧",
      "Winit",
      "先澄清",
      "M 码是 Winit 系统内部唯一商品编码",
      "S 码用于 SI 单品化下的单品追踪",
    ],
    "third-party query KB"
  );
  includesAll(main, ["不得向客户输出", "productCode", "skuCode", "skuCodeThird"], "main prompt");

  const formatted = runNode("format-output.ts", {
    intentType: "third_party_query",
    analysisResult: {
      structured: {
        branch: "guide_third_party_query",
        topicMatched: "skuCodeThird 查询",
        sopSteps: ["使用 productCode 查询 skuCodeThird"],
        prerequisites: ["准备 skuCode"],
        missingInfo: [],
      },
      analysis: "使用 productCode、skuCode 和 skuCodeThird 查询。",
    },
    inputContext: {},
  });
  const structured = asRecord(formatted.structured);
  const customerOutput = [
    String(formatted.analysis ?? ""),
    String(structured.topicMatched ?? ""),
    ...asStrings(structured.sopSteps),
    ...asStrings(structured.prerequisites),
  ].join("\n");
  assert(!/productCode|skuCodeThird|skuCode/.test(customerOutput), "customer output leaked internal field names");
}

function checkExplicitIntentsKeepGuidanceAndCollectMissingInfo() {
  const scanValidation = runNode("validate-intent.ts", { topic: "仓库扫码失败" });
  const scanFormatted = runNode("format-output.ts", {
    intentType: scanValidation.intentType,
    intentSource: scanValidation.intentSource,
    normalizedTopic: scanValidation.normalizedTopic,
    customerIntent: scanValidation.customerIntent,
    needInfoHint: scanValidation.needInfoHint,
    analysisResult: {
      structured: { branch: "need_info", sopSteps: [], missingInfo: [] },
      analysis: "请补充商品编码。",
    },
    inputContext: {},
  });
  const scan = asRecord(scanFormatted.structured);
  assert(scan.branch === "guide_scan_fail", "clear scan-fail intent must not be hard-stopped as need_info");
  assert(asStrings(scan.sopSteps).length >= 4, "scan-fail fallback must provide a general troubleshooting SOP");
  for (const field of ["商品编码", "仓库实际扫描字符串", "管理模式", "第三方码绑定状态", "商品发布状态"]) {
    assert(asStrings(scan.missingInfo).includes(field), `scan-fail missingInfo should include ${field}`);
  }
  assert(!asStrings(scan.missingInfo).includes("prefer_sku_code"), "machine hint must not be exposed in missingInfo");

  const addValidation = runNode("validate-intent.ts", { topic: "需要绑定第三方条码" });
  const addFormatted = runNode("format-output.ts", {
    intentType: addValidation.intentType,
    intentSource: addValidation.intentSource,
    normalizedTopic: addValidation.normalizedTopic,
    customerIntent: addValidation.customerIntent,
    needInfoHint: addValidation.needInfoHint,
    analysisResult: {
      structured: { branch: "need_info", sopSteps: [], missingInfo: [] },
      analysis: "请补充商品编码。",
    },
    inputContext: {},
  });
  const add = asRecord(addFormatted.structured);
  assert(add.branch === "guide_third_party_add", "clear add intent must not be hard-stopped as need_info");
  assert(asStrings(add.sopSteps).length >= 3, "add fallback must provide a general binding SOP");
  for (const field of ["商品编码", "第三方条码字符串", "商品级或单品级类型"]) {
    assert(asStrings(add.missingInfo).includes(field), `add missingInfo should include ${field}`);
  }
}

function checkScanFailOutranksThirdPartyAddTokens() {
  const topics = [
    "仓库扫描 FNSKU 无法识别，但商品已发布，应该怎么排查？",
    "仓库扫不上码。",
    "FNSKU 在仓库扫码失败",
    "第三方条码仓库扫不到",
    "FNSKU添加后扫描失败",
    "第三方条码添加后扫描不了",
    "FNSKU添加后无法扫描",
    "FNSKU添加后无法识别",
    "FNSKU添加后扫不到",
  ];
  for (const topic of topics) {
    const validation = runNode("validate-intent.ts", { topic });
    assert(validation.intentType === "scan_fail", `scan-fail wording must outrank add tokens: ${topic}`);
    assert(validation.intentSource === "detected", `scan-fail wording must be detected explicitly: ${topic}`);
  }
}

function checkRemainingIntentBlockers() {
  const scanFail = runNode("validate-intent.ts", { topic: "FNSKU添加后扫描失败" });
  assert(scanFail.intentType === "scan_fail", "scan failure after FNSKU add must route to scan_fail");

  const reverseLookup = runNode("validate-intent.ts", { topic: "输入S码能找到SKU吗" });
  assert(
    reverseLookup.needInfoHint === "unsupported_s_code_reverse_lookup",
    "using an S code to find SKU must use the conservative human boundary"
  );

  for (const topic of [
    "什么是S码和SKU",
    "S码和SKU分别是什么",
    "S码和SKU有什么区别",
    "S码和SKU在哪里能找到",
    "如何查询S码和SKU",
  ]) {
    const concept = runNode("validate-intent.ts", { topic });
    assert(
      concept.needInfoHint !== "unsupported_s_code_reverse_lookup",
      `S-code and SKU concept question must not be treated as reverse lookup: ${topic}`
    );
  }
}

function checkAddIntentRequiresAnAction() {
  for (const topic of ["第三方条码", "第三方商品条码", "FNSKU"]) {
    const validation = runNode("validate-intent.ts", { topic });
    assert(validation.intentType !== "third_party_add", `bare barcode noun must not imply add: ${topic}`);
  }

  const noun = runNode("validate-intent.ts", { topic: "第三方商品条码" });
  assert(noun.intentType === "general", "bare third-party product barcode noun must remain general");
  assert(noun.intentSource === "fallback", "bare noun must not pretend to be a detected action");
}

function checkIntentSourceAndAddRecoveryBoundaries() {
  const explicit = runNode("validate-intent.ts", {
    intentType: "third_party_add",
    topic: "第三方商品条码",
  });
  assert(explicit.intentSource === "explicit", "valid input intentType must set intentSource=explicit");

  const detected = runNode("validate-intent.ts", { topic: "需要绑定第三方条码" });
  assert(detected.intentSource === "detected", "action text must set intentSource=detected");

  const fallback = runNode("validate-intent.ts", { topic: "条码相关问题" });
  assert(fallback.intentSource === "fallback", "unclassified text must set intentSource=fallback");

  const noun = runNode("validate-intent.ts", { topic: "第三方商品条码" });
  const nounFormatted = runNode("format-output.ts", {
    intentType: noun.intentType,
    intentSource: noun.intentSource,
    normalizedTopic: noun.normalizedTopic,
    customerIntent: noun.customerIntent,
    needInfoHint: noun.needInfoHint,
    analysisResult: {
      structured: { branch: "need_info", sopSteps: ["请说明具体问题"] },
      analysis: "请说明需要查询、绑定、删除还是排查。",
    },
    inputContext: {},
  });
  assert(
    asRecord(nounFormatted.structured).branch === "need_info",
    "a third-party-barcode noun phrase must remain need_info instead of being recovered to add"
  );

  const nounGuideFormatted = runNode("format-output.ts", {
    intentType: noun.intentType,
    intentSource: noun.intentSource,
    normalizedTopic: noun.normalizedTopic,
    customerIntent: noun.customerIntent,
    needInfoHint: noun.needInfoHint,
    analysisResult: {
      structured: {
        branch: "guide_third_party_add",
        sopSteps: ["准备商品编码", "进入第三方条码维护页绑定"],
      },
      analysis: "请直接绑定第三方条码。",
    },
    inputContext: {},
  });
  assert(
    asRecord(nounGuideFormatted.structured).branch === "need_info",
    "fallback noun intent must reject an LLM-invented add branch"
  );

  const explicitFormatted = runNode("format-output.ts", {
    intentType: explicit.intentType,
    intentSource: explicit.intentSource,
    normalizedTopic: explicit.normalizedTopic,
    customerIntent: explicit.customerIntent,
    needInfoHint: explicit.needInfoHint,
    analysisResult: {
      structured: { branch: "need_info", sopSteps: ["请提供商品编码"] },
      analysis: "请提供商品编码。",
    },
    inputContext: {},
  });
  assert(
    asRecord(explicitFormatted.structured).branch === "guide_third_party_add",
    "explicit add intent must recover from need_info"
  );

  const workflow = JSON.parse(fs.readFileSync(path.join(expertDir, "workflow.json"), "utf8")) as {
    nodes: Array<{ id?: string; inputs?: string[]; outputs?: string[] }>;
  };
  const validateNode = workflow.nodes.find((node) => node.id === "validate-intent");
  const formatNode = workflow.nodes.find((node) => node.id === "format-output");
  assert(validateNode?.outputs?.includes("intentSource"), "workflow validate-intent must output intentSource");
  assert(formatNode?.inputs?.includes("intentSource"), "workflow format-output must receive intentSource");
  assert(formatNode?.inputs?.includes("normalizedTopic"), "workflow format-output must receive normalizedTopic");
  assert(formatNode?.inputs?.includes("customerIntent"), "workflow format-output must receive customerIntent");

  const config = fs.readFileSync(path.join(expertDir, "coze.config.yml"), "utf8");
  includesAll(config, ["format-output:", "intentSource:", "normalizedTopic:", "customerIntent:"], "coze format bindings");
}

function checkUnsupportedRulesUseConservativeHumanBoundary() {
  const main = readPrompt("main.md");
  const queryKb = readPrompt("kb-third-party-query.md");
  const combined = `${main}\n${queryKb}`;

  includesAll(
    combined,
    [
      "不能保证仅凭 S 码反查商品编码",
      "不能确认单个商品编码可绑定任意数量的第三方码",
      "不能确认修改商品名称后条码值是否变化或是否需要重贴",
      "RM 前缀",
      "完整码值",
      "出现页面",
      "业务环节",
      "need_human",
    ],
    "unsupported-rule boundary"
  );

  const boundaryTopics = [
    "仅凭 S 码反查商品编码",
    "一个商品编码能绑定多少个第三方码",
    "修改商品名称后条码会不会变",
    "RM 前缀是什么意思",
  ];
  for (const topic of boundaryTopics) {
    const validation = runNode("validate-intent.ts", { topic });
    const formatted = runNode("format-output.ts", {
      intentType: validation.intentType,
      needInfoHint: validation.needInfoHint,
      analysisResult: {
        structured: { branch: "guide_third_party_query", sopSteps: ["直接给出确定结论"] },
        analysis: "可以直接确认。",
      },
      inputContext: {},
    });
    const structured = asRecord(formatted.structured);
    assert(structured.branch === "need_human", `unsupported topic must force need_human: ${topic}`);
    assert(structured.confidence === "low", `unsupported topic must use low confidence: ${topic}`);
    assert(asStrings(structured.missingInfo).length >= 2, `unsupported topic must collect human-review facts: ${topic}`);
  }
}

function checkUnsupportedDetectionDirectionAndActionNegatives() {
  for (const topic of [
    "查询SKU下有哪些S码",
    "S码和SKU是什么对应关系？",
    "什么是S码和SKU",
    "S码和SKU分别是什么",
    "S码和SKU的概念",
    "S码和SKU的含义",
    "S码和SKU有什么区别",
    "S码和SKU是什么关系",
    "查询一个SKU已有多个第三方码",
    "支持查询多个第三方条码吗",
    "打印RM123456条码",
  ]) {
    const validation = runNode("validate-intent.ts", { topic });
    assert(
      !String(validation.needInfoHint ?? "").startsWith("unsupported_"),
      `supported direction/action must not trigger unsupported boundary: ${topic}`
    );
  }
}

function checkSCodeNaturalWordingUsesHumanBoundary() {
  for (const topic of [
    "通过S码确认商品SKU",
    "SKU怎么通过S码确认",
    "S码对应哪个SKU",
    "这个S码对应的SKU是什么",
    "S码能查SKU吗",
    "拿S码能查SKU",
    "用这个S码查SKU",
    "根据S码查商品编码",
    "查下这个S码是哪个SKU",
    "SKU能从S码查出来吗",
    "商品编码可以从S码反查吗",
    "SKU是否能由S码查到",
    "SKU能按S码查询吗",
    "输入S码能找到SKU吗",
  ]) {
    const validation = runNode("validate-intent.ts", { topic });
    const formatted = runNode("format-output.ts", {
      intentType: validation.intentType,
      needInfoHint: validation.needInfoHint,
      analysisResult: {
        structured: { branch: "guide_third_party_query", sopSteps: ["直接确认商品"] },
        analysis: "可以直接确认。",
      },
      inputContext: {},
    });
    const structured = asRecord(formatted.structured);
    assert(structured.branch === "need_human", `natural S-code-to-SKU wording must force need_human: ${topic}`);
    assert(
      asStrings(structured.missingInfo).includes("完整 S 码"),
      `S-code boundary must collect the full S code: ${topic}`
    );
  }
}

function checkOneToManyCapabilityVariantsUseHumanBoundary() {
  for (const topic of [
    "一个SKU可以添加几个第三方条码",
    "支持一对多绑定",
    "一个SKU能有几个第三方条码",
    "支持多个第三方码吗",
    "如何设置一个sku对应多个第三方条码",
    "绑两个第三方码",
  ]) {
    const validation = runNode("validate-intent.ts", { topic });
    assert(
      validation.needInfoHint === "unsupported_single_sku_multiple_third_party_codes",
      `one-to-many binding capability must trigger unsupported boundary: ${topic}`
    );
    const formatted = runNode("format-output.ts", {
      intentType: validation.intentType,
      needInfoHint: validation.needInfoHint,
      analysisResult: {
        structured: { branch: "guide_third_party_add", sopSteps: ["直接确认支持"] },
        analysis: "支持绑定。",
      },
      inputContext: {},
    });
    assert(asRecord(formatted.structured).branch === "need_human", `one-to-many capability must force need_human: ${topic}`);
  }
}

function checkRmDetectionDoesNotMatchOrdinaryEnglishWords() {
  for (const topic of ["format barcode output", "normal barcode guidance"]) {
    const validation = runNode("validate-intent.ts", { topic, intentType: "third_party_query" });
    assert(
      validation.needInfoHint !== "unsupported_rm_prefix",
      `ordinary English text must not trigger RM boundary: ${topic}`
    );
    const formatted = runNode("format-output.ts", {
      intentType: validation.intentType,
      needInfoHint: validation.needInfoHint,
      analysisResult: {
        structured: { branch: "guide_third_party_query", sopSteps: ["提供通用查询说明"] },
        analysis: "提供通用条码查询说明。",
      },
      inputContext: {},
    });
    assert(asRecord(formatted.structured).branch !== "need_human", `ordinary English text must not be forced to need_human: ${topic}`);
  }
}

function checkRmCodeValueUsesHumanBoundary() {
  const validation = runNode("validate-intent.ts", { topic: "RM123456是什么码" });
  assert(validation.needInfoHint === "unsupported_rm_prefix", "RM followed by a numeric code must trigger RM boundary");
  const formatted = runNode("format-output.ts", {
    intentType: validation.intentType,
    needInfoHint: validation.needInfoHint,
    analysisResult: {
      structured: { branch: "guide_third_party_query", sopSteps: ["直接解释码值"] },
      analysis: "直接解释。",
    },
    inputContext: {},
  });
  assert(asRecord(formatted.structured).branch === "need_human", "RM numeric code must force need_human");
}

function checkProductNameChangeOnlyTriggersForBarcodeImpact() {
  const harmless = runNode("validate-intent.ts", { topic: "修改商品名称需要商品编码吗" });
  assert(
    harmless.needInfoHint !== "unsupported_product_name_barcode_change",
    "asking for a product code during a name change must not trigger barcode-change boundary"
  );

  const printImpact = runNode("validate-intent.ts", { topic: "修改商品名称后是否需要重新打印标签" });
  assert(
    printImpact.needInfoHint === "unsupported_product_name_barcode_change",
    "asking whether a name change requires reprinting labels must trigger barcode-change boundary"
  );
  const formatted = runNode("format-output.ts", {
    intentType: printImpact.intentType,
    needInfoHint: printImpact.needInfoHint,
    analysisResult: {
      structured: { branch: "guide_print", sopSteps: ["直接承诺无需重打"] },
      analysis: "无需重新打印。",
    },
    inputContext: {},
  });
  assert(asRecord(formatted.structured).branch === "need_human", "name-change print impact must force need_human");

  const originalBusinessWording =
    "如果商品名称设置的已经打印出来贴标了，我重新改商品名称生成的商品条码跟上一个一样吗，需要贴标吗";
  const originalValidation = runNode("validate-intent.ts", { topic: originalBusinessWording });
  assert(
    originalValidation.needInfoHint === "unsupported_product_name_barcode_change",
    "full name-change wording about barcode equality and relabeling must trigger barcode-change boundary"
  );
  const originalFormatted = runNode("format-output.ts", {
    intentType: originalValidation.intentType,
    needInfoHint: originalValidation.needInfoHint,
    analysisResult: {
      structured: { branch: "guide_print", sopSteps: ["直接承诺条码相同且无需贴标"] },
      analysis: "条码相同，不需要贴标。",
    },
    inputContext: {},
  });
  assert(
    asRecord(originalFormatted.structured).branch === "need_human",
    "full name-change wording must be overridden to need_human"
  );

  for (const topic of [
    "我已经决定修改商品名称并重新打印标签，怎么操作？",
    "修改商品名称后我要重贴标签，请告诉我怎么打印。",
    "商品名已经改了，我决定重打标签，怎么操作",
    "商品名已经改了，我要重新打印标签，怎么操作",
    "商品名已经改了，我决定重贴标签，如何操作",
    "商品名已经改了，准备重新打印标签怎么操作",
  ]) {
    const validation = runNode("validate-intent.ts", { topic });
    assert(
      validation.needInfoHint !== "unsupported_product_name_barcode_change",
      `decided reprint action must not trigger uncertainty boundary: ${topic}`
    );
    assert(validation.intentType === "print", `decided reprint action must route to print: ${topic}`);
  }

  const uncertainReprint = runNode("validate-intent.ts", {
    topic: "商品名改了还要重打标签吗",
  });
  assert(
    uncertainReprint.needInfoHint === "unsupported_product_name_barcode_change",
    "uncertain name-change reprint question must trigger the human boundary"
  );
  const uncertainFormatted = runNode("format-output.ts", {
    intentType: uncertainReprint.intentType,
    needInfoHint: uncertainReprint.needInfoHint,
    analysisResult: {
      structured: { branch: "guide_print", sopSteps: ["直接确认是否重打"] },
      analysis: "直接确认。",
    },
    inputContext: {},
  });
  assert(
    asRecord(uncertainFormatted.structured).branch === "need_human",
    "uncertain name-change reprint question must force need_human"
  );
}

function checkFormatOutputRequiresCompleteStructuredBusinessAnswer() {
  const unsafeInputs: Array<{ label: string; analysisResult: unknown }> = [
    { label: "raw non-JSON", analysisResult: "好的" },
    { label: "analysis only", analysisResult: { analysis: "请按页面操作。" } },
    {
      label: "branch and analysis without SOP",
      analysisResult: { structured: { branch: "guide_print" }, analysis: "请打印标签。" },
    },
    {
      label: "branch and SOP without analysis",
      analysisResult: { structured: { branch: "guide_print", sopSteps: ["下载标签 PDF"] } },
    },
    {
      label: "empty-talk structured output",
      analysisResult: {
        structured: { branch: "guide_print", sopSteps: ["好的"] },
        analysis: "好的",
      },
    },
    { label: "empty need-info branch", analysisResult: { structured: { branch: "need_info" } } },
  ];

  for (const item of unsafeInputs) {
    const formatted = runNode("format-output.ts", {
      intentType: "print",
      intentSource: "detected",
      normalizedTopic: "打印商品标签",
      analysisResult: item.analysisResult,
      inputContext: {},
    });
    const structured = asRecord(formatted.structured);
    assert(
      structured.branch === "need_info" || structured.branch === "need_human",
      `${item.label} must fail safely instead of becoming a guide branch`
    );
    assert(structured.confidence === "low", `${item.label} must use low confidence`);
  }

  const validJson = runNode("format-output.ts", {
    intentType: "print",
    intentSource: "detected",
    normalizedTopic: "打印商品标签",
    analysisResult: JSON.stringify({
      structured: {
        branch: "guide_print",
        sopSteps: ["生成标签 PDF", "下载 PDF 后打印"],
      },
      analysis: "请先生成标签 PDF，下载后再打印。",
    }),
    inputContext: {},
  });
  assert(
    asRecord(validJson.structured).branch === "guide_print",
    "parseable JSON with branch, business SOP and analysis must remain usable"
  );

  const clarification = runNode("format-output.ts", {
    intentType: "general",
    intentSource: "fallback",
    normalizedTopic: "条码问题",
    analysisResult: {
      structured: {
        branch: "need_info",
        sopSteps: ["请说明需要打印、绑定、删除、查询还是排查扫码失败"],
        missingInfo: ["具体业务动作"],
      },
      analysis: "请补充具体业务动作后继续处理。",
    },
    inputContext: {},
  });
  assert(
    asRecord(clarification.structured).confidence === "low",
    "need_info output must remain low confidence"
  );
}

function checkSystemStateRequiresWarehouseRescan() {
  const kb = readPrompt("kb-third-party-query.md");
  includesAll(kb, ["系统查询状态", "不等于", "仓库扫描已经生效", "仓库复扫"], "query verification boundary");
}

function checkPrintQuantityAndPdfSequence() {
  const kb = readPrompt("kb-print.md");
  includesAll(
    kb,
    [
      "不得直接按箱数推导打印张数",
      "实际贴标对象",
      "实际单品数量",
      "生成或获取标签 PDF",
      "下载或保存 PDF",
      "再打印",
      "以实际界面能力为准",
    ],
    "print KB"
  );
}

function checkEmptyLlmOutputCannotBecomeSuccessBranch() {
  const formatted = runNode("format-output.ts", {
    intentType: "print",
    analysisResult: null,
    inputContext: { chainId: "offline-empty-output" },
  });
  const structured = asRecord(formatted.structured);
  assert(structured.branch === "need_human", "empty LLM output must use need_human");
  assert(structured.confidence === "low", "empty LLM output must have low confidence");
  assert(String(formatted.analysis ?? "").includes("未能生成可靠"), "empty LLM output needs an honest fallback");
}

function checkIncompleteAndGeneralOutputsFailSafely() {
  const branchOnly = runNode("format-output.ts", {
    intentType: "print",
    intentSource: "explicit",
    analysisResult: { structured: { branch: "guide_print" } },
    inputContext: {},
  });
  assert(
    asRecord(branchOnly.structured).branch === "need_info",
    "branch-only LLM output must fail safely as need_info"
  );

  const generalNoBranch = runNode("format-output.ts", {
    intentType: "general",
    intentSource: "fallback",
    analysisResult: {
      structured: { sopSteps: ["请说明具体业务动作"] },
      analysis: "请说明具体业务动作。",
    },
    inputContext: {},
  });
  assert(
    asRecord(generalNoBranch.structured).branch === "need_info",
    "general output without a branch must not default to guide_print"
  );
}

function checkRecoveredNeedInfoMergesStandardSop() {
  const validation = runNode("validate-intent.ts", {
    intentType: "third_party_add",
    topic: "第三方商品条码",
  });
  const formatted = runNode("format-output.ts", {
    intentType: validation.intentType,
    intentSource: validation.intentSource,
    normalizedTopic: validation.normalizedTopic,
    customerIntent: validation.customerIntent,
    needInfoHint: validation.needInfoHint,
    analysisResult: {
      structured: { branch: "need_info", sopSteps: ["请提供SKU"] },
      analysis: "请提供SKU。",
    },
    inputContext: {},
  });
  const structured = asRecord(formatted.structured);
  const sop = asStrings(structured.sopSteps);
  assert(structured.branch === "guide_third_party_add", "explicit add intent must recover to add guide");
  assert(sop.length >= 4, "recovered add guidance must merge standard SOP with the LLM step");
  assert(sop.some((step) => step.includes("商品已经存在")), "recovered add guidance must include standard prerequisites");
  assert(sop.some((step) => step.includes("自助绑定")), "recovered add guidance must include the binding path");
}

function checkBarcodeFetchNodesStayLightweightAndRunnable() {
  for (const file of ["build-barcode-page-list.ts", "fetch-barcode-snapshot.ts"]) {
    const bundled = bundleCozeNodeCodeForExport(path.join(nodeDir, file), repoRoot);
    assert(!bundled.includes("coze-inline: shared/"), `${file} must not inline shared runtime`);
    assert(Buffer.byteLength(bundled, "utf8") <= 12_000, `${file} exceeds Coze code envelope`);
  }

  const plan = runNode("build-barcode-page-list.ts", {
    skuCode: "SKU-001",
    fetchProfile: "barcode_third",
  });
  assert(plan.winitPluginBatchActionsCount === 1, "barcode fetch plan must create one action");
  const actions = Array.isArray(plan.actions) ? plan.actions.map(asRecord) : [];
  assert(actions[0]?.action === "winit.item.page.list", "barcode fetch action name must be stable");

  const skipped = runNode("fetch-barcode-snapshot.ts", { skipApi: true });
  assert(skipped.skipFetch === true, "skipApi must bypass barcode snapshot parsing");

  const snapshot = runNode("fetch-barcode-snapshot.ts", {
    skuCode: "SKU-001",
    fetchProfile: "barcode_third",
    winitPluginOutputList: [
      {
        data: JSON.stringify({
          code: 0,
          data: { list: [{ skuCode: "SKU-001", skuCodeThirds: ["THIRD-1"] }], totalCount: 1 },
        }),
      },
    ],
  });
  const barcodeSnapshot = asRecord(snapshot.barcodeSnapshot);
  assert(barcodeSnapshot.skuCode === "SKU-001", "barcode snapshot must keep requested SKU");
  assert(asStrings(barcodeSnapshot.skuCodeThirds)[0] === "THIRD-1", "barcode snapshot must keep third-party code");

  const supplement = runNode("fetch-barcode-snapshot.ts", {
    fetchProfile: "supplement_third_sku",
    winitPluginOutputList: [
      { data: { list: [{ skuCode: "SKU-A" }, { skuCode: "SKU-B" }], totalCount: 2 } },
    ],
  });
  const supplementSnapshot = asRecord(supplement.barcodeSnapshot);
  assert(supplementSnapshot.supplementTotal === 2, "supplement snapshot must keep total count");
  assert(asStrings(supplementSnapshot.supplementSkuCodes).length === 2, "supplement snapshot must keep SKU preview");

  for (const params of [
    { skuCode: "SKU-ERR", winitPluginOutputList: [] },
    { skuCode: "SKU-ERR", winitPluginOutputList: [{ data: { code: 500, msg: "upstream failed" } }] },
    {
      skuCode: "SKU-ERR",
      winitPluginOutputList: [
        { code: 500, msg: "outer failed", data: { list: [{ skuCode: "SKU-ERR" }] } },
      ],
    },
    {
      skuCode: "SKU-ERR",
      winitPluginOutputList: [{ data: { code: 0, data: { code: 500, msg: "inner failed" } } }],
    },
  ]) {
    const failedFetch = runNode("fetch-barcode-snapshot.ts", params);
    const failedSnapshot = asRecord(failedFetch.barcodeSnapshot);
    assert(typeof failedSnapshot.fetchError === "string", "plugin failure must remain a fetch error");
    assert(failedSnapshot.missing !== true, "plugin failure must not become sku missing");
  }

  const mismatched = runNode("fetch-barcode-snapshot.ts", {
    skuCode: "SKU-WANTED",
    winitPluginOutputList: [
      { data: { code: 0, data: { list: [{ skuCode: "SKU-OTHER", skuCodeThirds: ["WRONG"] }] } } },
    ],
  });
  const mismatchedSnapshot = asRecord(mismatched.barcodeSnapshot);
  assert(mismatchedSnapshot.missing === true, "a different SKU row must not be reused for the requested SKU");
  assert(asStrings(mismatchedSnapshot.skuCodeThirds).length === 0, "mismatched SKU facts must not leak");
}

function checkConfirmedBarcodeGuidanceCorrections() {
  const print = runNode("format-output.ts", {
    intentType: "print",
    intentSource: "explicit",
    normalizedTopic: "商品条码需要打吗",
    customerIntent: "商品条码需要打吗",
    analysisResult: {
      structured: {
        branch: "guide_print",
        topicMatched: "打印商品条码",
        sopSteps: ["打印并张贴标签"],
        prerequisites: [],
        missingInfo: [],
        confidence: "high",
      },
      analysis: "商品条码是需要打印的，入库前必须打印。",
    },
    inputContext: {},
  });
  assert(String(print.analysis).includes("不是所有场景都必须重复打印"), "print answer must be conditional");
  assert(String(print.analysis).includes("已正确绑定且可识别的第三方条码"), "print answer must cover bound third-party codes");

  const deletion = runNode("format-output.ts", {
    intentType: "third_party_delete",
    intentSource: "explicit",
    normalizedTopic: "如何删除绑定错误的第三方商品条码",
    customerIntent: "如何删除绑定错误的第三方商品条码",
    analysisResult: {
      structured: {
        branch: "guide_third_party_delete",
        topicMatched: "删除第三方商品条码",
        sopSteps: ["删除前先查询确认绑定"],
        prerequisites: [],
        missingInfo: [],
        confidence: "high",
      },
      analysis: "请先查询确认绑定，再按页面入口删除。",
    },
    inputContext: {},
  });
  assert(
    asStrings(asRecord(deletion.structured).sopSteps).some((step) => step.includes("删除后再次查询")),
    "delete answer must include post-delete verification"
  );

  const vague = runNode("format-output.ts", {
    intentType: "general",
    intentSource: "fallback",
    normalizedTopic: "这个码要怎么弄？",
    customerIntent: "这个码要怎么弄？",
    analysisResult: {
      structured: {
        branch: "need_info",
        topicMatched: "海外仓条码",
        sopSteps: ["请说明具体条码问题"],
        prerequisites: [],
        missingInfo: ["具体业务动作"],
        confidence: "low",
      },
      analysis: "请说明需要办理哪项条码业务。",
    },
    inputContext: {},
  });
  assert(
    asStrings(asRecord(vague.structured).missingInfo).some((item) => item.includes("条码类型")),
    "vague answer must clarify barcode type"
  );
}

const checks: Array<[string, () => void]> = [
  ["third-party concepts and customer vocabulary", checkThirdPartyConceptsAndCustomerVocabulary],
  ["explicit intents keep guidance and collect missing info", checkExplicitIntentsKeepGuidanceAndCollectMissingInfo],
  ["scan-fail intent outranks add tokens", checkScanFailOutranksThirdPartyAddTokens],
  ["remaining intent blockers", checkRemainingIntentBlockers],
  ["add intent requires an action", checkAddIntentRequiresAnAction],
  ["intent source and add recovery boundaries", checkIntentSourceAndAddRecoveryBoundaries],
  ["unsupported rules use conservative human boundary", checkUnsupportedRulesUseConservativeHumanBoundary],
  ["unsupported detection direction and action negatives", checkUnsupportedDetectionDirectionAndActionNegatives],
  ["natural S-code wording uses human boundary", checkSCodeNaturalWordingUsesHumanBoundary],
  ["one-to-many capability variants use human boundary", checkOneToManyCapabilityVariantsUseHumanBoundary],
  ["RM detection ignores ordinary English words", checkRmDetectionDoesNotMatchOrdinaryEnglishWords],
  ["RM code value uses human boundary", checkRmCodeValueUsesHumanBoundary],
  ["product name change only triggers for barcode impact", checkProductNameChangeOnlyTriggersForBarcodeImpact],
  ["format output requires a complete structured business answer", checkFormatOutputRequiresCompleteStructuredBusinessAnswer],
  ["system state requires warehouse rescan", checkSystemStateRequiresWarehouseRescan],
  ["print quantity and PDF sequence", checkPrintQuantityAndPdfSequence],
  ["empty LLM output cannot become success branch", checkEmptyLlmOutputCannotBecomeSuccessBranch],
  ["incomplete and general outputs fail safely", checkIncompleteAndGeneralOutputsFailSafely],
  ["recovered need_info merges standard SOP", checkRecoveredNeedInfoMergesStandardSop],
  ["barcode fetch nodes stay lightweight and runnable", checkBarcodeFetchNodesStayLightweightAndRunnable],
  ["confirmed barcode guidance corrections", checkConfirmedBarcodeGuidanceCorrections],
];

const filters = process.argv.slice(2).map((value) => value.toLowerCase());
const selectedChecks = filters.length
  ? checks.filter(([name]) => filters.some((filter) => name.toLowerCase().includes(filter)))
  : checks;

assert(selectedChecks.length > 0, `no checks matched filters: ${filters.join(", ")}`);

for (const [name, check] of selectedChecks) {
  try {
    check();
    console.log(`OK   ${name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
console.log("sku/barcode-guide regression checks OK");
