/**
 * Single-case or batch pipeline trace viewer.
 *
 * Usage:
 *   # Single case
 *   npx tsx internal-review-copilot/scripts/trace-case.ts \
 *     --input _runs/20260901_oms_facts/details.json \
 *     --order VASC000000344421 \
 *     --out _runs/20260908_trace
 *
 *   # Batch: sample by error-analysis bucket
 *   npx tsx internal-review-copilot/scripts/trace-case.ts \
 *     --input _runs/20260901_oms_facts/details.json \
 *     --sample "ambiguous:1,unsupported:1,缺操作说明:1,缺操作动作:1,全齐:2" \
 *     --out _runs/20260908_trace
 *
 *   # Multiple explicit orders
 *   npx tsx internal-review-copilot/scripts/trace-case.ts \
 *     --input _runs/20260901_oms_facts/details.json \
 *     --order VASC000000344421,VASC000000335325 \
 *     --out _runs/20260908_trace
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { JsonRecord, MatchCandidate } from "../lib/types.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function templateLabel(sceneKey: string): string {
  if (sceneKey === "inbound_label_identify") return "F-001";
  if (sceneKey === "inbound_package_exception_relabel_shelving") return "A";
  if (sceneKey === "inbound_photo_hold") return "B";
  if (sceneKey === "inbound_package_barcode_batch_relabel") return "T1";
  if (sceneKey === "inbound_third_party_merchandise_barcode") return "T3";
  return sceneKey || "-";
}

function tick(v: boolean | string | null | undefined): string {
  return v ? "✓" : "✗";
}

function resolveOrderNos(inputPath: string): string[] {
  const orderArg = arg("order");
  if (orderArg) {
    return orderArg.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const sampleArg = arg("sample");
  if (sampleArg) {
    return resolveFromSample(sampleArg, inputPath);
  }

  console.error("Must provide --order or --sample");
  process.exit(1);
}

function resolveFromSample(sampleSpec: string, inputPath: string): string[] {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const errorJsonPath = resolve(projectRoot, "_runs/20260907_error_analysis/error-analysis.json");
  if (!existsSync(errorJsonPath)) {
    console.error(`error-analysis.json not found at ${errorJsonPath}. Run run-error-analysis.ts first.`);
    process.exit(1);
  }

  const errorData = JSON.parse(readFileSync(errorJsonPath, "utf8"));
  const rows: Array<{ orderNo: string; category: string }> = errorData.rows || [];

  const picks: string[] = [];
  for (const part of sampleSpec.split(",")) {
    const [keyword, countStr] = part.split(":").map((s) => s.trim());
    const count = parseInt(countStr || "1", 10);
    const matching = rows.filter((r) => r.category.includes(keyword));
    for (let i = 0; i < Math.min(count, matching.length); i++) {
      if (!picks.includes(matching[i].orderNo)) {
        picks.push(matching[i].orderNo);
      }
    }
  }

  if (!picks.length) {
    console.error(`No matching rows for sample spec: ${sampleSpec}`);
    process.exit(1);
  }
  return picks;
}

export function renderTrace(orderNo: string, detail: JsonRecord, result: PipelineResult): string {
  const lines: string[] = [];
  const req = result.requirementCheck;
  const match = result.matchResult;
  const comp = result.completenessResult;
  const ctx = result.contextFacts;
  const input = result.agentInput;

  lines.push(`# Trace: ${orderNo}`);
  lines.push("");

  // Raw input
  lines.push("## 原始输入");
  lines.push(`- **客户需求描述**: ${asText(input.omsFacts?.customerRequirementDescription) || "(空)"}`);
  lines.push(`- **需求背景**: ${asText(input.omsFacts?.requirementBackground) || "(空)"}`);
  lines.push(`- **customerIntent (pipeline 入参)**: ${input.customerIntent || "(空)"}`);
  lines.push(`- **仓库**: ${input.pageContext?.warehouseCode || "?"} / ${input.pageContext?.warehouseName || "?"}`);
  lines.push(`- **客户**: ${input.pageContext?.customerCode || "?"} / ${input.pageContext?.customerName || "?"}`);
  lines.push(`- **服务原子**: ${input.serviceAtom || "?"}`);
  lines.push(`- **OMS 场景码**: ${input.sceneCode || "?"} / ${input.sceneName || "?"}`);

  const attStatus = input.pageContext?.attachmentStatus;
  if (attStatus && typeof attStatus === "object") {
    const attLines = Object.entries(attStatus as Record<string, string>)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    lines.push(`- **附件状态**: ${attLines || "(无)"}`);
  }

  if (ctx) {
    lines.push(`- **异常单**: ${ctx.allEventNos?.length ? ctx.allEventNos.join(", ") : "(无)"}`);
    lines.push(`- **入库单**: ${ctx.allBusinessOrderNos?.length ? ctx.allBusinessOrderNos.join(", ") : "(无)"}`);
  }
  lines.push("");

  // Node 1: validate-input
  const hitValidate = result.nodesHit.includes("validate-input");
  if (hitValidate && result.failureGate === "validate-input") {
    lines.push(`## 1. validate-input → FAIL`);
    lines.push(`- reason: ${result.validationMessage || "unknown"}`);
    lines.push("");
    appendConclusion(lines, result);
    return lines.join("\n");
  }
  lines.push("## 1. validate-input → PASS");
  lines.push("");

  // Node 2: context-bind
  if (ctx) {
    lines.push("## 2. context-bind");
    lines.push(`- boundKeys: [${ctx.boundKeys?.join(", ") || ""}]`);
    lines.push(`- 异常单: [${ctx.allEventNos?.join(", ") || ""}]`);
    lines.push(`- 入库单: [${ctx.allBusinessOrderNos?.join(", ") || ""}]`);
    lines.push("");
  }

  // Node 3: check-requirement
  if (req) {
    lines.push("## 3. check-requirement");
    lines.push(`- 正则化文本: "${req.normalizedRequirement}"`);
    lines.push(`- 操作对象(OBJECT_RE): ${tick(req.objectMatch)} ${req.objectMatch ? `命中 "${req.objectMatch}"` : "未命中"} | context 兜底? ${req.objectBoundBypass ? "Yes" : "No"}`);
    lines.push(`- 操作动作(ACTION_RE): ${tick(req.actionMatch)} ${req.actionMatch ? `命中 "${req.actionMatch}"` : "未命中"}`);
    lines.push(`- 目的/去向(PURPOSE_RE): ${tick(req.purposeMatch)} ${req.purposeMatch ? `命中 "${req.purposeMatch}"` : "未命中"} | context 兜底? ${req.purposeBoundBypass ? "Yes" : "No"}`);
    lines.push(`- **结论: complete=${req.complete}** ${req.complete ? "→ 进入 match-template" : `→ 缺 [${req.missingRequirementItems.join(", ")}]`}`);
    lines.push("");
  }

  if (result.failureGate === "check-requirement") {
    lines.push("## 4. match-template (未到达 — check-requirement 未通过)");
    lines.push("");
    lines.push("## 5. check-completeness (未到达)");
    lines.push("");
    appendConclusion(lines, result);
    return lines.join("\n");
  }

  // Node 4: match-template
  if (match) {
    lines.push("## 4. match-template");

    // Query signals
    const qs = match.querySignals;
    if (qs) {
      lines.push("### 信号提取");
      const flags = [
        `hasRelabel=${qs.hasRelabel}`,
        `hasIdentify=${qs.hasIdentify}`,
        `interceptHold=${qs.interceptHold}`,
        `hasPhoto=${qs.hasPhoto}`,
        `hasShelve=${qs.hasShelve}`,
        `hasPackageException=${qs.hasPackageException}`,
        `hasPhotoHold=${qs.hasPhotoHold}`,
        `hasDirectScanShelve=${qs.hasDirectScanShelve}`,
      ];
      lines.push(flags.join(", "));
      lines.push("");
    }

    lines.push("### 动作→场景约束");
    const actions = match.matchedActions?.length ? match.matchedActions.map((a) => `"${a}"`).join(", ") : "(无)";
    const candScenes = match.actionCandidateScenes?.length
      ? match.actionCandidateScenes.map((k) => templateLabel(k)).join(", ")
      : "(无)";
    const exclScenes = match.actionExcludedScenes?.length
      ? match.actionExcludedScenes.map((k) => templateLabel(k)).join(", ")
      : "(无)";
    lines.push(`- 提取的动作: [${actions}]`);
    lines.push(`- 约束候选场景: [${candScenes}]`);
    lines.push(`- 排斥场景: [${exclScenes}]`);
    lines.push("");

    // Card scores
    if (match.candidates?.length) {
      lines.push("### 场景打分");
      lines.push("| 场景 | 标签 | 分数 | 命中信号 | 排除信号 |");
      lines.push("|------|------|------|----------|----------|");
      for (const c of match.candidates) {
        const label = templateLabel(c.sceneKey);
        const matched = c.matchedSignals?.length ? c.matchedSignals.join(", ") : "-";
        const negatives = c.negativeSignals?.length ? c.negativeSignals.join(", ") : "-";
        lines.push(`| ${c.sceneKey} | ${label} | ${c.score} | ${matched} | ${negatives} |`);
      }
      lines.push("");
    }

    // Decision path
    lines.push("### 决策");
    if (match.decisionPath) {
      lines.push(`**${match.decisionPath}**`);
    } else {
      lines.push(`decision=${match.decision}, reason=${match.reason}, score=${match.score}`);
    }
    lines.push("");

    // Phase 2 LLM scene classification
    if (match.llmClassification || match.llmUsed) {
      const llm = match.llmClassification;
      const ver = llm?.sceneLlmVersion;
      const title =
        ver === 3
          ? "### LLM 场景分类（Phase 2 v3 — 自主工具调用）"
          : ver === 2
            ? "### LLM 场景分类（Phase 2 v2 — 异常预查+规则）"
            : ver === 1
              ? "### LLM 场景分类（Phase 2 v1）"
              : "### LLM 场景分类（Phase 2）";
      lines.push(title);
      lines.push(`- llmUsed: ${match.llmUsed ? "true" : "false"}`);
      if (ver) lines.push(`- sceneLlmVersion: ${ver}`);
      if (llm) {
        const oms =
          llm.matchedScene === "unsupported"
            ? "不支持的场景"
            : match.scenarioName || llm.matchedScene;
        lines.push(`- matchedScene: ${oms} (\`${llm.matchedScene}\`)`);
        lines.push(`- confidence: ${llm.confidence}`);

        if (ver === 3) {
          lines.push("");
          lines.push("#### 工具调用链");
          lines.push("| 轮次 | 工具 | 入参 | 返回摘要 |");
          lines.push("|------|------|------|---------|");
          const hist = llm.toolCallHistory || [];
          if (!hist.length) {
            lines.push("| — | （无工具调用，LLM 直接输出） | | |");
          } else {
            for (const h of hist) {
              const args = JSON.stringify(h.arguments).replace(/\|/g, "/").slice(0, 80);
              let summary = (h.result || "").replace(/\s+/g, " ").replace(/\|/g, "/");
              try {
                const obj = JSON.parse(h.result) as { summary?: string; note?: string; error?: boolean };
                if (obj.summary) summary = obj.summary;
                else if (obj.note) summary = obj.note;
                else if (obj.error) summary = summary.slice(0, 100);
                else summary = summary.slice(0, 100);
              } catch {
                summary = summary.slice(0, 100);
              }
              lines.push(`| ${h.round} | ${h.toolName} | ${args} | ${summary} |`);
            }
          }
          lines.push("");
          lines.push(`- totalToolRounds: ${llm.totalToolRounds ?? hist.length}`);
          lines.push("");
          lines.push("#### LLM 推理");
          lines.push(`> ${(llm.reasoning || "（空）").replace(/\n/g, " ")}`);
          lines.push("");
        } else {
          lines.push(`- reasoning: ${llm.reasoning || "（空）"}`);
        }

        lines.push(
          `- extractedActions: [${(llm.extractedActions || []).map((a) => `"${a}"`).join(", ")}]`,
        );
        lines.push(
          `- alternativeScenes: [${(llm.alternativeScenes || []).map((k) => templateLabel(k)).join(", ")}]`,
        );
        lines.push(`- ambiguous: ${llm.ambiguous}`);
        const ruleCands = match.ruleCandidateScenes || [];
        const consistent =
          llm.matchedScene !== "unsupported" && ruleCands.includes(llm.matchedScene);
        lines.push(`- 与规则初筛一致: ${consistent ? "✓" : "✗"}（candidates=[${ruleCands.map(templateLabel).join(", ")}]）`);
      }
      lines.push("");
    }

    const retrieved = match.retrievedCases || [];
    lines.push("### 相似案例检索（RAG）");
    if (!retrieved.length) {
      lines.push("（未检索到案例，或 RAG 关闭）");
    } else {
      const injected = retrieved.filter((c) => c.score >= 1);
      if (!injected.length) {
        lines.push(
          `最高分 ${retrieved[0].score.toFixed(1)} < 1.0，未注入 few-shot。`,
        );
      }
      lines.push("| 排名 | 案例 | 场景 | 相似度 | 关键动作 | 注入提示词 |");
      lines.push("|------|------|------|--------|---------|-----------|");
      retrieved.forEach((c, i) => {
        lines.push(
          `| ${i + 1} | ${c.caseId} | ${c.sceneName} | ${c.score.toFixed(1)} | ${c.keyAction || "—"} | ${c.score >= 1 ? "是" : "否"} |`,
        );
      });
    }
    lines.push("");
  }

  if (result.failureGate === "match-template") {
    lines.push("## 5. check-completeness (未到达 — match-template 未通过)");
    lines.push("");
    appendConclusion(lines, result);
    return lines.join("\n");
  }

  // Node 5: check-completeness
  if (comp) {
    lines.push("## 5. check-completeness");
    lines.push(`- applicable: ${comp.applicable}`);
    lines.push(`- complete: ${comp.complete}`);
    lines.push(`- provided: ${comp.providedCount}/${comp.totalRequired}`);
    if (comp.missingAttachments?.length) {
      lines.push(`- 缺附件: [${comp.missingAttachments.join(", ")}]`);
    }
    if (comp.missingFields?.length) {
      lines.push(`- 缺字段: [${comp.missingFields.map((f) => f.field).join(", ")}]`);
    }
    if (comp.complete) {
      lines.push("- **全齐 → 进入 SOP 生成**");
    }
    lines.push("");
  }

  if (result.failureGate === "check-completeness") {
    appendConclusion(lines, result);
    return lines.join("\n");
  }

  // Node 6: LLM
  if (result.llm) {
    lines.push("## 6. LLM 生成");
    lines.push(`- model: ${result.llm.model}`);
    lines.push(`- mocked: ${result.llm.mocked}`);
    lines.push(`- error: ${result.llm.error || "null"}`);
    if (result.llm.reflectionPass !== undefined) {
      lines.push(`- reflectionPass: ${result.llm.reflectionPass}`);
      if (result.llm.reflectionIssues?.length) {
        lines.push(`- reflectionIssues: ${result.llm.reflectionIssues.join("; ")}`);
      }
      lines.push(`- regenerated: ${result.llm.regenerated || false}`);
    }
    lines.push("");
  } else {
    lines.push("## 6. LLM (--skip-llm, 未执行)");
    lines.push("");
  }

  appendConclusion(lines, result);
  return lines.join("\n");
}

function appendConclusion(lines: string[], result: PipelineResult): void {
  lines.push("## 最终结论");
  lines.push(`- outputPath: **${result.outputPath}**`);
  lines.push(`- ruleOutputPath: ${result.ruleOutputPath}`);
  lines.push(`- failureGate: ${result.failureGate || "(无)"}`);
  if (result.matchResult) {
    lines.push(`- decision: ${result.matchResult.decision}`);
    lines.push(`- reason: ${result.matchResult.reason}`);
  }
  if (result.missing?.length) {
    lines.push(`- missing: [${result.missing.join(", ")}]`);
  }
  if (result.riskFlags?.length) {
    lines.push(`- riskFlags: [${result.riskFlags.join(", ")}]`);
  }
  lines.push("");
  lines.push("---");
  lines.push("> **你的判断（待填）：**");
  lines.push("> - 这条单应该走什么路径？ ___");
  lines.push("> - 理由？ ___");
  lines.push("");
}

function renderIndex(traces: Array<{ orderNo: string; result: PipelineResult }>): string {
  const lines: string[] = [];
  lines.push("# Trace Index");
  lines.push("");
  lines.push(`- 日期: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`- 样本数: ${traces.length}`);
  lines.push("");
  lines.push("| # | VASC | outputPath | failureGate | decision | reason | trace |");
  lines.push("|---|------|------------|-------------|----------|--------|-------|");
  traces.forEach(({ orderNo, result }, i) => {
    const decision = result.matchResult?.decision || "-";
    const reason = result.matchResult?.reason || "-";
    lines.push(`| ${i + 1} | ${orderNo} | ${result.outputPath} | ${result.failureGate || "-"} | ${decision} | ${reason} | [trace](${orderNo}.trace.md) |`);
  });
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const inputPath = resolve(projectRoot, arg("input") || "_runs/20260901_oms_facts/details.json");
  const outDir = resolve(projectRoot, arg("out") || `_runs/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_trace`);
  const skipLlm = !hasFlag("with-llm");

  if (!existsSync(inputPath)) {
    console.error(`input not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details: JsonRecord[] = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const orderNos = resolveOrderNos(inputPath);

  console.log(`trace-case: ${orderNos.length} orders, skipLlm=${skipLlm}`);
  mkdirSync(outDir, { recursive: true });

  const traces: Array<{ orderNo: string; result: PipelineResult }> = [];

  for (const orderNo of orderNos) {
    const detail = details.find((d) => asText(d.orderNo) === orderNo);
    if (!detail) {
      console.warn(`  ${orderNo}: not found in input, skipping`);
      continue;
    }

    const result = await runPipeline(detail, { skipLlm });
    if (!result) {
      console.warn(`  ${orderNo}: pipeline returned null, skipping`);
      continue;
    }

    const md = renderTrace(orderNo, detail, result);
    const tracePath = resolve(outDir, `${orderNo}.trace.md`);
    writeFileSync(tracePath, md, "utf8");
    console.log(`  ${orderNo} → ${result.outputPath} (${result.matchResult?.reason || result.failureGate || "-"})`);
    traces.push({ orderNo, result });
  }

  // Write index
  const indexMd = renderIndex(traces);
  writeFileSync(resolve(outDir, "index.md"), indexMd, "utf8");

  // Write structured JSON for downstream use
  const jsonPayload = traces.map(({ orderNo, result }) => ({
    orderNo,
    outputPath: result.outputPath,
    ruleOutputPath: result.ruleOutputPath,
    failureGate: result.failureGate,
    decision: result.matchResult?.decision || "",
    reason: result.matchResult?.reason || "",
    decisionPath: result.matchResult?.decisionPath || "",
    gap: result.matchResult?.gap ?? null,
    querySignals: result.matchResult?.querySignals || null,
    requirementTrace: result.requirementCheck
      ? {
          normalizedRequirement: result.requirementCheck.normalizedRequirement,
          complete: result.requirementCheck.complete,
          objectMatch: result.requirementCheck.objectMatch ?? null,
          objectBoundBypass: result.requirementCheck.objectBoundBypass ?? false,
          actionMatch: result.requirementCheck.actionMatch ?? null,
          purposeMatch: result.requirementCheck.purposeMatch ?? null,
          purposeBoundBypass: result.requirementCheck.purposeBoundBypass ?? false,
          missing: result.requirementCheck.missingRequirementItems,
        }
      : null,
    candidates: result.matchResult?.candidates?.map((c) => ({
      sceneKey: c.sceneKey,
      label: templateLabel(c.sceneKey),
      score: c.score,
      matchedSignals: c.matchedSignals,
      negativeSignals: c.negativeSignals,
    })) || [],
  }));
  writeFileSync(resolve(outDir, "traces.json"), JSON.stringify(jsonPayload, null, 2) + "\n", "utf8");

  console.log(`\nwrote ${traces.length} traces to ${outDir}`);
}

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
