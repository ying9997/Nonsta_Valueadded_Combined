/**
 * D+2 end-to-end demo.
 *
 *   npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477
 *   npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000326061 --send-feishu --card
 *   npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --simulate-reply "标签对应关系见群图，操作说明稍后补"
 *
 * 业务演示（Phase 2 v2）：
 *   npx tsx internal-review-copilot/scripts/demo-e2e.ts --input _runs/20260909_demo_e2e/demo-inputs.json --order VASC000000315774 --skip-feishu --out _runs/20260909_demo_e2e/dryrun
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CaseStore } from "../lib/case-store.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import {
  ZENGZHI_CONSULT_APP_ID,
  batchGetOpenIdsByEmails,
  buildDemoPost,
  ensureMembersInChat,
  getTokenSource,
  listChatMembers,
  resolveTestChatId,
  sendCardInNewTopic,
  sendDedupedOrderMessage,
  sendGroupMessage,
  sendThreadPlainText,
  type DemoRoleMention,
} from "../lib/feishu-bot.ts";
import {
  buildAskCard,
  buildSceneConfirmCard,
  buildSopCard,
  demoTopicTitle,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { buildTransferNoticeBody, collectSceneCandidates, parseSceneReply } from "../lib/parse-scene-reply.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { findScenarioCard } from "../lib/scenario-cards.ts";
import { summarizeReply } from "../lib/summarize-reply.ts";
import type { JsonRecord } from "../lib/types.ts";

const here = dirname(fileURLToPath(import.meta.url));

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function resolveArgPath(p: string, fallbackRelToProject: string): string {
  if (!p) return resolve(projectDir(), fallbackRelToProject);
  if (isAbsolute(p)) return p;
  const fromProject = resolve(projectDir(), p);
  const fromHere = resolve(here, p);
  if (existsSync(fromProject)) return fromProject;
  if (existsSync(fromHere)) return fromHere;
  return fromProject;
}

function applyDemoRequiredFieldKeys(detail: JsonRecord): void {
  const keys = asArray(detail.demoRequiredFieldKeys).map((item) => asText(item)).filter(Boolean);
  const sceneKey = asText(detail.demoSceneKey);
  if (!keys.length || !sceneKey) return;
  const card = findScenarioCard(sceneKey);
  if (!card) {
    console.warn(`demoRequiredFieldKeys 未生效：找不到场景卡 ${sceneKey}`);
    return;
  }
  card.requiredAttachmentPolicy.requiredFieldKeys = keys;
  console.log(`demo 附件门禁：${sceneKey} requiredFieldKeys=${keys.join(",")}`);
}

function step(n: number, title: string): void {
  console.log("");
  console.log(`======== 步骤 ${n}：${title} ========`);
}

function pathLabel(path: string): string {
  if (path === "needs_requirement_clarification") return "请补需求";
  if (path === "needs_field_clarification") return "请补资料";
  if (path === "sop_generated") return "生成 SOP 草稿，待人工确认";
  if (path === "transfer_human") return "转人工审核";
  return "输入异常，转人工处理";
}

function warehouseLabel(detail: JsonRecord): string {
  const header = asRecord(detail.listHeader);
  const warehouse = asRecord(header.warehouse);
  return (
    asText(header.warehouseName) ||
    asText(warehouse.warehouseName) ||
    asText(header.warehouseCode) ||
    asText(warehouse.warehouseCode) ||
    "仓库未填写"
  );
}

function llmGuard(error: string | null | undefined): { looksInvented: boolean; assertNoForbidden: string } {
  const text = error || "";
  return {
    looksInvented: text.includes("编造"),
    assertNoForbidden: text.includes("禁止表述") ? "fail" : "pass",
  };
}

const DEMO_CUSTOMERS: Record<string, { code: string; name: string }> = {
  VASC000000315774: { code: "DEMO_CUST001", name: "××科技有限公司（脱敏）" },
  VASC000000298617: { code: "DEMO_CUST002", name: "××贸易有限公司（脱敏）" },
  VASC000000326061: { code: "DEMO_CUST003", name: "××供应链有限公司（脱敏）" },
};

type PersonnelMap = Record<string, DemoRoleMention & { email?: string }>;

function defaultPersonnel(): PersonnelMap {
  return {
    销售: { name: "韩洪涛", openId: null, email: "hongtao.han@winit.com" },
    审核员: { name: "金萤", openId: null, email: "" },
  };
}

function loadPersonnel(path: string): PersonnelMap {
  const base = defaultPersonnel();
  if (!path || !existsSync(path)) return base;
  const raw = asRecord(JSON.parse(readFileSync(path, "utf8")));
  for (const role of ["销售", "审核员", "客服"]) {
    const rec = asRecord(raw[role]);
    if (!Object.keys(rec).length) continue;
    const prev = base[role] || { name: "", openId: null, email: "" };
    base[role] = {
      name: asText(rec.name) || prev.name,
      openId: asText(rec.openId) || null,
      email: asText(rec.email) || (asText(rec.name) && asText(rec.name) !== prev.name ? "" : prev.email),
    };
  }
  return base;
}

function personnelOpenIds(personnel: PersonnelMap): string[] {
  return Object.values(personnel)
    .map((item) => item.openId || "")
    .filter((id) => id.startsWith("ou_"));
}

function designedDemoMessage(
  orderNo: string,
  saved: JsonRecord,
  warehouse: string,
): { title: string; body: string } {
  const cust = DEMO_CUSTOMERS[orderNo] || { code: "DEMO_CUST", name: "××公司（脱敏）" };
  const scene = asText(saved.scenarioName) || "未命中";
  const title = `📋 增值单 AI 预审结果 — ${orderNo}`;
  if (orderNo === "VASC000000315774") {
    return {
      title,
      body: [
        `客户：${cust.code} / ${cust.name}`,
        `仓库：${warehouse || "USNJ2 Warehouse"}`,
        "异常单：EB0126060330032532",
        `场景识别：${scene}`,
        "",
        "✅ 附件已齐全，SOP 已生成：",
        "",
        "【操作要求】",
        "1. 根据异常单 EB0126060330032532 定位待处理的 14 个包裹",
        "2. 根据客户提供的辨识方法（外箱 A+ 包裹标签确认 SKU）做辨识",
        "3. 补贴包裹标签 × 14，并上架到新入库单 WI50734175",
        "4. 将异常单状态变更为已完成，关闭异常单",
        "",
        "{@审核员} 请确认以上 SOP 是否正确，确认后可下发仓库执行。",
      ].join("\n"),
    };
  }
  if (orderNo === "VASC000000298617") {
    const missing = asArray(saved.missing).map((item) => asText(item)).filter(Boolean);
    const missingLine = missing.includes("操作说明附件") || !missing.length
      ? "- ❌ 操作说明附件（拍照要求/SOP 说明）"
      : missing.map((item) => `- ❌ ${item}`).join("\n");
    return {
      title,
      body: [
        `客户：${cust.code} / ${cust.name}`,
        `仓库：${warehouse || "USKY3 Warehouse"}`,
        "异常单：EB0326061230366501, EB0326061230362709",
        `场景识别：${scene}`,
        "",
        "⚠ 场景已识别，但以下材料需要补充：",
        missingLine,
        "",
        "{@销售} 请联系客户补充以上材料。补齐后 AI 将自动生成操作 SOP。",
        "{@审核员} 待材料补齐后请确认。",
      ].join("\n"),
    };
  }
  if (orderNo === "VASC000000360654") {
    const sop = asText(saved.llmText) || "SOP 生成失败";
    return {
      title,
      body: [
        `客户：${cust.code} / ${cust.name}`,
        `仓库：${warehouse || "USWC5 Warehouse"}`,
        "异常单：EB0126082832573118",
        `场景识别：${scene}`,
        "",
        "✅ 本场景无需附件，SOP 已生成：",
        "",
        sop,
        "",
        "{@审核员} 请确认以上 SOP 是否正确，确认后写入 OMS 草稿。",
      ].join("\n"),
    };
  }
  return {
    title,
    body: [
      `客户：${cust.code} / ${cust.name}`,
      `仓库：${warehouse || "USKY5 Warehouse"}`,
      "异常单：EB0326072531612017",
      "异常类型：包裹内出现订单外商品",
      "",
      "🔄 本单需求较复杂，AI 无法自动匹配场景，已转人工审核。",
      "",
      "已识别的信息摘要：",
      "- 客户提到：第三方编码已关联 + 补贴包裹标签 + 新单上架",
      "- 异常类型“包裹内出现订单外商品”涉及多步骤处理",
      "",
      "{@审核员} 请人工审核此单。以上摘要供参考。",
      "{@销售} 如需补充材料审核人员会通知。",
    ].join("\n"),
  };
}

function pipelineStubFromSaved(orderNo: string, saved: JsonRecord): PipelineResult {
  return {
    orderNo,
    outputPath: asText(saved.outputPath) as PipelineResult["outputPath"],
    missing: asArray(saved.missing).map((item) => asText(item)).filter(Boolean),
    llm: { text: asText(saved.llmText) || asText(saved.aiGeneratedText) },
    analysis: asText(saved.llmText),
    contextFacts: {
      customerName: asText(saved.customer),
      warehouseName: warehouseFromSaved(saved),
    },
    matchResult: {
      scenarioName: asText(saved.scenarioName),
      sceneKey: asText(saved.sceneKey),
    },
  } as PipelineResult;
}

function wantCard(): boolean {
  return hasFlag("card") || (hasFlag("send-feishu") && !hasFlag("post"));
}

function cardForDesigned(orderNo: string, result: PipelineResult, personnel: PersonnelMap): FeishuCard {
  if (result.outputPath === "sop_generated" || orderNo === "VASC000000315774") {
    return buildSopCard(result, personnel);
  }
  if (result.outputPath === "needs_requirement_clarification") {
    return buildAskCard(result, personnel);
  }
  if (result.outputPath === "needs_field_clarification") {
    return buildAskCard(result, personnel);
  }
  return buildAskCard(result, personnel);
}

function warehouseFromSaved(saved: JsonRecord): string {
  const review = asRecord(saved.structuredReview);
  return asText(saved.warehouse) || asText(review.warehouse) || "";
}

async function resolvePersonnelFile(path: string): Promise<PersonnelMap> {
  const personnel = loadPersonnel(path);
  const emails = Object.values(personnel)
    .map((item) => item.email || "")
    .filter(Boolean);
  try {
    const found = await batchGetOpenIdsByEmails(emails);
    for (const role of Object.keys(personnel)) {
      const email = (personnel[role].email || "").toLowerCase();
      if (email && found[email]) personnel[role].openId = found[email];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`警告：通讯录 batch_get_id 失败：${msg}`);
  }
  const missing = Object.values(personnel).some((item) => !item.openId);
  if (missing) {
    try {
      const chatId = resolveTestChatId();
      const members = await listChatMembers(chatId);
      console.log(`测试群成员 ${members.length} 人，按姓名回填 open_id`);
      for (const role of Object.keys(personnel)) {
        if (personnel[role].openId) continue;
        const hit = members.filter((item) => item.name === personnel[role].name);
        if (hit.length === 1) personnel[role].openId = hit[0].openId;
        else if (hit.length > 1) {
          console.warn(`警告：群内同名 ${personnel[role].name} 有 ${hit.length} 人，不自动选取`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`警告：拉群成员按姓名匹配失败：${msg}`);
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(personnel, null, 2)}\n`, "utf8");
  console.log(`已写入人员配置：${path}`);
  for (const [role, person] of Object.entries(personnel)) {
    console.log(`  ${role} ${person.name} email=${person.email || "-"} openId=${person.openId || "null"}`);
  }
  return personnel;
}

async function sendSceneConfirmDemo(args: {
  orderNo: string;
  result: Awaited<ReturnType<typeof runPipeline>>;
  personnel: PersonnelMap;
  chatId: string;
  outDir: string;
}): Promise<{
  candidates: ReturnType<typeof buildTransferNoticeBody>["candidates"];
  threadId: string;
  messageId: string;
  card: FeishuCard | null;
}> {
  if (!args.result) throw new Error("pipeline 无结果");
  const reviewer = args.personnel["审核员"];
  const candidates = hasFlag("force-scene-confirm") ? [] : collectSceneCandidates(args.result.matchResult);
  const notice = buildTransferNoticeBody({
    vascNo: args.orderNo,
    customer: args.result.contextFacts?.customerName,
    warehouse: args.result.contextFacts?.warehouseName || args.result.contextFacts?.warehouseCode,
    summary: args.result.llm?.text || args.result.analysis || "",
    matchResult: args.result.matchResult,
    mentionName: reviewer?.name || "审核员",
  });
  const card = wantCard()
    ? buildSceneConfirmCard(args.result, args.personnel, candidates)
    : null;
  const body = notice.body.replace(`@${reviewer?.name || "审核员"}`, "{@审核员}");
  const post = buildDemoPost(notice.title, body, args.personnel);
  console.log(`标题：${notice.title}${card ? "（interactive card）" : ""}`);
  console.log(body);
  writeFileSync(
    resolve(args.outDir, `${args.orderNo}.scene-candidates.json`),
    `${JSON.stringify({ situation: notice.situation, candidates: notice.candidates, card }, null, 2)}\n`,
    "utf8",
  );
  if (card) {
    writeFileSync(resolve(args.outDir, `${args.orderNo}.card.json`), `${JSON.stringify(card, null, 2)}\n`, "utf8");
  }
  if (!hasFlag("send-feishu") || hasFlag("skip-feishu")) {
    console.log("未加 --send-feishu，本步只展示转人工+场景选择话术，不发群。");
    return { candidates: notice.candidates, threadId: "", messageId: "", card };
  }
  const openIds = personnelOpenIds(args.personnel);
  if (openIds.length) {
    const ensure = await ensureMembersInChat(args.chatId, openIds);
    console.log(
      `拉人入群：added=[${ensure.added.join(",") || "-"}] alreadyIn=[${ensure.alreadyIn.join(",") || "-"}] failed=[${ensure.failed.join(",") || "-"}]`,
    );
  }
  const sent = card
    ? await sendCardInNewTopic(args.chatId, demoTopicTitle("transfer_human", args.orderNo), card)
    : await sendGroupMessage(args.chatId, post);
  writeFileSync(
    resolve(args.outDir, `${args.orderNo}.feishu.json`),
    `${JSON.stringify({
      skipped: sent.skipped,
      threadId: sent.threadId,
      topicId: sent.topicId,
      messageId: sent.messageId,
      tokenSource: card ? `tenant/${ZENGZHI_CONSULT_APP_ID}` : getTokenSource(),
      sentAt: new Date().toISOString(),
      situation: notice.situation,
      candidates: notice.candidates,
      msgType: card ? "interactive" : "post",
    }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    sent.skipped
      ? `已去重跳过：${sent.reason || args.orderNo}`
      : `已发送转人工+场景选择（${card ? `tenant/${ZENGZHI_CONSULT_APP_ID}` : getTokenSource()} / ${card ? "card" : "post"}），话题 ID：${sent.topicId || "未返回"}，根消息 ID：${sent.threadId}`,
  );
  return { candidates: notice.candidates, threadId: sent.threadId, messageId: sent.messageId, card };
}

async function simulateSceneReply(args: {
  orderNo: string;
  replyArg: string;
  outDir: string;
}): Promise<void> {
  const store = new CaseStore(resolve(args.outDir, "case-store.json"));
  const rec = store.get(args.orderNo);
  if (!rec) throw new Error(`case-store 中没有 ${args.orderNo}，请先跑 Step 1`);
  const candidates = rec.sceneCandidateList || [];
  let sendText = args.replyArg.trim();
  if (/^\d+$/.test(sendText) && candidates.length && !candidates.some((item) => item.index === Number(sendText))) {
    const f001 = candidates.find((item) => item.sceneKey === "inbound_label_identify");
    if (f001) {
      console.warn(`编号 ${sendText} 不在候选列表中，改为 ${f001.index}（${f001.sceneName}）`);
      sendText = String(f001.index);
    } else {
      sendText = "尺重";
      console.warn(`编号 ${args.replyArg} 不在候选列表中，改为关键词「尺重」`);
    }
  }
  const parsed = parseSceneReply(sendText, candidates);
  console.log(`模拟审核员回复：${sendText}`);
  console.log(`解析：method=${parsed.method} matched=${parsed.matched} scene=${parsed.sceneKey || "-"}`);
  writeFileSync(
    resolve(args.outDir, `${args.orderNo}.scene-reply.json`),
    `${JSON.stringify({ replyArg: args.replyArg, sendText, parsed, candidates }, null, 2)}\n`,
    "utf8",
  );
  if (hasFlag("send-feishu") && !hasFlag("skip-feishu")) {
    if (!rec.feishuThreadId) throw new Error("没有 feishuThreadId，无法在话题内模拟回复");
    const chatId = resolveTestChatId();
    const sent = await sendThreadPlainText(chatId, rec.feishuThreadId, sendText);
    console.log(`已在话题内发送模拟回复，messageId=${sent.messageId}`);
  } else {
    if (parsed.method === "transfer" || !parsed.matched) {
      store.upsert({
        vascNo: args.orderNo,
        status: parsed.method === "unrecognized" || parsed.method === "ambiguous" ? rec.status : "transferred",
        confirmedScene: parsed.matched ? parsed.sceneKey : "",
        confirmedSceneName: parsed.matched ? parsed.sceneName : "人工处理",
        lastSceneReplyText: sendText,
      });
    } else {
      store.upsert({
        vascNo: args.orderNo,
        status: "scene_confirmed",
        confirmedScene: parsed.sceneKey,
        confirmedSceneName: parsed.sceneName,
        confirmedBy: "模拟审核员",
        lastSceneReplyText: sendText,
      });
    }
    console.log("未加 --send-feishu，已写入 case-store，供 --skip-feishu 的 poll 重跑。");
  }
}

async function sendDesignedDemo(args: {
  orderNo: string;
  saved: JsonRecord;
  personnel: PersonnelMap;
  chatId: string;
  outDir: string;
  replayFrom?: string;
  result?: PipelineResult;
}): Promise<{ threadId: string; messageId: string; card: FeishuCard | null }> {
  const warehouse =
    warehouseFromSaved(args.saved) ||
    (args.orderNo === "VASC000000315774"
      ? "USNJ2 Warehouse"
      : args.orderNo === "VASC000000298617"
        ? "USKY3 Warehouse"
        : "USKY5 Warehouse");
  const msg = designedDemoMessage(args.orderNo, args.saved, warehouse);
  const post = buildDemoPost(msg.title, msg.body, args.personnel);
  const result = args.result || pipelineStubFromSaved(args.orderNo, args.saved);
  if (result.contextFacts && warehouse && !result.contextFacts.warehouseName) {
    result.contextFacts.warehouseName = warehouse;
  }
  const card = wantCard() ? cardForDesigned(args.orderNo, result, args.personnel) : null;
  console.log(`标题：${msg.title}${card ? "（interactive card）" : ""}`);
  console.log(msg.body);
  if (card) {
    writeFileSync(resolve(args.outDir, `${args.orderNo}.card.json`), `${JSON.stringify(card, null, 2)}\n`, "utf8");
  }
  if (!hasFlag("send-feishu") || hasFlag("skip-feishu")) {
    console.log("未加 --send-feishu，本步只展示话术，不发群。");
    return { threadId: "", messageId: "", card };
  }
  const openIds = personnelOpenIds(args.personnel);
  const ensure = openIds.length
    ? await ensureMembersInChat(args.chatId, openIds)
    : { added: [] as string[], alreadyIn: [] as string[], failed: [] as string[] };
  if (!openIds.length) {
    console.warn("警告：无有效 open_id，跳过拉人；消息使用文本 @姓名。");
  }
  console.log(
    `拉人入群：added=[${ensure.added.join(",") || "-"}] alreadyIn=[${ensure.alreadyIn.join(",") || "-"}] failed=[${ensure.failed.join(",") || "-"}]`,
  );
  writeFileSync(
    resolve(args.outDir, "ensure-members.json"),
    `${JSON.stringify({ ...ensure, openIds, at: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  const sent = card
    ? await sendCardInNewTopic(
        args.chatId,
        demoTopicTitle(result.outputPath, args.orderNo),
        card,
      )
    : await sendGroupMessage(args.chatId, post);
  const sendMeta = {
    skipped: sent.skipped,
    reason: sent.reason || "",
    threadId: sent.threadId,
    topicId: sent.topicId,
    messageId: sent.messageId,
    tokenSource: card ? `tenant/${ZENGZHI_CONSULT_APP_ID}` : getTokenSource(),
    sentAt: new Date().toISOString(),
    replayFrom: args.replayFrom || "",
    msgType: card ? "interactive" : "post",
    personnel: Object.fromEntries(
      Object.entries(args.personnel).map(([role, person]) => [role, { name: person.name, openId: person.openId }]),
    ),
  };
  writeFileSync(resolve(args.outDir, `${args.orderNo}.feishu.json`), `${JSON.stringify(sendMeta, null, 2)}\n`, "utf8");
  console.log(
    sent.skipped
      ? `已去重跳过：${sent.reason || args.orderNo}`
      : `已发送到测试群（${card ? `tenant/${ZENGZHI_CONSULT_APP_ID}` : getTokenSource()} / ${card ? "card" : "post"}），话题 ID：${sent.topicId || "未返回"}，根消息 ID：${sent.threadId}`,
  );
  return { threadId: sent.threadId, messageId: sent.messageId, card };
}

async function sendSavedReview(orderNo: string, replayDir: string, outDir: string, personnel: PersonnelMap): Promise<void> {
  const savedPath = resolve(replayDir, `${orderNo}.review.json`);
  if (!existsSync(savedPath)) throw new Error(`找不到回放文件：${savedPath}`);
  const saved = asRecord(JSON.parse(readFileSync(savedPath, "utf8")));
  writeFileSync(resolve(outDir, `${orderNo}.review.json`), `${JSON.stringify(saved, null, 2)}\n`, "utf8");
  console.log(`回放 ${savedPath}`);
  const chatId = hasFlag("send-feishu") && !hasFlag("skip-feishu") ? resolveTestChatId() : "";
  await sendDesignedDemo({
    orderNo,
    saved,
    personnel,
    chatId,
    outDir,
    replayFrom: savedPath,
  });
}

async function main(): Promise<void> {
  loadEnvFiles();
  const orderNo = arg("order", "VASC000000348477");
  const replayDir = arg("replay");
  const personnelPath = resolveArgPath(
    arg("personnel"),
    "_runs/20260909_demo_e2e/demo-personnel.json",
  );
  const outDir = resolveArgPath(arg("out"), "_runs/20260903_internal_review_demo");
  mkdirSync(outDir, { recursive: true });
  if (hasFlag("resolve-personnel")) {
    await resolvePersonnelFile(personnelPath);
    return;
  }
  const simulatedScene = arg("simulate-scene-reply");
  if (simulatedScene) {
    await simulateSceneReply({ orderNo, replyArg: simulatedScene, outDir });
    return;
  }
  const personnel = existsSync(personnelPath) ? loadPersonnel(personnelPath) : defaultPersonnel();
  if (replayDir) {
    await sendSavedReview(orderNo, resolveArgPath(replayDir, replayDir), outDir, personnel);
    return;
  }

  const inputPath = resolveArgPath(
    arg("input"),
    "_runs/20260902_ow01v1602_review_orders/details.json",
  );

  step(1, "选一条真实待审核单");
  if (!existsSync(inputPath)) throw new Error(`找不到输入：${inputPath}`);
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const detail = details.find((item) => asText(item.orderNo) === orderNo);
  if (!detail) throw new Error(`details.json 中没有 ${orderNo}`);
  const demoLabel = asText(detail.demoLabel);
  const expectedPath = asText(detail.expectedOutputPath);
  applyDemoRequiredFieldKeys(detail);
  console.log(
    `已选择 ${orderNo}（入库其他服务需求 / ${warehouseLabel(detail)}${demoLabel ? ` / ${demoLabel}` : ""}）`,
  );
  const overrideScene = arg("override-scene");
  console.log(
    `pipeline: skipLlm=${hasFlag("skip-llm")} sceneLlm=${overrideScene ? "false(override)" : "true"} sceneLlmVersion=2${overrideScene ? ` overrideScene=${overrideScene}` : ""}`,
  );

  step(2, "AI 判定");
  const result = await runPipeline(detail, {
    skipLlm: hasFlag("skip-llm"),
    sceneLlm: overrideScene ? false : true,
    sceneLlmVersion: 2,
    overrideScene: overrideScene || undefined,
  });
  if (!result) throw new Error("管线无法识别该单");
  const review = result.structuredReview;
  const match = result.matchResult;
  const llmClass = match?.llmClassification;
  console.log(`需求完整性：${review?.requirementComplete ? "通过" : `不通过 — 缺${review?.missingRequirements.join("、") || "必要信息"}`}`);
  console.log(
    `场景匹配：${
      match?.scenarioName || review?.sceneMatch.topScene || "未命中"
    }（decision=${match?.decision || review?.sceneMatch.decision || "-"}，confidence=${match?.confidence || review?.sceneMatch.confidence || "-"}，llmUsed=${match?.llmUsed ? "yes" : "no"}）`,
  );
  if (llmClass?.reasoning) console.log(`场景理由：${llmClass.reasoning}`);
  console.log(
    `附件完整性：${review?.materialsComplete ? "通过" : `不通过 — 缺${review?.missingMaterials.join("、") || "必要资料"}`}`,
  );
  console.log(`结论：${result.outputPath} → ${pathLabel(result.outputPath)}`);
  const guard = llmGuard(result.llm?.error);
  const payload = {
    orderNo,
    demoLabel,
    source: detail.source || "",
    expectedOutputPath: expectedPath,
    outputPath: result.outputPath,
    ruleOutputPath: result.ruleOutputPath,
    failureGate: result.failureGate,
    missing: result.missing,
    clarificationPrompts: result.clarificationPrompts,
    sceneKey: match?.sceneKey || "",
    scenarioName: match?.scenarioName || "",
    decision: match?.decision || "",
    confidence: match?.confidence || "",
    llmUsed: Boolean(match?.llmUsed),
    sceneLlmVersion: llmClass?.sceneLlmVersion || 2,
    llmReasoning: llmClass?.reasoning || "",
    llmText: result.llm?.text || result.analysis || "",
    llmError: result.llm?.error || null,
    looksInvented: guard.looksInvented,
    assertNoForbidden: guard.assertNoForbidden,
    processingMethod: "暂时",
    warehouse: result.contextFacts?.warehouseName || warehouseLabel(detail),
    structuredReview: review,
  };
  writeFileSync(resolve(outDir, `${orderNo}.review.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  if (result.llm?.error) console.warn(`警告：LLM 失败，已降级转人工：${result.llm.error}`);
  if (expectedPath && result.outputPath !== expectedPath) {
    console.warn(`预期 outputPath=${expectedPath}，实际 ${result.outputPath}`);
  }

  const store = new CaseStore(resolve(outDir, "case-store.json"));
  store.upsert({
    vascNo: orderNo,
    status: "first_assessed",
    customer: result.contextFacts?.customerName || "",
    warehouse: result.contextFacts?.warehouseName || "",
    omsAuditStatus: asText(asRecord(detail.listHeader).statusDesc),
    aiOutputPath: result.outputPath,
    aiGeneratedText: result.llm?.text || "",
    llmSop: result.llm?.sop || null,
    matchResult: result.matchResult || {},
    missingFields: result.missing,
    ruleOutputPath: result.ruleOutputPath,
    llmError: result.llm?.error || null,
    riskFlags: result.riskFlags,
  });

  const forceScene = hasFlag("force-scene-confirm");
  const needsAsk =
    result.outputPath === "needs_requirement_clarification" ||
    result.outputPath === "needs_field_clarification";
  const isSop = result.outputPath === "sop_generated";
  const shouldNotify = needsAsk || result.outputPath === "transfer_human" || isSop || forceScene;

  step(3, shouldNotify ? "发飞书群消息" : "无需通知，跳过发群");
  if (result.outputPath === "transfer_human" || forceScene) {
    if (forceScene) console.log("force-scene-confirm：强制发蓝色场景选择卡");
    try {
      const chatId = hasFlag("send-feishu") && !hasFlag("skip-feishu") ? resolveTestChatId() : "";
      const sent = await sendSceneConfirmDemo({
        orderNo,
        result,
        personnel,
        chatId,
        outDir,
      });
      store.upsert({
        vascNo: orderNo,
        status: "awaiting_scene_confirm",
        feishuThreadId: sent.threadId || store.get(orderNo)?.feishuThreadId || null,
        feishuMessageId: sent.messageId || null,
        lastCard: sent.card || undefined,
        notifyChannel: wantCard() ? "card" : "post",
        clarificationSentAt: new Date().toISOString(),
        sceneCandidateList: sent.candidates,
      });
    } catch (err) {
      console.warn(`警告：飞书发送失败，继续后续步骤：${err instanceof Error ? err.message : err}`);
    }
  } else if (shouldNotify && demoLabel) {
    try {
      const chatId = hasFlag("send-feishu") && !hasFlag("skip-feishu") ? resolveTestChatId() : "";
      const designed = await sendDesignedDemo({
        orderNo,
        saved: payload,
        personnel,
        chatId,
        outDir,
        result,
      });
      if (hasFlag("send-feishu") && !hasFlag("skip-feishu")) {
        store.upsert({
          vascNo: orderNo,
          status: needsAsk ? "awaiting_reply" : isSop ? "sop_ready" : "awaiting_scene_confirm",
          feishuThreadId: designed.threadId || store.get(orderNo)?.feishuThreadId || null,
          feishuMessageId: designed.messageId || null,
          lastCard: designed.card || undefined,
          notifyChannel: wantCard() ? "card" : "post",
          clarificationSentAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(`警告：飞书发送失败，继续后续步骤：${err instanceof Error ? err.message : err}`);
    }
  } else if (shouldNotify) {
    const suffix =
      result.outputPath === "needs_requirement_clarification"
        ? "缺需求"
        : result.outputPath === "needs_field_clarification"
          ? "缺资料"
          : result.outputPath === "sop_generated"
            ? "SOP草稿"
            : "转人工";
    const title = `增值单 ${orderNo} ${suffix}`;
    const body = result.llm?.text || result.analysis || "";
    console.log(`标题：${title}`);
    console.log(body);
    if (hasFlag("send-feishu") && !hasFlag("skip-feishu")) {
      try {
        const chatId = resolveTestChatId();
        const reviewer = personnel["审核员"];
        const mention = reviewer?.openId ? { userId: reviewer.openId, name: reviewer.name } : undefined;
        const genericCard = wantCard()
          ? isSop
            ? buildSopCard(result, personnel)
            : needsAsk
              ? buildAskCard(result, personnel)
              : buildSceneConfirmCard(result, personnel, collectSceneCandidates(result.matchResult))
          : null;
        const sent = genericCard
          ? await sendCardInNewTopic(chatId, demoTopicTitle(result.outputPath, orderNo), genericCard)
          : hasFlag("force-send")
            ? await sendGroupMessage(chatId, buildDemoPost(title, `${body}\n\n{@审核员} 请确认。`, personnel))
            : await sendDedupedOrderMessage({
                chatId,
                orderNo,
                title,
                body,
                mention,
              });
        if (genericCard) {
          writeFileSync(resolve(outDir, `${orderNo}.card.json`), `${JSON.stringify(genericCard, null, 2)}\n`, "utf8");
        }
        const sendMeta = {
          skipped: sent.skipped,
          reason: sent.reason || "",
          threadId: sent.threadId,
          topicId: sent.topicId,
          messageId: sent.messageId,
          tokenSource: genericCard ? `tenant/${ZENGZHI_CONSULT_APP_ID}` : getTokenSource(),
          sentAt: new Date().toISOString(),
          msgType: genericCard ? "interactive" : "post",
        };
        writeFileSync(resolve(outDir, `${orderNo}.feishu.json`), `${JSON.stringify(sendMeta, null, 2)}\n`, "utf8");
        store.upsert({
          vascNo: orderNo,
          status: needsAsk ? "awaiting_reply" : isSop ? "sop_ready" : "awaiting_scene_confirm",
          feishuThreadId: sent.threadId,
          feishuMessageId: sent.messageId || null,
          lastCard: genericCard || undefined,
          notifyChannel: wantCard() ? "card" : "post",
          clarificationSentAt: new Date().toISOString(),
        });
        console.log(
          sent.skipped
            ? `已去重跳过：${sent.reason || orderNo}`
            : `已发送到测试群（${wantCard() ? `tenant/${ZENGZHI_CONSULT_APP_ID}` : getTokenSource()}），话题 ID：${sent.topicId || "未返回"}，根消息 ID：${sent.threadId}`,
        );
      } catch (err) {
        console.warn(`警告：飞书发送失败，继续后续步骤：${err instanceof Error ? err.message : err}`);
      }
    } else {
      console.log("未加 --send-feishu，本步只展示话术，不发群。");
    }
  }

  const simulated = arg("simulate-reply");
  if (simulated) {
    step(4, "等待回复");
    console.log(`（模拟回复：${simulated}）`);
    store.upsert({ vascNo: orderNo, status: "reply_received", replyReceivedAt: new Date().toISOString() });
    step(5, "AI 总结回复");
    const remark = await summarizeReply({
      firstAssess: result,
      replies: [{ speaker: "销售（演示）", text: simulated }],
    });
    console.log(remark);
    writeFileSync(resolve(outDir, `${orderNo}.review-remark.txt`), `${remark}\n`, "utf8");
    store.upsert({ vascNo: orderNo, status: "reassessed", reviewRemark: remark });
  } else if (!hasFlag("skip-summarize") && !hasFlag("skip-feishu") && !hasFlag("send-feishu")) {
    step(4, "等待回复");
    console.log("未提供 --simulate-reply。演示时可在飞书话题回复后，再跑 summarize / poll。");
    step(5, "AI 总结回复");
    const remark = await summarizeReply({
      firstAssess: result,
      replies: [],
    });
    console.log(remark);
    writeFileSync(resolve(outDir, `${orderNo}.review-remark.txt`), `${remark}\n`, "utf8");
    store.upsert({ vascNo: orderNo, status: "reassessed", reviewRemark: remark });
  } else {
    step(4, "等待回复");
    console.log("dry-run / 飞书发送模式跳过 summarize，避免额外 LLM 调用。");
    step(5, "AI 总结回复");
    console.log("已跳过。");
  }

  step(6, "SOP 草稿");
  if (result.ruleOutputPath === "sop_generated" && result.llm?.text) {
    console.log(result.llm.text);
    store.upsert({ vascNo: orderNo, status: "sop_ready" });
  } else {
    console.log(`当前不是 sop_generated（rule=${result.ruleOutputPath}），不输出仓库 SOP。`);
  }

  console.log("");
  console.log("======== 完成 ========");
  console.log(`结构化审核结果：${resolve(outDir, `${orderNo}.review.json`)}`);
  if (existsSync(resolve(outDir, `${orderNo}.review-remark.txt`))) {
    console.log(`审核员可复制备注：${resolve(outDir, `${orderNo}.review-remark.txt`)}`);
  }
  if (expectedPath && result.outputPath !== expectedPath) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
