/**
 * Error attribution over historical F-001 pool (rules only, --skip-llm).
 *
 * Usage:
 *   npx tsx internal-review-copilot/scripts/run-error-analysis.ts \
 *     --input _runs/20260901_oms_facts/details.json \
 *     --out _runs/20260907_error_analysis
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";

interface Bucket {
  node: string;
  category: string;
  count: number;
  pct: number;
  note: string;
  examples: string[];
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function classify(result: PipelineResult): { node: string; category: string; note: string } {
  const gate = result.failureGate || "";
  const missingReq = result.missingRequirementItems || [];
  const missingAtt = result.missingAttachments || [];
  const decision = result.matchResult?.decision || "";
  const reason = result.matchResult?.reason || "";

  if (gate === "validate-input" || result.outputPath === "invalid_input") {
    return { node: "validate-input", category: "invalid_input", note: result.validationMessage || "输入无效" };
  }

  if (gate === "check-requirement" || result.outputPath === "needs_requirement_clarification") {
    if (missingReq.includes("操作动作不清")) {
      return { node: "check-requirement", category: "缺操作动作", note: missingReq.join("；") };
    }
    if (missingReq.includes("操作对象不清")) {
      return { node: "check-requirement", category: "缺操作对象", note: missingReq.join("；") };
    }
    if (missingReq.includes("需求背景/操作目的/处理去向不清")) {
      return { node: "check-requirement", category: "缺背景/目的/去向", note: missingReq.join("；") };
    }
    if (!asText(result.agentInput?.omsFacts?.customerRequirementDescription) && !asText(result.agentInput?.customerIntent)) {
      return { node: "check-requirement", category: "需求不完整", note: "描述为空/太短" };
    }
    return { node: "check-requirement", category: "需求不完整", note: missingReq.join("；") || "需求未过 pre-match" };
  }

  if (gate === "match-template" || (result.node === "match-template" && !result.matchResult?.supported)) {
    if (decision === "unsupported") {
      return { node: "match-template", category: "unsupported（不是换标）", note: reason || "unsupported" };
    }
    if (decision === "ambiguous") {
      return { node: "match-template", category: "ambiguous（边界模糊）", note: reason || "ambiguous" };
    }
    return { node: "match-template", category: "unsupported（不是换标）", note: reason || decision || "not supported" };
  }

  if (gate === "check-completeness" || result.outputPath === "needs_field_clarification") {
    if (missingAtt.includes("操作说明附件")) {
      return { node: "check-completeness", category: "缺操作说明", note: missingAtt.join("；") };
    }
    if (missingAtt.some((m) => m.includes("对应关系"))) {
      return { node: "check-completeness", category: "缺对应关系", note: missingAtt.join("；") };
    }
    if (missingAtt.includes("标签文件")) {
      return { node: "check-completeness", category: "缺标签文件", note: missingAtt.join("；") };
    }
    return { node: "check-completeness", category: "缺其他附件/字段", note: (result.missing || []).join("；") };
  }

  if (result.ruleOutputPath === "sop_generated" || result.outputPath === "sop_generated") {
    return { node: "check-completeness", category: "全齐 → sop_generated", note: "材料齐全进入 SOP" };
  }

  if (result.outputPath === "transfer_human") {
    return { node: "match-template", category: "ambiguous（边界模糊）", note: reason || "transfer_human" };
  }

  return { node: result.node || "unknown", category: "其他", note: `${result.outputPath}/${gate}` };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const inputPath = resolve(projectRoot, arg("input") || "_runs/20260901_oms_facts/details.json");
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260907_error_analysis");
  if (!existsSync(inputPath)) throw new Error(`input 不存在: ${inputPath}`);

  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  console.log(`error-analysis: ${details.length} orders, skipLlm=true`);

  const classified: Array<{
    orderNo: string;
    outputPath: string;
    ruleOutputPath: string;
    failureGate: string;
    decision: string;
    sceneKey: string;
    reason: string;
    missing: string[];
    node: string;
    category: string;
    note: string;
  }> = [];

  let i = 0;
  for (const detail of details) {
    i += 1;
    const orderNo = asText(detail.orderNo);
    const result = await runPipeline(detail, { skipLlm: true });
    if (!result) continue;
    const c = classify(result);
    classified.push({
      orderNo: result.orderNo || orderNo,
      outputPath: result.outputPath,
      ruleOutputPath: result.ruleOutputPath,
      failureGate: result.failureGate,
      decision: result.matchResult?.decision || "",
      sceneKey: result.matchResult?.sceneKey || "",
      reason: result.matchResult?.reason || "",
      missing: result.missing || [],
      ...c,
    });
    if (i % 20 === 0) console.log(`  processed ${i}/${details.length}`);
  }

  const total = classified.length;
  const keyOf = (c: { node: string; category: string }) => `${c.node}||${c.category}`;
  const notes: Record<string, string> = {
    "check-requirement||需求不完整": "描述为空/太短或缺多项",
    "check-requirement||缺操作动作": "有描述但不明确操作动作",
    "check-requirement||缺操作对象": "看不出处理对象",
    "check-requirement||缺背景/目的/去向": "缺背景/目的/去向",
    "match-template||unsupported（不是换标）": "拦截/暂存/直接上架等非换标",
    "match-template||ambiguous（边界模糊）": "F-001 vs A/B 或置信不足",
    "match-template||supported → check-completeness": "进入下一步",
    "check-completeness||缺操作说明": "缺操作说明附件",
    "check-completeness||缺对应关系": "缺商品/标签对应关系",
    "check-completeness||缺标签文件": "缺标签文件",
    "check-completeness||缺其他附件/字段": "其它材料缺失",
    "check-completeness||全齐 → sop_generated": "规则侧可出 SOP",
  };

  // Also count "supported → check-completeness" as those that entered completeness (gate empty or check-completeness or sop)
  const bucketMap = new Map<string, { node: string; category: string; examples: string[]; note: string }>();
  for (const row of classified) {
    const k = keyOf(row);
    if (!bucketMap.has(k)) {
      bucketMap.set(k, {
        node: row.node,
        category: row.category,
        examples: [],
        note: notes[k] || row.note,
      });
    }
    const b = bucketMap.get(k)!;
    if (b.examples.length < 5) b.examples.push(row.orderNo);
  }

  // Add synthetic count for supported→completeness path entries that reached completeness node
  const enteredCompleteness = classified.filter(
    (r) => r.failureGate === "check-completeness" || r.category === "全齐 → sop_generated" || r.ruleOutputPath === "needs_field_clarification" || r.ruleOutputPath === "sop_generated",
  ).length;

  const buckets: Bucket[] = [...bucketMap.entries()]
    .map(([, b]) => {
      const count = classified.filter((r) => r.node === b.node && r.category === b.category).length;
      return {
        node: b.node,
        category: b.category,
        count,
        pct: total ? (count / total) * 100 : 0,
        note: b.note,
        examples: b.examples,
      };
    })
    .sort((a, b) => b.count - a.count);

  const sum = buckets.reduce((acc, b) => acc + b.count, 0);
  if (sum !== total) {
    throw new Error(`bucket sum ${sum} !== total ${total}`);
  }

  const top5 = buckets.slice(0, 5);
  const checkReqAction = buckets.find((b) => b.node === "check-requirement" && b.category === "缺操作动作");
  const suggestions: string[] = [];
  if (checkReqAction && checkReqAction.count > 0) {
    suggestions.push(
      `如果放宽/修正 check-requirement「缺操作动作」规则，预期约 ${checkReqAction.count} 条可能从 L1 进入 L2（需人工复核，避免误放行）。`,
    );
  }
  const unsupported = buckets.find((b) => b.category.startsWith("unsupported"));
  if (unsupported) {
    suggestions.push(
      `match-template unsupported ${unsupported.count} 条：多为拦截/非换标，不应用 F-001 正例优化强行吸入。`,
    );
  }
  const ambiguous = buckets.find((b) => b.category.startsWith("ambiguous"));
  if (ambiguous) {
    suggestions.push(
      `ambiguous ${ambiguous.count} 条：优先补边界特征（辨识信号 / 包裹类异常信号），而不是降低阈值阈值。`,
    );
  }
  const missOp = buckets.find((b) => b.category === "缺操作说明");
  const missMap = buckets.find((b) => b.category === "缺对应关系");
  if (missOp || missMap) {
    suggestions.push(
      `check-completeness 材料缺口（操作说明 ${(missOp?.count || 0)} + 对应关系 ${(missMap?.count || 0)}）：可对客服首问话术做清单化，预期减少 L3 往返。`,
    );
  }
  suggestions.push(`本池进入 check-completeness 或更后共 ${enteredCompleteness} 条（含缺附件与全齐）。`);

  mkdirSync(outDir, { recursive: true });
  const jsonPayload = {
    total,
    generatedAt: new Date().toISOString(),
    input: inputPath,
    buckets,
    top5,
    suggestions,
    rows: classified,
  };
  writeFileSync(resolve(outDir, "error-analysis.json"), `${JSON.stringify(jsonPayload, null, 2)}\n`, "utf8");

  const md = [
    "# 错误归因报告（183 历史 F-001 池）",
    "",
    `- 输入：\`${inputPath}\``,
    `- 样本数：${total}`,
    `- 模式：\`runPipeline({ skipLlm: true })\`（只跑规则）`,
    `- 说明：池内单曾标 F-001 场景码，但需求文案未必都能被当前规则判为 supported`,
    "",
    "## 汇总表",
    "",
    "| 节点 | 分类 | 数量 | 占比 | 说明 |",
    "|------|------|------|------|------|",
    ...buckets.map(
      (b) => `| ${b.node} | ${b.category} | ${b.count} | ${b.pct.toFixed(1)}% | ${b.note} |`,
    ),
    "",
    `合计：${sum} / ${total}`,
    "",
    "## Top 5 高频错误原因",
    "",
    ...top5.flatMap((b, idx) => [
      `### ${idx + 1}. ${b.node} / ${b.category}（${b.count}，${b.pct.toFixed(1)}%）`,
      "",
      `- 说明：${b.note}`,
      `- 示例单号：${b.examples.slice(0, 3).join("、") || "-"}`,
      "",
    ]),
    "## 优化建议",
    "",
    ...suggestions.map((s) => `- ${s}`),
    "",
    "结构化明细见 `error-analysis.json`。",
    "",
  ].join("\n");

  writeFileSync(resolve(outDir, "error-analysis.md"), md, "utf8");
  console.log(`wrote ${outDir}`);
  console.log(buckets.map((b) => `${b.node}/${b.category}=${b.count}`).join("\n"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
