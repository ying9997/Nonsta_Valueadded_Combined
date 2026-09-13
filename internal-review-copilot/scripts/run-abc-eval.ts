/**
 * Phase 1 vs Phase 2 v1 vs Phase 2 v2 three-way eval.
 *
 *   npx tsx internal-review-copilot/scripts/run-abc-eval.ts \
 *     --input _runs/20260909_p3_eval/t14-golden-details.json \
 *     --golden internal-review-copilot/eval/golden/t14-golden.jsonl \
 *     --out _runs/20260909_phase2v2
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { resolveLlmConfig } from "../lib/llm-client.ts";
import { lookupExceptions } from "../lib/exception-lookup.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { renderTrace } from "./trace-case.ts";
import type { OutputPath } from "../lib/types.ts";
import { SCENE_KEY_TO_OMS_NAME } from "../lib/llm-scene-classifier.ts";

interface GoldenLabel {
  vascNo: string;
  expectedScene: string;
  acceptableScenes?: string[];
  expectedOutputPath: OutputPath;
  expectedActions?: string[];
  expectedMissing?: string[];
  omsSceneName?: string;
}

interface SideRow {
  vascNo: string;
  expectedScene: string;
  omsSceneName: string;
  actualSceneKey: string;
  actualSceneName: string;
  sceneExact: boolean;
  sceneAcceptable: boolean;
  expectedOutputPath: string;
  actualOutputPath: string;
  pathOk: boolean;
  llmUsed?: boolean;
  llmReasoning?: string;
  llmMatched?: string;
  llmConfidence?: string;
  exceptionSummary?: string;
  elapsedMs: number;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

function loadDetails(path: string): Record<string, Record<string, unknown>> {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const map: Record<string, Record<string, unknown>> = {};
  for (const detail of details) {
    const orderNo = asText(detail.orderNo);
    if (orderNo) map[orderNo] = detail;
  }
  return map;
}

function pct(n: number, d: number): string {
  if (d <= 0) return "n/a";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function pp(a: number, b: number): string {
  const d = (b - a) * 100;
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(0)}pp`;
}

function mark(exact: boolean, ok: boolean): string {
  if (exact) return "精准✓";
  if (ok) return "可接受✓";
  return "✗";
}

function shortName(sceneKey: string, sceneName: string): string {
  if (!sceneKey) return "（空）/unsupported";
  return sceneName || SCENE_KEY_TO_OMS_NAME[sceneKey] || sceneKey;
}

function scoreOne(label: GoldenLabel, result: PipelineResult, elapsedMs: number): SideRow {
  const actualSceneKey = result.matchResult?.sceneKey || "";
  const acceptable = label.acceptableScenes?.length
    ? label.acceptableScenes
    : [label.expectedScene].filter(Boolean);
  const llm = result.matchResult?.llmClassification;
  const ex = llm?.exceptionInfos;
  const exceptionSummary = ex?.length
    ? ex
        .map((e) =>
          e.exceptionName
            ? `${e.ebNo}=${e.exceptionName}/${e.exceptionObject || "?"}(${e.source})`
            : `${e.ebNo}=未查到(${e.source})`,
        )
        .join("; ")
    : "";
  return {
    vascNo: label.vascNo,
    expectedScene: label.expectedScene,
    omsSceneName: label.omsSceneName || SCENE_KEY_TO_OMS_NAME[label.expectedScene] || label.expectedScene,
    actualSceneKey,
    actualSceneName: shortName(
      actualSceneKey,
      result.matchResult?.scenarioName || "",
    ),
    sceneExact: Boolean(label.expectedScene) && actualSceneKey === label.expectedScene,
    sceneAcceptable: Boolean(actualSceneKey) && acceptable.includes(actualSceneKey),
    expectedOutputPath: label.expectedOutputPath,
    actualOutputPath: result.outputPath,
    pathOk: result.outputPath === label.expectedOutputPath,
    llmUsed: result.matchResult?.llmUsed,
    llmReasoning: llm?.reasoning,
    llmMatched: llm?.matchedScene,
    llmConfidence: llm?.confidence,
    exceptionSummary,
    elapsedMs,
  };
}

function tally(rows: SideRow[]): { exact: number; acceptable: number; pathOk: number } {
  return {
    exact: rows.filter((r) => r.sceneExact).length,
    acceptable: rows.filter((r) => r.sceneAcceptable).length,
    pathOk: rows.filter((r) => r.pathOk).length,
  };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const root = projectDir();
  const inputPath = resolve(root, arg("input", "_runs/20260909_p3_eval/t14-golden-details.json"));
  const goldenPath = resolve(root, arg("golden", "internal-review-copilot/eval/golden/t14-golden.jsonl"));
  const outDir = resolve(root, arg("out", "_runs/20260909_phase2v2"));
  const tracesDir = resolve(outDir, "abc-traces");
  mkdirSync(tracesDir, { recursive: true });

  let model = "(unknown)";
  try {
    model = resolveLlmConfig().model;
  } catch {
    model = "(LLM config unavailable)";
  }

  const details = loadDetails(inputPath);
  const labels = readJsonl<GoldenLabel>(goldenPath);
  const n = labels.length;

  const rowsP1: SideRow[] = [];
  const rowsV1: SideRow[] = [];
  const rowsV2: SideRow[] = [];
  const resultsV2: PipelineResult[] = [];

  for (const label of labels) {
    const detail = details[label.vascNo];
    if (!detail) throw new Error(`details 中找不到 ${label.vascNo}`);

    console.log(`[P1] ${label.vascNo}`);
    let t = Date.now();
    const resP1 = await runPipeline(detail, { skipLlm: true, sceneLlm: false });
    if (!resP1) throw new Error(`pipeline null ${label.vascNo} P1`);
    rowsP1.push(scoreOne(label, resP1, Date.now() - t));

    console.log(`[V1] ${label.vascNo}`);
    t = Date.now();
    const resV1 = await runPipeline(detail, {
      skipLlm: true,
      sceneLlm: true,
      sceneLlmVersion: 1,
    });
    if (!resV1) throw new Error(`pipeline null ${label.vascNo} V1`);
    rowsV1.push(scoreOne(label, resV1, Date.now() - t));

    console.log(`[V2] ${label.vascNo}`);
    t = Date.now();
    const resV2 = await runPipeline(detail, {
      skipLlm: true,
      sceneLlm: true,
      sceneLlmVersion: 2,
    });
    if (!resV2) throw new Error(`pipeline null ${label.vascNo} V2`);
    resultsV2.push(resV2);
    rowsV2.push(scoreOne(label, resV2, Date.now() - t));

    writeFileSync(
      resolve(tracesDir, `${label.vascNo}.trace.md`),
      renderTrace(label.vascNo, detail, resV2),
      "utf8",
    );
  }

  const m1 = tally(rowsP1);
  const mv1 = tally(rowsV1);
  const mv2 = tally(rowsV2);
  const r = (x: number) => x / (n || 1);

  // Exception lookup table for report (independent of LLM)
  const exceptionRows: Array<{
    vascNo: string;
    ebNos: string[];
    names: string;
    objects: string;
    sources: string;
  }> = [];
  for (let i = 0; i < n; i++) {
    const label = labels[i];
    const detail = details[label.vascNo];
    const res = resultsV2[i];
    const ebNos = res.contextFacts?.allEventNos || [];
    const infos = await lookupExceptions(ebNos);
    exceptionRows.push({
      vascNo: label.vascNo,
      ebNos,
      names: infos.map((x) => x.exceptionName || "未查到").join(" / "),
      objects: infos.map((x) => x.exceptionObject || "-").join(" / "),
      sources: infos.map((x) => x.source).join(" / "),
    });
    void detail;
  }

  const lines: string[] = [];
  lines.push("# Phase 1 vs Phase 2 v1 vs Phase 2 v2 三版对比");
  lines.push("");
  lines.push(`- Golden: t14-golden.jsonl (${n} 条)`);
  lines.push("- Phase 1: `{ skipLlm: true, sceneLlm: false }`");
  lines.push("- Phase 2 v1: `{ skipLlm: true, sceneLlm: true, sceneLlmVersion: 1 }`（旧 prompt）");
  lines.push("- Phase 2 v2: `{ skipLlm: true, sceneLlm: true, sceneLlmVersion: 2 }`（异常预查 + 规则 A/B/C/D）");
  lines.push(`- LLM model: ${model}`);
  lines.push("");
  lines.push("| 指标 | Phase 1 | Phase 2 v1 | Phase 2 v2 | v1→v2 变化 |");
  lines.push("|------|---------|-----------|-----------|-----------|");
  lines.push(
    `| 场景精准匹配率 | ${m1.exact}/${n} (${pct(m1.exact, n)}) | ${mv1.exact}/${n} (${pct(mv1.exact, n)}) | ${mv2.exact}/${n} (${pct(mv2.exact, n)}) | ${pp(r(mv1.exact), r(mv2.exact))} |`,
  );
  lines.push(
    `| 场景可接受匹配率 | ${m1.acceptable}/${n} (${pct(m1.acceptable, n)}) | ${mv1.acceptable}/${n} (${pct(mv1.acceptable, n)}) | ${mv2.acceptable}/${n} (${pct(mv2.acceptable, n)}) | ${pp(r(mv1.acceptable), r(mv2.acceptable))} |`,
  );
  lines.push(
    `| 出口准确率 | ${m1.pathOk}/${n} (${pct(m1.pathOk, n)}) | ${mv1.pathOk}/${n} (${pct(mv1.pathOk, n)}) | ${mv2.pathOk}/${n} (${pct(mv2.pathOk, n)}) | ${pp(r(mv1.pathOk), r(mv2.pathOk))} |`,
  );
  lines.push("");
  lines.push("## 逐条对比（三版并排）");
  lines.push("");
  lines.push("| VASC | golden | Phase 1 | Phase 2 v1 | Phase 2 v2 | v2 reasoning |");
  lines.push("|------|--------|---------|-----------|-----------|-------------|");
  for (let i = 0; i < n; i++) {
    const g = rowsP1[i];
    const a = rowsP1[i];
    const b = rowsV1[i];
    const c = rowsV2[i];
    const cell = (row: SideRow) =>
      `${shortName(row.actualSceneKey, row.actualSceneName)} ${mark(row.sceneExact, row.sceneAcceptable)}`;
    lines.push(
      `| ${g.vascNo} | ${g.omsSceneName} | ${cell(a)} | ${cell(b)} | ${cell(c)} | ${(c.llmReasoning || "-").replace(/\|/g, "/").slice(0, 120)} |`,
    );
  }
  lines.push("");
  lines.push("## 异常查询详情");
  lines.push("");
  lines.push("| VASC | EB 号列表 | 异常名称 | 异常对象 | 查询来源 |");
  lines.push("|------|----------|---------|---------|---------|");
  for (const er of exceptionRows) {
    lines.push(
      `| ${er.vascNo} | ${er.ebNos.join(", ") || "（无）"} | ${er.names} | ${er.objects} | ${er.sources} |`,
    );
  }
  lines.push("");
  lines.push("## 验收核对");
  lines.push("");
  const c311 = rowsV2.find((r) => r.vascNo === "VASC000000311652");
  const c326 = rowsV2.find((r) => r.vascNo === "VASC000000326061");
  lines.push(
    `- VASC000000311652 v2 → \`${c311?.actualSceneKey || ""}\`（目标 §2.33 或 acceptable §2.1）：${c311?.sceneAcceptable ? "通过" : "未通过"}`,
  );
  lines.push(
    `- VASC000000326061 v2 → \`${c326?.actualSceneKey || ""}\`（目标 §2.1）：${c326?.sceneExact ? "通过" : "未通过"}`,
  );
  lines.push(
    `- v2 精准 ${mv2.exact}/${n} vs v1 ${mv1.exact}/${n}（目标 v2>v1 且至少 +20pp / ≥3/5）：${mv2.exact > mv1.exact && r(mv2.exact) - r(mv1.exact) >= 0.2 ? "达标" : mv2.exact > mv1.exact ? "有提升但未满 +20pp" : "未达标"}`,
  );
  lines.push("");
  lines.push("Traces: `abc-traces/`；异常确认：`exception-info-golden.json`");
  lines.push("");

  writeFileSync(resolve(outDir, "abc-comparison.md"), lines.join("\n"), "utf8");
  writeFileSync(
    resolve(outDir, "abc-comparison.json"),
    JSON.stringify(
      { model, metrics: { p1: m1, v1: mv1, v2: mv2 }, rowsP1, rowsV1, rowsV2, exceptionRows },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    resolve(tracesDir, "index.md"),
    ["# Phase 2 v2 ABC traces", "", ...labels.map((l) => `- [${l.vascNo}](./${l.vascNo}.trace.md)`), ""].join(
      "\n",
    ),
    "utf8",
  );

  console.log(`[abc] wrote ${outDir}/abc-comparison.md`);
  console.log(
    `[abc] exact P1 ${m1.exact}/${n} | v1 ${mv1.exact}/${n} | v2 ${mv2.exact}/${n} (${pp(r(mv1.exact), r(mv2.exact))} v1→v2)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
