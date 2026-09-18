/**
 * Send VASC000000366432 to the test chat so reviewers can see
 * topicSummary title + L2.5 not asking for already-uploaded files.
 *
 *   npx tsx internal-review-copilot/scripts/send-366432-feishu.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import {
  buildAskCard,
  buildSceneConfirmCard,
  buildSopCard,
  buildSopGenerateErrorCard,
  demoTopicTitle,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { sendCardInNewTopic, sendConsultThreadText } from "../lib/feishu-bot.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { resolvePersonnelFromDetail } from "../lib/personnel.ts";
import { isSopGenerateFailure, runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { JsonRecord } from "../lib/types.ts";

loadEnvFiles();
process.env.OMS_WRITE_ENABLED = "0";

const TEST_CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const here = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(here, "../../_runs/20260915_e2e_rerun/VASC000000366432.input.json");
const outDir = resolve(projectDir(), "_runs/20260915_attach_topic_summary");
mkdirSync(outDir, { recursive: true });

const detail = JSON.parse(readFileSync(inputPath, "utf8")) as JsonRecord;

const classified = await runPipeline(detail, { skipLlm: true, sceneLlm: true, sceneLlmVersion: 2 });
if (!classified) throw new Error("classify pipeline empty");

const l25 = await runPipeline(detail, {
  skipLlm: false,
  sceneLlm: false,
  overrideScene: "inbound_label_identify",
});
if (!l25) throw new Error("L2.5 pipeline empty");

if (!l25.matchResult) throw new Error("L2.5 missing matchResult");
l25.matchResult.llmClassification = {
  ...(l25.matchResult.llmClassification || {
    matchedScene: "inbound_label_identify",
    confidence: "high",
    reasoning: "override_for_attachment_verify",
    extractedActions: [],
    alternativeScenes: [],
    ambiguous: false,
  }),
  topicSummary: classified.matchResult?.llmClassification?.topicSummary || "",
  conclusionOneLiner: classified.matchResult?.llmClassification?.conclusionOneLiner || "",
};

function cardOf(result: PipelineResult): FeishuCard {
  const people = resolvePersonnelFromDetail(detail, result.contextFacts);
  if (isSopGenerateFailure(result)) return buildSopGenerateErrorCard(result, people);
  if (result.outputPath === "sop_generated") return buildSopCard(result, people);
  if (result.outputPath === "needs_field_clarification" || result.outputPath === "needs_requirement_clarification") {
    return buildAskCard(result, people);
  }
  return buildSceneConfirmCard(result, people, collectSceneCandidates(result.matchResult));
}

const card = cardOf(l25);
const topic = demoTopicTitle(l25);
const uploaded = Object.entries(l25.agentInput.omsFacts.attachmentStatus)
  .filter(([, status]) => status === "uploaded")
  .map(([name]) => name);
const fileNames = l25.agentInput.omsFacts.uploadedFiles.map((f) => f.fileName);
const cardText = JSON.stringify(card);
const wronglyAsks = ["标签文件", "操作说明附件", "视频拍摄SOP"].filter(
  (name) => cardText.includes(`${name}（未上传）`) || cardText.includes(`❌ ${name}`),
);

const sent = await sendCardInNewTopic(TEST_CHAT, topic, card);
const note = [
  "【附件+标题验证】VASC000000366432（未写 OMS）",
  `话题标题应是摘要，不是原文前50字：${topic}`,
  `已识别已传附件：${uploaded.join("、") || "无"}`,
  `文件：${fileNames.join("、")}`,
  `L2.5 缺附件：${(l25.missingAttachments || []).join("、") || "无"}`,
  wronglyAsks.length ? `⚠ 卡片仍把已传附件标成未上传：${wronglyAsks.join("、")}` : "卡片没有把标签/操作说明/视频标成未上传。",
  `outputPath=${l25.outputPath} node=${l25.node}`,
].join("\n");
await sendConsultThreadText(sent.threadId, note);

const report = {
  at: new Date().toISOString(),
  chatId: TEST_CHAT,
  topic,
  messageId: sent.messageId,
  threadId: sent.threadId,
  outputPath: l25.outputPath,
  missingAttachments: l25.missingAttachments,
  uploaded,
  fileNames,
  wronglyAsks,
  topicSummary: l25.matchResult?.llmClassification?.topicSummary || "",
};
writeFileSync(resolve(outDir, "feishu-send.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (wronglyAsks.length) process.exit(1);
