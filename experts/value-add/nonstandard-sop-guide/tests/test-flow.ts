/**
 * test-flow.ts — 端到端测试，直接调用节点 main() 函数（无子进程）。
 * 运行：npx tsx test-flow.ts
 */

import { main as validateInput } from "./nodes/validate-input.js";
import { main as matchTemplate } from "./nodes/match-template.js";
import { main as checkCompleteness } from "./nodes/check-completeness.js";
import { main as formatOutput } from "./nodes/format-output.js";

// ─── 测试用例 ──────────────────────────────────────────────────

interface TestCase {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutputPath: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: "B类-字段齐全-良品转不良品",
    description: "典型 B 类场景，所有必填字段都已提供，应直接生成 SOP",
    input: {
      customerIntent: "我需要把良品转为不良品上架",
      exceptionCode: "E20240101",
      exceptionName: "商品质量异常",
      recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
      serviceAtom: "库内其他服务需求",
      providedFields: {
        "背景": "客户发现批次有质量隐患，需冻结为不良品",
        "增值单需求描述": "将 SKU WIT001234 的 50 件从良品库位转至不良品库位",
      },
    },
    expectedOutputPath: "sop_generated",
  },
  {
    name: "B类-字段缺失-拆分SKU",
    description: "B 类场景但缺少关键字段，应输出追问清单",
    input: {
      customerIntent: "我想把一个 SKU 拆分成两个",
      exceptionCode: "",
      exceptionName: "",
      recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
      serviceAtom: "库内其他服务需求",
      providedFields: {
        "原SKU": "WIT009876",
      },
    },
    expectedOutputPath: "needs_clarification",
  },
  {
    name: "C类-库内加固-转人工",
    description: "C 类场景无模板，应建议转人工",
    input: {
      customerIntent: "帮我加固一下包装",
      exceptionCode: "",
      exceptionName: "",
      recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
      serviceAtom: "库内其他服务需求",
      providedFields: {},
    },
    expectedOutputPath: "transfer_human",
  },
  {
    name: "A类命名服务-拦截",
    description: "A 类命名服务误入，应被 validate-input 拦截",
    input: {
      customerIntent: "我要做货权转移",
      exceptionCode: "",
      exceptionName: "",
      recommendedVasc: { vascCode: "OSF6V1646", vascName: "货权转移（换标模式）" },
      serviceAtom: "货权转移（换标模式）",
      providedFields: {},
    },
    expectedOutputPath: "invalid_input",
  },
  {
    name: "无匹配-转人工",
    description: "客户意图无法匹配到任何场景，视为 C 类",
    input: {
      customerIntent: "我有一个特殊需求不知道怎么描述",
      exceptionCode: "",
      exceptionName: "",
      recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
      serviceAtom: "库内其他服务需求",
      providedFields: {},
    },
    expectedOutputPath: "transfer_human",
  },
  {
    name: "B类-拍照场景-部分字段",
    description: "拍照场景只给了范围没给角度/数量，应追问",
    input: {
      customerIntent: "帮我拍一下商品照片",
      exceptionCode: "",
      exceptionName: "",
      recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
      serviceAtom: "库内其他服务需求",
      providedFields: {
        "拍照范围": "SKU WIT005555 全部库存",
      },
    },
    expectedOutputPath: "needs_clarification",
  },
];

// ─── 流程编排 ──────────────────────────────────────────────────

async function runFlow(input: Record<string, unknown>): Promise<{ outputPath: string; detail: Record<string, unknown> }> {
  // Step 1: validate-input
  const step1 = await validateInput({ params: input });
  const validationResult = step1.validationResult as Record<string, unknown>;

  if (!validationResult.ok) {
    const final = await formatOutput({
      params: {
        sopInput: step1.sopInput,
        matchResult: { matched: false },
        completenessResult: { applicable: false },
        sopGenerationResult: null,
        validationResult,
      },
    });
    return {
      outputPath: (final.structured as Record<string, unknown>).outputPath as string,
      detail: final as Record<string, unknown>,
    };
  }

  // Step 2: match-template
  const step2 = await matchTemplate({
    params: { sopInput: step1.sopInput, validationResult },
  });
  const matchResult = step2.matchResult as Record<string, unknown>;

  // Step 3: check-completeness
  const step3 = await checkCompleteness({
    params: { sopInput: step2.sopInput, matchResult },
  });
  const completenessResult = step3.completenessResult as Record<string, unknown>;

  // Step 4: mock LLM（B 类且字段齐全时）
  let sopGenerationResult: unknown = null;
  if (matchResult.category === "B" && completenessResult.complete) {
    sopGenerationResult = {
      sopText: [
        `【需求背景】`,
        `客户场景：${matchResult.scenarioName}`,
        ``,
        `【操作要求】`,
        `已根据客户提供的信息生成 SOP（测试 mock）。`,
        ``,
        `【注意事项】`,
        `- 实际由 LLM 参考模板生成完整 SOP`,
      ].join("\n"),
      scenarioName: matchResult.scenarioName,
      fieldsUsed: Object.keys((step3.sopInput as Record<string, unknown>).providedFields as object || {}),
    };
  }

  // Step 5: format-output
  const final = await formatOutput({
    params: {
      sopInput: step3.sopInput,
      matchResult: step3.matchResult,
      completenessResult,
      sopGenerationResult,
      validationResult,
    },
  });

  return {
    outputPath: (final.structured as Record<string, unknown>).outputPath as string,
    detail: final as Record<string, unknown>,
  };
}

// ─── 主逻辑 ────────────────────────────────────────────────────

async function runTests() {
  console.log("");
  console.log("=".repeat(60));
  console.log("  nonstandard-sop-guide E2E Test");
  console.log("=".repeat(60));
  console.log("");

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    process.stdout.write(`[TEST] ${tc.name} ... `);
    try {
      const result = await runFlow(tc.input);
      if (result.outputPath === tc.expectedOutputPath) {
        console.log(`PASS (outputPath=${result.outputPath})`);
        passed++;
      } else {
        console.log(`FAIL`);
        console.log(`       expected: ${tc.expectedOutputPath}`);
        console.log(`       actual:   ${result.outputPath}`);
        console.log(`       ${tc.description}`);
        failed++;
      }

      const analysis = result.detail.analysis as string;
      if (analysis) {
        const preview = analysis.replace(/\n/g, "\\n").slice(0, 120);
        console.log(`       reply: ${preview}${analysis.length > 120 ? "..." : ""}`);
      }

      // 输出结构化关键字段
      const structured = result.detail.structured as Record<string, unknown>;
      if (structured.missingFields) {
        console.log(`       missingFields: ${JSON.stringify(structured.missingFields)}`);
      }
      console.log();
    } catch (err) {
      console.log(`ERROR`);
      console.log(`       ${(err instanceof Error ? err.message : String(err)).slice(0, 300)}`);
      failed++;
      console.log();
    }
  }

  console.log("-".repeat(60));
  console.log(`  Result: ${passed} passed, ${failed} failed, ${TEST_CASES.length} total`);
  console.log("-".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
