/**
 * Resend the already-approved 342198 green SOP to the test group.
 * Does not call the LLM. Unmasks the customer name on the stored card.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../../lib/case-store.ts";
import { getTargetChatId } from "../../lib/canary.ts";
import { unmaskStarsInJson } from "../../lib/customer-display.ts";
import { loadEnvFiles, copilotDir } from "../../lib/env.ts";
import { sendCardInNewTopic } from "../../lib/feishu-bot.ts";
import type { FeishuCard } from "../../lib/feishu-card.ts";

const ORDER = "VASC000000342198";
const NAME = "RED NOW LIMITED";
const TITLE = "VASC000000342198 | 19104098/RED NOW LIMITED | USWC | 裸货条码异常按 T3/B3 辨识 SKU 补贴商品条码后上架";

loadEnvFiles();
const outDir = resolve(copilotDir(), "_runs/20260916_342198_green");
mkdirSync(outDir, { recursive: true });

const greenStore = new CaseStore(resolve(copilotDir(), "_runs/20260916_sop_quote_fix/case-store.json"));
const rec = greenStore.get(ORDER);
if (!rec?.lastCard) throw new Error("missing green lastCard in sop_quote_fix store");
if ((rec.lastCard as FeishuCard).header?.template !== "green") {
  throw new Error("sop_quote_fix lastCard is not green");
}

const card = unmaskStarsInJson(rec.lastCard as FeishuCard, NAME);
const blob = JSON.stringify(card);
if (blob.includes("***") || blob.includes("SOP 生成失败") || blob.includes("Expected ','")) {
  throw new Error("green card still has stars or SOP error copy");
}

const chatId = getTargetChatId();
const sent = await sendCardInNewTopic(chatId, TITLE, card);

const e2eStore = new CaseStore(resolve(copilotDir(), "_runs/20260916_canary_e2e/case-store.json"));
e2eStore.upsert({
  vascNo: ORDER,
  status: "sop_ready",
  customer: NAME,
  warehouse: rec.warehouse,
  aiOutputPath: "sop_generated",
  aiGeneratedText: rec.aiGeneratedText,
  llmSop: rec.llmSop,
  matchResult: rec.matchResult,
  llmError: null,
  failureType: "",
  lastCard: card,
  feishuThreadId: sent.threadId,
  feishuMessageId: sent.messageId,
  feishuTopicId: sent.topicId,
  notifyChannel: "card",
});

const result = {
  orderNo: ORDER,
  customer: NAME,
  chatId,
  topicId: sent.topicId,
  threadId: sent.threadId,
  template: card.header.template,
};
writeFileSync(resolve(outDir, "sent.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
