/**
 * 节点：format-output — 归一化 LLM 的 analysisResult，生成下游 result / outputContext
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 `workflow.json` 中本节点 `inputs` / `outputs` 完全一致。
 *
 * 【输入】`params` 字段：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | object \| string \| null | LLM 输出：含 structured + analysis；若为 string 则尝试 JSON.parse；解析失败时整段作为 analysis |
 * | inputContext | object（可选） | 链式上下文，见下方 RefundInputContext |
 *
 * RefundInputContext（inputContext 内字段，均为可选）：
 * | 字段 | 类型 |
 * |------|------|
 * | sourceExpertId | string |
 * | previousOutput | string \| object |
 * | chainId | string |
 *
 * 【输出】JSON 对象：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | result | { structured: RefundStructuredOut; analysis: string } | structured 经 coerce：policyBranch 枚举外置为 undefined；缺省字段补默认 |
 * | outputContext | { expertId: string; resultSummary: string; chainId?: string } | expertId 固定 `refund-standard`；resultSummary 为 analysis 前 200 字截断 |
 *
 * RefundStructuredOut（result.structured，字段均可选；coerce 后会补 matchedRuleIds/confidence/suggestedNextStep 等默认值）：
 * | 字段 | 类型 |
 * |------|------|
 * | policyBranch | "winit_ops_sla" \| "carrier_designated" \| "carrier_winit_combo" \| "unknown" |
 * | matchedRuleIds | string[] |
 * | scenarioSummary | string |
 * | dimensionsConsidered | { adopted?: Record<string,string>; missing?: string[] } |
 * | confidence | "high" \| "medium" \| "low" |
 * | suggestedNextStep | string（如 route_to_substitute_claim、need_order_details、escalate_human、none） |
 */

/** 本文件内专用类型名，避免与仓库内其他专家同名 interface 全局合并 */
interface RefundDimensionsConsidered {
  adopted?: Record<string, string>;
  missing?: string[];
}

interface RefundStructuredOut {
  policyBranch?: "winit_ops_sla" | "carrier_designated" | "carrier_winit_combo" | "unknown";
  matchedRuleIds?: string[];
  scenarioSummary?: string;
  dimensionsConsidered?: RefundDimensionsConsidered;
  confidence?: "high" | "medium" | "low";
  suggestedNextStep?: string;
  scenarioApplicability?: "applicable" | "inapplicable" | "not_checked";
}

interface RefundAnalysisResult {
  structured?: RefundStructuredOut;
  analysis?: string;
}

interface RefundInputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

interface RefundOutputContext {
  expertId: string;
  resultSummary: string;
  chainId?: string;
}

function buildOutputContext(resultSummary: string, chainId?: string): RefundOutputContext {
  return {
    expertId: "refund-standard",
    resultSummary,
    chainId,
  };
}

function coerceAnalysisResult(raw: unknown): RefundAnalysisResult {
  if (raw == null) {
    return {
      structured: { matchedRuleIds: [], confidence: "low", suggestedNextStep: "need_order_details" },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as RefundAnalysisResult;
      if (parsed && typeof parsed === "object" && ("structured" in parsed || "analysis" in parsed)) {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      /* fall through */
    }
    return {
      structured: { matchedRuleIds: [], confidence: "low", suggestedNextStep: "escalate_human" },
      analysis: s || "解析失败，请人工查看原始模型输出。",
    };
  }
  const o = raw as { structured?: Record<string, unknown>; analysis?: string };
  const structured = o.structured ?? {};
  const analysis = typeof o.analysis === "string" ? o.analysis : "";
  const pb = structured.policyBranch;
  const policyBranch =
    pb === "winit_ops_sla" ||
    pb === "carrier_designated" ||
    pb === "carrier_winit_combo" ||
    pb === "unknown"
      ? pb
      : undefined;
  const conf = structured.confidence;
  const confidence =
    conf === "high" || conf === "medium" || conf === "low" ? conf : "medium";

  return {
    structured: {
      policyBranch,
      matchedRuleIds: Array.isArray(structured.matchedRuleIds) ? (structured.matchedRuleIds as string[]) : [],
      scenarioSummary: typeof structured.scenarioSummary === "string" ? structured.scenarioSummary : undefined,
      dimensionsConsidered:
        structured.dimensionsConsidered && typeof structured.dimensionsConsidered === "object"
          ? (structured.dimensionsConsidered as RefundDimensionsConsidered)
          : undefined,
      confidence,
      suggestedNextStep: typeof structured.suggestedNextStep === "string" ? structured.suggestedNextStep : "none",
    },
    analysis: analysis || "（无 analysis 字段）",
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  let analysisResult = coerceAnalysisResult(params.analysisResult);
  const scenarioGuard =
    params.scenarioGuard && typeof params.scenarioGuard === "object"
      ? (params.scenarioGuard as Record<string, unknown>)
      : {};
  const scenarioApplicability = String(scenarioGuard.scenarioApplicability ?? "not_checked");
  if (scenarioApplicability === "inapplicable") {
    analysisResult = {
      structured: {
        policyBranch: "unknown",
        matchedRuleIds: [],
        scenarioSummary: "具体订单暂无妥投扫描，不适用妥投未收到赔付场景",
        dimensionsConsidered: {
          adopted: { incidentType: "未妥投" },
          missing: [],
        },
        confidence: "high",
        suggestedNextStep: "route_to_tracking_inquiry",
        scenarioApplicability: "inapplicable",
      },
      analysis: "当前订单的结构化轨迹没有妥投扫描（Dscan），因此不适用“妥投未收到”赔付条款，也不应按该场景计算申请窗口。请先按实际轨迹异常发起尾程查件；如已有上网轨迹但超时、停滞或派送异常，查件类型应选择“超时未妥投”。",
    };
  } else {
    analysisResult.structured = {
      ...(analysisResult.structured ?? {}),
      scenarioApplicability:
        scenarioApplicability === "applicable" ? "applicable" : "not_checked",
    };
  }
  const inputContext = params.inputContext as RefundInputContext | undefined;
  const summary = analysisResult.analysis?.slice(0, 200) || "赔付条款解读完成";
  const outputContext = buildOutputContext(summary, inputContext?.chainId);

  return {
    structured: analysisResult.structured ?? {},
    analysis: analysisResult.analysis ?? "",
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
