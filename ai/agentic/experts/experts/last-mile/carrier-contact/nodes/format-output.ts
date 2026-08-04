/**
 * 节点：format-output — 归一化 LLM 的 analysisResult，生成 result / outputContext
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】analysisResult（object|string）、inputContext（可选）
 * 【输出】result: { structured, analysis }；outputContext: expertId carrier-contact
 */

const BRANCHES = new Set([
  "has_contact",
  "need_info",
  "international_escalate",
  "need_human",
  "no_public_phone",
]);

interface CcStructured {
  branch?: string;
  carrierCode?: string;
  standardCarrier?: string;
  pickupPointIds?: string[];
  suggestedNextExperts?: string[];
  missingFacts?: string[];
  contactSummary?: string;
}

interface CcAnalysisResult {
  structured?: CcStructured;
  analysis?: string;
}

interface CcInputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

function coerceAnalysisResult(raw: unknown): { structured: CcStructured; analysis: string } {
  if (raw == null) {
    return {
      structured: {
        branch: "need_human",
        carrierCode: "",
        standardCarrier: "",
        pickupPointIds: [],
        suggestedNextExperts: [],
        missingFacts: [],
        contactSummary: "",
      },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as CcAnalysisResult;
      if (parsed && typeof parsed === "object" && ("structured" in parsed || "analysis" in parsed)) {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      /* fall through */
    }
    return {
      structured: {
        branch: "need_human",
        carrierCode: "",
        standardCarrier: "",
        pickupPointIds: [],
        suggestedNextExperts: [],
        missingFacts: [],
        contactSummary: "",
      },
      analysis: s || "解析失败，请人工查看原始模型输出。",
    };
  }
  const o = raw as CcAnalysisResult;
  const st = o.structured ?? {};
  const branchRaw = typeof st.branch === "string" ? st.branch.trim() : "";
  const branch = BRANCHES.has(branchRaw) ? branchRaw : "need_human";

  const pickupPointIds = Array.isArray(st.pickupPointIds)
    ? st.pickupPointIds.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const suggestedNextExperts = Array.isArray(st.suggestedNextExperts)
    ? st.suggestedNextExperts.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const missingFacts = Array.isArray(st.missingFacts)
    ? st.missingFacts.map((x) => String(x).trim()).filter(Boolean)
    : [];

  return {
    structured: {
      branch,
      carrierCode: typeof st.carrierCode === "string" ? st.carrierCode.trim() : "",
      standardCarrier: typeof st.standardCarrier === "string" ? st.standardCarrier.trim() : "",
      pickupPointIds,
      suggestedNextExperts,
      missingFacts,
      contactSummary: typeof st.contactSummary === "string" ? st.contactSummary.trim() : "",
    },
    analysis: typeof o.analysis === "string" ? o.analysis : "（无 analysis 字段）",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const inputContext = params.inputContext as CcInputContext | undefined;
  const summary = coerced.analysis.slice(0, 200) || "承运商联系方式分析完成";
  const outputContext = {
    expertId: "carrier-contact",
    resultSummary: summary,
    chainId: inputContext?.chainId ?? "",
  };
  return {
    structured: coerced.structured,
    analysis: coerced.analysis,
    outputContext,
    enrichedContext: {},
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
