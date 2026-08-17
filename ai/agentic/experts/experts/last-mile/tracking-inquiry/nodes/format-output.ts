/**
 * 节点：format-output — 合并 LLM 输出与 **fetch-tail-trace-list** 的确定性事实
 */

interface TailTraceRecord {
  serialNumber?: string;
  orderNo?: string;
  trackingNo?: string;
  shippingNo?: string;
  checkingStatus?: string;
  checkingType?: string;
  applicationTime?: number | string;
  acceptTime?: number | string;
  checkingResults?: number | string;
  feedbackMsg?: string;
  returnReasons?: string;
}

interface TailTraceFacts {
  submissionGuidanceUrl?: string;
  listStatus?: string;
  queryKeys?: { inquiryIds: string[]; trackingIds: string[]; outboundOrderNos: string[] };
  querySent?: Record<string, unknown>;
  records?: TailTraceRecord[];
  primarySerialNumber?: string;
  primaryCheckingStatus?: string;
  primaryCheckingType?: string;
  sopBranch?: string;
  elapsedBizDays?: number | null;
  applicationTimeLocal?: string;
  analysisTimeLocal?: string;
  calendarSource?: string;
  slaBand?: string;
  canEscalateUrgent?: boolean | null;
  rawTopKeys?: string[];
  apiCode?: unknown;
  apiMsg?: string;
  notes?: string[];
}

interface TiStructured {
  serialNumbers?: string[];
  orderNos?: string[];
  trackingNos?: string[];
  shippingNos?: string[];
  primaryCheckingStatus?: string;
  primaryCheckingType?: string;
  sopBranch?: string;
  submissionGuidanceUrl?: string;
  records?: Array<Record<string, unknown>>;
  statusSummary?: Record<string, unknown>;
  queryKeys?: { inquiryIds?: string[]; trackingIds?: string[]; outboundOrderNos?: string[] };
  missingFacts?: string[];
  elapsedBizDays?: number | null;
  applicationTimeLocal?: string;
  analysisTimeLocal?: string;
  calendarSource?: string;
  slaBand?: string;
  canEscalateUrgent?: boolean | null;
  suggestedNextExperts?: string[];
  recommendedCheckingType?: string;
  recommendedCheckingTypeName?: string;
  classificationConfidence?: string;
  classificationReason?: string;
  [key: string]: unknown;
}

interface TiAnalysisResult {
  structured?: TiStructured;
  analysis?: string;
}

interface TiInputContext {
  chainId?: string;
  sourceExpertId?: string;
  previousOutput?: string | object;
}

function coerceAnalysisResult(raw: unknown): { structured: TiStructured; analysis: string } {
  if (raw == null) {
    return { structured: {}, analysis: "未收到模型输出。" };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as TiAnalysisResult;
      if (parsed && typeof parsed === "object") {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      return { structured: {}, analysis: s || "解析失败。" };
    }
    return { structured: {}, analysis: s };
  }

  const o = raw as TiAnalysisResult;
  const st = o.structured ?? {};
  const analysis = typeof o.analysis === "string" ? o.analysis : "（无 analysis 字段）";
  return { structured: typeof st === "object" && st !== null ? { ...st } : {}, analysis };
}

function asFacts(raw: unknown): TailTraceFacts {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as TailTraceFacts;
  }
  return {};
}

function deriveMissingFacts(facts: TailTraceFacts): string[] {
  const out: string[] = [];
  const st = facts.listStatus ?? "";

  if (st === "skipped_no_env") {
    out.push("未配置插件响应且无 Coze 代理环境变量，无法拉取查件列表");
  }
  if (st === "failed") {
    out.push(facts.apiMsg ? `OpenAPI 异常：${facts.apiMsg}` : "OpenAPI 调用失败");
  }
  if (st === "skipped_invalid_response") {
    out.push("接口返回形态未识别，缺少真实样例以精确映射列表字段");
  }

  return Array.from(new Set(out.filter(Boolean)));
}

function inferNextAction(facts: TailTraceFacts): string {
  const st = facts.listStatus ?? "";
  if (st === "success") return "结合查件状态与事实向客户说明进度；完成态解释结果摘要";
  if (st === "empty") return "当前查询条件下无查件记录，可引导至自助发起查件链接";
  if (st === "skipped_no_query") return "请客户提供查件流水号、出库单号或跟踪号之一以便查询，或说明自助发起入口";
  if (st === "skipped_no_env") return "在 Coze 中接入万邑通 OpenAPI 插件或配置代理环境后重试";
  if (st === "failed") return "列表查询失败，请稍后重试或走人工复核";
  if (st === "skipped_invalid_response") return "响应解析失败，需真实接口样例后收紧映射";
  return "请根据 sopBranch 与 missingFacts 向客户说明";
}

