import { formatCustomerLabel, visibleCustomerName } from "./customer-display.ts";
import { formatSkuCheckAuditorHint } from "./sku-consistency-check.ts";
import { asText } from "./oms-adapter.ts";
import { deriveTopicSummary } from "./llm-scene-classifier.ts";
import { resolveOrderCategory, type SceneCategory } from "./order-category.ts";
import { collectSceneCandidates } from "./parse-scene-reply.ts";
import { findScenarioCard, loadScenarioCards } from "./scenario-cards.ts";
import { composeIdentifiedSummaries, isGenericComposedRequirement, sameNormalizedText, type SopSections } from "./sop-sections.ts";
import { alertUserId } from "./canary.ts";
import { needsOmsSceneConfirm } from "./missing-oms-scene.ts";
import type { PipelineResult } from "./run-pipeline.ts";
import type { SceneCandidate } from "./types.ts";

export interface FeishuCard {
  config?: { wide_screen_mode?: boolean };
  header: {
    title: { tag: "plain_text"; content: string };
    template?: "blue" | "green" | "orange" | "red" | "purple";
  };
  elements: Array<CardElement>;
  /** Card 1.0 delayed update only; omit when sending. */
  open_ids?: string[];
}

export type CardElement =
  | { tag: "div"; text: { tag: "lark_md"; content: string } }
  | { tag: "hr" }
  | { tag: "action"; actions: Array<CardAction> }
  | { tag: "note"; elements: Array<{ tag: "plain_text"; content: string }> };

export type CardAction =
  | {
      tag: "button";
      text: { tag: "plain_text"; content: string };
      type: "primary" | "default" | "danger";
      value: Record<string, string>;
      name?: string;
    }
  | {
      tag: "select_static";
      placeholder?: { tag: "plain_text"; content: string };
      options: Array<{ text: { tag: "plain_text"; content: string }; value: string }>;
      value?: Record<string, string>;
      name?: string;
    };

export type DemoPersonnel = Record<string, { name: string; openId: string | null }>;

const DESIGNED_SOP: Record<string, string[]> = {
  VASC000000315774: [
    "1. 根据异常单定位待处理的 14 个包裹",
    "2. 辨识后补贴包裹标签 × 14",
    "3. 上架到新入库单 WI50734175",
    "4. 关闭异常单",
  ],
};

const DESIGNED_EXCEPTIONS: Record<string, string> = {
  VASC000000315774: "EB0126060330032532",
  VASC000000298617: "EB0326061230366501, EB0326061230362709",
  VASC000000326061: "EB0326072531612017",
};

export function atPerson(person?: { name: string; openId: string | null }, fallback = "审核员"): string {
  if (person?.openId) return `<at id=${person.openId}></at>`;
  return `@${person?.name || fallback}`;
}

export function atReviewerWithCc(personnel: DemoPersonnel, action: string): string {
  const reviewer = atPerson(personnel["审核员"]);
  const owner = personnel["负责人"];
  const cc = owner?.openId || owner?.name ? ` ${atPerson(owner)}` : "";
  return `${reviewer} ${action}${cc}`;
}

/** 只有「请销售/客服补信息」才 @ 人。不 @ 李颖 / 何静 / 耿文文。 */
export function atSalesAndCs(personnel: DemoPersonnel, action: string): string {
  const sales = personnel["销售"];
  const cs = personnel["客服"];
  const bits: string[] = [];
  if (sales?.openId || sales?.name) bits.push(atPerson(sales, "销售"));
  if (cs?.openId || cs?.name) bits.push(atPerson(cs, "客服"));
  return bits.length ? `${bits.join(" ")} ${action}` : action;
}

function atDeveloper(): string {
  const id = alertUserId();
  return id ? `<at id=${id}></at>` : "金萤";
}

function missingOmsSceneNotice(result: PipelineResult): string {
  const key = result.matchResult?.sceneKey || "";
  const name = result.matchResult?.scenarioName || sceneNameOf(key) || "未匹配场景";
  return `${atDeveloper()} 知识库场景「${name}」没有对应的 OMS 场景概述码，SOP 已按「不选场景」写入。请找业务确认该场景该选哪个下拉项。`;
}

export function zhMatchReason(reason: string): string {
  const map: Record<string, string> = {
    llm_scene: "场景模型判断",
    supported_llm_clear: "场景明确（高置信度）",
    supported_llm_candidate_not_auto_run: "场景已识别，不自动执行",
    ambiguous_llm_low_confidence: "场景不够确定（低置信度）",
    ambiguous_llm_vs_rule_exclude: "规则与模型不一致，需人工确认",
    ambiguous_below_high_confidence: "场景不够确定",
    unsupported_llm: "未匹配到支持场景",
    llm_failed_fallback_rules: "模型失败，已回退规则",
    supported_clear_top1: "场景明确（规则高分）",
    ambiguous_top1_top2_close: "候选场景接近，需人工确认",
  };
  if (map[reason]) return map[reason];
  if (!reason) return "";
  if (/[\u4e00-\u9fff]/.test(reason)) return reason;
  return reason.replace(/_/g, " ");
}

export function zhMatchDecision(decision: string): string {
  const map: Record<string, string> = {
    supported: "已支持",
    ambiguous: "待确认",
    unsupported: "不支持",
  };
  return map[decision] || decision;
}

export function zhConfidence(confidence: string): string {
  const map: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低",
  };
  return map[confidence.trim().toLowerCase()] || confidence.trim();
}

