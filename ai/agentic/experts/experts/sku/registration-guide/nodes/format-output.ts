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
  "guide_expedite",
  "guide_carriability",
  "guide_register",
  "guide_resubmit",
  "guide_direct_shipment",
  "guide_attribute_change",
  "guide_unban",
  "blocked_unpublished",
  "handoff_compliance",
  "handoff_inspection",
  "need_info",
  "need_human",
]);

const AUDIT_FACT_INTENTS = new Set(["audit_status", "expedite", "resubmit"]);

function defaultBranch(intentType: string): string {
  switch (intentType) {
    case "expedite":
    case "audit_status":
      return "guide_expedite";
    case "carriability":
      return "guide_carriability";
    case "resubmit":
      return "guide_resubmit";
    case "direct_shipment":
      return "guide_direct_shipment";
    case "attribute_change":
      return "guide_attribute_change";
    case "unban":
      return "guide_unban";
    case "blocked_inbound":
      return "blocked_unpublished";
    case "register":
    case "modify":
    case "inactive":
      return "guide_register";
    default:
      return "guide_register";
  }
}

function sanitizeUnexecutedHandoff(text: string): string {
  return text
    .replace(/(?:目前)?已为您转人工合规专席(?:进行)?处理/g, "该问题需要人工合规专席进一步确认")
    .replace(/(?:目前)?已为您转人工(?:客服)?(?:进行)?处理/g, "该问题需要人工客服进一步确认")
    .replace(/请您耐心等待后续回复/g, "请联系人工客服并提供相关商品信息");
}

