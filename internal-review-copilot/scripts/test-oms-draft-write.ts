/**
 * Dry-run OMS draft write + hard intercept for vaOrderReview.
 *
 *   npx tsx internal-review-copilot/scripts/test-oms-draft-write.ts --local-only
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
  assessOmsWriteGuard,
  extractAiRequirementBackground,
  extractAiRequirementDescription,
  extractAiSummary,
  isHumanSopAlreadyFilled,
  isOmsWriteEnabled,
  isOmsWriteGuardReject,
  isOrderOnWriteAllowlist,
  isWritableOmsStatus,
  sceneCodeFromKey,
  stripAiSummary,
  writeDraft,
  resolveSceneOverviewCode,
} from "../lib/oms-draft-write.ts";
import { humanSopAlertText, isHumanSopFilledNotice } from "../lib/human-sop-alert.ts";
import { missingOmsSceneAlertText, needsOmsSceneConfirm } from "../lib/missing-oms-scene.ts";
import { supportedCardsMissingOmsSceneCode } from "../lib/scenario-cards.ts";
import { extractSopSections } from "../lib/sop-sections.ts";
import { assertNotReviewApi } from "../lib/oms-tom-client.ts";
import { extractWiNos, pickPutawayWiNos, shouldReplaceNweon } from "../lib/wi-numbers.ts";

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
  assert(
    pickPutawayWiNos(
      "异常单 EB0126091633083742 关联的原入库单 WI52039205 因包裹未贴条码无法上架，客户已创建新入库单 WI52674454。需上架至新入库单。使用新入库单 WI52674454 扫描上架。",
      ["WI52039205", "WI52674454"],
    ).join(",") === "WI52674454",
    "370947-like putaway is new WI only",
  );
  assert(
    pickPutawayWiNos(
      "里面的原入库单WI52039205 实际没有贴包裹条码，因此无法上架\n现在重新将异常下了一个新单：WI52674454",
    ).join(",") === "WI52674454",
    "customer wording 下了一个新单",
  );
  assert(
    pickPutawayWiNos("请把货物转到DE Warehouse，按原入库单 WI52461517 上架").join(",") === "WI52461517",
    "上架到原单 keeps original WI",
  );
  assert(pickPutawayWiNos("只需处理 WI52514524").join(",") === "WI52514524", "single WI");
  assert(shouldReplaceNweon("", ["WI52674454"]) === true, "empty nweon fills");
  assert(shouldReplaceNweon("WI52039205,WI52674454", ["WI52674454"]) === true, "collapse two WIs");
  assert(shouldReplaceNweon("WI52674454", ["WI52674454"]) === false, "same single WI stays");
  assert(shouldReplaceNweon("WI52461517", ["WI52461517"]) === false, "keep auditor single WI");
  console.log("local append/extract tests ok");

  const pending = { status: "WA", statusDesc: "待审核" };
  const waitingCustomer = { status: "WP", statusDesc: "待客户确认" };
  const emptyAtom = { sop: "" };
  assert(isWritableOmsStatus(pending, emptyAtom), "WA/待审核 可写");
  assert(!isWritableOmsStatus(waitingCustomer, emptyAtom), "待客户确认 不可写");
  assert(!isWritableOmsStatus({}, emptyAtom), "无状态 fail-closed");
  const statusBlock = assessOmsWriteGuard({
    header: waitingCustomer,
    atom: { sop: "" },
    plannedSop: "1. 找货\n2. 上架",
  });
  assert(!statusBlock.ok && statusBlock.skipped === "status_not_writable", "待客户确认拦截");
  assert(statusBlock.ok === false && statusBlock.error.includes("待客户确认"), "错误信息带当前状态");
  const sopBlock = assessOmsWriteGuard({
    header: pending,
    atom: { sop: "仓库操作步骤：\n1、按异常单找到包裹\n2、补贴标签后上架" },
    plannedSop: "1. 定位包裹\n2. 补贴包裹标签\n3. 上架",
  });
  assert(!sopBlock.ok && sopBlock.skipped === "sop_already_filled", "人工 SOP 禁止覆盖");
  const sameSop = assessOmsWriteGuard({
    header: pending,
    atom: { sop: "1. 定位包裹\n2. 补贴包裹标签\n3. 上架" },
    plannedSop: "1. 定位包裹\n2. 补贴包裹标签\n3. 上架",
  });
  assert(sameSop.ok, "相同 SOP 允许幂等写入");
  const emptySop = assessOmsWriteGuard({
    header: pending,
    atom: { sop: "" },
    plannedSop: "1. 定位包裹\n2. 补贴包裹标签",
  });
  assert(emptySop.ok, "空 SOP 允许写入");
  const auditBlock = assessOmsWriteGuard({
    header: { status: "WA", statusDesc: "待审核", isAuditThrough: "Y" },
    atom: { sop: "" },
    plannedSop: "1. 定位包裹\n2. 上架",
  });
  assert(!auditBlock.ok && auditBlock.skipped === "audit_info_filled", "isAuditThrough=Y 拦截");
  assert(auditBlock.ok === false && auditBlock.error.includes("isAuditThrough"), "错误信息带审核字段名");
  const pendingEmptyAudit = assessOmsWriteGuard({
    header: { status: "WA", statusDesc: "待审核", isAuditThrough: "" },
    atom: { sop: "" },
    plannedSop: "1. 定位包裹\n2. 上架",
  });
  assert(pendingEmptyAudit.ok, "待审核且 isAuditThrough 为空允许写入");
  const remarkBlock = assessOmsWriteGuard({
    header: { status: "WA", statusDesc: "待审核", isAuditThrough: "" },
    atom: { sop: "", auditRemark: "已人工审核" },
    plannedSop: "1. 定位包裹\n2. 上架",
  });
  assert(!remarkBlock.ok && remarkBlock.skipped === "audit_info_filled", "atom.auditRemark 非空拦截");
  assert(
    isOmsWriteGuardReject({ skipped: ["vaOrderReview", "status_not_writable"] }),
    "guard skip 识别",
  );
  assert(
    isOmsWriteGuardReject({ skipped: ["vaOrderReview", "audit_info_filled"] }),
    "audit_info_filled 识别",
  );
  assert(!isOmsWriteGuardReject({ skipped: ["vaOrderReview", "updateAtomDetails"] }), "普通 skip 不是 guard");
  assert(
    isHumanSopAlreadyFilled({ skipped: ["sop_already_filled"], error: "OMS 操作 SOP 字段已有内容（非 AI 生成），禁止覆盖审核员手动填写的 SOP。" }),
    "skipped sop_already_filled",
  );
  assert(
    isHumanSopAlreadyFilled({ skipped: [], error: "OMS 操作 SOP 字段已有内容（非 AI 生成），禁止覆盖审核员手动填写的 SOP。" }),
    "error text 非 AI 生成",
  );
  assert(!isHumanSopAlreadyFilled({ skipped: ["status_not_writable"], error: "订单状态为「待客户确认」" }), "其它门禁不走私聊");
  assert(isHumanSopFilledNotice("OMS 操作 SOP 字段已有内容（非 AI 生成）"), "notice 文案");
  const dm = humanSopAlertText({
    vascNo: "VASC000000370947",
    customer: "测试客户",
    warehouse: "DE Warehouse",
    error: "OMS 操作 SOP 字段已有内容（非 AI 生成），禁止覆盖审核员手动填写的 SOP。",
    ownerOpenId: "ou_owner_jinying",
  });
  assert(dm.includes("<at id=ou_owner_jinying></at>"), "私聊艾特金萤");
  assert(dm.includes("VASC000000370947"), "私聊带单号");
  assert(!dm.includes("耿文文") && !dm.includes("李颖"), "私聊不艾特业务方");
  assert(dm.includes("未在【增值】异常沟通新建话题"), "说明没建群话题");

  const reshelve = resolveSceneOverviewCode("inbound_reshelve_change_wi_keep_sku");
  assert(reshelve.missing && !reshelve.code, "换入库单重新上架没有 OMS 码");
  const f001 = resolveSceneOverviewCode("inbound_label_identify");
  assert(!f001.missing && Boolean(f001.code), "F-001 有 OMS 码");
  assert(resolveSceneOverviewCode("").missing, "空 sceneKey 视为缺码");
  assert(resolveSceneOverviewCode("unsupported").missing, "unsupported 视为缺码");
  let threw = false;
  try {
    sceneCodeFromKey("inbound_reshelve_change_wi_keep_sku");
  } catch {
    threw = true;
  }
  assert(threw, "旧 sceneCodeFromKey 对缺码仍抛错（调用方应改用 resolve）");
  assert(needsOmsSceneConfirm({ sceneKey: "inbound_reshelve_change_wi_keep_sku", outputPath: "sop_generated" }), "缺码要确认");
  assert(
    !needsOmsSceneConfirm({ sceneKey: "inbound_label_identify", outputPath: "sop_generated" }),
    "有码不用确认",
  );
  assert(
    needsOmsSceneConfirm({ sceneKey: "", decision: "unsupported", outputPath: "sop_generated", riskFlags: ["unmatched_scene_sop"] }),
    "未匹配场景要确认",
  );
  assert(
    !needsOmsSceneConfirm({
      sceneKey: "",
      decision: "unsupported",
      outputPath: "sop_generated",
      riskFlags: ["unmatched_scene_sop", "outbound_unmatched_leave_empty"],
      businessTypeDesc: "出库订单",
    }),
    "出库对不上不找人补下拉",
  );
  assert(
    !needsOmsSceneConfirm({ sceneKey: "outbound_standard_intercept", outputPath: "sop_generated" }),
    "出库无码卡也不找人补下拉",
  );
  const missDm = missingOmsSceneAlertText({
    vascNo: "VASC000000374793",
    sceneKey: "inbound_reshelve_change_wi_keep_sku",
    ownerOpenId: "ou_owner_jinying",
  });
  assert(missDm.includes("<at id=ou_owner_jinying></at>"), "缺码私聊艾特金萤");
  assert(missDm.includes("不选场景概述"), "缺码说明不选下拉");
  assert(supportedCardsMissingOmsSceneCode().some((c) => c.sceneKey === "inbound_reshelve_change_wi_keep_sku"), "缺码清单含换入库单");
  console.log("oms write guard tests ok");

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

  if (hasFlag("local-only")) return;

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
  if (!result.success && isOmsWriteGuardReject(result)) {
    console.log("oms write guard rejected (expected if order is not 待审核 or SOP already filled)");
    return;
  }
  if (!result.success) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