/** Keep 【入库】/【库内】/【出库】 so mixed scene buttons stay distinguishable. */
export function shortSceneName(sceneName: string): string {
  return sceneName
    .replace(/^[§\d.]+\s*/, "")
    .replace(/[“”"]/g, "")
    .trim();
}

export function sceneNameOf(sceneKey: string): string {
  if (sceneKey === "transfer_human") return "人工处理";
  const card = findScenarioCard(sceneKey);
  return shortSceneName(card?.sceneName || sceneKey);
}

function customerLine(result: PipelineResult): string {
  return `客户：${formatCustomerLabel(result.contextFacts?.customerCode, result.contextFacts?.customerName)}`;
}

function warehouseLine(result: PipelineResult): string {
  const name = result.contextFacts?.warehouseName || result.contextFacts?.warehouseCode || "仓库未填写";
  return `仓库：${name}`;
}

function orderNoLine(result: PipelineResult): string {
  return result.orderNo ? `增值单：${result.orderNo}` : "";
}

function inboundOrderLine(result: PipelineResult): string {
  const nos = (result.contextFacts?.allBusinessOrderNos || []).filter(Boolean);
  const one = result.contextFacts?.businessOrderNo || "";
  const text = nos.length ? nos.join(", ") : one;
  return text ? `入库单：${text}` : "";
}

function shortExceptionName(name: string): string {
  return name.replace(/[（(]需客户处理[)）]/g, "").trim();
}

function exceptionLine(result: PipelineResult): string {
  const infos = result.matchResult?.llmClassification?.exceptionInfos || [];
  const fromFacts = (result.contextFacts?.allEventNos || []).filter(Boolean);
  const designed = DESIGNED_EXCEPTIONS[result.orderNo];
  const one = result.contextFacts?.eventNo || "";
  const nos = fromFacts.length
    ? fromFacts
    : designed
      ? designed.split(/,\s*/).filter(Boolean)
      : one
        ? [one]
        : [];
  if (!nos.length && !infos.length) return "";

  const named = infos.filter((item) => item.ebNo && item.exceptionName);
  if (named.length) {
    const unique = [...new Set(named.map((item) => shortExceptionName(item.exceptionName)))];
    const ebs = named.map((item) => item.ebNo);
    if (unique.length === 1) return `异常单：${ebs.join(", ")}（${unique[0]}）`;
    return `异常单：${named.map((item) => `${item.ebNo}（${shortExceptionName(item.exceptionName)}）`).join(", ")}`;
  }
  return `异常单：${nos.join(", ")}`;
}

function sceneLine(result: PipelineResult, unidentified = false): string {
  if (unidentified) return "场景识别：未识别到";
  const decision = String(result.matchResult?.decision || "");
  if (decision === "unsupported") return "场景识别：未识别到";
  const name = result.matchResult?.scenarioName || result.contextFacts?.sceneName || "";
  return name ? `场景识别：${shortSceneName(name)}` : "场景识别：未识别到";
}

function md(content: string): CardElement {
  return { tag: "div", text: { tag: "lark_md", content } };
}

export function judgmentBasis(result: PipelineResult): string {
  const lines: string[] = [];
  const match = result.matchResult;
  const llm = match?.llmClassification;
  const infos = llm?.exceptionInfos || [];
  if (infos.length) {
    const named = infos.filter((item) => item.exceptionName);
    const names = [...new Set(named.map((item) => item.exceptionName))];
    if (named.length && names.length === 1) {
      const obj = named[0].exceptionObject || "-";
      lines.push(
        `🔍 异常单 ${named.map((item) => item.ebNo).join("、")}：${names[0]}（${obj}）[${named[0].source}]`,
      );
    } else {
      for (const info of infos.slice(0, 2)) {
        if (info.exceptionName) {
          lines.push(`🔍 异常单 ${info.ebNo}：${info.exceptionName}（${info.exceptionObject || "-"}）[${info.source}]`);
        } else {
          lines.push(`🔍 异常单 ${info.ebNo}：未查到异常名称`);
        }
      }
    }
  }
  const actions = match?.matchedActions || [];
  if (actions.length) lines.push(`📋 识别的动作：${actions.join("、")}`);
  const retrieved = (match?.retrievedCases || []).filter((c) => c.score >= 1);
  if (retrieved.length) {
    const top = retrieved[0];
    const shortId = (top.caseId || "").replace(/^(VASC)0+/, "$1");
    lines.push(
      `📚 相似案例：${shortId}（${top.keyAction || "—"}）→ ${shortSceneName(top.sceneName)}`,
    );
  }
  const sceneName = shortSceneName(
    match?.scenarioName || (llm?.matchedScene ? sceneNameOf(llm.matchedScene) : "") || match?.sceneKey || "",
  );
  const confidence = zhConfidence(String(llm?.confidence || match?.confidence || ""));
  if (sceneName) {
    lines.push(`✅ AI 判断场景：${sceneName}${confidence ? `（置信度：${confidence}）` : ""}`);
  }
  const oneLiner = (llm?.conclusionOneLiner || "").trim();
  if (oneLiner) {
    lines.push(`💡 AI 理由：${oneLiner}`);
  } else {
    const reasoning = compactAiReason(llm?.reasoning || "");
    if (reasoning) lines.push(`💡 AI 理由：${reasoning}`);
  }
  return lines.slice(0, 5).join("\n");
}

/** Card-facing conclusion only: no 虽然/但是, no 规则字母过程，最多 40 字. */
export function compactAiReason(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  if (!t) return "";
  t = t.replace(/本案例应用规则[A-Da-d][^。]{0,80}[。.]/g, " ");
  t = t.replace(/应用规则[A-Da-d][^。]{0,40}[。.]/g, " ");
  t = t.replace(/虽然[\s\S]{0,160}?，?但(?:是)?/g, "");
  t = t.replace(/尽管[\s\S]{0,160}?，?但(?:是)?/g, "");
  t = t.replace(/^(?:需求描述明确说明|客户需求明确说明|因此|所以|综上)[：:]/g, "").trim();
  const feature = t.match(/的特征[：:]([^。]+)/);
  const items = [...t.matchAll(/(?:^|[：:；;])\s*[1-9][）)]\s*([^；;。]+)/g)].map((m) => m[1].trim());
  const actionItems = items.filter(
    (item) => /上架|扫描|换标|绑定|补贴/.test(item) && !/无法识别|导致/.test(item),
  );
  let out = "";
  if (feature && /客户|仓库/.test(feature[1]) && /上架|扫描/.test(feature[1])) {
    out = feature[1].trim();
  } else {
    out = (actionItems[actionItems.length - 1] || items[items.length - 1] || "").trim();
  }
  if (!out) {
    out = (
      t
        .split(/[。；;]/)
        .map((s) => s.trim())
        .find((s) => s && !/这是典型|关键区别|核心判断|符合场景|的特征/.test(s)) || t
    ).trim();
  }
  out = out
    .replace(/^(的)?特征[：:]\s*/g, "")
    .replace(/^[：:]+/, "")
    .replace(/^[1-9][）).、]\s*/, "")
    .replace(/^但(?:是)?/, "")
    .trim();
  if (out.length > 40) out = `${out.slice(0, 40)}...`;
  return out;
}

