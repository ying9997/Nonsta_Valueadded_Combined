/**
 * 节点：format-output — 归一化 LLM 输出；缺参时强制 need_info
 */

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function coerceAnalysisResult(raw: unknown): AnalysisResult {
  if (raw == null) return { structured: {}, analysis: "未收到模型输出。" };
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      return coerceAnalysisResult(JSON.parse(s));
    } catch {
      return { structured: {}, analysis: s || "解析失败。" };
    }
  }
  const o = raw as Record<string, unknown>;
  if (o.analysisResult != null) return coerceAnalysisResult(o.analysisResult);
  return {
    structured: asRecord(o.structured),
    analysis: typeof o.analysis === "string" ? o.analysis : "",
  };
}

const VALID_BRANCHES = new Set([
  "verdict_carriability",
  "guide_restricted",
  "guide_certificates",
  "guide_weee",
  "guide_ecommerce",
  "guide_brand",
  "guide_declaration",
  "guide_unban_criteria",
  "handoff_registration",
  "need_info",
  "need_human",
]);

const VALID_VERDICTS = new Set(["pass", "fail", "uncertain", "need_human"]);

function defaultBranch(intentType: string): string {
  switch (intentType) {
    case "carriability_deep":
      return "verdict_carriability";
    case "restricted":
      return "guide_restricted";
    case "certificates":
      return "guide_certificates";
    case "weee":
      return "guide_weee";
    case "ecommerce":
      return "guide_ecommerce";
    case "brand":
      return "guide_brand";
    case "declaration":
      return "guide_declaration";
    case "unban_deep":
      return "guide_unban_criteria";
    default:
      return "guide_certificates";
  }
}

function defaultVerdict(branch: string): string {
  if (branch === "need_human") return "need_human";
  if (branch === "need_info") return "uncertain";
  return "uncertain";
}

async function main({ params }: { params: Record<string, unknown> }) {
  const needInfoHint = str(params.needInfoHint);
  const intentType = str(params.intentType) || "general";
  const inputContext = asRecord(params.inputContext);
  const complianceSnapshotText = str(params.complianceSnapshotText);
  const coerced = coerceAnalysisResult(params.analysisResult);

  if (needInfoHint === "missing_topic_or_intent") {
    const analysis =
      "请补充合规咨询主题（例如：禁限运、证书、WEEE、电清关链接、解禁条件），并尽量提供商品编码、进口国或商品链接。";
    const structured = {
      branch: "need_info",
      topicMatched: "",
      complianceVerdict: "uncertain",
      missingDocuments: [] as string[],
      sopSteps: ["说明具体合规问题", "如有 SKU / 进口国 / 商品链接请一并提供"],
      prerequisites: [],
      missingInfo: ["topic_or_intentType"],
      expertRouting: null,
      confidence: "low",
    };
    return {
      structured,
      analysis,
      outputContext: {
        expertId: "sku/compliance-check",
        resultSummary: analysis.slice(0, 200),
        chainId: str(inputContext.chainId),
      },
      enrichedContext: { "sku/compliance-check": structured },
    };
  }

  const structuredIn = asRecord(coerced.structured);
  let branch = str(structuredIn.branch) || defaultBranch(intentType);
  if (!VALID_BRANCHES.has(branch)) branch = defaultBranch(intentType);

  let complianceVerdict = str(structuredIn.complianceVerdict) || defaultVerdict(branch);
  if (!VALID_VERDICTS.has(complianceVerdict)) complianceVerdict = "uncertain";

  const sopSteps = Array.isArray(structuredIn.sopSteps)
    ? structuredIn.sopSteps.map((s) => String(s))
    : [];
  const missingDocuments = Array.isArray(structuredIn.missingDocuments)
    ? structuredIn.missingDocuments.map((s) => String(s))
    : [];
  const missingInfo = Array.isArray(structuredIn.missingInfo)
    ? structuredIn.missingInfo.map((s) => String(s))
    : [];
  if (needInfoHint && !missingInfo.includes(needInfoHint)) missingInfo.push(needInfoHint);

  const structured = {
    branch,
    topicMatched: str(structuredIn.topicMatched) || intentType,
    complianceVerdict,
    missingDocuments,
    sopSteps,
    prerequisites: Array.isArray(structuredIn.prerequisites)
      ? structuredIn.prerequisites.map((s) => String(s))
      : [],
    missingInfo,
    expertRouting:
      structuredIn.expertRouting ??
      (branch === "handoff_registration" ? "sku/registration-guide" : null),
    confidence: str(structuredIn.confidence) || (missingInfo.length ? "medium" : "high"),
  };

  let analysis = coerced.analysis || "已根据合规知识库整理判定与下一步建议。";
  if (complianceSnapshotText && !analysis.includes(complianceSnapshotText.slice(0, 16))) {
    analysis = `${analysis}\n\n【档案摘要】${complianceSnapshotText}`;
  }

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "sku/compliance-check",
      resultSummary: analysis.slice(0, 200),
      chainId: str(inputContext.chainId),
    },
    enrichedContext: { "sku/compliance-check": structured },
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
