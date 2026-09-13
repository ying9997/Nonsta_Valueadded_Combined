/**
 * Objective eval for t14-golden (isolated from pipeline).
 *
 *   npx tsx internal-review-copilot/scripts/run-objective-eval.ts \
 *     --input _runs/20260909_p3_eval/t14-golden-details.json \
 *     --golden internal-review-copilot/eval/golden/t14-golden.jsonl \
 *     --out _runs/20260909_p3_eval \
 *     [--skip-llm]
 *
 * Isolation: reads golden only in this script; runPipeline() never sees expectedScene.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { OutputPath } from "../lib/types.ts";

interface GoldenLabel {
  vascNo: string;
  expectedScene: string;
  acceptableScenes?: string[];
  expectedOutputPath: OutputPath;
  expectedActions?: string[];
  expectedMissing?: string[];
  layer?: string;
  omsSceneName?: string;
  acceptableNote?: string;
}

interface RowResult {
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
  expectedActions: string[];
  matchedActions: string[];
  actionCoverage: number;
  actionConstraintHit: boolean | null;
  expectedMissing: string[];
  actualMissing: string[];
  missingRecall: number;
  missingPrecision: number;
  falseBlock: boolean;
  falsePass: boolean;
  falseUnsupported: boolean;
  decision: string;
  actionCandidateScenes: string[];
  diff: string;
}

const SCENE_NAME: Record<string, string> = {
  inbound_package_barcode_batch_relabel:
    '【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架',
  inbound_photo_hold: "【入库】指定商品拍照暂存",
  inbound_third_party_merchandise_barcode: "【入库】关联第三方商品条码上架",
  inbound_label_identify: "【入库】尺重/标签辨识后换标上架",
  inbound_package_exception_relabel_shelving: "【入库】包裹类异常换商品标签上架",
};

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

function normalizeMissingToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/vas_attr_rel_lf/g, "标签文件")
    .replace(/labelfile/g, "标签文件");
}

function missingOverlap(expected: string[], actual: string[]): { recall: number; precision: number } {
  const e = [...new Set(expected.map(normalizeMissingToken).filter(Boolean))];
  const a = [...new Set(actual.map(normalizeMissingToken).filter(Boolean))];
  if (!e.length && !a.length) return { recall: 1, precision: 1 };
  if (!e.length) return { recall: 1, precision: a.length ? 0 : 1 };
  if (!a.length) return { recall: 0, precision: 1 };
  const hit = e.filter((x) => a.some((y) => y.includes(x) || x.includes(y))).length;
  const precHit = a.filter((x) => e.some((y) => y.includes(x) || x.includes(y))).length;
  return { recall: hit / e.length, precision: precHit / a.length };
}

function actionCovered(expected: string, matched: string[]): boolean {
  const e = expected.trim();
  if (!e) return true;
  for (const m of matched) {
    if (!m) continue;
    if (m === e || m.includes(e) || e.includes(m)) return true;
  }
  // soft aliases between golden wording and ACTION_SCENE_MAP labels
  const aliases: Array<[RegExp, RegExp]> = [
    [/补贴包裹/, /补贴包裹标签|换包裹标签/],
    [/关联第三方/, /关联第三方/],
    [/拍照/, /拍照/],
    [/暂存/, /拍照暂存|暂存/],
    [/辨识/, /辨识/],
    [/换标|换商品标签/, /换商品标签|换标/],
    [/上架/, /上架|直接上架/],
  ];
  for (const [er, mr] of aliases) {
    if (er.test(e) && matched.some((m) => mr.test(m))) return true;
  }
  return false;
}

function actionCoverage(expected: string[], matched: string[]): number {
  if (!expected.length) return 1;
  const hit = expected.filter((a) => actionCovered(a, matched)).length;
  return hit / expected.length;
}

function isL1(path: string): boolean {
  return path === "needs_requirement_clarification";
}

function compareOne(label: GoldenLabel, result: PipelineResult): RowResult {
  const actualSceneKey = result.matchResult?.sceneKey || "";
  const actualSceneName =
    result.matchResult?.scenarioName || SCENE_NAME[actualSceneKey] || actualSceneKey || "（空）";
  const acceptable = label.acceptableScenes?.length
    ? label.acceptableScenes
    : [label.expectedScene].filter(Boolean);
  const sceneExact = Boolean(label.expectedScene) && actualSceneKey === label.expectedScene;
  const sceneAcceptable = Boolean(actualSceneKey) && acceptable.includes(actualSceneKey);
  const pathOk = result.outputPath === label.expectedOutputPath;
  const expectedActions = label.expectedActions || [];
  const matchedActions = result.matchResult?.matchedActions || [];
  const actionCandidateScenes = result.matchResult?.actionCandidateScenes || [];
  const expectedMissing = label.expectedMissing || [];
  const actualMissing = result.missing || [];
  const miss = missingOverlap(expectedMissing, actualMissing);
  const cov = actionCoverage(expectedActions, matchedActions);
  const actionConstraintHit = label.expectedScene
    ? actionCandidateScenes.includes(label.expectedScene)
    : null;
  const falseBlock = !isL1(label.expectedOutputPath) && isL1(result.outputPath);
  const falsePass = isL1(label.expectedOutputPath) && !isL1(result.outputPath);
  const falseUnsupported =
    label.expectedOutputPath !== "transfer_human" &&
    (result.matchResult?.decision === "unsupported" ||
      (result.outputPath === "transfer_human" && result.matchResult?.decision === "unsupported"));

  const diffs: string[] = [];
  if (!pathOk) diffs.push(`出口 ${label.expectedOutputPath}→${result.outputPath}`);
  if (!sceneExact && sceneAcceptable) diffs.push(`场景可接受非最佳 ${label.expectedScene}→${actualSceneKey}`);
  if (!sceneAcceptable) diffs.push(`场景不符 ${label.expectedScene}→${actualSceneKey || "(empty)"}`);
  if (cov < 1) diffs.push(`动作覆盖 ${(cov * 100).toFixed(0)}% exp=${expectedActions.join("|")} act=${matchedActions.join("|")}`);
  if (miss.recall < 1) diffs.push(`缺失召回低 exp=${expectedMissing.join("|")} act=${actualMissing.join("|")}`);
  if (falseBlock) diffs.push("误拦(L1)");
  if (falsePass) diffs.push("漏放(L1)");
  if (falseUnsupported) diffs.push("误判无场景/unsupported");

  return {
    vascNo: label.vascNo,
    expectedScene: label.expectedScene,
    omsSceneName: label.omsSceneName || SCENE_NAME[label.expectedScene] || label.expectedScene,
    actualSceneKey,
    actualSceneName,
    sceneExact,
    sceneAcceptable,
    expectedOutputPath: label.expectedOutputPath,
    actualOutputPath: result.outputPath,
    pathOk,
    expectedActions,
    matchedActions,
    actionCoverage: cov,
    actionConstraintHit,
    expectedMissing,
    actualMissing,
    missingRecall: miss.recall,
    missingPrecision: miss.precision,
    falseBlock,
    falsePass,
    falseUnsupported,
    decision: result.matchResult?.decision || "",
    actionCandidateScenes,
    diff: diffs.join("；") || "-",
  };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const root = projectDir();
  const inputPath = resolve(root, arg("input", "_runs/20260909_p3_eval/t14-golden-details.json"));
  const goldenPath = resolve(root, arg("golden", "internal-review-copilot/eval/golden/t14-golden.jsonl"));
  const outDir = resolve(root, arg("out", "_runs/20260909_p3_eval"));
  const skipLlm = hasFlag("skip-llm") || !hasFlag("with-llm");
  mkdirSync(outDir, { recursive: true });

  const details = loadDetails(inputPath);
  const labels = readJsonl<GoldenLabel>(goldenPath);
  const rows: RowResult[] = [];
  const results: PipelineResult[] = [];

  for (const label of labels) {
    const detail = details[label.vascNo];
    if (!detail) throw new Error(`details 中找不到 ${label.vascNo}`);
    console.log(`[objective] ${label.vascNo} skipLlm=${skipLlm}`);
    const result = await runPipeline(detail, { skipLlm });
    results.push(result);
    rows.push(compareOne(label, result));
  }

  const n = rows.length;
  const pathOk = rows.filter((r) => r.pathOk).length;
  const exact = rows.filter((r) => r.sceneExact).length;
  const acceptable = rows.filter((r) => r.sceneAcceptable).length;
  const falseBlock = rows.filter((r) => r.falseBlock).length;
  const falsePass = rows.filter((r) => r.falsePass).length;
  const falseUnsupported = rows.filter((r) => r.falseUnsupported).length;
  const actionCovAvg =
    rows.reduce((s, r) => s + r.actionCoverage, 0) / (n || 1);
  const sceneScored = rows.filter((r) => r.expectedScene);
  const top1 = sceneScored.filter((r) => r.sceneExact).length;
  const constraintRows = rows.filter((r) => r.actionConstraintHit !== null);
  const constraintHit = constraintRows.filter((r) => r.actionConstraintHit).length;
  const missRecall =
    rows.reduce((s, r) => s + r.missingRecall, 0) / (n || 1);
  const missPrec =
    rows.reduce((s, r) => s + r.missingPrecision, 0) / (n || 1);

  const md: string[] = [];
  md.push("# 客观评测报告");
  md.push("");
  md.push("## 数据集");
  md.push(`- Golden labels: \`t14-golden.jsonl\`（${n} 条）`);
  md.push("- Pipeline: post-P1");
  md.push(`- Input: \`${arg("input", "_runs/20260909_p3_eval/t14-golden-details.json")}\``);
  md.push(`- skipLlm: ${skipLlm}`);
  md.push("- 隔离确认: golden 文件不被 `runPipeline` 读取 ✓");
  md.push("");
  md.push("## 端到端指标");
  md.push("");
  md.push("| 中文名 | 英文名 | 值 |");
  md.push("|--------|-------|---|");
  md.push(`| 出口准确率 | outputPath Accuracy | ${pathOk}/${n} (${pct(pathOk, n)}) |`);
  md.push(`| 场景精准匹配率 | sceneKey Exact Match | ${exact}/${n} (${pct(exact, n)}) |`);
  md.push(`| 场景可接受匹配率 | sceneKey Acceptable Match | ${acceptable}/${n} (${pct(acceptable, n)}) |`);
  md.push("");
  md.push("## check-requirement（第一关）");
  md.push("");
  md.push("| 中文名 | 英文名 | 值 |");
  md.push("|--------|-------|---|");
  md.push(`| 误拦率 | False Block Rate | ${falseBlock}/${n} (${pct(falseBlock, n)}) |`);
  md.push(`| 漏放率 | False Pass Rate | ${falsePass}/${n} (${pct(falsePass, n)}) |`);
  md.push(`| 动作命中率 | Action Coverage | ${(actionCovAvg * 100).toFixed(1)}% |`);
  md.push("");
  md.push("## match-template（第二关）");
  md.push("");
  md.push("| 中文名 | 英文名 | 值 |");
  md.push("|--------|-------|---|");
  md.push(`| 场景判对率 | Scene Top-1 Accuracy | ${top1}/${sceneScored.length} (${pct(top1, sceneScored.length)}) |`);
  md.push(`| 误判无场景率 | False Unsupported Rate | ${falseUnsupported}/${n} (${pct(falseUnsupported, n)}) |`);
  md.push(
    `| 动作约束命中率 | Action Constraint Hit Rate | ${constraintHit}/${constraintRows.length} (${pct(constraintHit, constraintRows.length)}) |`,
  );
  md.push("");
  md.push("## check-completeness（第三关）");
  md.push("");
  md.push("| 中文名 | 英文名 | 值 |");
  md.push("|--------|-------|---|");
  md.push(`| 缺失字段召回率 | Missing Fields Recall | ${(missRecall * 100).toFixed(1)}% |`);
  md.push(`| 缺失字段精确率 | Missing Fields Precision | ${(missPrec * 100).toFixed(1)}% |`);
  md.push("");
  md.push("## 逐条对比");
  md.push("");
  md.push("| VASC | 预期场景（OMS 全名） | 实际场景 | 场景✓ | 预期出口 | 实际出口 | 出口✓ | 差异说明 |");
  md.push("|------|-------------------|---------|------|---------|---------|------|----------|");
  for (const r of rows) {
    const sceneMark = r.sceneExact ? "精准✓" : r.sceneAcceptable ? "可接受✓" : "✗";
    md.push(
      `| ${r.vascNo} | ${r.omsSceneName} | ${r.actualSceneName || r.actualSceneKey || "（空）"} | ${sceneMark} | ${r.expectedOutputPath} | ${r.actualOutputPath} | ${r.pathOk ? "✓" : "✗"} | ${r.diff} |`,
    );
  }
  md.push("");

  // error attribution
  const attrs: Array<{ component: string; type: string; vasc: string }> = [];
  for (const r of rows) {
    if (r.falseBlock) attrs.push({ component: "check-requirement", type: "误拦 False Block", vasc: r.vascNo });
    if (r.falsePass) attrs.push({ component: "check-requirement", type: "漏放 False Pass", vasc: r.vascNo });
    if (!r.sceneAcceptable) attrs.push({ component: "match-template", type: "场景不可接受", vasc: r.vascNo });
    else if (!r.sceneExact) attrs.push({ component: "match-template", type: "场景可接受但非最佳", vasc: r.vascNo });
    if (r.falseUnsupported) attrs.push({ component: "match-template", type: "误判无场景", vasc: r.vascNo });
    if (!r.pathOk && r.actualOutputPath === "needs_field_clarification") {
      attrs.push({ component: "check-completeness", type: "出口停在缺附件", vasc: r.vascNo });
    }
    if (r.missingRecall < 1 && r.expectedMissing.length) {
      attrs.push({ component: "check-completeness", type: "缺失字段召回不足", vasc: r.vascNo });
    }
  }
  const attrCount = new Map<string, { component: string; type: string; vascs: string[] }>();
  for (const a of attrs) {
    const k = `${a.component}||${a.type}`;
    const cur = attrCount.get(k) || { component: a.component, type: a.type, vascs: [] };
    cur.vascs.push(a.vasc);
    attrCount.set(k, cur);
  }
  md.push("## 错误归因");
  md.push("");
  md.push("| 组件 | 错误类型 | 频率 | 示例 VASC |");
  md.push("|------|---------|------|----------|");
  if (!attrCount.size) {
    md.push("| — | （无） | 0 | — |");
  } else {
    for (const v of [...attrCount.values()].sort((a, b) => b.vascs.length - a.vascs.length)) {
      md.push(`| ${v.component} | ${v.type} | ${v.vascs.length} | ${v.vascs.slice(0, 3).join(", ")} |`);
    }
  }
  md.push("");

  writeFileSync(resolve(outDir, "objective-eval-report.md"), md.join("\n"), "utf8");
  writeFileSync(
    resolve(outDir, "objective-eval-results.json"),
    JSON.stringify(
      {
        skipLlm,
        isolation: "golden not passed to runPipeline",
        metrics: {
          outputPathAccuracy: pathOk / (n || 1),
          sceneKeyExactMatch: exact / (n || 1),
          sceneKeyAcceptableMatch: acceptable / (n || 1),
          falseBlockRate: falseBlock / (n || 1),
          falsePassRate: falsePass / (n || 1),
          actionCoverage: actionCovAvg,
          sceneTop1Accuracy: top1 / (sceneScored.length || 1),
          falseUnsupportedRate: falseUnsupported / (n || 1),
          actionConstraintHitRate: constraintHit / (constraintRows.length || 1),
          missingFieldsRecall: missRecall,
          missingFieldsPrecision: missPrec,
        },
        rows,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`[objective] wrote ${outDir}/objective-eval-report.md`);
  console.log(
    `[objective] path=${pathOk}/${n} exact=${exact}/${n} acceptable=${acceptable}/${n} actionCov=${(actionCovAvg * 100).toFixed(1)}%`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