function judgmentFooter(result: PipelineResult): CardElement[] {
  const text = judgmentBasis(result);
  if (!text) return [];
  return [{ tag: "hr" }, md(`📎 **AI 判断依据**\n${text}`)];
}

function chunkActions(actions: CardAction[], size = 2): CardElement[] {
  const rows: CardElement[] = [];
  for (let i = 0; i < actions.length; i += size) {
    rows.push({ tag: "action", actions: actions.slice(i, i + size) });
  }
  return rows;
}

function factsBlock(result: PipelineResult, extra: string[] = [], unidentified = false): string {
  return [
    orderNoLine(result),
    customerLine(result),
    warehouseLine(result),
    exceptionLine(result),
    inboundOrderLine(result),
    sceneLine(result, unidentified),
    ...extra,
  ]
    .filter(Boolean)
    .join("\n");
}

function businessSceneHint(result: PipelineResult): string {
  const exception =
    result.orderNo === "VASC000000326061"
      ? "包裹内出现订单外商品"
      : result.orderNo === "VASC000000360654"
        ? "海运整柜100%A+包裹"
        : "";
  if (exception) return `AI 判断：异常类型「${exception}」较复杂，建议人工确认场景`;
  const name = shortSceneName(result.matchResult?.scenarioName || "");
  if (name) return `AI 判断：可能接近「${name}」，但不够确定，请人工确认场景`;
  return "AI 识别到可能的场景但不够确定，请人工确认";
}

function providedAttachmentsBlock(result: PipelineResult): string {
  const status = result.contextFacts?.attachmentStatus || result.agentInput?.omsFacts?.attachmentStatus || {};
  const uploaded = Object.entries(status)
    .filter(([, v]) => v === "uploaded")
    .map(([k]) => `${k} ✓`);
  if (!uploaded.length) return "";
  return `已提供附件：${uploaded.join("、")}`;
}

function compactText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function isStatusBoilerplate(text: string): boolean {
  return /需求与附件已齐|已生成 SOP|确认不等于/.test(text);
}

function topicRequirementSummary(result: {
  failureGate?: string;
  llm?: { error?: string | null; sop?: { requirementDescription?: string } | null; text?: string } | null;
  contextFacts?: {
    providedFields?: Record<string, unknown>;
    allEventNos?: string[];
    eventNo?: string;
    allBusinessOrderNos?: string[];
    businessOrderNo?: string;
  } | null;
  agentInput?: {
    omsFacts?: { customerRequirementDescription?: string; requirementBackground?: string };
  };
  matchResult?: {
    llmClassification?: { conclusionOneLiner?: string; topicSummary?: string; reasoning?: string } | null;
  } | null;
}): string {
  const llmClass = result.matchResult?.llmClassification;
  const topicSummary = compactText(
    deriveTopicSummary(llmClass?.topicSummary, llmClass?.reasoning),
  ).slice(0, 60);
  if (topicSummary) return topicSummary;
  const oneLiner = compactText(asText(result.matchResult?.llmClassification?.conclusionOneLiner)).slice(0, 30);
  if (oneLiner) return oneLiner;

  const original = compactText(
    asText(result.agentInput?.omsFacts?.customerRequirementDescription) ||
      asText(result.contextFacts?.providedFields?.VAS_ATTR_REL_RD) ||
      asText(result.contextFacts?.providedFields?.["需求描述"]),
  );
  if (original) return original.slice(0, 50);

  const identified = composeIdentifiedSummaries({
    llm: result.llm,
    aiGeneratedText: result.llm?.text,
    analysis: "",
    providedFields: result.contextFacts?.providedFields,
    originalRequirement: original,
    allEventNos: result.contextFacts?.allEventNos,
    eventNo: result.contextFacts?.eventNo,
    allBusinessOrderNos: result.contextFacts?.allBusinessOrderNos,
    businessOrderNo: result.contextFacts?.businessOrderNo,
    customerRequirementDescription: original,
  });
  const composed = compactText(identified.requirementDescription);
  if (composed && !isStatusBoilerplate(composed) && !isGenericComposedRequirement(composed)) return composed.slice(0, 50);

  const failed = result.failureGate === "llm-generate-sop" || Boolean(asText(result.llm?.error));
  if (failed) return "SOP生成失败，请人工处理";
  return "待审核";
}

