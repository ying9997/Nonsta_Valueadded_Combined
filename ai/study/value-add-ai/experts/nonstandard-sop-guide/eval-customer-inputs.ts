/**
 * eval-customer-inputs.ts — 用 489 条 Udesk 真实客户首句跑 match-template。
 * 确定哪些场景召回率高、可以第一批上线。
 *
 * 运行：npx tsx eval-customer-inputs.ts
 * 输出：eval-customer-inputs-report.md
 */

import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { main as validateInput } from "./nodes/validate-input.js";
import { main as matchTemplate } from "./nodes/match-template.js";

interface CustomerInput {
  conversationId: string;
  customer: string;
  sceneClassification: string;
  customerFirstIntent: string;
  messageCount: number;
  date: string;
}

interface EvalResult {
  index: number;
  conversationId: string;
  sceneClassification: string;
  customerInput: string;
  matched: boolean;
  predictedScene: string;
  predictedCategory: string;
  confidence: string;
  scenarioId: number | null;
}

async function main() {
  const inputPath = path.resolve(__dirname, "extracted-customer-inputs.json");
  const inputs: CustomerInput[] = JSON.parse(readFileSync(inputPath, "utf-8"));
  console.log(`载入 ${inputs.length} 条客户首句，开始评测...\n`);

  const results: EvalResult[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const item = inputs[i];

    const step1 = await validateInput({
      params: {
        customerIntent: item.customerFirstIntent,
        exceptionCode: "",
        exceptionName: "",
        recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
        serviceAtom: "库内其他服务需求",
        providedFields: {},
      },
    });

    const validationResult = step1.validationResult as Record<string, unknown>;
    if (!validationResult.ok) {
      results.push({
        index: i,
        conversationId: item.conversationId,
        sceneClassification: item.sceneClassification,
        customerInput: item.customerFirstIntent.slice(0, 100),
        matched: false,
        predictedScene: "[validation_failed]",
        predictedCategory: "-",
        confidence: "-",
        scenarioId: null,
      });
      continue;
    }

    const step2 = await matchTemplate({
      params: { sopInput: step1.sopInput, validationResult },
    });
    const matchResult = step2.matchResult as Record<string, unknown>;

    results.push({
      index: i,
      conversationId: item.conversationId,
      sceneClassification: item.sceneClassification,
      customerInput: item.customerFirstIntent.slice(0, 100),
      matched: matchResult.matched as boolean,
      predictedScene: (matchResult.scenarioName as string) || "[无匹配]",
      predictedCategory: (matchResult.category as string) || "-",
      confidence: (matchResult.confidence as string) || "-",
      scenarioId: (matchResult.scenarioId as number) || null,
    });

    if ((i + 1) % 50 === 0) console.log(`  已处理 ${i + 1}/${inputs.length}...`);
  }

  console.log(`\n全部处理完成，生成报告...\n`);

  // ─── 统计 ──────────────────────────────────────────────────────

  const total = results.length;
  const matched = results.filter((r) => r.matched);
  const matchRate = ((matched.length / total) * 100).toFixed(1);
  const highConf = matched.filter((r) => r.confidence === "high");
  const medConf = matched.filter((r) => r.confidence === "medium");
  const lowConf = matched.filter((r) => r.confidence === "low");

  // 按预测场景统计
  const byPredicted = new Map<string, EvalResult[]>();
  for (const r of results) {
    const key = r.matched ? r.predictedScene : "[无匹配]";
    const list = byPredicted.get(key) || [];
    list.push(r);
    byPredicted.set(key, list);
  }

  // 按预测场景ID统计命中分布
  const byScenarioId = new Map<number, { name: string; count: number; highConf: number; medConf: number; lowConf: number }>();
  for (const r of matched) {
    if (!r.scenarioId) continue;
    const existing = byScenarioId.get(r.scenarioId) || { name: r.predictedScene, count: 0, highConf: 0, medConf: 0, lowConf: 0 };
    existing.count++;
    if (r.confidence === "high") existing.highConf++;
    else if (r.confidence === "medium") existing.medConf++;
    else existing.lowConf++;
    byScenarioId.set(r.scenarioId, existing);
  }

  // ─── 生成报告 ──────────────────────────────────────────────────

  const lines: string[] = [];
  lines.push("# 客户首句评测报告：489 条 Udesk 真实对话");
  lines.push("");
  lines.push(`> 日期：${new Date().toISOString().slice(0, 10)}`);
  lines.push(`> 数据源：extracted-customer-inputs.json（从 Udesk 非标增值对话中提取）`);
  lines.push(`> 目的：确定第一批可上线场景`);
  lines.push("");

  lines.push("## 总体指标");
  lines.push("");
  lines.push("| 指标 | 值 |");
  lines.push("|------|-----|");
  lines.push(`| 总样本 | ${total} |`);
  lines.push(`| 命中场景 | ${matched.length} (${matchRate}%) |`);
  lines.push(`| 未命中 | ${total - matched.length} (${((total - matched.length) / total * 100).toFixed(1)}%) |`);
  lines.push(`| 高置信 | ${highConf.length} |`);
  lines.push(`| 中置信 | ${medConf.length} |`);
  lines.push(`| 低置信 | ${lowConf.length} |`);
  lines.push("");

  lines.push("## 按场景命中分布（第一批上线候选）");
  lines.push("");
  lines.push("| 场景ID | 场景名称 | 命中数 | 高置信 | 中置信 | 低置信 | 上线建议 |");
  lines.push("|--------|---------|--------|--------|--------|--------|---------|");

  const sortedScenarios = [...byScenarioId.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [id, stats] of sortedScenarios) {
    const recommend = stats.highConf + stats.medConf >= 5 ? "第一批" : stats.count >= 3 ? "观察" : "暂缓";
    lines.push(`| ${id} | ${stats.name} | ${stats.count} | ${stats.highConf} | ${stats.medConf} | ${stats.lowConf} | ${recommend} |`);
  }

  lines.push("");
  lines.push("## 第一批上线建议");
  lines.push("");
  lines.push("准入条件：中+高置信命中 >= 5 条，且该场景知识库模板完整（场景 1-12）");
  lines.push("");

  const firstBatch = sortedScenarios.filter(([id, stats]) => (stats.highConf + stats.medConf >= 5) && id <= 12);
  const secondBatch = sortedScenarios.filter(([id, stats]) => (stats.highConf + stats.medConf >= 5) && id > 12);
  const watchList = sortedScenarios.filter(([_, stats]) => stats.count >= 3 && (stats.highConf + stats.medConf < 5));

  if (firstBatch.length > 0) {
    lines.push("### 可直接上线（模板完整 + 召回高）");
    lines.push("");
    for (const [id, stats] of firstBatch) {
      lines.push(`- **场景 ${id}: ${stats.name}** — ${stats.count} 次命中，${stats.highConf + stats.medConf} 次中高置信`);
    }
    lines.push("");
  }

  if (secondBatch.length > 0) {
    lines.push("### 待业务方补模板后上线（召回高但模板不完整）");
    lines.push("");
    for (const [id, stats] of secondBatch) {
      lines.push(`- **场景 ${id}: ${stats.name}** — ${stats.count} 次命中，需补完整 SOP 模板`);
    }
    lines.push("");
  }

  if (watchList.length > 0) {
    lines.push("### 观察（有命中但置信不足，需优化关键词或引入 LLM 匹配）");
    lines.push("");
    for (const [id, stats] of watchList) {
      lines.push(`- 场景 ${id}: ${stats.name} — ${stats.count} 次命中，${stats.lowConf} 次低置信`);
    }
    lines.push("");
  }

  lines.push("## 预测场景全量分布");
  lines.push("");
  lines.push("| 预测场景 | 命中次数 |");
  lines.push("|---------|---------|");
  [...byPredicted.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([scene, items]) => {
      lines.push(`| ${scene} | ${items.length} |`);
    });

  lines.push("");
  lines.push("## 未命中样本（前 20 条）");
  lines.push("");
  lines.push("| # | Udesk场景分类 | 客户首句（前80字） |");
  lines.push("|---|--------------|------------------|");
  results
    .filter((r) => !r.matched)
    .slice(0, 20)
    .forEach((r) => {
      const input = r.customerInput.replace(/\n/g, " ").replace(/\|/g, "\\|").slice(0, 80);
      lines.push(`| ${r.index + 1} | ${r.sceneClassification || "-"} | ${input} |`);
    });

  const reportPath = path.resolve(__dirname, "eval-customer-inputs-report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`报告: ${reportPath}`);

  // 终端摘要
  console.log("");
  console.log("=".repeat(55));
  console.log(`  总样本: ${total} | 命中: ${matched.length} (${matchRate}%)`);
  console.log(`  高置信: ${highConf.length} | 中置信: ${medConf.length} | 低置信: ${lowConf.length}`);
  console.log("");
  console.log("  第一批上线候选场景:");
  if (firstBatch.length > 0) {
    firstBatch.forEach(([id, stats]) => console.log(`    [${id}] ${stats.name} (${stats.highConf + stats.medConf} 中高置信)`));
  } else {
    console.log("    (无满足条件的场景)");
  }
  console.log("=".repeat(55));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
