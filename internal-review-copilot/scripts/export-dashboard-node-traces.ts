import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline, type PipelineTraceEvent } from "../lib/run-pipeline.ts";
import type { JsonRecord } from "../lib/types.ts";

interface DashboardRow {
  vascNo: string;
  aiWriteTime?: string;
  ai?: JsonRecord;
  human?: JsonRecord;
  diff?: JsonRecord;
}

interface DetailHit {
  detail: JsonRecord;
  source: string;
}

interface CaseTrace {
  runId: string;
  vascNo: string;
  dashboardRow: DashboardRow;
  detailSource: string;
  rerunOptions: JsonRecord;
  trace: Array<PipelineTraceEvent & { runId: string; vascNo: string; sequence: number }>;
  result: unknown;
}

const here = dirname(fileURLToPath(import.meta.url));
const copilotRoot = resolve(here, "..");
const repoRoot = resolve(copilotRoot, "..");
const args = new Set(process.argv.slice(2));

function argValue(name: string, fallback: string): string {
  const prefix = `${name}=`;
  const hit = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function shanghaiDay(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}`;
}

function readDashboardRows(): DashboardRow[] {
  const dataPath = resolve(copilotRoot, "dashboard/data.js");
  const raw = readFileSync(dataPath, "utf8")
    .replace(/^window\.QUALITY_DATA = /, "")
    .replace(/;\s*$/, "");
  const payload = JSON.parse(raw) as { rows?: DashboardRow[] };
  return (payload.rows || []).filter((row) => row.vascNo);
}

function walkFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walkFiles(full, files);
      continue;
    }
    if (
      entry.name === "details.json" ||
      entry.name.endsWith(".detail.json") ||
      entry.name === "l1-l25-readonly-details.json" ||
      entry.name === "standard-cases.details.json"
    ) {
      files.push(full);
    }
  }
  return files;
}

function collectDetails(value: unknown, out: JsonRecord[] = []): JsonRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) collectDetails(item, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const rec = value as JsonRecord;
  if (typeof rec.orderNo === "string" || typeof rec.vascNo === "string" || typeof rec.vasNo === "string") {
    out.push(rec);
  }
  for (const child of Object.values(rec)) {
    if (Array.isArray(child)) collectDetails(child, out);
  }
  return out;
}

function orderNoOf(detail: JsonRecord): string {
  return String(detail.orderNo || detail.vascNo || detail.vasNo || "");
}

function isOmsDetail(detail: JsonRecord): boolean {
  return Boolean(
    typeof detail.orderNo === "string" &&
      detail.listHeader &&
      typeof detail.listHeader === "object" &&
      Array.isArray(detail.atoms) &&
      Array.isArray(detail.events),
  );
}

function indexLocalDetails(orderNos: Set<string>): Map<string, DetailHit> {
  const index = new Map<string, DetailHit>();
  for (const file of walkFiles(copilotRoot)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    for (const detail of collectDetails(parsed)) {
      const orderNo = orderNoOf(detail);
      if (orderNos.has(orderNo) && isOmsDetail(detail) && !index.has(orderNo)) {
        index.set(orderNo, { detail, source: relative(repoRoot, file) });
      }
    }
  }
  return index;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function compactResult(result: unknown): JsonRecord {
  const rec = (result || {}) as JsonRecord;
  const match = (rec.matchResult || {}) as JsonRecord;
  return {
    orderNo: rec.orderNo,
    outputPath: rec.outputPath,
    ruleOutputPath: rec.ruleOutputPath,
    node: rec.node,
    nodesHit: rec.nodesHit,
    failureGate: rec.failureGate,
    sceneKey: match.sceneKey,
    scenarioName: match.scenarioName,
    decision: match.decision,
    confidence: match.confidence,
    missingFields: rec.missingFields,
    missingAttachments: rec.missingAttachments,
    riskFlags: rec.riskFlags,
    llmError: ((rec.llm || {}) as JsonRecord).error || "",
  };
}

function markdownForCase(caseTrace: CaseTrace): string {
  const result = compactResult(caseTrace.result);
  const lines = [
    `# ${caseTrace.vascNo} workflow trace`,
    "",
    `- runId: ${caseTrace.runId}`,
    `- detailSource: ${caseTrace.detailSource}`,
    `- aiWriteTime: ${caseTrace.dashboardRow.aiWriteTime || ""}`,
    `- outputPath: ${result.outputPath || ""}`,
    `- scene: ${result.sceneKey || ""} ${result.scenarioName || ""}`,
    `- nodes: ${caseTrace.trace.map((event) => event.node).join(" -> ")}`,
    "",
    "| # | node | durationMs | output summary |",
    "|---:|---|---:|---|",
  ];
  for (const event of caseTrace.trace) {
    const output = event.output as JsonRecord | undefined;
    const summary =
      event.error ||
      String(
        output?.outputPath ||
          output?.decision ||
          output?.complete ||
          output?.verdict ||
          output?.match ||
          output?.node ||
          "",
      );
    lines.push(`| ${event.sequence} | ${event.node} | ${event.durationMs} | ${summary.replace(/\|/g, "/")} |`);
  }
  lines.push("");
  lines.push("Full raw input/output is in trace.json.");
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const rows = readDashboardRows();
  const orderNos = new Set(rows.map((row) => row.vascNo));
  const detailIndex = indexLocalDetails(orderNos);
  const outDir = resolve(copilotRoot, argValue("--out", `_runs/${shanghaiDay()}_dashboard_node_traces`));
  const limit = Number(argValue("--limit", "0")) || 0;
  const skipLlm = args.has("--skip-llm");
  const available = rows.filter((row) => detailIndex.has(row.vascNo));
  const runnable = available.slice(0, limit || undefined);
  const missing = rows
    .filter((row) => !detailIndex.has(row.vascNo))
    .map((row) => ({ vascNo: row.vascNo, aiWriteTime: row.aiWriteTime, ai: row.ai, human: row.human, diff: row.diff }));
  const rerunOptions = {
    sceneLlm: true,
    sceneLlmVersion: 2,
    ragEnabled: false,
    allowMissingAttachment: true,
    skipLlm,
  };
  const aggregateEvents: Array<PipelineTraceEvent & { runId: string; vascNo: string; sequence: number }> = [];
  const cases: JsonRecord[] = [];
  const skipped: JsonRecord[] = [];
  const errors: JsonRecord[] = [];

  mkdirSync(outDir, { recursive: true });
  writeJson(resolve(outDir, "dashboard-orders.json"), rows);
  writeJson(resolve(outDir, "missing-details.json"), missing);

  for (const [idx, row] of runnable.entries()) {
    const hit = detailIndex.get(row.vascNo);
    if (!hit) continue;
    const runId = `${row.vascNo}-${Date.now()}-${idx + 1}`;
    const trace: CaseTrace["trace"] = [];
    const caseDir = resolve(outDir, "cases", row.vascNo);
    writeJson(resolve(caseDir, "input-detail.json"), hit.detail);
    try {
      const result = await runPipeline(hit.detail, {
        sceneLlm: true,
        sceneLlmVersion: 2,
        ragEnabled: false,
        allowMissingAttachment: true,
        skipLlm,
        onTrace: (event) => {
          const enriched = { ...event, runId, vascNo: row.vascNo, sequence: trace.length + 1 };
          trace.push(enriched);
          aggregateEvents.push(enriched);
        },
      });
      if (!result) {
        const item = {
          vascNo: row.vascNo,
          detailSource: hit.source,
          reason: "runPipeline returned null; local input was not accepted as a runnable OMS detail",
        };
        skipped.push(item);
        writeJson(resolve(caseDir, "skipped.json"), item);
        console.log(`[${idx + 1}/${runnable.length}] ${row.vascNo} skipped`);
        continue;
      }
      const caseTrace: CaseTrace = {
        runId,
        vascNo: row.vascNo,
        dashboardRow: row,
        detailSource: hit.source,
        rerunOptions,
        trace,
        result,
      };
      writeJson(resolve(caseDir, "trace.json"), caseTrace);
      writeJson(resolve(caseDir, "result.json"), result);
      writeText(resolve(caseDir, "trace.md"), markdownForCase(caseTrace));
      cases.push({
        vascNo: row.vascNo,
        detailSource: hit.source,
        traceFile: relative(repoRoot, resolve(caseDir, "trace.json")),
        markdownFile: relative(repoRoot, resolve(caseDir, "trace.md")),
        ...compactResult(result),
      });
      console.log(`[${idx + 1}/${runnable.length}] ${row.vascNo} ok nodes=${trace.length}`);
    } catch (err) {
      const item = {
        vascNo: row.vascNo,
        detailSource: hit.source,
        error: err instanceof Error ? err.stack || err.message : String(err),
      };
      errors.push(item);
      writeJson(resolve(caseDir, "error.json"), item);
      console.log(`[${idx + 1}/${runnable.length}] ${row.vascNo} error`);
    }
  }

  writeText(
    resolve(outDir, "workflow-node-traces.jsonl"),
    aggregateEvents.map((event) => JSON.stringify(event)).join("\n") + (aggregateEvents.length ? "\n" : ""),
  );
  writeJson(resolve(outDir, "case-index.json"), cases);
  writeJson(resolve(outDir, "skipped.json"), skipped);
  writeJson(resolve(outDir, "errors.json"), errors);
  writeText(
    resolve(outDir, "README.md"),
    [
      "# Dashboard workflow node traces",
      "",
      `- dashboardRows: ${rows.length}`,
      `- localDetailsAvailable: ${available.length}`,
      `- selectedForRerun: ${runnable.length}`,
      `- missingLocalDetails: ${missing.length}`,
      `- succeeded: ${cases.length}`,
      `- skipped: ${skipped.length}`,
      `- failed: ${errors.length}`,
      `- skipLlm: ${skipLlm}`,
      "",
      "Files:",
      "- `case-index.json`: one row per rerun case with compact result and trace file path.",
      "- `workflow-node-traces.jsonl`: all node trace events in one JSONL file.",
      "- `cases/<VASC>/trace.json`: raw node input/output for a single case.",
      "- `cases/<VASC>/input-detail.json`: local OMS detail used for rerun.",
      "- `missing-details.json`: dashboard cases that cannot be rerun from local files yet.",
      "",
    ].join("\n"),
  );
  console.log(`wrote ${relative(repoRoot, outDir)}`);
  console.log(
    `dashboard=${rows.length} localDetails=${available.length} selected=${runnable.length} missing=${missing.length} ok=${cases.length} failed=${errors.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