function collectIds(records: TailTraceRecord[]): {
  serialNumbers: string[];
  orderNos: string[];
  trackingNos: string[];
  shippingNos: string[];
} {
  const serialNumbers = new Set<string>();
  const orderNos = new Set<string>();
  const trackingNos = new Set<string>();
  const shippingNos = new Set<string>();
  for (const r of records) {
    if (r.serialNumber) serialNumbers.add(r.serialNumber);
    if (r.orderNo) orderNos.add(r.orderNo);
    if (r.trackingNo) trackingNos.add(r.trackingNo);
    if (r.shippingNo) shippingNos.add(r.shippingNo);
  }
  return {
    serialNumbers: [...serialNumbers],
    orderNos: [...orderNos],
    trackingNos: [...trackingNos],
    shippingNos: [...shippingNos],
  };
}

function serializeRecords(records: TailTraceRecord[]): Array<Record<string, unknown>> {
  return records.map((r) => ({
    serialNumber: r.serialNumber,
    orderNo: r.orderNo,
    trackingNo: r.trackingNo,
    shippingNo: r.shippingNo,
    checkingStatus: r.checkingStatus,
    checkingType: r.checkingType,
    applicationTime: r.applicationTime,
    acceptTime: r.acceptTime,
    checkingResults: r.checkingResults,
    feedbackMsg: r.feedbackMsg,
    returnReasons: r.returnReasons,
  }));
}

function hasMeaningfulResult(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return Boolean(text) && text !== "0";
}

function hasCustomerFacingResult(records: TailTraceRecord[]): boolean {
  return records.some(
    (record) =>
      hasMeaningfulResult(record.checkingResults) ||
      hasMeaningfulResult(record.feedbackMsg) ||
      hasMeaningfulResult(record.returnReasons)
  );
}