export function demoTopicTitle(result: {
  orderNo?: string;
  failureGate?: string;
  contextFacts?: {
    customerCode?: string;
    customerName?: string;
    warehouseCode?: string;
    warehouseName?: string;
    providedFields?: Record<string, unknown>;
    allEventNos?: string[];
    eventNo?: string;
    allBusinessOrderNos?: string[];
    businessOrderNo?: string;
  } | null;
  agentInput?: {
    omsFacts?: { customerRequirementDescription?: string; requirementBackground?: string };
  };
  matchResult?: {
    llmClassification?: { conclusionOneLiner?: string; topicSummary?: string; reasoning?: string } | null;
    scenarioName?: string;
  } | null;
  llm?: { error?: string | null; sop?: { requirementDescription?: string } | null; text?: string } | null;
  analysis?: string;
}): string {
  const orderNo = String(result.orderNo || "").trim() || "VASC";
  const code = String(result.contextFacts?.customerCode || "").trim();
  const name = visibleCustomerName(result.contextFacts?.customerName);
  const customer = [code, name].filter(Boolean).join("/") || "客户未填";
  const warehouse =
    String(result.contextFacts?.warehouseCode || "").trim() ||
    String(result.contextFacts?.warehouseName || "").trim() ||
    "仓库未填";
  const summary = topicRequirementSummary(result);
  return `${orderNo} | ${customer} | ${warehouse} | ${summary}`;
}

function originalRequirementOf(result: PipelineResult): string {
  return (
    asText(result.contextFacts?.providedFields?.VAS_ATTR_REL_RD) ||
    asText(result.contextFacts?.providedFields?.["需求描述"]) ||
    asText(result.agentInput?.omsFacts?.customerRequirementDescription)
  );
}

function customerOriginalOf(result: PipelineResult): { description: string; background: string } {
  const description =
    asText(result.agentInput?.omsFacts?.customerRequirementDescription) ||
    asText(result.contextFacts?.providedFields?.VAS_ATTR_REL_RD) ||
    asText(result.contextFacts?.providedFields?.["需求描述"]);
  const background =
    asText(result.agentInput?.omsFacts?.requirementBackground) ||
    asText(result.contextFacts?.providedFields?.BEOR) ||
    asText(result.contextFacts?.providedFields?.["需求背景说明"]) ||
    asText(result.contextFacts?.providedFields?.["需求背景"]);
  return { description, background };
}

function pickAiDisplay(raw: string, identified: string, customer: string): string {
  if (raw) {
    if (customer && sameNormalizedText(raw, customer)) return "";
    return raw;
  }
  if (!identified) return "";
  if (customer && sameNormalizedText(identified, customer)) return "";
  return identified;
}

function identifiedFromResult(result: PipelineResult): SopSections {
  const analysis = asText(result.analysis);
  const identified = composeIdentifiedSummaries({
    llm: result.llm,
    aiGeneratedText: result.llm?.text,
    analysis: isStatusBoilerplate(analysis) ? "" : analysis,
    providedFields: result.contextFacts?.providedFields,
    originalRequirement: originalRequirementOf(result),
    allEventNos: result.contextFacts?.allEventNos,
    eventNo: result.contextFacts?.eventNo,
    allBusinessOrderNos: result.contextFacts?.allBusinessOrderNos,
    businessOrderNo: result.contextFacts?.businessOrderNo,
    customerRequirementDescription: asText(result.agentInput?.omsFacts?.customerRequirementDescription),
  });
  if (isGenericComposedRequirement(identified.requirementDescription)) {
    identified.requirementDescription = "";
  }
  return identified;
}

function requirementDisplayBlocks(
  result: PipelineResult,
  options?: { operationSteps?: string },
): CardElement[] {
  const customer = customerOriginalOf(result);
  const identified = identifiedFromResult(result);
  const aiDesc = pickAiDisplay(identified.requirementDescription, "", customer.description);
  const aiBg = pickAiDisplay(identified.requirementBackground, "", customer.background);
  const aiDescShown = aiDesc || (customer.description ? "（与上面客户原文一致）" : "");
  const aiBgShown = aiBg || (customer.background ? "（与上面客户原文一致）" : "");

  const blocks: CardElement[] = [];
  if (customer.description) blocks.push(md(`**【客户原始 - 需求描述】**\n${customer.description}`));
  if (customer.background) blocks.push(md(`**【客户原始 - 需求背景】**\n${customer.background}`));
  const hasCustomer = Boolean(customer.description || customer.background);
  const hasAi = Boolean(aiDescShown || aiBgShown);
  if (hasCustomer && hasAi) blocks.push({ tag: "hr" });
  if (aiDescShown) blocks.push(md(`**【AI 总结 - 需求描述】**\n${aiDescShown}`));
  if (aiBgShown) blocks.push(md(`**【AI 总结 - 需求背景】**\n${aiBgShown}`));
  if (options?.operationSteps) {
    if (blocks.length) blocks.push({ tag: "hr" });
    blocks.push(md(`**【操作步骤】**\n${options.operationSteps}`));
  }
  return blocks;
}

function afterFacts(result: PipelineResult, rest: CardElement[]): CardElement[] {
  const summaries = requirementDisplayBlocks(result);
  if (!summaries.length) return rest;
  if (!rest.length) return summaries;
  return [...summaries, { tag: "hr" }, ...rest];
}

function sopSections(result: PipelineResult): SopSections {
  const identified = identifiedFromResult(result);
  const designed = DESIGNED_SOP[result.orderNo];
  return {
    requirementDescription: identified.requirementDescription,
    requirementBackground: identified.requirementBackground,
    operationSteps: designed ? designed.join("\n") : identified.operationSteps || "SOP 生成失败",
  };
}

