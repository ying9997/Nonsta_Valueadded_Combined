/**
 * Component eval for match-template v0.2.
 *
 * Usage:
 *   npx tsx internal-review-copilot/scripts/eval-match-template.ts \
 *     --golden internal-review-copilot/eval/golden/match-template-eval.jsonl \
 *     --out _runs/20260907_match_template_eval
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { matchTemplate } from "../lib/match-template.ts";
import { asArray, asRecord, asText, buildAgentInput } from "../lib/oms-adapter.ts";
import { bindContext } from "../lib/context-bind.ts";
import { checkRequirement } from "../lib/check-requirement.ts";
import type { ContextFacts, MatchDecision } from "../lib/types.ts";

interface EvalCase {
  id: string;
  vascNo: string;
  normalizedRequirement: string;
  expectedDecision: MatchDecision;
  expectedSceneKey: string;
  goldStatus: "gold" | "shadow" | "derived";
  source: string;
  notes: string;
  hardCase?: boolean;
  context?: Partial<ContextFacts>;
}

interface Row {
  id: string;
  vascNo: string;
  goldStatus: string;
  expectedDecision: string;
  actualDecision: string;
  decisionMatch: boolean;
  expectedSceneKey: string;
  actualSceneKey: string;
  sceneMatch: boolean | null;
  hardCase: boolean;
  notes: string;
  reason: string;
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

function emptyContext(overrides: Partial<ContextFacts> = {}): ContextFacts {
  return {
    orderNo: overrides.orderNo || "EVAL",
    customerCode: "",
    customerName: "",
    warehouseCode: "",
    warehouseName: "",
    eventNo: overrides.eventNo || "",
    businessOrderNo: overrides.businessOrderNo || "",
    allEventNos: overrides.allEventNos || [],
    allBusinessOrderNos: overrides.allBusinessOrderNos || [],
    vaSource: "",
    businessType: "",
    businessTypeDesc: "",
    sceneKey: "",
    sceneName: "",
    sceneCode: "",
    serviceAtom: overrides.serviceAtom || "OW01V1602",
    attachmentStatus: overrides.attachmentStatus || {},
    providedFields: overrides.providedFields || {},
    boundKeys: [],
  };
}

function metricsFor(rows: Row[]) {
  const total = rows.length;
  const top1 = rows.filter((r) => r.decisionMatch).length;
  const supportedRows = rows.filter((r) => r.expectedDecision === "supported");
  const sceneRows = supportedRows.filter((r) => r.expectedSceneKey);
  const sceneOk = sceneRows.filter((r) => r.sceneMatch).length;
  const unsupExp = rows.filter((r) => r.expectedDecision === "unsupported");
  const unsupOk = unsupExp.filter((r) => r.actualDecision === "unsupported").length;
  const falseSupported = rows.filter(
    (r) => r.expectedDecision !== "supported" && r.actualDecision === "supported",
  ).length;
  const ambiguousRate = total ? rows.filter((r) => r.actualDecision === "ambiguous").length / total : 0;
  return {
    total,
    top1Accuracy: total ? top1 / total : 0,
    top1Correct: top1,
    sceneAccuracy: sceneRows.length ? sceneOk / sceneRows.length : 0,
    sceneCorrect: sceneOk,
    sceneScored: sceneRows.length,
    unsupportedAccuracy: unsupExp.length ? unsupOk / unsupExp.length : 0,
    unsupportedCorrect: unsupOk,
    unsupportedScored: unsupExp.length,
    falseSupportedRate: total ? falseSupported / total : 0,
    falseSupported,
    ambiguousRate,
    ambiguousCount: rows.filter((r) => r.actualDecision === "ambiguous").length,
  };
}

function pct(n: number, d: number): string {
  if (!d) return "n/a";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function table(m: ReturnType<typeof metricsFor>): string[] {
  return [
    "| 指标 | 值 |",
    "|------|---|",
    `| Top-1 Accuracy | ${m.top1Correct}/${m.total} (${pct(m.top1Correct, m.total)}) |`,
    `| Scene Accuracy (supported) | ${m.sceneCorrect}/${m.sceneScored} (${pct(m.sceneCorrect, m.sceneScored)}) |`,
    `| Unsupported Accuracy | ${m.unsupportedCorrect}/${m.unsupportedScored} (${pct(m.unsupportedCorrect, m.unsupportedScored)}) |`,
    `| False Supported Rate | ${m.falseSupported}/${m.total} (${pct(m.falseSupported, m.total)}) |`,
    `| Ambiguous Rate (actual) | ${m.ambiguousCount}/${m.total} (${pct(m.ambiguousCount, m.total)}) |`,
  ];
}

function loadDetailsMaps(root: string): Map<string, Record<string, unknown>> {
  const paths = [
    resolve(root, "_runs/20260904_demo_cases/demo_all.details.json"),
    resolve(root, "_runs/20260901_oms_facts/details.json"),
    resolve(root, "_runs/20260902_ow01v1602_review_orders/details.json"),
  ];
  const map = new Map<string, Record<string, unknown>>();
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const raw = JSON.parse(readFileSync(p, "utf8"));
    const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
    for (const d of details) {
      const orderNo = asText(d.orderNo);
      if (orderNo && !map.has(orderNo)) map.set(orderNo, d);
    }
  }
  return map;
}

function resolveCaseInput(
  c: EvalCase,
  details: Map<string, Record<string, unknown>>,
): { text: string; context: ContextFacts } {
  if (c.vascNo && details.has(c.vascNo)) {
    const built = buildAgentInput(details.get(c.vascNo)!);
    if (built) {
      const { contextFacts } = bindContext(built.input);
      const req = checkRequirement(built.input.customerIntent, contextFacts);
      return {
        text: req.normalizedRequirement || built.input.customerIntent || c.normalizedRequirement,
        context: contextFacts,
      };
    }
  }
  return { text: c.normalizedRequirement, context: emptyContext(c.context || {}) };
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../..");
  const goldenPath = resolve(root, arg("golden") || "internal-review-copilot/eval/golden/match-template-eval.jsonl");
  const outDir = resolve(root, arg("out") || "_runs/20260907_match_template_eval");
  if (!existsSync(goldenPath)) throw new Error(`golden 不存在: ${goldenPath}`);

  const details = loadDetailsMaps(root);
  const cases = readJsonl<EvalCase>(goldenPath);
  const rows: Row[] = [];
  for (const c of cases) {
    const { text, context } = resolveCaseInput(c, details);
    if (c.vascNo) context.orderNo = c.vascNo;
    const result = matchTemplate(text, context);
    const actualScene = result.sceneKey || result.topK[0]?.sceneKey || "";
    const sceneMatch = c.expectedSceneKey ? actualScene === c.expectedSceneKey : null;
    rows.push({
      id: c.id,
      vascNo: c.vascNo || "-",
      goldStatus: c.goldStatus,
      expectedDecision: c.expectedDecision,
      actualDecision: result.decision,
      decisionMatch: result.decision === c.expectedDecision,
      expectedSceneKey: c.expectedSceneKey || "",
      actualSceneKey: actualScene,
      sceneMatch,
      hardCase: Boolean(c.hardCase),
      notes: c.notes,
      reason: result.reason,
    });
  }

  const all = metricsFor(rows);
  const goldDerived = metricsFor(rows.filter((r) => r.goldStatus === "gold" || r.goldStatus === "derived"));
  const goldOnly = metricsFor(rows.filter((r) => r.goldStatus === "gold"));
  const shadowOnly = metricsFor(rows.filter((r) => r.goldStatus === "shadow"));
  const derivedOnly = metricsFor(rows.filter((r) => r.goldStatus === "derived"));
  const hard = rows.filter((r) => r.hardCase);
  const mismatches = rows.filter((r) => !r.decisionMatch);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "eval-results.json"),
    `${JSON.stringify({ all, goldDerived, goldOnly, shadowOnly, derivedOnly, rows, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );

  const md = [
    "# match-template 组件评测",
    "",
    `- 评测集：\`${goldenPath}\``,
    `- 条数：${rows.length}（gold ${goldOnly.total} / derived ${derivedOnly.total} / shadow ${shadowOnly.total}）`,
    `- 主结论口径：**仅 gold + derived**（shadow 分栏报告，不计入主结论）`,
    "",
    "## 主结论（gold + derived）",
    "",
    ...table(goldDerived),
    "",
    "## 分栏对照",
    "",
    "### gold",
    "",
    ...table(goldOnly),
    "",
    "### derived",
    "",
    ...table(derivedOnly),
    "",
    "### shadow（16 当日单等，不计主结论）",
    "",
    ...table(shadowOnly),
    "",
    "### 全量（含 shadow，仅供对照）",
    "",
    ...table(all),
    "",
    "## 易判错子集（hardCase，期望 supported）",
    "",
    `| 命中 | ${hard.filter((r) => r.decisionMatch).length}/${hard.length} |`,
    "",
    "| id | vascNo | expected | actual | reason |",
    "|----|--------|----------|--------|--------|",
    ...hard.map(
      (r) =>
        `| ${r.id} | ${r.vascNo} | ${r.expectedDecision} | ${r.actualDecision} | ${r.reason} |`,
    ),
    "",
    "## 误判明细",
    "",
    ...(mismatches.length
      ? [
          "| id | status | expected | actual | scene exp/act | notes | reason |",
          "|----|--------|----------|--------|---------------|-------|--------|",
          ...mismatches.map(
            (r) =>
              `| ${r.id} | ${r.goldStatus} | ${r.expectedDecision} | ${r.actualDecision} | ${r.expectedSceneKey || "∅"} / ${r.actualSceneKey || "∅"} | ${r.notes} | ${r.reason} |`,
          ),
        ]
      : ["- 无误判"]),
    "",
    "## 逐条",
    "",
    "| id | status | expected | actual | match |",
    "|----|--------|----------|--------|-------|",
    ...rows.map(
      (r) =>
        `| ${r.id} | ${r.goldStatus} | ${r.expectedDecision} | ${r.actualDecision} | ${r.decisionMatch ? "✓" : "✗"} |`,
    ),
    "",
  ].join("\n");

  writeFileSync(resolve(outDir, "eval-results.md"), md, "utf8");
  console.log(`main(gold+derived) Top-1=${goldDerived.top1Correct}/${goldDerived.total}`);
  console.log(`wrote ${outDir}`);
}

main();
