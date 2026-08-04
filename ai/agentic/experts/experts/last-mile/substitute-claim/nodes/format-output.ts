/**
 * 节点：format-output — 合并 LLM 输出与 **fetch-compensate-list** 的确定性事实
 * FaaS 单文件闭环。`listStatus` / `records` 等以 `compensateListFacts` 为准覆盖 LLM 同名字段。
 */

interface CompensateRecord {
  compensateApplyNo?: string;
  businessNo?: string;
  trackingNo?: string;
  compensateStatus?: string;
  compensateType?: string;
  compensateStatusLabel?: string;
  compensateTypeLabel?: string;
  applyTime?: string;
  acceptTime?: string;
  claimEndTime?: string;
  needSupMaterial?: string;
  raw?: Record<string, unknown>;
}

interface CompensateListFacts {
  branch?: "query" | "guidance" | "skip";
  listStatus?: string;
  queryKeys?: { trackingIds: string[]; outboundOrderNos: string[]; claimIds: string[] };
  querySent?: Record<string, unknown>;
  records?: CompensateRecord[];
  rawTopKeys?: string[];
  apiCode?: unknown;
  apiMsg?: string;
  notes?: string[];
}

interface ClaimStructured {
  queryKeys?: { trackingIds?: string[]; outboundOrderNos?: string[]; claimIds?: string[] };
  records?: Array<Record<string, unknown>>;
  statusSummary?: Record<string, unknown>;
  nextAction?: string;
  missingFacts?: string[];
  [key: string]: unknown;
}

interface ClaimAnalysisResult {
  structured?: ClaimStructured;
  analysis?: string;
}

interface ClaimInputContext {
  chainId?: string;
  sourceExpertId?: string;
  previousOutput?: string | object;
}

function coerceAnalysisResult(raw: unknown): { structured: ClaimStructured; analysis: string } {
  if (raw == null) {
    return { structured: {}, analysis: "未收到模型输出。" };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s) as ClaimAnalysisResult;
      if (parsed && typeof parsed === "object") {
        return coerceAnalysisResult(parsed);
      }
    } catch {
      return { structured: {}, analysis: s || "解析失败。" };
    }
    return { structured: {}, analysis: s };
  }

  const o = raw as ClaimAnalysisResult;
  const st = o.structured ?? {};
  const analysis = typeof o.analysis === "string" ? o.analysis : "（无 analysis 字段）";
  return { structured: typeof st === "object" && st !== null ? { ...st } : {}, analysis };
}

function asFacts(raw: unknown): CompensateListFacts {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as CompensateListFacts;
  }
  return {};
}

function deriveMissingFacts(facts: CompensateListFacts, records: CompensateRecord[]): string[] {
  const out: string[] = [];
  const st = facts.listStatus ?? "";

  if (st === "skipped_no_env") {
    out.push("未配置插件响应且无 Coze 代理环境变量，无法拉取代客索赔列表");
  }
  if (st === "failed") {
    out.push(facts.apiMsg ? `OpenAPI 异常：${facts.apiMsg}` : "OpenAPI 调用失败");
  }
  if (st === "skipped_invalid_response") {
    out.push("接口返回形态未识别，缺少真实样例以精确映射列表字段");
  }
  if (st === "skipped_no_query") {
    out.push("无 claimIds/出库单号/跟踪号，未发起 pageList");
  }

  for (const r of records) {
    const id = r.compensateApplyNo ?? r.businessNo ?? r.trackingNo ?? "(未知行)";
    if (!r.applyTime) out.push(`记录 ${id} 缺少 applyTime（或等价字段）`);
    if (!r.compensateStatus) out.push(`记录 ${id} 缺少 compensateStatus（状态将仅能依赖原始字段）`);
  }

  return Array.from(new Set(out.filter(Boolean)));
}

function inferNextAction(facts: CompensateListFacts): string {
  const st = facts.listStatus ?? "";
  if (st === "skipped_guidance") {
    return "按现有代客索赔知识说明申请流程与材料；资料未覆盖的特殊情形明确待确认，不要求客户先提供单号";
  }
  if (st === "success") return "结合列表中的状态字段向客户说明当前阶段与后续材料/时效注意点（不承诺赔付结论）";
  if (st === "empty") return "当前查询条件下无代客索赔记录，请核对单号或扩大查询范围";
  if (st === "skipped_no_query") return "请客户提供代客索赔单号、出库单号或跟踪号之一以便查询";
  if (st === "skipped_no_env") return "在 Coze 中接入万邑通 OpenAPI 插件或配置代理环境后重试";
  if (st === "failed") return "列表查询失败，请稍后重试或走人工复核";
  if (st === "skipped_invalid_response") return "响应解析失败，需真实接口样例后收紧映射";
  return "请根据 statusSummary 与 missingFacts 向客户说明";
}