function sopCardBody(result: PipelineResult): CardElement[] {
  return requirementDisplayBlocks(result, { operationSteps: sopSections(result).operationSteps });
}

export function sceneKeyOf(result: PipelineResult): string {
  return result.matchResult?.sceneKey || result.contextFacts?.sceneKey || "";
}

export function orderCategoryOf(result: PipelineResult): SceneCategory | "" {
  return resolveOrderCategory({
    businessTypeDesc: result.contextFacts?.businessTypeDesc,
    businessType: result.contextFacts?.businessType,
    vaSource: result.contextFacts?.vaSource,
  });
}

export function allSceneCandidates(): SceneCandidate[] {
  return loadScenarioCards().map((card, i) => ({
    index: i + 1,
    sceneKey: card.sceneKey,
    sceneName: shortSceneName(card.sceneName),
  }));
}

export function sceneCandidatesByCategory(category: SceneCategory | ""): SceneCandidate[] {
  const cards = loadScenarioCards().filter((card) => {
    if (!category) return true;
    const cat = String(card.category || "").toLowerCase();
    return cat === category || card.sceneKey.startsWith(`${category}_`);
  });
  return cards.map((card, i) => ({
    index: i + 1,
    sceneKey: card.sceneKey,
    sceneName: shortSceneName(card.sceneName),
  }));
}

function categoryHeading(category: SceneCategory | ""): string {
  if (category === "instock") return "【库内场景】";
  if (category === "outbound") return "【出库场景】";
  return "【入库场景】";
}

function showAllScenesButton(vascNo: string, label = "以上都不对，查看更多场景"): CardAction {
  return {
    tag: "button",
    text: { tag: "plain_text", content: label.slice(0, 80) },
    type: "default",
    name: "show_all_scenes",
    value: { action: "show_all_scenes", vascNo },
  };
}

function degradeNotice(result: PipelineResult): CardElement[] {
  if (!result.llm?.sop?.degraded) return [];
  const reason = asText(result.llm.sop.degradeReason) || "AI 编造了不存在的单号";
  return [
    md(
      `⚠ **注意：** AI 生成的 SOP 中有部分单号被替换为 [待补充]，原因：${reason}。\n请审核员补充正确的单号后再确认。`,
    ),
    { tag: "hr" },
  ];
}

function auditorHintNotice(result: PipelineResult): CardElement[] {
  const hint = formatSkuCheckAuditorHint(result.skuCheckResult);
  if (!hint) return [];
  return [md(`⚠ **请审核人员关注**\n${hint}`), { tag: "hr" }];
}

function sceneButton(args: {
  vascNo: string;
  sceneKey: string;
  label: string;
  type: "primary" | "default" | "danger";
}): CardAction {
  return {
    tag: "button",
    text: { tag: "plain_text", content: args.label.slice(0, 80) },
    type: args.type,
    name: "scene_select",
    value: {
      action: "confirm_scene",
      sceneKey: args.sceneKey,
      vascNo: args.vascNo,
    },
  };
}

export function buildOmsWriteCancelledCard(args: {
  vascNo: string;
  error: string;
  personnel: DemoPersonnel;
}): FeishuCard {
  const err = args.error || "当前订单不允许写入";
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `⚠ OMS 写入已取消 — ${args.vascNo}` },
      template: "orange",
    },
    elements: [
      md(`⚠ OMS 写入已取消：${err}`),
      md("审核员可能已手动完成审核或已填写 SOP，无需 AI 写入。不要再点「确认写入 OMS」。"),
      md("无需重试。"),
    ],
  };
}

export function buildOmsWriteRetryCard(args: {
  vascNo: string;
  sceneKey: string;
  error: string;
  personnel: DemoPersonnel;
  remainingManual: number;
}): FeishuCard {
  const exhausted = args.remainingManual <= 0;
  const err = args.error || "未知错误";
  const intro = exhausted
    ? `❌ OMS 写入连续失败：${err}。请联系开发排查。`
    : `❌ OMS 写入失败：${err}。还可重试 ${args.remainingManual} 次。`;
  const elements: CardElement[] = [
    md(intro),
    md(exhausted ? "请联系开发排查。" : "请重试写入 OMS。"),
  ];
  if (!exhausted) {
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { tag: "plain_text", content: "🔄 重试写入 OMS" },
          type: "primary",
          name: "sop_write",
          value: { action: "retry_sop_write", vascNo: args.vascNo, sceneKey: args.sceneKey },
        },
      ],
    });
  }
  return {
    config: { wide_screen_mode: true },
    header: {
      title: {
        tag: "plain_text",
        content: exhausted ? `❌ 写入失败需排查 — ${args.vascNo}` : `❌ 写入失败请重试 — ${args.vascNo}`,
      },
      template: "red",
    },
    elements,
  };
}

function skipCompletenessButton(result: PipelineResult): CardAction {
  return {
    tag: "button",
    text: { tag: "plain_text", content: "✅ 信息已齐全，直接生成 SOP" },
    type: "primary",
    name: "skip_completeness",
    value: { action: "skip_completeness", vascNo: result.orderNo, sceneKey: sceneKeyOf(result) },
  };
}

function sceneWrongButton(result: PipelineResult): CardAction {
  return {
    tag: "button",
    text: { tag: "plain_text", content: "🔄 场景不对，重新选择" },
    type: "danger",
    name: "scene_wrong",
    value: { action: "scene_wrong", vascNo: result.orderNo, sceneKey: sceneKeyOf(result) },
  };
}

