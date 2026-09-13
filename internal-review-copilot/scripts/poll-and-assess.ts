/**
 * OMS poll + first assess + reply / reminder loop.
 *
 *   npx tsx internal-review-copilot/scripts/poll-and-assess.ts --once
 *   npx tsx internal-review-copilot/scripts/poll-and-assess.ts --interval 600
 *
 * Optional:
 *   --date 2026-09-03 --input <details.json> --store <case-store.json>
 *   --skip-feishu --skip-llm --out <_runs/...>
 *   --force --order VASC000000362139   重发指定单（不跳过已评估）
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CaseStore } from "../lib/case-store.ts";
import { envNumber, envText, loadEnvFiles, projectDir, reloadCopilotEnv } from "../lib/env.ts";
import {
  buildDemoPost,
  buildPost,
  getThreadMessages,
  resolveTestChatId,
  sendCardMessage,
  sendCardInNewTopic,
  sendDedupedOrderMessage,
  sendGroupMessage,
  ensureMembersInChat,
} from "../lib/feishu-bot.ts";
import {
  buildAskCard,
  buildSceneConfirmCard,
  buildSopCard,
  demoTopicTitle,
  type DemoPersonnel,
} from "../lib/feishu-card.ts";
import { refreshSopEdits as runSopEditRefresh } from "../lib/refresh-sop-edits.ts";
import { asArray, asRecord, asText, ALLOWED_SERVICE_CODES, isAllowedServiceAtom } from "../lib/oms-adapter.ts";
import { isOmsWriteEnabled, omsWriteAllowlist } from "../lib/oms-draft-write.ts";
import { isRagEnabled } from "../lib/case-retriever.ts";
import { refreshTomCookies } from "../lib/oms-tom-client.ts";
import {
  defaultPersonnelPath,
  namesForOpenIds,
  resolvePersonnel,
  resolvePersonnelFromDetail,
  reviewerOpenIds,
  serviceCodeOf,
  setPersonnelPath,
} from "../lib/personnel.ts";
import { buildTransferNoticeBody, collectSceneCandidates, parseSceneReply } from "../lib/parse-scene-reply.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { findScenarioCard, loadScenarioCards } from "../lib/scenario-cards.ts";
import { repliesFromFeishu, summarizeReply } from "../lib/summarize-reply.ts";
import type { CaseRecord, CaseStatus, JsonRecord } from "../lib/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const REMIND_AFTER_MS = 4 * 60 * 60 * 1000;
const DEFAULT_MAX_PER_POLL = 2;
const DEFAULT_MAX_PER_HOUR = 10;
const LIVE_SCENE_LLM = true;
const LIVE_SCENE_LLM_VERSION = 2 as const;

function maxPerPoll(): number {
  return envNumber("MAX_PER_POLL", DEFAULT_MAX_PER_POLL);
}

function maxPerHour(): number {
  return envNumber("MAX_PER_HOUR", DEFAULT_MAX_PER_HOUR);
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function useCard(_rec?: CaseRecord): boolean {
  return !hasFlag("post");
}

function botFilterOpts(): { botOpenId?: string } {
  const botOpenId = envText("FEISHU_BOT_OPEN_ID");
  return botOpenId ? { botOpenId } : {};
}

function resolvePollPath(p: string): string {
  if (!p) return "";
  if (isAbsolute(p)) return p;
  const fromProject = resolve(projectDir(), p);
  const fromCwd = resolve(process.cwd(), p);
  const fromHere = resolve(here, p);
  if (existsSync(fromProject)) return fromProject;
  if (existsSync(fromCwd)) return fromCwd;
  if (existsSync(fromHere)) return fromHere;
  return fromProject;
}

function todayShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
}

function appendLog(logPath: string, line: string): void {
  const stamp = new Date().toISOString();
  appendFileSync(logPath, `[${stamp}] ${line}\n`, "utf8");
  console.log(line);
}

function hourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

function readJsonRecord(path: string): JsonRecord {
  if (!existsSync(path)) return {};
  try {
    return asRecord(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return {};
  }
}

function readHourlyCount(outDir: string): Record<string, number> {
  const raw = readJsonRecord(resolve(outDir, "hourly-count.json"));
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) out[key] = Number(value) || 0;
  return out;
}

function bumpHourlyCount(outDir: string): number {
  const counts = readHourlyCount(outDir);
  const key = hourKey();
  counts[key] = (counts[key] || 0) + 1;
  writeFileSync(resolve(outDir, "hourly-count.json"), JSON.stringify(counts, null, 2), "utf8");
  return counts[key];
}

function isCookieError(msg: string): boolean {
  return /Cookie|cniam|#\/login|IAM|登录超时|请重新登录/i.test(msg);
}

interface AlertState {
  consecutiveLlmFail: number;
  consecutiveCookieFail: number;
}

function readAlertState(outDir: string): AlertState {
  const raw = readJsonRecord(resolve(outDir, "alert-state.json"));
  return {
    consecutiveLlmFail: Number(raw.consecutiveLlmFail) || 0,
    consecutiveCookieFail: Number(raw.consecutiveCookieFail) || 0,
  };
}

function writeAlertState(outDir: string, state: AlertState): void {
  writeFileSync(resolve(outDir, "alert-state.json"), JSON.stringify(state, null, 2), "utf8");
}

async function maybeAlert(outDir: string, logPath: string, kind: "llm" | "cookie"): Promise<void> {
  const state = readAlertState(outDir);
  if (kind === "llm") state.consecutiveLlmFail += 1;
  else state.consecutiveCookieFail += 1;
  writeAlertState(outDir, state);
  const n = kind === "llm" ? state.consecutiveLlmFail : state.consecutiveCookieFail;
  if (n < 3) return;
  const text =
    kind === "llm"
      ? "【告警】内部审核轮询连续 3 次全部 LLM 失败，请检查 LiteLLM。"
      : "【告警】内部审核轮询连续 3 次 Cookie 失效，请检查 auto_login / IAM。";
  try {
    await sendGroupMessage(resolveTestChatId(), text);
    appendLog(logPath, `alert_sent kind=${kind} n=${n}`);
  } catch (err) {
    appendLog(logPath, `alert_error ${err instanceof Error ? err.message : err}`);
  }
  if (kind === "llm") state.consecutiveLlmFail = 0;
  else state.consecutiveCookieFail = 0;
  writeAlertState(outDir, state);
}

function resetAlert(outDir: string, kind: "llm" | "cookie"): void {
  const state = readAlertState(outDir);
  if (kind === "llm") state.consecutiveLlmFail = 0;
  else state.consecutiveCookieFail = 0;
  writeAlertState(outDir, state);
}

function mergeDetails(prev: JsonRecord[], next: JsonRecord[]): JsonRecord[] {
  const map = new Map<string, JsonRecord>();
  for (const item of [...prev, ...next]) {
    const no = asText(item.orderNo);
    if (no) map.set(no, item);
  }
  return [...map.values()];
}

function writeDetails(outDir: string, details: JsonRecord[]): void {
  writeFileSync(resolve(outDir, "details.json"), JSON.stringify(details, null, 2), "utf8");
}

function personnelOf(result: PipelineResult, detail?: JsonRecord): DemoPersonnel {
  return resolvePersonnelFromDetail(detail, result.contextFacts);
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
  if (result.outputPath === "invalid_input") return "transferred";
  if (result.outputPath === "transfer_human") return "awaiting_scene_confirm";
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
  outDir: string;
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
    outDir: options.outDir,
  });
  appendLog(options.logPath, `oms_pull detailCount=${pulled.details.length}`);
  return pulled.details.map(asRecord);
}

async function assessNew(
  details: JsonRecord[],
  store: CaseStore,
  options: { skipLlm: boolean; skipFeishu: boolean; logPath: string; outDir: string },
): Promise<{ attempted: number; llmFailed: number }> {
  let processedThisPoll = 0;
  let attempted = 0;
  let llmFailed = 0;
  const hourly = readHourlyCount(options.outDir);
  const hourCap = maxPerHour();
  const pollCap = maxPerPoll();
  if ((hourly[hourKey()] || 0) >= hourCap) {
    appendLog(options.logPath, `rate_limit_hour reached ${hourCap}/hour`);
    return { attempted, llmFailed };
  }

  const onlyOrder = arg("order");
  for (const detail of details) {
    const vascNo = asText(detail.orderNo);
    if (!vascNo) continue;
    if (onlyOrder && vascNo !== onlyOrder) continue;
    if (store.shouldSkipAssess(vascNo) && !hasFlag("force")) {
      appendLog(options.logPath, `skip_existing ${vascNo} status=${store.get(vascNo)?.status}`);
      continue;
    }
    const atoms = asArray(detail.atoms).map(asRecord);
    const allowed = atoms.some((atom) => isAllowedServiceAtom(atom));
    const serviceCode = serviceCodeOf(detail) || "-";
    if (!allowed) {
      appendLog(options.logPath, `skip_service_code ${vascNo} code=${serviceCode}`);
      continue;
    }
    if (processedThisPoll >= pollCap) {
      appendLog(options.logPath, `rate_limit_poll reached ${pollCap}/poll`);
      break;
    }
    if ((readHourlyCount(options.outDir)[hourKey()] || 0) >= hourCap) {
      appendLog(options.logPath, `rate_limit_hour reached ${hourCap}/hour`);
      break;
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
    processedThisPoll += 1;
    bumpHourlyCount(options.outDir);
    attempted += 1;
    try {
      const result = await runPipeline(detail, {
        skipLlm: options.skipLlm,
        sceneLlm: LIVE_SCENE_LLM,
        sceneLlmVersion: LIVE_SCENE_LLM_VERSION,
        ragEnabled: isRagEnabled(),
      });
      if (!result) {
        appendLog(options.logPath, `skip_no_atom ${vascNo}`);
        continue;
      }
      if (result.llm?.error) llmFailed += 1;
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
        llmSop: result.llm?.sop || null,
        matchResult: result.matchResult || {},
        missingFields: result.missing,
        ruleOutputPath: result.ruleOutputPath,
        llmError: result.llm?.error || null,
        riskFlags: result.riskFlags,
        lastProcessedAt: new Date().toISOString(),
      });
      appendLog(
        options.logPath,
        `assessed ${vascNo} scene=${result.matchResult?.sceneKey || "-"} rule=${result.ruleOutputPath} out=${result.outputPath}`,
      );

      if (
        !options.skipFeishu &&
        (result.outputPath === "needs_requirement_clarification" || result.outputPath === "needs_field_clarification")
      ) {
        await sendClarification(result, store, options.logPath, undefined, detail);
      } else if (!options.skipFeishu && result.outputPath === "transfer_human") {
        await sendTransferNotice(result, store, options.logPath, detail);
      } else if (!options.skipFeishu && result.outputPath === "sop_generated") {
        const rec = store.get(vascNo);
        if (rec) await sendSopResult(result, store, rec, options.logPath, detail);
      }
    } catch (err) {
      appendLog(options.logPath, `assess_error ${vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
  return { attempted, llmFailed };
}

async function sendClarification(
  result: PipelineResult,
  store: CaseStore,
  logPath: string,
  threadId?: string | null,
  detail?: JsonRecord,
): Promise<void> {
  try {
    const chatId = resolveTestChatId();
    const personnel = personnelOf(result, detail);
    const rec = store.get(result.orderNo);
    const title = `增值单 ${result.orderNo} ${
      result.ruleOutputPath === "needs_requirement_clarification" ? "缺需求" : "缺资料"
    }`;
    const body = [
      result.llm?.text || result.analysis || "",
      "",
      "{@销售} 请联系客户补充以上材料。",
    ].join("\n");
    const card = useCard(rec) ? buildAskCard(result, personnel) : null;
    const topic = demoTopicTitle(result.outputPath, result.orderNo);
    const sent = card
      ? threadId
        ? await sendCardMessage(chatId, card, threadId)
        : await sendCardInNewTopic(chatId, topic, card)
      : threadId
        ? await sendGroupMessage(chatId, buildDemoPost(title, body, personnel), threadId)
        : await sendDedupedOrderMessage({
            chatId,
            orderNo: result.orderNo,
            title,
            body,
            mention: personnel["审核员"]?.openId
              ? { userId: personnel["审核员"].openId, name: personnel["审核员"].name }
              : undefined,
          });
    if (sent.skipped) {
      appendLog(logPath, `feishu_skip ${result.orderNo} ${sent.reason}`);
      return;
    }
    store.upsert({
      vascNo: result.orderNo,
      status: "awaiting_reply",
      feishuThreadId: sent.threadId || sent.messageId || threadId || null,
      feishuMessageId: sent.messageId || rec?.feishuMessageId || null,
      lastCard: card || rec?.lastCard,
      notifyChannel: card ? "card" : rec?.notifyChannel || "post",
      clarificationSentAt: new Date().toISOString(),
    });
    appendLog(logPath, `feishu_sent ${result.orderNo} topic=${sent.topicId || "-"} root=${sent.threadId} type=${card ? "card" : "post"}`);
  } catch (err) {
    appendLog(logPath, `feishu_error ${result.orderNo} ${err instanceof Error ? err.message : err}`);
  }
}

async function sendTransferNotice(
  result: PipelineResult,
  store: CaseStore,
  logPath: string,
  detail?: JsonRecord,
): Promise<void> {
  try {
    const chatId = resolveTestChatId();
    const personnel = personnelOf(result, detail);
    const mentionName = personnel["审核员"]?.name || "审核员";
    const notice = buildTransferNoticeBody({
      vascNo: result.orderNo,
      customer: result.contextFacts?.customerName,
      warehouse: result.contextFacts?.warehouseName || result.contextFacts?.warehouseCode,
      summary: result.llm?.text || result.analysis || "",
      matchResult: result.matchResult,
      mentionName,
    });
    const candidates = collectSceneCandidates(result.matchResult);
    const rec = store.get(result.orderNo);
    const card = useCard(rec) ? buildSceneConfirmCard(result, personnel, candidates) : null;
    const sent = card
      ? await sendCardInNewTopic(chatId, demoTopicTitle("transfer_human", result.orderNo), card)
      : await sendDedupedOrderMessage({
          chatId,
          orderNo: result.orderNo,
          title: notice.title,
          body: notice.body,
          mention: personnel["审核员"]?.openId
            ? { userId: personnel["审核员"].openId, name: mentionName }
            : undefined,
        });
    store.upsert({
      vascNo: result.orderNo,
      status: "awaiting_scene_confirm",
      feishuThreadId: sent.threadId || sent.messageId,
      feishuMessageId: sent.messageId || null,
      lastCard: card || undefined,
      notifyChannel: card ? "card" : "post",
      clarificationSentAt: new Date().toISOString(),
      sceneCandidateList: notice.candidates,
      matchResult: result.matchResult || {},
    });
    appendLog(
      logPath,
      sent.skipped
        ? `feishu_skip ${result.orderNo} ${sent.reason || ""}`
        : `feishu_transfer_sent ${result.orderNo} situation=${notice.situation} candidates=${notice.candidates.length} topic=${sent.topicId || "-"} root=${sent.threadId} type=${card ? "card" : "post"}`,
    );
  } catch (err) {
    appendLog(logPath, `feishu_transfer_error ${result.orderNo} ${err instanceof Error ? err.message : err}`);
  }
}

async function refreshSceneConfirm(store: CaseStore, logPath: string): Promise<void> {
  const chatId = envText("FEISHU_TEST_CHAT_ID");
  if (!chatId) return;
  const awaiting = store.list().filter((rec) => rec.status === "awaiting_scene_confirm");
  for (const rec of awaiting) {
    if (!rec.feishuThreadId) continue;
    try {
      const messages = await getThreadMessages(chatId, rec.feishuThreadId);
      const humanReplies = repliesFromFeishu(messages, botFilterOpts());
      if (!humanReplies.length) {
        maybeRemind(rec, store, logPath);
        continue;
      }
      const latestReply = humanReplies[humanReplies.length - 1];
      if (rec.lastSceneReplyText && latestReply.text === rec.lastSceneReplyText) continue;
      const parsed = parseSceneReply(latestReply.text, rec.sceneCandidateList);
      if (parsed.method === "unrecognized" || parsed.method === "ambiguous") {
        await sendGroupMessage(
          chatId,
          buildPost(`${rec.vascNo} 场景确认`, [parsed.askAgain || unrecognizedFallback(rec)]),
          rec.feishuThreadId,
        );
        store.upsert({
          vascNo: rec.vascNo,
          lastSceneReplyText: latestReply.text,
        });
        appendLog(logPath, `scene_unrecognized ${rec.vascNo} method=${parsed.method} raw="${latestReply.text}"`);
        continue;
      }
      if (parsed.method === "transfer" || !parsed.matched) {
        store.upsert({
          vascNo: rec.vascNo,
          status: "transferred",
          confirmedScene: "",
          confirmedSceneName: "人工处理",
          confirmedBy: latestReply.speaker,
          lastSceneReplyText: latestReply.text,
        });
        appendLog(logPath, `scene_transferred ${rec.vascNo} by=${latestReply.speaker}`);
        continue;
      }
      store.upsert({
        vascNo: rec.vascNo,
        status: "scene_confirmed",
        confirmedScene: parsed.sceneKey,
        confirmedSceneName: parsed.sceneName,
        confirmedBy: latestReply.speaker,
        lastSceneReplyText: latestReply.text,
      });
      appendLog(logPath, `scene_confirmed ${rec.vascNo} scene=${parsed.sceneKey} by=${latestReply.speaker}`);
    } catch (err) {
      appendLog(logPath, `scene_poll_error ${rec.vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
}

function unrecognizedFallback(rec: CaseRecord): string {
  const max = rec.sceneCandidateList?.length || 0;
  if (max) return `未识别到场景编号。请回复 1-${max} 选择场景，或回复 0 转人工处理。`;
  return "未识别，请回复场景名称关键词（如「拍照暂存」），或回复「人工」。";
}

async function sendSopResult(
  result: PipelineResult,
  store: CaseStore,
  rec: CaseRecord,
  logPath: string,
  detail?: JsonRecord,
): Promise<void> {
  const chatId = resolveTestChatId();
  const personnel = personnelOf(result, detail);
  const card = useCard(rec) ? buildSopCard(result, personnel) : null;
  const openNewTopic = hasFlag("force") || !rec.feishuThreadId;
  const sent = card
    ? openNewTopic
      ? await sendCardInNewTopic(chatId, demoTopicTitle("sop_generated", result.orderNo), card)
      : await sendCardMessage(chatId, card, rec.feishuThreadId!)
    : rec.feishuThreadId
      ? await sendGroupMessage(
          chatId,
          buildPost(`${result.orderNo} SOP 已生成`, [
            [
              `场景确认：${rec.confirmedSceneName || rec.confirmedScene}（由 ${rec.confirmedBy || "审核员"} 确认）`,
              "",
              result.llm?.text || result.analysis || "SOP 生成失败",
              "",
              "请审核员确认以上 SOP 是否正确。确认后可下发仓库执行。",
              "处理方式：暂时",
            ].join("\n"),
          ]),
          rec.feishuThreadId,
        )
      : await sendGroupMessage(
          chatId,
          buildPost(demoTopicTitle("sop_generated", result.orderNo), [
            result.llm?.text || result.analysis || "SOP 生成失败",
          ]),
        );
  store.upsert({
    vascNo: rec.vascNo,
    status: "sop_ready",
    feishuThreadId: sent.threadId || rec.feishuThreadId,
    lastCard: card || rec.lastCard,
    notifyChannel: card ? "card" : rec.notifyChannel,
  });
  appendLog(
    logPath,
    `sop_sent_after_confirm ${rec.vascNo} topic=${sent.topicId || "-"} root=${sent.threadId} type=${card ? "card" : "post"} newTopic=${openNewTopic}`,
  );
}

async function runFromConfirmedScene(
  details: JsonRecord[],
  store: CaseStore,
  options: { skipLlm: boolean; skipFeishu: boolean; logPath: string },
): Promise<void> {
  const byOrder = new Map(details.map((detail) => [asText(detail.orderNo), detail]));
  const confirmed = store.list().filter((rec) => rec.status === "scene_confirmed");
  for (const rec of confirmed) {
    const detail = byOrder.get(rec.vascNo);
    if (!detail || !rec.confirmedScene) continue;
    try {
      const result = await runPipeline(detail, {
        skipLlm: options.skipLlm,
        sceneLlm: false,
        overrideScene: rec.confirmedScene,
      });
      if (!result) continue;
      const nextStatus: CaseStatus =
        result.outputPath === "sop_generated"
          ? "sop_ready"
          : result.outputPath === "needs_field_clarification" ||
              result.outputPath === "needs_requirement_clarification"
            ? "awaiting_reply"
            : "transferred";
      store.upsert({
        vascNo: rec.vascNo,
        status: nextStatus,
        aiOutputPath: result.outputPath,
        aiGeneratedText: result.llm?.text || result.analysis || "",
        llmSop: result.llm?.sop || null,
        matchResult: result.matchResult || {},
        missingFields: result.missing,
      });
      appendLog(options.logPath, `scene_rerun ${rec.vascNo} scene=${rec.confirmedScene} → ${result.outputPath}`);
      if (
        !options.skipFeishu &&
        (result.outputPath === "needs_field_clarification" ||
          result.outputPath === "needs_requirement_clarification")
      ) {
        await sendClarification(result, store, options.logPath, rec.feishuThreadId, detail);
      }
      if (!options.skipFeishu && result.outputPath === "sop_generated") {
        await sendSopResult(result, store, rec, options.logPath, detail);
      }
    } catch (err) {
      appendLog(options.logPath, `scene_rerun_error ${rec.vascNo} ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function refreshReplies(store: CaseStore, logPath: string): Promise<void> {
  const chatId = envText("FEISHU_TEST_CHAT_ID");
  if (!chatId) return;
  for (const rec of store.awaitingReply()) {
    if (!rec.feishuThreadId) continue;
    try {
      const messages = await getThreadMessages(chatId, rec.feishuThreadId);
      const human = repliesFromFeishu(messages, botFilterOpts());
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
  if (rec.status !== "awaiting_reply" && rec.status !== "clarification_sent" && rec.status !== "awaiting_scene_confirm") {
    return;
  }
  if (rec.reminderSentAt) return;
  const sentAt = rec.clarificationSentAt ? Date.parse(rec.clarificationSentAt) : 0;
  if (!sentAt || Date.now() - sentAt < REMIND_AFTER_MS) return;
  const chatId = envText("FEISHU_TEST_CHAT_ID");
  if (!chatId || !rec.feishuThreadId) return;
  const body =
    rec.status === "awaiting_scene_confirm"
      ? `您好，增值单 ${rec.vascNo} 仍在等待审核员确认场景。请回复编号或「人工」。AI 不代填事实、不自动审核。`
      : `您好，增值单 ${rec.vascNo} 仍在等待补充，超过 4 小时未收到回复。请客服/销售协助跟进。AI 不代填事实、不自动审核。`;
  sendDedupedOrderMessage({
    chatId,
    orderNo: rec.vascNo,
    title: `${rec.vascNo} 催办`,
    body,
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
      const first = await runPipeline(detail, {
        skipLlm: options.skipLlm,
        sceneLlm: LIVE_SCENE_LLM,
        sceneLlmVersion: LIVE_SCENE_LLM_VERSION,
        ragEnabled: isRagEnabled(),
      });
      if (!first) continue;
      const chatId = envText("FEISHU_TEST_CHAT_ID");
      const replies = rec.feishuThreadId && chatId
        ? repliesFromFeishu(await getThreadMessages(chatId, rec.feishuThreadId), botFilterOpts())
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
        llmSop: first.llm?.sop || null,
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

function applyDemoRequiredFieldKeys(detail: JsonRecord): void {
  const keys = asArray(detail.demoRequiredFieldKeys).map((item) => asText(item)).filter(Boolean);
  const sceneKey = asText(detail.demoSceneKey);
  if (!keys.length || !sceneKey) return;
  const card = findScenarioCard(sceneKey);
  if (!card) return;
  card.requiredAttachmentPolicy.requiredFieldKeys = keys;
}

async function refreshSopEdits(store: CaseStore, details: JsonRecord[], logPath: string): Promise<void> {
  await runSopEditRefresh({
    store,
    details,
    personnel: resolvePersonnel(),
    log: (line) => appendLog(logPath, line),
  });
}

async function runOnce(): Promise<void> {
  loadEnvFiles();
  reloadCopilotEnv();
  const date = arg("date", todayShanghai());
  const input = arg("input") ? resolvePollPath(arg("input")) : "";
  const outDir = resolve(
    projectDir(),
    arg("out") || `_runs/${date.replaceAll("-", "")}_internal_review_poll`,
  );
  mkdirSync(outDir, { recursive: true });
  const logPath = resolve(outDir, "poll.log");
  const store = new CaseStore(arg("store") ? resolvePollPath(arg("store")) : resolve(outDir, "case-store.json"));
  const personnelArg = resolvePollPath(arg("personnel"));
  setPersonnelPath(personnelArg || defaultPersonnelPath());
  const ragOn = isRagEnabled();
  const omsWrite = isOmsWriteEnabled() ? "1" : "0";
  const allowlist = omsWriteAllowlist().join(",") || "(empty)";
  const cardCount = loadScenarioCards().length;
  appendLog(
    logPath,
    `poll_start sceneLlm=${LIVE_SCENE_LLM} sceneLlmVersion=${LIVE_SCENE_LLM_VERSION} RAG_ENABLED=${ragOn ? "1" : "0"} cards=${cardCount} OMS_WRITE=${omsWrite} allowlist=${allowlist} date=${date} store=${store.path} codes=${[...ALLOWED_SERVICE_CODES].join(",")}`,
  );

  if (!hasFlag("skip-feishu")) {
    try {
      const chatId = resolveTestChatId();
      const ensure = await ensureMembersInChat(chatId, reviewerOpenIds());
      appendLog(
        logPath,
        `ensure_members added=${ensure.added.length} already=${ensure.alreadyIn.length} failed=${ensure.failed.length}`,
      );
      if (ensure.failed.length) {
        appendLog(logPath, `ensure_members_warn 请手动拉 ${namesForOpenIds(ensure.failed).join("、")} 入群`);
      }
    } catch (err) {
      appendLog(logPath, `ensure_members_error ${err instanceof Error ? err.message : err}`);
    }
  }

  let details: JsonRecord[] = [];
  let cookieFailed = false;
  try {
    details = await loadDetails({ date, input, logPath, outDir });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    appendLog(logPath, `pull_error ${msg}`);
    if (isCookieError(msg)) {
      try {
        appendLog(logPath, "cookie_refresh trying auto_login");
        refreshTomCookies();
        details = await loadDetails({ date, input, logPath, outDir });
        appendLog(logPath, `cookie_refresh_ok details=${details.length}`);
      } catch (retryErr) {
        cookieFailed = true;
        appendLog(logPath, `cookie_refresh_failed ${retryErr instanceof Error ? retryErr.message : retryErr}`);
      }
    }
    if (!details.length) {
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
  }

  const prevPath = resolve(outDir, "details.json");
  const prev = existsSync(prevPath)
    ? (Array.isArray(JSON.parse(readFileSync(prevPath, "utf8")))
        ? JSON.parse(readFileSync(prevPath, "utf8"))
        : asArray(asRecord(JSON.parse(readFileSync(prevPath, "utf8"))).details)
      ).map(asRecord)
    : [];
  details = mergeDetails(prev, details);
  writeDetails(outDir, details);

  if (cookieFailed) await maybeAlert(outDir, logPath, "cookie");
  else resetAlert(outDir, "cookie");

  const assessStats = await assessNew(details, store, {
    skipLlm: hasFlag("skip-llm"),
    skipFeishu: hasFlag("skip-feishu"),
    logPath,
    outDir,
  });
  if (!hasFlag("skip-llm") && assessStats.attempted > 0) {
    if (assessStats.llmFailed >= assessStats.attempted) await maybeAlert(outDir, logPath, "llm");
    else resetAlert(outDir, "llm");
  }
  if (!hasFlag("skip-feishu")) {
    await refreshReplies(store, logPath);
    await refreshSceneConfirm(store, logPath);
    await refreshSopEdits(store, details, logPath);
    await reassessReplies(details, store, { skipLlm: hasFlag("skip-llm"), logPath });
  }
  await runFromConfirmedScene(details, store, {
    skipLlm: hasFlag("skip-llm"),
    skipFeishu: hasFlag("skip-feishu"),
    logPath,
  });
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
