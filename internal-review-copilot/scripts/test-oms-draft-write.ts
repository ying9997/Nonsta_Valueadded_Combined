/**
 * Dry-run OMS draft write + hard intercept for vaOrderReview.
 *
 *   npx tsx internal-review-copilot/scripts/test-oms-draft-write.ts --order VASC000000360654
 *   npx tsx internal-review-copilot/scripts/test-oms-draft-write.ts --order VASC000000360654 --ai-summary "测试总结"
 *   npx tsx internal-review-copilot/scripts/test-oms-draft-write.ts --order VASC000000360654 --from-store
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { asArray, asRecord } from "../lib/oms-adapter.ts";
import {
  appendAiSummary,
  extractAiRequirementBackground,
  extractAiRequirementDescription,
  extractAiSummary,
  extractWiNos,
  isOmsWriteEnabled,
  isOrderOnWriteAllowlist,
  sceneCodeFromKey,
  stripAiSummary,
  writeDraft,
} from "../lib/oms-draft-write.ts";
import { extractSopSections } from "../lib/sop-sections.ts";
import { assertNotReviewApi } from "../lib/oms-tom-client.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function localAppendTests(): void {
  const original = "麻烦扫描外箱条码直接按新单上架的 新单：WI52512121";
  const summary =
    "异常单 EB0126082832573118 关联的入库单 WI51757326 因包裹条码批量异常（B01E1615/B0102E21）无法正常上架，客户已确认该批次为海运整柜 100% A+/A 级包裹，申请按新入库单 WI52512121 直接上架处理。";
  const once = appendAiSummary(original, summary);
  assert(once.startsWith(original), "追加不得改原文");
  assert(once.includes("\n\n【AI总结】"), "必须带【AI总结】前缀");
  assert(once.endsWith(summary), "总结在末尾");
  assert(appendAiSummary(original, "") === original, "空总结不追加");
  assert(appendAiSummary(once, summary) === once, "重复写入不得叠两段【AI总结】");
  assert(stripAiSummary(once) === original, "strip 回到原文");

  const fromBg = extractAiSummary({
    aiGeneratedText: `【需求背景】\n${summary}\n\n【操作要求】\n1. 扫描外箱`,
  });
  assert(fromBg === summary, "从【需求背景】抽取");
  assert(extractAiSummary({ aiGeneratedText: "" }) === "", "无总结返回空");
  assert(
    extractAiRequirementDescription({
      aiGeneratedText: `【需求描述】\n按新单上架。\n\n【需求背景】\n${summary}\n\n【操作要求】\n1. 扫描`,
    }) === "按新单上架。",
    "extract 需求描述",
  );
  assert(
    extractAiRequirementBackground({
      aiGeneratedText: `【需求背景】\n${summary}\n\n【操作要求】\n1. 扫描外箱`,
    }) === summary,
    "extract 需求背景",
  );
  const split = extractSopSections({
    aiGeneratedText: `【需求背景】\n${summary}\n\n【操作要求】\n1. 扫描外箱`,
  });
  assert(!split.operationSteps.includes("需求背景"), "操作步骤不含需求背景");
  assert(extractWiNos("新单 WI52514524 旧单 wi52242392").join(",") === "WI52514524,WI52242392", "extract WI");
  assert(extractWiNos("无入库单").length === 0, "no WI");
  console.log("local append/extract tests ok");

  const prevAllow = process.env.OMS_WRITE_ALLOWLIST;
  process.env.OMS_WRITE_ALLOWLIST = "*";
  assert(isOrderOnWriteAllowlist("VASC000000399999"), "allowlist * allows any order");
  process.env.OMS_WRITE_ALLOWLIST = "VASC000000360654";
  assert(isOrderOnWriteAllowlist("VASC000000360654"), "exact allowlist match");
  assert(!isOrderOnWriteAllowlist("VASC000000399999"), "exact allowlist rejects others");
  if (prevAllow == null) delete process.env.OMS_WRITE_ALLOWLIST;
  else process.env.OMS_WRITE_ALLOWLIST = prevAllow;
  console.log("allowlist * tests ok");
}

function storeRecord(orderNo: string, storePath: string): { aiGeneratedText?: string; llmSop?: unknown } | null {
  if (!existsSync(storePath)) return null;
  const raw = asRecord(JSON.parse(readFileSync(storePath, "utf8")));
  return asArray(raw.cases || raw).map(asRecord).find((item) => String(item.vascNo || "") === orderNo) || null;
}

async function main(): Promise<void> {
  loadEnvFiles();
  localAppendTests();

  let intercepted = false;
  try {
    assertNotReviewApi("oms.VaOrderService_vaOrderReview");
  } catch {
    intercepted = true;
  }
  if (!intercepted) throw new Error("vaOrderReview 拦截未生效");

  const orderNo = arg("order", "VASC000000315774");
  const sceneKey = arg("scene", orderNo === "VASC000000360654" ? "inbound_aplus_direct_shelve" : "inbound_package_barcode_batch_relabel");
  const outDir = resolve(projectDir(), "_runs/20260909_demo_e2e/card-test");
  mkdirSync(outDir, { recursive: true });
  const storePath = resolve(outDir, "case-store.json");
  const storeRec = hasFlag("from-store") || orderNo === "VASC000000360654" ? storeRecord(orderNo, storePath) : null;
  const sections = extractSopSections(storeRec || {});
  const aiSummary = arg("ai-summary") || sections.requirementDescription;
  const aiBg = arg("ai-background") || sections.requirementBackground;
  const sop = arg("sop") || (sections.operationSteps && !/【需求背景】/.test(sections.operationSteps)
    ? sections.operationSteps
    : "1. 定位包裹\n2. 补贴包裹标签\n3. 上架\n4. 关闭异常单");

  const result = await writeDraft({
    orderNo,
    sceneOverviewCode: sceneCodeFromKey(sceneKey),
    sop,
    aiRequirementDescription: aiSummary,
    aiRequirementBackground: aiBg,
    dryRun: true,
  });

  const report = {
    interceptedVaOrderReview: intercepted,
    omsWriteEnabled: isOmsWriteEnabled(),
    aiSummary,
    aiBackground: aiBg,
    currentRequirementDescription: result.readBack?.requirementDescription || "",
    plannedRequirementDescription: result.readBack?.plannedRequirementDescription || "",
    plannedRequirementBackground: result.readBack?.plannedRequirementBackground || "",
    plannedSop: result.readBack?.plannedSop || "",
    result,
  };
  const out = resolve(outDir, `${orderNo}.oms-dry-run.json`);
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: result.success, out, ...report }, null, 2));
  if (!result.success) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
