/**
 * One-off: send green SOP card for VASC000000318543, then run the
 * "场景不对" flow (blue scene card) without writing OMS.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../../../internal-review-copilot/lib/case-store.ts";
import { loadEnvFiles, projectDir } from "../../../internal-review-copilot/lib/env.ts";
import { sendCardInNewTopic, sendCardMessage } from "../../../internal-review-copilot/lib/feishu-bot.ts";
import { buildSceneConfirmCard, buildSopCard, demoTopicTitle } from "../../../internal-review-copilot/lib/feishu-card.ts";
import { asRecord, asText } from "../../../internal-review-copilot/lib/oms-adapter.ts";
import { collectSceneCandidates } from "../../../internal-review-copilot/lib/parse-scene-reply.ts";
import { resolvePersonnelFromDetail } from "../../../internal-review-copilot/lib/personnel.ts";
import { runPipeline } from "../../../internal-review-copilot/lib/run-pipeline.ts";
import type { JsonRecord } from "../../../internal-review-copilot/lib/types.ts";

const ORDER = "VASC000000318543";
const CHAT = "oc_80b07f38ed6833df3787a97a496f1097";

function mainOut(): string {
  return resolve(projectDir(), "_runs/20260914_historical_batch/scene-wrong-test");
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const outDir = mainOut();
  mkdirSync(outDir, { recursive: true });

  const details = JSON.parse(
    readFileSync(resolve(projectDir(), "_runs/20260914_historical_batch/details.json"), "utf8"),
  ) as JsonRecord[];
  const detail = details.find((item) => asText(item.orderNo) === ORDER);
  if (!detail) throw new Error(`details.json 没有 ${ORDER}`);
  writeFileSync(resolve(outDir, "listen-inputs.json"), `${JSON.stringify([detail], null, 2)}\n`);

  const per = asRecord(
    JSON.parse(readFileSync(resolve(projectDir(), "_runs/20260914_historical_batch/per-case", `${ORDER}.json`), "utf8")),
  );
  const final = asRecord(per.final);
  const header = asRecord(detail.listHeader);
  const customer = asRecord(header.customer);
  const warehouse = asRecord(header.warehouse);

  const result = await runPipeline(detail, {
    skipLlm: false,
    sceneLlm: false,
    overrideScene: asText(final.sceneKey) || "instock_split_sku",
  });
  if (!result || result.outputPath !== "sop_generated" || result.failureGate === "llm-generate-sop") {
    throw new Error(`SOP 未生成：path=${result?.outputPath} gate=${result?.failureGate} err=${result?.llm?.error || ""}`);
  }
  const people = resolvePersonnelFromDetail(detail, result.contextFacts);
  const green = buildSopCard(result, people);
  if (!JSON.stringify(green).includes("scene_wrong")) {
    throw new Error("绿卡缺少 scene_wrong 按钮");
  }
  const sent = await sendCardInNewTopic(CHAT, demoTopicTitle("sop_generated", ORDER), green);
  const store = new CaseStore(resolve(outDir, "case-store.json"));
  store.upsert({
    vascNo: ORDER,
    status: "sop_ready",
    customer: asText(customer.customerName),
    warehouse: asText(warehouse.warehouseName) || asText(header.warehouseName),
    aiOutputPath: result.outputPath,
    aiGeneratedText: result.llm?.text || result.analysis || "",
    llmSop: result.llm?.sop || null,
    matchResult: result.matchResult || {},
    confirmedScene: result.matchResult?.sceneKey || "",
    confirmedSceneName: result.matchResult?.scenarioName || "",
    lastCard: green,
    feishuThreadId: sent.threadId,
    feishuMessageId: sent.messageId,
    notifyChannel: "card",
    failureType: "",
  });
  console.log(`green_card thread=${sent.threadId} messageId=${sent.messageId} topic=${sent.topicId || "-"}`);

  const preview = await runPipeline(detail, { skipLlm: true, sceneLlm: false });
  if (!preview) throw new Error("skipLlm pipeline 空结果");
  const candidates = collectSceneCandidates(preview.matchResult);
  const blue = buildSceneConfirmCard(preview, people, candidates);
  if (JSON.stringify(blue).includes("confirm_sop_write")) {
    throw new Error("蓝卡不应带写入 OMS 按钮");
  }
  const blueSent = await sendCardMessage(CHAT, blue, sent.threadId);
  store.upsert({
    vascNo: ORDER,
    status: "awaiting_scene_confirm",
    confirmedScene: "",
    confirmedSceneName: "",
    failureType: "scene_uncertain",
    lastCard: blue,
    feishuMessageId: blueSent.messageId,
    sceneCandidateList: candidates,
    matchResult: preview.matchResult || {},
  });
  console.log(`blue_card messageId=${blueSent.messageId} status=awaiting_scene_confirm`);
  console.log(`OMS_WRITE_ENABLED=${process.env.OMS_WRITE_ENABLED}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
