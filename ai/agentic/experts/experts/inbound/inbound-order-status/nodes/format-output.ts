/**
 * 节点：format-output — 归一化 LLM 输出
 */

interface AnalysisResult {
  structured?: Record<string, unknown>;
  analysis?: string;
}

interface InputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

interface EvidenceEnvelope {
  primary?: Record<string, unknown> | null;
  orders?: unknown[];
}

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function buildEvidenceSummary(evidence: EvidenceEnvelope): string {
  const primary = evidence.primary;
  if (!primary) return "入库单状态解读完成";
  const latest = primary.latestActualMilestone as Record<string, unknown> | null | undefined;
  const parts = [
    `orderNo=${str(primary.orderNo) || "unknown"}`,
    `status=${str(primary.currentStatus) || "unknown"}`,
  ];
  if (latest) {
    const description = str(latest.description) || str(latest.code);
    const time = str(latest.time);
    if (description || time) parts.push(`latestOmsMilestone=${description || "unknown"}@${time || "unknown"}`);
  }
  parts.push("arrivalPortVerified=false");
  parts.push("exceptionVerification=not_checked_by_inbound_order_status");
  parts.push("canClaimNoException=false");
  const expectedSendwarehouseTime = str(primary.expectedSendwarehouseTime);
  parts.push(
    expectedSendwarehouseTime
      ? `expectedSendwarehouseTime=${expectedSendwarehouseTime}; timeSemantics=system_estimate_not_actual`
      : "expectedSendwarehouseTime=not_returned",
  );
  const forecastWarehouseTime = str(primary.forecastWarehouseTime);
  if (forecastWarehouseTime) {
    parts.push(`forecastWarehouseTime=${forecastWarehouseTime}; timeSemantics=system_forecast_not_actual`);
  }
  const actualWarehouseArrivalTime = str(primary.actualWarehouseArrivalTime);
  if (actualWarehouseArrivalTime) parts.push(`actualWarehouseArrivalTime=${actualWarehouseArrivalTime}`);
  const actualShelveTime = str(primary.actualShelveTime);
  if (actualShelveTime) parts.push(`actualShelveTime=${actualShelveTime}`);
  if (primary.requiresManualTransitVerification === true) {
    parts.push("requiresManualTransitVerification=true");
  }
  return parts.join("; ").slice(0, 500);
}

function hasUnsupportedNoExceptionClaim(analysis: string): boolean {
  const affirmative = /(?:无异常(?:情况)?|没有异常|不存在异常|no abnormalities|no abnormality|no exceptions?)/i;
  const qualified = /(?:不能|无法|不可|尚未|未核实|未查询|不能确认|无法确认|not verified|not checked|cannot confirm|unable to confirm)/i;
  return affirmative.test(analysis) && !qualified.test(analysis);
}

function evidenceBoundaryNote(primary: Record<string, unknown>, useChinese: boolean): string {
  const expectedSendwarehouseTime = str(primary.expectedSendwarehouseTime);
  const forecastWarehouseTime = str(primary.forecastWarehouseTime);
  const actualWarehouseArrivalTime = str(primary.actualWarehouseArrivalTime);
  const actualShelveTime = str(primary.actualShelveTime);
  const estimatedShelveTimeLocal = str(primary.estimatedShelveTimeLocal);
  const estimatedShelveTime = str(primary.estimatedShelveTime);
  const goalShelveDate = str(primary.goalShelveDate);
  if (useChinese) {
    const facts: string[] = [];
    if (actualWarehouseArrivalTime) facts.push(`系统记录的实际到仓时间：${actualWarehouseArrivalTime}`);
    if (actualShelveTime) facts.push(`系统记录的实际上架时间：${actualShelveTime}`);
    if (!actualWarehouseArrivalTime && expectedSendwarehouseTime) {
      facts.push(`系统预计送仓时间：${expectedSendwarehouseTime}`);
    }
    if (!actualWarehouseArrivalTime && forecastWarehouseTime) {
      facts.push(`系统预计到仓时间：${forecastWarehouseTime}`);
    }
    if (!actualShelveTime && estimatedShelveTimeLocal) {
      facts.push(`当地预计上架时间：${estimatedShelveTimeLocal}`);
    } else if (!actualShelveTime && estimatedShelveTime) {
      facts.push(`系统预计上架时间：${estimatedShelveTime}`);
    } else if (!actualShelveTime && goalShelveDate) {
      facts.push(`系统预计上架时间：${goalShelveDate}`);
    }
    if (facts.length === 0) facts.push("本次查询未返回可用的订单级预计或实际时间");
    const arrivalBoundary = actualWarehouseArrivalTime
      ? "系统已有实际到仓记录。"
      : "当前结果未核实实际到港或到仓。";
    return `${arrivalBoundary}当前专家未查询头程异常，不能据此判断无异常。${facts.join("；")}。预计和目标时间仅供参考，不代表实际结果或履约承诺。`;
  }
  const facts: string[] = [];
  if (actualWarehouseArrivalTime) facts.push(`actual warehouse arrival: ${actualWarehouseArrivalTime}`);
  if (actualShelveTime) facts.push(`actual shelving: ${actualShelveTime}`);
  if (!actualWarehouseArrivalTime && expectedSendwarehouseTime) {
    facts.push(`estimated send-to-warehouse time: ${expectedSendwarehouseTime}`);
  }
  if (!actualWarehouseArrivalTime && forecastWarehouseTime) {
    facts.push(`forecast warehouse arrival: ${forecastWarehouseTime}`);
  }
  if (!actualShelveTime && estimatedShelveTimeLocal) {
    facts.push(`local estimated shelving time: ${estimatedShelveTimeLocal}`);
  } else if (!actualShelveTime && estimatedShelveTime) {
    facts.push(`estimated shelving time: ${estimatedShelveTime}`);
  } else if (!actualShelveTime && goalShelveDate) {
    facts.push(`estimated shelving time: ${goalShelveDate}`);
  }
  if (facts.length === 0) facts.push("no usable order-level estimated or actual time was returned");
  const arrivalBoundary = actualWarehouseArrivalTime
    ? "The system contains an actual warehouse-arrival record. "
    : "Actual port or warehouse arrival has not been verified. ";
  return `${arrivalBoundary}This expert does not check first-leg exceptions, so it cannot establish that no exception exists. ${facts.join("; ")}. Estimated and target times are for reference only and are not actual results or commitments.`;
}

