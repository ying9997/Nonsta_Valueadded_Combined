/**
 * 节点：format-output — 归一化 LLM 的 analysisResult，生成 result / outputContext
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】analysisResult（object|string）、inputContext（可选）
 * 【输出】result: { structured, analysis }；outputContext: expertId delivered-not-received
 */

const BRANCHES = new Set([
  "need_info",
  "early_exit",
  "cooling_wait",
  "claim_path_domestic",
  "claim_path_international",
  "not_eligible",
  "not_dnr",
  "no_claim_channel",
  "need_human",
  "handoff_claim",
]);

interface DnrStructured {
  branch?: string;
  trackingIds?: string[];
  outboundOrderNos?: string[];
  suggestedNextExperts?: string[];
  missingFacts?: string[];
}

interface DnrAnalysisResult {
  structured?: DnrStructured;
  analysis?: string;
}

interface DnrInputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

interface DnrGuardResult {
  eligibility?: "eligible" | "ineligible" | "unknown";
  hasAscan?: boolean;
  hasDscan?: boolean;
  hasRdscan?: boolean;
  reason?: string;
}

function coerceAnalysisResult(raw: unknown): { structured: DnrStructured; analysis: string } {
  if (raw == null) {
    return {
      structured: { branch: "need_human", trackingIds: [], outboundOrderNos: [], suggestedNextExperts: [], missingFacts: [] },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as DnrAnalysisResult;
      if (parsed && typeof parsed === "object" && ("structured" in parsed || "analysis" in parsed)) {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      /* fall through */
    }
    return {
      structured: { branch: "need_human", trackingIds: [], outboundOrderNos: [], suggestedNextExperts: [], missingFacts: [] },
      analysis: s || "解析失败，请人工查看原始模型输出。",
    };
  }
  const o = raw as DnrAnalysisResult;
  const st = o.structured ?? {};
  const branchRaw = typeof st.branch === "string" ? st.branch.trim() : "";
  const branch = BRANCHES.has(branchRaw) ? branchRaw : "need_human";

  const trackingIds = Array.isArray(st.trackingIds)
    ? st.trackingIds.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const outboundOrderNos = Array.isArray(st.outboundOrderNos)
    ? st.outboundOrderNos.map((x) => String(x).trim()).filter(Boolean)
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
      trackingIds,
      outboundOrderNos,
      suggestedNextExperts,
      missingFacts,
    },
    analysis: typeof o.analysis === "string" ? o.analysis : "（无 analysis 字段）",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  let coerced = coerceAnalysisResult(params.analysisResult);
  const guard = (params.dnrGuard ?? {}) as DnrGuardResult;
  if (guard.eligibility === "ineligible") {
    coerced = {
      structured: {
        branch: "not_dnr",
        trackingIds: Array.isArray(params.trackingIds) ? params.trackingIds.map(String) : [],
        outboundOrderNos: Array.isArray(params.outboundOrderNos) ? params.outboundOrderNos.map(String) : [],
        suggestedNextExperts: ["tracking-inquiry"],
        missingFacts: [],
      },
      analysis: guard.hasRdscan
        ? "当前结构化轨迹仅显示退回妥投（RDscan），没有买家妥投扫描（Dscan），不属于妥投未收到。请按实际运输或退回状态处理；如需调查包裹去向，可通过尾程查件继续核实。"
        : "当前结构化轨迹没有妥投扫描（Dscan），不属于妥投未收到。若包裹已有上网轨迹但超时、停滞或派送异常，请按“超时未妥投”发起尾程查件。",
    };
  } else if (guard.eligibility !== "eligible") {
    coerced = {
      structured: {
        branch: "need_info",
        trackingIds: Array.isArray(params.trackingIds) ? params.trackingIds.map(String) : [],
        outboundOrderNos: Array.isArray(params.outboundOrderNos) ? params.outboundOrderNos.map(String) : [],
        suggestedNextExperts: ["delivery-status"],
        missingFacts: ["可核验的 Dscan 或结构化妥投事件"],
      },
      analysis: "目前缺少可核验的妥投扫描（Dscan）或结构化妥投事件，不能仅凭“买家未收到”认定为妥投未收到。请先查询完整尾程轨迹并确认是否已经妥投。",
    };
  }
  const inputContext = params.inputContext as DnrInputContext | undefined;
  const summary = coerced.analysis.slice(0, 200) || "妥投未收到分析完成";
  const outputContext = {
    expertId: "delivered-not-received",
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
