/**
 * Replay canary-reviewed cards into the official Feishu group.
 */
import { sendCardInNewTopic } from "./feishu-bot.ts";
import { getTargetChatId, type CanaryGate } from "./canary.ts";
import {
  formatCustomerLabel,
  isMaskedCustomerName,
  textHasMaskedCustomer,
  unmaskStarsInJson,
  visibleCustomerName,
} from "./customer-display.ts";
import { lookupCustomerName } from "./oms-customer.ts";
import type { CaseStore } from "./case-store.ts";
import type { FeishuCard } from "./feishu-card.ts";

export async function replayCanaryToOfficial(args: {
  store: CaseStore;
  canary: CanaryGate;
  skipFeishu?: boolean;
  log: (line: string) => void;
}): Promise<{ sent: number; skipped: number; failed: number }> {
  const pending = args.canary.pendingReplayOrderNos();
  const stats = { sent: 0, skipped: 0, failed: 0 };
  if (!pending.length) return stats;
  if (args.skipFeishu) {
    args.log(`canary_replay_skip_feishu n=${pending.length} ${pending.join(",")}`);
    return stats;
  }
  const chatId = getTargetChatId();
  args.log(`canary_replay_start n=${pending.length} chat=${chatId}`);
  for (const vascNo of pending) {
    const rec = args.store.get(vascNo);
    const card = rec?.lastCard as FeishuCard | undefined;
    if (!rec || !card?.header) {
      args.log(`canary_replay_skip ${vascNo} no lastCard`);
      args.canary.markReplayed(vascNo);
      stats.skipped += 1;
      continue;
    }
    if (card.header.template === "red" && /SOP 生成失败/.test(String(card.header.title?.content || ""))) {
      args.log(`canary_replay_skip ${vascNo} lastCard is SOP error`);
      args.canary.markReplayed(vascNo);
      stats.skipped += 1;
      continue;
    }
    try {
      let customer = rec.customer || "";
      let cardToSend = card;
      if (isMaskedCustomerName(customer) || textHasMaskedCustomer(JSON.stringify(card))) {
        const looked = await lookupCustomerName(vascNo);
        if (looked) {
          customer = looked;
          cardToSend = unmaskStarsInJson(card, looked);
        } else {
          customer = visibleCustomerName(customer);
        }
      }
      const title = [rec.vascNo, formatCustomerLabel("", customer) === "未填写" ? "" : customer, rec.warehouse]
        .filter(Boolean)
        .join(" | ");
      const sent = await sendCardInNewTopic(chatId, title, cardToSend);
      args.store.upsert({
        vascNo,
        customer,
        feishuThreadId: sent.threadId || rec.feishuThreadId,
        feishuMessageId: sent.messageId || rec.feishuMessageId,
        feishuTopicId: sent.topicId || rec.feishuTopicId,
        lastCard: cardToSend,
        notifyChannel: "card",
      });
      args.canary.markReplayed(vascNo);
      stats.sent += 1;
      args.log(`canary_replay_sent ${vascNo} topic=${sent.topicId || "-"} root=${sent.threadId}`);
    } catch (err) {
      stats.failed += 1;
      args.log(`canary_replay_error ${vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
  return stats;
}
