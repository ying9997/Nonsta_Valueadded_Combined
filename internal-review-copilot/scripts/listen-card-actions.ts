/**
 * Listen for Feishu card button clicks and drive the scene-confirm + OMS-write state machine.
 *
 *   npx tsx internal-review-copilot/scripts/listen-card-actions.ts \
 *     --store _runs/20260909_demo_e2e/card-test/case-store.json \
 *     --input _runs/20260909_demo_e2e/demo-inputs.json
 *
 * Uses 增值咨询 Bot profile (cli_aa2a76198a7adcb3), never the 综合解决方案 default.
 * Does NOT `profile use` / config bind — only `--profile zengzhi-consult`.
 */

import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CaseStore } from "../lib/case-store.ts";
import { CanaryGate, getTargetChatId } from "../lib/canary.ts";
import { replayCanaryToOfficial } from "../lib/canary-replay.ts";
import { envText, loadEnvFiles, projectDir } from "../lib/env.ts";
import { rejectIfForbidden } from "../lib/chat-access-guard.ts";
import {
  ZENGZHI_CONSULT_APP_ID,
  assertConsultAppId,
  resolveOpenIdName,
  sendCardMessage,
  sendCardInNewTopic,
  sendConsultThreadText,
  updateInteractiveCard,
} from "../lib/feishu-bot.ts";
import {
  buildAllScenesCard,
  buildAskCard,
  buildCanaryPromotedUpdateCard,
  buildOmsWriteCancelledCard,
  buildOmsWriteRetryCard,
  buildSceneConfirmCard,
  buildSceneConfirmedUpdateCard,
  buildSceneSearchMultiCard,
  buildSceneSearchSingleCard,
  buildSopActionUpdateCard,
  buildSopCard,
  buildSopGenerateErrorCard,
  demoTopicTitle,
  orderCategoryOf,
  parseCardActionValue,
  sceneNameOf,
  type DemoPersonnel,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { asArray, asRecord, asText, customerNameFromHeader } from "../lib/oms-adapter.ts";
import { enrichDetailsCustomerNames } from "../lib/oms-customer.ts";
import { visibleCustomerName } from "../lib/customer-display.ts";
import {
  defaultPersonnelPath,
  personnelDirectory,
  resolvePersonnelFromDetailLive,
  setPersonnelPath,
} from "../lib/personnel.ts";
import {
  extractAiRequirementBackground,
  extractAiRequirementDescription,
  isHumanSopAlreadyFilled,
  isOmsWriteEnabled,
  isOmsWriteGuardReject,
  omsWriteAllowlist,
  resolveSceneOverviewCode,
  writeDraft,
  type DraftWriteResult,
} from "../lib/oms-draft-write.ts";
import { notifyOwnerHumanSopFilled } from "../lib/human-sop-alert.ts";
import { notifyOwnerMissingOmsScene, needsOmsSceneConfirm } from "../lib/missing-oms-scene.ts";
import { extractSopSections } from "../lib/sop-sections.ts";
import { refreshSopEdits } from "../lib/refresh-sop-edits.ts";
import { runPipeline, failureTypeOf, isSopGenerateFailure, type PipelineResult } from "../lib/run-pipeline.ts";
import { findScenarioCard, searchSceneByKeyword } from "../lib/scenario-cards.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { appendBadcase } from "../lib/badcase-log.ts";
import { classifyAuditorReply, isL1L25OutputPath } from "../lib/auditor-reply-classifier.ts";
import { MAX_SOP_EDITS, sopEditCountOf } from "../lib/sop-edit.ts";
import { refreshTomCookies } from "../lib/oms-tom-client.ts";
import type { CaseRecord, CaseStatus, JsonRecord } from "../lib/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const CONSULT_PROFILE = "zengzhi-consult";
/** 原始 1 次 + 自动续 Cookie 再写 1 次 + 手动按钮最多 2 次。 */
const MAX_OMS_WRITE_MANUAL = 2;

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function listenChatId(eventChatId?: string): string {
  if (eventChatId) return eventChatId;
  try {
    return getTargetChatId();
  } catch {
    return envText("FEISHU_TEST_CHAT_ID");
  }
}

function resolveArgPath(p: string, fallbackRel = ""): string {
  if (!p) return fallbackRel ? resolve(projectDir(), fallbackRel) : "";
  if (isAbsolute(p)) return p;
  const fromProject = resolve(projectDir(), p);
  const fromHere = resolve(here, p);
  if (existsSync(fromProject)) return fromProject;
  if (existsSync(fromHere)) return fromHere;
  return fromProject;
}

function readDetailsFile(inputPath: string): JsonRecord[] {
  if (!inputPath || !existsSync(inputPath)) return [];
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  return (Array.isArray(raw) ? raw : asArray(raw.details)).map(asRecord);
}

async function loadListenDetails(inputPath: string): Promise<JsonRecord[]> {
  return enrichDetailsCustomerNames(readDetailsFile(inputPath));
}

async function personnelFor(details: JsonRecord[], vascNo: string, result?: PipelineResult): Promise<DemoPersonnel> {
  const detail = details.find((item) => asText(item.orderNo) === vascNo);
  return resolvePersonnelFromDetailLive(detail, result?.contextFacts);
}

async function operatorName(personnel: DemoPersonnel, operatorId: string, chatId?: string): Promise<string> {
  for (const person of Object.values(personnel)) {
    if (person.openId && person.openId === operatorId) return person.name;
  }
  const resolved = await resolveOpenIdName(operatorId, chatId);
  if (resolved) return resolved;
  return operatorId ? `审核员(${operatorId.slice(0, 10)})` : "审核员";
}

function parseOriginalCard(raw: string): FeishuCard | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FeishuCard;
    if (parsed?.header && Array.isArray(parsed.elements)) return parsed;
  } catch {
    return null;
  }
  return null;
}

function appendPollLog(logDir: string, line: string): void {
  const stamp = new Date().toISOString();
  const full = `[${stamp}] ${line}`;
  console.log(line);
  try {
    mkdirSync(logDir, { recursive: true });
    appendFileSync(resolve(logDir, "poll.log"), `${full}\n`, "utf8");
  } catch (err) {
    console.warn(`poll.log write failed: ${err instanceof Error ? err.message : err}`);
  }
}

function logOmsWriteFail(logDir: string, vascNo: string, error: string, retry: number): void {
  appendPollLog(logDir, `oms_write_fail ${vascNo} ${error} retry=${retry}`);
}

function writeCardKind(result: DraftWriteResult): "sop_written" | "write_failed" | "write_cancelled" {
  if (result.success) return "sop_written";
  if (isOmsWriteGuardReject(result)) return "write_cancelled";
  return "write_failed";
}

function writeFailHint(result: DraftWriteResult, remaining: number): string | undefined {
  if (result.success) return undefined;
  if (isOmsWriteGuardReject(result)) return result.error;
  if (remaining > 0) return `${result.error || "未知错误"}。请在话题内新卡片重试`;
  return `${result.error || "未知错误"}。请联系开发排查`;
}

async function runWriteDraft(args: {
  store: CaseStore;
  rec: CaseRecord | undefined;
  vascNo: string;
  sceneKey: string;
  sop: string;
  aiRequirementDescription: string;
  aiRequirementBackground: string;
}): Promise<{ result: DraftWriteResult; attempt: number }> {
  const attempt = (args.rec?.omsWriteAttempts || 0) + 1;
  args.store.upsert({ vascNo: args.vascNo, omsWriteAttempts: attempt });
  args.rec = args.store.get(args.vascNo);
  try {
    if (!args.sop) throw new Error("case-store 没有可写入的操作步骤");
    const result = await writeDraft({
      orderNo: args.vascNo,
      sceneOverviewCode: resolveSceneOverviewCode(args.sceneKey).code,
      sop: args.sop,
      aiRequirementDescription: args.aiRequirementDescription,
      aiRequirementBackground: args.aiRequirementBackground,
      extractedWiNumbers: (args.rec?.llmSop as { extractedWiNumbers?: string[] } | undefined)?.extractedWiNumbers || [],
      comparisonMeta: {
        sceneKey: args.sceneKey,
        sceneName: asText((args.rec?.matchResult as { scenarioName?: string } | undefined)?.scenarioName),
        missingAttachments: args.rec?.missingFields || [],
        degraded: Boolean((args.rec?.llmSop as { degraded?: boolean } | undefined)?.degraded),
        confidence: asText((args.rec?.matchResult as { confidence?: string } | undefined)?.confidence),
      },
      dryRun: !isOmsWriteEnabled(),
    });
    return { result, attempt };
  } catch (err) {
    return {
      result: {
        success: false,
        dryRun: true,
        written: [],
        skipped: ["vaOrderReview"],
        error: err instanceof Error ? err.message : String(err),
      },
      attempt,
    };
  }
}

