import { appendBadcase } from "./badcase-log.ts";
import { CaseStore } from "./case-store.ts";
import { envText } from "./env.ts";
import {
  aiMarker,
  getThreadMessages,
  sendCardMessage,
  sendConsultThreadText,
  updateConsultTextMessage,
} from "./feishu-bot.ts";
import { buildSopCard, type DemoPersonnel } from "./feishu-card.ts";
import { asArray, asRecord, asText } from "./oms-adapter.ts";
import { resolvePersonnelFromDetail } from "./personnel.ts";
import { runPipeline } from "./run-pipeline.ts";
import { findScenarioCard } from "./scenario-cards.ts";
import {
  MAX_SOP_EDITS,
  isEchoOfSop,
  pickLatestEditAfter,
  previewSopStream,
  sceneKeyForSopEdit,
  sopEditCountOf,
  stripNotesIfRequested,
} from "./sop-edit.ts";
import { repliesFromFeishu } from "./summarize-reply.ts";
import type { JsonRecord } from "./types.ts";

const inFlight = new Set<string>();

function applyDemoRequiredFieldKeys(detail: JsonRecord): void {
  const keys = asArray(detail.demoRequiredFieldKeys).map((item) => asText(item)).filter(Boolean);
  const sceneKey = asText(detail.demoSceneKey);
  if (!keys.length || !sceneKey) return;
  const card = findScenarioCard(sceneKey);
  if (!card) return;
  card.requiredAttachmentPolicy.requiredFieldKeys = keys;
}

function progressText(vascNo: string, instruction: string, body: string): string {
  const preview = asText(body).slice(0, 2800);
  return [
    `🔄 正在改写 SOP（${vascNo}）`,
    `已收到意见：${instruction}`,
    "",
    preview || "正在生成，请稍候…",
    "",
    aiMarker(),
  ].join("\n");
}

function throttle(fn: (text: string) => Promise<void>, ms: number): (text: string) => void {
  let last = 0;
  let pending = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    timer = null;
    last = Date.now();
    const text = pending;
    void fn(text).catch(() => undefined);
  };
  return (text: string) => {
    pending = text;
    const wait = ms - (Date.now() - last);
    if (wait <= 0) {
      if (timer) clearTimeout(timer);
      flush();
      return;
    }
    if (timer) return;
    timer = setTimeout(flush, wait);
  };
}

