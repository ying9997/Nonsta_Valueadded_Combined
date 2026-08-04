/**
 * 节点：format-output — 归一化 LLM 输出；缺参时强制 need_info
 */

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
  usable: boolean;
  incomplete: boolean;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function isInformativeText(value: unknown): boolean {
  const text = str(value);
  if (text.length < 4) return false;
  return !/^(?:好的?|可以|收到|已了解|没问题|明白|知道了|请稍候)[。.!！]*$/i.test(text);
}

function coerceAnalysisResult(raw: unknown): AnalysisResult {
  if (raw == null) return { structured: {}, analysis: "", usable: false, incomplete: false };
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return { structured: {}, analysis: "", usable: false, incomplete: false };
    try {
      return coerceAnalysisResult(JSON.parse(s));
    } catch {
      return { structured: {}, analysis: "", usable: false, incomplete: true };
    }
  }
  const o = asRecord(raw);
  if (o.analysisResult != null) return coerceAnalysisResult(o.analysisResult);
  const hasStructuredObject =
    o.structured != null && typeof o.structured === "object" && !Array.isArray(o.structured);
  const structured = asRecord(o.structured);
  const analysis = typeof o.analysis === "string" ? o.analysis.trim() : "";
  return {
    structured,
    analysis,
    usable: hasStructuredObject,
    incomplete: Object.keys(o).length > 0 && !hasStructuredObject,
  };
}

function customerText(value: unknown): string {
  return String(value ?? "")
    .replace(/skuCodeThird/gi, "第三方条码")
    .replace(/productCode/gi, "商品编码")
    .replace(/skuCode/gi, "商品编码")
    .replace(/winit\.item\.page\.list/gi, "系统商品查询");
}

function customerStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(customerText).filter(Boolean) : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function missingInfoForHint(intentType: string, needInfoHint: string): string[] {
  if (!needInfoHint) return [];
  if (intentType === "third_party_add") {
    if (needInfoHint === "prefer_sku_code") {
      return ["商品编码", "第三方条码字符串", "商品级或单品级类型"];
    }
    if (needInfoHint === "prefer_sku_code_third") {
      return ["第三方条码字符串", "商品级或单品级类型"];
    }
  }
  if (intentType === "scan_fail" && needInfoHint === "prefer_sku_code") {
    return ["商品编码", "仓库实际扫描字符串", "管理模式", "第三方码绑定状态", "商品发布状态"];
  }
  if (intentType === "third_party_delete" && needInfoHint === "prefer_sku_code") {
    return ["商品编码"];
  }
  return [customerText(needInfoHint)];
}

function fallbackSopSteps(intentType: string): string[] {
  if (intentType === "third_party_add") {
    return [
      "确认商品已经存在且状态正常",
      "准备商品编码和实物扫描得到的完整第三方条码，并确认是商品级还是单品级",
      "在万邑联的商品条码维护入口自助绑定；单品级条码需先确认相应权限",
    ];
  }
  if (intentType === "scan_fail") {
    return [
      "核对商品编码和仓库实际扫描到的完整字符串",
      "检查商品发布状态及系统中是否存在对应第三方码绑定",
      "确认 SI 或 SKU 管理模式与本次扫描的条码类型一致",
      "检查是否贴错码、条码污损或打印质量异常",
      "修正后请仓库复扫；仍无法识别时携带上述信息转人工核实",
    ];
  }
  return [];
}

function unsupportedBoundary(needInfoHint: string): {
  analysis: string;
  missingInfo: string[];
} | null {
  switch (needInfoHint) {
    case "unsupported_s_code_reverse_lookup":
      return {
        analysis:
          "当前能力不能保证仅凭 S 码反查商品编码。请提供完整 S 码、出现页面和业务环节，由人工进一步核实。",
        missingInfo: ["完整 S 码", "S 码出现页面", "业务环节"],
      };
    case "unsupported_single_sku_multiple_third_party_codes":
      return {
        analysis:
          "当前知识不能确认单个商品编码可绑定任意数量的第三方码。请提供第三方码类型、实际维护页面和权限状态，由人工核实界面规则。",
        missingInfo: ["第三方码类型", "实际维护页面", "权限状态"],
      };
    case "unsupported_product_name_barcode_change":
      return {
        analysis:
          "当前知识不能确认修改商品名称后条码值是否变化或是否需要重贴。请提供商品编码、名称修改范围和当前标签情况，由人工核实。",
        missingInfo: ["商品编码", "名称修改范围", "当前标签情况"],
      };
    case "unsupported_rm_prefix":
      return {
        analysis:
          "当前知识未定义 RM 前缀，不能据此猜测条码含义。请提供完整码值、出现页面和业务环节，由人工核实。",
        missingInfo: ["完整码值", "出现页面", "业务环节"],
      };
    default:
      return null;
  }
}

const VALID_BRANCHES = new Set([
  "guide_print",
  "guide_third_party_add",
  "guide_third_party_delete",
  "guide_third_party_query",
  "guide_scan_fail",
  "handoff_value_add",
  "need_info",
  "need_human",
]);

