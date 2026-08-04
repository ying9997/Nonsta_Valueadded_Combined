/**
 * 节点：format-output — 归一化 LLM 的 analysisResult，生成 result / outputContext
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】analysisResult（object|string）、inputContext（可选）、enrichedContext（确定性事实）
 * 【输出】result: { structured, analysis }；outputContext: expertId tracking-stale
 */

const BRANCHES = new Set([
  "need_info",
  "recognized_exception",
  "terminal_delivered_not_stale",
  "handoff_no_ascan",
  "mixed_scan_state",
  "ascan_stale_within_3_days",
  "below_claim_threshold",
  "no_claim_service",
  "domestic_claim_recommended",
  "international_wait_recommended",
  "stale_over_10_days",
  "claim_handoff",
  "need_human",
]);

interface StaleStructured {
  branch?: string;
  trackingIds?: string[];
  outboundOrderNos?: string[];
  suggestedNextExperts?: string[];
  missingFacts?: string[];
  scanStates?: Array<{ trackingNo: string; state: string }>;
}

interface StaleAnalysisResult {
  structured?: StaleStructured;
  analysis?: string;
}

interface StaleInputContext {
  chainId?: string;
}

interface StaleSemanticFacts {
  calcStatus?: string;
  computedNoUpdateDays?: number;
  isOver3Days?: boolean;
  isOver10Days?: boolean;
  isDelivered?: boolean;
  isPlatformWaybill?: boolean;
  scanStateSummary?: string;
  scanStates?: Array<{ trackingNo: string; state: string }>;
}

