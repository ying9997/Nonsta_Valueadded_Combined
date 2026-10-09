import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { visibleCustomerName } from "./customer-display.ts";
import { asText } from "./oms-adapter.ts";
import {
  callChat,
  extractFirstJsonObject,
  fillTemplate,
  formatLlmErrorForUser,
  LlmError,
  parseJsonishObject,
  resolveLlmConfig,
  type LlmConfig,
} from "./llm-client.ts";
import { pickPutawayWiNos } from "./wi-numbers.ts";
import { extractWoNos, normalizeWoNos } from "./wo-numbers.ts";
import { resolveOrderCategory } from "./order-category.ts";
import { projectDir } from "./env.ts";
import { sameNormalizedText } from "./sop-sections.ts";
import { formatT1SkuPrompt } from "./t1-sku-relabel-check.ts";
import type {
  AgentInput,
  CompletenessResult,
  ContextFacts,
  LlmGeneration,
  LlmSopDraft,
  MatchResult,
  OutputPath,
  RequirementCheck,
  SkuCheckResult,
  T1SkuRelabelResult,
} from "./types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = resolve(here, "../prompts");

const FORBIDDEN_PHRASES = ["AI 已审核通过", "AI已审核通过", "自动审核通过"];

function unmatchedScene(match?: MatchResult): boolean {
  const key = String(match?.sceneKey || match?.scenarioId || "").trim();
  return !key || key === "unsupported" || match?.decision === "unsupported";
}