export function buildSopGenerateErrorCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  const err = asText(result.llm?.error) || "SOP 生成失败";
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `❌ SOP 生成失败 — ${result.orderNo}` },
      template: "red",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      ...auditorHintNotice(result),
      ...afterFacts(result, [
        md(`**这不是场景不确定。** SOP 生成失败，请人工撰写 SOP。\n\n原因：${err}`),
        md("请人工撰写 SOP。"),
      ]),
      ...judgmentFooter(result),
    ],
  };
}

export function buildSopCard(
  result: PipelineResult,
  personnel: DemoPersonnel,
  options?: { revised?: boolean; revision?: number; writeError?: string; dryRun?: boolean; missingOmsScene?: boolean },
): FeishuCard {
  const titleSuffix = options?.revised
    ? options.revision && options.revision > 1
      ? `（修订版 ${options.revision}）`
      : "（修订版）"
    : "";
  const missingOmsScene =
    options?.missingOmsScene ||
    needsOmsSceneConfirm({
      sceneKey: result.matchResult?.sceneKey,
      decision: result.matchResult?.decision,
      outputPath: result.outputPath || "sop_generated",
      riskFlags: result.riskFlags,
    });
  const notice = options?.writeError
    ? `⚠ SOP 已生成，但写入 OMS 失败：${options.writeError}。请审核员在 OMS 页面手工填写，或点下方重试。`
    : options?.dryRun
      ? `SOP 已生成。本机未打开 OMS 真写，审核信息还没进 OMS。打开写入开关后才会写入。`
      : missingOmsScene
        ? `AI 已将 SOP 写入 OMS（增值单号 ${result.orderNo}），未选择场景概述。`
        : `AI 已将 SOP 写入 OMS（增值单号 ${result.orderNo}），请审核员在 OMS 页面检查修改。`;
  const elements: CardElement[] = [
    md(factsBlock(result)),
    { tag: "hr" },
    ...auditorHintNotice(result),
    ...degradeNotice(result),
    ...sopCardBody(result),
    { tag: "hr" },
    md(notice),
    ...(missingOmsScene && !options?.writeError ? [md(missingOmsSceneNotice(result))] : []),
    md("请在 OMS 检查修改。"),
  ];
  if (options?.writeError) {
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { tag: "plain_text", content: "🔄 重试写入 OMS" },
          type: "primary",
          name: "sop_write",
          value: { action: "retry_sop_write", vascNo: result.orderNo, sceneKey: sceneKeyOf(result) },
        },
      ],
    });
  }
  elements.push(...judgmentFooter(result));
  return {
    config: { wide_screen_mode: true },
    header: {
      title: {
        tag: "plain_text",
        content: options?.writeError
          ? `⚠ SOP 待写入 OMS — ${result.orderNo}${titleSuffix}`
          : options?.dryRun
            ? `✅ SOP 已生成（未写 OMS）— ${result.orderNo}${titleSuffix}`
            : `✅ AI 已写入 OMS — ${result.orderNo}${titleSuffix}`,
      },
      template: options?.writeError ? "orange" : "green",
    },
    elements,
  };
}

export function buildAttachmentPendingCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  const attachments = (result.missingAttachments || []).filter(Boolean);
  const list = attachments.length
    ? attachments.map((item) => `❌ ${item}（未上传）`).join("\n")
    : "❌ 场景所需附件未上传";
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `⚠ 附件未提交 — ${result.orderNo}` },
      template: "orange",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      ...auditorHintNotice(result),
      ...afterFacts(result, [
        md("SOP 已按现有信息生成并写入 OMS。缺的附件在 SOP 里用 [待补充：附件名] 占位。"),
        md(list),
        md(
          `${atSalesAndCs(personnel, "请联系客户补充以上附件。")}\n可先在 OMS 检查已写入的 SOP。`,
        ),
      ]),
      ...judgmentFooter(result),
    ],
  };
}

export function buildClarificationCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  const attachmentsOnly =
    (result.missingAttachments || []).length > 0 &&
    !(result.missingRequirementItems || []).filter(Boolean).length &&
    result.outputPath === "sop_generated";
  if (attachmentsOnly) return buildAttachmentPendingCard(result, personnel);
  const sceneName = shortSceneName(result.matchResult?.scenarioName || result.contextFacts?.sceneName || "");
  const card = findScenarioCard(result.matchResult?.sceneKey || "");
  const missingInfo = (result.missingRequirementItems || []).filter(Boolean);
  const missingAttachments = (result.missingAttachments || []).filter(Boolean);
  const missingFields = (result.missingFields || []).filter(
    (item) => item && !missingAttachments.includes(item) && !missingInfo.includes(item),
  );
  const lines: string[] = [];
  for (const item of missingInfo) {
    const fieldName = item.replace(/未说明$/, "");
    const spec = card?.requiredInfoFields?.find((f) => f.field === fieldName);
    const extra = spec?.description ? `（本场景需要知道${spec.description}）` : "";
    lines.push(`❓ ${item}${extra}`);
  }
  for (const item of missingAttachments) {
    lines.push(`❌ ${item}（未上传）`);
  }
  for (const item of missingFields) {
    lines.push(`❌ ${item}`);
  }
  if (!lines.length) {
    for (const item of (result.missing || []).filter(Boolean)) lines.push(`❌ ${item}`);
  }
  const missingBlock = lines.length ? lines.join("\n") : "❓ 请补充需求描述，说明仓库要做什么";
  const mention = atSalesAndCs(personnel, "请联系客户补充以上需求。补充后 AI 会重新生成。");
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `⚠ 需求不清晰 — ${result.orderNo}` },
      template: "orange",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      ...auditorHintNotice(result),
      ...afterFacts(result, [
        ...(sceneName ? [md(`场景识别：${sceneName}`)] : []),
        ...(providedAttachmentsBlock(result) ? [md(providedAttachmentsBlock(result))] : []),
        md("以下信息需要补充："),
        md(missingBlock),
        md(mention || "请联系客户补充以上需求。"),
      ]),
      ...judgmentFooter(result),
    ],
  };
}

