/**
 * 把仍待审核、需要销售/客服补信息的单发到当前目标群。
 * 40 上目标群是【增值】异常沟通。不点审核通过；已生成 SOP 的不重发。
 *
 *   npx tsx scripts/send-pending-clarifications.ts --store _runs/live_poll/case-store.json --out _runs/live_poll
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CanaryGate, getTargetChatId } from "../lib/canary.ts";
import { isRagEnabled } from "../lib/case-retriever.ts";
import { CaseStore } from "../lib/case-store.ts";
import { copilotDir, loadEnvFiles } from "../lib/env.ts";
import { sendCardInNewTopic } from "../lib/feishu-bot.ts";
import {
  buildAskCard,
  buildAttachmentPendingCard,
  demoTopicTitle,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { isHumanSopFilledNotice } from "../lib/human-sop-alert.ts";
import { asArray, asRecord, asText, isAllowedServiceAtom } from "../lib/oms-adapter.ts";
import { resolvePersonnelFromDetailLive } from "../lib/personnel.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { JsonRecord } from "../lib/types.ts";

loadEnvFiles();

const EXCEPTION_CHAT = "oc_6566160ccb2def51937469fe8144efdb";
const GAP_MS = 12_000;
const CLARIFICATION_STATUS = new Set([
  "needs_clarification",
  "needs_attachment",
  "awaiting_reply",
  "clarification_sent",
]);

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function isCopilotScope(detail: JsonRecord): boolean {
  return asArray(detail.atoms).map(asRecord).some((atom) => isAllowedServiceAtom(atom));
}

function isOrangeCard(card: unknown): boolean {
  const rec = asRecord(card);
  const header = asRecord(rec.header);
  return asText(header.template) === "orange";
}

function cardTitle(card: unknown): string {
  const header = asRecord(asRecord(card).header);
  return asText(asRecord(header.title).content);
}

/** 补信息卡才进异常沟通。人工 SOP / SOP 待写入 / 写入取消 不要再建话题。 */
function isSalesCsClarificationCard(card: unknown): boolean {
  if (!isOrangeCard(card)) return false;
  if (isHumanSopFilledNotice(card)) return false;
  const title = cardTitle(card);
  if (/SOP 待写入|OMS 写入已取消/.test(title)) return false;
  return true;
}

function isClarificationPath(path: string): boolean {
  return (
    path === "needs_requirement_clarification" ||
    path === "needs_field_clarification" ||
    path === "needs_attachment"
  );
}

