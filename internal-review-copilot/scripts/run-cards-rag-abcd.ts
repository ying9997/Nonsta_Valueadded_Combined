/**
 * Four-way eval: 6 legacy cards vs all cards × RAG off/on.
 *
 *   npx tsx internal-review-copilot/scripts/run-cards-rag-abcd.ts \
 *     --golden internal-review-copilot/eval/golden/t14-golden.jsonl \
 *     --input _runs/20260909_p3_eval/t14-golden-details.json \
 *     --out _runs/20260911_abcd_eval
 *
 * After comparison, pulls today's pending OW01 orders and traces the recommended config
 * into --verify-out (default _runs/20260911_75card_verify). Use --skip-verify to skip.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { resolveLlmConfig } from "../lib/llm-client.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { loadScenarioCards, setLegacyCardsOnly } from "../lib/scenario-cards.ts";
import { SCENE_KEY_TO_OMS_NAME } from "../lib/llm-scene-classifier.ts";
import { renderTrace } from "./trace-case.ts";
import type { OutputPath } from "../lib/types.ts";

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
  actualSceneKey: string;
  actualSceneName: string;
  sceneExact: boolean;
  sceneAcceptable: boolean;
  pathOk: boolean;
  actionCoverage: number;
  llmMatched?: string;
  llmReasoning?: string;
  retrievedTop?: string;
  elapsedMs: number;
}

interface GroupSpec {
  id: "A" | "B" | "C" | "D";
  label: string;
  legacy: boolean;
  rag: boolean;
}

const GROUPS: GroupSpec[] = [
  { id: "A", label: "6卡无RAG", legacy: true, rag: false },
  { id: "B", label: "6卡有RAG", legacy: true, rag: true },
  { id: "C", label: "75卡无RAG", legacy: false, rag: false },
  { id: "D", label: "75卡有RAG", legacy: false, rag: true },
];

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
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
  return `${sign}${d.toFixed(1)}pp`;
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
  const top = result.matchResult?.retrievedCases?.[0];
  return {
    vascNo: label.vascNo,
    expectedScene: label.expectedScene,
    actualSceneKey,
    actualSceneName:
      result.matchResult?.scenarioName || SCENE_KEY_TO_OMS_NAME[actualSceneKey] || actualSceneKey || "（空）",
    sceneExact: Boolean(label.expectedScene) && actualSceneKey === label.expectedScene,
    sceneAcceptable: Boolean(actualSceneKey) && acceptable.includes(actualSceneKey),
    pathOk: result.outputPath === label.expectedOutputPath,
    actionCoverage: actionCoverage(label.expectedActions || [], result.matchResult?.matchedActions || []),
    llmMatched: llm?.matchedScene,
    llmReasoning: llm?.reasoning,
    retrievedTop: top ? `${top.caseId} (${top.score.toFixed(1)})` : "",
    elapsedMs,
  };
}

function tally(rows: SideRow[]): { exact: number; acceptable: number; pathOk: number; actionAvg: number } {
  const n = rows.length || 1;
  return {
    exact: rows.filter((r) => r.sceneExact).length,
    acceptable: rows.filter((r) => r.sceneAcceptable).length,
    pathOk: rows.filter((r) => r.pathOk).length,
    actionAvg: rows.reduce((s, r) => s + r.actionCoverage, 0) / n,
  };
}

function applyGroup(group: GroupSpec): number {
  process.env.RAG_ENABLED = group.rag ? "1" : "0";
  setLegacyCardsOnly(group.legacy);
  return loadScenarioCards().length;
}

function recommend(metrics: Record<string, ReturnType<typeof tally>>, n: number): { id: GroupSpec["id"]; reason: string } {
  const scored = GROUPS.map((g) => {
    const m = metrics[g.id];
    return { g, exact: m.exact, acceptable: m.acceptable, pathOk: m.pathOk };
  }).sort((a, b) => b.exact - a.exact || b.acceptable - a.acceptable || b.pathOk - a.pathOk);
  const best = scored[0];
  const a = metrics.A;
  const ragHelps = metrics.B.exact > a.exact || metrics.D.exact > metrics.C.exact;
  const cardsHelp = metrics.C.exact > a.exact || metrics.C.acceptable > a.acceptable;
  if (best.g.id === "A" && !ragHelps && !cardsHelp) {
    return { id: "A", reason: "四组场景准确率持平或 A 最好；试用先用旧 6 卡、关 RAG，少干扰" };
  }
  if (best.exact === metrics.C.exact && metrics.C.pathOk >= metrics.D.pathOk && metrics.C.exact >= metrics.D.exact) {
    return { id: "C", reason: "75 张卡带来场景收益，RAG 未再抬升（或出口更差），试用开全量卡、关 RAG" };
  }
  const reason = `场景精准 ${best.exact}/${n}、可接受 ${best.acceptable}/${n}、出口 ${best.pathOk}/${n} 综合最好`;
  return { id: best.g.id, reason };
}

async function verifyLive(
  rec: { id: GroupSpec["id"]; reason: string },
  verifyOut: string,
  nWanted: number,
): Promise<void> {
  const group = GROUPS.find((g) => g.id === rec.id)!;
  const cardCount = applyGroup(group);
  mkdirSync(verifyOut, { recursive: true });
  const today = "2026-09-11";
  const dates = [today, "2026-09-10", "2026-09-09"];
  console.log(`[verify] pull pending with ${group.label} cards=${cardCount} RAG=${process.env.RAG_ENABLED}`);

  const pullMod = await import("./pull_ow01v1602_review_orders.mjs");
  let details: Array<Record<string, unknown>> = [];
  let usedDate = today;
  for (const date of dates) {
    const pulled = await pullMod.pullReviewOrders({
      date,
      statusDesc: "待审核",
      maxPages: date === today ? 8 : 3,
      pageSize: 50,
      writeFiles: true,
      outDir: `_runs/20260911_75card_verify/oms_pull`,
    });
    const batch = (pulled.details || []) as Array<Record<string, unknown>>;
    if (batch.length > details.length) {
      details = batch;
      usedDate = date;
    }
    if (details.length >= 3) break;
    console.log(`[verify] ${date} kept ${batch.length} OW01 pending (best so far ${details.length})`);
  }
  const picked = details.slice(0, nWanted);
  writeFileSync(
    resolve(verifyOut, "picked.json"),
    JSON.stringify(
      { recommended: rec, group, cardCount, date: usedDate, wanted: nWanted, pulled: details.length, picked: picked.map((d) => asText(d.orderNo)) },
      null,
      2,
    ),
    "utf8",
  );

  const rows: string[] = [];
  rows.push(`# 推荐配置实单验证（${group.label}）`);
  rows.push("");
  rows.push(`- 推荐：${rec.id} ${group.label}（${rec.reason}）`);
  rows.push(`- 场景卡：${cardCount} 张；RAG_ENABLED=${process.env.RAG_ENABLED}`);
  rows.push(`- 日期：优先 ${today} 待审核 OW01（实际用 ${usedDate}）；拉到 ${details.length} 条，跑 ${picked.length} 条`);
  rows.push("");
  rows.push("| VASC | 出口 | 场景 | 决策 | RAG top1 |");
  rows.push("|------|------|------|------|---------|");

  for (const detail of picked) {
    const orderNo = asText(detail.orderNo);
    const result = await runPipeline(detail, {
      skipLlm: true,
      sceneLlm: true,
      sceneLlmVersion: 2,
      ragEnabled: group.rag,
    });
    if (!result) {
      rows.push(`| ${orderNo} | （无原子） | | | |`);
      continue;
    }
    writeFileSync(resolve(verifyOut, `${orderNo}.trace.md`), renderTrace(orderNo, detail, result), "utf8");
    const top = result.matchResult?.retrievedCases?.[0];
    rows.push(
      `| ${orderNo} | ${result.outputPath} | ${result.matchResult?.scenarioName || result.matchResult?.sceneKey || "—"} | ${result.matchResult?.decision || "—"} | ${top ? `${top.caseId} ${top.score.toFixed(1)}` : "—"} |`,
    );
    console.log(`[verify] ${orderNo} → ${result.outputPath} scene=${result.matchResult?.sceneKey || "-"}`);
  }

  const cDir = resolve(verifyOut, "75cards");
  mkdirSync(cDir, { recursive: true });
  applyGroup({ id: "C", label: "75卡无RAG", legacy: false, rag: false });
  rows.push("");
  rows.push("## 同批再跑 75 卡无 RAG（对照）");
  rows.push("");
  rows.push("| VASC | 出口 | 场景 | 决策 |");
  rows.push("|------|------|------|------|");
  for (const detail of picked) {
    const orderNo = asText(detail.orderNo);
    const result = await runPipeline(detail, {
      skipLlm: true,
      sceneLlm: true,
      sceneLlmVersion: 2,
      ragEnabled: false,
    });
    if (!result) {
      rows.push(`| ${orderNo} | （无原子） | | |`);
      continue;
    }
    writeFileSync(resolve(cDir, `${orderNo}.trace.md`), renderTrace(orderNo, detail, result), "utf8");
    rows.push(
      `| ${orderNo} | ${result.outputPath} | ${result.matchResult?.scenarioName || result.matchResult?.sceneKey || "—"} | ${result.matchResult?.decision || "—"} |`,
    );
    console.log(`[verify:75] ${orderNo} → ${result.outputPath} scene=${result.matchResult?.sceneKey || "-"}`);
  }

  rows.push("");
  rows.push("31 张无 OMS 码的卡保持现状，未在本轮改码。");
  rows.push("");
  writeFileSync(resolve(verifyOut, "index.md"), rows.join("\n"), "utf8");
}

async function pullTodayOw01(): Promise<{ date: string; details: Array<Record<string, unknown>> }> {
  const pullMod = await import("./pull_ow01v1602_review_orders.mjs");
  const pulled = await pullMod.pullReviewOrders({
    date: "2026-09-11",
    statusDesc: "待审核",
    maxPages: 8,
    pageSize: 50,
    writeFiles: true,
    outDir: `_runs/20260911_75card_verify/oms_pull`,
  });
  return { date: "2026-09-11", details: (pulled.details || []) as Array<Record<string, unknown>> };
}

async function runLiveAbcd(verifyOut: string): Promise<void> {
  mkdirSync(verifyOut, { recursive: true });
  const { date, details } = await pullTodayOw01();
  if (!details.length) throw new Error("当天没有拉到 OW01 待审核单");

  const byGroup: Record<string, Array<{
    orderNo: string;
    outputPath: string;
    sceneKey: string;
    sceneName: string;
    decision: string;
    confidence: string;
    ragTop: string;
    reasoning: string;
  }>> = { A: [], B: [], C: [], D: [] };

  for (const group of GROUPS) {
    const cardCount = applyGroup(group);
    console.log(`[live ${group.id}] ${group.label} cards=${cardCount} RAG=${process.env.RAG_ENABLED}`);
    const tracesDir = resolve(verifyOut, "abcd-traces", group.id);
    mkdirSync(tracesDir, { recursive: true });
    for (const detail of details) {
      const orderNo = asText(detail.orderNo);
      const result = await runPipeline(detail, {
        skipLlm: true,
        sceneLlm: true,
        sceneLlmVersion: 2,
        ragEnabled: group.rag,
      });
      if (!result) {
        byGroup[group.id].push({
          orderNo,
          outputPath: "（无原子）",
          sceneKey: "",
          sceneName: "",
          decision: "",
          confidence: "",
          ragTop: "",
          reasoning: "",
        });
        continue;
      }
      writeFileSync(resolve(tracesDir, `${orderNo}.trace.md`), renderTrace(orderNo, detail, result), "utf8");
      const top = result.matchResult?.retrievedCases?.[0];
      const llm = result.matchResult?.llmClassification;
      byGroup[group.id].push({
        orderNo,
        outputPath: result.outputPath,
        sceneKey: result.matchResult?.sceneKey || "",
        sceneName: result.matchResult?.scenarioName || "",
        decision: result.matchResult?.decision || "",
        confidence: result.matchResult?.confidence || llm?.confidence || "",
        ragTop: top ? `${top.caseId} ${top.score.toFixed(1)} → ${top.sceneName}` : "（未注入）",
        reasoning: (llm?.reasoning || "").replace(/\s+/g, " ").slice(0, 180),
      });
      console.log(`  [${group.id}] ${orderNo} → ${result.matchResult?.sceneKey || "-"} / ${result.outputPath}`);
    }
  }

  setLegacyCardsOnly(false);
  process.env.RAG_ENABLED = "0";

  const n = details.length;
  const lines: string[] = [];
  lines.push("# 当天真实待审核单：A/B/C/D 四组对照");
  lines.push("");
  lines.push(`- 日期：${date} 待审核 OW01，共 ${n} 条`);
  lines.push(`- 单号：${details.map((d) => asText(d.orderNo)).join("、")}`);
  lines.push("- A=6卡无RAG；B=6卡有RAG；C=75卡无RAG；D=75卡有RAG");
  lines.push("");

  for (let i = 0; i < n; i++) {
    const orderNo = byGroup.A[i].orderNo;
    lines.push(`## ${orderNo}`);
    lines.push("");
    lines.push("| 组 | 场景 | sceneKey | 出口 | 决策 | 置信度 | RAG |");
    lines.push("|----|------|----------|------|------|--------|-----|");
    for (const g of GROUPS) {
      const row = byGroup[g.id][i];
      lines.push(
        `| ${g.id} ${g.label} | ${row.sceneName || "—"} | \`${row.sceneKey || "—"}\` | ${row.outputPath} | ${row.decision || "—"} | ${row.confidence || "—"} | ${row.ragTop} |`,
      );
    }
    lines.push("");
    lines.push("| 组 | 判断摘要 |");
    lines.push("|----|---------|");
    for (const g of GROUPS) {
      lines.push(`| ${g.id} | ${(byGroup[g.id][i].reasoning || "—").replace(/\|/g, "/")} |`);
    }
    lines.push("");
  }

  const sameScene = GROUPS.every((g) => byGroup[g.id][0]?.sceneKey === byGroup.A[0]?.sceneKey);
  const samePath = GROUPS.every((g) => byGroup[g.id][0]?.outputPath === byGroup.A[0]?.outputPath);
  lines.push("## 小结");
  lines.push("");
  if (n === 1) {
    lines.push(`- 四组场景是否一致：${sameScene ? "是，都是 " + (byGroup.A[0].sceneName || byGroup.A[0].sceneKey) : "否，见上表"}`);
    lines.push(`- 四组出口是否一致：${samePath ? "是，都是 " + byGroup.A[0].outputPath : "否，见上表"}`);
  }
  lines.push("- 金标四组里 A 最好；这条实单四组对照见上。");
  lines.push("- Traces：`abcd-traces/A|B|C|D/`");
  lines.push("");

  writeFileSync(resolve(verifyOut, "abcd-live.md"), lines.join("\n"), "utf8");
  writeFileSync(resolve(verifyOut, "abcd-live.json"), JSON.stringify({ date, n, byGroup }, null, 2), "utf8");
  console.log(`[live-abcd] wrote ${verifyOut}/abcd-live.md`);
}

async function main(): Promise<void> {
  loadEnvFiles();
  const root = projectDir();
  const inputPath = resolve(root, arg("input", "_runs/20260909_p3_eval/t14-golden-details.json"));
  const goldenPath = resolve(root, arg("golden", "internal-review-copilot/eval/golden/t14-golden.jsonl"));
  const outDir = resolve(root, arg("out", "_runs/20260911_abcd_eval"));
  const verifyOut = resolve(root, arg("verify-out", "_runs/20260911_75card_verify"));
  mkdirSync(outDir, { recursive: true });

  if (hasFlag("verify-only") || hasFlag("live-abcd")) {
    mkdirSync(verifyOut, { recursive: true });
    const rec = hasFlag("verify-only")
      ? (JSON.parse(readFileSync(resolve(outDir, "abcd-comparison.json"), "utf8")) as {
          recommended: { id: GroupSpec["id"]; reason: string };
        }).recommended
      : { id: "A" as const, reason: "live-abcd" };
    if (hasFlag("live-abcd")) {
      await runLiveAbcd(verifyOut);
      return;
    }
    await verifyLive(rec, verifyOut, 5);
    return;
  }

  let model = "(unknown)";
  try {
    model = resolveLlmConfig().model;
  } catch {
    model = "(LLM config unavailable)";
  }

  const details = loadDetails(inputPath);
  const labels = readJsonl<GoldenLabel>(goldenPath);
  const n = labels.length;
  const byGroup: Record<string, SideRow[]> = { A: [], B: [], C: [], D: [] };

  for (const group of GROUPS) {
    const cardCount = applyGroup(group);
    console.log(`[${group.id}] ${group.label} cards=${cardCount} RAG=${process.env.RAG_ENABLED}`);
    const tracesDir = resolve(outDir, "traces", group.id);
    mkdirSync(tracesDir, { recursive: true });
    for (const label of labels) {
      const detail = details[label.vascNo];
      if (!detail) throw new Error(`details 中找不到 ${label.vascNo}`);
      console.log(`  [${group.id}] ${label.vascNo}`);
      const t0 = Date.now();
      const result = await runPipeline(detail, {
        skipLlm: true,
        sceneLlm: true,
        sceneLlmVersion: 2,
        ragEnabled: group.rag,
      });
      if (!result) throw new Error(`pipeline null ${label.vascNo} ${group.id}`);
      byGroup[group.id].push(scoreOne(label, result, Date.now() - t0));
      writeFileSync(resolve(tracesDir, `${label.vascNo}.trace.md`), renderTrace(label.vascNo, detail, result), "utf8");
    }
  }

  setLegacyCardsOnly(false);
  process.env.RAG_ENABLED = "0";

  const metrics: Record<string, ReturnType<typeof tally>> = {
    A: tally(byGroup.A),
    B: tally(byGroup.B),
    C: tally(byGroup.C),
    D: tally(byGroup.D),
  };
  const cell = (g: GroupSpec["id"], key: "exact" | "acceptable" | "pathOk") => `${metrics[g][key]}/${n} (${pct(metrics[g][key], n)})`;
  const rec = recommend(metrics, n);
  const r = (x: number) => x / (n || 1);

  const lines: string[] = [];
  lines.push("# 场景卡 × RAG 四组对比（A/B/C/D）");
  lines.push("");
  lines.push(`- Golden: t14-golden.jsonl（${n} 条）`);
  lines.push("- 场景 LLM：Phase 2 v2；skip SOP 生成");
  lines.push("- A/B 只加载原 6 张人工卡（`--legacy-cards-only`）");
  lines.push("- C/D 加载目录下全部场景卡（当前 75 张；无 OMS 码的卡保持现状）");
  lines.push("- RAG：`RAG_ENABLED=0/1`，关时检索直接返回空");
  lines.push(`- LLM model: ${model}`);
  lines.push("");
  lines.push("| 指标 | A(6卡无RAG) | B(6卡有RAG) | C(75卡无RAG) | D(75卡有RAG) |");
  lines.push("|------|-----------|-----------|------------|------------|");
  lines.push(`| 场景精准匹配 | ${cell("A", "exact")} | ${cell("B", "exact")} | ${cell("C", "exact")} | ${cell("D", "exact")} |`);
  lines.push(`| 场景可接受匹配 | ${cell("A", "acceptable")} | ${cell("B", "acceptable")} | ${cell("C", "acceptable")} | ${cell("D", "acceptable")} |`);
  lines.push(`| 出口准确率 | ${cell("A", "pathOk")} | ${cell("B", "pathOk")} | ${cell("C", "pathOk")} | ${cell("D", "pathOk")} |`);
  lines.push(
    `| 动作命中率 | ${(metrics.A.actionAvg * 100).toFixed(1)}% | ${(metrics.B.actionAvg * 100).toFixed(1)}% | ${(metrics.C.actionAvg * 100).toFixed(1)}% | ${(metrics.D.actionAvg * 100).toFixed(1)}% |`,
  );
  lines.push("");
  lines.push("## 结论");
  lines.push("");
  lines.push(`- 场景卡扩充的独立贡献（C vs A）：精准 ${pp(r(metrics.A.exact), r(metrics.C.exact))}；可接受 ${pp(r(metrics.A.acceptable), r(metrics.C.acceptable))}；出口 ${pp(r(metrics.A.pathOk), r(metrics.C.pathOk))}`);
  lines.push(`- RAG 的独立贡献（B vs A）：精准 ${pp(r(metrics.A.exact), r(metrics.B.exact))}；可接受 ${pp(r(metrics.A.acceptable), r(metrics.B.acceptable))}；出口 ${pp(r(metrics.A.pathOk), r(metrics.B.pathOk))}`);
  lines.push(`- 叠加效果（D vs A）：精准 ${pp(r(metrics.A.exact), r(metrics.D.exact))}；可接受 ${pp(r(metrics.A.acceptable), r(metrics.D.acceptable))}；出口 ${pp(r(metrics.A.pathOk), r(metrics.D.pathOk))}`);
  lines.push(`- 推荐业务试用配置：**${rec.id} ${GROUPS.find((g) => g.id === rec.id)?.label}** — ${rec.reason}`);
  lines.push("");
  lines.push("## 逐条");
  lines.push("");
  lines.push("| VASC | 预期 | A | B | C | D |");
  lines.push("|------|------|---|---|---|---|");
  const mark = (row: SideRow) => (row.sceneExact ? "精准✓" : row.sceneAcceptable ? "可接受✓" : "✗") + ` ${row.actualSceneName}`;
  for (let i = 0; i < n; i++) {
    lines.push(
      `| ${byGroup.A[i].vascNo} | ${byGroup.A[i].expectedScene} | ${mark(byGroup.A[i])} | ${mark(byGroup.B[i])} | ${mark(byGroup.C[i])} | ${mark(byGroup.D[i])} |`,
    );
  }
  lines.push("");
  lines.push("Traces: `traces/A|B|C|D/`");
  lines.push("");

  writeFileSync(resolve(outDir, "abcd-comparison.md"), lines.join("\n"), "utf8");
  writeFileSync(
    resolve(outDir, "abcd-comparison.json"),
    JSON.stringify({ model, metrics, byGroup, recommended: rec }, null, 2),
    "utf8",
  );
  console.log(`[abcd] wrote ${outDir}/abcd-comparison.md recommended=${rec.id}`);

  if (!hasFlag("skip-verify")) {
    try {
      await verifyLive(rec, verifyOut, 5);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      writeFileSync(resolve(verifyOut, "verify-error.md"), `# 实单验证失败\n\n${msg}\n`, "utf8");
      console.error(`[verify] failed: ${msg}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
