/**
 * LLM 节点：使用 OpenAI API 替代 Mock
 * 读取专家 Prompt，注入上下文，调用 API，解析 JSON 输出
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as pathMod from "path";
import { unwrapLlmEnvelope } from "../shared/unwrap-llm-envelope";

const DEFAULT_MODEL = "gpt-4o-mini";

function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

const STRUCTURED_LIST_KEYS = [
  "orderIds",
  "trackingIds",
  "documentRefs",
  "outboundOrderNos",
  "trackingNos",
  "serialNumbers",
  "orderNos",
  "shippingNos",
  "inquiryIds",
  "packageStatuses",
  "podFileUrls",
  "podRawPaths",
  "queryKeys",
  "records",
  "statusSummary",
  "nextAction",
  "missingFacts",
  "primaryCheckingStatus",
  "primaryCheckingType",
  "sopBranch",
  "submissionGuidanceUrl",
  "events",
  "trackingPortalUrls",
] as const;

/** structured 是否有可供下游使用的字段（空对象视为未解析到） */
function structuredHasData(s: object): boolean {
  const o = s as Record<string, unknown>;
  if (!o || typeof o !== "object") return false;
  for (const k of STRUCTURED_LIST_KEYS) {
    const v = o[k];
    if (Array.isArray(v) && v.length > 0) return true;
  }
  if (typeof o.nextAction === "string" && o.nextAction.trim().length > 0) return true;
  if (o.statusSummary !== undefined && o.statusSummary !== null && typeof o.statusSummary === "object") {
    const s = o.statusSummary as Record<string, unknown>;
    if (Object.keys(s).length > 0) return true;
  }
  if (o.queryKeys !== undefined && o.queryKeys !== null && typeof o.queryKeys === "object") {
    const q = o.queryKeys as Record<string, unknown>;
    for (const arr of Object.values(q)) {
      if (Array.isArray(arr) && arr.length > 0) return true;
    }
  }
  if (typeof o.status === "string" && o.status.length > 0) return true;
  if (typeof o.exportStatus === "string" && o.exportStatus.length > 0) return true;
  if (typeof o.statusName === "string" && o.statusName.length > 0) return true;
  if (typeof o.fetchStatus === "string" && o.fetchStatus.trim().length > 0) return true;
  if (typeof o.branch === "string" && o.branch.trim().length > 0) return true;
  if (o.isTruncated === true) return true;
  return Object.keys(o).length > 0 && STRUCTURED_LIST_KEYS.some((k) => k in o);
}

function hoistStructuredFields(from: Record<string, unknown>): object {
  const hoisted: Record<string, unknown> = {};
  for (const k of STRUCTURED_LIST_KEYS) {
    if (from[k] !== undefined) hoisted[k] = from[k];
  }
  for (const k of ["status", "statusName", "isTruncated"] as const) {
    if (from[k] !== undefined) hoisted[k] = from[k];
  }
  return hoisted;
}

/**
 * 从 analysis 字符串中挽救误塞进代码块或裸嵌套的 { structured, analysis }
 */
