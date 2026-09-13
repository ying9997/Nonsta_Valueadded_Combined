import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { asText } from "./oms-adapter.ts";
import {
  callChat,
  extractFirstJsonObject,
  fillTemplate,
  resolveLlmConfig,
  sanitizeJsonish,
  type LlmConfig,
} from "./llm-client.ts";
import { projectDir } from "./env.ts";
import { sameNormalizedText } from "./sop-sections.ts";
import type {
  AgentInput,
  CompletenessResult,
  ContextFacts,
  LlmGeneration,
  LlmSopDraft,
  MatchResult,
  OutputPath,
  RequirementCheck,
} from "./types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = resolve(here, "../prompts");

const FORBIDDEN_PHRASES = ["AI 已审核通过", "AI已审核通过", "自动审核通过"];

export interface GenerateTextArgs {
  outputPath: OutputPath;
  agentInput: AgentInput;
  contextFacts: ContextFacts;
  requirement?: RequirementCheck;
  matchResult?: MatchResult;
  completeness?: CompletenessResult;
  missing: string[];
  clarificationPrompts: string[];
  /** 审核员对上一版 SOP 的修改意见。 */
  sopEditInstruction?: string;
  previousSop?: string;
  onDelta?: (chunk: string) => void;
}

function readPrompt(name: string): string {
  return readFileSync(resolve(promptsDir, name), "utf8");
}

function uploadedSummary(input: AgentInput, context: ContextFacts): string[] {
  const files = input.omsFacts.uploadedFiles.map((file) => `${file.label || file.fileType}（${file.fileName}）`);
  if (files.length) return files;
  return Object.entries(context.attachmentStatus)
    .filter(([, status]) => status === "uploaded")
    .map(([name]) => name);
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

function factBlob(args: GenerateTextArgs): string {
  const input = args.agentInput;
  const ctx = args.contextFacts;
  return JSON.stringify(
    {
      增值单号: ctx.orderNo,
      客户: [ctx.customerName, ctx.customerCode].filter(Boolean).join(" / ") || "未填写",
      仓库: [ctx.warehouseName, ctx.warehouseCode].filter(Boolean).join(" / ") || "未填写",
      提交人: input.responsiblePeople.submittedBy || "未填写",
      需求背景说明: input.omsFacts.requirementBackground || "未填写",
      需求描述: input.omsFacts.customerRequirementDescription || "未填写",
      已提交字段: fieldSummary(input),
      已上传附件: uploadedSummary(input, ctx),
      未上传附件: Object.entries(ctx.attachmentStatus)
        .filter(([, status]) => status === "missing")
        .map(([name]) => name),
      异常单: ctx.allEventNos,
      入库单: ctx.allBusinessOrderNos,
      outputPath: args.outputPath,
      规则缺失项: args.missing,
      澄清提示: args.clarificationPrompts,
      matchResult: args.matchResult
        ? {
            decision: args.matchResult.decision,
            supported: args.matchResult.supported,
            sceneKey: args.matchResult.sceneKey,
            scenarioName: args.matchResult.scenarioName,
            reason: args.matchResult.reason,
            score: args.matchResult.score,
            confidenceScore: args.matchResult.confidenceScore,
          }
        : null,
      处理方式: "暂时",
    },
    null,
    2,
  );
}

function assertNoForbidden(text: string): void {
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.includes(phrase)) throw new Error(`LLM 文本含禁止表述：${phrase}`);
  }
  if (/AI.{0,8}审核通过/.test(text)) throw new Error("LLM 文本含禁止表述：AI 审核通过");
}

function allowedTokens(args: GenerateTextArgs): string[] {
  const input = args.agentInput;
  const ctx = args.contextFacts;
  const tokens = [
    ctx.orderNo,
    ctx.warehouseCode,
    ctx.warehouseName,
    ctx.customerCode,
    ctx.customerName,
    ...ctx.allEventNos,
    ...ctx.allBusinessOrderNos,
    input.omsFacts.requirementBackground,
    input.omsFacts.customerRequirementDescription,
    ...Object.values(input.providedFields),
    ...input.omsFacts.uploadedFiles.flatMap((file) => [file.fileName, file.label]),
    args.previousSop || "",
    args.sopEditInstruction || "",
    "操作说明附件",
    "商品和标签的对应关系",
    "标签文件",
    "尺重",
    "绿标",
    "SKU",
  ].flatMap((value) => asText(value).split(/[\s，。；、/\n]+/));
  return [...new Set(tokens.map((item) => item.trim()).filter((item) => item.length >= 4))];
}

function looksInvented(text: string, args: GenerateTextArgs): string[] {
  const allowed = new Set(allowedTokens(args).map((item) => item.toUpperCase()));
  const hits = text.match(/\b(?:VASC|WI|EB)[A-Z0-9]+\b/g) || [];
  return [...new Set(hits.filter((token) => !allowed.has(token.toUpperCase())))];
}

