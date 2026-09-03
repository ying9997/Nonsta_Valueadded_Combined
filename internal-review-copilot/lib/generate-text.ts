import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { asText } from "./oms-adapter.ts";
import {
  callChat,
  extractFirstJsonObject,
  fillTemplate,
  resolveLlmConfig,
  type LlmConfig,
} from "./llm-client.ts";
import { projectDir } from "./env.ts";
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

async function generateSop(config: LlmConfig, args: GenerateTextArgs): Promise<LlmSopDraft> {
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
  const filled = fillTemplate(template, {
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
  const raw = await callChat(config, [{ role: "user", content: filled }], {
    jsonMode: true,
    maxTokens: 1800,
  });
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) throw new Error("SOP 未解析到 JSON。");
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
    throw new Error(`SOP 被模型判为不可生成：${parsed.reason || "notActionable"}`);
  }
  const sopText = asText(parsed.sopText);
  if (!sopText) throw new Error("SOP sopText 为空。");
  assertNoForbidden(sopText);
  const invented = looksInvented(sopText, args);
  if (invented.length) throw new Error(`SOP 编造了输入中没有的单号：${invented.join("、")}`);

  return {
    requirementBackground:
      asText(parsed.requirementBackground) || sectionOf(sopText, "需求背景") || input.omsFacts.requirementBackground,
    requirementDescription:
      asText(parsed.requirementDescription) || input.omsFacts.customerRequirementDescription,
    warehouseSop: asText(parsed.warehouseSop) || sectionOf(sopText, "操作要求") || sopText,
    sopText,
    scenarioName: asText(parsed.scenarioName) || match?.scenarioName || "",
    fieldsUsed: Array.isArray(parsed.fieldsUsed) ? parsed.fieldsUsed.map((item) => String(item)) : uploadedSummary(input, ctx),
    mocked: false,
    model: config.model,
  };
}

export async function generateLlmText(args: GenerateTextArgs): Promise<LlmGeneration> {
  const config = resolveLlmConfig();
  if (args.outputPath === "sop_generated") {
    const sop = await generateSop(config, args);
    return { text: sop.sopText, model: config.model, mocked: false, error: null, sop };
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