function isGuidanceContradiction(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  const asksForIdentifiers = /(?:请|需要).{0,12}提供.{0,30}(?:代客索赔单号|出库单号|跟踪号)/s.test(s);
  const routesSubstituteClaimToStandard =
    /(?:进入|路径|操作|点击|选择).{0,50}申请标准索赔/s.test(s) ||
    /申请标准索赔[，,。\s]*(?:可|即可|进行).{0,12}代客索赔/s.test(s);
  return asksForIdentifiers || routesSubstituteClaimToStandard;
}

function guidanceFallbackAnalysis(): string {
  return "您咨询的是代客索赔申请流程或材料，无需先提供索赔单号。现有资料未明确覆盖的特殊材料或操作入口，请以代客索赔申请页面要求为准，或转人工核实后再提交。";
}

function serializeRecordsForStructured(records: CompensateRecord[]): Array<Record<string, unknown>> {
  return records.map((r) => ({
    compensateApplyNo: r.compensateApplyNo,
    businessNo: r.businessNo,
    trackingNo: r.trackingNo,
    compensateStatus: r.compensateStatus,
    compensateType: r.compensateType,
    compensateStatusLabel: r.compensateStatusLabel,
    compensateTypeLabel: r.compensateTypeLabel,
    applyTime: r.applyTime,
    acceptTime: r.acceptTime,
    claimEndTime: r.claimEndTime,
    needSupMaterial: r.needSupMaterial,
    rawRecord: r.raw && typeof r.raw === "object" ? r.raw : {},
  }));
}

async function main({ params }: { params: Record<string, unknown> }) {
  const coerced = coerceAnalysisResult(params.analysisResult);
  const facts = asFacts(params.compensateListFacts);
  const inputContext = (params.inputContext ?? {}) as ClaimInputContext;

  const structured: ClaimStructured = { ...coerced.structured };

  const qk = facts.queryKeys ?? structured.queryKeys ?? {};
  structured.queryKeys = {
    trackingIds: Array.isArray(qk.trackingIds) ? qk.trackingIds : [],
    outboundOrderNos: Array.isArray(qk.outboundOrderNos) ? qk.outboundOrderNos : [],
    claimIds: Array.isArray(qk.claimIds) ? qk.claimIds : [],
  };

  const records = Array.isArray(facts.records) ? facts.records : [];
  structured.records = serializeRecordsForStructured(records);

  structured.statusSummary = {
    branch: facts.branch ?? structured.statusSummary?.branch,
    listStatus: facts.listStatus ?? structured.statusSummary?.listStatus ?? "unknown",
    apiCode: facts.apiCode ?? structured.statusSummary?.apiCode,
    apiMsg: facts.apiMsg ?? structured.statusSummary?.apiMsg,
    notes: Array.isArray(facts.notes) ? facts.notes : [],
    rawTopKeys: facts.rawTopKeys,
    /** 状态透传：不在此节点做 compensateStatus → 中文阶段强映射 */
    statusPassthrough: true,
  };

  const derivedMissing = deriveMissingFacts(facts, records);
  const llmMissing = Array.isArray(structured.missingFacts)
    ? (structured.missingFacts as unknown[]).filter((x) => typeof x === "string" && (x as string).trim()) as string[]
    : [];
  structured.missingFacts = Array.from(new Set([...llmMissing, ...derivedMissing])).slice(0, 20);

  const isGuidance = facts.branch === "guidance" || facts.listStatus === "skipped_guidance";
  const currentNextAction = String(structured.nextAction ?? "").trim();
  if (!currentNextAction || (isGuidance && isGuidanceContradiction(currentNextAction))) {
    structured.nextAction = inferNextAction(facts);
  }

  let analysis = coerced.analysis;
  let guidanceGuardApplied = false;
  if (isGuidance && isGuidanceContradiction(analysis)) {
    analysis = guidanceFallbackAnalysis();
    guidanceGuardApplied = true;
  }
  if (isGuidance) {
    structured.statusSummary = {
      ...structured.statusSummary,
      guidanceGuardApplied,
    };
  }

  const summary =
    (analysis || "").slice(0, 200) ||
    (facts.listStatus === "success" ? "代客索赔列表已返回" : "代客索赔查询处理完成");

  return {
    structured,
    analysis,
    outputContext: {
      expertId: "substitute-claim",
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