export function buildRequirementClarificationCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  const missing = (result.missingRequirementItems || result.missing || []).filter(Boolean);
  const prompts = result.clarificationPrompts || [];
  const missingBlock = missing.length
    ? missing
        .map((item, i) => {
          const hint = prompts[i] ? `（${prompts[i]}）` : "";
          return `❓ ${item}${hint}`;
        })
        .join("\n")
    : "❓ 客户需求描述不够完整";
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `⚠ 需求不清晰 — ${result.orderNo}` },
      template: "orange",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      ...afterFacts(result, [
        md("**客户需求描述不够完整，以下信息需要补充：**"),
        ...(providedAttachmentsBlock(result) ? [md(providedAttachmentsBlock(result))] : []),
        md(missingBlock),
        { tag: "hr" },
        md(
          `${atSalesAndCs(personnel, "请联系客户补充以上需求信息。")}\n补充后 AI 将重新识别场景并生成 SOP。`,
        ),
      ]),
      ...judgmentFooter(result),
    ],
  };
}

export function buildAskCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  if (result.outputPath === "needs_requirement_clarification") {
    return buildRequirementClarificationCard(result, personnel);
  }
  return buildClarificationCard(result, personnel);
}

/** Alias: orange L2.5 completeness card. */
export function buildSceneCompletenessCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  return buildClarificationCard(result, personnel);
}

export function buildSceneConfirmCard(
  result: PipelineResult,
  personnel: DemoPersonnel,
  candidates: SceneCandidate[],
): FeishuCard {
  let list = candidates.length ? candidates : collectSceneCandidates(result.matchResult);
  const situation: "A" | "B" = list.length ? "A" : "B";
  if (!list.length) list = allSceneCandidates();

  const hint = businessSceneHint(result);

  const intro =
    situation === "A"
      ? ["AI 识别到可能的场景但不够确定：", hint, "请选择本单属于哪个场景："]
          .filter(Boolean)
          .join("\n")
      : "AI 未能识别到匹配的场景。请选择或确认转人工：";

  const extra =
    result.orderNo === "VASC000000326061"
      ? ["异常类型：包裹内出现订单外商品"]
      : result.orderNo === "VASC000000360654"
        ? ["需求提到：海运整柜 100%A+ 包裹，扫描外箱条码按新单上架"]
        : [];

  const recommendButtons: CardAction[] = list.map((item, i) =>
    sceneButton({
      vascNo: result.orderNo,
      sceneKey: item.sceneKey,
      label: situation === "A" && i === 0 ? `${shortSceneName(item.sceneName)}（AI 推荐）` : shortSceneName(item.sceneName),
      type: situation === "A" && i === 0 ? "primary" : "default",
    }),
  );
  const extraActions: CardElement[] = [];
  extraActions.push({ tag: "action", actions: [showAllScenesButton(result.orderNo)] });
  extraActions.push({
    tag: "action",
    actions: [
      sceneButton({
        vascNo: result.orderNo,
        sceneKey: "transfer_human",
        label: "确认转人工，不走智能审核",
        type: "danger",
      }),
    ],
  });

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `🔄 增值单 AI 预审 — ${result.orderNo}` },
      template: "blue",
    },
    elements: [
      md(factsBlock(result, extra, situation === "B")),
      { tag: "hr" },
      ...afterFacts(result, [md(intro), ...chunkActions(recommendButtons, 2), ...extraActions]),
      ...judgmentFooter(result),
    ],
  };
}

export function buildAllScenesCard(
  result: PipelineResult,
  personnel: DemoPersonnel,
  category?: SceneCategory | "",
): FeishuCard {
  const cat = category || orderCategoryOf(result) || "inbound";
  const scenes = sceneCandidatesByCategory(cat);
  const buttons = scenes.map((item) =>
    sceneButton({
      vascNo: result.orderNo,
      sceneKey: item.sceneKey,
      label: shortSceneName(item.sceneName),
      type: "default",
    }),
  );
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `🔄 请选择正确的场景 — ${result.orderNo}` },
      template: "blue",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      md(`请选择正确的场景：\n\n${categoryHeading(cat)}`),
      ...chunkActions(buttons, 2),
      {
        tag: "action",
        actions: [
          sceneButton({
            vascNo: result.orderNo,
            sceneKey: "transfer_human",
            label: "以上都没有，确认转人工",
            type: "danger",
          }),
        ],
      },
      md("请选择。"),
    ],
  };
}

export function buildSceneSearchSingleCard(args: {
  vascNo: string;
  scene: SceneCandidate;
  personnel: DemoPersonnel;
}): FeishuCard {
  const name = shortSceneName(args.scene.sceneName);
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `🔍 找到匹配场景 — ${args.vascNo}` },
      template: "blue",
    },
    elements: [
      md(`🔍 找到匹配场景：\n**${name}**`),
      {
        tag: "action",
        actions: [
          sceneButton({
            vascNo: args.vascNo,
            sceneKey: args.scene.sceneKey,
            label: "✅ 确认是这个场景",
            type: "primary",
          }),
          showAllScenesButton(args.vascNo, "❌ 不是，继续找"),
        ],
      },
      md("请确认。"),
    ],
  };
}

