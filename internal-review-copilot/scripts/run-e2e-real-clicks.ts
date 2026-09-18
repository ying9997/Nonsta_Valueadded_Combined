/**
 * Prompt H 真人点按钮：发蓝卡 / 绿卡到测试群，写入 case-store 供 listen 接真实 card.action。
 * 本脚本不代替点按钮，也不续发全场景卡。
 *
 *   npx tsx internal-review-copilot/scripts/run-e2e-real-clicks.ts
 *
 * OMS_WRITE_ENABLED is forced off.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { CaseStore } from "../lib/case-store.ts";
import { envText, loadEnvFiles, projectDir } from "../lib/env.ts";
import {
  buildSceneConfirmCard,
  buildSopCard,
  demoTopicTitle,
} from "../lib/feishu-card.ts";
import { sendCardInNewTopic, sendConsultThreadText, sendThreadPlainText } from "../lib/feishu-bot.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { resolvePersonnelFromDetail } from "../lib/personnel.ts";
import { loadValidUserToken } from "../lib/feishu-user-token.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { JsonRecord } from "../lib/types.ts";

const TEST_CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const MSG_GAP_MS = 12_000;
const L2_ORDER = "VASC000000326061";
const L4_ORDER = "VASC000000329235";
const CONSULT_PROFILE = "zengzhi-consult";

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

function peopleOf(detail: JsonRecord, result: PipelineResult) {
  return resolvePersonnelFromDetail(detail, {
    customerName: result.contextFacts?.customerName,
    warehouseName: result.contextFacts?.warehouseName,
  });
}

function resolveBotOpenId(): string {
  const fromEnv = envText("FEISHU_BOT_OPEN_ID");
  if (fromEnv) return fromEnv;
  try {
    const who = spawnSync(
      "npx",
      ["lark-cli", "--profile", CONSULT_PROFILE, "--as", "bot", "whoami", "--json"],
      {
        encoding: "utf8",
        timeout: 20000,
        shell: true,
        windowsHide: true,
        env: {
          ...process.env,
          LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
          LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1",
        },
      },
    );
    const rec = asRecord(JSON.parse(who.stdout || "{}"));
    const nested = asRecord(rec.user || rec.data || rec);
    return asText(rec.open_id) || asText(nested.open_id);
  } catch {
    return "";
  }
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const root = projectDir();
  const outDir = resolve(root, "_runs/20260915_e2e_click");
  mkdirSync(outDir, { recursive: true });
  const store = new CaseStore(resolve(outDir, "case-store.json"));
  const historical = loadDetailsFile(resolve(root, "_runs/20260914_historical_batch/details.json"));
  const e2e = loadDetailsFile(resolve(root, "_runs/20260915_e2e_j/details.json"));
  const demo = loadDetailsFile(resolve(root, "_runs/20260909_demo_e2e/demo-inputs.json"));
  const sources = [historical, e2e, demo];
  const l2 = findOrder(sources, L2_ORDER);
  const l4 = findOrder(sources, L4_ORDER);
  if (!l2) throw new Error(`缺少 ${L2_ORDER}`);
  if (!l4) throw new Error(`缺少 ${L4_ORDER}`);
  writeFileSync(resolve(outDir, "details.json"), `${JSON.stringify([l2, l4], null, 2)}\n`, "utf8");

  const chatId = TEST_CHAT;
  const botOpenId = resolveBotOpenId();
  const user = await loadValidUserToken();
  console.log(`real-clicks chat=${chatId} OMS_WRITE=0 botOpenId=${botOpenId || "-"} asUser=${Boolean(user)}`);

  const fuzzy = await runPipeline(l2, { sceneLlm: true, sceneLlmVersion: 2 });
  if (!fuzzy) throw new Error("326061 pipeline empty");
  const fuzzyPeople = peopleOf(l2, fuzzy);
  const blue = buildSceneConfirmCard(fuzzy, fuzzyPeople, collectSceneCandidates(fuzzy.matchResult));
  const blueSent = await sendCardInNewTopic(chatId, `【请点按钮 #9】 ${demoTopicTitle(fuzzy)}`, blue);
  store.upsert({
    vascNo: L2_ORDER,
    status: "awaiting_scene_confirm",
    customer: fuzzy.contextFacts?.customerName || "",
    warehouse: fuzzy.contextFacts?.warehouseName || "",
    lastCard: blue,
    matchResult: fuzzy.matchResult || {},
    feishuThreadId: blueSent.threadId,
    feishuMessageId: blueSent.messageId,
    feishuTopicId: blueSent.topicId || null,
    notifyChannel: "card",
    aiOutputPath: fuzzy.outputPath,
  });
  await sendConsultThreadText(
    blueSent.threadId,
    [
      "【E2E 真人点按钮 · #9】请点上面蓝卡的「以上都不对，查看更多场景」。",
      "点完后，同一话题应出现全场景卡（文案是「以上都没有，确认转人工」）。",
      "点完后请再在本话题 @咨询机器人，依次发：拍照暂存 / 关联第三方 / 啊啊啊（用于 #21/#22/#23）。",
    ].join("\n"),
  );
  console.log(`#9 blue thread=${blueSent.threadId} path=${fuzzy.outputPath}`);
  await sleep(MSG_GAP_MS);

  const sop = await runPipeline(l4, { sceneLlm: true, sceneLlmVersion: 2 });
  if (!sop) throw new Error("329235 pipeline empty");
  const sopPeople = peopleOf(l4, sop);
  const green = buildSopCard(sop, sopPeople);
  const greenSent = await sendCardInNewTopic(chatId, `【请点按钮 #15】 ${demoTopicTitle(sop)}`, green);
  store.upsert({
    vascNo: L4_ORDER,
    status: sop.outputPath === "sop_generated" ? "sop_ready" : "awaiting_scene_confirm",
    customer: sop.contextFacts?.customerName || "",
    warehouse: sop.contextFacts?.warehouseName || "",
    lastCard: green,
    matchResult: sop.matchResult || {},
    feishuThreadId: greenSent.threadId,
    feishuMessageId: greenSent.messageId,
    feishuTopicId: greenSent.topicId || null,
    notifyChannel: "card",
    aiOutputPath: sop.outputPath,
    aiGeneratedText: sop.llm?.text || "",
    llmSop: sop.llm?.sop || null,
    sopEditCount: 0,
  });
  await sendConsultThreadText(
    greenSent.threadId,
    [
      "【E2E 真人点按钮 · #15】请点上面绿卡的「✏️ SOP 需要修改」。",
      "点完后，请在本话题直接回复：请把最后一步改成先拍照再关闭异常单",
    ].join("\n"),
  );
  console.log(`#15 green thread=${greenSent.threadId} path=${sop.outputPath}`);
  await sleep(MSG_GAP_MS);

  const queries = ["拍照暂存", "关联第三方", "啊啊啊"];
  const mention = botOpenId ? `<at user_id="${botOpenId}">咨询机器人</at> ` : "";
  const atNotes: string[] = [];
  if (user && botOpenId) {
    for (const q of queries) {
      try {
        const sent = await sendThreadPlainText(chatId, blueSent.threadId, `${mention}${q}`);
        atNotes.push(`${q} → ${sent.messageId}`);
        console.log(`@bot as user ${q} messageId=${sent.messageId}`);
      } catch (err) {
        atNotes.push(`${q} 发送失败：${err instanceof Error ? err.message : err}`);
        console.warn(`@bot send failed ${q}: ${err instanceof Error ? err.message : err}`);
      }
      await sleep(MSG_GAP_MS);
    }
  } else {
    atNotes.push(`未用金萤身份代发 @bot（asUser=${Boolean(user)} botOpenId=${botOpenId || "-"}），请你在 #9 话题里手动 @咨询机器人。`);
  }

  const guide = [
    "# E2E 真人点按钮",
    "",
    `- 测试群：\`${TEST_CHAT}\``,
    "- listen store：`_runs/20260915_e2e_click/case-store.json`",
    "- OMS_WRITE_ENABLED=0",
    "",
    "## 请你现在点",
    "",
    `| 项 | 话题 | 请点 / 请发 |`,
    `|---|---|---|`,
    `| #9 | \`${blueSent.threadId}\` | 蓝卡「以上都不对，查看更多场景」 |`,
    `| #15 | \`${greenSent.threadId}\` | 绿卡「SOP 需要修改」，再回复修改意见 |`,
    `| #21/#22/#23 | \`${blueSent.threadId}\` | @咨询机器人：拍照暂存 / 关联第三方 / 啊啊啊 |`,
    "",
    "## @bot 代发",
    "",
    ...atNotes.map((line) => `- ${line}`),
    "",
    "## 流水线",
    "",
    `- #9 蓝卡 path=${fuzzy.outputPath}`,
    `- #15 绿卡 path=${sop.outputPath}`,
    "",
  ];
  writeFileSync(resolve(outDir, "click-guide.md"), `${guide.join("\n")}\n`, "utf8");
  writeFileSync(
    resolve(outDir, "sent.json"),
    `${JSON.stringify({ blue: blueSent, green: greenSent, atNotes, botOpenId, asUser: Boolean(user) }, null, 2)}\n`,
    "utf8",
  );
  console.log(`guide ${resolve(outDir, "click-guide.md")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
