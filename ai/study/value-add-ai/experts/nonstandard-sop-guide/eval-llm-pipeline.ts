/**
 * eval-llm-pipeline.ts — 对第一批场景（#4拍照, #2拆分, #3组合）跑完整 LLM 链路。
 * 用真实客户输入 → match → check-completeness → Claude API 生成 SOP → 输出报告。
 *
 * 运行：npx tsx eval-llm-pipeline.ts
 * 需要环境变量：ANTHROPIC_API_KEY
 */

import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { main as validateInput } from "./nodes/validate-input.js";
import { main as matchTemplate } from "./nodes/match-template.js";
import { main as checkCompleteness } from "./nodes/check-completeness.js";
import { main as formatOutput } from "./nodes/format-output.js";

// ─── LLM 调用 ─────────────────────────────────────────────────

const LLM_API_KEY = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || "sk-q0LVutj4XYS36GJV_6rLrg";
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://uslitellm.winit.com";
const MODEL = process.env.LLM_MODEL || "claude-sonnet-4-5";

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  if (!LLM_API_KEY) {
    return `[MOCK] 无 API Key，模拟生成 SOP。\n\n【需求背景】\n${userMessage.slice(0, 100)}...\n\n【操作要求】\n1. 按客户描述操作\n2. 完成后系统确认\n\n【注意事项】\n- 请确认信息无误后操作`;
  }

  // LiteLLM 使用 OpenAI 兼容格式
  const url = `${LLM_BASE_URL}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || "";
}

// ─── SOP 生成 Prompt 构建 ──────────────────────────────────────

function buildSopPrompt(scenarioName: string, templateFields: string): string {
  return `你是万邑通仓储非标增值 SOP 撰写专家。根据客户需求生成仓库操作指引。

## 核心视角
SOP 会先展示给客户确认（"这是仓库将要为您执行的操作，请确认"），确认后仓库按此执行。
- 用仓库执行者视角写步骤（"找到包裹""补贴标签""扫描上架"）
- 客户也能看懂（不用仓库内部缩写）
- 不写客户侧操作（注册SKU、创建入库单、开通权限等前置条件）

## 意图判断
先判断客户意图是否为"需要仓库执行物理操作"：
- ✅ 可生成：拆分、组合、贴标换标、拍照、称重、上架、调拨
- ❌ 不可生成：咨询费用、查询进度、查视频、询问流程、申请权限
如果不可生成，输出：{"sopText":"","scenarioName":"","fieldsUsed":[],"notActionable":true,"reason":"客户在咨询/查询，非增值操作需求"}

## 场景：${scenarioName}
## 模板字段参考：${templateFields}

## 生成要求
1. 格式：【需求背景】一句话 + 【操作要求】3-6步仓库物理操作 + 【注意事项】1-3条（没有则省略）
2. 内容边界：只写仓库物理操作，不写客户前置操作/系统配置/费用说明
3. 风格：祈使句动词开头，引用客户具体值，缺失标 [待补充]
4. 长度：严格 150-300 字

