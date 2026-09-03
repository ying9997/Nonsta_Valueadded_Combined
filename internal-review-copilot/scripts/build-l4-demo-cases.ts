/**
 * Build D+2 demo cases from the 183-order historical OMS snapshot.
 *
 * Only selected L4 copies are patched, and only missing vaAtomFiles records
 * are appended. The source details.json is never modified.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { asArray, asRecord, asText, attrMap, buildAgentInput, pickOw01Atom } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { JsonRecord, OutputPath } from "../lib/types.ts";

const projectRoot = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(projectRoot, "_runs/20260901_oms_facts/details.json");
const outDir = resolve(projectRoot, "_runs/20260904_demo_cases");
const casebookPriority = [
  "VASC000000333147",
  "VASC000000323364",
  "VASC000000249768",
  "VASC000000186117",
];
const requiredFiles = [
  { fileType: "VAS_ATTR_REL_AOOI", fileName: "操作说明.pdf" },
  { fileType: "VAS_ATTR_REL_TCRBCAL", fileName: "商品标签对应关系.xlsx" },
  { fileType: "VAS_ATTR_REL_LF", fileName: "标签文件.pdf" },
];

interface Candidate {
  orderNo: string;
  detail: JsonRecord;
  sop: string;
  sopLength: number;
  requirementBackground: string;
  requirementDescription: string;
  eventNos: string[];
  businessOrderNos: string[];
  fileTypes: string[];
  warehouse: string;
  casebook: boolean;
  originalResult?: PipelineResult | null;
  patchedResult?: PipelineResult | null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function targetAtom(detail: JsonRecord): JsonRecord | null {
  return pickOw01Atom(detail);
}

function patchRequiredFiles(detail: JsonRecord): JsonRecord {
  const patched = clone(detail);
  const atom = targetAtom(patched);
  if (!atom) return patched;
  const files = asArray(atom.vaAtomFiles).map(asRecord);
  const existing = new Set(files.map((file) => asText(file.fileType)));
  for (const required of requiredFiles) {
    if (!existing.has(required.fileType)) files.push({ ...required });
  }
  atom.vaAtomFiles = files;
  return patched;
}

function auditThrough(detail: JsonRecord, atom: JsonRecord): string {
  const header = asRecord(detail.listHeader);
  return asText(header.isAuditThrough) || asText(atom.isAuditThrough);
}

function candidateOf(detail: JsonRecord): Candidate | null {
  const atom = targetAtom(detail);
  const built = buildAgentInput(detail);
  if (!atom || !built) return null;
  const header = asRecord(detail.listHeader);
  const sop = asText(atom.sop) || asText(atom.vasDes);
  const attrs = attrMap(atom);
  const background = asText(attrs.BEOR) || asText(attrs["需求背景说明"]);
  const description = asText(attrs.VAS_ATTR_REL_RD) || asText(attrs["需求描述"]);
  const files = asArray(atom.vaAtomFiles).map(asRecord);
  if (
    asText(header.status) !== "PD" ||
    auditThrough(detail, atom) !== "Y" ||
    sop.length <= 100 ||
    !background ||
    !description ||
    !built.input.pageContext.eventNo ||
    !built.input.pageContext.businessOrderNo
  ) {
    return null;
  }
  return {
    orderNo: built.input.vascNo,
    detail,
    sop,
    sopLength: sop.length,
    requirementBackground: background,
    requirementDescription: description,
    eventNos: (built.input.enrichedContext.allEventNos as string[]) || [],
    businessOrderNos: (built.input.enrichedContext.allBusinessOrderNos as string[]) || [],
    fileTypes: files.map((file) => asText(file.fileType)).filter(Boolean),
    warehouse: built.input.pageContext.warehouseName || built.input.pageContext.warehouseCode,
    casebook: casebookPriority.includes(built.input.vascNo),
  };
}

function resultLabel(result?: PipelineResult | null): string {
  if (!result) return "no_result";
  return `${result.ruleOutputPath}@${result.node}`;
}

function pickLayer(
  rows: Array<{ detail: JsonRecord; result: PipelineResult }>,
  path: OutputPath,
): { detail: JsonRecord; result: PipelineResult } | undefined {
  const same = rows.filter((row) => row.result.ruleOutputPath === path);
  if (path === "needs_requirement_clarification") {
    return same.sort(
      (a, b) =>
        b.result.missingRequirementItems.length - a.result.missingRequirementItems.length ||
        a.result.agentInput.customerIntent.length - b.result.agentInput.customerIntent.length,
    )[0];
  }
  if (path === "transfer_human") {
    return (
      same.find((row) => row.result.matchResult?.decision === "ambiguous") ||
      same.find((row) => !row.result.matchResult?.reason.includes("intercept_hold")) ||
      same[0]
    );
  }
  if (path === "needs_field_clarification") {
    return same.sort(
      (a, b) =>
        Math.abs(a.result.missing.length - 2) - Math.abs(b.result.missing.length - 2),
    )[0];
  }
  return same[0];
}

async function main(): Promise<void> {
  const raw = JSON.parse(readFileSync(sourcePath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const candidates = details.map(candidateOf).filter((item): item is Candidate => Boolean(item));

  for (const candidate of candidates) {
    candidate.originalResult = await runPipeline(candidate.detail, { skipLlm: true });
    candidate.patchedResult = await runPipeline(patchRequiredFiles(candidate.detail), { skipLlm: true });
  }

  const top10 = [...candidates].sort((a, b) => b.sopLength - a.sopLength).slice(0, 10);
  const eligibleL4 = candidates.filter(
    (item) =>
      item.patchedResult?.ruleOutputPath === "sop_generated" &&
      item.patchedResult.matchResult?.decision === "supported" &&
      item.patchedResult.matchResult.sceneKey === "inbound_label_identify",
  );
  const selected: Candidate[] = [];
  for (const orderNo of casebookPriority) {
    const item = eligibleL4.find((candidate) => candidate.orderNo === orderNo);
    if (item && selected.length < 4) selected.push(item);
  }
  for (const item of [...eligibleL4].sort((a, b) => b.sopLength - a.sopLength)) {
    if (selected.length >= 4) break;
    if (!selected.some((existing) => existing.orderNo === item.orderNo)) selected.push(item);
  }
  if (selected.length < 4) {
    throw new Error(`只有 ${selected.length} 条候选能稳定进入 L4，无法构造 4 条。`);
  }

  const allRuleResults: Array<{ detail: JsonRecord; result: PipelineResult }> = [];
  for (const detail of details) {
    const result = await runPipeline(detail, { skipLlm: true });
    if (result) allRuleResults.push({ detail, result });
  }
  const l1 = pickLayer(allRuleResults, "needs_requirement_clarification");
  const l2 = pickLayer(allRuleResults, "transfer_human");
  const l3 = pickLayer(allRuleResults, "needs_field_clarification");
  if (!l1 || !l2 || !l3) throw new Error("无法从 183 条中同时选出 L1/L2/L3。");

  const patchedL4 = selected.map((item) => patchRequiredFiles(item.detail));
  const demoAll = [l1.detail, l2.detail, l3.detail, ...patchedL4];
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "l4_patched_details.json"), `${JSON.stringify(patchedL4, null, 2)}\n`, "utf8");
  writeFileSync(resolve(outDir, "demo_all.details.json"), `${JSON.stringify(demoAll, null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "candidate-analysis.json"),
    `${JSON.stringify(
      {
        sourceCount: details.length,
        candidateCount: candidates.length,
        casebook: casebookPriority.map((orderNo) => {
          const detail = details.find((item) => asText(item.orderNo) === orderNo);
          const candidate = candidates.find((item) => item.orderNo === orderNo);
          return {
            orderNo,
            found: Boolean(detail),
            qualified: Boolean(candidate),
            sopLength: candidate?.sopLength || 0,
            patchedResult: resultLabel(candidate?.patchedResult),
            patchedDecision: candidate?.patchedResult?.matchResult?.decision || "",
            patchedReason: candidate?.patchedResult?.matchResult?.reason || "",
          };
        }),
        top10: top10.map((item) => ({
          orderNo: item.orderNo,
          sopLength: item.sopLength,
          sopPreview: item.sop.slice(0, 100),
          eventNos: item.eventNos,
          businessOrderNos: item.businessOrderNos,
          fileTypes: item.fileTypes,
          originalResult: resultLabel(item.originalResult),
          patchedResult: resultLabel(item.patchedResult),
          casebook: item.casebook,
        })),
        eligibleL4Top10: [...eligibleL4]
          .sort((a, b) => b.sopLength - a.sopLength)
          .slice(0, 10)
          .map((item) => ({
            orderNo: item.orderNo,
            sopLength: item.sopLength,
            sopPreview: item.sop.slice(0, 100),
            eventNos: item.eventNos,
            businessOrderNos: item.businessOrderNos,
            fileTypes: item.fileTypes,
            casebook: item.casebook,
          })),
        selectedL4: selected.map((item) => ({
          orderNo: item.orderNo,
          warehouse: item.warehouse,
          sopLength: item.sopLength,
          eventNos: item.eventNos,
          businessOrderNos: item.businessOrderNos,
          originalFileTypes: item.fileTypes,
          patchedResult: resultLabel(item.patchedResult),
          casebook: item.casebook,
        })),
        selectedLayers: [
          { layer: "L1", orderNo: l1.result.orderNo, expected: l1.result.ruleOutputPath },
          { layer: "L2", orderNo: l2.result.orderNo, expected: l2.result.ruleOutputPath, reason: l2.result.matchResult?.reason },
          { layer: "L3", orderNo: l3.result.orderNo, expected: l3.result.ruleOutputPath, missing: l3.result.missing },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`source=${details.length} candidates=${candidates.length} eligibleL4=${eligibleL4.length}`);
  console.log(`L4=${selected.map((item) => item.orderNo).join(",")}`);
  console.log(`L1=${l1.result.orderNo} L2=${l2.result.orderNo} L3=${l3.result.orderNo}`);
  console.log(`wrote ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
