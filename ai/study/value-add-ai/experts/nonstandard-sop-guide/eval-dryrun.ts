/**
 * eval-dryrun.ts — 干跑评测：用真实数据验证 match-template 的召回率和准确率。
 * 不需要 LLM，只跑 validate-input + match-template。
 *
 * 运行：npx tsx eval-dryrun.ts
 * 输出：eval-dryrun-report.md（评测报告）
 */

import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { main as validateInput } from "./nodes/validate-input.js";
import { main as matchTemplate } from "./nodes/match-template.js";

// ─── CSV 解析（处理含逗号/换行的 quoted 字段） ─────────────────

function parseCSV(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1) rows.push(current);
        current = [];
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1) rows.push(current);
  }

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (row[i] || "").trim();
    });
    return obj;
  });
}

// ─── 主逻辑 ────────────────────────────────────────────────────

interface EvalResult {
  rowIndex: number;
  vasOrderNo: string;
  actualScene: string;
  actualSceneCode: string;
  customerInput: string;
  matched: boolean;
  predictedScene: string;
  predictedCategory: string;
  confidence: string;
  candidates: string[];
}

async function main() {
  const csvPath = path.resolve("D:/DA/vas_OW01V1602_20260701_20260731_with_scene.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(raw);

  console.log(`载入 ${rows.length} 条数据，开始干跑...\n`);

  const results: EvalResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const customerInput = row["submit_beor_需求背景说明"] || row["submit_rd_需求描述"] || "";
    const actualScene = row["scene_overview_name"] || "";
    const actualSceneCode = row["scene_overview_code"] || "";
    const abnormalNos = row["abnormal_nos"] || "";

    // Step 1: validate-input（所有数据都是 OSF6V1602/库内其他服务需求，应该全部通过）
    const step1 = await validateInput({
      params: {
        customerIntent: customerInput,
        exceptionCode: abnormalNos.split("|")[0] || "",
        exceptionName: "",
        recommendedVasc: { vascCode: "OSF6V1603", vascName: "库内其他服务需求" },
        serviceAtom: "库内其他服务需求",
        providedFields: {},
      },
    });

    const validationResult = step1.validationResult as Record<string, unknown>;
    if (!validationResult.ok) {
      results.push({
        rowIndex: i,
        vasOrderNo: row["vas_order_no"] || "",
        actualScene,
        actualSceneCode,
        customerInput: customerInput.slice(0, 80),
        matched: false,
        predictedScene: `[VALIDATION_FAILED: ${validationResult.reason}]`,
        predictedCategory: "-",
        confidence: "-",
        candidates: [],
      });
      continue;
    }

    // Step 2: match-template
    const step2 = await matchTemplate({
      params: { sopInput: step1.sopInput, validationResult },
    });
    const matchResult = step2.matchResult as Record<string, unknown>;

    const candidates = ((matchResult.candidateScenarios || []) as Array<{ name: string }>).map(
      (c) => c.name
    );

    results.push({
      rowIndex: i,
      vasOrderNo: row["vas_order_no"] || "",
      actualScene,
      actualSceneCode,
      customerInput: customerInput.slice(0, 80),
      matched: matchResult.matched as boolean,
      predictedScene: (matchResult.scenarioName as string) || "[无匹配]",
      predictedCategory: (matchResult.category as string) || "C",
      confidence: (matchResult.confidence as string) || "-",
      candidates,
    });

    if ((i + 1) % 20 === 0) {
      console.log(`  已处理 ${i + 1}/${rows.length}...`);
    }
  }

  console.log(`\n全部处理完成，生成报告...\n`);

  // ─── 统计 ──────────────────────────────────────────────────────

  const totalCount = results.length;
  const matchedCount = results.filter((r) => r.matched).length;
  const unmatchedCount = totalCount - matchedCount;
  const matchRate = ((matchedCount / totalCount) * 100).toFixed(1);

  // 按真实场景分组
  const byActualScene = new Map<string, EvalResult[]>();
  for (const r of results) {
    const list = byActualScene.get(r.actualScene) || [];
    list.push(r);
    byActualScene.set(r.actualScene, list);
  }

  // 按预测场景分组
  const byPredictedScene = new Map<string, EvalResult[]>();
  for (const r of results) {
    const list = byPredictedScene.get(r.predictedScene) || [];
    list.push(r);
    byPredictedScene.set(r.predictedScene, list);
  }

  // 高置信度匹配
  const highConfidence = results.filter((r) => r.confidence === "high");
  const medConfidence = results.filter((r) => r.confidence === "medium");
  const lowConfidence = results.filter((r) => r.confidence === "low");

  // ─── 生成报告 ──────────────────────────────────────────────────

  const lines: string[] = [];
  lines.push("# 干跑评测报告：match-template vs 真实数据");
  lines.push("");
  lines.push(`> 数据：vas_OW01V1602_20260701_20260731_with_scene.csv`);
  lines.push(`> 日期：${new Date().toISOString().slice(0, 10)}`);
  lines.push(`> 总条数：${totalCount}`);
  lines.push("");

  lines.push("## 总体指标");
  lines.push("");
  lines.push("| 指标 | 值 |");
  lines.push("|------|-----|");
  lines.push(`| 总样本数 | ${totalCount} |`);
  lines.push(`| 命中场景数（matched=true） | ${matchedCount} (${matchRate}%) |`);
  lines.push(`| 未命中数（走转人工） | ${unmatchedCount} (${((unmatchedCount / totalCount) * 100).toFixed(1)}%) |`);
  lines.push(`| 高置信命中 | ${highConfidence.length} |`);
  lines.push(`| 中置信命中 | ${medConfidence.length} |`);
  lines.push(`| 低置信命中 | ${lowConfidence.length} |`);
  lines.push("");

  lines.push("## 按真实场景的命中情况");
  lines.push("");
  lines.push("| 真实场景 | 总数 | 命中 | 命中率 | 主要预测为 |");
  lines.push("|---------|------|------|--------|-----------|");

  const sortedActual = [...byActualScene.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [scene, items] of sortedActual) {
    const matched = items.filter((r) => r.matched).length;
    const rate = ((matched / items.length) * 100).toFixed(0);
    const predictions = items
      .filter((r) => r.matched)
      .map((r) => r.predictedScene);
    const predictionFreq = new Map<string, number>();
    for (const p of predictions) {
      predictionFreq.set(p, (predictionFreq.get(p) || 0) + 1);
    }
    const topPredictions = [...predictionFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");

    lines.push(`| ${scene} | ${items.length} | ${matched} | ${rate}% | ${topPredictions || "-"} |`);
  }

  lines.push("");
  lines.push("## 预测场景分布");
  lines.push("");
  lines.push("| 预测场景 | 次数 | 对应的真实场景 |");
  lines.push("|---------|------|--------------|");

  const sortedPredicted = [...byPredictedScene.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [scene, items] of sortedPredicted) {
    const actualScenes = new Map<string, number>();
    for (const r of items) {
      actualScenes.set(r.actualScene, (actualScenes.get(r.actualScene) || 0) + 1);
    }
    const topActual = [...actualScenes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");
    lines.push(`| ${scene} | ${items.length} | ${topActual} |`);
  }

  lines.push("");
  lines.push("## 未命中样本（前 30 条）");
  lines.push("");
  lines.push("| # | 真实场景 | 客户输入（前80字） | 候选 |");
  lines.push("|---|---------|------------------|------|");

  const unmatchedSamples = results.filter((r) => !r.matched).slice(0, 30);
  for (const r of unmatchedSamples) {
    const input = r.customerInput.replace(/\n/g, " ").replace(/\|/g, "\\|");
    lines.push(`| ${r.rowIndex + 1} | ${r.actualScene} | ${input} | ${r.candidates.join(", ") || "-"} |`);
  }

  lines.push("");
  lines.push("## 低置信命中样本（需人工确认）");
  lines.push("");
  lines.push("| # | 真实场景 | 预测场景 | 置信度 | 客户输入（前60字） |");
  lines.push("|---|---------|---------|--------|------------------|");

  for (const r of lowConfidence.slice(0, 20)) {
    const input = r.customerInput.replace(/\n/g, " ").replace(/\|/g, "\\|").slice(0, 60);
    lines.push(`| ${r.rowIndex + 1} | ${r.actualScene} | ${r.predictedScene} | ${r.confidence} | ${input} |`);
  }

  lines.push("");
  lines.push("## 结论与下一步");
  lines.push("");
  lines.push(`- 当前关键词匹配召回率：**${matchRate}%**`);
  if (Number(matchRate) < 50) {
    lines.push("- 召回率低于 50%，说明知识库场景名称与真实数据存在显著 gap");
    lines.push("- 建议：先建立「真实场景 → 知识库场景」映射表，再优化关键词或引入 LLM 匹配");
  } else if (Number(matchRate) < 75) {
    lines.push("- 召回率在 50-75%，部分场景有 gap 需要补充关键词");
    lines.push("- 建议：对未命中的高频真实场景补充关键词覆盖");
  } else {
    lines.push("- 召回率高于 75%，关键词覆盖基本够用");
    lines.push("- 建议：关注低置信匹配的准确性，可能需要 LLM 精排");
  }

  const reportPath = path.resolve(__dirname, "eval-dryrun-report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`报告已生成：${reportPath}`);

  // 终端摘要
  console.log("");
  console.log("=".repeat(50));
  console.log(`  召回率: ${matchedCount}/${totalCount} = ${matchRate}%`);
  console.log(`  高置信: ${highConfidence.length} | 中置信: ${medConfidence.length} | 低置信: ${lowConfidence.length}`);
  console.log(`  未命中: ${unmatchedCount} 条走转人工`);
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
