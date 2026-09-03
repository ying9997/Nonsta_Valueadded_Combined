/**
 * OMS poll + first assess + reply / reminder loop.
 *
 *   npx tsx internal-review-copilot/scripts/poll-and-assess.ts --once
 *   npx tsx internal-review-copilot/scripts/poll-and-assess.ts --interval 600
 *
 * Optional:
 *   --date 2026-09-03 --input <details.json> --store <case-store.json>
 *   --skip-feishu --skip-llm --out <_runs/...>
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CaseStore } from "../lib/case-store.ts";
import { envText, loadEnvFiles, projectDir } from "../lib/env.ts";
import {
  getThreadMessages,
  resolveTestChatId,
  sendDedupedOrderMessage,
} from "../lib/feishu-bot.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { repliesFromFeishu, summarizeReply } from "../lib/summarize-reply.ts";
import type { CaseRecord, CaseStatus, JsonRecord } from "../lib/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const REMIND_AFTER_MS = 4 * 60 * 60 * 1000;

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function todayShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
}

function appendLog(logPath: string, line: string): void {
  const stamp = new Date().toISOString();
  appendFileSync(logPath, `[${stamp}] ${line}\n`, "utf8");
  console.log(line);
}

function headerPeople(detail: JsonRecord): { salesRep: string; csRep: string; status: string } {
  const header = asRecord(detail.listHeader);
  const customer = asRecord(header.customer);
  const sale = asRecord(customer.sale);
  const cs = asRecord(customer.customerService);
  return {
    salesRep: asText(sale.name) || asText(sale.userName) || asText(customer.sale) || "",
    csRep: asText(cs.name) || asText(cs.userName) || asText(customer.customerService) || "",
    status: asText(header.statusDesc) || asText(header.status),
  };
}

function statusAfterAssess(result: PipelineResult): CaseStatus {
  if (result.outputPath === "transfer_human" || result.outputPath === "invalid_input") return "transferred";
  if (result.outputPath === "sop_generated") return "sop_ready";
  if (result.outputPath === "needs_requirement_clarification" || result.outputPath === "needs_field_clarification") {
    return "first_assessed";
  }
  return "first_assessed";
}

async function loadDetails(options: {
  date: string;
  input: string;
  logPath: string;
}): Promise<JsonRecord[]> {
  if (options.input) {
    const raw = JSON.parse(readFileSync(options.input, "utf8"));
    return (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
  }
  const pullMod = await import("./pull_ow01v1602_review_orders.mjs");
  const pulled = await pullMod.pullReviewOrders({
    date: options.date,
    statusDesc: "待审核",
    maxPages: 5,
    writeFiles: true,
    outDir: `_runs/${options.date.replaceAll("-", "")}_ow01v1602_review_orders`,
  });
  appendLog(options.logPath, `oms_pull detailCount=${pulled.details.length}`);
  return pulled.details.map(asRecord);
}

async function assessNew(
  details: JsonRecord[],
  store: CaseStore,
  options: { skipLlm: boolean; skipFeishu: boolean; logPath: string },
): Promise<void> {
  for (const detail of details) {
    const vascNo = asText(detail.orderNo);
    if (!vascNo) continue;
    if (store.shouldSkipAssess(vascNo)) {
      appendLog(options.logPath, `skip_existing ${vascNo} status=${store.get(vascNo)?.status}`);
      continue;
    }
    const people = headerPeople(detail);
    store.upsert({
      vascNo,
      status: "pending",
      customer: asText(asRecord(asRecord(detail.listHeader).customer).customerName),
      warehouse: asText(asRecord(asRecord(detail.listHeader).warehouse).warehouseName),
      salesRep: people.salesRep,
      csRep: people.csRep,
      omsAuditStatus: people.status,
    });
    try {
      const result = await runPipeline(detail, { skipLlm: options.skipLlm });
      if (!result) {
        appendLog(options.logPath, `skip_no_atom ${vascNo}`);
        continue;
      }
      const nextStatus = statusAfterAssess(result);
      store.upsert({
        vascNo,
        status: nextStatus,
        customer: result.contextFacts?.customerName || "",
        warehouse: result.contextFacts?.warehouseName || result.contextFacts?.warehouseCode || "",
        salesRep: people.salesRep,
        csRep: people.csRep,
        omsAuditStatus: people.status,
        aiOutputPath: result.outputPath,
        aiGeneratedText: result.llm?.text || result.analysis || "",
        matchResult: result.matchResult || {},
        missingFields: result.missing,
        ruleOutputPath: result.ruleOutputPath,
        llmError: result.llm?.error || null,
        riskFlags: result.riskFlags,
        lastProcessedAt: new Date().toISOString(),
      });
      appendLog(options.logPath, `assessed ${vascNo} rule=${result.ruleOutputPath} out=${result.outputPath}`);

      if (
        !options.skipFeishu &&
        (result.outputPath === "needs_requirement_clarification" || result.outputPath === "needs_field_clarification")
      ) {
        await sendClarification(result, store, options.logPath);
      } else if (!options.skipFeishu && result.outputPath === "transfer_human") {
        await sendTransferNotice(result, store, options.logPath);
      }
    } catch (err) {
      appendLog(options.logPath, `assess_error ${vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function sendClarification(result: PipelineResult, store: CaseStore, logPath: string): Promise<void> {
  try {
    const chatId = resolveTestChatId();
    const mentionId = envText("FEISHU_TEST_USER_ID");
    const mentionName = envText("FEISHU_TEST_USER_NAME") || "审核协作";
    const sent = await sendDedupedOrderMessage({
      chatId,
      orderNo: result.orderNo,
      title: `增值单 ${result.orderNo} ${
        result.ruleOutputPath === "needs_requirement_clarification" ? "缺需求" : "缺资料"
      }`,
      body: result.llm?.text || result.analysis || "",
      mention: mentionId ? { userId: mentionId, name: mentionName } : undefined,
    });
    if (sent.skipped) {
      appendLog(logPath, `feishu_skip ${result.orderNo} ${sent.reason}`);
      return;
    }
    store.upsert({
      vascNo: result.orderNo,
      status: "awaiting_reply",
      feishuThreadId: sent.threadId || sent.messageId,
      clarificationSentAt: new Date().toISOString(),
    });
    appendLog(logPath, `feishu_sent ${result.orderNo} topic=${sent.topicId || "-"} root=${sent.threadId}`);
  } catch (err) {
    appendLog(logPath, `feishu_error ${result.orderNo} ${err instanceof Error ? err.message : err}`);
  }
}

async function sendTransferNotice(result: PipelineResult, store: CaseStore, logPath: string): Promise<void> {
  try {
    const chatId = resolveTestChatId();
    const mentionId = envText("FEISHU_TEST_USER_ID");
    const mentionName = envText("FEISHU_TEST_USER_NAME") || "审核员";
    const sent = await sendDedupedOrderMessage({
      chatId,
      orderNo: result.orderNo,
      title: `增值单 ${result.orderNo} 转人工`,
      body:
        result.llm?.text ||
        result.analysis ||
        `增值单 ${result.orderNo} 当前规则无法自动处理，请人工审核。`,
      mention: mentionId ? { userId: mentionId, name: mentionName } : undefined,
    });
    store.upsert({
      vascNo: result.orderNo,
      status: "transferred",
      feishuThreadId: sent.threadId || sent.messageId,
      clarificationSentAt: new Date().toISOString(),
    });
    appendLog(
      logPath,
      sent.skipped
        ? `feishu_skip ${result.orderNo} ${sent.reason || ""}`
        : `feishu_transfer_sent ${result.orderNo} topic=${sent.topicId || "-"} root=${sent.threadId}`,
    );
  } catch (err) {
    appendLog(logPath, `feishu_transfer_error ${result.orderNo} ${err instanceof Error ? err.message : err}`);
  }
}

async function refreshReplies(store: CaseStore, logPath: string): Promise<void> {
  const chatId = envText("FEISHU_TEST_CHAT_ID");
  if (!chatId) return;
  for (const rec of store.awaitingReply()) {
    if (!rec.feishuThreadId) continue;
    try {
      const messages = await getThreadMessages(chatId, rec.feishuThreadId);
      const human = repliesFromFeishu(messages);
      if (!human.length) {
        maybeRemind(rec, store, logPath);
        continue;
      }
      store.upsert({
        vascNo: rec.vascNo,
        status: "reply_received",
        replyReceivedAt: new Date().toISOString(),
      });
      appendLog(logPath, `reply_received ${rec.vascNo} n=${human.length}`);
    } catch (err) {
      appendLog(logPath, `reply_poll_error ${rec.vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
}

function maybeRemind(rec: CaseRecord, store: CaseStore, logPath: string): void {
  if (rec.status !== "awaiting_reply" && rec.status !== "clarification_sent") return;
  if (rec.reminderSentAt) return;
  const sentAt = rec.clarificationSentAt ? Date.parse(rec.clarificationSentAt) : 0;
  if (!sentAt || Date.now() - sentAt < REMIND_AFTER_MS) return;
  const chatId = envText("FEISHU_TEST_CHAT_ID");
  if (!chatId || !rec.feishuThreadId) return;
  sendDedupedOrderMessage({
    chatId,
    orderNo: rec.vascNo,
    title: `${rec.vascNo} 催办`,
    body: `您好，增值单 ${rec.vascNo} 仍在等待补充，超过 4 小时未收到回复。请客服/销售协助跟进。AI 不代填事实、不自动审核。`,
    threadId: rec.feishuThreadId,
  })
    .then((sent) => {
      store.upsert({
        vascNo: rec.vascNo,
        reminderSentAt: new Date().toISOString(),
        feishuThreadId: sent.threadId || rec.feishuThreadId,
      });
      appendLog(logPath, `reminded ${rec.vascNo} skipped=${sent.skipped}`);
    })
    .catch((err) => {
      appendLog(logPath, `remind_error ${rec.vascNo} ${err instanceof Error ? err.message : err}`);
    });
}

async function reassessReplies(
  details: JsonRecord[],
  store: CaseStore,
  options: { skipLlm: boolean; logPath: string },
): Promise<void> {
  const byOrder = new Map(details.map((detail) => [asText(detail.orderNo), detail]));
  for (const rec of store.replyReceived()) {
    try {
      const detail = byOrder.get(rec.vascNo);
      if (!detail) {
        appendLog(options.logPath, `reassess_missing_detail ${rec.vascNo}`);
        continue;
      }
      const first = await runPipeline(detail, { skipLlm: options.skipLlm });
      if (!first) continue;
      const chatId = envText("FEISHU_TEST_CHAT_ID");
      const replies = rec.feishuThreadId && chatId
        ? repliesFromFeishu(await getThreadMessages(chatId, rec.feishuThreadId))
        : [];
      const remark = await summarizeReply({ firstAssess: first, replies, caseRecord: rec });
      const nextStatus: CaseStatus =
        first.outputPath === "sop_generated"
          ? "sop_ready"
          : first.outputPath === "transfer_human"
            ? "transferred"
            : "reassessed";
      store.upsert({
        vascNo: rec.vascNo,
        status: nextStatus,
        aiOutputPath: first.outputPath,
        aiGeneratedText: first.llm?.text || first.analysis || "",
        matchResult: first.matchResult || {},
        missingFields: first.missing,
        reviewRemark: remark,
        lastProcessedAt: new Date().toISOString(),
      });
      appendLog(options.logPath, `reassessed ${rec.vascNo} -> ${nextStatus}`);
    } catch (err) {
      appendLog(options.logPath, `reassess_error ${rec.vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function runOnce(): Promise<void> {
  loadEnvFiles();
  const date = arg("date", todayShanghai());
  const input = arg("input") ? resolve(here, arg("input")) : "";
  const outDir = resolve(
    projectDir(),
    arg("out") || `_runs/${date.replaceAll("-", "")}_internal_review_poll`,
  );
  mkdirSync(outDir, { recursive: true });
  const logPath = resolve(outDir, "poll.log");
  const store = new CaseStore(arg("store") ? resolve(arg("store")) : resolve(outDir, "case-store.json"));
  appendLog(logPath, `poll_start date=${date} store=${store.path}`);

  let details: JsonRecord[] = [];
  try {
    details = await loadDetails({ date, input, logPath });
  } catch (err) {
    appendLog(logPath, `pull_error ${err instanceof Error ? err.message : err}`);
    const fallbackPath = resolve(
      projectDir(),
      arg("fallback-input") || "_runs/20260902_ow01v1602_review_orders/details.json",
    );
    if (existsSync(fallbackPath)) {
      const raw = JSON.parse(readFileSync(fallbackPath, "utf8"));
      details = (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
      appendLog(logPath, `pull_fallback input=${fallbackPath} details=${details.length}`);
    } else {
      appendLog(logPath, `pull_fallback_missing input=${fallbackPath}`);
    }
  }

  await assessNew(details, store, {
    skipLlm: hasFlag("skip-llm"),
    skipFeishu: hasFlag("skip-feishu"),
    logPath,
  });
  if (!hasFlag("skip-feishu")) {
    await refreshReplies(store, logPath);
    await reassessReplies(details, store, { skipLlm: hasFlag("skip-llm"), logPath });
  }
  appendLog(logPath, `poll_done cases=${store.list().length}`);
}

async function main(): Promise<void> {
  if (hasFlag("once") || !arg("interval")) {
    if (!hasFlag("once") && !arg("interval")) {
      console.error("Usage: npx tsx poll-and-assess.ts --once | --interval 600");
      process.exit(1);
    }
    await runOnce();
    return;
  }
  const seconds = Number(arg("interval", "600")) || 600;
  await runOnce();
  console.log(`interval=${seconds}s`);
  setInterval(() => {
    runOnce().catch((err) => {
      console.error(err instanceof Error ? err.message : err);
    });
  }, seconds * 1000);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