export function buildSceneSearchMultiCard(args: {
  vascNo: string;
  scenes: SceneCandidate[];
  personnel: DemoPersonnel;
}): FeishuCard {
  const buttons = args.scenes.map((item) =>
    sceneButton({
      vascNo: args.vascNo,
      sceneKey: item.sceneKey,
      label: shortSceneName(item.sceneName),
      type: "default",
    }),
  );
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `🔍 找到 ${args.scenes.length} 个可能的场景 — ${args.vascNo}` },
      template: "blue",
    },
    elements: [
      md(`🔍 找到 ${args.scenes.length} 个可能的场景：`),
      ...chunkActions(buttons, 2),
      {
        tag: "action",
        actions: [showAllScenesButton(args.vascNo, "以上都不是")],
      },
      md("请选择。"),
    ],
  };
}

export function buildSceneConfirmedUpdateCard(
  originalCard: FeishuCard,
  confirmedScene: string,
  confirmedBy: string,
  operatorOpenId?: string,
): FeishuCard {
  const sceneLabel = sceneNameOf(confirmedScene);
  const line =
    confirmedScene === "transfer_human"
      ? `🔄 已转人工处理（由 ${confirmedBy} 确认）`
      : `✅ 已确认场景：${sceneLabel}（由 ${confirmedBy} 确认）`;
  const elements = originalCard.elements.filter((el) => el.tag !== "action" && el.tag !== "note");
  const card: FeishuCard = {
    config: originalCard.config || { wide_screen_mode: true },
    header: {
      ...originalCard.header,
      template: confirmedScene === "transfer_human" ? "blue" : "green",
    },
    elements: [...elements, md(line)],
  };
  if (operatorOpenId) card.open_ids = [operatorOpenId];
  return card;
}

function replaceActionsWithStatus(originalCard: FeishuCard, line: string, template?: FeishuCard["header"]["template"]): FeishuCard {
  const elements = originalCard.elements.filter((el) => el.tag !== "action" && el.tag !== "note");
  return {
    config: originalCard.config || { wide_screen_mode: true },
    header: {
      ...originalCard.header,
      template: template || originalCard.header.template,
    },
    elements: [...elements, md(line)],
  };
}

export function buildSopActionUpdateCard(args: {
  originalCard: FeishuCard;
  kind: "sop_written" | "write_failed" | "write_cancelled" | "sop_needs_edit" | "sop_edit_exhausted";
  confirmedBy: string;
  dryRun?: boolean;
  error?: string;
  operatorOpenId?: string;
}): FeishuCard {
  let line = "";
  let template: FeishuCard["header"]["template"] = "green";
  if (args.kind === "sop_written") {
    const mode = args.dryRun ? "（dry-run 模式）" : "";
    line = `✅ SOP 已写入 OMS 草稿${mode}（由 ${args.confirmedBy} 确认）。请在 OMS 中人工点击审核通过。`;
  } else if (args.kind === "write_cancelled") {
    line = `⚠ OMS 写入已取消：${args.error || "当前订单不允许写入"}`;
    template = "orange";
  } else if (args.kind === "write_failed") {
    line = `❌ OMS 写入失败：${args.error || "未知错误"}。请手动操作。`;
    template = "red";
  } else if (args.kind === "sop_edit_exhausted") {
    line = `已修改 3 次仍不满意，转人工处理（由 ${args.confirmedBy} 确认）。`;
    template = "red";
  } else {
    line = `✏️ 审核员标记 SOP 需修改（由 ${args.confirmedBy} 确认）。请在话题中说明修改意见，AI 将根据意见重新生成。`;
    template = "orange";
  }
  const card = replaceActionsWithStatus(args.originalCard, line, template);
  if (args.operatorOpenId) card.open_ids = [args.operatorOpenId];
  return card;
}

export function buildCanaryPromoteCard(args: { count: number; orderNos?: string[] }): FeishuCard {
  const nos = (args.orderNos || []).filter(Boolean);
  const list = nos.length ? nos.map((no) => `- ${no}`).join("\n") : "（见测试群刚发出的卡片）";
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `金丝雀 ${args.count} 单已跑完` },
      template: "orange",
    },
    elements: [
      md(
        [
          formatCanaryDoneCopy(args.count),
          "",
          "**测试群里的单：**",
          list,
          "",
          "有问题就不要点，自己先修。",
        ].join("\n"),
      ),
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "✅ 没问题，切到正式群" },
            type: "primary",
            name: "canary_promote",
            value: { action: "canary_promote", count: String(args.count) },
          },
        ],
      },
    ],
  };
}

function formatCanaryDoneCopy(count: number): string {
  return `请先看测试群。没问题就点下面按钮：这 ${count} 单会再发到正式群，之后新单也进正式群。`;
}

export function buildCanaryPromotedUpdateCard(args: {
  sent: number;
  skipped: number;
  failed: number;
  already?: boolean;
}): FeishuCard {
  if (args.already) {
    return {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: "已经切到正式群" },
        template: "green",
      },
      elements: [md("已经切过了，不用再点。新单会在下一轮轮询进正式群（最多约 10 分钟）。")],
    };
  }
  const bits = [`已切到正式群。补发成功 ${args.sent} 单`];
  if (args.skipped) bits.push(`跳过 ${args.skipped} 单（没有存下卡片）`);
  if (args.failed) bits.push(`失败 ${args.failed} 单，看 poll.log 的 canary_replay_error`);
  bits.push("新单会在下一轮轮询进正式群（最多约 10 分钟）。");
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "已切到正式群" },
      template: "green",
    },
    elements: [md(bits.join("。"))],
  };
}

export function parseCardActionValue(raw: unknown): Record<string, string> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v != null) out[k] = String(v);
    }
    return out;
  }
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseCardActionValue(parsed);
  } catch {
    return { raw };
  }
}