## 输出 JSON：
{"sopText": "SOP全文", "scenarioName": "${scenarioName}", "fieldsUsed": ["字段1","字段2"]}`;
}

function buildUserMessage(customerIntent: string, providedFields: Record<string, string>, exceptionCode: string): string {
  let msg = `客户意图：${customerIntent}`;
  if (Object.keys(providedFields).length > 0) {
    msg += `\n\n已提供字段：${JSON.stringify(providedFields, null, 2)}`;
  }
  if (exceptionCode) {
    msg += `\n\n关联异常单：${exceptionCode}`;
  }
  return msg;
}

// ─── 场景模板信息 ──────────────────────────────────────────────

const SCENARIO_TEMPLATES: Record<number, string> = {
  2: "原SKU/拆分后SKU/数量/新入库单/标签文件/操作步骤",
  3: "主产品/配件/组合方式/新入库单/操作步骤",
  4: "拍照范围/照片用途/拍摄位置角度/背景要求/数量要求/命名规范",
};

// ─── 主逻辑 ────────────────────────────────────────────────────

interface Input { conversationId: string; customerFirstIntent: string; sceneClassification: string; }

interface PipelineResult {
  conversationId: string;
  customerInput: string;
  sceneClassification: string;
  matchedScenario: string;
  scenarioId: number;
  confidence: string;
  outputPath: string;
  sopText: string;
  missingFields: string[];
  analysis: string;
}

async function main() {
  const inputs: Input[] = JSON.parse(readFileSync(path.resolve(__dirname, "extracted-customer-inputs.json"), "utf-8"));
  const TARGET_SCENARIOS = [2, 3, 4];

  console.log("=".repeat(60));
  console.log("  第一批场景完整 LLM 链路评测");
  console.log("  目标场景: #2 拆分SKU, #3 商品组合, #4 拍照/视频");
  console.log("=".repeat(60));
  console.log(`  LLM: ${LLM_BASE_URL} | Model: ${MODEL}`);
  console.log(`  API Key: ${LLM_API_KEY ? "已配置" : "未配置（使用 MOCK）"}\n`);

  // Step 1: 筛选目标场景的中高置信命中
  const candidates: { input: Input; scenarioId: number; scenarioName: string; confidence: string }[] = [];

  for (const item of inputs) {
    const s1 = await validateInput({
      params: {
        customerIntent: item.customerFirstIntent,
        exceptionCode: "", exceptionName: "",
        recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
        serviceAtom: "库内其他服务需求", providedFields: {},
      },
    });
    if (!(s1.validationResult as any).ok) continue;

    const s2 = await matchTemplate({ params: { sopInput: s1.sopInput, validationResult: s1.validationResult } });
    const mr = s2.matchResult as any;

    if (mr.matched && TARGET_SCENARIOS.includes(mr.scenarioId) && (mr.confidence === "medium" || mr.confidence === "high")) {
      candidates.push({ input: item, scenarioId: mr.scenarioId, scenarioName: mr.scenarioName, confidence: mr.confidence });
    }
  }

  console.log(`筛选到 ${candidates.length} 条中高置信候选\n`);

  // 每个场景取最多 5 条
  const selected: typeof candidates = [];
  for (const sid of TARGET_SCENARIOS) {
    const sceneCandidates = candidates.filter((c) => c.scenarioId === sid).slice(0, 5);
    selected.push(...sceneCandidates);
    console.log(`  场景 #${sid}: ${sceneCandidates.length} 条`);
  }

  console.log(`\n开始跑完整链路（共 ${selected.length} 条）...\n`);

  // Step 2: 逐条跑完整链路
  const results: PipelineResult[] = [];

  for (let i = 0; i < selected.length; i++) {
    const { input, scenarioId, scenarioName, confidence } = selected[i];
    console.log(`  [${i + 1}/${selected.length}] 场景#${scenarioId} ${scenarioName} ...`);

    // validate-input
    const s1 = await validateInput({
      params: {
        customerIntent: input.customerFirstIntent,
        exceptionCode: "", exceptionName: "",
        recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
        serviceAtom: "库内其他服务需求", providedFields: {},
      },
    });

    // match-template
    const s2 = await matchTemplate({ params: { sopInput: s1.sopInput, validationResult: s1.validationResult } });
    const matchResult = s2.matchResult as any;

    // check-completeness (字段肯定不全，因为 providedFields 为空)
    const s3 = await checkCompleteness({ params: { sopInput: s2.sopInput, matchResult: s2.matchResult } });
    const completenessResult = s3.completenessResult as any;

    let sopGenerationResult: any = null;
    let outputPath: string;

    if (completenessResult.applicable && completenessResult.complete) {
      // 字段齐全，调 LLM 生成 SOP
      const templateFields = SCENARIO_TEMPLATES[scenarioId] || "";
      const systemPrompt = buildSopPrompt(scenarioName, templateFields);
      const userMsg = buildUserMessage(input.customerFirstIntent, {}, "");
      const llmResponse = await callLLM(systemPrompt, userMsg);

      try {
        sopGenerationResult = JSON.parse(llmResponse);
      } catch {
        sopGenerationResult = { sopText: llmResponse, scenarioName, fieldsUsed: [] };
      }
      outputPath = "sop_generated";
    } else if (completenessResult.applicable && !completenessResult.complete) {
      // 字段不全，但我们仍然尝试用已有信息生成 SOP（模拟客户已补充信息的场景）
      const templateFields = SCENARIO_TEMPLATES[scenarioId] || "";
      const systemPrompt = buildSopPrompt(scenarioName, templateFields);
      const userMsg = buildUserMessage(
        input.customerFirstIntent,
        {},
        ""
      ) + "\n\n注意：以下字段尚未获取，请基于已有信息尽可能生成 SOP 初稿，缺失部分标注为 [待补充]。";
      const llmResponse = await callLLM(systemPrompt, userMsg);

      try {
        sopGenerationResult = JSON.parse(llmResponse);
      } catch {
        sopGenerationResult = { sopText: llmResponse, scenarioName, fieldsUsed: [] };
      }
      outputPath = "sop_generated_partial";
    } else {
      outputPath = "transfer_human";
    }

    // format-output
    const final = await formatOutput({
      params: {
        sopInput: s3.sopInput,
        matchResult: s3.matchResult,
        completenessResult: { ...completenessResult, complete: true },
        sopGenerationResult,
        validationResult: s1.validationResult,
      },
    });

    const structured = final.structured as any;
    results.push({
      conversationId: input.conversationId,
      customerInput: input.customerFirstIntent.slice(0, 200),
      sceneClassification: input.sceneClassification,
      matchedScenario: scenarioName,
      scenarioId,
      confidence,
      outputPath,
      sopText: sopGenerationResult?.sopText || "",
      missingFields: completenessResult.missingFields?.map((f: any) => f.field) || [],
      analysis: (final.analysis as string) || "",
    });
  }

  // ─── 生成报告 ──────────────────────────────────────────────────

  const lines: string[] = [];
  lines.push("# 第一批场景 LLM 完整链路评测报告");
  lines.push("");
  lines.push(`> 日期：${new Date().toISOString().slice(0, 10)}`);
  lines.push(`> 模型：${LLM_API_KEY ? MODEL : "MOCK（无API Key）"}`);
  lines.push(`> 评测条数：${results.length}`);
  lines.push("");

  // 按场景分组输出
  for (const sid of TARGET_SCENARIOS) {
    const sceneResults = results.filter((r) => r.scenarioId === sid);
    if (sceneResults.length === 0) continue;

    lines.push(`## 场景 #${sid}: ${sceneResults[0].matchedScenario}`);
    lines.push("");

    for (let i = 0; i < sceneResults.length; i++) {
      const r = sceneResults[i];
      lines.push(`### Case ${i + 1} (${r.confidence} confidence)`);
      lines.push("");
      lines.push(`**客户输入：**`);
      lines.push(`> ${r.customerInput.replace(/\n/g, "\n> ")}`);
      lines.push("");
      lines.push(`**Udesk 场景分类：** ${r.sceneClassification || "未分类"}`);
      lines.push("");
      if (r.missingFields.length > 0) {
        lines.push(`**缺失字段：** ${r.missingFields.join(", ")}`);
        lines.push("");
      }
      lines.push(`**生成的 SOP：**`);
      lines.push("```");
      lines.push(r.sopText || "(无)");
      lines.push("```");
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  lines.push("## 总结");
  lines.push("");
  lines.push(`| 场景 | 评测数 | 生成 SOP | 待补充字段 |`);
  lines.push(`|------|--------|---------|-----------|`);
  for (const sid of TARGET_SCENARIOS) {
    const sceneResults = results.filter((r) => r.scenarioId === sid);
    const generated = sceneResults.filter((r) => r.sopText).length;
    const withMissing = sceneResults.filter((r) => r.missingFields.length > 0).length;
    lines.push(`| #${sid} ${sceneResults[0]?.matchedScenario || ""} | ${sceneResults.length} | ${generated} | ${withMissing} |`);
  }

  const reportPath = path.resolve(__dirname, "eval-llm-pipeline-report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`\n报告: ${reportPath}`);
  console.log("完成。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