function coerceAnalysisResult(raw: unknown): { structured: StaleStructured; analysis: string } {
  if (raw == null) {
    return {
      structured: { branch: "need_human", trackingIds: [], outboundOrderNos: [], suggestedNextExperts: [], missingFacts: [] },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as StaleAnalysisResult;
      if (parsed && typeof parsed === "object" && ("structured" in parsed || "analysis" in parsed)) {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      // fall through
    }
    return {
      structured: { branch: "need_human", trackingIds: [], outboundOrderNos: [], suggestedNextExperts: [], missingFacts: [] },
      analysis: s || "解析失败，请人工查看原始模型输出。",
    };
  }

  const o = raw as StaleAnalysisResult;
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

function addMissingFact(items: string[], fact: string): string[] {
  return items.includes(fact) ? items : [...items, fact];
}

function enforceSemanticBranch(
  result: { structured: StaleStructured; analysis: string },
  enrichedRaw: unknown
): { structured: StaleStructured; analysis: string } {
  const ec =
    enrichedRaw && typeof enrichedRaw === "object" && !Array.isArray(enrichedRaw)
      ? (enrichedRaw as Record<string, unknown>)
      : {};
  const staleFacts =
    ec.staleFacts && typeof ec.staleFacts === "object" && !Array.isArray(ec.staleFacts)
      ? (ec.staleFacts as StaleSemanticFacts)
      : {};
  const base: StaleStructured = {
    trackingIds:
      result.structured.trackingIds?.length
        ? result.structured.trackingIds
        : Array.isArray(ec.trackingIds)
          ? ec.trackingIds.map(String)
          : [],
    outboundOrderNos:
      result.structured.outboundOrderNos?.length
        ? result.structured.outboundOrderNos
        : Array.isArray(ec.outboundOrderNos)
          ? ec.outboundOrderNos.map(String)
          : [],
    suggestedNextExperts: result.structured.suggestedNextExperts ?? [],
    missingFacts: result.structured.missingFacts ?? [],
    scanStates: Array.isArray(staleFacts.scanStates) ? staleFacts.scanStates : [],
  };
  const branchResult = (
    branch: string,
    analysis: string,
    extra?: Partial<StaleStructured>
  ): { structured: StaleStructured; analysis: string } => ({
    structured: { ...base, ...extra, branch },
    analysis,
  });

  if (result.structured.branch === "recognized_exception") return result;
  if (!ec.staleFacts || staleFacts.calcStatus !== "ok") {
    return branchResult("need_human", "缺少可验证的停更时间事实，暂不能判断索赔处理路径。", {
      missingFacts: addMissingFact(base.missingFacts ?? [], "staleFacts"),
      suggestedNextExperts: [],
    });
  }
  if (staleFacts.isDelivered === true || staleFacts.scanStateSummary === "all_delivered") {
    return branchResult("terminal_delivered_not_stale", "轨迹事实显示包裹已妥投，不适用运输中长时间停更处理。", {
      suggestedNextExperts: [],
    });
  }
  const isPlatformWaybill = ec.isPlatformWaybill === true || staleFacts.isPlatformWaybill === true;
  if (isPlatformWaybill) {
    return branchResult("no_claim_service", "该订单已确认属于3PL平台面单，不支持万邑通侧尾程索赔；如需定位包裹可提交查件。", {
      suggestedNextExperts: [],
    });
  }
  if (staleFacts.scanStateSummary === "all_no_ascan") {
    return branchResult(
      "handoff_no_ascan",
      "承运商轨迹未检测到 Ascan，属于尾程无上网场景，不应按已有 Ascan 后停滞判断渠道索赔；请转无上网流程核实查件及标准赔付条件。",
      { suggestedNextExperts: ["tracking-no-scan"], missingFacts: [] }
    );
  }
  if (staleFacts.scanStateSummary === "mixed") {
    return branchResult(
      "mixed_scan_state",
      "同批运单的扫描状态不一致：部分已有承运商扫描，部分仍无 Ascan。请按 scanStates 拆票处理，无 Ascan 运单转无上网流程。",
      {
        suggestedNextExperts: ["tracking-no-scan"],
        missingFacts: addMissingFact(base.missingFacts ?? [], "splitByTrackingScanState"),
      }
    );
  }
  if (staleFacts.isOver3Days === true && staleFacts.isOver10Days === false) {
    return branchResult("ascan_stale_within_3_days", "轨迹已停更超过3天但尚未超过10天，建议先提交查件并继续观察物流动态。", {
      suggestedNextExperts: [],
    });
  }
  if (staleFacts.isOver10Days === false) {
    return branchResult("below_claim_threshold", "当前停更时长尚未超过10天，建议继续观察物流动态。", {
      suggestedNextExperts: [],
    });
  }

  const hasClaimService = typeof ec.hasClaimService === "boolean" ? ec.hasClaimService : undefined;
  if (hasClaimService === undefined) {
    return branchResult("need_human", "当前缺少该渠道是否支持索赔的权威事实，不能据此断言无索赔服务，请人工核实。", {
      missingFacts: addMissingFact(base.missingFacts ?? [], "hasClaimService"),
      suggestedNextExperts: [],
    });
  }
  if (hasClaimService === false) {
    return branchResult("no_claim_service", "当前事实已明确该渠道无索赔服务，建议提交查件定位包裹，并与买家协商后续方案。", {
      suggestedNextExperts: [],
    });
  }
  if (ec.claimWindowStatus === "out_of_window") {
    return branchResult("stale_over_10_days", "该渠道支持丢失类索赔，但当前事实显示已超过提交窗口；建议先查件并人工核实时效。", {
      suggestedNextExperts: [],
    });
  }
  const days = staleFacts.computedNoUpdateDays;
  const dayText = typeof days === "number" ? `已停更${days}天，` : "";
  if (typeof ec.claimWindowStatus !== "string") {
    return branchResult(
      ec.isDomestic === false ? "international_wait_recommended" : "domestic_claim_recommended",
      `${dayText}该渠道支持丢失类索赔，但当前缺少索赔窗口事实；建议先查件并人工核实是否仍在提交时效内。`,
      {
        suggestedNextExperts: [],
        missingFacts: addMissingFact(base.missingFacts ?? [], "claimWindowStatus"),
      }
    );
  }
  if (ec.isDomestic === false) {
    return branchResult(
      "international_wait_recommended",
      `${dayText}该渠道支持索赔；国际运输仍可能受清关或转运影响，建议先查件并同步核实索赔窗口。`,
      { suggestedNextExperts: ["substitute-claim"], missingFacts: [] }
    );
  }
  return branchResult(
    "domestic_claim_recommended",
    `${dayText}该渠道支持丢失类代客索赔，建议立即提交查件并尽快发起索赔，避免超过时效。`,
    { suggestedNextExperts: ["substitute-claim"], missingFacts: [] }
  );
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const guarded = enforceSemanticBranch(coerced, params.enrichedContext);
  const inputContext = params.inputContext as StaleInputContext | undefined;
  const summary = guarded.analysis.slice(0, 200) || "轨迹停滞分析完成";

  return {
    structured: guarded.structured,
    analysis: guarded.analysis,
    outputContext: {
      expertId: "tracking-stale",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "",
    },
    enrichedContext: {
      scanRouting:
        params.enrichedContext && typeof params.enrichedContext === "object" && !Array.isArray(params.enrichedContext)
          ? (params.enrichedContext as Record<string, unknown>).staleFacts
          : undefined,
      claimDecision: {
        hasClaimService:
          params.enrichedContext && typeof params.enrichedContext === "object" && !Array.isArray(params.enrichedContext)
            ? (params.enrichedContext as Record<string, unknown>).hasClaimService
            : undefined,
        claimFactSource:
          params.enrichedContext && typeof params.enrichedContext === "object" && !Array.isArray(params.enrichedContext)
            ? (params.enrichedContext as Record<string, unknown>).claimFactSource
            : undefined,
      },
    },
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
