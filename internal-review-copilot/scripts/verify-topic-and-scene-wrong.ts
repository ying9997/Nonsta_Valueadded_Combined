/**
 * Local E2E: topic title format + scene_wrong on L3 / SOP-error cards.
 * Sends to the test chat only. Does not deploy to 40.
 *
 *   npx tsx internal-review-copilot/scripts/verify-topic-and-scene-wrong.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../lib/case-store.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { sendCardInNewTopic, sendCardMessage } from "../lib/feishu-bot.ts";
import {
  buildAskCard,
  buildSceneConfirmCard,
  demoTopicTitle,
} from "../lib/feishu-card.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { personnelDirectory } from "../lib/personnel.ts";
import { runPipeline } from "../lib/run-pipeline.ts";
import type { JsonRecord, PipelineResult } from "../lib/types.ts";

const TEST_CHAT = "oc_80b07f38ed6833df3787a97a496f1097";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function hasSceneWrong(card: { elements: Array<{ tag?: string; actions?: Array<{ name?: string; type?: string; text?: { content?: string } }> }> }): boolean {
  return card.elements.some(
    (el) =>
      el.tag === "action" &&
      (el.actions || []).some(
        (b) => b.name === "scene_wrong" && b.type === "danger" && String(b.text?.content || "").includes("场景不对"),
      ),
  );
}

async function main(): Promise<void> {
  process.env.FEISHU_TEST_CHAT_ID = arg("chat-id") || TEST_CHAT;
  loadEnvFiles();
  const chatId = process.env.FEISHU_TEST_CHAT_ID || TEST_CHAT;
  const outDir = resolve(projectDir(), "_runs/20260914_e2e_topic_scene_wrong");
  mkdirSync(outDir, { recursive: true });
  const detailsPath = resolve(projectDir(), arg("input") || "_runs/20260904_demo_cases/demo_all.details.json");
  if (!existsSync(detailsPath)) throw new Error(`missing input ${detailsPath}`);
  const raw = JSON.parse(readFileSync(detailsPath, "utf8"));
  const details: JsonRecord[] = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  const orderNo = arg("order") || "VASC000000343821";
  const detail = details.find((item) => asText(item.orderNo) === orderNo);
  if (!detail) throw new Error(`${orderNo} not in ${detailsPath}`);

  const pipelineResult = await runPipeline(detail, {
    skipLlm: true,
    overrideScene: "inbound_label_identify",
  });
  if (!pipelineResult) throw new Error("pipeline null");
  const l3Result: PipelineResult =
    pipelineResult.outputPath === "needs_field_clarification"
      ? pipelineResult
      : {
          ...pipelineResult,
          outputPath: "needs_field_clarification",
          missingAttachments: pipelineResult.missingAttachments.length
            ? pipelineResult.missingAttachments
            : ["标签文件"],
          missing: pipelineResult.missing.length ? pipelineResult.missing : ["标签文件"],
        };
  const personnel = personnelDirectory();
  const l3Card = buildAskCard(l3Result, personnel);
  assert(hasSceneWrong(l3Card), "L3 card missing scene_wrong");
  const topic = demoTopicTitle(l3Result);
  assert(topic.includes(" | "), `topic missing pipes: ${topic}`);
  assert(topic.startsWith(`${orderNo} |`), `topic should start with VASC | : ${topic}`);
  assert(!topic.includes("已生成 SOP"), `topic must not use SOP status text: ${topic}`);
  assert(!topic.includes("异常单 "), `topic must not use EB/WI filler: ${topic}`);
  assert(topic.includes("SKU") || topic.includes("包裹"), `topic should use 需求描述: ${topic}`);
  assert(JSON.stringify(l3Card).includes("【客户原始 - 需求描述】"), "L3 missing 客户原始需求描述");
  assert(JSON.stringify(l3Card).includes("【AI 总结 - 需求描述】"), "L3 missing AI总结需求描述");
  console.log(`topic=${topic}`);

  const l3Sent = await sendCardInNewTopic(chatId, topic, l3Card);
  assert(!l3Sent.skipped, `L3 send skipped: ${l3Sent.reason || "unknown"}`);
  writeFileSync(resolve(outDir, "l3.card.json"), `${JSON.stringify(l3Card, null, 2)}\n`);
  writeFileSync(
    resolve(outDir, "l3.feishu.json"),
    `${JSON.stringify({ ...l3Sent, topic, chatId }, null, 2)}\n`,
  );
  console.log(`L3 sent topicId=${l3Sent.topicId} thread=${l3Sent.threadId} skipped=${l3Sent.skipped}`);

  const store = new CaseStore(resolve(outDir, "case-store.json"));
  store.upsert({
    vascNo: orderNo,
    status: "clarification_sent",
    customer: asText(l3Result.contextFacts?.customerName),
    warehouse: asText(l3Result.contextFacts?.warehouseCode) || asText(l3Result.contextFacts?.warehouseName),
    aiOutputPath: "needs_field_clarification",
    matchResult: l3Result.matchResult || {},
    missingFields: l3Result.missing,
    feishuThreadId: l3Sent.threadId || null,
    feishuMessageId: l3Sent.messageId || null,
    feishuTopicId: l3Sent.topicId || null,
    lastCard: l3Card,
    notifyChannel: "card",
    lastProcessedAt: new Date().toISOString(),
  });

  const blue = buildSceneConfirmCard(l3Result, personnel, collectSceneCandidates(l3Result.matchResult));
  const blueText = JSON.stringify(blue);
  if (blueText.includes("未能识别到匹配的场景")) {
    assert(blueText.includes("场景识别：未识别到"), "situation B must show 未识别到");
    assert(!blueText.includes("场景识别：【入库】"), "situation B must not keep leftover scene name");
  }
  assert(blueText.includes("【客户原始 - 需求描述】"), "blue missing 客户原始需求描述");
  assert(blueText.includes("【AI 总结 - 需求描述】"), "blue missing AI总结需求描述");
  const threadId = l3Sent.threadId;
  if (!threadId) throw new Error("L3 thread missing, cannot simulate scene_wrong");
  const blueSent = await sendCardMessage(chatId, blue, threadId);
  assert(!blueSent.skipped, `blue send skipped: ${blueSent.reason || "unknown"}`);
  store.upsert({
    vascNo: orderNo,
    status: "awaiting_scene_confirm",
    feishuThreadId: threadId,
    feishuMessageId: blueSent.messageId || null,
    lastCard: blue,
    notifyChannel: "card",
  });
  writeFileSync(resolve(outDir, "listen-inputs.json"), `${JSON.stringify([detail], null, 2)}\n`);
  writeFileSync(resolve(outDir, "scene-wrong-followup.card.json"), `${JSON.stringify(blue, null, 2)}\n`);
  writeFileSync(resolve(outDir, "scene-wrong-followup.feishu.json"), `${JSON.stringify(blueSent, null, 2)}\n`);
  console.log(`scene_wrong follow-up blue card sent messageId=${blueSent.messageId}`);

  const report = [
    "# E2E topic title + scene_wrong",
    "",
    `- chat: ${chatId}`,
    `- order: ${orderNo}`,
    `- topic: ${topic}`,
    `- L3 scene_wrong: yes`,
    `- L3 客户原始+AI总结: yes`,
    `- L3 thread follow-up blue card: ${blueSent.messageId || "missing"}`,
    `- did not send SOP failure card`,
    "",
  ].join("\n");
  writeFileSync(resolve(outDir, "report.md"), `${report}\n`);
  console.log(`wrote ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
