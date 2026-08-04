/**
 * 节点：format-output — 归一化 LLM 的 analysisResult，生成 structured / analysis / outputContext / enrichedContext
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 workflow.json 中本节点 inputs/outputs 一致。
 *
 * 【输入】analysisResult（object|string）、inputContext（可选）、enrichedContext（可选，透传 fetch-and-enrich）
 * 【输出】structured, analysis, outputContext, enrichedContext
 */

const BRANCHES = new Set([
  "need_info",
  "bulk_no_tracking_online_service",
  "non_registered",
  "carrier_has_scan",
  "parcel_created_within_10_days",
  "platform_mixed_10_to_21_days",
  "platform_mixed_over_21_days",
  "manual_inquiry_split_weight",
  "heavy_or_reweigh_parcel",
  "standard_inquiry_and_ticket",
  "non_compliant_submission",
  "compliant_recorded",
  "special_inquiry_escalation",
  "ups_us_substitute_claim",
  "standard_claim_review",
  "claim_window_manual_review",
  "mixed_scan_state",
  "tracking_data_unverified",
  "need_human",
]);

interface TnsStructured {
  branch?: string;
  trackingIds?: string[];
  outboundOrderNos?: string[];
  suggestedNextExperts?: string[];
  missingFacts?: string[];
  scanStates?: Array<{ trackingNo: string; state: string }>;
}

interface TnsAnalysisResult {
  structured?: TnsStructured;
  analysis?: string;
}

interface TnsInputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

function coerceAnalysisResult(raw: unknown): { structured: TnsStructured; analysis: string } {
  if (raw == null) {
    return {
      structured: { branch: "need_human", trackingIds: [], outboundOrderNos: [], suggestedNextExperts: [], missingFacts: [] },
      analysis: "未收到模型输出。",
    };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as TnsAnalysisResult;
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
  const o = raw as TnsAnalysisResult;
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

function enforceCriticalBranch(
  result: { structured: TnsStructured; analysis: string },
  context: Record<string, unknown>
): { structured: TnsStructured; analysis: string } {
  const scanStates = Array.isArray(context.scanStates)
    ? context.scanStates.filter((item): item is { trackingNo: string; state: string } =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];
  const trackingIds = result.structured.trackingIds?.length
    ? result.structured.trackingIds
    : Array.isArray(context.trackingIds)
      ? context.trackingIds.map(String)
      : [];
  const outboundOrderNos = result.structured.outboundOrderNos?.length
    ? result.structured.outboundOrderNos
    : Array.isArray(context.outboundOrderNos)
      ? context.outboundOrderNos.map(String)
      : [];
  const base: TnsStructured = {
    ...result.structured,
    trackingIds,
    outboundOrderNos,
    scanStates,
  };
  const forced = (branch: string, analysis: string, extra?: Partial<TnsStructured>) => ({
    structured: { ...base, ...extra, branch },
    analysis,
  });

  if (context.inputValid === false) {
    return forced("need_info", "缺少可验证的运单、轨迹或无上网事实，请补充跟踪号或出库单号。", {
      suggestedNextExperts: [],
      missingFacts: ["trackingIdsOrTrajectoryFacts"],
    });
  }
  if (context.scanStateSummary === "unknown" && trackingIds.length > 0) {
    return forced(
      "tracking_data_unverified",
      "接口当前只返回仓库作业节点，未返回可确认的承运商轨迹，因此无法确认实际是否已经上网。",
      {
        suggestedNextExperts: [],
        missingFacts: ["freshCarrierTracking"],
      }
    );
  }
  if (context.scanStateSummary === "all_ascan" || context.scanStateSummary === "all_delivered") {
    return forced("carrier_has_scan", "轨迹已存在承运商扫描记录，不属于无 Ascan／无上网场景；如仍长期停滞，应按已有扫描后的轨迹停滞处理。", {
      suggestedNextExperts: ["tracking-stale"],
      missingFacts: [],
    });
  }
  if (context.scanStateSummary === "mixed") {
    return forced("mixed_scan_state", "同批运单中既有已扫描票，也有无 Ascan 票，请按 scanStates 拆票处理，避免用同一规则覆盖全部订单。", {
      suggestedNextExperts: ["tracking-stale"],
      missingFacts: ["splitByTrackingScanState"],
    });
  }
  if (context.scanStateSummary === "all_no_ascan") {
    const age = Number(context.noScanAgeDays);
    if (Number.isFinite(age) && age >= 11 && age <= 45) {
      return forced(
        "standard_claim_review",
        `承运商轨迹未出现 Ascan，距仓库最近作业事件约 ${Math.floor(age)} 天。该场景应进入 WINIT 标准赔付规则核验；是否最终适用仍须由 refund-standard 根据完整条件判断，不能仅凭无上网断言可赔。`,
        { suggestedNextExperts: ["refund-standard"], missingFacts: [] }
      );
    }
    if (Number.isFinite(age) && age > 45) {
      return forced(
        "claim_window_manual_review",
        `承运商轨迹未出现 Ascan，距仓库最近作业事件约 ${Math.floor(age)} 天，已超出现有摘要中的 45 天窗口；请转赔付规则人工核验，不能直接承诺受理或拒绝。`,
        { suggestedNextExperts: ["refund-standard"], missingFacts: ["authoritativeClaimWindowDecision"] }
      );
    }
  }
  return { structured: base, analysis: result.analysis };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const inputContext = params.inputContext as TnsInputContext | undefined;
  const enrichedContext =
    params.enrichedContext !== undefined &&
    params.enrichedContext !== null &&
    typeof params.enrichedContext === "object" &&
    !Array.isArray(params.enrichedContext)
      ? (params.enrichedContext as Record<string, unknown>)
      : {};
  const guarded = enforceCriticalBranch(coerced, enrichedContext);
  const summary = guarded.analysis.slice(0, 200) || "轨迹无上网分析完成";
  const outputContext = {
    expertId: "tracking-no-scan",
    resultSummary: summary,
    chainId: inputContext?.chainId ?? "",
  };
  return {
    structured: guarded.structured,
    analysis: guarded.analysis,
    outputContext,
    enrichedContext,
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