export async function refreshSopEdits(args: {
  store: CaseStore;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  chatId?: string;
  log: (line: string) => void;
}): Promise<void> {
  const chatId = args.chatId || envText("FEISHU_TEST_CHAT_ID");
  if (!chatId) return;
  const byOrder = new Map(args.details.map((detail) => [asText(detail.orderNo), detail]));
  const botOpenId = envText("FEISHU_BOT_OPEN_ID");
  const editing = args.store.list().filter((rec) => rec.status === "sop_editing");
  for (const rec of editing) {
    if (!rec.feishuThreadId || inFlight.has(rec.vascNo)) continue;
    const editCount = sopEditCountOf(rec);
    if (editCount >= MAX_SOP_EDITS) {
      args.store.upsert({ vascNo: rec.vascNo, status: "transferred" });
      appendBadcase({
        type: "sop_edit_exhausted",
        vascNo: rec.vascNo,
        originalSop: rec.aiGeneratedText,
        reason: "已修改 3 次仍不满意，转人工处理",
        editCount,
      });
      args.log(`sop_edit_exhausted ${rec.vascNo} → transferred`);
      continue;
    }
    try {
      const messages = await getThreadMessages(chatId, rec.feishuThreadId);
      const humanReplies = repliesFromFeishu(messages, botOpenId ? { botOpenId } : {});
      const editInstruction = pickLatestEditAfter(humanReplies, rec.sopEditRequestedAt || "", [
        rec.lastSopEditInstruction || "",
        rec.aiGeneratedText || "",
      ]);
      if (!editInstruction) continue;
      if (isEchoOfSop(editInstruction, rec.aiGeneratedText)) {
        args.log(`sop_edit_skip_echo ${rec.vascNo}`);
        continue;
      }
      const detail = byOrder.get(rec.vascNo);
      if (!detail) {
        args.log(`sop_edit_missing_detail ${rec.vascNo}`);
        continue;
      }
      const sceneKey = sceneKeyForSopEdit(rec);
      if (!sceneKey) {
        args.log(`sop_edit_no_scene ${rec.vascNo}`);
        continue;
      }
      inFlight.add(rec.vascNo);
      applyDemoRequiredFieldKeys(detail);
      const originalSop = rec.aiGeneratedText || "";
      args.log(`sop_edit_start ${rec.vascNo} instruction=${editInstruction.slice(0, 40)}`);
      const progress = await sendConsultThreadText(
        rec.feishuThreadId,
        progressText(rec.vascNo, editInstruction, "正在生成，请稍候…"),
      );
      let streamed = "";
      const push = throttle(async (text) => {
        if (!progress.messageId) return;
        await updateConsultTextMessage(progress.messageId, text);
      }, 900);
      const result = await runPipeline(detail, {
        skipLlm: false,
        sceneLlm: false,
        overrideScene: sceneKey,
        sopEditInstruction: editInstruction,
        previousSop: originalSop,
        onDelta: (chunk) => {
          streamed += chunk;
          push(progressText(rec.vascNo, editInstruction, previewSopStream(streamed) || "正在生成…"));
        },
      });
      if (!result || result.outputPath !== "sop_generated") {
        args.store.upsert({ vascNo: rec.vascNo, status: "transferred", lastSopEditInstruction: editInstruction });
        appendBadcase({
          type: "sop_revise_failed",
          vascNo: rec.vascNo,
          originalSop,
          editInstruction,
          outputPath: result?.outputPath || "",
          llmError: result?.llm?.error || "",
        });
        if (progress.messageId) {
          await updateConsultTextMessage(
            progress.messageId,
            `❌ SOP 改写失败，已转人工。\n${aiMarker()}`,
          ).catch(() => undefined);
        }
        args.log(`sop_edit_failed ${rec.vascNo} → transferred`);
        continue;
      }
      const nextCount = editCount + 1;
      const revisedText = stripNotesIfRequested(result.llm?.text || result.analysis || "", editInstruction);
      if (result.llm) result.llm.text = revisedText;
      if (result.llm?.sop) {
        result.llm.sop.sopText = revisedText;
        result.llm.sop.warehouseSop = stripNotesIfRequested(result.llm.sop.warehouseSop, editInstruction);
      }
      if (progress.messageId) {
        await updateConsultTextMessage(
          progress.messageId,
          progressText(rec.vascNo, editInstruction, `${revisedText}\n\n改写完成，请确认下方绿色卡片。`),
        ).catch(() => undefined);
      }
      const card = buildSopCard(
        result,
        resolvePersonnelFromDetail(detail, result.contextFacts) || args.personnel,
        { revised: true, revision: nextCount },
      );
      const sent = await sendCardMessage(chatId, card, rec.feishuThreadId);
      args.store.upsert({
        vascNo: rec.vascNo,
        status: "sop_ready",
        aiGeneratedText: revisedText,
        llmSop: result.llm?.sop || rec.llmSop || null,
        aiOutputPath: result.outputPath,
        matchResult: result.matchResult || rec.matchResult,
        sopEditCount: nextCount,
        lastSopEditInstruction: editInstruction,
        lastCard: card,
        feishuThreadId: rec.feishuThreadId,
        feishuMessageId: sent.messageId || rec.feishuMessageId,
        notifyChannel: "card",
      });
      appendBadcase({
        type: "sop_revised",
        vascNo: rec.vascNo,
        originalSop,
        editInstruction,
        revisedSop: revisedText,
        editCount: nextCount,
      });
      args.log(`sop_edited ${rec.vascNo} → sop_ready (revised ${nextCount})`);
    } catch (err) {
      args.log(`sop_edit_error ${rec.vascNo} ${err instanceof Error ? err.message : err}`);
    } finally {
      inFlight.delete(rec.vascNo);
    }
  }
}
