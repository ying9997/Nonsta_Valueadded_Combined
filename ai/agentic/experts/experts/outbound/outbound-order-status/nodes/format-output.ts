/**
 * 节点：格式化 LLM 输出为专家最终结果
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | { structured?: object; analysis?: string } | LLM `llm-analyze` 产出；structured 字段见下方 AnalysisResult |
 * | carrierFacts | CarrierFact[] | id/55/id/54 确定性承运商事实；非空时写入 structured.carriers |
 * | outboundTimingFacts | OutboundTimingFact[] | getPackageDetail 确定性应出库时间事实；非空时写入 structured.outboundTimings |
 * | packageMeasurementFacts | PackageMeasurementFact[] | getPackageDetail 确定性实际尺寸重量事实；写入 structured.packageMeasurements |
 * | timingRequiresNarrowing | boolean | 子单超过批处理上限，禁止静默截断 |
 * | returnOrderFacts | ReturnOrderFact[] | 关联退货单确定性事实 |
 * | returnLookupResults | ReturnLookupResult[] | 每个出库单的退货查询结果与失败分类 |
 * | returnLookupMeta | object | 退货意图、缺少 WO、批量缩小范围标记 |
 * | prunedOrderData | object | 剪枝后的订单事实；用于确定性输出实际产品与平台面单事实 |
 * | inputContext | object（可选） | `sourceExpertId?: string; previousOutput?: string \| object; chainId?: string` |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | result | { structured: object; analysis: string } | structured 默认 `{}`；analysis 来自 LLM |
 * | outputContext | { expertId: string; resultSummary: string; chainId?: string } | expertId=`outbound-order-status` |
 */

// ========== 类型（本文件内闭环） ==========
interface AnalysisResult {
  structured?: {
    orderIds?: string[];
    outboundOrderNos?: string[];
    status?: string;
    statusName?: string;
    trackingNos?: string[];
    packageStatuses?: Array<{ packageNum?: string; status?: string }>;
    isTruncated?: boolean;
    [key: string]: unknown;
  };
  analysis?: string;
}

interface InputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

interface CarrierFact {
  trackingNo?: string;
  outboundOrderNum: string;
  carrier: string;
  carrierServiceCode?: string;
  carrierServiceName?: string;
  carrierHasChange?: string;
  source: "queryOutboundOrder" | "queryOutboundOrderList";
}

interface OutboundTimingFact {
  outboundOrderNum: string;
  shippingNo: string;
  trackingNos: string[];
  status?: string;
  orderTime?: string;
  estimateOutWhTimeLocal?: string;
  estimateOutWhTime?: string;
  expectedOutboundTime?: string;
  expectedOutboundTimeBasis?: "system" | "warehouse_local";
  outWhTime?: string;
  warehouseCode?: string;
  warehouseName?: string;
  slaList?: Array<{
    slaName?: string;
    serviceStandardTime?: number;
    serviceCompletionTime?: number;
    status?: string;
  }>;
  fetchStatus: "success" | "no_data" | "service_error";
  businessCode: string;
  source: "wh.outbound.getPackageDetail";
}

interface PackageMeasurementFact {
  outboundOrderNum: string;
  shippingNo: string;
  trackingNos: string[];
  actualWeightKg?: number;
  actualVolumeM3?: number;
  actualContainers: Array<{
    containerNo?: string;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    weightKg?: number;
    volumeM3?: number;
  }>;
  fetchStatus: "success" | "no_data" | "service_error";
  businessCode: string;
  source: "wh.outbound.getPackageDetail";
}

interface ReturnOrderFact {
  returnGoodsOrderNo: string;
  outboundOrderNo: string;
  returnType?: string;
  retrunReason?: string;
  returnReasonName?: string;
  status?: string;
  statusName?: string;
  warehouseCode?: string;
  createDate?: string;
  completeTime?: string;
  qtyItemNum?: number;
  orderGoodsCount: number;
  shelveGoodsCount: number;
  source: "rma.returnGoodsOrder.queryReturnOderList";
}

