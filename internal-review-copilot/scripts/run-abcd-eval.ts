/**
 * Four-way eval: Phase1 / v1 / v2 / v3
 *
 *   npx tsx internal-review-copilot/scripts/run-abcd-eval.ts \
 *     --input _runs/20260909_p3_eval/t14-golden-details.json \
 *     --golden internal-review-copilot/eval/golden/t14-golden.jsonl \
 *     --out _runs/20260909_phase2v3
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { resolveLlmConfig } from "../lib/llm-client.ts";
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
  pathOk: boolean;
  actionCoverage: number;
  llmUsed?: boolean;
  llmReasoning?: string;
  llmMatched?: string;
  toolNames?: string[];
  toolRounds?: number;
  elapsedMs: number;
  llmCallsApprox: number;
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

function actionCovered(expected: string, matched: string[]): boolean {
  const e = expected.trim();
  if (!e) return true;
  for (const m of matched) {
    if (m && (m === e || m.includes(e) || e.includes(m))) return true;
  }
  const aliases: Array<[RegExp, RegExp]> = [
    [/补贴包裹/, /补贴包裹标签|换包裹标签/],
    [/关联第三方/, /关联第三方/],
    [/拍照/, /拍照/],
    [/暂存/, /拍照暂存|暂存/],
    [/辨识/, /辨识/],
    [/换标|换商品标签/, /换商品标签|换标/],
    [/上架/, /上架|直接上架/],
  ];
  return aliases.some(([er, mr]) => er.test(e) && matched.some((m) => mr.test(m)));
}

function actionCoverage(expected: string[], matched: string[]): number {
  if (!expected.length) return 1;
  return expected.filter((a) => actionCovered(a, matched)).length / expected.length;
}

function scoreOne(label: GoldenLabel, result: PipelineResult, elapsedMs: number): SideRow {
  const actualSceneKey = result.matchResult?.sceneKey || "";
  const acceptable = label.acceptableScenes?.length
    ? label.acceptableScenes
    : [label.expectedScene].filter(Boolean);
  const llm = result.matchResult?.llmClassification;
  const hist = llm?.toolCallHistory || [];
  const toolRounds = llm?.totalToolRounds ?? (hist.length ? Math.max(...hist.map((h) => h.round)) : 0);
  // approx LLM HTTP calls: 1 + tool rounds for v3; 1 for v1/v2; 0 for rules
  const llmCallsApprox = result.matchResult?.llmUsed
    ? Math.max(1, toolRounds || 1)
    : llm?.sceneLlmVersion
      ? 1
      : 0;
  return {
    vascNo: label.vascNo,
    expectedScene: label.expectedScene,
    omsSceneName: label.omsSceneName || SCENE_KEY_TO_OMS_NAME[label.expectedScene] || label.expectedScene,
    actualSceneKey,
    actualSceneName:
      result.matchResult?.scenarioName || SCENE_KEY_TO_OMS_NAME[actualSceneKey] || actualSceneKey || "（空）",
    sceneExact: Boolean(label.expectedScene) && actualSceneKey === label.expectedScene,
    sceneAcceptable: Boolean(actualSceneKey) && acceptable.includes(actualSceneKey),
    pathOk: result.outputPath === label.expectedOutputPath,
    actionCoverage: actionCoverage(
      label.expectedActions || [],
      result.matchResult?.matchedActions || llm?.extractedActions || [],
    ),
    llmUsed: result.matchResult?.llmUsed,
    llmReasoning: llm?.reasoning,
    llmMatched: llm?.matchedScene,
    toolNames: hist.map((h) => h.toolName),
    toolRounds,
    elapsedMs,
    llmCallsApprox: result.matchResult?.llmUsed || llm ? Math.max(llmCallsApprox, hist.length ? toolRounds + 1 : 1) : 0,
  };
}

function tally(rows: SideRow[]) {
  const n = rows.length || 1;
  return {
    exact: rows.filter((r) => r.sceneExact).length,
    acceptable: rows.filter((r) => r.sceneAcceptable).length,
    pathOk: rows.filter((r) => r.pathOk).length,
    actionAvg: rows.reduce((s, r) => s + r.actionCoverage, 0) / n,
    elapsedAvg: rows.reduce((s, r) => s + r.elapsedMs, 0) / n,
    llmCalls: rows.reduce((s, r) => s + r.llmCallsApprox, 0),
  };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const root = projectDir();
  const inputPath = resolve(root, arg("input", "_runs/20260909_p3_eval/t14-golden-details.json"));
  const goldenPath = resolve(root, arg("golden", "internal-review-copilot/eval/golden/t14-golden.jsonl"));
  const outDir = resolve(root, arg("out", "_runs/20260909_phase2v3"));
  const tracesDir = resolve(outDir, "abcd-traces");
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
  const rowsV3: SideRow[] = [];

  for (const label of labels) {
    const detail = details[label.vascNo];
    if (!detail) throw new Error(`details 中找不到 ${label.vascNo}`);

    console.log(`[P1] ${label.vascNo}`);
    let t = Date.now();
    const resP1 = await runPipeline(detail, { skipLlm: true, sceneLlm: false });
    rowsP1.push(scoreOne(label, resP1, Date.now() - t));

    console.log(`[V1] ${label.vascNo}`);
    t = Date.now();
    const resV1 = await runPipeline(detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 1 });
    rowsV1.push(scoreOne(label, resV1, Date.now() - t));

    console.log(`[V2] ${label.vascNo}`);
    t = Date.now();
    const resV2 = await runPipeline(detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 2 });
    rowsV2.push(scoreOne(label, resV2, Date.now() - t));

    console.log(`[V3] ${label.vascNo}`);
    t = Date.now();
    const resV3 = await runPipeline(detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 3 });
    rowsV3.push(scoreOne(label, resV3, Date.now() - t));

    writeFileSync(
      resolve(tracesDir, `${label.vascNo}.trace.md`),
      renderTrace(label.vascNo, detail, resV3),
      "utf8",
    );
  }

  const m1 = tally(rowsP1);
  const mv1 = tally(rowsV1);
  const mv2 = tally(rowsV2);
  const mv3 = tally(rowsV3);
  const r = (x: number) => x / (n || 1);

  const usedLookup = rowsV3.some((row) => (row.toolNames || []).includes("lookup_exception_info"));
  const c305 = rowsV3.find((x) => x.vascNo === "VASC000000305805");
  const c305v2 = rowsV2.find((x) => x.vascNo === "VASC000000305805");

  const lines: string[] = [];
  lines.push("# 四版对比：规则 vs LLM vs LLM+规则 vs LLM+工具");
  lines.push("");
  lines.push(`- Golden: t14-golden.jsonl (${n} 条)`);
  lines.push("- Phase 1: `{ sceneLlm: false }`");
  lines.push("- v1: `{ sceneLlm: true, sceneLlmVersion: 1 }`");
  lines.push("- v2: `{ sceneLlm: true, sceneLlmVersion: 2 }`");
  lines.push("- v3: `{ sceneLlm: true, sceneLlmVersion: 3 }`（自主 tool calling）");
  lines.push(`- LLM model: ${model}`);
  lines.push("");
  lines.push("| 指标 | Phase 1 | v1(LLM) | v2(LLM+规则) | v3(LLM+工具) | v2→v3 |");
  lines.push("|------|---------|---------|-------------|-------------|-------|");
  lines.push(
    `| 场景精准 | ${m1.exact}/${n} (${pct(m1.exact, n)}) | ${mv1.exact}/${n} (${pct(mv1.exact, n)}) | ${mv2.exact}/${n} (${pct(mv2.exact, n)}) | ${mv3.exact}/${n} (${pct(mv3.exact, n)}) | ${pp(r(mv2.exact), r(mv3.exact))} |`,
  );
  lines.push(
    `| 场景可接受 | ${m1.acceptable}/${n} (${pct(m1.acceptable, n)}) | ${mv1.acceptable}/${n} (${pct(mv1.acceptable, n)}) | ${mv2.acceptable}/${n} (${pct(mv2.acceptable, n)}) | ${mv3.acceptable}/${n} (${pct(mv3.acceptable, n)}) | ${pp(r(mv2.acceptable), r(mv3.acceptable))} |`,
  );
  lines.push(
    `| 出口准确率 | ${m1.pathOk}/${n} (${pct(m1.pathOk, n)}) | ${mv1.pathOk}/${n} (${pct(mv1.pathOk, n)}) | ${mv2.pathOk}/${n} (${pct(mv2.pathOk, n)}) | ${mv3.pathOk}/${n} (${pct(mv3.pathOk, n)}) | ${pp(r(mv2.pathOk), r(mv3.pathOk))} |`,
  );
  lines.push(
    `| 动作命中率 | ${(m1.actionAvg * 100).toFixed(1)}% | ${(mv1.actionAvg * 100).toFixed(1)}% | ${(mv2.actionAvg * 100).toFixed(1)}% | ${(mv3.actionAvg * 100).toFixed(1)}% | ${pp(mv2.actionAvg, mv3.actionAvg)} |`,
  );
  lines.push("");
  lines.push("## 逐条对比（四版并排）");
  lines.push("");
  lines.push("| VASC | golden | Phase 1 | v1 | v2 | v3 | v3 工具调用 | v3 reasoning |");
  lines.push("|------|--------|---------|----|----|----|-----------|-------------|");
  for (let i = 0; i < n; i++) {
    const cell = (row: SideRow) =>
      `${row.actualSceneName} ${mark(row.sceneExact, row.sceneAcceptable)}`.replace(/\|/g, "/");
    const tools = (rowsV3[i].toolNames || []).length
      ? `${rowsV3[i].toolRounds}轮: ${(rowsV3[i].toolNames || []).join(",")}`
      : "无工具";
    lines.push(
      `| ${rowsP1[i].vascNo} | ${rowsP1[i].omsSceneName} | ${cell(rowsP1[i])} | ${cell(rowsV1[i])} | ${cell(rowsV2[i])} | ${cell(rowsV3[i])} | ${tools} | ${(rowsV3[i].llmReasoning || "-").replace(/\|/g, "/").slice(0, 100)} |`,
    );
  }
  lines.push("");
  lines.push("## v3 工具调用统计");
  lines.push("");
  lines.push("| VASC | 调了几轮 | 调了哪些工具 | 有没有漏调 |");
  lines.push("|------|---------|-----------|----------|");
  for (const row of rowsV3) {
    const names = row.toolNames || [];
    const hasEb = Boolean(
      (rowsP1.find((x) => x.vascNo === row.vascNo) && true) ||
        labels.find((l) => l.vascNo === row.vascNo),
    );
    const detail = details[row.vascNo];
    // heuristic: if EB mentioned in demand / context and no lookup → 可能漏调
    const text = JSON.stringify(detail || {}).slice(0, 2000);
    const mentionsEb = /EB\d{10,}/.test(text) || /EB\d{10,}/.test(row.llmReasoning || "");
    const missed =
      mentionsEb && !names.includes("lookup_exception_info")
        ? "可能漏调 lookup_exception_info"
        : names.includes("lookup_exception_info")
          ? "已查异常"
          : "未查（或无 EB）";
    void hasEb;
    lines.push(
      `| ${row.vascNo} | ${row.toolRounds || 0} | ${names.join(", ") || "（无）"} | ${missed} |`,
    );
  }
  lines.push("");
  lines.push("## 成本对比");
  lines.push("");
  lines.push("| 指标 | Phase 1 | v1 | v2 | v3 |");
  lines.push("|------|---------|-----|-----|-----|");
  lines.push(
    `| 每条耗时 | ${m1.elapsedAvg.toFixed(0)}ms | ${mv1.elapsedAvg.toFixed(0)}ms | ${mv2.elapsedAvg.toFixed(0)}ms | ${mv3.elapsedAvg.toFixed(0)}ms |`,
  );
  lines.push(
    `| LLM 调用次数（约） | ${m1.llmCalls} | ${mv1.llmCalls} | ${mv2.llmCalls} | ${mv3.llmCalls}（含 tool rounds） |`,
  );
  lines.push("");
  lines.push("## 结论");
  lines.push("");
  lines.push(`- v3 vs v2 准确率变化：精准 ${pp(r(mv2.exact), r(mv3.exact))}；可接受 ${pp(r(mv2.acceptable), r(mv3.acceptable))}`);
  lines.push("- v3 的优势：LLM 自主决定查什么，新场景/新异常类型时不用改硬规则代码");
  lines.push("- v3 的劣势：可能多几轮 LLM 调用，延迟更高");
  lines.push(
    `- v3 是否有 v2 没判对但 v3 判对的 case（关注 305805）：v2=\`${c305v2?.actualSceneKey || ""}\`${c305v2?.sceneExact ? "✓" : "✗"}；v3=\`${c305?.actualSceneKey || ""}\`${c305?.sceneExact ? "✓" : "✗"}`,
  );
  lines.push(
    `- 工具调用是否工作：${usedLookup ? "是（至少 1 条调用了 lookup_exception_info）" : "否（未观察到 lookup_exception_info）"}`,
  );
  if (mv3.exact >= mv2.exact && mv3.exact >= 4) {
    lines.push("- 建议：v3 达到/超过 v2 门槛，可作为默认候选；若延迟敏感可默认 v2、复杂单走 v3。");
  } else if (mv3.exact >= mv2.exact) {
    lines.push("- 建议：v3 持平 v2，优先看延迟与可维护性再定默认。");
  } else {
    lines.push("- 建议：暂默认 v2；继续观察 v3 tool 漏调与 prompt soft guidance。");
  }
  lines.push("");
  lines.push("Traces: `abcd-traces/`");
  lines.push("");

  writeFileSync(resolve(outDir, "abcd-comparison.md"), lines.join("\n"), "utf8");
  writeFileSync(
    resolve(outDir, "abcd-comparison.json"),
    JSON.stringify(
      { model, metrics: { p1: m1, v1: mv1, v2: mv2, v3: mv3 }, rowsP1, rowsV1, rowsV2, rowsV3 },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    resolve(tracesDir, "index.md"),
    ["# Phase 2 v3 ABCD traces", "", ...labels.map((l) => `- [${l.vascNo}](./${l.vascNo}.trace.md)`), ""].join(
      "\n",
    ),
    "utf8",
  );

  console.log(`[abcd] wrote ${outDir}/abcd-comparison.md`);
  console.log(
    `[abcd] exact P1 ${m1.exact} | v1 ${mv1.exact} | v2 ${mv2.exact} | v3 ${mv3.exact}/${n}; lookup_exception used=${usedLookup}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