async function main({ params }: { params: Record<string, unknown> }) {
  const needInfoHint = str(params.needInfoHint);
  const needHumanReason = str(params.needHumanReason);
  const intentType = str(params.intentType) || "general";
  const auditStatusHint = str(params.auditStatusHint);
  const auditFactStatus = str(params.auditFactStatus);
  const inputContext = asRecord(params.inputContext);
  const coerced = coerceAnalysisResult(params.analysisResult);
  const lacksRealtimeAuditFact = auditFactStatus === "not_found";
  const auditApiFailed = auditFactStatus === "error";
  const auditFactUnavailable = lacksRealtimeAuditFact || auditApiFailed;
  const isAuditFactIntent = AUDIT_FACT_INTENTS.has(intentType);
  const suppressUnrelatedAuditHint = auditFactUnavailable && !isAuditFactIntent;
  const visibleAuditStatusHint = suppressUnrelatedAuditHint ? "" : auditStatusHint;

  if (
    needInfoHint === "ambiguous_general" ||
    needInfoHint === "ambiguous_product_link_lookup" ||
    needInfoHint === "missing_compliance_context"
  ) {
    const analysis =
      needInfoHint === "ambiguous_product_link_lookup"
        ? "请确认你是想查找可用于商品注册的销售链接，还是想查看某个已注册商品当前维护的链接；如为后者请提供 SKU。"
        : needInfoHint === "missing_compliance_context"
          ? "证书要求取决于商品属性和进口国。请补充商品是否带电、液体、磁性等关键属性，以及进口国。"
          : "请说明你具体想了解商品注册的哪个问题，例如如何注册、审核进度、退回修改、商品修改或无法下入库单。";
    const sopSteps =
      needInfoHint === "missing_compliance_context"
        ? ["补充商品关键属性", "补充进口国"]
        : ["说明具体问题场景", "如涉及某个商品，再提供 SKU 与进口国"];
    const structured = {
      branch: "need_info",
      topicMatched: intentType,
      sopSteps,
      auditStatusHint: null,
      expediteEligible: false,
      rejectReason: null,
      prerequisites: [],
      missingInfo: [needInfoHint],
      expertRouting: null,
      confidence: "low",
    };
    return {
      structured,
      analysis,
      outputContext: {
        expertId: "sku/registration-guide",
        resultSummary: analysis.slice(0, 200),
        chainId: str(inputContext.chainId),
      },
      enrichedContext: { "sku/registration-guide": structured },
    };
  }

  if (needInfoHint === "need_human_unverified_operation") {
    const reasonMessages: Record<string, { analysis: string; firstStep: string }> = {
      batch_modify_existing: {
        analysis: "当前知识未确认批量修改现有商品的可用入口、权限和处理结果，请转人工客服核实。",
        firstStep: "保留需要批量修改的商品清单与字段",
      },
      transport_material_dispute: {
        analysis: "当前知识无法判断实际运输方式与资料要求之间的个案争议，请转人工客服核实。",
        firstStep: "保留运输方式、退回提示与已提交资料",
      },
      audit_withdrawal_or_deletion: {
        analysis: "当前知识未确认审核中的商品能否撤回或删除，请转人工客服核实。",
        firstStep: "保留当前商品编码与审核状态",
      },
    };
    const reasonMessage = reasonMessages[needHumanReason] ?? {
      analysis: "当前知识依据不足以确认该操作是否支持，请转人工客服核实。",
      firstStep: "保留当前商品与操作信息",
    };
    const boundaryMessage = reasonMessage.analysis;
    const analysis = visibleAuditStatusHint
      ? `${visibleAuditStatusHint}\n${boundaryMessage}`
      : boundaryMessage;
    const structured = {
      branch: "need_human",
      topicMatched: intentType,
      sopSteps: [reasonMessage.firstStep, "联系人工客服核实可执行操作"],
      auditStatusHint: visibleAuditStatusHint || null,
      expediteEligible: false,
      rejectReason: null,
      prerequisites: [],
      missingInfo: ["need_human_unverified_operation"],
      expertRouting: null,
      confidence: "low",
    };
    return {
      structured,
      analysis,
      outputContext: {
        expertId: "sku/registration-guide",
        resultSummary: analysis.slice(0, 200),
        chainId: str(inputContext.chainId),
      },
      enrichedContext: { "sku/registration-guide": structured },
    };
  }

  if (needInfoHint === "missing_topic_or_intent") {
    const analysis = "请补充咨询主题（例如：注册加急、新品能否发货、退回怎么改），或提供商品编码。";
    const structured = {
      branch: "need_info",
      topicMatched: "",
      sopSteps: ["说明具体问题或意图", "如有 SKU / 进口国 / 商品链接请一并提供"],
      auditStatusHint: null,
      expediteEligible: false,
      rejectReason: null,
      prerequisites: [],
      missingInfo: ["topic_or_intentType"],
      expertRouting: null,
      confidence: "low",
    };
    return {
      structured,
      analysis,
      outputContext: {
        expertId: "sku/registration-guide",
        resultSummary: analysis.slice(0, 200),
        chainId: str(inputContext.chainId),
      },
      enrichedContext: { "sku/registration-guide": structured },
    };
  }

  if (isAuditFactIntent && auditFactUnavailable) {
    const analysis = auditApiFailed
      ? `${auditStatusHint}\n当前无法通过系统确认该商品的实时审核状态、完成时间或退回原因。请稍后重试，仍失败时联系人工客服核实。`
      : `${auditStatusHint}\n无法确认该商品的实时审核状态、完成时间或退回原因。请先在万邑联「商品维护任务」中查看，仍无法确认时联系人工客服核实。`;
    const sopSteps = auditApiFailed
      ? ["稍后重新查询实时审核状态", "仍失败时联系人工客服核实"]
      : ["在万邑联「商品维护任务」中查看当前审核事实", "仍无法确认时联系人工客服核实"];
    const structured = {
      branch: "need_human",
      topicMatched: intentType,
      sopSteps,
      auditStatusHint,
      expediteEligible: false,
      rejectReason: null,
      prerequisites: [],
      missingInfo: [auditApiFailed ? "realtime_audit_api" : "realtime_audit_fact"],
      expertRouting: null,
      confidence: "low",
    };
    return {
      structured,
      analysis,
      outputContext: {
        expertId: "sku/registration-guide",
        resultSummary: analysis.slice(0, 200),
        chainId: str(inputContext.chainId),
      },
      enrichedContext: { "sku/registration-guide": structured },
    };
  }

  const structuredIn = asRecord(coerced.structured);
  let branch = str(structuredIn.branch) || defaultBranch(intentType);
  if (!VALID_BRANCHES.has(branch)) branch = defaultBranch(intentType);
  if (needInfoHint === "prefer_sku_code" || needInfoHint === "prefer_product_link_or_sku") {
    // keep LLM branch but ensure missingInfo surfaces
  }

  let sopSteps = Array.isArray(structuredIn.sopSteps)
    ? structuredIn.sopSteps.map((s) => String(s))
    : [];
  let missingInfo = Array.isArray(structuredIn.missingInfo)
    ? structuredIn.missingInfo.map((s) => String(s))
    : [];
  if (needInfoHint && !missingInfo.includes(needInfoHint)) missingInfo.push(needInfoHint);

  let analysis = coerced.analysis || "已根据商品注册知识库整理操作指引。";
  if (intentType === "resubmit" && !auditFactStatus && (branch === "need_info" || sopSteps.length === 0)) {
    branch = "guide_resubmit";
    sopSteps = [
      "进入万邑联商品信息并打开对应商品详情，查看页面顶部的退回提示",
      "按退回原因修改对应字段并保存",
      "确认修改完成后重新提交审核",
    ];
    missingInfo = missingInfo.filter((item) => item !== "prefer_sku_code" && item !== "SKU编码");
    analysis =
      "如果您已按退回提示完成修改，可进入万邑联商品信息打开对应商品详情，确认退回原因涉及的字段已修正并保存，然后重新提交审核。SKU 仅用于进一步查询具体退回原因，不影响先提供通用重提步骤。";
  }

  if (branch === "handoff_compliance" || branch === "handoff_inspection" || branch === "need_human") {
    analysis = sanitizeUnexecutedHandoff(analysis);
    sopSteps = sopSteps.map(sanitizeUnexecutedHandoff);
  }

  const structured = {
    branch,
    topicMatched: str(structuredIn.topicMatched) || intentType,
    sopSteps,
    auditStatusHint: suppressUnrelatedAuditHint
      ? null
      : str(structuredIn.auditStatusHint) || visibleAuditStatusHint || null,
    expediteEligible: structuredIn.expediteEligible === true || branch === "guide_expedite",
    rejectReason: structuredIn.rejectReason ?? null,
    prerequisites: Array.isArray(structuredIn.prerequisites)
      ? structuredIn.prerequisites.map((s) => String(s))
      : [],
    missingInfo,
    expertRouting: structuredIn.expertRouting ?? null,
    confidence: str(structuredIn.confidence) || (missingInfo.length ? "medium" : "high"),
  };

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "sku/registration-guide",
      resultSummary: analysis.slice(0, 200),
      chainId: str(inputContext.chainId),
    },
    enrichedContext: { "sku/registration-guide": structured },
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