function buildSafeFallback(primary: Record<string, unknown>, useChinese: boolean): string {
  const latest = primary.latestActualMilestone as Record<string, unknown> | null | undefined;
  const orderNo = str(primary.orderNo);
  const status = str(primary.currentStatus);
  const milestone = latest ? str(latest.description) || str(latest.code) : "";
  const milestoneTime = latest ? str(latest.time) : "";
  const milestoneLocation = latest ? str(latest.location) : "";
  if (useChinese) {
    const actual = milestone || milestoneTime
      ? `最新可查轨迹：${milestoneTime || "时间未返回"}${milestoneLocation ? `，地点 ${milestoneLocation}` : ""}${milestone ? `，状态「${milestone}」` : ""}。`
      : "当前未查询到可用的轨迹节点。";
    const statusText = status === "TS" ? "已发运/在途（TS）" : status || "未知";
    return `入库单${orderNo ? ` ${orderNo}` : ""} 当前状态为${statusText}。${actual}${evidenceBoundaryNote(primary, true)}`;
  }
  const actual = milestone || milestoneTime
    ? `The latest available milestone is ${milestoneTime || "time unavailable"}${milestoneLocation ? ` at ${milestoneLocation}` : ""}${milestone ? ` (${milestone})` : ""}. `
    : "No usable tracking milestone was returned. ";
  return `Inbound order${orderNo ? ` ${orderNo}` : ""} is currently ${status || "unknown"}. ${actual}${evidenceBoundaryNote(primary, false)}`;
}

function enforceEvidenceBoundary(analysis: string, primary: Record<string, unknown> | null): string {
  if (!primary) return analysis;
  const useChinese = /[\u3400-\u9fff]/.test(analysis);
  // TS 头程未到仓属于高风险证据缺口：直接使用确定性摘要，避免模型先承诺目标日期、再追加免责声明。
  if (primary.requiresManualTransitVerification === true) {
    return buildSafeFallback(primary, useChinese || !analysis);
  }
  if (hasUnsupportedNoExceptionClaim(analysis)) {
    return buildSafeFallback(primary, useChinese || !analysis);
  }
  return analysis;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const analysisResult = (params.analysisResult ?? {}) as AnalysisResult;
  const inputContext = params.inputContext as InputContext | undefined;
  const evidence = (params.orderStatusEvidence ?? {}) as EvidenceEnvelope;
  const primaryEvidence = evidence.primary ?? null;
  const llmStructured = analysisResult.structured ?? {};
  const structured = primaryEvidence
    ? {
        ...llmStructured,
        ...primaryEvidence,
        status: str(primaryEvidence.currentStatus) || llmStructured.status,
        orderStatusEvidence: evidence,
      }
    : llmStructured;
  const summary = buildEvidenceSummary(evidence);
  const analysis = enforceEvidenceBoundary(analysisResult.analysis ?? "", primaryEvidence);

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "inbound-order-status",
      resultSummary: summary,
      chainId: inputContext?.chainId ?? "",
    },
    enrichedContext: {
      orderStatusEvidence: evidence,
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
