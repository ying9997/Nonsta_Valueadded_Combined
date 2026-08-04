/**
 * 节点：格式化 LLM 输出
 * FaaS 单文件闭环，无 import；LLM envelope 由 Runner/Coze 填参前解开。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | { structured?: object; analysis?: string } | LLM `llm-analyze` 产出；structured 常见键见下方 interface |
 * | inputContext | object（可选） | `sourceExpertId?: string; previousOutput?: string \| object; chainId?: string` |
 * | enrichedContext | object（可选） | `merge-enriched-context` 产出；用于合并 `carrierHints` 到 `structured.carriers`，并将确定性 **`computedScanFacts` → `structured.scanFacts`**（不依赖 LLM 是否照抄） |
 *
 * 【输出】`return`（四字段根级，见 design-spec.md §7）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | **structured** | object | 在 LLM 产出上补齐 `carriers`、`scanFacts` |
 * | **analysis** | string | 对客长文 |
 * | **outputContext** | object | `expertId`、`resultSummary`、`chainId` |
 * | **enrichedContext** | object | 透传 merge 确定性上下文；无则 `{}` |
 */

// ========== 类型（本文件内闭环） ==========
interface CarrierRow {
  trackingNo: string;
  carrierCode?: string;
  standardCarrier?: string;
}

interface ScanEventRow {
  time?: string;
  location?: string;
  status?: string;
  description?: string;
}

/** 与 `merge-enriched-context` 的 PerTrackingScanFacts 对齐，供对客/下游机读 */
interface PerTrackingScanFactsRow {
  trackingNo: string;
  ascanEvents: ScanEventRow[];
  dscanEvents: ScanEventRow[];
  rdscanEvents: ScanEventRow[];
  deliveryFailureLikely: boolean;
  deliveryFailureEvidence?: string[];
  dataSourceNote?: "no_nodes" | "carrier_data_unverified";
}

/** 仅本节点使用；避免与其他专家 `format-output.ts` 中同名 `AnalysisResult` 发生 TS 声明合并 */
interface DeliveryStatusFormatResult {
  structured?: {
    orderIds?: string[];
    trackingIds?: string[];
    documentRefs?: Array<{ type?: string; id?: string }>;
    carriers?: CarrierRow[];
    scanFacts?: PerTrackingScanFactsRow[];
  };
  analysis?: string;
}

interface InputContext {
  sourceExpertId?: string;
  previousOutput?: string | object;
  chainId?: string;
}

interface DeliveryStatusOutputContextShape {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

interface EnrichedContextLite {
  carrierHints?: CarrierRow[];
  computedScanFacts?: PerTrackingScanFactsRow[];
  trajectories?: Array<{
    trackingNo: string;
    summary?: { carrierCode?: string; standardCarrier?: string };
  }>;
}

// ========== 承运商合并：API 摘要优先，LLM 可补全或补充纯文本场景 ==========
function carriersFromEnriched(enriched?: EnrichedContextLite): CarrierRow[] | undefined {
  if (!enriched) return undefined;
  const hints = enriched.carrierHints;
  if (hints?.length) {
    return hints.map((h) => ({
      trackingNo: h.trackingNo,
      carrierCode: h.carrierCode,
      standardCarrier: h.standardCarrier,
    }));
  }
  const tr = enriched.trajectories;
  if (!tr?.length) return undefined;
  return tr
    .filter((t) => Boolean(t.trackingNo))
    .map((t) => ({
      trackingNo: t.trackingNo,
      carrierCode: t.summary?.carrierCode,
      standardCarrier: t.summary?.standardCarrier,
    }));
}

function mergeCarriers(
  llmCarriers: CarrierRow[] | undefined,
  apiCarriers: CarrierRow[] | undefined
): CarrierRow[] | undefined {
  if (!apiCarriers?.length && !llmCarriers?.length) return undefined;
  const map = new Map<string, CarrierRow>();
  for (const row of apiCarriers ?? []) {
    if (row.trackingNo) map.set(row.trackingNo, { ...row });
  }
  for (const row of llmCarriers ?? []) {
    if (!row.trackingNo) continue;
    const existing = map.get(row.trackingNo);
    if (existing) {
      map.set(row.trackingNo, {
        trackingNo: row.trackingNo,
        carrierCode: existing.carrierCode ?? row.carrierCode,
        standardCarrier: existing.standardCarrier ?? row.standardCarrier,
      });
    } else {
      map.set(row.trackingNo, { ...row });
    }
  }
  return map.size ? [...map.values()] : undefined;
}

function applyCarrierMerge(
  result: DeliveryStatusFormatResult,
  enriched?: EnrichedContextLite
): DeliveryStatusFormatResult {
  const api = carriersFromEnriched(enriched);
  const merged = mergeCarriers(result.structured?.carriers as CarrierRow[] | undefined, api);
  if (!merged?.length) return result;
  return {
    ...result,
    structured: {
      ...result.structured,
      carriers: merged,
    },
  };
}

/** 将 merge 产出的 `computedScanFacts` 固化为 `structured.scanFacts`（有则覆盖 LLM 同名字段，避免与节点事实冲突） */
function applyScanFacts(
  result: DeliveryStatusFormatResult,
  enriched?: EnrichedContextLite
): DeliveryStatusFormatResult {
  const facts = enriched?.computedScanFacts;
  if (facts === undefined) return result;
  return {
    ...result,
    structured: {
      ...result.structured,
      scanFacts: facts,
    },
  };
}

// ========== 主逻辑 ==========
function buildDeliveryStatusOutputContext(resultSummary: string, chainId: string): DeliveryStatusOutputContextShape {
    return {
        expertId: "delivery-status",
        resultSummary,
        chainId: chainId.trim(),
    };
}

/** Coze 入口：params.analysisResult, params.inputContext, params.enrichedContext -> result, outputContext */
async function main({ params }: { params: Record<string, unknown> }) {
    const raw = (params.analysisResult ?? {}) as DeliveryStatusFormatResult;
    const enriched = params.enrichedContext as EnrichedContextLite | undefined;
    const withCarriers = applyCarrierMerge(raw, enriched);
    const analysisResult = applyScanFacts(withCarriers, enriched);
    const inputContext = params.inputContext as InputContext | undefined;

    const st = analysisResult.structured;
    const structured =
        typeof st === "object" && st !== null && !Array.isArray(st)
            ? { ...(st as Record<string, unknown>) }
            : {};
    const analysis = String(analysisResult.analysis ?? "");
    const summary = analysis.slice(0, 200) || "状态分析完成";
    const chainId =
        inputContext?.chainId !== undefined && inputContext?.chainId !== null
            ? String(inputContext.chainId).trim()
            : "";
    const outputContext = buildDeliveryStatusOutputContext(summary, chainId);

    const enrichedContext =
        enriched != null && typeof enriched === "object" && !Array.isArray(enriched)
            ? { ...(enriched as Record<string, unknown>) }
            : {};

    return {
        structured,
        analysis,
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
