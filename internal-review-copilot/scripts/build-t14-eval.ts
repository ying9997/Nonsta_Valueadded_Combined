/**
 * T1–T4 HQ eval: skipLlm score → stratified samples/traces → optional --with-l4 real LLM.
 *
 * Usage:
 *   npx tsx internal-review-copilot/scripts/build-t14-eval.ts \
 *     --input _runs/20260909_t14_eval/details.json \
 *     --out _runs/20260909_t14_eval
 *
 *   npx tsx ... --with-l4
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { ATTACHMENT_BY_FILE_TYPE, asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { resolveLlmConfig } from "../lib/llm-client.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { JsonRecord } from "../lib/types.ts";
import { renderTrace } from "./trace-case.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

type SceneCol = "T1" | "T2" | "T3" | "T4";
type ExitRow = "L1" | "L2-unsupported" | "L2-ambiguous" | "L3" | "L4";

interface ScoredRow {
  orderNo: string;
  caseId: string;
  expectedScene: SceneCol;
  expectedSceneName: string;
  exit: ExitRow;
  outputPath: string;
  decision: string;
  reason: string;
  sceneKeyMatched: string;
  conversationRaw: string;
  conversationAvailable: boolean;
  qualityFlag: string[];
  detail: JsonRecord;
  result: PipelineResult;
  source?: "natural" | "constructed_from_l3";
}

const SAMPLE_PER_CELL = 2;
const SCENES: SceneCol[] = ["T1", "T2", "T3", "T4"];
const EXITS: ExitRow[] = ["L1", "L2-unsupported", "L2-ambiguous", "L3", "L4"];

const LABEL_TO_FILE_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(ATTACHMENT_BY_FILE_TYPE).map(([k, v]) => [v, k]),
);

const BOOST_BY_SCENE: Record<SceneCol, string> = {
  T1: "包裹条码批量异常，需补贴万邑通包裹标签后上架，并关闭异常单。",
  T2: "请对指定商品拍照暂存，等客户确认后再处理，不要直接上架。",
  T3: "请关联第三方商品条码后扫描上架。",
  T4: "请按尺重/标签辨识后换标上架到新入库单，并关闭异常单。",
};

function classifyExit(result: PipelineResult): ExitRow {
  if (result.outputPath === "needs_requirement_clarification") return "L1";
  if (result.outputPath === "needs_field_clarification") return "L3";
  if (result.outputPath === "sop_generated") return "L4";
  if (result.outputPath === "transfer_human") {
    if (result.matchResult?.decision === "ambiguous") return "L2-ambiguous";
    return "L2-unsupported";
  }
  return "L2-unsupported";
}

function cellKey(scene: SceneCol, exit: ExitRow): string {
  return `${scene}||${exit}`;
}

function pct(n: number, d: number): string {
  if (!d) return "0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function qualityOf(detail: JsonRecord): string[] {
  const top = detail.qualityFlag;
  if (Array.isArray(top)) return top.map(String).filter(Boolean);
  const meta = asRecord(detail._caseMeta);
  const q = meta.qualityFlag;
  if (Array.isArray(q)) return q.map(String).filter(Boolean);
  return [];
}

function convLen(row: ScoredRow): number {
  return (row.conversationRaw || "").length;
}

function sortByConvDesc(rows: ScoredRow[]): ScoredRow[] {
  return [...rows].sort((a, b) => convLen(b) - convLen(a));
}

function appendBusinessContext(traceMd: string, row: ScoredRow, extraJudgment?: string): string {
  const availLabel = row.conversationAvailable ? "✓ 有" : "⚠ 缺失";
  const conv = row.conversationAvailable
    ? row.conversationRaw.trim() || "(空)"
    : "(对话上下文缺失)";

  const judgment =
    extraJudgment ||
    `> **你的判断（待填）：**
> - 这条单应该走什么路径？ ___
> - 理由？ ___`;

  let body = traceMd.trimEnd();
  if (extraJudgment) {
    body = body.replace(/> \*\*你的判断（待填）：\*\*[\s\S]*$/, judgment.trim());
  }

  return `${body}

## 业务上下文（来自 OMS HQ + 群聊）

- 预期场景: ${row.expectedSceneName || row.expectedScene}
- 对话上下文: ${availLabel}
- caseId: ${row.caseId || "-"}
- expectedSceneAlias: ${row.expectedScene}
- source: ${row.source || "natural"}

### 对话原文
\`\`\`text
${conv}
\`\`\`
`;
}

function promoteAttachmentsForL4(detail: JsonRecord, missingAttachments: string[]): JsonRecord {
  const clone = JSON.parse(JSON.stringify(detail)) as JsonRecord;
  const atoms = asArray(clone.atoms).map(asRecord);
  if (!atoms.length) return clone;
  const atom = atoms[0];
  const files = asArray(atom.vaAtomFiles).map(asRecord);
  const existing = new Set(files.map((f) => asText(f.fileType)));

  const ensure = (fileType: string) => {
    if (!fileType || existing.has(fileType)) return;
    files.push({ fileType, fileName: `${fileType}.constructed.pdf` });
    existing.add(fileType);
  };

  for (const label of missingAttachments) {
    const key = LABEL_TO_FILE_TYPE[label] || label;
    ensure(key);
  }
  if (!missingAttachments.length) ensure("VAS_ATTR_REL_LF");

  atom.vaAtomFiles = files;
  clone.atoms = [atom, ...atoms.slice(1)];
  const meta = asRecord(clone._caseMeta);
  meta.constructedFromL3 = true;
  clone._caseMeta = meta;
  return clone;
}

function boostRequirementText(detail: JsonRecord, boost: string): JsonRecord {
  if (!boost.trim()) return detail;
  const clone = JSON.parse(JSON.stringify(detail)) as JsonRecord;
  const atoms = asArray(clone.atoms).map(asRecord);
  if (!atoms.length) return clone;
  const atom = atoms[0];
  const attrs = asArray(atom.vaAtomAttrs).map(asRecord);
  let found = false;
  for (const attr of attrs) {
    const key = asText(attr.attributeKey);
    if (key === "VAS_ATTR_REL_RD" || asText(attr.attributeName) === "需求描述") {
      const prev = asText(attr.attributeValue) || asText(attr.attributeValueOriginal);
      const next = `${prev}\n${boost}`.trim();
      attr.attributeValue = next;
      attr.attributeValueOriginal = next;
      found = true;
    }
  }
  if (!found) {
    attrs.push({
      attributeKey: "VAS_ATTR_REL_RD",
      attributeKeyOriginal: "VAS_ATTR_REL_RD",
      attributeName: "需求描述",
      attributeValue: boost,
      attributeValueOriginal: boost,
    });
  }
  atom.vaAtomAttrs = attrs;
  clone.atoms = [atom, ...atoms.slice(1)];
  return clone;
}

function renderL4Extra(result: PipelineResult, elapsedMs: number): string {
  const llm = result.llm;
  const lines: string[] = [];
  lines.push("## 6. LLM 生成（真实调用）");
  if (!llm) {
    lines.push("- ⚠ 无 llm 结果");
    lines.push("");
    return lines.join("\n");
  }
  lines.push(`- model: ${llm.model || "?"}`);
  lines.push(`- mocked: ${llm.mocked}`);
  lines.push(`- 耗时: ${elapsedMs}ms`);
  lines.push(`- error: ${llm.error || "null"}`);
  lines.push("");
  lines.push("### SOP 全文");
  lines.push(">");
  for (const line of (llm.text || "(空)").split(/\r?\n/)) {
    lines.push(`> ${line}`);
  }
  lines.push("");
  lines.push("### Reflection 检查");
  lines.push(`- reflectionPass: ${llm.reflectionPass ?? "n/a"}`);
  if (llm.reflectionIssues?.length) {
    lines.push("- issues:");
    llm.reflectionIssues.forEach((issue, i) => {
      lines.push(`  ${i + 1}. ${issue}`);
    });
  } else {
    lines.push("- issues: (无)");
  }
  lines.push(`- regenerated: ${llm.regenerated ?? false}`);
  lines.push("");
  lines.push("### 安全检查");
  lines.push(
    `- looksInvented: ${llm.error?.includes("编造") ? `检出 — ${llm.error}` : "调用路径内已校验；若 error 含编造则失败"}`,
  );
  lines.push(
    `- assertNoForbidden: ${llm.error?.includes("禁止表述") ? `失败 — ${llm.error}` : "调用路径内已校验"}`,
  );
  lines.push("");
  return lines.join("\n");
}

const L4_JUDGMENT = `> **你的判断（待填）：**
> - 场景识别正确吗？ ___
> - SOP 是否可以直接给仓库执行？ ___
> - SOP 有没有编造信息（不在输入中的单号/SKU/数量）？ ___
> - SOP 有没有遗漏关键步骤？ ___
> - Reflection 检出的问题合理吗？ ___`;

async function main(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const inputPath = resolve(projectRoot, arg("input") || "_runs/20260909_t14_eval/details.json");
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260909_t14_eval");
  const withL4 = hasFlag("with-l4");

  if (!existsSync(inputPath)) {
    console.error(`input not found: ${inputPath}`);
    process.exit(1);
  }

  const allDetails = (JSON.parse(readFileSync(inputPath, "utf8")) as unknown[])
    .map(asRecord)
    .filter((d) => asText(d.orderNo));

  const cleanDetails = allDetails.filter((d) => qualityOf(d).length === 0);
  console.log(`details: ${allDetails.length} total, ${cleanDetails.length} clean`);

  const scored: ScoredRow[] = [];
  for (const detail of cleanDetails) {
    const result = await runPipeline(detail, { skipLlm: true });
    if (!result) continue;
    const meta = asRecord(detail._caseMeta);
    const expectedScene = asText(meta.expectedSceneAlias) as SceneCol;
    if (!SCENES.includes(expectedScene)) continue;
    const conversationAvailable = Boolean(detail.conversationAvailable ?? meta.conversationAvailable);
    const conversationRaw = conversationAvailable
      ? asText(detail.conversationRaw) || asText(meta.conversationRaw)
      : "";
    scored.push({
      orderNo: result.orderNo,
      caseId: asText(meta.caseId),
      expectedScene,
      expectedSceneName: asText(meta.expectedSceneName),
      exit: classifyExit(result),
      outputPath: result.outputPath,
      decision: result.matchResult?.decision || "",
      reason: result.matchResult?.reason || "",
      sceneKeyMatched: result.matchResult?.sceneKey || "",
      conversationRaw,
      conversationAvailable,
      qualityFlag: qualityOf(detail),
      detail,
      result,
      source: "natural",
    });
  }

  const buckets = new Map<string, ScoredRow[]>();
  for (const row of scored) {
    const k = cellKey(row.expectedScene, row.exit);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(row);
  }
  for (const [k, rows] of buckets) {
    buckets.set(k, sortByConvDesc(rows));
  }

  const distLines: string[] = [
    "# T1–T4 × 出口分布（clean HQ / skipLlm）",
    "",
    `- 生成时间: ${new Date().toISOString()}`,
    `- 输入: \`${inputPath}\``,
    `- clean 条数: ${scored.length}`,
    `- 已排除 qualityFlag 非空: ${allDetails.length - cleanDetails.length}`,
    "",
    "|              | T1 | T2(B) | T3 | T4(F-001) |",
    "|--------------|---:|------:|---:|----------:|",
  ];
  for (const exit of EXITS) {
    const cells = SCENES.map((sc) => {
      const n = buckets.get(cellKey(sc, exit))?.length || 0;
      return `${n} (${pct(n, scored.length)})`;
    });
    distLines.push(`| ${exit} | ${cells.join(" | ")} |`);
  }
  distLines.push("");
  distLines.push("## 按场景合计");
  for (const sc of SCENES) {
    const n = scored.filter((r) => r.expectedScene === sc).length;
    distLines.push(`- ${sc}: ${n} (${pct(n, scored.length)})`);
  }
  distLines.push("");
  distLines.push("## 按出口合计");
  for (const exit of EXITS) {
    const n = scored.filter((r) => r.exit === exit).length;
    distLines.push(`- ${exit}: ${n} (${pct(n, scored.length)})`);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "distribution.md"), `${distLines.join("\n")}\n`, "utf8");

  const sampleExits: ExitRow[] = ["L1", "L2-unsupported", "L2-ambiguous", "L3", "L4"];
  const samples: ScoredRow[] = [];
  for (const sc of SCENES) {
    for (const exit of sampleExits) {
      const pool = buckets.get(cellKey(sc, exit)) || [];
      samples.push(...pool.slice(0, SAMPLE_PER_CELL));
    }
  }

  writeFileSync(
    resolve(outDir, "samples.jsonl"),
    samples
      .map((row) =>
        JSON.stringify({
          orderNo: row.orderNo,
          caseId: row.caseId,
          expectedScene: row.expectedScene,
          expectedSceneName: row.expectedSceneName,
          exit: row.exit,
          outputPath: row.outputPath,
          decision: row.decision,
          reason: row.reason,
          sceneKeyMatched: row.sceneKeyMatched,
          conversationAvailable: row.conversationAvailable,
          conversationLength: convLen(row),
          source: row.source || "natural",
        }),
      )
      .concat([""])
      .join("\n"),
    "utf8",
  );

  const tracesDir = resolve(outDir, "traces");
  mkdirSync(tracesDir, { recursive: true });
  for (const row of samples) {
    const base = renderTrace(row.orderNo, row.detail, row.result);
    const md = appendBusinessContext(base, row);
    writeFileSync(resolve(tracesDir, `${row.orderNo}.trace.md`), md, "utf8");
  }

  const indexLines = [
    "# Trace Index（分层抽样，含自然 L4 skipLlm 预览）",
    "",
    `- 样本数: ${samples.length}`,
    `- 策略: 每场景×出口最多 ${SAMPLE_PER_CELL} 条，优先对话更长`,
    "",
    "| # | VASC | expectedScene | exit | outputPath | decision | convLen | trace |",
    "|---|------|---------------|------|------------|----------|--------:|-------|",
  ];
  samples.forEach((row, i) => {
    indexLines.push(
      `| ${i + 1} | ${row.orderNo} | ${row.expectedScene} | ${row.exit} | ${row.outputPath} | ${row.decision || "-"} | ${convLen(row)} | [trace](${row.orderNo}.trace.md) |`,
    );
  });
  writeFileSync(resolve(tracesDir, "index.md"), `${indexLines.join("\n")}\n`, "utf8");

  writeFileSync(
    resolve(outDir, "eval-summary.json"),
    `${JSON.stringify(
      {
        totalClean: scored.length,
        sampleCount: samples.length,
        bySceneExit: Object.fromEntries([...buckets.entries()].map(([k, v]) => [k, v.length])),
        withL4,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        totalClean: scored.length,
        sampleCount: samples.length,
        bySceneExit: Object.fromEntries([...buckets.entries()].map(([k, v]) => [k, v.length])),
      },
      null,
      2,
    ),
  );

  if (!withL4) {
    console.log("skip L4 (pass --with-l4)");
    return;
  }

  let llmReady = true;
  let llmSkipReason = "";
  try {
    resolveLlmConfig();
  } catch (err) {
    llmReady = false;
    llmSkipReason = err instanceof Error ? err.message : String(err);
  }

  const l4Dir = resolve(outDir, "traces-l4");
  mkdirSync(l4Dir, { recursive: true });

  if (!llmReady) {
    const note = `# L4 跳过\n\n需要 LLM API key：${llmSkipReason}\n`;
    writeFileSync(resolve(l4Dir, "l4-index.md"), note, "utf8");
    writeFileSync(resolve(outDir, "samples-l4.jsonl"), "", "utf8");
    writeFileSync(
      resolve(l4Dir, "l4-results.json"),
      `${JSON.stringify({ skipped: true, reason: llmSkipReason }, null, 2)}\n`,
      "utf8",
    );
    console.warn(`L4 skipped: ${llmSkipReason}`);
    return;
  }

  // At least 1 L4 per scene; take all natural L4, then construct from L3
  type Cand = { row: ScoredRow; detail: JsonRecord; source: "natural" | "constructed_from_l3" };
  const l4Candidates: Cand[] = [];
  const used = new Set<string>();

  for (const sc of SCENES) {
    const natural = sortByConvDesc(scored.filter((r) => r.expectedScene === sc && r.exit === "L4"));
    for (const row of natural) {
      if (used.has(row.orderNo)) continue;
      used.add(row.orderNo);
      l4Candidates.push({ row, detail: row.detail, source: "natural" });
    }
  }

  for (const sc of SCENES) {
    const hasScene = l4Candidates.some((c) => c.row.expectedScene === sc);
    if (hasScene) continue;
    const l3Pool = sortByConvDesc(scored.filter((r) => r.expectedScene === sc && r.exit === "L3"));
    for (const row of l3Pool) {
      if (used.has(row.orderNo)) continue;
      let detail = promoteAttachmentsForL4(row.detail, row.result.missingAttachments || []);
      let check = await runPipeline(detail, { skipLlm: true });
      if (!check || check.outputPath !== "sop_generated") {
        detail = boostRequirementText(detail, BOOST_BY_SCENE[sc]);
        const meta = asRecord(detail._caseMeta);
        meta.constructedIntentBoost = BOOST_BY_SCENE[sc];
        detail._caseMeta = meta;
        check = await runPipeline(detail, { skipLlm: true });
      }
      if (!check || check.outputPath !== "sop_generated") continue;
      used.add(row.orderNo);
      l4Candidates.push({
        row: { ...row, exit: "L4", outputPath: "sop_generated", source: "constructed_from_l3" },
        detail,
        source: "constructed_from_l3",
      });
      break;
    }
  }

  // If still missing a scene, try any exit with promote+boost
  for (const sc of SCENES) {
    const hasScene = l4Candidates.some((c) => c.row.expectedScene === sc);
    if (hasScene) continue;
    const pool = sortByConvDesc(scored.filter((r) => r.expectedScene === sc));
    for (const row of pool) {
      if (used.has(row.orderNo)) continue;
      let detail = promoteAttachmentsForL4(row.detail, row.result.missingAttachments || []);
      detail = boostRequirementText(detail, BOOST_BY_SCENE[sc]);
      const meta = asRecord(detail._caseMeta);
      meta.constructedIntentBoost = BOOST_BY_SCENE[sc];
      detail._caseMeta = meta;
      const check = await runPipeline(detail, { skipLlm: true });
      if (!check || check.outputPath !== "sop_generated") continue;
      used.add(row.orderNo);
      l4Candidates.push({
        row: { ...row, exit: "L4", outputPath: "sop_generated", source: "constructed_from_l3" },
        detail,
        source: "constructed_from_l3",
      });
      break;
    }
  }

  console.log(
    `L4 candidates: ${l4Candidates.length} natural=${l4Candidates.filter((c) => c.source === "natural").length}`,
  );

  const l4Results: JsonRecord[] = [];
  const sampleL4Lines: string[] = [];

  for (const cand of l4Candidates) {
    const t0 = Date.now();
    let result: PipelineResult | null = null;
    try {
      result = await runPipeline(cand.detail, { skipLlm: false });
    } catch (err) {
      console.warn(`L4 pipeline throw ${cand.row.orderNo}:`, err);
    }
    const elapsedMs = Date.now() - t0;
    if (!result) {
      l4Results.push({
        orderNo: cand.row.orderNo,
        expectedScene: cand.row.expectedScene,
        source: cand.source,
        llmError: "pipeline_null",
        elapsedMs,
      });
      continue;
    }

    const row: ScoredRow = {
      ...cand.row,
      exit: "L4",
      outputPath: result.outputPath,
      result,
      source: cand.source,
      decision: result.matchResult?.decision || cand.row.decision,
      reason: result.matchResult?.reason || cand.row.reason,
      sceneKeyMatched: result.matchResult?.sceneKey || cand.row.sceneKeyMatched,
    };

    let base = renderTrace(row.orderNo, cand.detail, result);
    const llmExtra = renderL4Extra(result, elapsedMs);
    if (base.includes("## 6. LLM")) {
      base = base.replace(/## 6\. LLM[\s\S]*?(?=## 最终结论)/, `${llmExtra}\n`);
    } else {
      base = base.replace("## 最终结论", `${llmExtra}\n## 最终结论`);
    }
    const md = appendBusinessContext(base, row, L4_JUDGMENT);
    const fileName =
      cand.source === "constructed_from_l3"
        ? `${row.orderNo}.constructed.trace.md`
        : `${row.orderNo}.trace.md`;
    writeFileSync(resolve(l4Dir, fileName), md, "utf8");

    const rec = {
      orderNo: row.orderNo,
      caseId: row.caseId,
      expectedScene: row.expectedScene,
      source: cand.source,
      outputPath: result.outputPath,
      elapsedMs,
      model: result.llm?.model || "",
      mocked: result.llm?.mocked ?? null,
      llmError: result.llm?.error || null,
      reflectionPass: result.llm?.reflectionPass ?? null,
      reflectionIssues: result.llm?.reflectionIssues || [],
      regenerated: result.llm?.regenerated ?? false,
      sopTextPreview: (result.llm?.text || "").slice(0, 500),
      conversationAvailable: row.conversationAvailable,
      fileName,
    };
    l4Results.push(rec);
    sampleL4Lines.push(JSON.stringify(rec));
    console.log(
      `L4 ${row.orderNo} scene=${row.expectedScene} source=${cand.source} path=${result.outputPath} err=${result.llm?.error || "null"} ${elapsedMs}ms`,
    );
  }

  writeFileSync(
    resolve(outDir, "samples-l4.jsonl"),
    `${sampleL4Lines.join("\n")}${sampleL4Lines.length ? "\n" : ""}`,
    "utf8",
  );
  writeFileSync(resolve(l4Dir, "l4-results.json"), `${JSON.stringify(l4Results, null, 2)}\n`, "utf8");

  const idx = [
    "# L4 Trace Index（真实 LLM）",
    "",
    `- 样本数: ${l4Results.length}`,
    `- 自然 L4: ${l4Results.filter((r) => r.source === "natural").length}`,
    `- 构造 L4: ${l4Results.filter((r) => r.source === "constructed_from_l3").length}`,
    "",
    "| # | VASC | scene | source | outputPath | reflectionPass | llmError | trace |",
    "|---|------|-------|--------|------------|----------------|----------|-------|",
  ];
  l4Results.forEach((r, i) => {
    idx.push(
      `| ${i + 1} | ${r.orderNo} | ${r.expectedScene} | ${r.source} | ${r.outputPath} | ${r.reflectionPass} | ${r.llmError || "-"} | [${r.fileName}](${r.fileName}) |`,
    );
  });
  writeFileSync(resolve(l4Dir, "l4-index.md"), `${idx.join("\n")}\n`, "utf8");
  console.log(`L4 done → ${l4Dir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
