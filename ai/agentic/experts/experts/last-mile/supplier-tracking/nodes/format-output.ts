/**
 * 节点：format-output — 归一化 LLM 的 analysisResult，生成 result / outputContext
 * FaaS 单文件闭环，无 external import。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【模式】仅 KB 官方物流查询网址与步骤：本专家不在节点内抓取承运商官网；`structured.fetchStatus` 恒为 `fallback_links`，`events` 置空。
 * 【输入】analysisResult、inputContext
 */

const TRACKING_BRANCHES = new Set(["has_portals", "need_info", "ambiguous", "need_human"]);

interface StStructured {
  fetchStatus?: string;
  branch?: string;
  country?: string;
  matchedProductKey?: string;
  trackingPortalUrls?: string[];
  selfServiceSteps?: string;
  suggestedNextExperts?: string[];
  missingFacts?: string[];
  events?: unknown[];
  parseConfidence?: string;
}

interface StAnalysisResult {
  structured?: StStructured;
  analysis?: string;
}

interface StInputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function coerceAnalysisResult(raw: unknown): { structured: StStructured; analysis: string } {
  const fallbackStructured: StStructured = {
    fetchStatus: "fallback_links",
    branch: "need_human",
    country: "",
    matchedProductKey: "",
    trackingPortalUrls: [],
    selfServiceSteps: "",
    suggestedNextExperts: [],
    missingFacts: [],
    events: [],
  };

  if (raw == null) {
    return {
      structured: { ...fallbackStructured },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as StAnalysisResult;
      if (parsed && typeof parsed === "object" && ("structured" in parsed || "analysis" in parsed)) {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      /* fall through */
    }
    return {
      structured: { ...fallbackStructured },
      analysis: s || "解析失败，请人工查看原始模型输出。",
    };
  }
  const o = raw as StAnalysisResult;
  const st = o.structured ?? {};
  const branchRaw = typeof st.branch === "string" ? st.branch.trim() : "";
  const branch = TRACKING_BRANCHES.has(branchRaw) ? branchRaw : "need_human";

  return {
    structured: {
      fetchStatus: "fallback_links",
      branch,
      country: typeof st.country === "string" ? st.country.trim() : "",
      matchedProductKey: typeof st.matchedProductKey === "string" ? st.matchedProductKey.trim() : "",
      trackingPortalUrls: asStringArray(st.trackingPortalUrls),
      selfServiceSteps: typeof st.selfServiceSteps === "string" ? st.selfServiceSteps.trim() : "",
      suggestedNextExperts: asStringArray(st.suggestedNextExperts),
      missingFacts: asStringArray(st.missingFacts),
      events: [],
      parseConfidence:
        typeof st.parseConfidence === "string" ? st.parseConfidence.trim() : undefined,
    },
    analysis: typeof o.analysis === "string" ? o.analysis : "（无 analysis 字段）",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const inputContext = params.inputContext as StInputContext | undefined;
  const summary = coerced.analysis.slice(0, 200) || "承运商轨迹查询入口分析完成";
  const outputContext = {
    expertId: "supplier-tracking",
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
