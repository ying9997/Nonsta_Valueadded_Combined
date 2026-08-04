/**
 * 节点：format-output — 归一化增值单状态输出。
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。
 */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hasSubmittedFieldOrFileFacts(atomProgress: unknown): boolean {
  return asArray(atomProgress).some((atom) => {
    const record = asRecord(atom);
    return asArray(record.vaAtomAttrs).length > 0 || asArray(record.vaAtomFiles).length > 0;
  });
}

function isCompletedStatus(status: unknown, statusDesc: unknown): boolean {
  const normalizedStatus = asText(status).toUpperCase();
  const normalizedDesc = asText(statusDesc);
  return normalizedStatus === "COMPLETED" || normalizedStatus === "DONE" || normalizedDesc.includes("已完成");
}

function appendTimeFacts(analysis: string, structured: Record<string, unknown>): string {
  let text = analysis.trim();
  const actualCompleteTime = asText(structured.actualCompleteTime);
  if (isCompletedStatus(structured.status, structured.statusDesc)) {
    if (actualCompleteTime) {
      return text.includes(actualCompleteTime)
        ? text
        : `${text} 实际完成时间为 ${actualCompleteTime}。`.trim();
    }
    const atomTimes = Array.from(
      new Set(
        asArray(structured.atomProgress)
          .map((item) => asText(asRecord(item).completeTime))
          .filter(Boolean)
      )
    );
    if (atomTimes.length > 0 && !atomTimes.some((time) => text.includes(time))) {
      const visibleTimes = atomTimes.slice(0, 3).join("、");
      const suffix = atomTimes.length > 3 ? `等 ${atomTimes.length} 个时间` : "";
      text = `${text} 关联原子服务处理时间为 ${visibleTimes}${suffix}。`;
    }
    return text.trim();
  }

  const estimateCompleteTimeLocal = asText(structured.estimateCompleteTimeLocal);
  const estimateCompleteTime = asText(structured.estimateCompleteTime);
  const estimate = estimateCompleteTimeLocal || estimateCompleteTime;
  if (!estimate || text.includes(estimate)) return text;
  const label = estimateCompleteTimeLocal
    ? "系统预计当地完成时间"
    : "系统预计完成时间";
  return `${text} ${label}为 ${estimate}，该时间不是 SLA 承诺，实际以仓库处理进度为准。`.trim();
}

function removeCompletedWaitConflict(analysis: string, structured: Record<string, unknown>): string {
  if (!isCompletedStatus(structured.status, structured.statusDesc)) return analysis;
  let text = analysis
    .replace(/下一步无需客户动作，?继续等待处理。?/g, "下一步无需客户动作。")
    .replace(/下一步无需客户动作，?继续等待即可。?/g, "下一步无需客户动作。")
    .replace(/下一步无需客户动作，?客户可继续等待。?/g, "下一步无需客户动作。")
    .replace(/下一步无需客户动作，?可继续等待。?/g, "下一步无需客户动作。")
    .replace(/下一步无需客户进行操作，?等待即可。?/g, "下一步无需客户进行操作。")
    .replace(/当前未见客户动作要求，?继续等待处理。?/g, "当前未见客户动作要求。")
    .replace(/当前未见客户动作要求，?客户可继续等待。?/g, "当前未见客户动作要求。")
    .replace(/当前未见客户动作要求，?可继续等待。?/g, "当前未见客户动作要求。")
    .replace(/继续等待处理。?/g, "")
    .replace(/继续等待即可。?/g, "")
    .replace(/客户可继续等待。?/g, "")
    .replace(/可继续等待。?/g, "")
    .replace(/可正常等待后续流程。?/g, "")
    .replace(/正常等待后续流程。?/g, "")
    .replace(/等待后续流程。?/g, "")
    .replace(/等待即可。?/g, "")
    .replace(/，即可。?/g, "。");
  if (!text.includes("已完成") && asText(structured.statusDesc)) {
    text = `${text} 当前增值单状态为${asText(structured.statusDesc)}。`;
  }
  return text.trim();
}

function buildBusinessNoApiFailureAnalysis(structured: Record<string, unknown>): string {
  const businessNo = asText(structured.businessNo);
  if (!businessNo || asText(structured.outputPath) !== "api_failed") return "";
  return `暂时无法通过业务单号 ${businessNo} 取得增值单接口事实，可能是接口失败或未能稳定定位。建议稍后重试，或补充增值单号后再查；如仍失败请转人工核实。`;
}

function buildStandardOnlyPaymentNote(paymentSummary: Record<string, unknown>): string {
  if (asText(paymentSummary.amountEvidenceType) !== "standard_amount") return "";
  const amount = paymentSummary.totalStandardAmount;
  const amountText = amount !== undefined && amount !== null && amount !== "" ? `接口返回的标准费用/计费项金额为 ${String(amount)}` : "接口返回的是标准费用/计费项金额";
  return `${amountText}；当前接口未返回实际实收合计，不能把该金额直接表述为最终实际扣费。`;
}

