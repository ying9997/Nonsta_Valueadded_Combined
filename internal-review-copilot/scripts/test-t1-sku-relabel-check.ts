/**
 * T1 补贴包裹标：单/多 SKU 商品码校验。
 *
 *   npx tsx internal-review-copilot/scripts/test-t1-sku-relabel-check.ts
 *   npx tsx internal-review-copilot/scripts/test-t1-sku-relabel-check.ts --live
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyT1RequiredInfo,
  checkT1SkuRelabelSafe,
  decideT1SkuRelabel,
  detectSkuClaim,
  normalizeMerchandiseCode,
  pickT1TargetWis,
  shouldCheckT1SkuRelabel,
} from "../lib/t1-sku-relabel-check.ts";
import type { AgentInput, ContextFacts, MatchResult } from "../lib/types.ts";
import type { RequirementInfoField } from "../lib/scenario-cards.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sampleInput(over: Partial<AgentInput> = {}): AgentInput {
  const desc = "异常包裹都是同一个sku的货物，每箱补贴1个包裹条码，更换到新单WI52674273上架即可";
  return {
    mode: "internal_review_copilot",
    vascNo: "VASC000000370734",
    query: desc,
    customerIntent: desc,
    serviceAtom: "OW01V1602",
    sceneKey: "inbound_package_barcode_batch_relabel",
    sceneName: "【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架",
    sceneCode: "20250430",
    recommendedVasc: { vascCode: "", vascName: "" },
    pageContext: {
      entryScene: "INTERNAL_REVIEW",
      vaSource: "UNUSUAL",
      warehouseCode: "USKY3",
      warehouseName: "USKY3 Warehouse",
      customerCode: "19969470",
      customerName: "雷鳥視界有限公司",
      eventNo: "EB0126091132985375",
      businessOrderNo: "",
      attachmentStatus: {},
      businessType: "INBOUND",
      businessTypeDesc: "入库订单",
    },
    providedFields: {
      BEOR: desc,
      VAS_ATTR_REL_RD: desc,
      VAS_ATTR_REL_NWEON: "",
      NSVASTN: "",
    },
    omsFacts: {
      customerRequirementDescription: desc,
      requirementBackground: "",
      fieldValues: {},
      attachmentStatus: {},
      uploadedFiles: [],
    },
    responsiblePeople: { submittedBy: "", customerService: [], sales: [], reviewers: [] },
    conversationEvidence: [],
    enrichedContext: { allBusinessOrderNos: ["WI52674273"] },
    ...over,
  };
}

function sampleMatch(): MatchResult {
  return {
    matched: true,
    supported: true,
    category: "B",
    sceneKey: "inbound_package_barcode_batch_relabel",
    scenarioId: "inbound_package_barcode_batch_relabel",
    scenarioName: "【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架",
    confidence: "high",
    reason: "test",
    score: 80,
    candidateTemplate: "inbound_package_barcode_batch_relabel",
    decision: "supported",
    confidenceScore: 0.9,
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
    eventNo: input.pageContext.eventNo,
    businessOrderNo: input.pageContext.businessOrderNo,
    allEventNos: [input.pageContext.eventNo].filter(Boolean),
    allBusinessOrderNos: ["WI52674273"],
    vaSource: "UNUSUAL",
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
  assert(normalizeMerchandiseCode("M010000000013991941-10") === "M010000000013991941", "strip -10");
  assert(normalizeMerchandiseCode("M010000000013991941-10X") === "M010000000013991941", "strip -10X");
  assert(normalizeMerchandiseCode("M010000000013991941") === "M010000000013991941", "no suffix");
  assert(normalizeMerchandiseCode("m010000000013991941-10") === "M010000000013991941", "upper");

  assert(detectSkuClaim("异常包裹都是同一个sku的货物") === "single", "同一个sku");
  assert(detectSkuClaim("入库单只有1个SKU，随机贴即可") === "single", "1个SKU 随机贴");
  assert(detectSkuClaim("多款不同的sku，请按对应关系贴") === "multi", "多款");
  assert(detectSkuClaim("补贴包裹标签上架") === "unspecified", "unspecified");

  const input = sampleInput();
  const ctx = sampleContext(input);
  assert(shouldCheckT1SkuRelabel(sampleMatch(), input), "T1 scene triggers");
  assert(pickT1TargetWis(input, ctx).includes("WI52674273"), "pick 新单 WI");

  const sameSuffix = decideT1SkuRelabel({
    claim: "single",
    codes: ["M010000000013991941-10", "M010000000013991941"],
    wis: ["WI52674273"],
  });
  assert(sameSuffix.verdict === "single_ok", `suffix variants should be same SKU, got ${sameSuffix.verdict}`);
  assert(sameSuffix.stems.length === 1, "one stem");

  const bounce = decideT1SkuRelabel({
    claim: "single",
    codes: ["M010000000013991941", "M010000000009973294"],
    wis: ["WI52674273"],
  });
  assert(bounce.verdict === "single_mismatch_bounce", `expected bounce, got ${bounce.verdict}`);
  assert(/打回客户重新提交/.test(bounce.bouncePrompt), "bounce prompt");

  const multi = decideT1SkuRelabel({
    claim: "multi",
    codes: ["M010000000013991941", "M010000000009973294"],
    wis: ["WI52674273"],
  });
  assert(multi.verdict === "multi_need_mapping", `expected mapping, got ${multi.verdict}`);

  const unspecifiedMulti = decideT1SkuRelabel({
    claim: "unspecified",
    codes: ["M010000000013991941", "M010000000009973294"],
    wis: ["WI52674273"],
  });
  assert(unspecifiedMulti.verdict === "multi_need_mapping", "unspecified + 2 SKU → mapping");

  const required: RequirementInfoField[] = [
    { field: "异常单号", description: "", examples: [], required: true },
    { field: "SKU与入库单对应关系", description: "", examples: [], required: true },
  ];
  const optional: RequirementInfoField[] = [{ field: "辨识依据", description: "", examples: [], required: false }];
  const singleFields = applyT1RequiredInfo(required, optional, "single").map((item) => item.field);
  assert(!singleFields.includes("SKU与入库单对应关系"), "single drops 对应关系");
  const multiFields = applyT1RequiredInfo(required, optional, "multi").map((item) => item.field);
  assert(multiFields.includes("SKU与入库单对应关系") && multiFields.includes("辨识依据"), "multi requires mapping+辨识");

  const mocked = await checkT1SkuRelabelSafe({
    input,
    matchResult: sampleMatch(),
    contextFacts: ctx,
    deps: {
      queryMerchandiseByWi: async () => [
        { merchandiseCode: "SEID00GHAG", merchandiseSerno: "M010000000013991941" },
        { merchandiseCode: "SEID00GHAG", merchandiseSerno: "M010000000013991941-10X" },
      ],
    },
  });
  assert(mocked.verdict === "single_ok", `370734 fixture should be single_ok, got ${mocked.verdict}`);

  const otherScene = await checkT1SkuRelabelSafe({
    input,
    matchResult: { ...sampleMatch(), sceneKey: "inbound_photo_hold" },
    contextFacts: ctx,
    deps: { queryMerchandiseByWi: async () => [{ merchandiseCode: "A", merchandiseSerno: "B" }] },
  });
  assert(!otherScene.triggered, "non-T1 should not trigger");

  console.log("test-t1-sku-relabel-check unit: ok");
}

async function runLive(): Promise<void> {
  const input = sampleInput();
  const result = await checkT1SkuRelabelSafe({
    input,
    matchResult: sampleMatch(),
    contextFacts: sampleContext(input),
  });
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, "../_runs/20260917_t1_sku_relabel");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "live-370734.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`live verdict=${result.verdict} stems=${result.stems.join(",")} codes=${result.merchandiseCodes.join(",")}`);
  console.log(`wrote ${outDir}/live-370734.json`);
  assert(result.verdict === "single_ok" || result.verdict === "skip", `live unexpected ${result.verdict}`);
}

async function main(): Promise<void> {
  await runUnitTests();
  if (hasFlag("live")) await runLive();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