function sectionOf(sopText: string, title: string): string {
  const re = new RegExp(`【${title}】\\s*([\\s\\S]*?)(?=【|$)`);
  return (sopText.match(re)?.[1] || "").trim();
}

async function generatePlain(
  config: LlmConfig,
  promptName: string,
  args: GenerateTextArgs,
): Promise<string> {
  const system = readPrompt(promptName);
  const text = await callChat(config, [
    { role: "system", content: system },
    { role: "user", content: `请根据下面的规则结果写正文。只能使用这些事实。\n\n${factBlob(args)}` },
  ]);
  assertNoForbidden(text);
  const invented = looksInvented(text, args);
  if (invented.length) throw new Error(`LLM 编造了输入中没有的单号：${invented.join("、")}`);
  return text.trim();
}

interface SopGenOptions {
  extraConstraints?: string;
}

async function reflectSop(
  config: LlmConfig,
  sopText: string,
  args: GenerateTextArgs,
): Promise<{ pass: boolean; issues: string[]; suggestedFix: string }> {
  try {
    const reflectionPrompt = readPrompt("sop-reflection.md");
    const response = await callChat(
      config,
      [
        { role: "system", content: reflectionPrompt },
        {
          role: "user",
          content: `## 输入数据\n${factBlob(args)}\n\n## SOP 草稿\n${sopText}`,
        },
      ],
      { maxTokens: 800 },
    );
    const trimmed = response.trim();
    if (trimmed === "PASS" || /^PASS\b/i.test(trimmed)) {
      return { pass: true, issues: [], suggestedFix: "" };
    }
    const json = extractFirstJsonObject(response);
    if (!json) return { pass: true, issues: [] , suggestedFix: ""};
    const parsed = JSON.parse(json) as {
      issues?: Array<{ type?: string; detail?: string } | string>;
      suggestedFix?: string;
    };
    const issues = (parsed.issues || [])
      .map((item) => (typeof item === "string" ? item : asText(item.detail)))
      .filter(Boolean);
    if (!issues.length) return { pass: true, issues: [], suggestedFix: "" };
    return { pass: false, issues, suggestedFix: asText(parsed.suggestedFix) };
  } catch {
    // Reflection failure must not block original SOP flow.
    return { pass: true, issues: [], suggestedFix: "" };
  }
}