function defaultBranch(intentType: string): string {
  switch (intentType) {
    case "print":
      return "guide_print";
    case "third_party_add":
      return "guide_third_party_add";
    case "third_party_delete":
      return "guide_third_party_delete";
    case "third_party_query":
      return "guide_third_party_query";
    case "scan_fail":
      return "guide_scan_fail";
    default:
      return "need_info";
  }
}

function safeFallbackResult(
  intentType: string,
  inputContext: Record<string, unknown>,
  incomplete: boolean,
  reason?: string
) {
  const branch = incomplete ? "need_info" : "need_human";
  const analysis =
    reason ||
    (incomplete
      ? "当前生成的条码指引不完整，请补充具体业务动作和必要信息后重试。"
      : "当前未能生成可靠的条码操作指引，请联系人工客服，并说明具体条码场景和已掌握的信息。");
  const structured = {
    branch,
    topicMatched: intentType,
    sopSteps: incomplete ? ["补充具体业务动作和必要信息"] : ["联系人工客服核实当前条码问题"],
    prerequisites: [],
    missingInfo: [incomplete ? "具体业务动作和必要信息" : "具体条码场景和已掌握的信息"],
    expertRouting: null,
    confidence: "low",
    barcodeSnapshot: null,
  };
  return {
    structured,
    analysis,
    outputContext: {
      expertId: "sku/barcode-guide",
      resultSummary: analysis.slice(0, 200),
      chainId: str(inputContext.chainId),
    },
    enrichedContext: { "sku/barcode-guide": structured },
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const needInfoHint = str(params.needInfoHint);
  const intentType = str(params.intentType) || "general";
  const intentSource = str(params.intentSource) || "fallback";
  const normalizedTopic = str(params.normalizedTopic);
  const customerIntent = str(params.customerIntent);
  const inputContext = asRecord(params.inputContext);
  const coerced = coerceAnalysisResult(params.analysisResult);

  if (needInfoHint === "missing_topic_or_intent") {
    const analysis =
      "请补充咨询主题（例如：打印条码、绑定/删除三方码、仓库扫不上），或提供商品编码。";
    const structured = {
      branch: "need_info",
      topicMatched: "",
      sopSteps: ["说明具体问题或意图", "如有商品编码 / 第三方条码 / 管理模式请一并提供"],
      prerequisites: [],
      missingInfo: ["topic_or_intentType"],
      expertRouting: null,
      confidence: "low",
    };
    return {
      structured,
      analysis,
      outputContext: {
        expertId: "sku/barcode-guide",
        resultSummary: analysis.slice(0, 200),
        chainId: str(inputContext.chainId),
      },
      enrichedContext: { "sku/barcode-guide": structured },
    };
  }

  const boundary = unsupportedBoundary(needInfoHint);
  if (boundary) {
    const structured = {
      branch: "need_human",
      topicMatched: intentType,
      sopSteps: ["整理必要信息", "联系人工客服核实未证实的条码规则"],
      prerequisites: [],
      missingInfo: boundary.missingInfo,
      expertRouting: null,
      confidence: "low",
      barcodeSnapshot: null,
    };
    return {
      structured,
      analysis: boundary.analysis,
      outputContext: {
        expertId: "sku/barcode-guide",
        resultSummary: boundary.analysis.slice(0, 200),
        chainId: str(inputContext.chainId),
      },
      enrichedContext: { "sku/barcode-guide": structured },
    };
  }

  if (!coerced.usable) {
    return safeFallbackResult(intentType, inputContext, coerced.incomplete);
  }

  const structuredIn = asRecord(coerced.structured);
  let branch = str(structuredIn.branch);
  if (!branch || !VALID_BRANCHES.has(branch)) {
    return safeFallbackResult(
      intentType,
      inputContext,
      true,
      "当前生成结果缺少有效处理分支，请补充具体业务动作后重试。"
    );
  }

  const isGuideBranch = branch.startsWith("guide_");
  const expectedGuideBranch = defaultBranch(intentType);
  if (
    isGuideBranch &&
    (intentType === "general" ||
      !expectedGuideBranch.startsWith("guide_") ||
      branch !== expectedGuideBranch)
  ) {
    return safeFallbackResult(
      intentType,
      inputContext,
      true,
      "当前问题尚未明确到可执行的条码动作，请先说明需要打印、绑定、删除、查询还是排查扫码失败。"
    );
  }

  const explicitGuideIntent = intentType === "third_party_add" || intentType === "scan_fail";
  const addActionText = `${normalizedTopic} ${customerIntent}`;
  const hasExplicitAddAction = /绑定|绑码|新增|添加|补绑|维护|录入|怎么绑|如何绑/i.test(addActionText);
  const canRecoverAdd =
    intentType === "third_party_add" && (intentSource === "explicit" || hasExplicitAddAction);
  const canRecoverScan = intentType === "scan_fail";
  const recoveredFromNeedInfo = branch === "need_info" && (canRecoverAdd || canRecoverScan);
  if (recoveredFromNeedInfo) branch = defaultBranch(intentType);

  let sopSteps = customerStrings(structuredIn.sopSteps).filter(isInformativeText);
  if (recoveredFromNeedInfo) {
    sopSteps = unique([...fallbackSopSteps(intentType), ...sopSteps]);
  } else if (explicitGuideIntent && isGuideBranch && sopSteps.length === 0) {
    sopSteps = fallbackSopSteps(intentType);
  }
  let missingInfo = unique([
    ...customerStrings(structuredIn.missingInfo),
    ...missingInfoForHint(intentType, needInfoHint),
  ]);

  const requestText = `${normalizedTopic} ${customerIntent}`;
  const asksWhetherPrintingIsRequired =
    branch === "guide_print" && /(?:条码|标签).*(?:需要|要不要|是否|必须).*(?:打|打印|贴)|(?:需要|要不要|是否|必须).*(?:打|打印|贴).*(?:条码|标签)/i.test(requestText);
  if (asksWhetherPrintingIsRequired) {
    sopSteps = unique([
      "先确认实物是否已有可被仓库识别的条码，以及第三方条码是否已正确绑定",
      "实物没有可识别条码时，在入库前生成、打印并张贴 Winit 商品条码",
      ...sopSteps,
    ]);
  }

  if (
    branch === "guide_third_party_delete" &&
    !sopSteps.some((step) => /删除后.*(?:查询|复扫)|(?:查询|复扫).*删除后/i.test(step))
  ) {
    sopSteps.push("删除后再次查询绑定状态；如仓内仍能扫到旧码，请仓库复扫确认");
  }

  const vagueBarcodeQuestion =
    branch === "need_info" && /^(?:海外仓)?(?:这个)?(?:商品)?(?:条码|码)(?:要)?(?:怎么处理|怎么弄|有问题)?[？?]?$/i.test(
      (normalizedTopic || customerIntent).replace(/\s+/g, "")
    );
  if (vagueBarcodeQuestion) {
    missingInfo = unique([
      ...missingInfo,
      "条码类型（Winit 商品条码、第三方商品条码或第三方单品条码）",
      "具体业务动作（打印、绑定、查询、删除或扫码失败）",
    ]);
  }

  const barcodeSnapshot = asRecord(params.barcodeSnapshot);
  const barcodeSnapshotText = str(params.barcodeSnapshotText);

  const structured = {
    branch,
    topicMatched: customerText(str(structuredIn.topicMatched) || intentType),
    sopSteps,
    prerequisites: customerStrings(structuredIn.prerequisites),
    missingInfo,
    expertRouting: structuredIn.expertRouting ?? (branch === "handoff_value_add" ? "value-add" : null),
    confidence:
      branch === "need_info" || branch === "need_human"
        ? "low"
        : str(structuredIn.confidence) || (missingInfo.length ? "medium" : "high"),
    barcodeSnapshot: Object.keys(barcodeSnapshot).length > 0 ? barcodeSnapshot : null,
  };

  let analysis = customerText(coerced.analysis);
  if (asksWhetherPrintingIsRequired) {
    analysis =
      "商品条码不是所有场景都必须重复打印。请先确认实物是否已有仓库可识别的条码：如果没有可识别条码，应在入库前生成、打印并张贴 Winit 商品条码；如果使用已正确绑定且可识别的第三方条码，可先核对绑定关系和实际扫描效果，不应无条件要求重新打印。";
  }
  if (
    branch === "guide_third_party_delete" &&
    !/删除后.*(?:再次查询|复扫)|(?:再次查询|复扫).*删除后/i.test(analysis)
  ) {
    analysis = `${analysis} 删除后请再次查询绑定状态；如果仓内仍能扫到旧码，请仓库复扫确认。`;
  }
  if (vagueBarcodeQuestion && !/Winit 商品条码.*第三方商品条码.*第三方单品条码/i.test(analysis)) {
    analysis = `${analysis} 请同时确认这是 Winit 商品条码、第三方商品条码还是第三方单品条码。`;
  }
  if (recoveredFromNeedInfo) {
    const missing = missingInfo.length > 0 ? `为进一步确认，请补充：${missingInfo.join("、")}。` : "";
    analysis = `可先按以下通用步骤处理：${sopSteps.join("；")}。${missing}`;
  }
  const finalIsGuideBranch = branch.startsWith("guide_");
  if (finalIsGuideBranch && (sopSteps.length === 0 || !isInformativeText(analysis))) {
    return safeFallbackResult(
      intentType,
      inputContext,
      true,
      "当前生成结果缺少可执行步骤或有效说明，请补充具体业务动作后重试。"
    );
  }
  if (!finalIsGuideBranch && sopSteps.length === 0 && !isInformativeText(analysis)) {
    return safeFallbackResult(intentType, inputContext, true);
  }
  if (!analysis) {
    analysis = "请补充具体条码问题和已掌握的信息，以便继续处理。";
  }
  if (barcodeSnapshotText && !analysis.includes(barcodeSnapshotText.slice(0, 20))) {
    analysis = `${analysis}\n\n【档案摘要】${barcodeSnapshotText}`;
  }

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "sku/barcode-guide",
      resultSummary: analysis.slice(0, 200),
      chainId: str(inputContext.chainId),
    },
    enrichedContext: { "sku/barcode-guide": structured },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