function refreshCookieBestEffort(): string {
  try {
    refreshTomCookies();
    return "";
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

async function sendWriteRetryCard(args: {
  store: CaseStore;
  rec: CaseRecord | undefined;
  event: CardActionEvent;
  vascNo: string;
  sceneKey: string;
  error: string;
  personnel: DemoPersonnel;
  remainingManual: number;
}): Promise<void> {
  const chatId = listenChatId(args.event.chat_id);
  const threadId = args.rec?.feishuThreadId || "";
  if (!chatId || !threadId) {
    console.warn(`retry card skip: missing chat/thread vascNo=${args.vascNo}`);
    return;
  }
  const card = buildOmsWriteRetryCard({
    vascNo: args.vascNo,
    sceneKey: args.sceneKey,
    error: args.error,
    personnel: args.personnel,
    remainingManual: args.remainingManual,
  });
  try {
    const sent = await sendCardMessage(chatId, card, threadId);
    args.store.upsert({
      vascNo: args.vascNo,
      lastCard: card,
      feishuMessageId: sent.messageId || args.rec?.feishuMessageId,
      feishuThreadId: sent.threadId || threadId,
    });
    console.log(`oms_write_retry_card vascNo=${args.vascNo} remaining=${args.remainingManual} msg=${sent.messageId}`);
  } catch (err) {
    console.warn(`send retry card failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function handleWriteGuardReject(args: {
  store: CaseStore;
  rec: CaseRecord | undefined;
  event: CardActionEvent;
  vascNo: string;
  writeResult: DraftWriteResult;
  personnel: DemoPersonnel;
}): Promise<void> {
  if (isHumanSopAlreadyFilled(args.writeResult)) {
    const already = args.rec?.failureType === "human_sop_filled";
    const notify = already
      ? "skipped"
      : await notifyOwnerHumanSopFilled({
          vascNo: args.vascNo,
          customer: args.rec?.customer,
          warehouse: args.rec?.warehouse,
          error: args.writeResult.error,
        });
    args.store.upsert({
      vascNo: args.vascNo,
      failureType: "human_sop_filled",
      llmError: args.writeResult.error || args.rec?.llmError,
      reviewRemark: `人工 SOP 已填，已私聊金萤（${notify}）`,
    });
    console.log(`human_sop_dm vascNo=${args.vascNo} notify=${notify} already=${already ? "1" : "0"}`);
    return;
  }
  await sendWriteCancelledCard({
    store: args.store,
    rec: args.rec,
    event: args.event,
    vascNo: args.vascNo,
    error: args.writeResult.error || "当前订单不允许写入",
    personnel: args.personnel,
  });
}

async function sendWriteCancelledCard(args: {
  store: CaseStore;
  rec: CaseRecord | undefined;
  event: CardActionEvent;
  vascNo: string;
  error: string;
  personnel: DemoPersonnel;
}): Promise<void> {
  const chatId = listenChatId(args.event.chat_id);
  const threadId = args.rec?.feishuThreadId || "";
  if (!chatId || !threadId) {
    console.warn(`cancel card skip: missing chat/thread vascNo=${args.vascNo}`);
    return;
  }
  const card = buildOmsWriteCancelledCard({
    vascNo: args.vascNo,
    error: args.error,
    personnel: args.personnel,
  });
  try {
    const sent = await sendCardMessage(chatId, card, threadId);
    args.store.upsert({
      vascNo: args.vascNo,
      lastCard: card,
      feishuMessageId: sent.messageId || args.rec?.feishuMessageId,
      feishuThreadId: sent.threadId || threadId,
      reviewRemark: `OMS 写入已取消：${args.error}`,
    });
    console.log(`oms_write_cancelled_card vascNo=${args.vascNo} msg=${sent.messageId}`);
  } catch (err) {
    console.warn(`send cancel card failed: ${err instanceof Error ? err.message : err}`);
  }
}

interface CardActionEvent {
  type?: string;
  event_id?: string;
  action_name?: string;
  action_tag?: string;
  action_value?: string;
  operator_id?: string;
  operator_tenant_key?: string;
  message_id?: string;
  chat_id?: string;
  token?: string;
  card_content?: string;
  event?: unknown;
  action?: unknown;
  operator?: unknown;
}

function normalizeCardEvent(raw: CardActionEvent): CardActionEvent {
  const nested = asRecord(raw.event);
  const action = Object.keys(asRecord(raw.action)).length ? asRecord(raw.action) : asRecord(nested.action);
  const operator = Object.keys(asRecord(raw.operator)).length ? asRecord(raw.operator) : asRecord(nested.operator);
  const context = asRecord(nested.context);
  const value = action.value;
  return {
    ...raw,
    action_name: raw.action_name || asText(action.name) || asText(action.tag),
    action_value:
      raw.action_value ||
      (typeof value === "string" ? value : value ? JSON.stringify(value) : ""),
    operator_id: raw.operator_id || asText(operator.open_id) || asText(operator.user_id),
    operator_tenant_key: raw.operator_tenant_key || asText(operator.tenant_key),
    message_id: raw.message_id || asText(nested.message_id) || asText(context.open_message_id),
    chat_id: raw.chat_id || asText(nested.chat_id) || asText(context.open_chat_id),
    token: raw.token || asText(nested.token) || asText(asRecord(nested.action).token),
    card_content: raw.card_content || asText(nested.card_content),
  };
}

const seenEvents = new Set<string>();

function larkCliSync(args: string[], stdin?: string) {
  return spawnSync("npx", ["lark-cli", ...args], {
    encoding: "utf8",
    input: stdin,
    shell: true,
    windowsHide: true,
    timeout: 60_000,
    env: {
      ...process.env,
      LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
      LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1",
    },
  });
}

function ensureConsultProfile(): void {
  const appId = assertConsultAppId(envText("FEISHU_APP_ID") || ZENGZHI_CONSULT_APP_ID);
  const secret = envText("FEISHU_APP_SECRET");
  if (!secret) throw new Error("缺少 FEISHU_APP_SECRET，无法准备增值咨询 lark-cli profile");

  const who = larkCliSync(["--profile", CONSULT_PROFILE, "whoami"]);
  if (who.status === 0 && (who.stdout || "").includes(ZENGZHI_CONSULT_APP_ID)) {
    console.log(`lark-cli profile=${CONSULT_PROFILE} app=${ZENGZHI_CONSULT_APP_ID} (不切换默认 profile)`);
    return;
  }

  console.log(`adding lark-cli profile ${CONSULT_PROFILE} for ${appId} (without --use)`);
  const added = larkCliSync(
    [
      "profile",
      "add",
      "--name",
      CONSULT_PROFILE,
      "--app-id",
      appId,
      "--app-secret-stdin",
      "--brand",
      "feishu",
    ],
    `${secret}\n`,
  );
  if (added.status !== 0) {
    const err = (added.stderr || added.stdout || "").slice(0, 400);
    if (!/already exists|已存在/i.test(err)) {
      throw new Error(`lark-cli profile add 失败：${err}`);
    }
  }
  const again = larkCliSync(["--profile", CONSULT_PROFILE, "whoami"]);
  if (again.status !== 0 || !(again.stdout || "").includes(ZENGZHI_CONSULT_APP_ID)) {
    throw new Error(`增值咨询 profile 不可用：${(again.stderr || again.stdout || "").slice(0, 400)}`);
  }
  console.log(`lark-cli profile=${CONSULT_PROFILE} ready (default workspace profile unchanged)`);
}

async function handleConfirmScene(args: {
  event: CardActionEvent;
  value: Record<string, string>;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  logDir: string;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const { event, value, details, personnel } = args;
  const vascNo = value.vascNo;
  const sceneKey = value.sceneKey;
  const operatorId = event.operator_id || "";
  if (!vascNo || !sceneKey) {
    console.warn("card action missing vascNo/sceneKey", value);
    return;
  }
  const name = await operatorName(personnelDirectory(), operatorId, event.chat_id);
  console.log(`card.action.trigger received: vascNo=${vascNo} sceneKey=${sceneKey} operator=${name}`);

  const rec = store.get(vascNo);
  if (rec && (rec.status === "transferred" || rec.status === "written_back")) {
    console.log(`skip ${vascNo} already terminal status=${rec.status}`);
    return;
  }

  if (sceneKey === "transfer_human") {
    store.upsert({
      vascNo,
      status: "transferred",
      confirmedScene: "",
      confirmedSceneName: "人工处理",
      confirmedBy: name,
    });
  } else {
    store.upsert({
      vascNo,
      status: "scene_confirmed",
      confirmedScene: sceneKey,
      confirmedSceneName: sceneNameOf(sceneKey),
      confirmedBy: name,
    });
  }

  const original =
    parseOriginalCard(event.card_content || "") || (rec?.lastCard as FeishuCard | undefined) || null;
  if (event.token && original) {
    const updated = buildSceneConfirmedUpdateCard(original, sceneKey, name, operatorId);
    try {
      await updateInteractiveCard(event.token, updated);
      store.upsert({ vascNo, lastCard: updated });
      console.log(`card updated: ${sceneKey === "transfer_human" ? "转人工" : sceneNameOf(sceneKey)}`);
    } catch (err) {
      console.warn(`update card failed: ${err instanceof Error ? err.message : err}`);
    }
  } else if (event.token && !original) {
    console.warn("card_content empty, skip card update (cannot guess structure)");
  }

  if (sceneKey === "transfer_human") {
    console.log("transferred — not rerunning pipeline");
    return;
  }

  const detail = details.find((item) => asText(item.orderNo) === vascNo);
  if (!detail) {
    console.warn(`no input detail for ${vascNo}, cannot rerun pipeline`);
    return;
  }
  applyDemoRequiredFieldKeys(detail);
  console.log(`scene_confirmed → running pipeline from check-scene-completeness...`);
  const result = await runPipeline(detail, {
    skipLlm: false,
    sceneLlm: false,
    overrideScene: sceneKey,
  });
  if (!result) {
    console.warn(`pipeline returned empty for ${vascNo}`);
    return;
  }
  const nextStatus: CaseStatus = isSopGenerateFailure(result)
    ? "transferred"
    : result.outputPath === "sop_generated"
      ? "sop_ready"
      : result.outputPath === "needs_field_clarification" ||
          result.outputPath === "needs_requirement_clarification"
        ? "awaiting_reply"
        : "transferred";
  store.upsert({
    vascNo,
    status: nextStatus,
    aiOutputPath: result.outputPath,
    aiGeneratedText: result.llm?.text || result.analysis || "",
    llmSop: result.llm?.sop || null,
    matchResult: result.matchResult || {},
    missingFields: result.missing,
    llmError: result.llm?.error || null,
    failureType: failureTypeOf(result),
  });
  console.log(`rerun ${vascNo} scene=${sceneKey} → ${result.outputPath} gate=${result.failureGate || "-"}`);

  const threadId = store.get(vascNo)?.feishuThreadId || "";
  const chatId = event.chat_id || "";
  if (!chatId || !threadId) {
    console.warn(`cannot send follow-up card: chatId=${chatId || "-"} threadId=${threadId || "-"}`);
    return;
  }
  if (isSopGenerateFailure(result)) {
    const errCard = buildSopGenerateErrorCard(result, await personnelFor(details, vascNo, result));
    const sent = await sendCardMessage(chatId, errCard, threadId);
    store.upsert({
      vascNo,
      status: "transferred",
      lastCard: errCard,
      feishuMessageId: sent.messageId,
      notifyChannel: "card",
      failureType: "llm-generate-sop",
    });
    writeFileSync(
      resolve(args.logDir, `${vascNo}.sop-error-card.json`),
      `${JSON.stringify({ messageId: sent.messageId, threadId: sent.threadId, card: errCard }, null, 2)}\n`,
      "utf8",
    );
    console.log(`sop_generate_failed → red error card messageId=${sent.messageId}`);
  } else if (result.outputPath === "sop_generated") {
    const sopCard = buildSopCard(result, await personnelFor(details, vascNo, result));
    const sent = await sendCardMessage(chatId, sopCard, threadId);
    store.upsert({ vascNo, lastCard: sopCard, feishuMessageId: sent.messageId, notifyChannel: "card" });
    writeFileSync(
      resolve(args.logDir, `${vascNo}.sop-card.json`),
      `${JSON.stringify({ messageId: sent.messageId, threadId: sent.threadId, card: sopCard }, null, 2)}\n`,
      "utf8",
    );
    console.log(`sop_generated → sending SOP card to thread... messageId=${sent.messageId}`);
  } else if (
    result.outputPath === "needs_field_clarification" ||
    result.outputPath === "needs_requirement_clarification"
  ) {
    const askCard = buildAskCard(result, await personnelFor(details, vascNo, result));
    const sent = await sendCardMessage(chatId, askCard, threadId);
    store.upsert({
      vascNo,
      status: "awaiting_reply",
      lastCard: askCard,
      feishuMessageId: sent.messageId,
      notifyChannel: "card",
    });
    console.log(`${result.outputPath} → sent ask card messageId=${sent.messageId}`);
  }
}

async function handleConfirmSopWrite(args: {
  event: CardActionEvent;
  value: Record<string, string>;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  logDir: string;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const { event, value } = args;
  const vascNo = value.vascNo;
  const operatorId = event.operator_id || "";
  const people = (await personnelFor(args.details, vascNo)) || args.personnel;
  const name = await operatorName(personnelDirectory(), operatorId, event.chat_id);
  if (!vascNo) {
    console.warn("confirm_sop_write missing vascNo");
    return;
  }
  let rec = store.get(vascNo);
  if (rec?.status === "written_back") {
    console.log(`skip ${vascNo} already written_back`);
    return;
  }
  const sceneKey = value.sceneKey || rec?.confirmedScene || "";
  const sop = extractSopSections(rec || {}).operationSteps;
  const aiRequirementDescription = extractAiRequirementDescription(rec);
  const aiRequirementBackground = extractAiRequirementBackground(rec);
  console.log(
    `confirm_sop_write vascNo=${vascNo} sceneKey=${sceneKey} operator=${name} omsWrite=${isOmsWriteEnabled() ? "1" : "0"} stepsChars=${sop.length} rdChars=${aiRequirementDescription.length} bgChars=${aiRequirementBackground.length}`,
  );

  const writeArgs = {
    store,
    rec,
    vascNo,
    sceneKey,
    sop,
    aiRequirementDescription,
    aiRequirementBackground,
  };
  let { result: writeResult, attempt } = await runWriteDraft(writeArgs);
  rec = store.get(vascNo);
  if (!writeResult.success && !isOmsWriteGuardReject(writeResult)) {
    logOmsWriteFail(args.logDir, vascNo, writeResult.error || "未知错误", attempt);
    const cookieErr = refreshCookieBestEffort();
    if (cookieErr) appendPollLog(args.logDir, `oms_write_cookie_refresh_fail ${vascNo} ${cookieErr}`);
    rec = store.get(vascNo);
    ({ result: writeResult, attempt } = await runWriteDraft({ ...writeArgs, rec }));
    rec = store.get(vascNo);
    if (!writeResult.success && !isOmsWriteGuardReject(writeResult)) {
      logOmsWriteFail(args.logDir, vascNo, writeResult.error || "未知错误", attempt);
    }
  }
  if (!writeResult.success && isOmsWriteGuardReject(writeResult)) {
    appendPollLog(args.logDir, `oms_write_cancelled ${vascNo} ${writeResult.error || ""} skipped=${writeResult.skipped.join(",")}`);
  }

  const original =
    parseOriginalCard(event.card_content || "") || (rec?.lastCard as FeishuCard | undefined) || null;
  if (event.token && original) {
    const updated = buildSopActionUpdateCard({
      originalCard: original,
      kind: writeCardKind(writeResult),
      confirmedBy: name,
      dryRun: writeResult.dryRun,
      error: writeFailHint(writeResult, Math.max(0, MAX_OMS_WRITE_MANUAL - (rec?.omsWriteManualRetries || 0))),
      operatorOpenId: operatorId,
    });
    try {
      await updateInteractiveCard(event.token, updated);
      store.upsert({ vascNo, lastCard: updated });
    } catch (err) {
      console.warn(`update SOP card failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (writeResult.success) {
    await finishOmsWriteSuccess({
      store,
      rec,
      event,
      vascNo,
      name,
      writeResult,
    });
    return;
  }

  if (isOmsWriteGuardReject(writeResult)) {
    await handleWriteGuardReject({
      store,
      rec: store.get(vascNo),
      event,
      vascNo,
      writeResult,
      personnel: people,
    });
    return;
  }

  const manualDone = rec?.omsWriteManualRetries || 0;
  const remaining = Math.max(0, MAX_OMS_WRITE_MANUAL - manualDone);
  await sendWriteRetryCard({
    store,
    rec: store.get(vascNo),
    event,
    vascNo,
    sceneKey,
    error: writeResult.error || "未知错误",
    personnel: people,
    remainingManual: remaining,
  });
}

async function handleRetrySopWrite(args: {
  event: CardActionEvent;
  value: Record<string, string>;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  logDir: string;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const { event, value } = args;
  const vascNo = value.vascNo;
  const operatorId = event.operator_id || "";
  const people = (await personnelFor(args.details, vascNo)) || args.personnel;
  const name = await operatorName(personnelDirectory(), operatorId, event.chat_id);
  if (!vascNo) {
    console.warn("retry_sop_write missing vascNo");
    return;
  }
  let rec = store.get(vascNo);
  if (rec?.status === "written_back") {
    console.log(`skip ${vascNo} already written_back`);
    return;
  }
  const sceneKey = value.sceneKey || rec?.confirmedScene || "";
  const manual = (rec?.omsWriteManualRetries || 0) + 1;
  store.upsert({ vascNo, omsWriteManualRetries: manual });
  rec = store.get(vascNo);
  console.log(`retry_sop_write vascNo=${vascNo} manual=${manual}/${MAX_OMS_WRITE_MANUAL} operator=${name}`);

  const original =
    parseOriginalCard(event.card_content || "") || (rec?.lastCard as FeishuCard | undefined) || null;

  if (manual > MAX_OMS_WRITE_MANUAL) {
    if (event.token && original) {
      const updated = buildSopActionUpdateCard({
        originalCard: original,
        kind: "write_failed",
        confirmedBy: name,
        error: "已超过重试次数，请联系开发排查",
        operatorOpenId: operatorId,
      });
      try {
        await updateInteractiveCard(event.token, updated);
        store.upsert({ vascNo, lastCard: updated });
      } catch (err) {
        console.warn(`update retry card failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    await sendWriteRetryCard({
      store,
      rec: store.get(vascNo),
      event,
      vascNo,
      sceneKey,
      error: "已超过重试次数",
      personnel: people,
      remainingManual: 0,
    });
    return;
  }

  const cookieErr = refreshCookieBestEffort();
  if (cookieErr) appendPollLog(args.logDir, `oms_write_cookie_refresh_fail ${vascNo} ${cookieErr}`);
  rec = store.get(vascNo);
  const sop = extractSopSections(rec || {}).operationSteps;
  const { result: writeResult, attempt } = await runWriteDraft({
    store,
    rec,
    vascNo,
    sceneKey,
    sop,
    aiRequirementDescription: extractAiRequirementDescription(rec),
    aiRequirementBackground: extractAiRequirementBackground(rec),
  });
  rec = store.get(vascNo);
  if (!writeResult.success && isOmsWriteGuardReject(writeResult)) {
    appendPollLog(args.logDir, `oms_write_cancelled ${vascNo} ${writeResult.error || ""} skipped=${writeResult.skipped.join(",")}`);
  } else if (!writeResult.success) {
    logOmsWriteFail(args.logDir, vascNo, writeResult.error || "未知错误", attempt);
  }

  if (event.token && original) {
    const remainingAfter = Math.max(0, MAX_OMS_WRITE_MANUAL - manual);
    const updated = buildSopActionUpdateCard({
      originalCard: original,
      kind: writeCardKind(writeResult),
      confirmedBy: name,
      dryRun: writeResult.dryRun,
      error: writeFailHint(writeResult, remainingAfter),
      operatorOpenId: operatorId,
    });
    try {
      await updateInteractiveCard(event.token, updated);
      store.upsert({ vascNo, lastCard: updated });
    } catch (err) {
      console.warn(`update retry card failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (writeResult.success) {
    await finishOmsWriteSuccess({
      store,
      rec,
      event,
      vascNo,
      name,
      writeResult,
    });
    return;
  }

  if (isOmsWriteGuardReject(writeResult)) {
    await handleWriteGuardReject({
      store,
      rec: store.get(vascNo),
      event,
      vascNo,
      writeResult,
      personnel: people,
    });
    return;
  }

  const remaining = Math.max(0, MAX_OMS_WRITE_MANUAL - manual);
  await sendWriteRetryCard({
    store,
    rec: store.get(vascNo),
    event,
    vascNo,
    sceneKey,
    error: remaining > 0 ? writeResult.error || "未知错误" : `${writeResult.error || "未知错误"}。请联系开发排查`,
    personnel: people,
    remainingManual: remaining,
  });
}

async function finishOmsWriteSuccess(args: {
  store: CaseStore;
  rec: CaseRecord | undefined;
  event: CardActionEvent;
  vascNo: string;
  name: string;
  writeResult: DraftWriteResult;
}): Promise<void> {
  const { store, rec, event, vascNo, name, writeResult } = args;
  store.upsert({
    vascNo,
    status: "written_back",
    reviewRemark: writeResult.dryRun
      ? `SOP 已写入 OMS 草稿（dry-run）by ${name}`
      : `SOP 已写入 OMS 草稿 by ${name}`,
  });
  if (writeResult.missingOmsScene && !writeResult.dryRun) {
    const match = rec?.matchResult as { sceneKey?: string; decision?: string } | undefined;
    const escalate = needsOmsSceneConfirm({
      sceneKey: asText(match?.sceneKey) || rec?.confirmedScene,
      decision: asText(match?.decision),
      outputPath: rec?.aiOutputPath || "sop_generated",
      riskFlags: rec?.riskFlags,
    });
    if (escalate) {
    const notify = await notifyOwnerMissingOmsScene({
      vascNo,
      sceneKey: asText((rec?.matchResult as { sceneKey?: string } | undefined)?.sceneKey),
      sceneName: asText((rec?.matchResult as { scenarioName?: string } | undefined)?.scenarioName),
      customer: rec?.customer,
      warehouse: rec?.warehouse,
    });
    console.log(`missing_oms_scene_dm ${vascNo} ${notify}`);
    } else {
      console.log(`missing_oms_scene_skip_dm ${vascNo} outbound_leave_empty`);
    }
  }
  const chatId = event.chat_id || "";
  const threadId = rec?.feishuThreadId || "";
  if (chatId && threadId) {
    const mode = writeResult.dryRun ? "（dry-run 模式）" : "";
    const text = `✅ 已将 SOP 草稿写入 OMS 增值单 ${vascNo}${mode}。请在 OMS 中人工审核通过。`;
    await sendCardMessage(
      chatId,
      {
        header: { title: { tag: "plain_text", content: "OMS 草稿回执" }, template: "green" },
        elements: [{ tag: "div", text: { tag: "lark_md", content: `${text}\n💪` } }],
      },
      threadId,
    );
  }
  console.log(
    `sop written vascNo=${vascNo} dryRun=${writeResult.dryRun} written=${writeResult.written.join(",") || "-"} readBackSop=${(writeResult.readBack?.sop || "").slice(0, 80)}`,
  );
}

async function handleSopNeedsEdit(args: {
  event: CardActionEvent;
  value: Record<string, string>;
  storePath: string;
  personnel: DemoPersonnel;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const { event, value, personnel } = args;
  const vascNo = value.vascNo;
  const operatorId = event.operator_id || "";
  const name = await operatorName(personnelDirectory(), operatorId, event.chat_id);
  if (!vascNo) return;
  const rec = store.get(vascNo);
  if (rec?.status === "written_back" || rec?.status === "transferred") {
    console.log(`skip ${vascNo} sop_needs_edit status=${rec.status}`);
    return;
  }
  const originalSop = rec?.aiGeneratedText || "";
  const editCount = sopEditCountOf(rec);
  const original =
    parseOriginalCard(event.card_content || "") || (rec?.lastCard as FeishuCard | undefined) || null;
  const exhausted = editCount >= MAX_SOP_EDITS;

  if (event.token && original) {
    const updated = buildSopActionUpdateCard({
      originalCard: original,
      kind: exhausted ? "sop_edit_exhausted" : "sop_needs_edit",
      confirmedBy: name,
      operatorOpenId: operatorId,
    });
    try {
      await updateInteractiveCard(event.token, updated);
      store.upsert({ vascNo, lastCard: updated });
    } catch (err) {
      console.warn(`update SOP card failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (exhausted) {
    store.upsert({ vascNo, status: "transferred", confirmedBy: name });
    appendBadcase({
      type: "sop_edit_exhausted",
      vascNo,
      originalSop,
      reason: "已修改 3 次仍不满意，转人工处理",
      editCount,
      confirmedBy: name,
    });
    const chatId = event.chat_id || "";
    const threadId = rec?.feishuThreadId || "";
    if (chatId && threadId) {
      await sendCardMessage(
        chatId,
        {
          header: { title: { tag: "plain_text", content: "已转人工" }, template: "red" },
          elements: [
            {
              tag: "div",
              text: { tag: "lark_md", content: `已修改 3 次仍不满意，转人工处理。\n💪` },
            },
          ],
        },
        threadId,
      );
    }
    console.log(`sop_needs_edit vascNo=${vascNo} operator=${name} → transferred (editCount=${editCount})`);
    return;
  }

  const requestedAt = new Date().toISOString();
  store.upsert({
    vascNo,
    status: "sop_editing",
    confirmedBy: name,
    sopEditRequestedAt: requestedAt,
  });
  appendBadcase({
    type: "sop_rejected",
    vascNo,
    originalSop,
    reason: "审核员点击SOP需修改",
    editCount,
    confirmedBy: name,
  });
  const chatId = event.chat_id || "";
  const threadId = rec?.feishuThreadId || "";
  if (chatId && threadId) {
    try {
      await sendConsultThreadText(
        threadId,
        "请在本话题直接回复修改意见（不必艾特）。收到后我会马上开始改写，并在这里展示进度。\n💪",
      );
    } catch (err) {
      console.warn(`sop_editing hint failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`sop_needs_edit vascNo=${vascNo} operator=${name} → sop_editing (editCount=${editCount})`);
}

async function handleSceneWrong(args: {
  event: CardActionEvent;
  value: Record<string, string>;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const { event, value, details, personnel } = args;
  const vascNo = value.vascNo;
  const operatorId = event.operator_id || "";
  if (!vascNo) {
    console.warn("scene_wrong missing vascNo");
    return;
  }
  const rec = store.get(vascNo);
  if (rec?.status === "written_back") {
    console.log(`skip ${vascNo} scene_wrong status=${rec.status}`);
    return;
  }
  const name = await operatorName(personnelDirectory(), operatorId, event.chat_id);
  const detail = details.find((item) => asText(item.orderNo) === vascNo);
  if (!detail) {
    console.warn(`no input detail for ${vascNo}, cannot reopen scene confirm`);
    return;
  }
  applyDemoRequiredFieldKeys(detail);
  const result = await runPipeline(detail, { skipLlm: true, sceneLlm: false });
  if (!result) {
    console.warn(`pipeline empty for scene_wrong ${vascNo}`);
    return;
  }
  const people = (await personnelFor(details, vascNo, result)) || personnel;
  const candidates = collectSceneCandidates(result.matchResult);
  const card = buildSceneConfirmCard(result, people, candidates);
  const chatId = event.chat_id || "";
  const threadId = rec?.feishuThreadId || "";
  if (!chatId || !threadId) {
    console.warn(`cannot send scene card: chatId=${chatId || "-"} threadId=${threadId || "-"}`);
    return;
  }
  const sent = await sendCardMessage(chatId, card, threadId);
  appendBadcase({
    type: "auditor_reply_feedback",
    feedbackType: "scene_wrong",
    repairBucket: "A",
    reason: "审核员指出场景识别不对",
    vascNo,
    status: rec?.status || "",
    aiOutputPath: rec?.aiOutputPath || "",
    ruleOutputPath: rec?.ruleOutputPath || "",
    missingFields: rec?.missingFields || [],
    operatorOpenId: operatorId,
    messageId: event.message_id || "",
    threadId,
  });
  store.upsert({
    vascNo,
    status: "awaiting_scene_confirm",
    confirmedScene: "",
    confirmedSceneName: "",
    confirmedBy: name,
    failureType: "scene_uncertain",
    lastCard: card,
    feishuMessageId: sent.messageId,
    notifyChannel: "card",
    feishuThreadId: rec?.feishuThreadId || threadId,
    matchResult: result.matchResult || rec?.matchResult || {},
    sceneCandidateList: candidates,
  });
  console.log(`scene_wrong vascNo=${vascNo} operator=${name} → awaiting_scene_confirm messageId=${sent.messageId}`);
}

async function handleSkipCompleteness(args: {
  event: CardActionEvent;
  value: Record<string, string>;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  logDir: string;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const { event, value, details } = args;
  const vascNo = value.vascNo;
  const operatorId = event.operator_id || "";
  if (!vascNo) {
    console.warn("skip_completeness missing vascNo");
    return;
  }
  const rec = store.get(vascNo);
  if (rec?.status === "written_back") {
    console.log(`skip ${vascNo} skip_completeness status=${rec.status}`);
    return;
  }
  const match = asRecord(rec?.matchResult);
  const sceneKey =
    value.sceneKey || rec?.confirmedScene || asText(match.sceneKey) || asText(match.scenarioId);
  if (!sceneKey) {
    console.warn(`skip_completeness ${vascNo} missing sceneKey`);
    return;
  }
  const name = await operatorName(personnelDirectory(), operatorId, event.chat_id);
  const detail = details.find((item) => asText(item.orderNo) === vascNo);
  if (!detail) {
    console.warn(`no input detail for ${vascNo}, cannot skip completeness`);
    return;
  }
  applyDemoRequiredFieldKeys(detail);
  store.upsert({
    vascNo,
    status: "scene_confirmed",
    confirmedScene: sceneKey,
    confirmedSceneName: sceneNameOf(sceneKey),
    confirmedBy: name,
  });
  console.log(`skip_completeness → running pipeline L4 with scene=${sceneKey}...`);
  const result = await runPipeline(detail, {
    skipLlm: false,
    sceneLlm: false,
    overrideScene: sceneKey,
    skipCompleteness: true,
  });
  if (!result) {
    console.warn(`pipeline returned empty for skip_completeness ${vascNo}`);
    return;
  }
  const nextStatus: CaseStatus = isSopGenerateFailure(result)
    ? "transferred"
    : result.outputPath === "sop_generated"
      ? "sop_ready"
      : result.outputPath === "needs_field_clarification" ||
          result.outputPath === "needs_requirement_clarification"
        ? "awaiting_reply"
        : "transferred";
  store.upsert({
    vascNo,
    status: nextStatus,
    aiOutputPath: result.outputPath,
    aiGeneratedText: result.llm?.text || result.analysis || "",
    llmSop: result.llm?.sop || null,
    matchResult: result.matchResult || {},
    missingFields: result.missing,
    llmError: result.llm?.error || null,
    failureType: failureTypeOf(result),
  });
  console.log(`skip_completeness ${vascNo} scene=${sceneKey} → ${result.outputPath} status=${nextStatus}`);

  const threadId = store.get(vascNo)?.feishuThreadId || "";
  const chatId = event.chat_id || "";
  if (!chatId || !threadId) {
    console.warn(`cannot send follow-up card: chatId=${chatId || "-"} threadId=${threadId || "-"}`);
    return;
  }
  if (isSopGenerateFailure(result)) {
    const errCard = buildSopGenerateErrorCard(result, await personnelFor(details, vascNo, result));
    const sent = await sendCardMessage(chatId, errCard, threadId);
    store.upsert({
      vascNo,
      status: "transferred",
      lastCard: errCard,
      feishuMessageId: sent.messageId,
      notifyChannel: "card",
      failureType: "llm-generate-sop",
    });
    writeFileSync(
      resolve(args.logDir, `${vascNo}.sop-error-card.json`),
      `${JSON.stringify({ messageId: sent.messageId, threadId: sent.threadId, card: errCard }, null, 2)}\n`,
      "utf8",
    );
    console.log(`sop_generate_failed → red error card messageId=${sent.messageId}`);
    return;
  }
  if (result.outputPath === "sop_generated") {
    const sopCard = buildSopCard(result, await personnelFor(details, vascNo, result));
    const sent = await sendCardMessage(chatId, sopCard, threadId);
    store.upsert({ vascNo, lastCard: sopCard, feishuMessageId: sent.messageId, notifyChannel: "card" });
    writeFileSync(
      resolve(args.logDir, `${vascNo}.sop-card.json`),
      `${JSON.stringify({ messageId: sent.messageId, threadId: sent.threadId, card: sopCard }, null, 2)}\n`,
      "utf8",
    );
    console.log(`sop_generated → SOP card messageId=${sent.messageId}`);
    return;
  }
  const askCard = buildAskCard(result, await personnelFor(details, vascNo, result));
  const sent = await sendCardMessage(chatId, askCard, threadId);
  store.upsert({
    vascNo,
    status: "awaiting_reply",
    lastCard: askCard,
    feishuMessageId: sent.messageId,
    notifyChannel: "card",
  });
  console.log(`${result.outputPath} → sent ask card messageId=${sent.messageId}`);
}

async function pipelineForVasc(details: JsonRecord[], vascNo: string): Promise<PipelineResult | null> {
  const detail = details.find((item) => asText(item.orderNo) === vascNo);
  if (!detail) return null;
  applyDemoRequiredFieldKeys(detail);
  return runPipeline(detail, { skipLlm: true, sceneLlm: false });
}

function stubResultFromCase(rec: CaseRecord | undefined, vascNo: string, details: JsonRecord[] = []): PipelineResult {
  const detail = details.find((item) => asText(item.orderNo) === vascNo);
  const header = asRecord(detail?.listHeader);
  const customer = asRecord(header.customer);
  const code = asText(header.customerCode) || asText(customer.customerCode);
  const name = visibleCustomerName(customerNameFromHeader(header)) || visibleCustomerName(rec?.customer);
  return {
    orderNo: vascNo,
    outputPath: "transfer_human",
    contextFacts: {
      customerCode: code,
      customerName: name,
      warehouseName: rec?.warehouse || "",
      vaSource: "",
      businessTypeDesc: "",
    },
    matchResult: rec?.matchResult || {},
  } as PipelineResult;
}

async function handleShowAllScenes(args: {
  event: CardActionEvent;
  value: Record<string, string>;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const { event, value, details, personnel } = args;
  const vascNo = value.vascNo;
  if (!vascNo) {
    console.warn("show_all_scenes missing vascNo");
    return;
  }
  const rec = store.get(vascNo);
  if (rec?.status === "written_back" || rec?.status === "transferred") {
    console.log(`skip ${vascNo} show_all_scenes status=${rec.status}`);
    return;
  }
  const result = (await pipelineForVasc(details, vascNo)) || stubResultFromCase(rec, vascNo, details);
  const people = (await personnelFor(details, vascNo, result)) || personnel;
  const card = buildAllScenesCard(result, people, orderCategoryOf(result));
  const chatId = event.chat_id || "";
  const threadId = rec?.feishuThreadId || "";
  if (!chatId || !threadId) {
    console.warn(`cannot send all-scenes card: chatId=${chatId || "-"} threadId=${threadId || "-"}`);
    return;
  }
  const sent = await sendCardMessage(chatId, card, threadId);
  store.upsert({
    vascNo,
    status: "awaiting_scene_confirm",
    lastCard: card,
    feishuMessageId: sent.messageId,
    notifyChannel: "card",
    feishuThreadId: rec?.feishuThreadId || threadId,
    matchResult: result.matchResult || rec?.matchResult || {},
  });
  console.log(`show_all_scenes vascNo=${vascNo} category=${orderCategoryOf(result) || "inbound"} messageId=${sent.messageId}`);
}

async function handleCanaryPromote(args: {
  event: CardActionEvent;
  storePath: string;
  logDir: string;
}): Promise<void> {
  const store = new CaseStore(args.storePath);
  const canary = new CanaryGate(store);
  const first = canary.promote();
  appendPollLog(args.logDir, `canary_promote clicked first=${first ? "1" : "0"} operator=${args.event.operator_id || "-"}`);
  const stats = await replayCanaryToOfficial({
    store,
    canary,
    log: (line) => appendPollLog(args.logDir, line),
  });
  appendPollLog(
    args.logDir,
    `canary_promote_done sent=${stats.sent} skipped=${stats.skipped} failed=${stats.failed}`,
  );
  if (!args.event.token) return;
  const already = !first && stats.sent === 0 && stats.skipped === 0 && stats.failed === 0;
  try {
    await updateInteractiveCard(args.event.token, buildCanaryPromotedUpdateCard({ ...stats, already }));
  } catch (err) {
    console.warn(`canary_promote update card failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function handleCardAction(args: {
  event: CardActionEvent;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  logDir: string;
}): Promise<void> {
  const event = normalizeCardEvent(args.event);
  const eventId = event.event_id || `${event.message_id}:${event.operator_id}:${event.action_value}`;
  if (eventId && seenEvents.has(eventId)) {
    console.log(`skip duplicate event ${eventId}`);
    return;
  }
  if (eventId) seenEvents.add(eventId);

  if (event.chat_id) {
    const blocked = await rejectIfForbidden({
      chatId: event.chat_id,
      senderOpenId: event.operator_id,
      senderTenantKey: event.operator_tenant_key,
    });
    if (blocked) return;
  }

  const value = parseCardActionValue(event.action_value);
  console.log(
    `event in: name=${event.action_name || "-"} action=${value.action || "-"} vasc=${value.vascNo || "-"} msg=${event.message_id || "-"}`,
  );
  if (value.action === "canary_promote" || event.action_name === "canary_promote") {
    await handleCanaryPromote({
      event,
      storePath: args.storePath,
      logDir: args.logDir,
    });
    return;
  }
  if (value.action === "retry_sop_write") {
    await handleRetrySopWrite({
      event,
      value,
      storePath: args.storePath,
      details: args.details,
      personnel: args.personnel,
      logDir: args.logDir,
    });
    return;
  }
  if (
    value.action === "confirm_sop" ||
    value.action === "confirm_sop_write" ||
    value.action === "sop_needs_edit" ||
    value.action === "scene_wrong" ||
    value.action === "skip_completeness" ||
    value.action === "show_all_scenes" ||
    value.action === "confirm_scene"
  ) {
    console.log(`action_ignored ${value.action} vascNo=${value.vascNo || "-"} (edit in OMS)`);
    return;
  }
  if (!value.action) console.log("skip event without action_value");
}

function applyDemoRequiredFieldKeys(detail: JsonRecord): void {
  const keys = asArray(detail.demoRequiredFieldKeys).map((item) => asText(item)).filter(Boolean);
  const sceneKey = asText(detail.demoSceneKey);
  if (!keys.length || !sceneKey) return;
  const card = findScenarioCard(sceneKey);
  if (!card) return;
  card.requiredAttachmentPolicy.requiredFieldKeys = keys;
}

const SCENE_SEARCH_STATUSES: CaseStatus[] = ["awaiting_scene_confirm", "sop_ready"];

function mentionOpenIds(raw: unknown): string[] {
  const ids: string[] = [];
  for (const item of asArray(raw)) {
    const rec = asRecord(item);
    const nested = asRecord(rec.id);
    const id = asText(rec.open_id) || asText(nested.open_id) || asText(rec.id);
    if (id) ids.push(id);
  }
  return ids;
}

function extractMessageText(content: string): string {
  const raw = asText(content);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as unknown;
    const rec = asRecord(parsed);
    return asText(rec.text) || asText(rec.content) || raw;
  } catch {
    return raw;
  }
}

function parseImMessage(raw: unknown): {
  eventId: string;
  messageId: string;
  chatId: string;
  threadId: string;
  chatType: string;
  senderType: string;
  senderOpenId: string;
  senderTenantKey: string;
  text: string;
  mentionIds: string[];
} | null {
  const top = asRecord(raw);
  const event = Object.keys(asRecord(top.event)).length ? asRecord(top.event) : top;
  const message = Object.keys(asRecord(event.message)).length ? asRecord(event.message) : event;
  const sender = asRecord(event.sender);
  const senderId = asRecord(sender.sender_id);
  const messageId = asText(message.message_id) || asText(top.message_id);
  const chatId = asText(message.chat_id) || asText(top.chat_id);
  const threadId =
    asText(message.thread_id) || asText(message.root_id) || asText(top.thread_id) || asText(top.root_id);
  const msgType = asText(message.message_type) || asText(top.message_type) || "text";
  if (msgType && msgType !== "text") return null;
  const text = extractMessageText(asText(message.content) || asText(top.content))
    .replace(/@_user_\d+/g, " ")
    .replace(/@\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    eventId: asText(top.event_id) || asText(event.event_id) || messageId,
    messageId,
    chatId,
    threadId,
    chatType: asText(message.chat_type) || asText(event.chat_type),
    senderType: asText(sender.sender_type) || asText(top.sender_type),
    senderOpenId: asText(senderId.open_id) || asText(sender.open_id),
    senderTenantKey: asText(sender.tenant_key),
    text,
    mentionIds: mentionOpenIds(message.mentions || top.mentions),
  };
}

function isBotMentioned(parsed: { mentionIds: string[] }, botOpenId: string): boolean {
  if (botOpenId) return parsed.mentionIds.includes(botOpenId);
  return parsed.mentionIds.length > 0;
}

function shouldGateAccess(parsed: { chatType: string; threadId: string; mentionIds: string[] }, botOpenId: string): boolean {
  if (parsed.chatType === "p2p") return true;
  if (isBotMentioned(parsed, botOpenId)) return true;
  if (!parsed.chatType && !parsed.threadId) return true;
  return false;
}

function findCaseByThread(store: CaseStore, threadId: string): CaseRecord | undefined {
  if (!threadId) return undefined;
  return store.list().find((rec) => {
    const ids = [rec.feishuThreadId, rec.feishuMessageId, rec.feishuTopicId].filter(Boolean);
    return ids.includes(threadId);
  });
}

function isTerminalStatus(status: string): boolean {
  return status === "written_back" || status === "transferred";
}

function isClarificationCase(rec: CaseRecord): boolean {
  return isL1L25OutputPath(rec.aiOutputPath || rec.ruleOutputPath) || isL1L25OutputPath(rec.ruleOutputPath);
}

async function handleAuditorMentionFeedback(args: {
  parsed: {
    eventId: string;
    messageId: string;
    chatId: string;
    threadId: string;
    senderOpenId: string;
    text: string;
  };
  rec: CaseRecord;
  storePath: string;
}): Promise<boolean> {
  const text = args.parsed.text || "";
  const classification = classifyAuditorReply(text);
  if (!classification.matched) return false;

  const store = new CaseStore(args.storePath);
  appendBadcase({
    type: "auditor_reply_feedback",
    feedbackType: classification.type,
    repairBucket: classification.repairBucket,
    reason: classification.reason,
    vascNo: args.rec.vascNo,
    status: args.rec.status,
    aiOutputPath: args.rec.aiOutputPath,
    ruleOutputPath: args.rec.ruleOutputPath,
    missingFields: args.rec.missingFields || [],
    replyText: text,
    operatorOpenId: args.parsed.senderOpenId,
    messageId: args.parsed.messageId,
    threadId: args.parsed.threadId,
  });

  if (isClarificationCase(args.rec) && !isTerminalStatus(args.rec.status)) {
    store.upsert({
      vascNo: args.rec.vascNo,
      status: "reply_received",
      replyReceivedAt: new Date().toISOString(),
      lastSceneReplyText: text,
      reviewRemark: `审核员@反馈已收录：${classification.reason}`,
    });
  }

  if (args.parsed.chatId && args.parsed.threadId) {
    await sendConsultThreadText(
      args.parsed.threadId,
      `已收录 badcase：${classification.reason}（修复桶 ${classification.repairBucket}）。后续会纳入 L1/L2.5 质量对照。`,
    ).catch((err) => {
      console.warn(`auditor feedback ack failed: ${err instanceof Error ? err.message : err}`);
    });
  }
  console.log(
    `auditor_feedback vascNo=${args.rec.vascNo} type=${classification.type} bucket=${classification.repairBucket}`,
  );
  return true;
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

function cardEventFromIm(parsed: {
  messageId: string;
  chatId: string;
  senderOpenId: string;
}): CardActionEvent {
  return {
    chat_id: parsed.chatId,
    operator_id: parsed.senderOpenId,
    message_id: parsed.messageId,
  };
}

async function handleIncomingIm(args: {
  raw: unknown;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  botOpenId: string;
}): Promise<void> {
  const parsed = parseImMessage(args.raw);
  if (!parsed) return;
  if (parsed.senderType === "app") return;
  if (shouldGateAccess(parsed, args.botOpenId) && parsed.chatId) {
    const blocked = await rejectIfForbidden({
      chatId: parsed.chatId,
      chatType: parsed.chatType,
      senderOpenId: parsed.senderOpenId,
      senderTenantKey: parsed.senderTenantKey,
    });
    if (blocked) return;
  }
  if (!parsed.threadId) return;
  const store = new CaseStore(args.storePath);
  const rec = findCaseByThread(store, parsed.threadId);
  if (!rec) {
    return handleBotMessage(args);
  }
  const text = parsed.text || "";
  const event = cardEventFromIm(parsed);
  if (/以上都不对|查看更多场景/.test(text)) {
    if (parsed.eventId && seenEvents.has(`im:${parsed.eventId}`)) return;
    if (parsed.eventId) seenEvents.add(`im:${parsed.eventId}`);
    console.log(`im.message as-click show_all_scenes vascNo=${rec.vascNo} operator=${parsed.senderOpenId}`);
    await handleShowAllScenes({
      event,
      value: { action: "show_all_scenes", vascNo: rec.vascNo },
      storePath: args.storePath,
      details: args.details,
      personnel: args.personnel,
    });
    return;
  }
  if (/场景不对/.test(text)) {
    if (parsed.eventId && seenEvents.has(`im:${parsed.eventId}`)) return;
    if (parsed.eventId) seenEvents.add(`im:${parsed.eventId}`);
    console.log(`im.message as-click scene_wrong vascNo=${rec.vascNo} operator=${parsed.senderOpenId}`);
    await handleSceneWrong({
      event,
      value: { action: "scene_wrong", vascNo: rec.vascNo, sceneKey: rec.confirmedScene || "" },
      storePath: args.storePath,
      details: args.details,
      personnel: args.personnel,
    });
    return;
  }
  return handleBotMessage(args);
}

async function handleBotMessage(args: {
  raw: unknown;
  storePath: string;
  details: JsonRecord[];
  personnel: DemoPersonnel;
  botOpenId: string;
}): Promise<void> {
  const parsed = parseImMessage(args.raw);
  if (!parsed) return;
  if (parsed.senderType === "app") return;
  if (!parsed.threadId) return;
  const mentionedBot = args.botOpenId
    ? parsed.mentionIds.includes(args.botOpenId)
    : parsed.mentionIds.length > 0;
  if (!mentionedBot) return;
  if (parsed.eventId && seenEvents.has(`im:${parsed.eventId}`)) return;
  if (parsed.eventId) seenEvents.add(`im:${parsed.eventId}`);

  const store = new CaseStore(args.storePath);
  const rec = findCaseByThread(store, parsed.threadId);
  if (!rec) {
    console.log(`im.message skip unknown thread=${parsed.threadId}`);
    return;
  }
  const collected = await handleAuditorMentionFeedback({
    parsed,
    rec,
    storePath: args.storePath,
  });
  if (collected) return;
  if (!SCENE_SEARCH_STATUSES.includes(rec.status)) {
    console.log(`im.message skip ${rec.vascNo} status=${rec.status}`);
    return;
  }
  const text = parsed.text;
  if (!text) return;
  const result = (await pipelineForVasc(args.details, rec.vascNo)) || stubResultFromCase(rec, rec.vascNo, args.details);
  const people = (await personnelFor(args.details, rec.vascNo, result)) || args.personnel;
  const matched = searchSceneByKeyword(text);
  const chatId = parsed.chatId;
  const threadId = rec.feishuThreadId || parsed.threadId;
  if (!chatId || !threadId) return;
  console.log(`im.message search vascNo=${rec.vascNo} q=${text.slice(0, 40)} hits=${matched.length}`);

  if (matched.length === 0) {
    await sendConsultThreadText(
      threadId,
      "未找到匹配的场景。请用场景关键词重试，如「拍照暂存」或「货权转移」。也可以点「以上都不对，查看更多场景」。",
    );
    return;
  }
  const card =
    matched.length === 1
      ? buildSceneSearchSingleCard({ vascNo: rec.vascNo, scene: matched[0], personnel: people })
      : buildSceneSearchMultiCard({ vascNo: rec.vascNo, scenes: matched, personnel: people });
  const sent = await sendCardMessage(chatId, card, threadId);
  store.upsert({
    vascNo: rec.vascNo,
    lastCard: card,
    feishuMessageId: sent.messageId,
    notifyChannel: "card",
  });
}

function startEventConsumer(eventKey: string, onEvent: (event: unknown) => void): void {
  const spawnOnce = (): void => {
  const args = [
    "--profile",
    CONSULT_PROFILE,
    "event",
    "consume",
    eventKey,
    "--as",
    "bot",
    "--max-events",
    "500",
    "--timeout",
    "8h",
  ];
  const child = spawn("npx", ["lark-cli", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
      LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1",
    },
    shell: true,
    windowsHide: true,
  });
  let buf = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) continue;
      try {
        onEvent(JSON.parse(trimmed));
      } catch (err) {
        console.warn(`bad ${eventKey} json: ${err instanceof Error ? err.message : err}`);
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8").trim();
    if (text) console.error(text);
  });
  child.on("exit", (code, signal) => {
    console.log(`${eventKey} consumer exit code=${code} signal=${signal || "-"}；3 秒后重连`);
    setTimeout(spawnOnce, 3000);
  });
  child.on("error", (err) => {
    console.error(`failed to start lark-cli ${eventKey}: ${err.message}`);
    setTimeout(spawnOnce, 5000);
  });
  };
  spawnOnce();
}

async function main(): Promise<void> {
  loadEnvFiles();
  ensureConsultProfile();
  const storePath = resolveArgPath(arg("store"), "_runs/20260909_demo_e2e/card-test/case-store.json");
  const inputPath = resolveArgPath(arg("input"), "_runs/20260909_demo_e2e/demo-inputs.json");
  const personnelPath = resolveArgPath(arg("personnel"), "internal-review-copilot/config/personnel.json");
  const logDir = resolveArgPath(arg("out"), "_runs/20260909_demo_e2e/card-test");
  mkdirSync(logDir, { recursive: true });
  setPersonnelPath(personnelPath);

  const personnel = personnelDirectory();
  let details: JsonRecord[] = await loadListenDetails(inputPath);
  console.log(`listen-card-actions store=${storePath}`);
  console.log(`input=${inputPath} details=${details.length}`);
  console.log(`app=${ZENGZHI_CONSULT_APP_ID} profile=${CONSULT_PROFILE} --as bot`);
  console.log(`OMS_WRITE_ENABLED=${isOmsWriteEnabled() ? "1" : "0"} allowlist=${omsWriteAllowlist().join(",") || "-"}`);
  console.log(`personnel 审核员=${personnel["审核员"]?.name} openId=${personnel["审核员"]?.openId || "null"}`);

  if (hasFlag("seed-sop-card")) {
    const orderNo = arg("order") || "VASC000000360654";
    const store = new CaseStore(storePath);
    const rec = store.get(orderNo);
    const chatId = listenChatId();
    if (rec?.aiGeneratedText && chatId) {
      const stub = {
        orderNo,
        outputPath: "sop_generated",
        llm: { text: rec.aiGeneratedText, sop: rec.llmSop || undefined },
        contextFacts: {
          customerCode: asText(asRecord(details.find((item) => asText(item.orderNo) === orderNo)?.listHeader).customerCode),
          customerName: visibleCustomerName(rec.customer) || customerNameFromHeader(asRecord(details.find((item) => asText(item.orderNo) === orderNo)?.listHeader)),
          warehouseName: rec.warehouse,
          allEventNos: [] as string[],
        },
        matchResult: rec.matchResult,
      } as PipelineResult;
      const card = buildSopCard(stub, await personnelFor(details, orderNo, stub));
      try {
        const sent = await sendCardInNewTopic(chatId, demoTopicTitle(stub), card);
        store.upsert({
          vascNo: orderNo,
          status: "sop_ready",
          sopEditCount: 0,
          lastSopEditInstruction: "",
          lastCard: card,
          feishuThreadId: sent.threadId,
          feishuMessageId: sent.messageId,
          notifyChannel: "card",
        });
        console.log(`seed sop card ${orderNo} topic=${sent.topicId || "-"} thread=${sent.threadId} messageId=${sent.messageId}`);
      } catch (err) {
        console.warn(`seed-sop-card send failed: ${err instanceof Error ? err.message : err}`);
      }
    } else {
      console.warn(`seed-sop-card skip: missing rec/chat for ${orderNo}`);
    }
  }

  console.log("waiting for card.action.trigger + im.message.receive_v1 + sop_editing thread poll 12s ...");

  let chain = Promise.resolve();
  const enqueue = (fn: () => Promise<void>): void => {
    chain = chain.then(fn).catch((err) => {
      console.error(`listen queue error: ${err instanceof Error ? err.message : err}`);
    });
  };
  const botOpenId = resolveBotOpenId();
  console.log(`botOpenId=${botOpenId || "(empty; @bot 依赖 mention 列表)"}`);
  startEventConsumer("card.action.trigger", (event) => {
    enqueue(async () => {
      details = await loadListenDetails(inputPath);
      return handleCardAction({
        event: event as CardActionEvent,
        storePath,
        details,
        personnel,
        logDir,
      });
    });
  });
  // 飞书同一应用只允许一条事件总线。同时开 IM 会把卡片按钮顶掉。需要群内回复时再开 LISTEN_IM=1。
  if (envText("LISTEN_IM") === "1") {
    setTimeout(() => {
      startEventConsumer("im.message.receive_v1", (raw) => {
        enqueue(async () => {
          details = await loadListenDetails(inputPath);
          return handleIncomingIm({ raw, storePath, details, personnel, botOpenId });
        });
      });
    }, 20000);
  } else {
    console.log("LISTEN_IM=0：只听卡片按钮，不抢 IM 总线");
  }
  const pollMs = Number(arg("sop-poll-ms", "12000")) || 12000;
  const pollOnce = (): void => {
    enqueue(async () => {
      details = await loadListenDetails(inputPath);
      const store = new CaseStore(storePath);
      await refreshSopEdits({
        store,
        details,
        personnel: personnelDirectory(),
        log: (line) => console.log(line),
      });
    });
  };
  setTimeout(pollOnce, 3000);
  setInterval(pollOnce, pollMs);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
