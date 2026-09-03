/**
 * Presentation-only runner: real LLM group drafts + L4 SOP.
 *
 * Does not change production runtime (lib/**, experts/**, dry-run harness).
 * Rule gates stay in validate-input → context-bind → check-requirement
 * → match-template → check-completeness → format-output.
 * LLM never overrides outputPath / node / missing* / matchResult.
 *
 *   npx tsx internal-review-copilot/scripts/run-presentation-llm-cases.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { main as validateInput } from "../../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts";
import { bindContext } from "../lib/context-bind.ts";
import { checkRequirement } from "../lib/check-requirement.ts";
import { checkCompleteness } from "../lib/check-completeness.ts";
import { formatOutput } from "../lib/format-output.ts";
import { matchTemplate } from "../lib/match-template.ts";
import { asArray, asRecord, asText, buildAgentInput } from "../lib/oms-adapter.ts";
import type {
  AgentInput,
  CompletenessResult,
  ContextFacts,
  MatchResult,
  OutputPath,
  OwnerFacts,
  PipelineNode,
  RequirementCheck,
} from "../lib/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../..");
const inputPath = resolve(here, "../eval/presentation-demo/standard-cases.details.json");
const imPromptPath = resolve(here, "../eval/presentation-demo/llm-im-draft.prompt.md");
const sopPromptPath = resolve(projectRoot, "experts/value-add/nonstandard-sop-guide/prompts/inbound/main.md");
const kbSopPath = resolve(projectRoot, "workspace/knowledge/sop/2.1-inbound-relabel-shelving.md");
const outDir = resolve(projectRoot, "_runs/20260903_presentation_llm_cases");

const FORBIDDEN_PHRASES = ["AI 已审核通过", "AI已审核通过", "自动审核通过"];

type DemoLevel = "L1" | "L2" | "L3" | "L4";

interface DemoMeta {
  orderNo: string;
  demoCase: DemoLevel;
  demoLabel: string;
  expectedOutputPath: OutputPath;
}

interface RuleResult {
  orderNo: string;
  demoCase: DemoLevel;
  demoLabel: string;
  outputPath: OutputPath;
  node: PipelineNode;
  nodesHit: PipelineNode[];
  failureGate: string;
  missingRequirementItems: string[];
  missingAttachments: string[];
  missingFields: string[];
  missing: string[];
  clarificationPrompts: string[];
  matchResult?: MatchResult;
  completenessResult?: CompletenessResult;
  requirementCheck?: RequirementCheck;
  contextFacts?: ContextFacts;
  ownerFacts?: OwnerFacts;
  structured?: ReturnType<typeof formatOutput>["structured"];
  analysis?: string;
  validationMessage?: string;
  agentInput: AgentInput;
}

interface LlmSop {
  requirementBackground: string;
  requirementDescription: string;
  warehouseSop: string;
  sopText: string;
  scenarioName: string;
  fieldsUsed: string[];
  reviewerConfirmHint: string;
  draftDisclaimer: string;
  mocked: false;
  model: string;
}

interface CaseRecord {
  orderNo: string;
  demoCase: DemoLevel;
  demoLabel: string;
  ruleResult: Omit<RuleResult, "agentInput"> & { agentInput?: AgentInput };
  llm: {
    step: "im_draft" | "sop_generate+im_draft";
    model: string;
    groupMessage: string;
    mentionRoles: string[];
    sop?: LlmSop;
  };
}

function loadEnvFiles(): void {
  const candidates = [
    resolve(projectRoot, ".env"),
    resolve(projectRoot, "ai/agentic/experts/.env"),
    resolve(here, "../.env"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] == null) process.env[key] = value;
    }
  }
}

function resolveLlmConfig(): { apiKey: string; baseURL: string; model: string } {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "缺少 OPENAI_API_KEY，无法调用真实 LLM，已停止，未伪造结果。请配置：OPENAI_API_KEY；可选 OPENAI_BASE_URL、OPENAI_MODEL。",
    );
  }
  const rawBase = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const baseURL = rawBase.endsWith("/v1") ? rawBase : `${rawBase}/v1`;
  const model = (process.env.OPENAI_MODEL || process.env.OPENAI_MODEL_EP || "claude-sonnet-4-5").trim();
  return { apiKey, baseURL, model };
}

function extractFirstJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const source = fenced?.[1] || text;
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
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
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

async function callChat(
  config: { apiKey: string; baseURL: string; model: string },
  messages: Array<{ role: "system" | "user"; content: string }>,
  jsonMode = false,
): Promise<string> {
  const url = `${config.baseURL}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.2,
    max_tokens: 1600,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`LLM API error ${response.status}: ${raw.slice(0, 400)}`);
  }
  const data = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  if (!content) throw new Error("LLM 返回空内容，未伪造结果。");
  return content;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function demoMeta(detail: ReturnType<typeof asRecord>): DemoMeta {
  return {
    orderNo: asText(detail.orderNo),
    demoCase: asText(detail.demoCase) as DemoLevel,
    demoLabel: asText(detail.demoLabel),
    expectedOutputPath: asText(detail.expectedOutputPath) as OutputPath,
  };
}

function mentionRolesForPath(path: OutputPath): string[] {
  if (path === "needs_requirement_clarification" || path === "needs_field_clarification") {
    return ["customerService", "sales", "submitter"];
  }
  if (path === "transfer_human" || path === "sop_generated") return ["reviewers"];
  return [];
}

function roleLabel(roles: string[]): string {
  const map: Record<string, string> = {
    customerService: "客服",
    sales: "销售",
    submitter: "提交人",
    reviewers: "固定审核员",
  };
  return roles.map((role) => map[role] || role).join(" / ") || "（未指定）";
}

function uploadedSummary(input: AgentInput, context?: ContextFacts): string[] {
  const files = input.omsFacts.uploadedFiles.map((file) => `${file.label || file.fileType}（${file.fileName}）`);
  if (files.length) return files;
  const fromStatus = Object.entries(context?.attachmentStatus || input.omsFacts.attachmentStatus)
    .filter(([, status]) => status === "uploaded")
    .map(([name]) => name);
  return fromStatus;
}

function fieldSummary(input: AgentInput): Array<{ name: string; value: string }> {
  const labels: Record<string, string> = {
    BEOR: "需求背景说明",
    VAS_ATTR_REL_RD: "需求描述",
    VAS_ATTR_REL_NWEON: "上架入库单号",
    NSVASTN: "非标增值来源单号",
  };
  return Object.entries(input.providedFields)
    .filter(([, value]) => asText(value))
    .map(([key, value]) => ({ name: labels[key] || key, value: asText(value) }));
}

async function runRules(detail: ReturnType<typeof asRecord>): Promise<RuleResult | null> {
  const meta = demoMeta(detail);
  const built = buildAgentInput(detail);
  if (!built) return null;

  const nodesHit: PipelineNode[] = [];
  const orderNo = built.input.vascNo;

  nodesHit.push("validate-input");
  const validation = await validateInput({ params: built.input as unknown as Record<string, unknown> });
  const validationResult = asRecord(validation.validationResult);
  if (validationResult.ok === false && asText(validationResult.reason) !== "missing_intent") {
    return {
      ...meta,
      orderNo,
      outputPath: "invalid_input",
      node: "validate-input",
      nodesHit,
      failureGate: "validate-input",
      missingRequirementItems: [],
      missingAttachments: [],
      missingFields: [],
      missing: [],
      clarificationPrompts: [],
      validationMessage: asText(validationResult.message),
      agentInput: built.input,
    };
  }

  nodesHit.push("context-bind");
  const { contextFacts, ownerFacts } = bindContext(built.input);

  nodesHit.push("check-requirement");
  const requirement = checkRequirement(built.input.customerIntent, contextFacts);
  if (!requirement.complete) {
    const formatted = formatOutput({
      outputPath: "needs_requirement_clarification",
      node: "check-requirement",
      contextFacts,
      ownerFacts,
      requirement,
    });
    return {
      ...meta,
      orderNo,
      outputPath: "needs_requirement_clarification",
      node: "check-requirement",
      nodesHit,
      failureGate: "check-requirement",
      missingRequirementItems: requirement.missingRequirementItems,
      missingAttachments: [],
      missingFields: [],
      missing: requirement.missingRequirementItems,
      clarificationPrompts: requirement.clarificationPrompts,
      requirementCheck: requirement,
      contextFacts,
      ownerFacts,
      structured: formatted.structured,
      analysis: formatted.analysis,
      agentInput: built.input,
    };
  }

  nodesHit.push("match-template");
  const matchResult = matchTemplate(requirement.normalizedRequirement, contextFacts);
  if (!matchResult.supported) {
    const formatted = formatOutput({
      outputPath: "transfer_human",
      node: "match-template",
      contextFacts,
      ownerFacts,
      requirement,
      matchResult,
    });
    return {
      ...meta,
      orderNo,
      outputPath: "transfer_human",
      node: "match-template",
      nodesHit,
      failureGate: "match-template",
      missingRequirementItems: [],
      missingAttachments: [],
      missingFields: [],
      missing: [],
      clarificationPrompts: [],
      requirementCheck: requirement,
      matchResult,
      contextFacts,
      ownerFacts,
      structured: formatted.structured,
      analysis: formatted.analysis,
      agentInput: built.input,
    };
  }

  nodesHit.push("check-completeness");
  const completeness = checkCompleteness(contextFacts, matchResult);
  if (!completeness.complete) {
    const formatted = formatOutput({
      outputPath: "needs_field_clarification",
      node: "check-completeness",
      contextFacts,
      ownerFacts,
      requirement,
      matchResult,
      completeness,
    });
    return {
      ...meta,
      orderNo,
      outputPath: "needs_field_clarification",
      node: "check-completeness",
      nodesHit,
      failureGate: "check-completeness",
      missingRequirementItems: [],
      missingAttachments: completeness.missingAttachments,
      missingFields: completeness.missingFields.map((item) => item.field),
      missing: completeness.missingFields.map((item) => item.field),
      clarificationPrompts: completeness.missingFields.map((item) => item.clarificationPrompt),
      requirementCheck: requirement,
      matchResult,
      completenessResult: completeness,
      contextFacts,
      ownerFacts,
      structured: formatted.structured,
      analysis: formatted.analysis,
      agentInput: built.input,
    };
  }

  nodesHit.push("format-output");
  const formatted = formatOutput({
    outputPath: "sop_generated",
    node: "format-output",
    contextFacts,
    ownerFacts,
    requirement,
    matchResult,
    completeness,
  });
  return {
    ...meta,
    orderNo,
    outputPath: "sop_generated",
    node: "format-output",
    nodesHit,
    failureGate: "",
    missingRequirementItems: [],
    missingAttachments: [],
    missingFields: [],
    missing: [],
    clarificationPrompts: [],
    requirementCheck: requirement,
    matchResult,
    completenessResult: completeness,
    contextFacts,
    ownerFacts,
    structured: formatted.structured,
    analysis: formatted.analysis,
    agentInput: built.input,
  };
}

function judgmentFacts(rule: RuleResult): string {
  if (rule.outputPath === "needs_requirement_clarification") {
    return `需求不完整，停在 L1 / check-requirement。缺失：${rule.missingRequirementItems.join("、") || "客户需求要素"}。未进入 match-template，不生成 SOP。`;
  }
  if (rule.outputPath === "transfer_human") {
    const reason = rule.matchResult?.reason || "unsupported";
    return `需求描述已完整，但当前模板库只自动支持 F-001。match-template decision=${rule.matchResult?.decision || "unsupported"}，reason=${reason}。停在 L2，不套 F-001/A/B，不生成 SOP，转人工审核并记为后续模板候选。`;
  }
  if (rule.outputPath === "needs_field_clarification") {
    return `已识别 F-001（${rule.matchResult?.scenarioName || "尺重/标签辨识后换标上架"}），但附件/字段不齐。停在 L3 / check-completeness。缺失：${[...rule.missingAttachments, ...rule.missingFields].join("、")}。不生成 SOP。`;
  }
  if (rule.outputPath === "sop_generated") {
    return `F-001 信息齐全，可生成 SOP 草稿供固定审核员确认。确认不等于审核通过。AI 不自动审核。`;
  }
  return rule.analysis || "输入无法进入内部审核链路。";
}

function allowedFactBlob(rule: RuleResult): string {
  const input = rule.agentInput;
  const ctx = rule.contextFacts;
  return JSON.stringify(
    {
      增值单号: rule.orderNo,
      停留层级: rule.demoCase,
      规则节点: rule.node,
      outputPath: rule.outputPath,
      仓库: [ctx?.warehouseName, ctx?.warehouseCode].filter(Boolean).join(" / "),
      需求背景说明: input.omsFacts.requirementBackground || "未填写",
      需求描述: input.omsFacts.customerRequirementDescription || "未填写",
      已提交字段: fieldSummary(input),
      已上传附件: uploadedSummary(input, ctx),
      未上传附件: Object.entries(ctx?.attachmentStatus || {})
        .filter(([, status]) => status === "missing")
        .map(([name]) => name),
      异常单: ctx?.allEventNos || [],
      入库单: ctx?.allBusinessOrderNos || [],
      提交人: input.responsiblePeople.submittedBy || "未填写",
      规则缺失项: rule.missing,
      澄清提示: rule.clarificationPrompts,
      matchResult: rule.matchResult
        ? {
            decision: rule.matchResult.decision,
            supported: rule.matchResult.supported,
            sceneKey: rule.matchResult.sceneKey,
            scenarioName: rule.matchResult.scenarioName,
            reason: rule.matchResult.reason,
            candidateTemplate: rule.matchResult.candidateTemplate,
          }
        : null,
      AI当前判断: judgmentFacts(rule),
      需要谁处理: roleLabel(mentionRolesForPath(rule.outputPath)),
    },
    null,
    2,
  );
}

async function generateImDraft(config: ReturnType<typeof resolveLlmConfig>, rule: RuleResult, extra = ""): Promise<string> {
  const system = readFileSync(imPromptPath, "utf8");
  const user = [
    "请根据下面的规则结果写群消息。只能使用这些事实。",
    allowedFactBlob(rule),
    extra,
  ]
    .filter(Boolean)
    .join("\n\n");
  return callChat(config, [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

function sectionOf(sopText: string, title: string): string {
  const re = new RegExp(`【${title}】\\s*([\\s\\S]*?)(?=【|$)`);
  return (sopText.match(re)?.[1] || "").trim();
}

function allowedTokens(rule: RuleResult): string[] {
  const input = rule.agentInput;
  const ctx = rule.contextFacts;
  const tokens = [
    rule.orderNo,
    ctx?.warehouseCode,
    ctx?.warehouseName,
    ctx?.customerCode,
    ctx?.customerName,
    ...(ctx?.allEventNos || []),
    ...(ctx?.allBusinessOrderNos || []),
    input.omsFacts.requirementBackground,
    input.omsFacts.customerRequirementDescription,
    ...Object.values(input.providedFields),
    ...input.omsFacts.uploadedFiles.flatMap((file) => [file.fileName, file.label]),
    "操作说明附件",
    "商品和标签的对应关系",
    "标签文件",
    "尺重",
    "绿标",
    "SKU",
  ].flatMap((value) => asText(value).split(/[\s，。；、/\n]+/));
  return [...new Set(tokens.map((item) => item.trim()).filter((item) => item.length >= 4))];
}

function looksInvented(text: string, rule: RuleResult): string[] {
  const allowed = new Set(allowedTokens(rule).map((item) => item.toUpperCase()));
  const hits = text.match(/\b(?:VASC|WI|EB)[A-Z0-9]+\b/g) || [];
  return [...new Set(hits.filter((token) => !allowed.has(token.toUpperCase())))];
}

function assertNoForbidden(text: string, label: string): void {
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.includes(phrase)) throw new Error(`${label} 含禁止表述：${phrase}`);
  }
  if (/AI.{0,8}审核通过/.test(text)) throw new Error(`${label} 含禁止表述：AI 审核通过`);
}

async function generateL4Sop(config: ReturnType<typeof resolveLlmConfig>, rule: RuleResult): Promise<LlmSop> {
  const template = readFileSync(sopPromptPath, "utf8");
  const kb = readFileSync(kbSopPath, "utf8");
  const input = rule.agentInput;
  const match = rule.matchResult;
  const provided = {
    ...input.providedFields,
    uploadedFiles: input.omsFacts.uploadedFiles,
    attachmentStatus: input.omsFacts.attachmentStatus,
    eventNo: input.pageContext.eventNo,
    businessOrderNo: input.pageContext.businessOrderNo,
    warehouseCode: input.pageContext.warehouseCode,
    warehouseName: input.pageContext.warehouseName,
  };
  const filled = fillTemplate(template, {
    customerIntent: input.customerIntent,
    "matchResult.scenarioId": match?.scenarioId || "inbound_label_identify",
    "matchResult.scenarioName": match?.scenarioName || "【入库】尺重/标签辨识后换标上架",
    "sopInput.providedFields": JSON.stringify(provided, null, 2),
    "sopInput.exceptionCode": input.pageContext.eventNo || "",
    "sopInput.exceptionName": "",
    kbSopTemplates: kb,
  });
  const addendum = [
    "",
    "## 内部审核演示附加约束（不改变上面的 SOP 写法）",
    "- 输入是脱敏 F-001 完整样例，无真实客户 PII。",
    "- 只引用已提供的异常单、入库单、附件文件名和需求原文，不得编造 SKU / 条码 / 数量。",
    "- JSON 额外增加 requirementBackground、requirementDescription、warehouseSop。",
    "- requirementDescription 必须来自已提交「需求描述」原文，可略作整理，不得加新事实。",
    "- 不要写「审核通过」或「AI 已审核通过」。",
    "- SOP 草稿仅供审核员确认，不等于审核通过。",
  ].join("\n");

  const raw = await callChat(
    config,
    [{ role: "user", content: `${filled}${addendum}` }],
    true,
  );
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) throw new Error("L4 SOP 未解析到 JSON，未伪造结果。");
  const parsed = JSON.parse(jsonText) as {
    sopText?: string;
    scenarioName?: string;
    fieldsUsed?: string[];
    requirementBackground?: string;
    requirementDescription?: string;
    warehouseSop?: string;
    notActionable?: boolean;
    reason?: string;
  };
  if (parsed.notActionable) {
    throw new Error(`L4 SOP 被模型判为不可生成：${parsed.reason || "notActionable"}`);
  }
  const sopText = asText(parsed.sopText);
  if (!sopText) throw new Error("L4 SOP sopText 为空，未伪造结果。");
  const invented = looksInvented(sopText, rule);
  if (invented.length) throw new Error(`L4 SOP 编造了输入中没有的单号：${invented.join("、")}`);
  assertNoForbidden(sopText, "L4 SOP");

  const requirementBackground =
    asText(parsed.requirementBackground) || sectionOf(sopText, "需求背景") || input.omsFacts.requirementBackground;
  const requirementDescription =
    asText(parsed.requirementDescription) || input.omsFacts.customerRequirementDescription;
  const warehouseSop = asText(parsed.warehouseSop) || sectionOf(sopText, "操作要求") || sopText;
  const fieldsUsed = Array.isArray(parsed.fieldsUsed) && parsed.fieldsUsed.length
    ? parsed.fieldsUsed.map((item) => String(item))
    : uploadedSummary(input, rule.contextFacts);

  return {
    requirementBackground,
    requirementDescription,
    warehouseSop,
    sopText,
    scenarioName: asText(parsed.scenarioName) || match?.scenarioName || "",
    fieldsUsed,
    reviewerConfirmHint: "请固定审核员确认：以上需求背景、需求描述、仓库 SOP 是否可执行。确认只表示认可草稿内容，不等于审核通过。",
    draftDisclaimer: "SOP 草稿供审核确认，不等于审核通过。AI 不代填事实、不自动审核。",
    mocked: false,
    model: config.model,
  };
}

function wrapL4Message(rule: RuleResult, sop: LlmSop): string {
  const input = rule.agentInput;
  const files = uploadedSummary(input, rule.contextFacts);
  return [
    `【内部审核协作】增值单 ${rule.orderNo}`,
    "",
    "当前停留层级：L4 / format-output（信息齐全，已生成 SOP 草稿）",
    "",
    "需求背景：",
    sop.requirementBackground,
    "",
    "需求描述：",
    sop.requirementDescription,
    "",
    "已提交附件 / 字段摘要：",
    `- 字段：${fieldSummary(input).map((item) => `${item.name}=${item.value}`).join("；") || "无"}`,
    `- 附件：${files.join("、") || "无"}`,
    `- 已引用字段 fieldsUsed：${sop.fieldsUsed.join("、") || "无"}`,
    "",
    "AI 当前判断：已识别 F-001，附件与关键字段齐全，生成仓库 SOP 草稿，提交固定审核员确认。",
    "",
    "需要谁处理：固定审核员",
    "",
    "需要判断什么：请审核员核对草稿是否与客户已提交事实一致、仓库是否可执行。",
    "",
    "仓库 SOP：",
    sop.warehouseSop,
    "",
    "审核员确认提示：",
    sop.reviewerConfirmHint,
    "",
    "边界说明：",
    sop.draftDisclaimer,
  ].join("\n");
}

function assertAcceptance(records: CaseRecord[]): string[] {
  const errors: string[] = [];
  const byLevel = Object.fromEntries(records.map((item) => [item.demoCase, item])) as Record<DemoLevel, CaseRecord>;
  for (const level of ["L1", "L2", "L3", "L4"] as DemoLevel[]) {
    if (!byLevel[level]) errors.push(`缺少 ${level}`);
    else if (!asText(byLevel[level].llm.groupMessage)) errors.push(`${level} 群消息为空`);
  }
  const l1 = byLevel.L1;
  if (l1) {
    if (l1.ruleResult.nodesHit.includes("match-template")) errors.push("L1 不应进入 match-template");
    if (l1.llm.sop) errors.push("L1 不应生成 SOP");
    if (l1.ruleResult.outputPath !== "needs_requirement_clarification") errors.push("L1 outputPath 不符");
  }
  const l2 = byLevel.L2;
  if (l2) {
    if (l2.llm.sop) errors.push("L2 不应生成 SOP");
    if (l2.ruleResult.outputPath !== "transfer_human") errors.push("L2 outputPath 不符");
  }
  const l3 = byLevel.L3;
  if (l3) {
    if (l3.llm.sop) errors.push("L3 不应生成 SOP");
    if (l3.ruleResult.outputPath !== "needs_field_clarification") errors.push("L3 outputPath 不符");
  }
  const l4 = byLevel.L4;
  if (l4) {
    if (!l4.llm.sop || l4.llm.sop.mocked !== false) errors.push("L4 必须是真实 LLM SOP 草稿");
    if (l4.ruleResult.outputPath !== "sop_generated") errors.push("L4 outputPath 不符");
    const sop = l4.llm.sop;
    if (sop) {
      if (!sop.requirementBackground || !sop.requirementDescription || !sop.warehouseSop) {
        errors.push("L4 SOP 缺少需求背景/需求描述/仓库SOP");
      }
      if (!sop.fieldsUsed.length) errors.push("L4 缺少 fieldsUsed");
      if (!sop.reviewerConfirmHint.includes("不等于审核通过")) errors.push("L4 缺少审核员确认提示");
    }
  }
  for (const record of records) {
    try {
      assertNoForbidden(record.llm.groupMessage, `${record.demoCase} 群消息`);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
    const invented = looksInvented(record.llm.groupMessage, {
      ...record.ruleResult,
      agentInput: record.ruleResult.agentInput!,
    } as RuleResult);
    if (invented.length) errors.push(`${record.demoCase} 群消息编造单号：${invented.join("、")}`);
  }
  return errors;
}

function writeOutputs(records: CaseRecord[], config: ReturnType<typeof resolveLlmConfig>, errors: string[]): void {
  mkdirSync(outDir, { recursive: true });
  const payload = records.map((record) => ({
    orderNo: record.orderNo,
    demoCase: record.demoCase,
    demoLabel: record.demoLabel,
    ruleResult: {
      outputPath: record.ruleResult.outputPath,
      node: record.ruleResult.node,
      nodesHit: record.ruleResult.nodesHit,
      failureGate: record.ruleResult.failureGate,
      missingRequirementItems: record.ruleResult.missingRequirementItems,
      missingAttachments: record.ruleResult.missingAttachments,
      missingFields: record.ruleResult.missingFields,
      missing: record.ruleResult.missing,
      clarificationPrompts: record.ruleResult.clarificationPrompts,
      matchResult: record.ruleResult.matchResult
        ? {
            decision: record.ruleResult.matchResult.decision,
            supported: record.ruleResult.matchResult.supported,
            sceneKey: record.ruleResult.matchResult.sceneKey,
            scenarioName: record.ruleResult.matchResult.scenarioName,
            reason: record.ruleResult.matchResult.reason,
            candidateTemplate: record.ruleResult.matchResult.candidateTemplate,
            score: record.ruleResult.matchResult.score,
          }
        : null,
      completenessResult: record.ruleResult.completenessResult || null,
      requirementCheck: record.ruleResult.requirementCheck || null,
      contextFacts: record.ruleResult.contextFacts || null,
      structured: record.ruleResult.structured || null,
    },
    llm: record.llm,
  }));

  writeFileSync(resolve(outDir, "llm-results.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const messages = [
    "# 内部审核 AI 汇报演示 — 真实 LLM 群聊消息",
    "",
    "> 汇报演示材料，不是正式准确率评测。L1–L3 gate 由规则决定，LLM 只生成话术。L4 使用真实 LLM 生成 SOP 草稿。输入为脱敏假单，无真实客户 PII。",
    "",
    ...records.flatMap((record) => [
      `## ${record.demoCase} ${record.demoLabel} · ${record.orderNo}`,
      "",
      `- 规则停留：\`${record.ruleResult.node}\` / \`${record.ruleResult.outputPath}\``,
      `- LLM 步骤：${record.llm.step}`,
      "",
      record.llm.groupMessage.trim(),
      "",
    ]),
  ];
  writeFileSync(resolve(outDir, "presentation-llm-messages.md"), `${messages.join("\n")}\n`, "utf8");

  const summary = [
    "# 汇报演示：真实 LLM 群聊 / SOP（不是正式准确率评测）",
    "",
    "- **性质**：内部审核 AI 应用汇报演示材料。**不是**正式准确率评测，**不是** gold。",
    "- **输入**：`internal-review-copilot/eval/presentation-demo/standard-cases.details.json`（脱敏假 VASC / EB / WI，无真实客户 PII）",
    "- **规则内核未改**：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output",
    "- **LLM 边界**：L1–L3 的 `outputPath` / `node` / `missingFields` / `missingAttachments` / `matchResult` 仍以规则结果为准；LLM 只生成飞书群消息草稿。",
    "- **L4**：使用现有 prompt `experts/value-add/nonstandard-sop-guide/prompts/inbound/main.md` + 脱敏 F-001 完整样例，调用真实 LLM 生成 SOP 草稿。",
    `- **模型**：\`${config.model}\` @ \`${config.baseURL}\`（key 来自环境变量，未写入本目录）`,
    "- **未改生产运行时代码**：未改 `lib/**`、`experts/**`、`run-internal-review-dryrun.ts`。",
    "",
    "## 四条路径",
    "",
    "| 样例 | 假单号 | 规则停留 | outputPath | LLM 做了什么 | 未进入 |",
    "|---|---|---|---|---|---|",
    ...records.map((record) => {
      const blocked =
        record.demoCase === "L1"
          ? "match-template / 完整性 / SOP"
          : record.demoCase === "L2" || record.demoCase === "L3"
            ? "SOP"
            : "自动审核通过";
      const llmDid =
        record.demoCase === "L4" ? "真实 LLM SOP 草稿 + 群消息" : "真实 LLM 群消息（不改 gate）";
      return `| ${record.demoCase} ${record.demoLabel} | \`${record.orderNo}\` | \`${record.ruleResult.node}\` | \`${record.ruleResult.outputPath}\` | ${llmDid} | ${blocked} |`;
    }),
    "",
    "## 验收",
    "",
    errors.length
      ? errors.map((item) => `- 未通过：${item}`).join("\n")
      : [
          "- 4 条样例都生成了完整可读群消息",
          "- L1 未进入 match-template / SOP",
          "- L2 / L3 未生成 SOP",
          "- L4 生成了真实 LLM SOP 草稿（含需求背景、需求描述、仓库 SOP、fieldsUsed、审核员确认提示）",
          "- 所有消息未写「AI 已审核通过」",
          "- 未发现编造 OMS 单号",
        ].join("\n"),
    "",
    "## 会上不要说的话",
    "",
    "- 不要把本目录说成准确率评测或 eval-v0.1 gold",
    "- 不要说 AI 已经审核通过",
    "- 不要说 L2 拦截不上架已可自动执行",
    "- L2 运行时 `mentionRoles` 仍为空；本演示群消息按设计意图写「固定审核员」，不是线上已自动 @ 审核员",
    "",
  ];
  writeFileSync(resolve(outDir, "summary.md"), `${summary.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  loadEnvFiles();
  let config: ReturnType<typeof resolveLlmConfig>;
  try {
    config = resolveLlmConfig();
  } catch (err) {
    mkdirSync(outDir, { recursive: true });
    const message = err instanceof Error ? err.message : String(err);
    writeFileSync(
      resolve(outDir, "summary.md"),
      `# 汇报演示中止\n\n${message}\n\n需要配置的变量：\`OPENAI_API_KEY\`（必填）、\`OPENAI_BASE_URL\`（可选）、\`OPENAI_MODEL\`（可选；未设时用本网关已验证的 claude-sonnet-4-5）。未伪造 LLM 结果。\n`,
      "utf8",
    );
    console.error(message);
    process.exit(1);
  }

  if (!existsSync(inputPath)) throw new Error(`找不到演示样例：${inputPath}`);
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);

  const records: CaseRecord[] = [];
  for (const detail of details) {
    const rule = await runRules(detail);
    if (!rule) continue;
    if (rule.outputPath !== rule.expectedOutputPath) {
      throw new Error(`${rule.demoCase} 规则结果 ${rule.outputPath} 与期望 ${rule.expectedOutputPath} 不一致`);
    }

    if (rule.demoCase === "L4") {
      const sop = await generateL4Sop(config, rule);
      const groupMessage = wrapL4Message(rule, sop);
      assertNoForbidden(groupMessage, "L4 群消息");
      records.push({
        orderNo: rule.orderNo,
        demoCase: rule.demoCase,
        demoLabel: rule.demoLabel,
        ruleResult: rule,
        llm: {
          step: "sop_generate+im_draft",
          model: config.model,
          groupMessage,
          mentionRoles: mentionRolesForPath(rule.outputPath),
          sop,
        },
      });
      continue;
    }

    const groupMessage = await generateImDraft(config, rule);
    assertNoForbidden(groupMessage, `${rule.demoCase} 群消息`);
    const invented = looksInvented(groupMessage, rule);
    if (invented.length) throw new Error(`${rule.demoCase} 群消息编造了输入中没有的单号：${invented.join("、")}`);
    records.push({
      orderNo: rule.orderNo,
      demoCase: rule.demoCase,
      demoLabel: rule.demoLabel,
      ruleResult: rule,
      llm: {
        step: "im_draft",
        model: config.model,
        groupMessage,
        mentionRoles: mentionRolesForPath(rule.outputPath),
      },
    });
  }

  const errors = assertAcceptance(records);
  writeOutputs(records, config, errors);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`model=${config.model}`);
  console.log(`wrote ${outDir}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "summary.md"),
    `# 汇报演示失败\n\n${message}\n\n未伪造 LLM 结果。需要时请检查 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL。\n`,
    "utf8",
  );
  console.error(message);
  process.exit(1);
});
