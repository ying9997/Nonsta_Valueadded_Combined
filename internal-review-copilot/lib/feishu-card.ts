import { asText } from "./oms-adapter.ts";
import { collectSceneCandidates } from "./parse-scene-reply.ts";
import { findScenarioCard, loadScenarioCards } from "./scenario-cards.ts";
import { composeIdentifiedSummaries, type SopSections } from "./sop-sections.ts";
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

const DEMO_CUSTOMERS: Record<string, { code: string; name: string }> = {
  VASC000000315774: { code: "DEMO_CUST001", name: "××科技有限公司（脱敏）" },
  VASC000000298617: { code: "DEMO_CUST002", name: "××贸易有限公司（脱敏）" },
  VASC000000326061: { code: "DEMO_CUST003", name: "××供应链有限公司（脱敏）" },
};

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

export function shortSceneName(sceneName: string): string {
  return sceneName
    .replace(/^【入库】/, "")
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
  const demo = DEMO_CUSTOMERS[result.orderNo];
  if (demo) return `客户：${demo.code} / ${demo.name}`;
  const code = result.contextFacts?.customerCode || "";
  const name = result.contextFacts?.customerName || "未填写";
  return code ? `客户：${code} / ${name}` : `客户：${name}`;
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

function sceneLine(result: PipelineResult): string {
  const name = result.matchResult?.scenarioName || result.contextFacts?.sceneName || "";
  return name ? `场景识别：${shortSceneName(name)}` : "";
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

function factsBlock(result: PipelineResult, extra: string[] = []): string {
  return [
    orderNoLine(result),
    customerLine(result),
    warehouseLine(result),
    exceptionLine(result),
    inboundOrderLine(result),
    sceneLine(result),
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

export function demoTopicTitle(outputPath: string, orderNo: string): string {
  return `${orderNo} 增值单-智能审核请关注`;
}

function originalRequirementOf(result: PipelineResult): string {
  return (
    asText(result.contextFacts?.providedFields?.VAS_ATTR_REL_RD) ||
    asText(result.contextFacts?.providedFields?.["需求描述"]) ||
    asText(result.agentInput?.omsFacts?.customerRequirementDescription)
  );
}

function identifiedFromResult(result: PipelineResult): SopSections {
  return composeIdentifiedSummaries({
    llm: result.llm,
    aiGeneratedText: result.llm?.text,
    analysis: result.analysis,
    providedFields: result.contextFacts?.providedFields,
    originalRequirement: originalRequirementOf(result),
    allEventNos: result.contextFacts?.allEventNos,
    eventNo: result.contextFacts?.eventNo,
    allBusinessOrderNos: result.contextFacts?.allBusinessOrderNos,
    businessOrderNo: result.contextFacts?.businessOrderNo,
    customerRequirementDescription: asText(result.agentInput?.omsFacts?.customerRequirementDescription),
  });
}

function aiSummaryBlocks(result: PipelineResult, forceL1 = false): CardElement[] {
  const sections = identifiedFromResult(result);
  const description =
    sections.requirementDescription ||
    (forceL1 ? originalRequirementOf(result) || "客户需求描述不够完整，无法提炼。" : "");
  const background = sections.requirementBackground;
  const blocks: CardElement[] = [];
  if (description) {
    blocks.push(md(`**【AI 总结 - 需求描述】**\n${description}`));
  }
  if (background) {
    blocks.push(md(`**【AI 总结 - 需求背景】**\n${background}`));
  }
  return blocks;
}

function afterFacts(result: PipelineResult, rest: CardElement[], forceL1 = false): CardElement[] {
  const summaries = aiSummaryBlocks(result, forceL1);
  if (!summaries.length) return rest;
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

function sopCardBody(sections: SopSections): CardElement[] {
  const blocks: CardElement[] = [];
  if (sections.requirementDescription) {
    blocks.push(md(`**【AI 总结 - 需求描述】**\n${sections.requirementDescription}`));
  }
  if (sections.requirementBackground) {
    blocks.push(md(`**【AI 总结 - 需求背景】**\n${sections.requirementBackground}`));
  }
  if (blocks.length) blocks.push({ tag: "hr" });
  blocks.push(md(`**【操作步骤】**\n${sections.operationSteps}`));
  return blocks;
}

export function sceneKeyOf(result: PipelineResult): string {
  return result.matchResult?.sceneKey || result.contextFacts?.sceneKey || "";
}

export function allSceneCandidates(): SceneCandidate[] {
  return loadScenarioCards().map((card, i) => ({
    index: i + 1,
    sceneKey: card.sceneKey,
    sceneName: shortSceneName(card.sceneName),
  }));
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
    md(atReviewerWithCc(args.personnel, exhausted ? "请联系开发排查" : "请重试写入 OMS")),
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

export function buildSopCard(
  result: PipelineResult,
  personnel: DemoPersonnel,
  options?: { revised?: boolean; revision?: number },
): FeishuCard {
  const sceneKey = sceneKeyOf(result);
  const revision = options?.revision || 0;
  const titleSuffix = options?.revised ? (revision > 1 ? `（修订版 ${revision}）` : "（修订版）") : "";
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `✅ 增值单 AI 预审 — ${result.orderNo}${titleSuffix}` },
      template: "green",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      ...sopCardBody(sopSections(result)),
      { tag: "hr" },
      md(atReviewerWithCc(personnel, "请确认")),
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "✅ 确认 SOP 正确，写入 OMS 草稿" },
            type: "primary",
            name: "sop_write",
            value: { action: "confirm_sop_write", vascNo: result.orderNo, sceneKey },
          },
          {
            tag: "button",
            text: { tag: "plain_text", content: "✏️ SOP 需要修改" },
            type: "default",
            name: "sop_write",
            value: { action: "sop_needs_edit", vascNo: result.orderNo },
          },
        ],
      },
      ...judgmentFooter(result),
    ],
  };
}