function recoverFromAnalysisString(analysis: string, depth = 0): { structured: object; analysis: string } | null {
  if (depth > 2) return null;
  const t = analysis.trim();
  if (!t) return null;

  let candidate = t;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) candidate = fence[1].trim();
  else if (!t.startsWith("{")) return null;

  try {
    const inner = JSON.parse(candidate) as Record<string, unknown>;

    if (inner.structured !== undefined && inner.structured !== null && typeof inner.structured === "object") {
      const st = inner.structured as object;
      const an = typeof inner.analysis === "string" ? inner.analysis : "";
      if (structuredHasData(st)) return { structured: st, analysis: an };
      if (an) {
        const deeper = recoverFromAnalysisString(an, depth + 1);
        if (deeper && structuredHasData(deeper.structured)) return deeper;
      }
      return { structured: st, analysis: an };
    }

    const flat = hoistStructuredFields(inner);
    if (Object.keys(flat).length > 0) {
      const an = typeof inner.analysis === "string" ? inner.analysis : "";
      return { structured: flat, analysis: an };
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeParsedTopLevel(
  parsed: Record<string, unknown>,
  envelopeKey = "analysisResult"
): { structured: object; analysis: string } {
  const unwrapped = unwrapLlmEnvelope(parsed, envelopeKey);
  let structured = unwrapped.structured as object;
  let analysis = unwrapped.analysis;

  if (!structuredHasData(structured)) {
    const hoistedInner = hoistStructuredFields(unwrapped.structured);
    if (Object.keys(hoistedInner).length > 0) structured = hoistedInner;
    const hoistedTop = hoistStructuredFields(parsed);
    if (Object.keys(hoistedTop).length > 0) structured = hoistedTop;
  }

  if (!structuredHasData(structured) && analysis) {
    const rec = recoverFromAnalysisString(analysis);
    if (rec) {
      structured = rec.structured;
      analysis = rec.analysis;
    }
  }

  return { structured, analysis };
}

/**
 * 从 LLM 响应中解析 JSON（支持 ```json ... ``` 包裹、envelope 包裹、顶层摊平、analysis 内误嵌套整份 JSON）
 */
function parseLlmJson(
  text: string,
  envelopeKey = "analysisResult"
): { structured?: object; analysis?: string } {
  const trimmed = text.trim();
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  let rawJson = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    return normalizeParsedTopLevel(parsed, envelopeKey);
  } catch {
    const fallback = extractFirstJsonObject(trimmed);
    if (fallback) {
      try {
        const parsed = JSON.parse(fallback) as Record<string, unknown>;
        return normalizeParsedTopLevel(parsed, envelopeKey);
      } catch {
        // ignore
      }
    }
    return {
      structured: {},
      analysis: trimmed,
    };
  }
}

/**
 * 构建 enrichedContext 文本（供 Prompt 注入）
 */
function buildEnrichedContext(params: Record<string, unknown>): string {
  const parts: string[] = [];

  /** delivery-status 等专家：上游已合并的 enrichedContext 对象 */
  const prebuilt = params.enrichedContext;
  if (prebuilt !== undefined && prebuilt !== null) {
    const text = typeof prebuilt === "string" ? prebuilt : JSON.stringify(prebuilt, null, 2);
    parts.push("## enrichedContext（上下文已合并）\n```json\n" + text + "\n```");
    return parts.join("\n\n");
  }

  const prunedOrderData = params.prunedOrderData;
  if (prunedOrderData && typeof prunedOrderData === "object") {
    parts.push("## 出库单数据（剪枝后）\n```json\n" + JSON.stringify(prunedOrderData, null, 2) + "\n```");
  }

  const statusLexicon = params.statusLexicon;
  if (typeof statusLexicon === "string") {
    parts.push("## 状态词典\n" + statusLexicon);
  }

  const statusScenarios = params.statusScenarios;
  if (typeof statusScenarios === "string") {
    parts.push("## 状态场景解读\n" + statusScenarios);
  }

  const jsonFieldGuide = params.jsonFieldGuide;
  if (typeof jsonFieldGuide === "string") {
    parts.push("## JSON 字段解读\n" + jsonFieldGuide);
  }

  return parts.length > 0 ? parts.join("\n\n") : "（无）";
}

/**
 * 执行 LLM 节点：读取 Prompt、注入参数、调用 OpenAI、解析 JSON
 */
export async function runLlmNode(
  expertDir: string,
  params: Record<string, unknown>,
  options?: { model?: string; apiKey?: string; baseURL?: string; promptFile?: string; outputKey?: string }
): Promise<Record<string, unknown>> {
  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 未配置，请设置环境变量或传入 apiKey");
  }

  const promptPath = pathMod.join(expertDir, options?.promptFile ?? pathMod.join("prompts", "main.md"));
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt 文件不存在: ${promptPath}`);
  }

  let promptTemplate = fs.readFileSync(promptPath, "utf-8");

  const outboundOrderNos = params.outboundOrderNos ?? [];
  const query = params.query ?? "";
  const customerIntent = params.customerIntent ?? "";
  const expression = String(params.expression ?? "");
  const rawResult = params.result;
  const computationResult =
    rawResult !== undefined && rawResult !== null
      ? typeof rawResult === "string"
        ? rawResult
        : JSON.stringify(rawResult, null, 2)
      : "（无代码节点 result，请检查工作流是否先执行 evaluate-expression）";
  const enrichedContext = buildEnrichedContext(params);

  const inputContext = params.inputContext;
  let previousOutput = "";
  if (inputContext !== undefined && inputContext !== null && typeof inputContext === "object") {
    const po = (inputContext as Record<string, unknown>).previousOutput;
    if (po !== undefined && po !== null) {
      previousOutput = typeof po === "string" ? po : JSON.stringify(po);
    }
  }

  const scenario = params.scenario ?? "";
  const trackingIds = params.trackingIds ?? [];
  const claimIds = params.claimIds ?? [];
  const refundLexicon =
    typeof params.refundLexicon === "string"
      ? params.refundLexicon
      : "（未注入 refundLexicon：Coze 请接 load-refund-knowledge 节点；本地可传入 params.refundLexicon）";
  const clauseMatrix =
    typeof params.clauseMatrix === "string"
      ? params.clauseMatrix
      : "（未注入 clauseMatrix，同上）";
  const calculationGuide =
    typeof params.calculationGuide === "string"
      ? params.calculationGuide
      : "（未注入 calculationGuide，同上）";
  const designatedCountryShard =
    typeof params.designatedCountryShard === "string"
      ? params.designatedCountryShard
      : "（未注入 designatedCountryShard：Coze 请接 load-refund-knowledge）";
  const countryResolved = String(params.countryResolved ?? "");
  const countryShardMode = String(params.countryShardMode ?? "");

  const examplesPath = pathMod.join(expertDir, "prompts", "examples.md");
  const examplesMd =
    typeof params.examplesMd === "string"
      ? params.examplesMd
      : fs.existsSync(examplesPath)
        ? fs.readFileSync(examplesPath, "utf-8")
        : "";

  const kbPath = pathMod.join(expertDir, "prompts", "kb.md");
  const kbMd =
    typeof params.kbMd === "string"
      ? params.kbMd
      : fs.existsSync(kbPath)
        ? fs.readFileSync(kbPath, "utf-8")
        : "";

  const prunedOrderDataRaw = params.prunedOrderData;
  const prunedOrderDataStr =
    prunedOrderDataRaw != null && typeof prunedOrderDataRaw === "object"
      ? JSON.stringify(prunedOrderDataRaw, null, 2)
      : String(prunedOrderDataRaw ?? "");
  const statusLexiconStr =
    typeof params.statusLexicon === "string" ? params.statusLexicon : "（未注入 statusLexicon）";
  const statusScenariosStr =
    typeof params.statusScenarios === "string" ? params.statusScenarios : "（未注入 statusScenarios）";
  const jsonFieldGuideStr =
    typeof params.jsonFieldGuide === "string" ? params.jsonFieldGuide : "（未注入 jsonFieldGuide）";

  promptTemplate = promptTemplate.replace(/\{\{outboundOrderNos\}\}/g, JSON.stringify(outboundOrderNos));
  promptTemplate = promptTemplate.replace(/\{\{query\}\}/g, String(query));
  promptTemplate = promptTemplate.replace(/\{\{customerIntent\}\}/g, String(customerIntent));
  promptTemplate = promptTemplate.replace(/\{\{expression\}\}/g, expression);
  promptTemplate = promptTemplate.replace(/\{\{computationResult\}\}/g, computationResult);
  promptTemplate = promptTemplate.replace(/\{\{scenario\}\}/g, String(scenario));
  promptTemplate = promptTemplate.replace(/\{\{trackingIds\}\}/g, JSON.stringify(trackingIds));
  promptTemplate = promptTemplate.replace(/\{\{claimIds\}\}/g, JSON.stringify(claimIds));
  const carrierCode = String(params.carrierCode ?? "");
  const region = String(params.region ?? "");
  const country = String(params.country ?? "");
  const lastMileProductName = String(params.lastMileProductName ?? "");
  const fetchMetaStr =
    params.fetchMeta !== undefined && params.fetchMeta !== null
      ? typeof params.fetchMeta === "string"
        ? params.fetchMeta
        : JSON.stringify(params.fetchMeta, null, 2)
      : "{}";
  const rawTextExcerpt =
    (typeof params.rawTextExcerpt === "string" ? params.rawTextExcerpt : "").slice(0, 12000);
  const eventsDraftStr =
    params.eventsDraft !== undefined && params.eventsDraft !== null
      ? typeof params.eventsDraft === "string"
        ? params.eventsDraft
        : JSON.stringify(params.eventsDraft, null, 2)
      : "[]";
  const adapterId = String(params.adapterId ?? "");
  const resolveNote = String(params.resolveNote ?? "");
  promptTemplate = promptTemplate.replace(/\{\{carrierCode\}\}/g, carrierCode);
  promptTemplate = promptTemplate.replace(/\{\{region\}\}/g, region);
  promptTemplate = promptTemplate.replace(/\{\{country\}\}/g, country);
  promptTemplate = promptTemplate.replace(/\{\{lastMileProductName\}\}/g, lastMileProductName);
  promptTemplate = promptTemplate.replace(/\{\{fetchMeta\}\}/g, fetchMetaStr);
  promptTemplate = promptTemplate.replace(/\{\{rawTextExcerpt\}\}/g, rawTextExcerpt);
  promptTemplate = promptTemplate.replace(/\{\{eventsDraft\}\}/g, eventsDraftStr);
  promptTemplate = promptTemplate.replace(/\{\{adapterId\}\}/g, adapterId);
  promptTemplate = promptTemplate.replace(/\{\{resolveNote\}\}/g, resolveNote);
  const claimChannelKnown =
    params.claimChannelKnown === undefined
      ? "（未提供）"
      : typeof params.claimChannelKnown === "boolean"
        ? String(params.claimChannelKnown)
        : JSON.stringify(params.claimChannelKnown);
  promptTemplate = promptTemplate.replace(/\{\{claimChannelKnown\}\}/g, claimChannelKnown);
  promptTemplate = promptTemplate.replace(/\{\{prunedOrderData\}\}/g, prunedOrderDataStr);
  promptTemplate = promptTemplate.replace(/\{\{statusLexicon\}\}/g, statusLexiconStr);
  promptTemplate = promptTemplate.replace(/\{\{statusScenarios\}\}/g, statusScenariosStr);
  promptTemplate = promptTemplate.replace(/\{\{jsonFieldGuide\}\}/g, jsonFieldGuideStr);
  promptTemplate = promptTemplate.replace(/\{\{enrichedContext\}\}/g, enrichedContext);
  const inputContextStr =
    inputContext !== undefined && inputContext !== null && typeof inputContext === "object"
      ? JSON.stringify(inputContext, null, 2)
      : "{}";
  promptTemplate = promptTemplate.replace(/\{\{inputContext\}\}/g, inputContextStr);
  promptTemplate = promptTemplate.replace(/\{\{inputContext\.previousOutput\}\}/g, previousOutput);
  const podExportFactsStr =
    params.podExportFacts !== undefined && params.podExportFacts !== null
      ? typeof params.podExportFacts === "string"
        ? params.podExportFacts
        : JSON.stringify(params.podExportFacts, null, 2)
      : "（无）";
  promptTemplate = promptTemplate.replace(/\{\{podExportFacts\}\}/g, podExportFactsStr);
  const compensateListFactsStr =
    params.compensateListFacts !== undefined && params.compensateListFacts !== null
      ? typeof params.compensateListFacts === "string"
        ? params.compensateListFacts
        : JSON.stringify(params.compensateListFacts, null, 2)
      : "（无）";
  promptTemplate = promptTemplate.replace(/\{\{compensateListFacts\}\}/g, compensateListFactsStr);
  const inquiryIds = params.inquiryIds ?? [];
  promptTemplate = promptTemplate.replace(/\{\{inquiryIds\}\}/g, JSON.stringify(inquiryIds));
  const tailTraceFactsStr =
    params.tailTraceFacts !== undefined && params.tailTraceFacts !== null
      ? typeof params.tailTraceFacts === "string"
        ? params.tailTraceFacts
        : JSON.stringify(params.tailTraceFacts, null, 2)
      : "（无）";
  promptTemplate = promptTemplate.replace(/\{\{tailTraceFacts\}\}/g, tailTraceFactsStr);
  promptTemplate = promptTemplate.replace(/\{\{refundLexicon\}\}/g, refundLexicon);
  promptTemplate = promptTemplate.replace(/\{\{clauseMatrix\}\}/g, clauseMatrix);
  promptTemplate = promptTemplate.replace(/\{\{calculationGuide\}\}/g, calculationGuide);
  promptTemplate = promptTemplate.replace(/\{\{designatedCountryShard\}\}/g, designatedCountryShard);
  promptTemplate = promptTemplate.replace(/\{\{countryResolved\}\}/g, countryResolved);
  promptTemplate = promptTemplate.replace(/\{\{countryShardMode\}\}/g, countryShardMode);
  promptTemplate = promptTemplate.replace(/\{\{examplesMd\}\}/g, examplesMd);
  // 兼容旧占位符（Coze 变量名不可含 `.`）
  promptTemplate = promptTemplate.replace(/\{\{examples\.md\}\}/g, examplesMd);
  promptTemplate = promptTemplate.replace(
    /\{\{kbMd\}\}/g,
    kbMd.trim() ? kbMd : "（未配置 prompts/kb.md）"
  );
  promptTemplate = promptTemplate.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (match, key: string) => {
    if (!(key in params)) return match;
    const value = params[key];
    if (value === undefined || value === null) return "";
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  });

  const baseURL = options?.baseURL ?? process.env.OPENAI_BASE_URL;
  const client = new OpenAI({ apiKey, baseURL });
  const model = options?.model ?? process.env.OPENAI_MODEL_EP ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: promptTemplate }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "";
  const outputKey = options?.outputKey ?? "analysisResult";
  const { structured, analysis } = parseLlmJson(content, outputKey);

  return {
    [outputKey]: {
      structured: structured ?? {},
      analysis: analysis ?? "",
    },
  };
}