function buildWcrPendingAnalysis(facts: TailTraceFacts, records: TailTraceRecord[]): string {
  const primary =
    records.find((record) => record.serialNumber === facts.primarySerialNumber) ?? records[0];
  const serialNumber = facts.primarySerialNumber ?? primary?.serialNumber ?? "";
  const trackingNo = primary?.trackingNo ?? facts.queryKeys?.trackingIds?.[0] ?? "";
  const orderNo = primary?.orderNo ?? facts.queryKeys?.outboundOrderNos?.[0] ?? "";
  const scope = [trackingNo ? `运单${trackingNo}` : "", orderNo ? `出库单${orderNo}` : ""]
    .filter(Boolean)
    .join("、");
  const subject = scope ? `关于${scope}的退回原因核实需求，` : "";
  const serial = serialNumber ? `查件单${serialNumber}` : "当前查件单";
  const application = facts.applicationTimeLocal
    ? `该查件申请于${facts.applicationTimeLocal}提交。`
    : "";
  const elapsed =
    typeof facts.elapsedBizDays === "number"
      ? `截至${facts.analysisTimeLocal || "当前"}已过${facts.elapsedBizDays}个工作日。`
      : "";
  const sla =
    typeof facts.elapsedBizDays === "number" && facts.elapsedBizDays <= 10
      ? "当前仍在10个工作日的调查时效范围内。"
      : typeof facts.elapsedBizDays === "number" && facts.elapsedBizDays > 10
        ? "当前已超过10个工作日的预计调查时效。"
        : "";
  return `您好，${subject}${serial}当前状态为待确认结果。${application}${elapsed}${sla}当前接口暂未返回可对客说明的具体退回原因，请后续关注或查询该查件单的处理进度。`;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const facts = asFacts(params.tailTraceFacts);
  const inputContext = (params.inputContext ?? {}) as TiInputContext;

  const structured: TiStructured = { ...coerced.structured };
  const recommendation =
    params.checkingTypeRecommendation && typeof params.checkingTypeRecommendation === "object"
      ? (params.checkingTypeRecommendation as Record<string, unknown>)
      : {};

  const qk = facts.queryKeys ?? structured.queryKeys ?? {};
  structured.queryKeys = {
    inquiryIds: Array.isArray(qk.inquiryIds) ? qk.inquiryIds : [],
    trackingIds: Array.isArray(qk.trackingIds) ? qk.trackingIds : [],
    outboundOrderNos: Array.isArray(qk.outboundOrderNos) ? qk.outboundOrderNos : [],
  };

  const records = Array.isArray(facts.records) ? facts.records : [];
  structured.records = serializeRecords(records);
  const ids = collectIds(records);
  structured.serialNumbers = ids.serialNumbers.length ? ids.serialNumbers : structured.serialNumbers;
  structured.orderNos = ids.orderNos.length ? ids.orderNos : structured.orderNos;
  structured.trackingNos = ids.trackingNos.length ? ids.trackingNos : structured.trackingNos;
  structured.shippingNos = ids.shippingNos.length ? ids.shippingNos : structured.shippingNos;

  structured.primaryCheckingStatus = facts.primaryCheckingStatus ?? structured.primaryCheckingStatus;
  structured.primaryCheckingType = facts.primaryCheckingType ?? structured.primaryCheckingType;
  structured.sopBranch = facts.sopBranch ?? structured.sopBranch;
  structured.submissionGuidanceUrl = facts.submissionGuidanceUrl ?? structured.submissionGuidanceUrl;
  structured.elapsedBizDays = facts.elapsedBizDays !== undefined ? facts.elapsedBizDays : structured.elapsedBizDays ?? null;
  structured.applicationTimeLocal = facts.applicationTimeLocal ?? structured.applicationTimeLocal;
  structured.analysisTimeLocal = facts.analysisTimeLocal ?? structured.analysisTimeLocal;
  structured.calendarSource = facts.calendarSource ?? structured.calendarSource;
  structured.slaBand = facts.slaBand ?? structured.slaBand ?? "unknown";
  structured.canEscalateUrgent =
    facts.canEscalateUrgent !== undefined ? facts.canEscalateUrgent : structured.canEscalateUrgent ?? null;
  structured.recommendedCheckingType = String(recommendation.recommendedCheckingType ?? "").trim();
  structured.recommendedCheckingTypeName = String(recommendation.recommendedCheckingTypeName ?? "").trim();
  structured.classificationConfidence = String(recommendation.classificationConfidence ?? "low").trim();
  structured.classificationReason = String(recommendation.classificationReason ?? "").trim();
  const recommendationExperts = Array.isArray(recommendation.suggestedNextExperts)
    ? recommendation.suggestedNextExperts.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const llmExperts = Array.isArray(structured.suggestedNextExperts)
    ? structured.suggestedNextExperts.map((item) => String(item).trim()).filter(Boolean)
    : [];
  structured.suggestedNextExperts = Array.from(new Set([...llmExperts, ...recommendationExperts]));

  structured.statusSummary = {
    listStatus: facts.listStatus ?? structured.statusSummary?.listStatus ?? "unknown",
    sopBranch: facts.sopBranch ?? structured.statusSummary?.sopBranch,
    apiCode: facts.apiCode ?? structured.statusSummary?.apiCode,
    apiMsg: facts.apiMsg ?? structured.statusSummary?.apiMsg,
    notes: Array.isArray(facts.notes) ? facts.notes : [],
    rawTopKeys: facts.rawTopKeys,
  };

  const derivedMissing = deriveMissingFacts(facts);
  const llmMissing = Array.isArray(structured.missingFacts)
    ? (structured.missingFacts as unknown[]).filter((x) => typeof x === "string" && (x as string).trim()) as string[]
    : [];
  structured.missingFacts = Array.from(new Set([...llmMissing, ...derivedMissing])).slice(0, 20);

  const isWcrPendingWithoutResult =
    facts.listStatus === "success" &&
    (facts.primaryCheckingStatus === "WCR" || facts.sopBranch === "supplement_wcr") &&
    !hasCustomerFacingResult(records);

  if (isWcrPendingWithoutResult) {
    structured.nextAction = "请后续关注或查询该查件单的处理进度。";
  } else if (!structured.nextAction || !String(structured.nextAction).trim()) {
    structured.nextAction = inferNextAction(facts);
  }

  let analysis = coerced.analysis;
  if (isWcrPendingWithoutResult) {
    analysis = buildWcrPendingAnalysis(facts, records);
  } else if (facts.listStatus === "empty" && structured.recommendedCheckingTypeName) {
    analysis = `${analysis.replace(/\s+$/, "")} 新建尾程查件时，建议选择“${structured.recommendedCheckingTypeName}”类型。`.trim();
  }

  const summary =
    (analysis || "").slice(0, 200) ||
    (facts.listStatus === "success" ? "查件列表已返回" : "查件查询处理完成");

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "tracking-inquiry",
      resultSummary: summary,
      chainId: inputContext.chainId ?? "",
    },
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
