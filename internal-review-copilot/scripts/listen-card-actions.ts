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
import { envText, loadEnvFiles, projectDir } from "../lib/env.ts";
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
  buildAskCard,
  buildOmsWriteRetryCard,
  buildSceneConfirmedUpdateCard,
  buildSopActionUpdateCard,
  buildSopCard,
  demoTopicTitle,
  parseCardActionValue,
  sceneNameOf,
  type DemoPersonnel,
  type FeishuCard,
} from "../lib/feishu-card.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import {
  defaultPersonnelPath,
  personnelDirectory,
  resolvePersonnelFromDetail,
  setPersonnelPath,
} from "../lib/personnel.ts";
import {
  extractAiRequirementBackground,
  extractAiRequirementDescription,
  isOmsWriteEnabled,
  omsWriteAllowlist,
  sceneCodeFromKey,
  writeDraft,
  type DraftWriteResult,
} from "../lib/oms-draft-write.ts";
import { extractSopSections } from "../lib/sop-sections.ts";
import { refreshSopEdits } from "../lib/refresh-sop-edits.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { findScenarioCard } from "../lib/scenario-cards.ts";
import { appendBadcase } from "../lib/badcase-log.ts";
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

function personnelFor(details: JsonRecord[], vascNo: string, result?: PipelineResult): DemoPersonnel {
  const detail = details.find((item) => asText(item.orderNo) === vascNo);
  return resolvePersonnelFromDetail(detail, result?.contextFacts);
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
      sceneOverviewCode: sceneCodeFromKey(args.sceneKey),
      sop: args.sop,
      aiRequirementDescription: args.aiRequirementDescription,
      aiRequirementBackground: args.aiRequirementBackground,
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
  const chatId = args.event.chat_id || envText("FEISHU_TEST_CHAT_ID");
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

interface CardActionEvent {
  type?: string;
  event_id?: string;
  action_name?: string;
  action_tag?: string;
  action_value?: string;
  operator_id?: string;
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
  if (rec && (rec.status === "sop_ready" || rec.status === "transferred" || rec.status === "written_back")) {
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
  console.log(`scene_confirmed → running pipeline from check-completeness...`);
  const result = await runPipeline(detail, {
    skipLlm: false,
    sceneLlm: false,
    overrideScene: sceneKey,
  });
  if (!result) {
    console.warn(`pipeline returned empty for ${vascNo}`);
    return;
  }
  const nextStatus: CaseStatus =
    result.outputPath === "sop_generated"
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
  });
  console.log(`rerun ${vascNo} scene=${sceneKey} → ${result.outputPath}`);

  const threadId = store.get(vascNo)?.feishuThreadId || "";
  const chatId = event.chat_id || "";
  if (!chatId || !threadId) {
    console.warn(`cannot send follow-up card: chatId=${chatId || "-"} threadId=${threadId || "-"}`);
    return;
  }
  if (result.outputPath === "sop_generated") {
    const sopCard = buildSopCard(result, personnelFor(details, vascNo, result));
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
    const askCard = buildAskCard(result, personnelFor(details, vascNo, result));
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
  const people = personnelFor(args.details, vascNo) || args.personnel;
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
  if (!writeResult.success) {
    logOmsWriteFail(args.logDir, vascNo, writeResult.error || "未知错误", attempt);
    const cookieErr = refreshCookieBestEffort();
    if (cookieErr) appendPollLog(args.logDir, `oms_write_cookie_refresh_fail ${vascNo} ${cookieErr}`);
    rec = store.get(vascNo);
    ({ result: writeResult, attempt } = await runWriteDraft({ ...writeArgs, rec }));
    rec = store.get(vascNo);
    if (!writeResult.success) {
      logOmsWriteFail(args.logDir, vascNo, writeResult.error || "未知错误", attempt);
    }
  }

  const original =
    parseOriginalCard(event.card_content || "") || (rec?.lastCard as FeishuCard | undefined) || null;
  if (event.token && original) {
    const updated = buildSopActionUpdateCard({
      originalCard: original,
      kind: writeResult.success ? "sop_written" : "write_failed",
      confirmedBy: name,
      dryRun: writeResult.dryRun,
      error: writeResult.success
        ? undefined
        : `${writeResult.error || "未知错误"}。请在话题内新卡片重试`,
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
  const people = personnelFor(args.details, vascNo) || args.personnel;
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
  if (!writeResult.success) {
    logOmsWriteFail(args.logDir, vascNo, writeResult.error || "未知错误", attempt);
  }

  if (event.token && original) {
    const remainingAfter = Math.max(0, MAX_OMS_WRITE_MANUAL - manual);
    const failHint = writeResult.success
      ? undefined
      : remainingAfter > 0
        ? `${writeResult.error || "未知错误"}。请在话题内新卡片重试`
        : `${writeResult.error || "未知错误"}。请联系开发排查`;
    const updated = buildSopActionUpdateCard({
      originalCard: original,
      kind: writeResult.success ? "sop_written" : "write_failed",
      confirmedBy: name,
      dryRun: writeResult.dryRun,
      error: failHint,
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

  const value = parseCardActionValue(event.action_value);
  console.log(
    `event in: name=${event.action_name || "-"} action=${value.action || "-"} vasc=${value.vascNo || "-"} msg=${event.message_id || "-"}`,
  );
  if (value.action === "confirm_sop") {
    console.log(`legacy confirm_sop ignored vascNo=${value.vascNo} result=${value.result}`);
    return;
  }
  if (value.action === "confirm_sop_write") {
    await handleConfirmSopWrite({
      event,
      value,
      storePath: args.storePath,
      details: args.details,
      personnel: args.personnel,
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
  if (value.action === "sop_needs_edit") {
    await handleSopNeedsEdit({ event, value, storePath: args.storePath, personnel: args.personnel });
    return;
  }
  if (value.action !== "confirm_scene") {
    if (!value.action) console.log("skip event without action_value");
    return;
  }
  if (event.action_name && event.action_name !== "scene_select") return;
  await handleConfirmScene({ ...args, event, value });
}

function applyDemoRequiredFieldKeys(detail: JsonRecord): void {
  const keys = asArray(detail.demoRequiredFieldKeys).map((item) => asText(item)).filter(Boolean);
  const sceneKey = asText(detail.demoSceneKey);
  if (!keys.length || !sceneKey) return;
  const card = findScenarioCard(sceneKey);
  if (!card) return;
  card.requiredAttachmentPolicy.requiredFieldKeys = keys;
}

function startEventConsumer(onEvent: (event: CardActionEvent) => void): void {
  const spawnOnce = (): void => {
  const args = [
    "--profile",
    CONSULT_PROFILE,
    "event",
    "consume",
    "card.action.trigger",
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
        onEvent(JSON.parse(trimmed) as CardActionEvent);
      } catch (err) {
        console.warn(`bad event json: ${err instanceof Error ? err.message : err}`);
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8").trim();
    if (text) console.error(text);
  });
  child.on("exit", (code, signal) => {
    console.log(`event consumer exit code=${code} signal=${signal || "-"}；3 秒后重连`);
    setTimeout(spawnOnce, 3000);
  });
  child.on("error", (err) => {
    console.error(`failed to start lark-cli: ${err.message}`);
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
  let details: JsonRecord[] = readDetailsFile(inputPath);
  console.log(`listen-card-actions store=${storePath}`);
  console.log(`input=${inputPath} details=${details.length}`);
  console.log(`app=${ZENGZHI_CONSULT_APP_ID} profile=${CONSULT_PROFILE} --as bot`);
  console.log(`OMS_WRITE_ENABLED=${isOmsWriteEnabled() ? "1" : "0"} allowlist=${omsWriteAllowlist().join(",") || "-"}`);
  console.log(`personnel 审核员=${personnel["审核员"]?.name} openId=${personnel["审核员"]?.openId || "null"}`);

  if (hasFlag("seed-sop-card")) {
    const orderNo = arg("order") || "VASC000000360654";
    const store = new CaseStore(storePath);
    const rec = store.get(orderNo);
    const chatId = envText("FEISHU_TEST_CHAT_ID");
    if (rec?.aiGeneratedText && chatId) {
      const stub = {
        orderNo,
        outputPath: "sop_generated",
        llm: { text: rec.aiGeneratedText, sop: rec.llmSop || undefined },
        contextFacts: {
          customerName: rec.customer,
          warehouseName: rec.warehouse,
          allEventNos: [] as string[],
        },
        matchResult: rec.matchResult,
      } as PipelineResult;
      const card = buildSopCard(stub, personnelFor(details, orderNo, stub));
      const sent = await sendCardInNewTopic(chatId, demoTopicTitle("sop_generated", orderNo), card);
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
    } else {
      console.warn(`seed-sop-card skip: missing rec/chat for ${orderNo}`);
    }
  }

  console.log("waiting for card.action.trigger + sop_editing thread poll 12s ...");

  let chain = Promise.resolve();
  const enqueue = (fn: () => Promise<void>): void => {
    chain = chain.then(fn).catch((err) => {
      console.error(`listen queue error: ${err instanceof Error ? err.message : err}`);
    });
  };
  startEventConsumer((event) => {
    enqueue(() => {
      details = readDetailsFile(inputPath);
      return handleCardAction({ event, storePath, details, personnel, logDir });
    });
  });
  const pollMs = Number(arg("sop-poll-ms", "12000")) || 12000;
  const pollOnce = (): void => {
    enqueue(async () => {
      details = readDetailsFile(inputPath);
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