function alignPaymentAnalysis(analysis: string, structured: Record<string, unknown>): string {
  const paymentSummary = asRecord(structured.paymentSummary);
  const note = buildStandardOnlyPaymentNote(paymentSummary);
  if (!note) return analysis;
  const withoutOverclaimSentences = analysis.replace(/[^。！？]*(?:事后实际费用|实际费用如下|实际收取费用)[^。！？]*[。！？]?/g, "");
  const cleaned = withoutOverclaimSentences
    .replace(/事后实际费用摘要显示，?/g, "接口返回的费用摘要显示，")
    .replace(/增值单实际费用如下[:：]?/g, "接口返回的标准费用/计费项金额如下：")
    .replace(/实际费用如下[:：]?/g, "标准费用/计费项金额如下：")
    .replace(/实际收取费用如下[:：]?/g, "标准费用/计费项金额如下：")
    .trim();
  return cleaned.includes("未返回实际实收合计") ? cleaned : `${cleaned} ${note}`;
}

function coerceAnalysisResult(raw: unknown): { structured: Record<string, unknown>; analysis: string } {
  if (typeof raw === "string") {
    try {
      return coerceAnalysisResult(JSON.parse(raw));
    } catch {
      return { structured: {}, analysis: raw };
    }
  }
  const obj = asRecord(raw);
  return {
    structured: asRecord(obj.structured),
    analysis: asText(obj.analysis),
  };
}

async function main({ params }: { params: Record<string, unknown> }) {
  const statusFacts = asRecord(params.statusFacts);
  const result = coerceAnalysisResult(params.analysisResult);
  const outputPath = asText(statusFacts.outputPath);
  const structured = {
    outputPath,
    orderNo: statusFacts.orderNo || "",
    vasOrderNo: statusFacts.orderNo || "",
    businessNo: statusFacts.businessNo || "",
    status: statusFacts.status || "",
    statusDesc: statusFacts.statusDesc || "",
    orderDate: statusFacts.orderDate || "",
    estimateCompleteTime: statusFacts.estimateCompleteTime || "",
    estimateCompleteTimeLocal: statusFacts.estimateCompleteTimeLocal || "",
    actualCompleteTime: statusFacts.actualCompleteTime || "",
    cancelReason: statusFacts.cancelReason || "",
    failReason: statusFacts.failReason || "",
    supportCancel: statusFacts.supportCancel || "",
    businessOrder: statusFacts.businessOrder ?? {},
    warehouse: statusFacts.warehouse ?? {},
    vasc: statusFacts.vasc ?? {},
    control: statusFacts.control ?? {},
    vascCode: statusFacts.vascCode || "",
    vascName: statusFacts.vascName || "",
    atomProgress: statusFacts.atomProgress || [],
    paymentSummary: statusFacts.paymentSummary ?? null,
    prepaymentSummary: statusFacts.prepaymentSummary ?? null,
    goodsSummary: statusFacts.goodsSummary ?? null,
    optionalFetchFailures: statusFacts.optionalFetchFailures || [],
    missingEvidence: statusFacts.missingEvidence || [],
    needsClarification: Boolean(statusFacts.needsClarification),
    clarificationFields: statusFacts.clarificationFields || [],
    nextAction:
      outputPath === "clarify_vas_order_no" || outputPath === "missing_vas_order_no"
        ? statusFacts.validationMessage
        : outputPath === "status_found_partial"
          ? "已取得增值单主状态，但原子执行进度暂未完整取得；请稍后重试或转人工核实原子明细。"
          : outputPath === "not_found"
            ? "未查询到该增值单，请核对增值单号或补充业务单号。"
        : outputPath === "pre_quote_not_supported"
          ? "未下单前报价不属于增值单状态查询范围；请在已有增值单后查询费用事实。"
        : outputPath === "api_failed"
          ? "当前无法取得增值单接口事实，请稍后重试或转人工核实。"
          : isCompletedStatus(statusFacts.status, statusFacts.statusDesc)
            ? "无需继续等待或额外操作。"
          : "根据接口事实说明当前增值单状态。",
  };
  const baseAnalysis =
    result.analysis ||
    (outputPath === "pre_quote_not_supported"
      ? "未下单前报价不属于增值单状态查询范围；本专家只解释已提交或已有增值单的状态、原子进度和费用事实，不能虚构事前估价。"
      : outputPath === "clarify_vas_order_no" || outputPath === "missing_vas_order_no"
      ? asText(statusFacts.validationMessage)
      : "已整理增值单主状态和原子执行事实；未知状态以接口 statusDesc 为准。");
  const historyBoundary = hasSubmittedFieldOrFileFacts(structured.atomProgress)
    ? " 历史订单中的 vaAtomAttrs/vaAtomFiles 只能说明这张已提交增值单当时填写的字段和附件，不能直接当作下一次下单的完整模板。"
    : "";
  const deterministicApiFailureAnalysis = buildBusinessNoApiFailureAnalysis(structured);
  const withHistoryBoundary = `${deterministicApiFailureAnalysis || baseAnalysis}${(deterministicApiFailureAnalysis || baseAnalysis).includes("vaAtomAttrs") || (deterministicApiFailureAnalysis || baseAnalysis).includes("vaAtomFiles") ? "" : historyBoundary}`;
  const analysis = appendTimeFacts(
    alignPaymentAnalysis(removeCompletedWaitConflict(withHistoryBoundary, structured), structured),
    structured
  );
  const inputContext = asRecord(params.inputContext);
  const chainId = asText(inputContext.chainId);

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "value-add-order-status",
      resultSummary: analysis.slice(0, 200),
      chainId,
    },
    enrichedContext: {
      valueAddOrderStatus: structured,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : "format-output failed");
      process.exit(1);
    });
}