async function generateSopOnce(config: LlmConfig, args: GenerateTextArgs, options: SopGenOptions = {}): Promise<LlmSopDraft> {
  const template = readPrompt("sop-generate.md");
  const kbPath = resolve(projectDir(), "workspace/knowledge/sop/2.1-inbound-relabel-shelving.md");
  const kb = existsSync(kbPath) ? readFileSync(kbPath, "utf8") : "";
  const input = args.agentInput;
  const ctx = args.contextFacts;
  const match = args.matchResult;
  const provided = {
    ...input.providedFields,
    uploadedFiles: input.omsFacts.uploadedFiles,
    attachmentStatus: input.omsFacts.attachmentStatus,
    eventNo: ctx.eventNo,
    businessOrderNo: ctx.businessOrderNo,
    warehouseCode: ctx.warehouseCode,
    warehouseName: ctx.warehouseName,
  };
  let filled = fillTemplate(template, {
    customerIntent: input.customerIntent,
    scenarioId: match?.scenarioId || "inbound_label_identify",
    scenarioName: match?.scenarioName || "【入库】尺重/标签辨识后换标上架",
    providedFields: JSON.stringify(provided, null, 2),
    vascNo: ctx.orderNo,
    warehouse: [ctx.warehouseName, ctx.warehouseCode].filter(Boolean).join(" / "),
    eventNos: ctx.allEventNos.join("、") || "未填写",
    businessOrderNos: ctx.allBusinessOrderNos.join("、") || "未填写",
    uploadedFiles: uploadedSummary(input, ctx).join("、") || "无",
    kbSopTemplates: kb,
  });
  if (asText(args.sopEditInstruction)) {
    filled += [
      "",
      "## 审核员修改意见",
      "以下是审核员对上一版 SOP 的修改要求，请按要求修正：",
      asText(args.sopEditInstruction),
      asText(args.previousSop) ? `\n## 上一版 SOP\n${asText(args.previousSop)}` : "",
      "",
      "请基于原始需求和审核员的修改意见，重新生成完整的 SOP。",
      "",
    ].join("\n");
  }
  if (options.extraConstraints) {
    filled += `\n\n## Reflection 修订约束（必须遵守）\n${options.extraConstraints}\n`;
  }
  filled += [
    "",
    "## AI 总结字段（必须）",
    "JSON 必须包含 requirementDescription、requirementBackground、warehouseSop、sopText。",
    "requirementDescription 和 requirementBackground 是你对客户需求的理解总结，用于帮助审核员快速了解这条增值单在做什么。请用简洁专业的语言重新组织，不要原封不动复制客户的需求描述。即使原文已经清晰，也要重新组织语言提升可读性。",
    "",
  ].join("\n");
  const callSopJson = (prompt: string) =>
    callChat(config, [{ role: "user", content: prompt }], {
      jsonMode: true,
      maxTokens: 2500,
      onDelta: args.onDelta,
    });
  const parseSopPayload = (raw: string) => {
    const jsonText = sanitizeJsonish(extractFirstJsonObject(raw) || raw);
    if (!jsonText.trim().startsWith("{")) throw new Error("SOP 未解析到 JSON。");
    return JSON.parse(jsonText) as {
      sopText?: string;
      scenarioName?: string;
      fieldsUsed?: string[];
      requirementBackground?: string;
      requirementDescription?: string;
      warehouseSop?: string;
      notActionable?: boolean;
      reason?: string;
    };
  };

  let raw = await callSopJson(filled);
  let parsed: ReturnType<typeof parseSopPayload>;
  try {
    parsed = parseSopPayload(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    raw = await callSopJson(
      `${filled}\n\n## 格式约束\n上次输出不是合法 JSON（${msg}）。请重新输出完整 JSON 对象，字符串内的引号必须转义，不要输出 markdown。`,
    );
    parsed = parseSopPayload(raw);
  }
  if (parsed.notActionable) {
    throw new Error(`SOP 被模型判为不可生成：${parsed.reason || "notActionable"}`);
  }
  const sopText = asText(parsed.sopText);
  if (!sopText) throw new Error("SOP sopText 为空。");
  assertNoForbidden(sopText);
  const invented = looksInvented(sopText, args);
  if (invented.length) throw new Error(`SOP 编造了输入中没有的单号：${invented.join("、")}`);

  const originalDesc = asText(input.omsFacts.customerRequirementDescription);
  const desc = asText(parsed.requirementDescription) || sectionOf(sopText, "需求描述");
  return {
    requirementBackground:
      asText(parsed.requirementBackground) || sectionOf(sopText, "需求背景") || input.omsFacts.requirementBackground,
    requirementDescription: sameNormalizedText(desc, originalDesc) ? "" : desc,
    warehouseSop: asText(parsed.warehouseSop) || sectionOf(sopText, "操作要求") || sectionOf(sopText, "操作步骤") || sopText,
    sopText,
    scenarioName: asText(parsed.scenarioName) || match?.scenarioName || "",
    fieldsUsed: Array.isArray(parsed.fieldsUsed) ? parsed.fieldsUsed.map((item) => String(item)) : uploadedSummary(input, ctx),
    mocked: false,
    model: config.model,
  };
}

async function generateSop(
  config: LlmConfig,
  args: GenerateTextArgs,
): Promise<{ sop: LlmSopDraft; reflectionPass: boolean; reflectionIssues: string[]; regenerated: boolean }> {
  const first = await generateSopOnce(config, args);
  const reflection = await reflectSop(config, first.sopText, args);
  if (reflection.pass || reflection.issues.length === 0) {
    return { sop: first, reflectionPass: true, reflectionIssues: [], regenerated: false };
  }

  const constraint = [
    "上一版 SOP 存在以下问题，请重写并全部修正：",
    ...reflection.issues.map((issue, idx) => `${idx + 1}. ${issue}`),
    reflection.suggestedFix ? `修改建议：${reflection.suggestedFix}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const second = await generateSopOnce(config, args, { extraConstraints: constraint });
    // Accept second output even if reflection would still fail (no infinite loop).
    return {
      sop: second,
      reflectionPass: false,
      reflectionIssues: reflection.issues,
      regenerated: true,
    };
  } catch {
    return {
      sop: first,
      reflectionPass: false,
      reflectionIssues: reflection.issues,
      regenerated: false,
    };
  }
}

export async function generateLlmText(args: GenerateTextArgs): Promise<LlmGeneration> {
  const config = resolveLlmConfig();
  if (args.outputPath === "sop_generated") {
    const { sop, reflectionPass, reflectionIssues, regenerated } = await generateSop(config, args);
    return {
      text: sop.sopText,
      model: config.model,
      mocked: false,
      error: null,
      sop,
      reflectionPass,
      reflectionIssues,
      regenerated,
    };
  }
  const promptName =
    args.outputPath === "needs_requirement_clarification"
      ? "requirement-clarification.md"
      : args.outputPath === "needs_field_clarification"
        ? "field-clarification.md"
        : args.outputPath === "transfer_human"
          ? "transfer-human.md"
          : "";
  if (!promptName) {
    return { text: "", model: config.model, mocked: false, error: null };
  }
  const text = await generatePlain(config, promptName, args);
  return { text, model: config.model, mocked: false, error: null };
}

export async function generateLlmTextSafe(args: GenerateTextArgs): Promise<LlmGeneration> {
  try {
    return await generateLlmText(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      text: "",
      model: "",
      mocked: false,
      error: message,
    };
  }
}