interface ReturnLookupResult {
  outboundOrderNo: string;
  fetchStatus: "success" | "no_data" | "service_error";
  businessCode: string;
  returnedCount: number;
  exactMatchCount: number;
  partial: boolean;
}

interface ReturnLookupMeta {
  intentMatched?: boolean;
  candidateOrderCount?: number;
  missingOutboundOrderNo?: boolean;
  requiresNarrowing?: boolean;
}

interface OutboundOrderFact {
  outboundOrderNo: string;
  effectiveProductCode: string;
  effectiveProductName: string;
  isPlatformWaybill: boolean;
}

interface OutputContext {
  expertId: string;
  resultSummary: string;
  chainId?: string;
}

// ========== 主逻辑 ==========
function buildOutputContext(resultSummary: string, chainId?: string): OutputContext {
  return {
    expertId: "outbound-order-status",
    resultSummary,
    chainId,
  };
}

function buildResultSummary(analysis: unknown, maxLength = 200): string {
  const text = String(analysis ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "出库单状态解读完成";
  if (text.length <= maxLength) return text;

  const preview = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    preview.lastIndexOf("。"),
    preview.lastIndexOf("！"),
    preview.lastIndexOf("？"),
    preview.lastIndexOf("；")
  );
  if (sentenceEnd >= Math.floor(maxLength * 0.5)) {
    return preview.slice(0, sentenceEnd + 1).trim();
  }
  return `${preview.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildOutboundOrderFacts(raw: unknown): OutboundOrderFact[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const list = (raw as Record<string, unknown>).list;
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      outboundOrderNo: String(item.outboundOrderNum ?? item.documentNo ?? item.orderNo ?? "").trim(),
      effectiveProductCode: String(
        item.effectiveProductCode ?? item.orderWinitProductCode ?? item.winitProductCode ?? ""
      ).trim(),
      effectiveProductName: String(
        item.effectiveProductName ?? item.orderWinitProductName ?? item.winitProductName ?? ""
      ).trim(),
      isPlatformWaybill: item.isPlatformWaybill === true,
    }))
    .filter((item) => item.outboundOrderNo || item.effectiveProductCode || item.effectiveProductName);
}

function buildReturnSummary(
  facts: ReturnOrderFact[],
  results: ReturnLookupResult[],
  meta: ReturnLookupMeta,
  language: unknown
): string {
  if (meta.intentMatched !== true) return "";
  const english = /^en(?:[-_]|$)/i.test(String(language ?? ""));
  if (meta.requiresNarrowing === true) {
    return english
      ? "The return-order query covers too many outbound orders; please narrow it to a specific outbound order."
      : "关联退货单查询涉及的出库单过多，需要缩小到具体出库单。";
  }
  if (meta.missingOutboundOrderNo === true) {
    return english
      ? "No outbound order number was resolved, so the related return order could not be queried."
      : "当前未解析出可查询的出库单号，因此无法核实关联退货单。";
  }
  if (facts.length > 0) {
    const items = facts.map((fact) => {
      const details = [
        fact.returnReasonName || fact.retrunReason
          ? `${english ? "reason" : "原因"}：${fact.returnReasonName ?? fact.retrunReason}`
          : "",
        fact.statusName || fact.status
          ? `${english ? "status" : "状态"}：${fact.statusName ?? fact.status}`
          : "",
        fact.completeTime
          ? `${english ? "completed at" : "完成时间"}：${fact.completeTime}`
          : "",
      ].filter(Boolean);
      return `${fact.returnGoodsOrderNo}${details.length > 0 ? `（${details.join("；")}）` : ""}`;
    });
    return english ? `Related return order(s): ${items.join(", ")}.` : `关联退货单：${items.join("；")}。`;
  }
  if (results.some((item) => item.fetchStatus === "service_error")) {
    return english
      ? "The related return-order information could not be retrieved in this query."
      : "本次未取得关联退货单信息，不能据此判断不存在退货单。";
  }
  if (results.length > 0 && results.every((item) => item.fetchStatus === "no_data")) {
    return english
      ? "No related return order was found under the current account."
      : "当前账号下未查询到关联退货单。";
  }
  return "";
}

/** Coze 入口：params.analysisResult, params.inputContext -> result, outputContext */
async function main({ params }: { params: Record<string, unknown> }) {
  const analysisResult = (params.analysisResult ?? {}) as AnalysisResult;
  const inputContext = params.inputContext as InputContext | undefined;
  const carrierFacts = Array.isArray(params.carrierFacts)
    ? (params.carrierFacts as CarrierFact[]).filter(
        (item) => item && typeof item === "object" && String(item.carrier ?? "").trim()
      )
    : [];
  const outboundTimingFacts = Array.isArray(params.outboundTimingFacts)
    ? (params.outboundTimingFacts as OutboundTimingFact[]).filter(
        (item) => item && typeof item === "object" && String(item.shippingNo ?? "").trim()
      )
    : [];
  const packageMeasurementFacts = Array.isArray(params.packageMeasurementFacts)
    ? (params.packageMeasurementFacts as PackageMeasurementFact[]).filter(
        (item) => item && typeof item === "object" && String(item.shippingNo ?? "").trim()
      )
    : [];
  const returnOrderFacts = Array.isArray(params.returnOrderFacts)
    ? (params.returnOrderFacts as ReturnOrderFact[]).filter(
        (item) => item && typeof item === "object" && String(item.returnGoodsOrderNo ?? "").trim()
      )
    : [];
  const returnLookupResults = Array.isArray(params.returnLookupResults)
    ? (params.returnLookupResults as ReturnLookupResult[]).filter(
        (item) => item && typeof item === "object" && String(item.outboundOrderNo ?? "").trim()
      )
    : [];
  const returnLookupMeta =
    params.returnLookupMeta && typeof params.returnLookupMeta === "object" && !Array.isArray(params.returnLookupMeta)
      ? (params.returnLookupMeta as ReturnLookupMeta)
      : {};
  const orderFacts = buildOutboundOrderFacts(params.prunedOrderData);
  const returnSummary = buildReturnSummary(
    returnOrderFacts,
    returnLookupResults,
    returnLookupMeta,
    params.language
  );
  const llmAnalysis = String(analysisResult.analysis ?? "").trim();
  const llmContainsAllReturnOrderNos =
    returnOrderFacts.length > 0 &&
    returnOrderFacts.every((item) => llmAnalysis.includes(item.returnGoodsOrderNo));
  const analysis = returnSummary && !llmContainsAllReturnOrderNos
    ? [returnSummary, llmAnalysis].filter(Boolean).join("\n")
    : llmAnalysis || returnSummary;
  const summary = buildResultSummary(analysis);
  const outputContext = buildOutputContext(summary, inputContext?.chainId);
  const structured = { ...(analysisResult.structured ?? {}) };
  if (carrierFacts.length > 0) structured.carriers = carrierFacts;
  if (outboundTimingFacts.length > 0) structured.outboundTimings = outboundTimingFacts;
  if (packageMeasurementFacts.length > 0) structured.packageMeasurements = packageMeasurementFacts;
  if (returnOrderFacts.length > 0) structured.returnOrders = returnOrderFacts;
  if (returnLookupMeta.intentMatched === true) {
    structured.returnLookup = {
      meta: returnLookupMeta,
      results: returnLookupResults,
    };
  }
  if (params.timingRequiresNarrowing === true || returnLookupMeta.requiresNarrowing === true) {
    structured.requiresNarrowing = true;
  }

  return {
    structured,
    analysis,
    outputContext: {
      ...outputContext,
      chainId: outputContext.chainId ?? "",
    },
    enrichedContext: {
      orderFacts,
      outboundTimings: outboundTimingFacts,
      packageMeasurements: packageMeasurementFacts,
      returnOrders: returnOrderFacts,
      returnLookupResults,
    },
  };
}

// 仅当以本文件为入口运行时执行，Coze 不会触发
if (typeof process !== "undefined" && process.argv[1]?.includes("format-output")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
