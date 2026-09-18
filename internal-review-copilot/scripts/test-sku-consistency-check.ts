/**
 * H11 SKU 一致性校验：规则触发 / 比对 / 降级 / 可选 live+pipeline。
 *
 *   npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts
 *   npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts --live
 *   npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts --pipeline
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { asRecord } from "../lib/oms-adapter.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import {
  checkSkuConsistencySafe,
  compareSkus,
  extractWiPair,
  formatSkuCheckAuditorHint,
  rowsFromDwsPayload,
  shouldCheckSkuConsistency,
} from "../lib/sku-consistency-check.ts";
import type { AgentInput, ContextFacts, MatchResult } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sampleInput(over: Partial<AgentInput> = {}): AgentInput {
  const desc =
    "原WI51636814入库单号，预计10月2日到仓，需要上架前拦截，将原A+包裹标签，更换为新单WI52653783的A+ 包裹标签";
  const background = "因客户要求，WI51636814这个入库单有68箱A+包裹需要在上架前更换新的商品标签";
  return {
    mode: "internal_review_copilot",
    vascNo: "VASC000000370434",
    query: `${background}\n${desc}`,
    customerIntent: `${background}\n${desc}`,
    serviceAtom: "OW01V1602",
    sceneKey: "",
    sceneName: "【入库】上架前拦截",
    sceneCode: "202507021814",
    recommendedVasc: { vascCode: "", vascName: "" },
    pageContext: {
      entryScene: "INTERNAL_REVIEW",
      vaSource: "INBOUND",
      warehouseCode: "USGA",
      warehouseName: "USGA Warehouse",
      customerCode: "19733794",
      customerName: "福席户外用品有限公司",
      eventNo: "",
      businessOrderNo: "WI51636814",
      attachmentStatus: {},
      businessType: "INBOUND",
      businessTypeDesc: "入库订单",
    },
    providedFields: {
      BEOR: background,
      VAS_ATTR_REL_RD: desc,
      VAS_ATTR_REL_NWEON: "WI52653783",
      NSVASTN: "",
    },
    omsFacts: {
      customerRequirementDescription: desc,
      requirementBackground: background,
      fieldValues: { VAS_ATTR_REL_NWEON: "WI52653783" },
      attachmentStatus: {},
      uploadedFiles: [],
    },
    responsiblePeople: { submittedBy: "", customerService: [], sales: [], reviewers: [] },
    conversationEvidence: [],
    enrichedContext: { allBusinessOrderNos: ["WI51636814", "WI52653783"] },
    ...over,
  };
}

function sampleMatch(sceneKey = "inbound_aplus_direct_shelve"): MatchResult {
  return {
    matched: true,
    supported: true,
    category: "B",
    sceneKey,
    scenarioId: sceneKey,
    scenarioName: sceneKey,
    confidence: "high",
    reason: "test",
    score: 80,
    candidateTemplate: sceneKey,
    decision: "supported",
    confidenceScore: 0.8,
    candidates: [],
    topK: [],
  };
}

function sampleContext(input: AgentInput): ContextFacts {
  return {
    orderNo: input.vascNo,
    customerCode: input.pageContext.customerCode,
    customerName: input.pageContext.customerName,
    warehouseCode: input.pageContext.warehouseCode,
    warehouseName: input.pageContext.warehouseName,
    eventNo: "",
    businessOrderNo: input.pageContext.businessOrderNo,
    allEventNos: [],
    allBusinessOrderNos: ["WI51636814", "WI52653783"],
    vaSource: "INBOUND",
    businessType: "INBOUND",
    businessTypeDesc: "入库订单",
    sceneKey: input.sceneKey,
    sceneName: input.sceneName,
    sceneCode: input.sceneCode,
    serviceAtom: input.serviceAtom,
    attachmentStatus: {},
    providedFields: input.providedFields,
    boundKeys: [],
  };
}

async function runUnitTests(): Promise<void> {
  const input = sampleInput();
  const ctx = sampleContext(input);
  const pair = extractWiPair(input, ctx);
  assert(pair.oldWi === "WI51636814", `oldWi=${pair.oldWi}`);
  assert(pair.newWi === "WI52653783", `newWi=${pair.newWi}`);
  assert(pair.allWis.includes("WI51636814") && pair.allWis.includes("WI52653783"), "both WI extracted");

  assert(shouldCheckSkuConsistency(input, sampleMatch("inbound_aplus_direct_shelve"), ctx), "aplus+intercept should trigger");
  assert(shouldCheckSkuConsistency(input, sampleMatch("inbound_package_barcode_batch_relabel"), ctx), "T1 should trigger");
  assert(
    shouldCheckSkuConsistency(input, sampleMatch("inbound_photo_hold"), ctx),
    "OMS 上架前拦截 should trigger even if L2 picked photo_hold",
  );

  const other = sampleInput({
    sceneName: "",
    sceneCode: "",
    customerIntent: "请帮忙拍照确认货物外观后暂存",
    omsFacts: {
      customerRequirementDescription: "请帮忙拍照确认货物外观后暂存",
      requirementBackground: "",
      fieldValues: {},
      attachmentStatus: {},
      uploadedFiles: [],
    },
    providedFields: { VAS_ATTR_REL_RD: "请帮忙拍照确认货物外观后暂存", BEOR: "", VAS_ATTR_REL_NWEON: "", NSVASTN: "" },
    pageContext: { ...input.pageContext, businessOrderNo: "WI11111111" },
  });
  assert(
    !shouldCheckSkuConsistency(other, sampleMatch("inbound_photo_hold"), sampleContext(other)),
    "non-intercept photo_hold should not trigger",
  );

  assert(compareSkus(["A", "B"], ["B", "A", "C"]) === "consistent", "all old in new");
  assert(compareSkus(["A", "B"], ["B", "C"]) === "partial", "partial overlap");
  assert(compareSkus(["A"], ["B"]) === "mismatch", "no overlap");
  assert(compareSkus([], ["B"]) === "unknown", "empty old is unknown");

  const mocked = await checkSkuConsistencySafe({
    input,
    matchResult: sampleMatch(),
    contextFacts: ctx,
    deps: {
      querySkusByWi: async (wi) => (wi === "WI51636814" ? ["EXA2428-SLR", "EXA2830-SLR"] : ["EXA2428G", "EXA2830G"]),
    },
  });
  assert(mocked.triggered, "mocked check triggered");
  assert(mocked.match === "mismatch", `mocked match=${mocked.match}`);
  const prompt = formatSkuCheckAuditorHint(mocked);
  assert(prompt.startsWith("【提示：本单AI识别到"), "auditor hint prefix");
  assert(prompt.includes("SKU 不一致"), "mismatch prompt");
  assert(prompt.includes("请审核人员关注"), "reviewer facing");
  assert(!prompt.includes("请操作前核对确认"), "not a warehouse SOP step");

  const consistent = await checkSkuConsistencySafe({
    input,
    matchResult: sampleMatch(),
    contextFacts: ctx,
    deps: {
      querySkusByWi: async () => ["SKU-A"],
    },
  });
  assert(consistent.match === "consistent", "same SKU lists consistent");
  assert(!formatSkuCheckAuditorHint(consistent), "consistent does not inject reminder");

  const timedOut = await checkSkuConsistencySafe({
    input,
    matchResult: sampleMatch(),
    contextFacts: ctx,
    deps: {
      timeoutMs: 30,
      querySkusByWi: async () => {
        await new Promise((r) => setTimeout(r, 200));
        return ["SKU-A"];
      },
    },
  });
  assert(timedOut.triggered && timedOut.match === "unknown", "timeout degrades to unknown");
  assert(formatSkuCheckAuditorHint(timedOut).includes("请审核人员关注"), "unknown generic reminder");

  const skipped = await checkSkuConsistencySafe({
    input: other,
    matchResult: sampleMatch("inbound_photo_hold"),
    contextFacts: sampleContext(other),
    deps: {
      querySkusByWi: async () => {
        throw new Error("should not query");
      },
    },
  });
  assert(!skipped.triggered, "non-target scene skips query");

  const concatRows = rowsFromDwsPayload({
    content: [{ type: "text", text: '{"merchandise_code":"A"}\n{"merchandise_code":"B"}' }],
  });
  assert(concatRows.map((r) => r.merchandise_code).join(",") === "A,B", `concat json rows=${JSON.stringify(concatRows)}`);
  const tableRows = rowsFromDwsPayload({
    content: [
      {
        type: "text",
        text: "| merchandise_code | merchandise_serno |\n|---|---|\n| SKU1 | M1 |\n| SKU2 | M2 |",
      },
    ],
  });
  assert(tableRows.length === 2 && tableRows[1].merchandise_code === "SKU2", "markdown table rows");
  const sseRows = rowsFromDwsPayload({
    _sseMerged: true,
    payloads: [
      { result: { content: [{ type: "text", text: '{"merchandise_code":"X"}' }] } },
      { result: { content: [{ type: "text", text: '{"merchandise_code":"Y"}' }] } },
    ],
  });
  assert(sseRows.map((r) => r.merchandise_code).join(",") === "X,Y", "merged SSE rows");

  console.log("test-sku-consistency-check unit: ok");
}

async function runLive(): Promise<void> {
  loadEnvFiles();
  const input = sampleInput();
  const result = await checkSkuConsistencySafe({
    input,
    matchResult: sampleMatch(),
    contextFacts: sampleContext(input),
  });
  console.log(
    JSON.stringify(
      {
        triggered: result.triggered,
        oldWi: result.oldWi,
        newWi: result.newWi,
        match: result.match,
        oldSkuCount: result.oldSkus.length,
        newSkuCount: result.newSkus.length,
        source: result.source,
        error: result.error || "",
        mismatchDetails: (result.mismatchDetails || "").slice(0, 300),
      },
      null,
      2,
    ),
  );
  assert(result.triggered, "live should trigger");
  assert(result.oldWi === "WI51636814" && result.newWi === "WI52653783", "live WI pair");
  if (result.oldSkus.length && result.newSkus.length) {
    assert(result.match === "mismatch" || result.match === "partial", `expected mismatch/partial, got ${result.match}`);
  } else {
    assert(result.match === "unknown", "no SKU data → unknown");
  }
  console.log("test-sku-consistency-check live: ok");
}

async function runPipelineCase(): Promise<void> {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const inputPath = resolve(
    here,
    "../../_runs/20260916_supervisor_feedback/VASC000000370434.input.json",
  );
  if (!existsSync(inputPath)) throw new Error(`找不到样例输入：${inputPath}`);
  const detail = asRecord(JSON.parse(readFileSync(inputPath, "utf8")));
  const skipLlm = !hasFlag("llm");
  const result = await runPipeline(detail, {
    skipLlm,
    allowMissingAttachment: true,
    skipCompleteness: hasFlag("llm"),
  });
  if (!result) throw new Error("pipeline returned null");
  const outDir = resolve(here, "../_runs/20260916_sku_consistency_h11");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "pipeline-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "sku-check.json"),
    `${JSON.stringify(result.skuCheckResult || {}, null, 2)}\n`,
    "utf8",
  );
  if (result.llm?.sop?.sopText) {
    writeFileSync(resolve(outDir, "sop.txt"), result.llm.sop.sopText, "utf8");
  }
  writeFileSync(
    resolve(outDir, "summary.md"),
    [
      "# H11 SKU 一致性校验 — VASC000000370434",
      "",
      `- outputPath: \`${result.outputPath}\``,
      `- scene: \`${result.matchResult?.sceneKey || ""}\` ${result.matchResult?.scenarioName || ""}`,
      `- skuCheck.triggered: \`${result.skuCheckResult?.triggered}\``,
      `- skuCheck.match: \`${result.skuCheckResult?.match}\``,
      `- oldWi: \`${result.skuCheckResult?.oldWi || ""}\` (${result.skuCheckResult?.oldSkus.length || 0} SKU)`,
      `- newWi: \`${result.skuCheckResult?.newWi || ""}\` (${result.skuCheckResult?.newSkus.length || 0} SKU)`,
      `- source: \`${result.skuCheckResult?.source || ""}\``,
      `- nodesHit: ${result.nodesHit.join(" → ")}`,
      result.skuCheckResult?.mismatchDetails ? `- 差异：${result.skuCheckResult.mismatchDetails}` : "",
      result.skuCheckResult
        ? `- 审核员提示：${formatSkuCheckAuditorHint(result.skuCheckResult) || "（一致，不提示）"}`
        : "",
      result.llm?.error ? `- LLM error: ${result.llm.error}` : "",
      "",
    ]
      .filter((line) => line !== undefined)
      .join("\n"),
    "utf8",
  );
  assert(result.skuCheckResult?.triggered, "pipeline should trigger SKU check");
  assert(result.nodesHit.includes("sku-consistency-check"), "nodesHit includes sku-consistency-check");
  if (!skipLlm) {
    const sop = result.llm?.sop?.sopText || result.llm?.text || "";
    assert(!result.llm?.error, `LLM error: ${result.llm?.error || ""}`);
    assert(
      !/请操作前核对确认|请核对原入库单被拦截包裹的 SKU/.test(sop),
      "warehouse SOP should not carry the auditor SKU hint",
    );
  }
  console.log(`wrote ${outDir}`);
  console.log("test-sku-consistency-check pipeline: ok");
}

async function main(): Promise<void> {
  await runUnitTests();
  if (hasFlag("live")) await runLive();
  if (hasFlag("pipeline")) await runPipelineCase();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
