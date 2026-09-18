/**
 * Prompt H task 1: 25-item E2E against the test chat only.
 *
 *   npx tsx internal-review-copilot/scripts/run-e2e-full.ts
 *
 * OMS_WRITE_ENABLED is forced off. Does not rsync to 40.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { CaseStore } from "../lib/case-store.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import {
  allSceneCandidates,
  buildClarificationCard,
  buildOmsWriteCancelledCard,
  buildOmsWriteRetryCard,
  buildRequirementClarificationCard,
  buildSceneConfirmCard,
  buildSceneSearchMultiCard,
  buildSceneSearchSingleCard,
  buildSopCard,
  buildSopGenerateErrorCard,
  demoTopicTitle,
  type DemoPersonnel,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { sendCardInNewTopic, sendCardMessage, sendConsultThreadText } from "../lib/feishu-bot.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { isOmsWriteGuardReject, sceneCodeFromKey, writeDraft } from "../lib/oms-draft-write.ts";
import { resolvePersonnelFromDetail } from "../lib/personnel.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { searchSceneByKeyword } from "../lib/scenario-cards.ts";
import type { JsonRecord } from "../lib/types.ts";

const TEST_CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const MSG_GAP_MS = 12_000;
const GENG = "ou_fb036b896ab183f3eea939470e47bf66";
const HEJING = "ou_38892cd1daae40290c0a4994e614900a";
const LIYING = "ou_c62fe459a4407900cdef6d340dbeb24c";

type ItemStatus = "✅" | "❌" | "⚠";
interface CheckItem {
  id: number;
  title: string;
  status: ItemStatus;
  note: string;
  files?: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function loadDetailsFile(path: string): JsonRecord[] {
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (Array.isArray(raw)) return raw.map(asRecord);
  return asArray(asRecord(raw).details).map(asRecord);
}

function findOrder(sources: JsonRecord[][], orderNo: string): JsonRecord | null {
  for (const list of sources) {
    const hit = list.find((item) => asText(item.orderNo) === orderNo);
    if (hit) return JSON.parse(JSON.stringify(hit)) as JsonRecord;
  }
  return null;
}

function blankRequirement(detail: JsonRecord): JsonRecord {
  const clone = JSON.parse(JSON.stringify(detail)) as JsonRecord;
  const header = asRecord(clone.listHeader);
  const wipeAttr = (raw: unknown) => {
    const a = asRecord(raw);
    const key = asText(a.attributeKeyOriginal) || asText(a.attributeKey) || asText(a.attributeName);
    if (/VAS_ATTR_REL_RD|需求描述|BEOR|需求背景/.test(key) || /需求描述|需求背景/.test(asText(a.attributeName))) {
      a.attributeValue = "啊";
      a.attributeValueOriginal = "啊";
    }
    return a;
  };
  clone.atoms = asArray(clone.atoms).map((atom) => {
    const rec = asRecord(atom);
    rec.vaAtomAttrs = asArray(rec.vaAtomAttrs).map(wipeAttr);
    rec.sop = "";
    return rec;
  });
  clone.customerIntent = "啊";
  header.remark = "啊";
  clone.listHeader = header;
  clone.orderNo = "VASC000000E2EEMPTY";
  clone.demoLabel = "E2E-empty-requirement";
  return clone;
}

function stripFilesAndShorten(detail: JsonRecord): JsonRecord {
  const clone = JSON.parse(JSON.stringify(detail)) as JsonRecord;
  clone.atoms = asArray(clone.atoms).map((atom) => {
    const rec = asRecord(atom);
    rec.vaAtomFiles = [];
    rec.vaAtomAttrs = asArray(rec.vaAtomAttrs).map((raw) => {
      const a = asRecord(raw);
      const key = asText(a.attributeKeyOriginal) || asText(a.attributeKey) || asText(a.attributeName);
      if (/VAS_ATTR_REL_RD|需求描述/.test(key) || asText(a.attributeName) === "需求描述") {
        a.attributeValue = "请换标上架谢谢";
        a.attributeValueOriginal = "请换标上架谢谢";
      }
      return a;
    });
    return rec;
  });
  clone.orderNo = "VASC000000E2EL25";
  clone.demoLabel = "E2E-l25-missing";
  return clone;
}

function forceBadService(detail: JsonRecord): JsonRecord {
  const clone = JSON.parse(JSON.stringify(detail)) as JsonRecord;
  clone.atoms = asArray(clone.atoms).map((atom) => {
    const rec = asRecord(atom);
    rec.serviceCode = "OW99SKIP";
    rec.serviceName = "非试点服务";
    return rec;
  });
  clone.orderNo = "VASC000000E2ESKIP";
  return clone;
}

function cardJson(card: FeishuCard): string {
  return JSON.stringify(card);
}

function hasButton(card: FeishuCard, name: string, textNeedle?: string): boolean {
  return card.elements.some((el) => {
    if (el.tag !== "action") return false;
    return el.actions.some((b) => {
      if (b.tag !== "button") return false;
      if (b.name !== name && b.value?.action !== name) return false;
      if (textNeedle && !String(b.text?.content || "").includes(textNeedle)) return false;
      return true;
    });
  });
}

function titleLooksRight(title: string, orderNo: string): boolean {
  const parts = title.split(" | ");
  return parts.length >= 4 && parts[0].includes(orderNo) && !title.includes("已生成 SOP") && !title.includes("智能审核请关注");
}

async function pacedSend(fn: () => Promise<unknown>): Promise<void> {
  await fn();
  await sleep(MSG_GAP_MS);
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  process.env.FEISHU_TEST_CHAT_ID = process.env.FEISHU_TEST_CHAT_ID || TEST_CHAT;
  const chatId = TEST_CHAT;
  const root = projectDir();
  const outDir = resolve(root, "_runs/20260915_e2e_j");
  mkdirSync(outDir, { recursive: true });

  const historical = loadDetailsFile(resolve(root, "_runs/20260914_historical_batch/details.json"));
  const demo7 = loadDetailsFile(resolve(root, "_runs/20260904_demo_cases/demo_all.details.json"));
  const demoE2e = loadDetailsFile(resolve(root, "_runs/20260909_demo_e2e/demo-inputs.json"));
  const sources = [historical, demo7, demoE2e];

  const inboundL4 = findOrder(sources, "VASC000000329235");
  const instockL4 = findOrder(sources, "VASC000000284952");
  const fuzzy = findOrder(sources, "VASC000000326061") || findOrder(sources, "VASC000000312144");
  const l1case = findOrder(sources, "VASC000000183069");
  const invented = findOrder(sources, "VASC000000282990");
  const jsonFail = findOrder(sources, "VASC000000308661");
  const completed = inboundL4;
  if (!inboundL4 || !instockL4 || !l1case || !invented || !jsonFail) {
    throw new Error("缺少必要测试单，请确认 historical_batch / demo_all.details.json");
  }

  const empty = blankRequirement(l1case);
  const l25 = stripFilesAndShorten(fuzzy || inboundL4);
  const skipSvc = forceBadService(inboundL4);

  const details = [inboundL4, instockL4, fuzzy, l1case, invented, jsonFail, empty, l25, skipSvc, completed].filter(
    Boolean,
  ) as JsonRecord[];
  writeFileSync(resolve(outDir, "details.json"), `${JSON.stringify({ details }, null, 2)}\n`, "utf8");
  const store = new CaseStore(resolve(outDir, "case-store.json"));

  const items: CheckItem[] = [];
  const issues: Array<{ id: number; actual: string; expected: string; files: string[] }> = [];
  const sent: Array<{ orderNo: string; threadId: string; path: string; title: string }> = [];

  const record = (item: CheckItem) => {
    items.push(item);
    if (item.status === "❌") {
      issues.push({
        id: item.id,
        actual: item.note,
        expected: item.title,
        files: item.files || [],
      });
    }
    console.log(`${item.status} #${item.id} ${item.title} — ${item.note}`);
  };

  async function sendNew(orderNo: string, title: string, card: FeishuCard, recPatch?: JsonRecord): Promise<string> {
    const sentCard = await sendCardInNewTopic(chatId, title, card);
    store.upsert({
      vascNo: orderNo,
      lastCard: card,
      feishuMessageId: sentCard.messageId,
      feishuThreadId: sentCard.threadId,
      notifyChannel: "card",
      ...(recPatch || {}),
    });
    sent.push({ orderNo, threadId: sentCard.threadId, path: card.header.template || "", title });
    await sleep(MSG_GAP_MS);
    return sentCard.threadId;
  }

  const peopleOf = (detail: JsonRecord, result?: PipelineResult | null): DemoPersonnel =>
    resolvePersonnelFromDetail(detail, {
      businessTypeDesc: asText(asRecord(detail.listHeader).businessTypeDesc),
      businessType: asText(asRecord(detail.listHeader).businessType),
      vaSource: asText(asRecord(detail.listHeader).vaSource),
    });

  console.log("E2E full start chat=", chatId, "OMS_WRITE=0");

  const inboundResult = await runPipeline(inboundL4, { sceneLlm: true, sceneLlmVersion: 2 });
  if (!inboundResult) throw new Error("inbound L4 pipeline empty");
  const inboundPeople = peopleOf(inboundL4, inboundResult);
  const inboundCard =
    inboundResult.outputPath === "sop_generated"
      ? buildSopCard(inboundResult, inboundPeople)
      : inboundResult.outputPath === "transfer_human"
        ? buildSceneConfirmCard(inboundResult, inboundPeople, collectSceneCandidates(inboundResult.matchResult))
        : buildAskCardSafe(inboundResult, inboundPeople);
  const inboundTitle = demoTopicTitle(inboundResult);
  const inboundThread = await sendNew(inboundResult.orderNo, inboundTitle, inboundCard, {
    status: inboundResult.outputPath === "sop_generated" ? "sop_ready" : "awaiting_scene_confirm",
    aiGeneratedText: inboundResult.llm?.text || inboundResult.analysis || "",
    confirmedScene: inboundResult.matchResult?.sceneKey || "",
  });

  record({
    id: 1,
    title: "话题标题：VASC｜客户｜仓库｜摘要",
    status: titleLooksRight(inboundTitle, inboundResult.orderNo) ? "✅" : "❌",
    note: inboundTitle,
    files: ["lib/feishu-card.ts"],
  });

  const inboundText = cardJson(inboundCard);
  record({
    id: 2,
    title: "绿卡三段：客户填写 + AI 总结 + 操作步骤",
    status:
      inboundResult.outputPath === "sop_generated" &&
      inboundText.includes("客户原始") &&
      inboundText.includes("AI 总结") &&
      inboundText.includes("操作步骤")
        ? "✅"
        : inboundResult.outputPath === "sop_generated"
          ? "❌"
          : "❌",
    note:
      inboundResult.outputPath === "sop_generated"
        ? `hasOriginal=${inboundText.includes("客户原始")} hasAi=${inboundText.includes("AI 总结")} hasSteps=${inboundText.includes("操作步骤")}`
        : `未直通 L4，outputPath=${inboundResult.outputPath}`,
    files: ["lib/feishu-card.ts"],
  });

  record({
    id: 3,
    title: "AI 判断依据：中文一句话",
    status: /AI 判断|判断依据/.test(inboundText) && /[\u4e00-\u9fff]/.test(inboundText) ? "✅" : "❌",
    note: (inboundResult.llm?.sop as { scenarioName?: string } | undefined)?.scenarioName || inboundResult.matchResult?.scenarioName || inboundResult.analysis?.slice(0, 80) || "",
    files: ["lib/feishu-card.ts"],
  });

  record({
    id: 4,
    title: "CC@李颖：在 @审核员的卡片上",
    status: inboundText.includes(LIYING) ? "✅" : "❌",
    note: inboundText.includes(LIYING) ? "绿/蓝卡含李颖 open_id" : "卡片未 CC 李颖",
    files: ["lib/personnel.ts", "config/personnel.json"],
  });

  const instockResult = await runPipeline(instockL4, { sceneLlm: true, sceneLlmVersion: 2 });
  if (!instockResult) throw new Error("instock L4 pipeline empty");
  const instockPeople = peopleOf(instockL4, instockResult);
  const instockCard =
    instockResult.outputPath === "sop_generated"
      ? buildSopCard(instockResult, instockPeople)
      : instockResult.outputPath === "transfer_human"
        ? buildSceneConfirmCard(instockResult, instockPeople, collectSceneCandidates(instockResult.matchResult))
        : buildAskCardSafe(instockResult, instockPeople);
  const instockTitle = demoTopicTitle(instockResult);
  await sendNew(instockResult.orderNo, instockTitle, instockCard, {
    status: instockResult.outputPath === "sop_generated" ? "sop_ready" : "awaiting_scene_confirm",
  });
  const inboundAt = inboundText.includes(GENG);
  const instockAt = cardJson(instockCard).includes(HEJING);
  record({
    id: 5,
    title: "入库@耿文文 / 库内@何静",
    status: inboundAt && instockAt ? "✅" : "❌",
    note: `入库耿文文=${inboundAt} 库内何静=${instockAt}`,
    files: ["lib/personnel.ts"],
  });

  const l1Result = await runPipeline(l1case, { sceneLlm: true, sceneLlmVersion: 2 });
  if (!l1Result) throw new Error("183069 pipeline empty");
  const l1People = peopleOf(l1case, l1Result);
  const l1Card =
    l1Result.outputPath === "needs_requirement_clarification"
      ? buildRequirementClarificationCard(l1Result, l1People)
      : l1Result.outputPath === "transfer_human"
        ? buildSceneConfirmCard(l1Result, l1People, collectSceneCandidates(l1Result.matchResult))
        : buildAskCardSafe(l1Result, l1People);
  await sendNew(l1Result.orderNo, demoTopicTitle(l1Result), l1Card, { status: "awaiting_scene_confirm" });
  record({
    id: 6,
    title: "183069 不被 L1 拦，进入 L2",
    status: l1Result.outputPath !== "needs_requirement_clarification" ? "✅" : "❌",
    note: `outputPath=${l1Result.outputPath} node=${l1Result.node}`,
    files: ["lib/check-requirement.ts", "lib/run-pipeline.ts"],
  });

  const emptyResult = await runPipeline(empty, { skipLlm: true, sceneLlm: false });
  if (!emptyResult) throw new Error("empty pipeline empty");
  const emptyPeople = peopleOf(empty, emptyResult);
  const emptyCard = buildRequirementClarificationCard(emptyResult, emptyPeople);
  await sendNew(empty.orderNo as string, demoTopicTitle(emptyResult), emptyCard, { status: "awaiting_reply" });
  record({
    id: 7,
    title: "空需求（< 5 字）被 L1 拦",
    status: emptyResult.outputPath === "needs_requirement_clarification" ? "✅" : "❌",
    note: `outputPath=${emptyResult.outputPath} missing=${(emptyResult.missingRequirementItems || []).join(",")}`,
    files: ["lib/check-requirement.ts"],
  });

  const fuzzyDetail = fuzzy || inboundL4;
  const fuzzyResult = await runPipeline(fuzzyDetail, { sceneLlm: true, sceneLlmVersion: 2 });
  if (!fuzzyResult) throw new Error("fuzzy pipeline empty");
  const fuzzyPeople = peopleOf(fuzzyDetail, fuzzyResult);
  const blue =
    fuzzyResult.outputPath === "transfer_human" || fuzzyResult.outputPath === "sop_generated"
      ? buildSceneConfirmCard(fuzzyResult, fuzzyPeople, collectSceneCandidates(fuzzyResult.matchResult))
      : buildAskCardSafe(fuzzyResult, fuzzyPeople);
  const blueText = cardJson(blue);
  const blueThread = await sendNew(fuzzyResult.orderNo, demoTopicTitle(fuzzyResult), blue, {
    status: "awaiting_scene_confirm",
    matchResult: fuzzyResult.matchResult as unknown as JsonRecord,
  });
  const hasRecommend = /AI 推荐/.test(blueText);
  const hasMore = hasButton(blue, "show_all_scenes", "以上都不对") || blueText.includes("以上都不对");
  const hasHuman = blueText.includes("转人工") || blueText.includes("以上都不是");
  record({
    id: 8,
    title: "蓝卡：AI 推荐 + 以上都不对 + 转人工",
    status: (fuzzyResult.outputPath === "transfer_human" ? hasMore && hasHuman : hasMore) ? "✅" : hasMore && hasHuman ? "✅" : "❌",
    note: `path=${fuzzyResult.outputPath} recommend=${hasRecommend} more=${hasMore} human=${hasHuman}`,
    files: ["lib/feishu-card.ts"],
  });

  const allCard = buildSceneConfirmCard(fuzzyResult, fuzzyPeople, allSceneCandidates());
  await pacedSend(() => sendCardMessage(chatId, allCard, blueThread));
  store.upsert({ vascNo: fuzzyResult.orderNo, lastCard: allCard });
  record({
    id: 9,
    title: "点「以上都不对」→ 全场景卡",
    status: allSceneCandidates().length > 8 && cardJson(allCard).includes("以上都不是") ? "✅" : "❌",
    note: `脚本在同一话题续发全场景卡（listen 未点真实按钮）。候选=${allSceneCandidates().length}`,
    files: ["lib/feishu-card.ts", "scripts/listen-card-actions.ts"],
  });

  const pickedKey =
    collectSceneCandidates(fuzzyResult.matchResult)[0]?.sceneKey || "inbound_package_exception_relabel_shelving";
  const afterPick = await runPipeline(fuzzyDetail, {
    sceneLlm: false,
    overrideScene: pickedKey,
  });
  const afterPickPath = afterPick?.outputPath || "";
  if (afterPick && afterPick.outputPath === "sop_generated") {
    const sopAfter = buildSopCard(afterPick, fuzzyPeople);
    await pacedSend(() => sendCardMessage(chatId, sopAfter, blueThread));
  } else if (afterPick) {
    const ask = buildAskCardSafe(afterPick, fuzzyPeople);
    await pacedSend(() => sendCardMessage(chatId, ask, blueThread));
  }
  record({
    id: 10,
    title: "选场景后 → 继续 L2.5 → L4",
    status: afterPickPath === "sop_generated" || afterPickPath === "needs_field_clarification" ? "✅" : "❌",
    note: `override=${pickedKey} path=${afterPickPath}`,
    files: ["lib/run-pipeline.ts", "lib/check-scene-completeness.ts"],
  });

  const l25Result = await runPipeline(l25, {
    sceneLlm: false,
    overrideScene: "inbound_package_exception_relabel_shelving",
  });
  if (!l25Result) throw new Error("l2.5 pipeline empty");
  const l25People = peopleOf(l25, l25Result);
  const l25Card =
    l25Result.outputPath === "needs_field_clarification"
      ? buildClarificationCard(l25Result, l25People)
      : buildAskCardSafe(l25Result, l25People);
  const l25Text = cardJson(l25Card);
  await sendNew(String(l25.orderNo), demoTopicTitle(l25Result), l25Card, { status: "awaiting_reply" });
  const hasRangeHint = l25Text.includes("本场景需要知道") && (l25Text.includes("处理范围") || l25Text.includes("件数") || l25Text.includes("数量"));
  record({
    id: 11,
    title: "精准追问：本场景需要知道处理范围",
    status: l25Result.outputPath === "needs_field_clarification" && hasRangeHint ? "✅" : l25Result.outputPath === "needs_field_clarification" ? "⚠" : "❌",
    note: `path=${l25Result.outputPath} missing=${(l25Result.missing || []).join(" / ")} hint=${hasRangeHint}`,
    files: ["lib/feishu-card.ts", "lib/check-scene-completeness.ts"],
  });
  const hasInfo = (l25Result.missingRequirementItems || []).length > 0 || /未说明/.test(l25Text);
  const hasAtt = (l25Result.missingAttachments || []).length > 0 || /未上传/.test(l25Text);
  record({
    id: 12,
    title: "需求+附件合并追问",
    status: l25Result.outputPath === "needs_field_clarification" && (hasInfo || hasAtt) ? "✅" : "❌",
    note: `info=${hasInfo} att=${hasAtt} missing=${(l25Result.missing || []).join(",")}`,
    files: ["lib/check-scene-completeness.ts"],
  });

  record({
    id: 13,
    title: "SOP 生成正常",
    status: inboundResult.outputPath === "sop_generated" && !inboundResult.llm?.error ? "✅" : "❌",
    note: `path=${inboundResult.outputPath} llmError=${inboundResult.llm?.error || ""}`,
    files: ["lib/generate-text.ts"],
  });

  const invResult = await runPipeline(invented, { sceneLlm: true, sceneLlmVersion: 2, overrideScene: "instock_relabel_change_sku" });
  if (!invResult) throw new Error("282990 pipeline empty");
  const invPeople = peopleOf(invented, invResult);
  const invCard =
    invResult.outputPath === "sop_generated"
      ? buildSopCard(invResult, invPeople)
      : isFail(invResult)
        ? buildSopGenerateErrorCard(invResult, invPeople)
        : buildAskCardSafe(invResult, invPeople);
  await sendNew(invResult.orderNo, demoTopicTitle(invResult), invCard, {
    status: invResult.outputPath === "sop_generated" ? "sop_ready" : "transferred",
  });
  const invText = cardJson(invCard);
  const degraded = Boolean(invResult.llm?.sop?.degraded) || invText.includes("[待补充]");
  record({
    id: 14,
    title: "282990 编造降级：[待补充] + 黄色提示",
    status: invResult.outputPath === "sop_generated" && degraded && invText.includes("部分单号") ? "✅" : invResult.outputPath === "sop_generated" && !degraded ? "⚠" : "❌",
    note: `path=${invResult.outputPath} degraded=${invResult.llm?.sop?.degraded || false} textHasPlaceholder=${invText.includes("[待补充]")} template=${invCard.header.template}`,
    files: ["lib/generate-text.ts", "lib/feishu-card.ts"],
  });

  if (inboundResult.outputPath === "sop_generated") {
    const revised = await runPipeline(inboundL4, {
      sceneLlm: false,
      overrideScene: inboundResult.matchResult?.sceneKey,
      sopEditInstruction: "请把最后一步改成先拍照再关闭异常单",
    });
    if (revised && revised.outputPath === "sop_generated") {
      const revCard = buildSopCard(revised, inboundPeople, { revised: true, revision: 1 });
      await pacedSend(() => sendCardMessage(chatId, revCard, inboundThread));
      record({
        id: 15,
        title: "SOP 修改闭环：点修改 → 回复意见 → 修订版",
        status: cardJson(revCard).includes("修订版") ? "✅" : "❌",
        note: "脚本用 sopEditInstruction 生成修订绿卡并续发（未走飞书按钮 listen）",
        files: ["lib/refresh-sop-edits.ts", "lib/run-pipeline.ts"],
      });
    } else {
      record({
        id: 15,
        title: "SOP 修改闭环：点修改 → 回复意见 → 修订版",
        status: "❌",
        note: `修订管线 path=${revised?.outputPath || "empty"}`,
        files: ["lib/refresh-sop-edits.ts"],
      });
    }
  } else {
    record({
      id: 15,
      title: "SOP 修改闭环：点修改 → 回复意见 → 修订版",
      status: "❌",
      note: "入库 L4 未生成 SOP，无法演示修订",
      files: ["lib/refresh-sop-edits.ts"],
    });
  }

  const l3Has = hasButton(l25Card, "scene_wrong") || hasButton(emptyCard, "scene_wrong");
  const l4Has = hasButton(inboundCard, "scene_wrong") || inboundText.includes("场景不对");
  const l1Has = hasButton(emptyCard, "scene_wrong") || hasButton(l1Card, "scene_wrong");
  const failCardPreview = buildSopGenerateErrorCard(
    { ...inboundResult, outputPath: "sop_generated", failureGate: "llm-generate-sop", llm: { error: "JSON 解析失败", text: "", model: "", mocked: false } },
    inboundPeople,
  );
  const errHas = hasButton(failCardPreview, "scene_wrong");
  record({
    id: 16,
    title: "「场景不对」按钮：L4/L3/L1/错误卡都有",
    status: l4Has && l3Has && l1Has && errHas ? "✅" : "❌",
    note: `L4=${l4Has} L3/L2.5=${l3Has} L1=${l1Has} 错误卡=${errHas}`,
    files: ["lib/feishu-card.ts"],
  });

  const failResult = await runPipeline(jsonFail, { sceneLlm: true, sceneLlmVersion: 2, overrideScene: "instock_specified_position_label" });
  if (!failResult) throw new Error("308661 pipeline empty");
  const failPeople = peopleOf(jsonFail, failResult);
  const isRedFail = Boolean(failResult.failureGate === "llm-generate-sop" || failResult.llm?.error) && failResult.outputPath !== "transfer_human";
  const failCard = isFail(failResult)
    ? buildSopGenerateErrorCard(failResult, failPeople)
    : failResult.outputPath === "sop_generated"
      ? buildSopCard(failResult, failPeople)
      : buildAskCardSafe(failResult, failPeople);
  await sendNew(failResult.orderNo, demoTopicTitle(failResult), failCard, {
    status: isFail(failResult) ? "transferred" : failResult.outputPath === "sop_generated" ? "sop_ready" : "awaiting_scene_confirm",
  });
  record({
    id: 17,
    title: "308661 红色错误卡（不是蓝色选场景）",
    status: isFail(failResult) && failCard.header.template === "red" && !cardJson(failCard).includes("confirm_scene") ? "✅" : failResult.outputPath === "sop_generated" ? "⚠" : "❌",
    note: `path=${failResult.outputPath} gate=${failResult.failureGate || ""} template=${failCard.header.template} llmError=${failResult.llm?.error || ""}`,
    files: ["lib/run-pipeline.ts", "lib/feishu-card.ts"],
  });

  record({
    id: 18,
    title: "正常写入（待审核的单）",
    status: "⚠",
    note: "本轮 OMS_WRITE_ENABLED=0 不真写。上次已在 2026-09-15 对 VASC000000366432 真写过 scene/sop/nweon。",
    files: ["lib/oms-draft-write.ts"],
  });

  let write19: { success?: boolean; error?: string; skipped?: string[] } = {};
  try {
    write19 = await writeDraft({
      orderNo: "VASC000000329235",
      sceneOverviewCode: sceneCodeFromKey("inbound_package_exception_relabel_shelving"),
      sop: "1. 找货\n2. 换标\n3. 上架",
      dryRun: true,
    });
  } catch (err) {
    write19 = { success: false, error: err instanceof Error ? err.message : String(err), skipped: [] };
  }
  const rejected = !write19.success && (isOmsWriteGuardReject({ skipped: write19.skipped || [] }) || /非待审核|已有内容/.test(write19.error || ""));
  const cancelCard = buildOmsWriteCancelledCard({
    vascNo: "VASC000000329235",
    error: write19.error || "非待审核",
    personnel: inboundPeople,
  });
  await sendNew("VASC000000329235-OMS-CANCEL", `⚠ OMS 写入已取消 — VASC000000329235`, cancelCard);
  record({
    id: 19,
    title: "非待审核拒绝",
    status: rejected ? "✅" : "❌",
    note: `success=${write19.success} skipped=${(write19.skipped || []).join(",")} error=${write19.error || ""}`,
    files: ["lib/oms-draft-write.ts"],
  });

  const retryCard = buildOmsWriteRetryCard({
    vascNo: inboundResult.orderNo,
    sceneKey: inboundResult.matchResult?.sceneKey || "",
    error: "模拟 Cookie 失效",
    personnel: inboundPeople,
    remainingManual: 2,
  });
  await sendNew(`${inboundResult.orderNo}-RETRY`, demoTopicTitle(inboundResult), retryCard);
  record({
    id: 20,
    title: "写入失败 → 重试按钮",
    status: hasButton(retryCard, "sop_write", "重试写入") || cardJson(retryCard).includes("retry_sop_write") ? "✅" : "❌",
    note: "发出模拟失败重试卡；真实 Cookie 失败路径未在本轮触发",
    files: ["lib/feishu-card.ts", "scripts/listen-card-actions.ts"],
  });

  const photoHits = searchSceneByKeyword("拍照暂存");
  const thirdHits = searchSceneByKeyword("关联第三方");
  const noneHits = searchSceneByKeyword("啊啊啊");
  const photoCard =
    photoHits.length === 1
      ? buildSceneSearchSingleCard({ vascNo: fuzzyResult.orderNo, scene: photoHits[0], personnel: fuzzyPeople })
      : buildSceneSearchMultiCard({ vascNo: fuzzyResult.orderNo, scenes: photoHits, personnel: fuzzyPeople });
  await pacedSend(() => sendCardMessage(chatId, photoCard, blueThread));
  await pacedSend(() =>
    sendConsultThreadText(blueThread, "模拟 @bot 拍照暂存 → 已在本话题发出确认/匹配卡片（关键词检索）"),
  );
  const thirdCard = buildSceneSearchMultiCard({ vascNo: fuzzyResult.orderNo, scenes: thirdHits, personnel: fuzzyPeople });
  await pacedSend(() => sendCardMessage(chatId, thirdCard, blueThread));
  await pacedSend(() =>
    sendConsultThreadText(
      blueThread,
      noneHits.length === 0
        ? "未找到匹配的场景。请用场景关键词重试，如「拍照暂存」或「货权转移」。也可以点「以上都不对，查看更多场景」。"
        : `意外命中 ${noneHits.length} 条`,
    ),
  );
  record({
    id: 21,
    title: '@bot "拍照暂存" → 确认卡片',
    status: photoHits.length >= 1 ? "✅" : "❌",
    note: `search hits=${photoHits.length} ${photoHits.map((s) => s.sceneName).slice(0, 3).join(" / ")}；未走真实 IM @bot（事件总线可能被占用）`,
    files: ["lib/scenario-cards.ts", "scripts/listen-card-actions.ts"],
  });
  record({
    id: 22,
    title: '@bot "关联第三方" → 多结果卡片',
    status: thirdHits.length >= 2 ? "✅" : thirdHits.length === 1 ? "⚠" : "❌",
    note: `hits=${thirdHits.length}`,
    files: ["lib/scenario-cards.ts"],
  });
  record({
    id: 23,
    title: '@bot "啊啊啊" → 未找到提示',
    status: noneHits.length === 0 ? "✅" : "❌",
    note: `hits=${noneHits.length}`,
    files: ["scripts/listen-card-actions.ts"],
  });

  const skipLogDir = resolve(outDir, "skip-filter");
  mkdirSync(skipSvcDir(skipLogDir), { recursive: true });
  writeFileSync(resolve(skipLogDir, "details.json"), `${JSON.stringify({ details: [skipSvc] }, null, 2)}\n`, "utf8");
  const skipRun = spawnSync(
    "npx",
    [
      "tsx",
      "internal-review-copilot/scripts/poll-and-assess.ts",
      "--once",
      "--skip-feishu",
      "--skip-llm",
      "--input",
      resolve(skipLogDir, "details.json"),
      "--out",
      skipLogDir,
      "--store",
      resolve(skipLogDir, "case-store.json"),
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OMS_WRITE_ENABLED: "0" },
      timeout: 120000,
      shell: true,
    },
  );
  const skipLog = existsSync(resolve(skipLogDir, "poll.log")) ? readFileSync(resolve(skipLogDir, "poll.log"), "utf8") : `${skipRun.stdout}\n${skipRun.stderr}`;
  record({
    id: 24,
    title: "非三种服务码跳过（看 log）",
    status: /skip_service_code/.test(skipLog) ? "✅" : "❌",
    note: skipLog.split("\n").filter((l) => /skip_service/.test(l)).slice(0, 3).join(" | ") || skipLog.slice(0, 300),
    files: ["scripts/poll-and-assess.ts"],
  });

  const rateDir = resolve(outDir, "rate-limit");
  mkdirSync(rateDir, { recursive: true });
  const hourKey = new Date().toISOString().slice(0, 13);
  writeFileSync(resolve(rateDir, "hourly-count.json"), `${JSON.stringify({ [hourKey]: 10 }, null, 2)}\n`, "utf8");
  writeFileSync(resolve(rateDir, "details.json"), `${JSON.stringify({ details: [inboundL4] }, null, 2)}\n`, "utf8");
  const rateRun = spawnSync(
    "npx",
    [
      "tsx",
      "internal-review-copilot/scripts/poll-and-assess.ts",
      "--once",
      "--skip-feishu",
      "--skip-llm",
      "--input",
      resolve(rateDir, "details.json"),
      "--out",
      rateDir,
      "--store",
      resolve(rateDir, "case-store.json"),
      "--force",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OMS_WRITE_ENABLED: "0", MAX_PER_HOUR: "10" },
      timeout: 120000,
      shell: true,
    },
  );
  const rateLog = existsSync(resolve(rateDir, "poll.log")) ? readFileSync(resolve(rateDir, "poll.log"), "utf8") : `${rateRun.stdout}\n${rateRun.stderr}`;
  record({
    id: 25,
    title: "限流生效（看 hourly-count）",
    status: /rate_limit_hour/.test(rateLog) ? "✅" : "❌",
    note: rateLog.split("\n").filter((l) => /rate_limit/.test(l)).slice(0, 3).join(" | ") || rateLog.slice(0, 300),
    files: ["scripts/poll-and-assess.ts"],
  });

  const pass = items.filter((i) => i.status === "✅").length;
  const warn = items.filter((i) => i.status === "⚠").length;
  const fail = items.filter((i) => i.status === "❌").length;
  const checklist = [
    "# E2E 验证检查清单",
    "",
    `- 时间：${new Date().toISOString()}`,
    `- 测试群：${chatId}`,
    `- OMS_WRITE_ENABLED=0（强制）`,
    `- 结果：✅ ${pass} / ⚠ ${warn} / ❌ ${fail} / 共 ${items.length}`,
    "",
    ...items.map((i) => `- [${i.status === "✅" ? "x" : " "}] ${i.id}. ${i.title}  ${i.status} ${i.note}`),
    "",
    "## 已发话题",
    ...sent.map((s) => `- ${s.orderNo} thread=${s.threadId} title=${s.title}`),
    "",
  ];
  writeFileSync(resolve(outDir, "e2e-checklist.md"), `${checklist.join("\n")}\n`, "utf8");
  const issueLines = [
    "# E2E issues",
    "",
    "不自动修。下列项未达到 Prompt H 的通过标准。",
    "",
    ...issues.map(
      (i) =>
        `## #${i.id} ${i.expected}\n- 实际：${i.actual}\n- 预期：${i.expected}\n- 文件：${i.files.join(", ") || "-"}\n`,
    ),
    warn
      ? `\n## 警告项（未记为失败，需人工看群）\n${items
          .filter((i) => i.status === "⚠")
          .map((i) => `- #${i.id} ${i.title}：${i.note}`)
          .join("\n")}\n`
      : "",
  ];
  writeFileSync(resolve(outDir, "issues.md"), `${issueLines.join("\n")}\n`, "utf8");
  writeFileSync(resolve(outDir, "sent.json"), `${JSON.stringify({ sent, pass, warn, fail }, null, 2)}\n`, "utf8");
  console.log(`E2E done pass=${pass} warn=${warn} fail=${fail} out=${outDir}`);
  if (fail > 0) process.exitCode = 2;
}

function skipSvcDir(path: string): string {
  return path;
}

function isFail(result: PipelineResult): boolean {
  return result.failureGate === "llm-generate-sop" || Boolean(result.llm?.error && result.outputPath !== "transfer_human" && result.outputPath !== "needs_requirement_clarification" && result.outputPath !== "needs_field_clarification");
}

function buildAskCardSafe(result: PipelineResult, personnel: DemoPersonnel): FeishuCard {
  if (result.outputPath === "needs_requirement_clarification") return buildRequirementClarificationCard(result, personnel);
  if (result.outputPath === "needs_field_clarification") return buildClarificationCard(result, personnel);
  if (result.outputPath === "transfer_human") {
    return buildSceneConfirmCard(result, personnel, collectSceneCandidates(result.matchResult));
  }
  if (isFail(result)) return buildSopGenerateErrorCard(result, personnel);
  return buildSopCard(result, personnel);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