export function buildClarificationCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  const sales = personnel["销售"];
  const missing = (result.missing || []).filter(Boolean);
  const missingBlock = missing.length
    ? missing.map((item) => `❌ ${item}`).join("\n")
    : "❌ 操作说明附件（拍照要求/SOP 说明）";
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `⚠ 增值单 AI 预审 — ${result.orderNo}` },
      template: "orange",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      ...afterFacts(result, [
        md("以下材料需要补充："),
        md(missingBlock),
        md(`${atPerson(sales, "销售")} 请联系客户补充`),
      ]),
      ...judgmentFooter(result),
    ],
  };
}

export function buildRequirementClarificationCard(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  const sales = personnel["销售"];
  const cs = personnel["客服"] || personnel["审核员"];
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
      title: { tag: "plain_text", content: `❓ 增值单 AI 预审 — ${result.orderNo}` },
      template: "red",
    },
    elements: [
      md(factsBlock(result)),
      { tag: "hr" },
      ...afterFacts(result, [
        md("**客户需求描述不够完整，以下信息需要补充：**"),
        md(missingBlock),
        { tag: "hr" },
        md(
          `${atPerson(sales, "销售")} ${atPerson(cs, "客服")} 请联系客户补充以上需求信息。\n补充后 AI 将重新识别场景并生成 SOP。`,
        ),
      ], true),
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
      ? ["AI 识别到可能的场景但不够确定：", hint, `${atReviewerWithCc(personnel, "请选择本单属于哪个场景：")}`]
          .filter(Boolean)
          .join("\n")
      : ["AI 未能识别到匹配的场景。", `${atReviewerWithCc(personnel, "请选择或人工处理：")}`].join("\n");

  const extra =
    result.orderNo === "VASC000000326061"
      ? ["异常类型：包裹内出现订单外商品"]
      : result.orderNo === "VASC000000360654"
        ? ["需求提到：海运整柜 100%A+ 包裹，扫描外箱条码按新单上架"]
        : [];

  const buttons: CardAction[] = list.map((item, i) =>
    sceneButton({
      vascNo: result.orderNo,
      sceneKey: item.sceneKey,
      label: situation === "A" && i === 0 ? `${shortSceneName(item.sceneName)}（AI 推荐）` : shortSceneName(item.sceneName),
      type: situation === "A" && i === 0 ? "primary" : "default",
    }),
  );
  buttons.push(
    sceneButton({
      vascNo: result.orderNo,
      sceneKey: "transfer_human",
      label: "以上都不是，人工处理",
      type: "danger",
    }),
  );

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `🔄 增值单 AI 预审 — ${result.orderNo}` },
      template: "blue",
    },
    elements: [
      md(factsBlock(result, extra)),
      { tag: "hr" },
      ...afterFacts(result, [md(intro), ...chunkActions(buttons, 2)]),
      ...judgmentFooter(result),
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
  kind: "sop_written" | "write_failed" | "sop_needs_edit" | "sop_edit_exhausted";
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