async function main(): Promise<void> {
  const storePath = resolve(copilotDir(), arg("store", "_runs/live_poll/case-store.json"));
  const outDir = resolve(copilotDir(), arg("out", "_runs/live_poll"));
  mkdirSync(outDir, { recursive: true });
  const logPath = resolve(copilotDir(), "logs/poll.log");
  const reportDir = resolve(copilotDir(), "_runs/20260917_clarification_exception");
  mkdirSync(reportDir, { recursive: true });

  const store = new CaseStore(storePath);
  new CanaryGate(store);
  const chatId = getTargetChatId() || EXCEPTION_CHAT;
  const log = (line: string) => {
    console.log(line);
    try {
      appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`, "utf8");
    } catch {
      /* ignore */
    }
  };
  log(`clarification_catchup_start chat=${chatId} store=${storePath}`);

  const pullMod = await import("./pull_ow01v1602_review_orders.mjs");
  const pulled = await pullMod.pullReviewOrders({
    anyDate: true,
    statusDesc: "待审核",
    maxPages: 12,
    writeFiles: true,
    outDir,
  });
  const details = (pulled.details || []) as JsonRecord[];
  const inScope = details.filter(isCopilotScope);
  log(`clarification_catchup pending=${details.length} copilot=${inScope.length}`);

  const rows: Array<Record<string, string>> = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const detail of inScope) {
    const vascNo = asText(detail.orderNo);
    if (!vascNo) continue;
    const rec = store.get(vascNo);
    const status = rec?.status || "";
    if (rec?.failureType === "human_sop_filled" || isHumanSopFilledNotice(rec?.lastCard) || isHumanSopFilledNotice(rec?.llmError)) {
      skipped += 1;
      rows.push({ vascNo, action: "skip", status, reason: "human_sop_filled_dm_only" });
      log(`clarification_skip ${vascNo} human_sop_filled`);
      continue;
    }
    let card: FeishuCard | null = rec?.lastCard && isSalesCsClarificationCard(rec.lastCard) ? (rec.lastCard as FeishuCard) : null;
    let title = "";
    let reason = "";

    if (card && (CLARIFICATION_STATUS.has(status) || isSalesCsClarificationCard(rec?.lastCard))) {
      reason = `repost_store status=${status || "-"}`;
      title = `${vascNo} | ${rec?.customer || ""} | ${rec?.warehouse || ""}`.replace(/ \| $/g, "");
    } else if (CLARIFICATION_STATUS.has(status) && !card) {
      reason = "rebuild_pipeline";
    } else if (!rec || status === "pending") {
      reason = "new_assess";
    } else {
      skipped += 1;
      rows.push({ vascNo, action: "skip", status, reason: "not_clarification" });
      log(`clarification_skip ${vascNo} status=${status}`);
      continue;
    }

    if (!card) {
      try {
        const result = (await runPipeline(detail, {
          skipLlm: false,
          sceneLlm: true,
          sceneLlmVersion: 2,
          ragEnabled: isRagEnabled(),
        })) as PipelineResult | null;
        if (!result) {
          skipped += 1;
          rows.push({ vascNo, action: "skip", status, reason: "no_atom" });
          continue;
        }
        const path = result.outputPath || "";
        store.upsert({
          vascNo,
          status: isClarificationPath(path) ? (path === "needs_attachment" ? "needs_attachment" : "needs_clarification") : rec?.status || "first_assessed",
          customer: asText(asRecord(detail.listHeader).customerName),
          warehouse: asText(asRecord(asRecord(detail.listHeader).warehouse).warehouseName),
          aiOutputPath: path,
          missingFields: result.missing,
          lastProcessedAt: new Date().toISOString(),
        });
        if (!isClarificationPath(path) && path !== "sop_generated") {
          skipped += 1;
          rows.push({ vascNo, action: "skip", status: path, reason: `pipeline_${path}` });
          log(`clarification_skip ${vascNo} pipeline=${path}`);
          continue;
        }
        if (path === "sop_generated" && !(result.missingAttachments || []).length) {
          skipped += 1;
          rows.push({ vascNo, action: "skip", status: path, reason: "sop_no_ask_sales" });
          log(`clarification_skip ${vascNo} sop_generated`);
          continue;
        }
        const people = await resolvePersonnelFromDetailLive(detail, result.contextFacts);
        card =
          path === "sop_generated" || (result.missingAttachments || []).length
            ? buildAttachmentPendingCard(result, people)
            : buildAskCard(result, people);
        title = demoTopicTitle(result);
        reason = `${reason} pipeline=${path}`;
      } catch (err) {
        failed += 1;
        rows.push({ vascNo, action: "fail", status, reason: err instanceof Error ? err.message : String(err) });
        log(`clarification_error ${vascNo} ${err instanceof Error ? err.message : err}`);
        continue;
      }
    }

    if (!card?.header) {
      skipped += 1;
      rows.push({ vascNo, action: "skip", status, reason: "no_card" });
      continue;
    }

    try {
      if (sent > 0) await sleep(GAP_MS);
      const sentMsg = await sendCardInNewTopic(chatId, title || vascNo, card);
      store.upsert({
        vascNo,
        feishuThreadId: sentMsg.threadId || rec?.feishuThreadId || null,
        feishuMessageId: sentMsg.messageId || rec?.feishuMessageId || null,
        feishuTopicId: sentMsg.topicId || rec?.feishuTopicId || null,
        lastCard: card,
        notifyChannel: "card",
        clarificationSentAt: new Date().toISOString(),
      });
      sent += 1;
      rows.push({ vascNo, action: "sent", status, reason, topic: sentMsg.topicId || "" });
      log(`clarification_sent ${vascNo} topic=${sentMsg.topicId || "-"} ${reason}`);
    } catch (err) {
      failed += 1;
      rows.push({ vascNo, action: "fail", status, reason: err instanceof Error ? err.message : String(err) });
      log(`clarification_send_fail ${vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }

  const report = [
    "# 待审核补信息卡 → 【增值】异常沟通",
    "",
    `时间：${new Date().toISOString()}`,
    `目标群：${chatId}`,
    "",
    `| 项 | 数量 |`,
    `|---|---|`,
    `| 待审核拉到 | ${details.length} |`,
    `| Copilot 会接 | ${inScope.length} |`,
    `| 已发到异常沟通 | ${sent} |`,
    `| 跳过（已是 SOP/转人工等） | ${skipped} |`,
    `| 失败 | ${failed} |`,
    "",
    "## 逐单",
    "",
    "| 单号 | 动作 | 原状态 | 说明 |",
    "|---|---|---|---|",
    ...rows.map((row) => `| ${row.vascNo} | ${row.action} | ${row.status || "-"} | ${row.reason}${row.topic ? " " + row.topic : ""} |`),
    "",
  ].join("\n");
  writeFileSync(resolve(reportDir, "result.md"), `${report}\n`, "utf8");
  writeFileSync(resolve(reportDir, "rows.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  log(`clarification_catchup_done sent=${sent} skipped=${skipped} failed=${failed}`);
  if (failed) process.exit(1);
}

await main();