export interface GenerateTextArgs {
  outputPath: OutputPath;
  agentInput: AgentInput;
  contextFacts: ContextFacts;
  requirement?: RequirementCheck;
  matchResult?: MatchResult;
  completeness?: CompletenessResult;
  missing: string[];
  clarificationPrompts: string[];
  missingAttachments?: string[];
  skuCheckResult?: SkuCheckResult;
  t1SkuRelabelResult?: T1SkuRelabelResult;
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

function stringIdList(value: unknown, prefix: RegExp): string[] {
  const raw = Array.isArray(value) ? value : [];
  return [...new Set(raw.map((item) => String(item || "").trim().toUpperCase()).filter((item) => prefix.test(item)))];
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
      客户: [visibleCustomerName(ctx.customerName), ctx.customerCode].filter(Boolean).join(" / ") || "未填写",
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
      [resolveOrderCategory(ctx) === "outbound" ? "出库单" : "入库单"]: ctx.allBusinessOrderNos,
      outputPath: args.outputPath,
      规则缺失项: args.missing,
      澄清提示: args.clarificationPrompts,
      skuCheck: args.skuCheckResult?.triggered
        ? {
            oldWi: args.skuCheckResult.oldWi,
            newWi: args.skuCheckResult.newWi,
            match: args.skuCheckResult.match,
            oldSkuCount: args.skuCheckResult.oldSkus.length,
            newSkuCount: args.skuCheckResult.newSkus.length,
            mismatchDetails: args.skuCheckResult.mismatchDetails || "",
            source: args.skuCheckResult.source || "",
          }
        : null,
      t1SkuRelabel: args.t1SkuRelabelResult?.triggered
        ? {
            verdict: args.t1SkuRelabelResult.verdict,
            claim: args.t1SkuRelabelResult.claim,
            targetWis: args.t1SkuRelabelResult.targetWis,
            stems: args.t1SkuRelabelResult.stems,
            merchandiseCodes: args.t1SkuRelabelResult.merchandiseCodes,
            bouncePrompt: args.t1SkuRelabelResult.bouncePrompt || "",
          }
        : null,
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
    visibleCustomerName(ctx.customerName),
    ...ctx.allEventNos,
    ...ctx.allBusinessOrderNos,
    input.omsFacts.requirementBackground,
    input.omsFacts.customerRequirementDescription,
    ...Object.values(input.providedFields),
    ...input.omsFacts.uploadedFiles.flatMap((file) => [file.fileName, file.label]),
    args.previousSop || "",
    args.sopEditInstruction || "",
    args.skuCheckResult?.oldWi || "",
    args.skuCheckResult?.newWi || "",
    ...(args.skuCheckResult?.oldSkus || []),
    ...(args.skuCheckResult?.newSkus || []),
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
  const hits = text.match(/\b(?:VASC|WI|EB|WO)[A-Z0-9]+\b/g) || [];
  return [...new Set(hits.filter((token) => !allowed.has(token.toUpperCase())))];
}

export function replaceInventedOrderNos(text: string, invented: string[]): string {
  let out = asText(text);
  const uniq = [...new Set(invented.filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const inv of uniq) {
    out = out.split(inv).join("[待补充]");
  }
  return out;
}

function validOrderNos(args: GenerateTextArgs): string[] {
  const ctx = args.contextFacts;
  const input = args.agentInput;
  const blobs = [
    ctx.orderNo,
    ctx.eventNo,
    ctx.businessOrderNo,
    ...ctx.allEventNos,
    ...ctx.allBusinessOrderNos,
    ...Object.values(input.providedFields),
    input.omsFacts.requirementBackground,
    input.omsFacts.customerRequirementDescription,
  ];
  const hits = blobs.flatMap((value) => asText(value).match(/\b(?:VASC|WI|EB|WO)[A-Z0-9]+\b/gi) || []);
  return [...new Set(hits)];
}

function sopFieldsBlob(parsed: {
  sopText?: string;
  warehouseSop?: string;
  requirementDescription?: string;
  requirementBackground?: string;
}): string {
  return [parsed.sopText, parsed.warehouseSop, parsed.requirementDescription, parsed.requirementBackground]
    .map((item) => asText(item))
    .join("\n");
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
  const cat = resolveOrderCategory(args.contextFacts);
  const kbRel =
    cat === "outbound"
      ? "workspace/knowledge/sop/4-outbound-other-service.md"
      : "workspace/knowledge/sop/2.1-inbound-relabel-shelving.md";
  const kbPath = resolve(projectDir(), kbRel);
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
  const defaultInbound = !unmatchedScene(match) && cat !== "outbound";
  let filled = fillTemplate(template, {
    customerIntent: input.customerIntent,
    scenarioId: unmatchedScene(match)
      ? "unmatched_oms_scene"
      : match?.scenarioId || (defaultInbound ? "inbound_label_identify" : "unmatched_oms_scene"),
    scenarioName: unmatchedScene(match)
      ? "未匹配 OMS 场景概述（不选下拉）"
      : match?.scenarioName || (defaultInbound ? "【入库】尺重/标签辨识后换标上架" : "未匹配 OMS 场景概述（不选下拉）"),
    providedFields: JSON.stringify(provided, null, 2),
    vascNo: ctx.orderNo,
    warehouse: [ctx.warehouseName, ctx.warehouseCode].filter(Boolean).join(" / "),
    eventNos: ctx.allEventNos.join("、") || "未填写",
    businessOrderNos: ctx.allBusinessOrderNos.join("、") || "未填写",
    uploadedFiles: uploadedSummary(input, ctx).join("、") || "无",
    kbSopTemplates: kb,
  });
  const missingAttachments = [
    ...(args.missingAttachments || []),
    ...(args.completeness?.missingAttachments || []),
  ].filter((item, idx, arr) => item && arr.indexOf(item) === idx);
  if (missingAttachments.length) {
    filled += [
      "",
      "## 附件尚未上传",
      `以下附件客户尚未上传：${missingAttachments.join("、")}。`,
      "如果 SOP 中需要引用这些附件的内容（如对应关系表、标签文件），请用 [待补充：附件名] 占位，不要编造附件内容。",
      "",
    ].join("\n");
  }
  if (args.skuCheckResult?.triggered && args.skuCheckResult.match !== "consistent") {
    filled += [
      "",
      "## SKU 校验（仅审核员提示，禁止写入仓库 SOP）",
      "原单与新单 SKU 比对结果会单独展示给审核员。不要写进【操作步骤】，不要让仓库去核对 SKU 清单。",
      "",
    ].join("\n");
  }
  const t1Block = formatT1SkuPrompt(args.t1SkuRelabelResult);
  if (t1Block) {
    filled += `\n${t1Block}\n`;
  }
  if (unmatchedScene(match)) {
    filled += [
      "",
      "## 场景未匹配 OMS 下拉",
      "当前没有可用的 OMS 场景概述。不要套用「尺重/标签辨识后换标上架」模板。",
      "只按客户需求原文和已绑定单据写仓库操作步骤。OMS 场景概述保持不选。",
      "",
    ].join("\n");
  }
  if (input.auditFields?.hasRequirementDescription === false) {
    filled += [
      "",
      "## 审核页无「需求描述」格子",
      "本单审核信息没有需求描述字段，不要要求补充需求描述。",
      "根据已填格子（如目的仓库）和异常单写仓库操作步骤。",
      "requirementDescription 可写一句从格子/异常单归纳的理解；OMS 不会写入该栏。",
      "",
    ].join("\n");
  }
  if (input.auditFields?.hasRequirementBackground === false) {
    filled += [
      "",
      "## 审核页无「需求背景说明」格子",
      "没有需求背景说明字段。requirementBackground 可留空或写一句归纳。OMS 不会写入该栏。",
      "",
    ].join("\n");
  }
  if (cat === "outbound") {
    filled += [
      "",
      "## 出库约束",
      "这是出库非标增值。禁止套用入库「尺重/标签辨识后换标上架」或任何上架模板。",
      "主单号是出库单 WO。不要写新入库单 WI、不要写上架。",
      "extractedWoNumbers 填全部出库单 WO；extractedWiNumbers / extractedEbNumbers 出库单通常空数组。",
      "",
    ].join("\n");
  }
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
    "scenarioName 如需输出：场景名里已有的引号必须写成中文弯引号 “ ”，禁止写成英文双引号，否则 JSON 会断。",
    "extractedWiNumbers 只填仓库扫描上架的那一张 WI（OMS「上架入库单号」只能填一个）。原文里的原入库单、被替换的旧单不要填。有原单+新单时只填新单。extractedEbNumbers 填全部异常单号。没有则空数组。",
    "术语规范：异常单关闭后的状态描述用「仓库已处理」，不要用「已完成」或「状态变更为已完成」。使用「补贴标签」而非「粘贴标签」。使用「辨识」而非「识别」（仓库术语）。",
    "",
  ].join("\n");
  const callSopJson = (prompt: string) =>
    callChat(config, [{ role: "user", content: prompt }], {
      jsonMode: true,
      maxTokens: 2500,
      onDelta: args.onDelta,
    });
  const parseSopPayload = (raw: string) => {
    const extracted = (extractFirstJsonObject(raw) || raw).trim();
    if (!extracted.startsWith("{")) throw new Error("SOP 未解析到 JSON。");
    return parseJsonishObject(raw) as {
      sopText?: string;
      scenarioName?: string;
      fieldsUsed?: string[];
      requirementBackground?: string;
      requirementDescription?: string;
      warehouseSop?: string;
      notActionable?: boolean;
      reason?: string;
      extractedWiNumbers?: unknown;
      extractedEbNumbers?: unknown;
      extractedWoNumbers?: unknown;
    };
  };

  let raw = await callSopJson(filled);
  let parsed: ReturnType<typeof parseSopPayload>;
  try {
    parsed = parseSopPayload(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    raw = await callChat(
      config,
      [
        {
          role: "user",
          content: `${filled}\n\n## 格式约束\n上次输出不是合法 JSON（${msg}）。请重新输出完整 JSON 对象，字符串内的引号必须转义，不要输出 markdown。`,
        },
      ],
      {
        jsonMode: true,
        maxTokens: 2500,
        onDelta: args.onDelta,
      },
    );
    parsed = parseSopPayload(raw);
  }
  if (parsed.notActionable) {
    throw new Error(`SOP 被模型判为不可生成：${parsed.reason || "notActionable"}`);
  }
  let sopText = asText(parsed.sopText);
  if (!sopText) throw new Error("SOP sopText 为空。");
  assertNoForbidden(sopText);
  let invented = looksInvented(sopFieldsBlob(parsed), args);
  if (invented.length) {
    const validNos = validOrderNos(args);
    const retryPrompt = [
      filled,
      "",
      "## 单号约束",
      `你上次 SOP 里引用了不存在的单号 ${invented.join("、")}。请重新生成，只使用以下输入中的单号：${validNos.join("、") || "（输入中无单号）"}。绝对不要引用其他单号。`,
    ].join("\n");
    console.warn(`SOP invented retry ${ctx.orderNo}: ${invented.join("、")}`);
    raw = await callSopJson(retryPrompt);
    try {
      parsed = parseSopPayload(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      raw = await callChat(
        config,
        [
          {
            role: "user",
            content: `${retryPrompt}\n\n## 格式约束\n上次输出不是合法 JSON（${msg}）。请重新输出完整 JSON 对象，字符串内的引号必须转义，不要输出 markdown。`,
          },
        ],
        { jsonMode: true, maxTokens: 2500, onDelta: args.onDelta },
      );
      parsed = parseSopPayload(raw);
    }
    if (parsed.notActionable) {
      throw new Error(`SOP 被模型判为不可生成：${parsed.reason || "notActionable"}`);
    }
    sopText = asText(parsed.sopText);
    if (!sopText) throw new Error("SOP sopText 为空。");
    assertNoForbidden(sopText);
    invented = looksInvented(sopFieldsBlob(parsed), args);
  }

  const originalDesc = asText(input.omsFacts.customerRequirementDescription);
  let desc = asText(parsed.requirementDescription) || sectionOf(sopText, "需求描述");
  let background =
    asText(parsed.requirementBackground) || sectionOf(sopText, "需求背景") || input.omsFacts.requirementBackground;
  let warehouseSop =
    asText(parsed.warehouseSop) || sectionOf(sopText, "操作要求") || sectionOf(sopText, "操作步骤") || sopText;
  let degraded = false;
  let degradeReason = "";
  if (invented.length) {
    console.warn(`SOP invented degrade ${ctx.orderNo}: ${invented.join("、")} → [待补充]`);
    sopText = replaceInventedOrderNos(sopText, invented);
    desc = replaceInventedOrderNos(desc, invented);
    background = replaceInventedOrderNos(background, invented);
    warehouseSop = replaceInventedOrderNos(warehouseSop, invented);
    degraded = true;
    degradeReason = `AI 编造了 ${invented.join("、")}，已替换为 [待补充]`;
  }
  return {
    requirementBackground: background,
    requirementDescription: sameNormalizedText(desc, originalDesc) ? "" : desc,
    warehouseSop,
    sopText,
    scenarioName: asText(parsed.scenarioName) || match?.scenarioName || "",
    fieldsUsed: Array.isArray(parsed.fieldsUsed) ? parsed.fieldsUsed.map((item) => String(item)) : uploadedSummary(input, ctx),
    mocked: false,
    model: config.model,
    degraded: degraded || undefined,
    degradeReason: degradeReason || undefined,
    extractedWiNumbers: pickPutawayWiNos(
      [
        input.omsFacts.customerRequirementDescription,
        input.omsFacts.requirementBackground,
        desc,
        warehouseSop,
        sopText,
      ].join("\n"),
      parsed.extractedWiNumbers,
    ),
    extractedEbNumbers: stringIdList(parsed.extractedEbNumbers, /^EB\d{6,}$/),
    extractedWoNumbers: [
      ...new Set([
        ...extractWoNos(
          [
            input.omsFacts.customerRequirementDescription,
            input.omsFacts.requirementBackground,
            desc,
            warehouseSop,
            sopText,
            ctx.businessOrderNo,
            ...(ctx.allBusinessOrderNos || []),
          ].join("\n"),
        ),
        ...normalizeWoNos(parsed.extractedWoNumbers),
      ]),
    ],
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
    if (err instanceof LlmError) {
      return {
        text: "",
        model: err.model || "",
        mocked: false,
        error: formatLlmErrorForUser(err),
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      text: "",
      model: "",
      mocked: false,
      error: message,
    };
  }
}
