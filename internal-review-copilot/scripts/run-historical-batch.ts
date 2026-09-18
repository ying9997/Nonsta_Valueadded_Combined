/**
 * Historical batch: multi-round pipeline + Feishu test-group replay.
 * Does not write OMS. Green-card buttons are kept but never clicked.
 *
 *   npx tsx internal-review-copilot/scripts/run-historical-batch.ts --pilot
 *   npx tsx internal-review-copilot/scripts/run-historical-batch.ts --pilot --resume
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ATTACHMENT_BY_FILE_TYPE, asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import { isOmsWriteEnabled } from "../lib/oms-draft-write.ts";
import { isRagEnabled } from "../lib/case-retriever.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import {
  createThread,
  sendCardMessage,
  sendConsultThreadText,
  sendThreadPlainText,
} from "../lib/feishu-bot.ts";
import {
  buildAskCard,
  buildSceneConfirmCard,
  buildSopCard,
  buildSopGenerateErrorCard,
  demoTopicTitle,
  judgmentBasis,
  shortSceneName,
  type DemoPersonnel,
} from "../lib/feishu-card.ts";
import { collectSceneCandidates } from "../lib/parse-scene-reply.ts";
import { isSopGenerateFailure, runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import { findScenarioCard } from "../lib/scenario-cards.ts";
import { extractSopSections } from "../lib/sop-sections.ts";
import { loadValidUserToken as peekUserToken } from "../lib/feishu-user-token.ts";
import type { JsonRecord } from "../lib/types.ts";

const TEST_CHAT_ID = "oc_80b07f38ed6833df3787a97a496f1097";
const MSG_INTERVAL_MS = 12_000;
const MAX_ROUNDS = 3;
const CHAT_MAIN = "_runs/20260909_inbound_scene_probe/three_chat_full_window.json";
const CHAT_GAP = "workspace/_runs/20260909_three_chat_gap_0801_0903/three_chat_gap_discussions_filtered.json";
const EB_RE = /EB\d{6,}/gi;
const VASC_RE = /VASC\d{6,}/gi;
const JINYING: DemoPersonnel = {
  审核员: { name: "金萤", openId: "ou_d09d7409a63201462177f4d8a8b1ac7b" },
  销售: { name: "金萤", openId: "ou_d09d7409a63201462177f4d8a8b1ac7b" },
  客服: { name: "金萤", openId: "ou_d09d7409a63201462177f4d8a8b1ac7b" },
};

const LABEL_TO_FILE_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(ATTACHMENT_BY_FILE_TYPE).map(([k, v]) => [v, k]),
);

interface ChatRow {
  vasc: string[];
  ebs: string[];
  detail: string;
  group: string;
}

interface RoundRecord {
  round: number;
  outputPath: string;
  ruleOutputPath: string;
  action: string;
  note: string;
  sceneKey?: string;
}

interface Progress {
  total: number;
  processed: number;
  l4_direct: number;
  l2_override: number;
  l1_supplement: number;
  l1_override: number;
  l3_mock_attachment: number;
  skipped_no_scene_card: number;
  sop_llm_failed: number;
  max_rounds_exceeded: number;
  feishuErrors: number;
  processedOrderNos: string[];
  lastProcessedAt: string;
  lastVascNo: string;
  omsWriteEnabled: string;
  ragEnabled: string;
  chatId: string;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx >= 0) return process.argv[idx + 1] || fallback;
  if (name === "order") {
    const alt = process.argv.indexOf("--orders");
    if (alt >= 0) return process.argv[alt + 1] || fallback;
  }
  return fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((x) => x.toUpperCase()).filter(Boolean))];
}

function tokens(blob: string): { vasc: string[]; ebs: string[] } {
  return {
    vasc: unique(blob.match(VASC_RE) || []),
    ebs: unique(blob.match(EB_RE) || []),
  };
}

function loadChatRows(root: string): ChatRow[] {
  const rows: ChatRow[] = [];
  for (const rel of [CHAT_MAIN, CHAT_GAP]) {
    const path = resolve(root, rel);
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    const list = Array.isArray(raw) ? raw : [];
    for (const item of list) {
      const rec = asRecord(item);
      const blob = Object.values(rec)
        .filter((v) => v != null && typeof v !== "object")
        .join("\n");
      const t = tokens(blob);
      const detail = asText(rec["对话详情"]);
      if (!detail || (!t.vasc.length && !t.ebs.length)) continue;
      rows.push({ vasc: t.vasc, ebs: t.ebs, detail, group: asText(rec["群名称"]) });
    }
  }
  return rows;
}

function humanSupplement(detail: string): string {
  const lines = detail.split(/\n+/);
  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.includes("💪")) continue;
    if (/未知\/系统/.test(t) && /请关注/.test(t)) continue;
    if (/^\[模拟/.test(t)) continue;
    kept.push(t);
  }
  const text = kept.join("\n").trim();
  return text.length >= 20 ? text.slice(0, 1800) : "";
}

function findChatSupplement(orderNo: string, ebs: string[], chats: ChatRow[]): string {
  const wantVasc = orderNo.toUpperCase();
  const wantEb = new Set(ebs.map((x) => x.toUpperCase()));
  const parts: string[] = [];
  for (const row of chats) {
    if (!row.vasc.includes(wantVasc) && !row.ebs.some((eb) => wantEb.has(eb))) continue;
    const hum = humanSupplement(row.detail);
    if (hum && !parts.includes(hum)) parts.push(hum);
  }
  return parts.join("\n\n").trim().slice(0, 2400);
}

function firstAtom(detail: JsonRecord): JsonRecord {
  return asRecord(asArray(detail.atoms)[0]);
}

function ebsOf(detail: JsonRecord): string[] {
  const fromEvents = asArray(detail.events)
    .map((ev) => asText(asRecord(ev).eventNo) || asText(asRecord(ev).businessNo))
    .filter((x) => /^EB/i.test(x));
  const blob = JSON.stringify(detail);
  return unique([...fromEvents, ...(blob.match(EB_RE) || [])]);
}

function sampleMeta(detail: JsonRecord): JsonRecord {
  return asRecord(detail._sample);
}

function overrideFromDetail(detail: JsonRecord): { sceneKey: string; sceneName: string; code: string } | null {
  const sample = sampleMeta(detail);
  const key = asText(sample.sceneKey);
  if (key) {
    const card = findScenarioCard(key);
    if (card) return { sceneKey: card.sceneKey, sceneName: card.sceneName, code: asText(sample.omsSceneCode) };
  }
  return null;
}

function setAttr(detail: JsonRecord, key: string, name: string, value: string): void {
  const atom = firstAtom(detail);
  const attrs = asArray(atom.vaAtomAttrs).map(asRecord);
  const hit = attrs.find((a) => asText(a.attributeKey) === key || asText(a.attributeName) === name);
  if (hit) {
    hit.attributeValue = value;
    hit.attributeValueOriginal = value;
  } else {
    attrs.push({
      attributeKey: key,
      attributeKeyOriginal: key,
      attributeName: name,
      attributeValue: value,
      attributeValueOriginal: value,
    });
  }
  atom.vaAtomAttrs = attrs;
  detail.atoms = [atom, ...asArray(detail.atoms).slice(1)];
}

function appendRequirement(detail: JsonRecord, supplement: string): void {
  const atom = firstAtom(detail);
  const attrs = asArray(atom.vaAtomAttrs).map(asRecord);
  const rd = attrs.find((a) => asText(a.attributeKey) === "VAS_ATTR_REL_RD" || asText(a.attributeName) === "需求描述");
  const prev = asText(rd?.attributeValue);
  const next = [prev, supplement].filter(Boolean).join("\n");
  setAttr(detail, "VAS_ATTR_REL_RD", "需求描述", next);
}

function mockMissingAttachments(detail: JsonRecord, result: PipelineResult): string[] {
  const atom = firstAtom(detail);
  const files = asArray(atom.vaAtomFiles).map(asRecord);
  const mocked: string[] = [];
  for (const label of result.missingAttachments || []) {
    const fileType = LABEL_TO_FILE_TYPE[label] || label;
    files.push({ fileType, fileName: `[模拟]${label}.pdf` });
    mocked.push(label);
  }
  for (const field of result.missingFields || []) {
    if (field === "上架入库单号" || field === "VAS_ATTR_REL_NWEON") {
      const wis = asArray(asRecord(asRecord(detail.listHeader).businessOrder).childBusinessOrders)
        .map((x) => asText(asRecord(x).businessNo))
        .filter(Boolean);
      const one = asText(asRecord(asRecord(detail.listHeader).businessOrder).businessNo) || wis[0];
      if (one) {
        setAttr(detail, "VAS_ATTR_REL_NWEON", "上架入库单号", one);
        mocked.push(`上架入库单号=${one}`);
      }
    }
  }
  atom.vaAtomFiles = files;
  detail.atoms = [atom, ...asArray(detail.atoms).slice(1)];
  return mocked;
}

function slimResult(result: PipelineResult): JsonRecord {
  const llm = result.matchResult?.llmClassification;
  const scene = result.sceneCompletenessResult;
  const uploaded = Object.entries(result.contextFacts?.attachmentStatus || {})
    .filter(([, status]) => status === "uploaded")
    .map(([key]) => key);
  return {
    orderNo: result.orderNo,
    outputPath: result.outputPath,
    ruleOutputPath: result.ruleOutputPath,
    node: result.node,
    nodesHit: result.nodesHit,
    failureGate: result.failureGate,
    missing: result.missing,
    missingRequirementItems: result.missingRequirementItems,
    missingAttachments: result.missingAttachments,
    missingFields: result.missingFields,
    clarificationPrompts: result.clarificationPrompts,
    infoChecks: scene?.infoChecks || result.completenessResult?.infoChecks || [],
    infoCheckSkipped: scene?.infoCheckSkipped ?? result.completenessResult?.infoCheckSkipped ?? true,
    infoCheckError: scene?.infoCheckError || result.completenessResult?.infoCheckError || "",
    attachmentComplete: scene?.attachment.complete ?? result.completenessResult?.complete,
    uploadedAttachments: uploaded,
    uploadedFiles: result.agentInput?.omsFacts?.uploadedFiles || [],
    customerIntent: result.agentInput?.customerIntent || "",
    requirementLength: (result.requirementCheck?.normalizedRequirement || result.agentInput?.customerIntent || "").length,
    sceneKey: result.matchResult?.sceneKey || "",
    sceneName: result.matchResult?.scenarioName || "",
    decision: result.matchResult?.decision || "",
    confidence: result.matchResult?.confidence || "",
    reason: result.matchResult?.reason || "",
    llmText: result.llm?.text || "",
    llmError: result.llm?.error || "",
    analysis: result.analysis || "",
    conclusionOneLiner: llm?.conclusionOneLiner || "",
    judgmentBasis: judgmentBasis(result),
  };
}

function emptyProgress(total: number, chatId: string): Progress {
  return {
    total,
    processed: 0,
    l4_direct: 0,
    l2_override: 0,
    l1_supplement: 0,
    l1_override: 0,
    l3_mock_attachment: 0,
    skipped_no_scene_card: 0,
    sop_llm_failed: 0,
    max_rounds_exceeded: 0,
    feishuErrors: 0,
    processedOrderNos: [],
    lastProcessedAt: "",
    lastVascNo: "",
    omsWriteEnabled: process.env.OMS_WRITE_ENABLED || "0",
    ragEnabled: process.env.RAG_ENABLED || "0",
    chatId,
  };
}

function topicTitle(result: PipelineResult): string {
  return `[历史跑批] ${demoTopicTitle(result)}`;
}

function cardFor(result: PipelineResult): ReturnType<typeof buildAskCard> {
  if (isSopGenerateFailure(result)) return buildSopGenerateErrorCard(result, JINYING);
  if (result.outputPath === "sop_generated") return buildSopCard(result, JINYING);
  if (result.outputPath === "transfer_human") {
    return buildSceneConfirmCard(result, JINYING, collectSceneCandidates(result.matchResult));
  }
  return buildAskCard(result, JINYING);
}

let lastMsgAt = 0;
async function paced<T>(fn: () => Promise<T>): Promise<T> {
  const wait = MSG_INTERVAL_MS - (Date.now() - lastMsgAt);
  if (lastMsgAt && wait > 0) await sleep(wait);
  const out = await fn();
  lastMsgAt = Date.now();
  return out;
}

async function sendHumanReply(chatId: string, threadId: string, text: string, asUser: boolean): Promise<string> {
  const body = asUser ? text : `[模拟·金萤]\n${text}`;
  if (asUser) {
    try {
      const sent = await paced(() => sendThreadPlainText(chatId, threadId, body));
      return sent.messageId;
    } catch (err) {
      const fallback = `[模拟·金萤]\n${text}\n（金萤身份发送失败，已改机器人）`;
      const sent = await paced(() => sendConsultThreadText(threadId, fallback));
      return sent.messageId;
    }
  }
  const sent = await paced(() => sendConsultThreadText(threadId, body));
  return sent.messageId;
}

function pipelineOpts(overrideScene?: string) {
  return {
    skipLlm: false,
    sceneLlm: !overrideScene,
    sceneLlmVersion: 2 as const,
    ragEnabled: (process.env.RAG_ENABLED || "0").trim() === "1",
    overrideScene,
  };
}

function roundStory(rounds: RoundRecord[]): string {
  if (!rounds.length) return "0 轮";
  const bits = rounds.map((r) => `第${r.round}轮 ${r.outputPath}${r.action ? `→${r.action}` : ""}`);
  return `${rounds.length} 轮（${bits.join("；")}）`;
}

function writeSopMd(path: string, args: {
  orderNo: string;
  detail: JsonRecord;
  result: PipelineResult;
  rounds: RoundRecord[];
  simulated: string[];
}): void {
  const sample = sampleMeta(args.detail);
  const atom = firstAtom(args.detail);
  const sections = extractSopSections({
    llm: args.result.llm,
    aiGeneratedText: args.result.llm?.text,
    analysis: args.result.analysis,
    customerRequirementDescription: asText(asRecord(args.result.agentInput?.omsFacts).customerRequirementDescription),
  });
  const ebs = ebsOf(args.detail);
  const wi = asText(asRecord(asRecord(args.detail.listHeader).businessOrder).businessNo);
  const md = [
    `# SOP 评分：${args.orderNo}`,
    "",
    "## 基本信息",
    `- 场景：【${asText(sample.category) === "instock" ? "库内" : "入库"}】${asText(sample.sceneName) || args.result.matchResult?.scenarioName || ""}`,
    `- 仓库：${asText(asRecord(args.detail.listHeader).warehouseName)}`,
    `- 异常单：${ebs.join("、") || "无"}`,
    `- 入库单：${wi || "无"}`,
    `- OMS 场景码：${asText(atom.sceneOverviewCode)} ${asText(atom.sceneOverviewName)}`,
    `- 经过轮次：${roundStory(args.rounds)}`,
    "",
    "## 客户原始需求",
    `> ${asText(asRecord(args.result.agentInput?.omsFacts).requirementBackground)}`,
    `> ${asText(asRecord(args.result.agentInput?.omsFacts).customerRequirementDescription)}`,
    "",
    "## 模拟补充信息（如有）",
    args.simulated.length ? args.simulated.map((s) => `> ${s}`).join("\n") : "> （无）",
    "",
    "## AI 生成的 SOP",
    sections.requirementDescription ? `> 【AI 总结 - 需求描述】${sections.requirementDescription}` : "",
    sections.requirementBackground ? `> 【AI 总结 - 需求背景】${sections.requirementBackground}` : "",
    "> 【操作步骤】",
    sections.operationSteps ? sections.operationSteps.split("\n").map((l) => `> ${l}`).join("\n") : "> （空）",
    "",
    "## AI 判断依据",
    `- 场景识别：${shortSceneName(args.result.matchResult?.scenarioName || args.result.matchResult?.sceneKey || "")}（置信度：${args.result.matchResult?.confidence || "-"}）`,
    `- AI 理由：${asText(args.result.matchResult?.llmClassification?.conclusionOneLiner) || asText(args.result.matchResult?.reason) || "-"}`,
    "",
    judgmentBasis(args.result)
      .split("\n")
      .filter(Boolean)
      .map((l) => `- ${l}`)
      .join("\n"),
    "",
    "## 人工评分（待填）",
    "",
    "| 维度 | 分数(1-5) | 备注 |",
    "|------|----------|------|",
    "| 场景匹配 | ___ | AI 识别的场景对吗？ |",
    "| SOP 完整性 | ___ | 操作步骤齐吗？缺了什么？ |",
    "| 事实准确性 | ___ | 有没有编造单号/SKU/数量？ |",
    "| 可执行性 | ___ | 仓库能直接照着做吗？ |",
    "| 总评 | ___ | 1=完全不对 2-3=不太能用 4=能用 5=比人写得好 |",
    "",
    "备注：___",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
  writeFileSync(path, `${md}\n`, "utf8");
}

function writeDemoSummary(outDir: string, allResults: JsonRecord[], allDetails: JsonRecord[], chatId: string): void {
  const lines = [
    "# 历史跑批演示（测试群）",
    "",
    `- 群：\`${chatId}\``,
    "- `OMS_WRITE_ENABLED=0`，未写 OMS",
    `- 条数：${allResults.length}`,
    "- 话题标题格式：`[历史跑批] VASC｜客户｜仓库｜摘要`",
    "- 绿卡按钮保留，未点击",
    "",
    "## 各单",
    "",
    "| VASC | 业务段 | 本轮结果 | 轮数 | 话题 |",
    "|---|---|---|---|---|",
  ];
  for (const rec of allResults) {
    const no = asText(rec.orderNo);
    const detail = allDetails.find((d) => asText(d.orderNo) === no) || {};
    const category = asText(sampleMeta(detail).category) === "instock" ? "库内" : "入库";
    const rounds = asArray(rec.rounds);
    lines.push(
      `| ${no} | ${category} | **${asText(rec.outcome)}** | ${rounds.length} | \`${asText(rec.threadId) || "-"}\` |`,
    );
  }
  lines.push("", "## 各单轮次", "");
  for (const rec of allResults) {
    const no = asText(rec.orderNo);
    const rounds = asArray(rec.rounds).map(asRecord);
    const simulated = asArray(rec.simulated).map((x) => String(x));
    lines.push(`### ${no}`);
    lines.push(`- 结果：${asText(rec.outcome)}`);
    lines.push(`- 话题：${asText(rec.threadId) || "-"}`);
    for (const r of rounds) {
      lines.push(
        `- 第${asText(r.round) || "?"}轮 ${asText(r.outputPath)} → ${asText(r.action)}（${asText(r.note)}）`,
      );
    }
    if (simulated.length) {
      lines.push("- 模拟回复：");
      for (const s of simulated) lines.push(`  - ${s}`);
    }
    lines.push("");
  }
  const sopDir = resolve(outDir, "sop-for-scoring");
  const sopFiles = allResults
    .map((rec) => asText(rec.orderNo))
    .filter((no) => existsSync(resolve(sopDir, `${no}.md`)));
  lines.push("## SOP 打分文件", "");
  if (!sopFiles.length) lines.push("- （本轮没有出 SOP）");
  for (const no of sopFiles) {
    lines.push(`- \`_runs/${outDir.split(/[\\/]/).slice(-1)[0]}/sop-for-scoring/${no}.md\``);
  }
  writeFileSync(resolve(outDir, "demo-summary.md"), `${lines.join("\n")}\n`, "utf8");
}

function writeScoringTemplate(outDir: string, rows: Array<Record<string, string>>): void {
  const lines = [
    "# 历史跑批 SOP 评分汇总（试点 20）",
    "",
    "| # | VASC | 场景 | 业务段 | 轮次 | 场景匹配 | 完整性 | 准确性 | 可执行性 | 总评 | 备注 |",
    "|---|------|------|--------|------|---------|--------|--------|---------|------|------|",
    ...rows.map(
      (r, i) =>
        `| ${i + 1} | ${r.orderNo} | ${r.scene} | ${r.category} | ${r.rounds} |  |  |  |  |  | ${r.note} |`,
    ),
    "",
  ];
  writeFileSync(resolve(outDir, "scoring-template.md"), `${lines.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const ragOn = hasFlag("rag");
  process.env.RAG_ENABLED = ragOn ? "1" : "0";

  const root = projectDir();
  const outDir = resolve(root, arg("out", "_runs/20260914_historical_batch"));
  const detailsPath = resolve(root, arg("input", "_runs/20260914_historical_batch/details.json"));
  const pilotPath = resolve(root, arg("pilot-file", "_runs/20260914_historical_batch/suggested-pilot-20.json"));
  const chatId = arg("chat-id", TEST_CHAT_ID);
  const skipFeishu = hasFlag("skip-feishu");
  const firstRoundOnly = hasFlag("first-round-only");
  const resume = hasFlag("resume");

  if (isOmsWriteEnabled()) {
    throw new Error("拒绝开跑：OMS_WRITE_ENABLED 仍为开启。本脚本要求关闭。");
  }

  mkdirSync(resolve(outDir, "per-case"), { recursive: true });
  mkdirSync(resolve(outDir, "sop-for-scoring"), { recursive: true });

  const allDetails = (JSON.parse(readFileSync(detailsPath, "utf8")) as unknown[]).map(asRecord);
  let want = new Set<string>();
  if (hasFlag("pilot") || existsSync(pilotPath)) {
    const pilot = JSON.parse(readFileSync(pilotPath, "utf8")) as Array<{ orderNo?: string }>;
    want = new Set(pilot.map((p) => asText(p.orderNo)).filter(Boolean));
  }
  const targeted = arg("order")
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  let details = want.size ? allDetails.filter((d) => want.has(asText(d.orderNo))) : allDetails;
  if (targeted.length) details = details.filter((d) => targeted.includes(asText(d.orderNo)));
  if (!details.length) throw new Error("没有可跑的候选。请先确认 suggested-pilot-20.json / details.json");

  const progressPath = resolve(outDir, "progress.json");
  let progress: Progress = existsSync(progressPath)
    ? { ...emptyProgress(details.length, chatId), ...asRecord(JSON.parse(readFileSync(progressPath, "utf8"))) }
    : emptyProgress(details.length, chatId);
  progress.chatId = chatId;
  progress.omsWriteEnabled = "0";
  progress.ragEnabled = isRagEnabled() ? "1" : "0";
  if (!resume && !targeted.length) {
    progress = emptyProgress(details.length, chatId);
  }
  if (!targeted.length) progress.total = details.length;
  const done = new Set(progress.processedOrderNos || []);
  for (const orderNo of targeted) done.delete(orderNo);

  const user = skipFeishu ? null : await peekUserToken();
  const asUser = Boolean(user);
  console.log(
    `historical_batch n=${details.length} resume=${resume} targeted=${targeted.join(",") || "-"} skipFeishu=${skipFeishu} firstRoundOnly=${firstRoundOnly} asUser=${asUser} chat=${chatId} OMS_WRITE=${process.env.OMS_WRITE_ENABLED} RAG=${process.env.RAG_ENABLED} sceneLlm=v2`,
  );
  if (!skipFeishu && !asUser) console.log("金萤 user token 不可用，模拟回复将用机器人 + [模拟·金萤]");

  const chats = loadChatRows(root);
  const resultsPath = resolve(outDir, "results.json");
  const keepResults = resume || targeted.length > 0;
  let allResults: JsonRecord[] = existsSync(resultsPath) && keepResults
    ? (JSON.parse(readFileSync(resultsPath, "utf8")) as JsonRecord[])
    : [];
  if (targeted.length) {
    allResults = allResults.filter((item) => !targeted.includes(asText(item.orderNo)));
    progress.processedOrderNos = (progress.processedOrderNos || []).filter((item) => !targeted.includes(asText(item)));
  }

  for (const raw of details) {
    const orderNo = asText(raw.orderNo);
    if (!orderNo) continue;
    if (done.has(orderNo)) {
      console.log(`skip resume ${orderNo}`);
      continue;
    }
    const detail = clone(raw);
    const rounds: RoundRecord[] = [];
    const simulated: string[] = [];
    let threadId = "";
    let final: PipelineResult | null = null;
    let outcome = "unknown";

    try {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const last = rounds[rounds.length - 1];
        const override =
          last?.action === "override_scene" || last?.action === "skip_l1_override"
            ? last.sceneKey
            : undefined;
        const result = await runPipeline(detail, pipelineOpts(override));
        if (!result) throw new Error(`pipeline 空结果 ${orderNo}`);
        final = result;

        if (firstRoundOnly && result.outputPath !== "sop_generated" && !isSopGenerateFailure(result)) {
          if (!skipFeishu) {
            const card = cardFor(result);
            if (!threadId) {
              const rootMsg = await paced(() => createThread(chatId, topicTitle(result)));
              threadId = rootMsg.messageId || rootMsg.threadId;
              await paced(() => sendCardMessage(chatId, card, threadId));
            } else {
              await paced(() => sendCardMessage(chatId, card, threadId));
            }
          }
          rounds.push({
            round,
            outputPath: result.outputPath,
            ruleOutputPath: result.ruleOutputPath,
            action: "stop_first_round",
            note: "pass-test 只记第一轮，不模拟补附件/选场景",
            sceneKey: result.matchResult?.sceneKey,
          });
          outcome = result.outputPath;
          break;
        }

        if (!skipFeishu) {
          const card = cardFor(result);
          if (!threadId) {
            const root = await paced(() => createThread(chatId, topicTitle(result)));
            threadId = root.messageId || root.threadId;
            await paced(() => sendCardMessage(chatId, card, threadId));
          } else {
            await paced(() => sendCardMessage(chatId, card, threadId));
          }
        }

        if (isSopGenerateFailure(result)) {
          rounds.push({
            round,
            outputPath: result.outputPath,
            ruleOutputPath: result.ruleOutputPath,
            action: "sop_llm_failed",
            note: result.llm?.error || "llm-generate-sop",
            sceneKey: result.matchResult?.sceneKey,
          });
          outcome = "sop_llm_failed";
          progress.sop_llm_failed += 1;
          break;
        }

        if (result.outputPath === "sop_generated") {
          rounds.push({
            round,
            outputPath: result.outputPath,
            ruleOutputPath: result.ruleOutputPath,
            action: round === 1 ? "l4_direct" : "sop",
            note: "绿色卡片已发，按钮未点击",
            sceneKey: result.matchResult?.sceneKey,
          });
          outcome = round === 1 ? "l4_direct" : "sop_after_rounds";
          if (round === 1) progress.l4_direct += 1;
          break;
        }

        if (result.outputPath === "needs_requirement_clarification") {
          const supplement = findChatSupplement(orderNo, ebsOf(detail), chats);
          if (supplement) {
            const reply = `${supplement}\n来源：群聊补充`;
            if (!skipFeishu && threadId) await sendHumanReply(chatId, threadId, reply, asUser);
            appendRequirement(detail, supplement);
            simulated.push(`群聊补充：${supplement.slice(0, 400)}`);
            rounds.push({
              round,
              outputPath: result.outputPath,
              ruleOutputPath: result.ruleOutputPath,
              action: "l1_supplement",
              note: "已拼接群聊补充到需求描述",
            });
            progress.l1_supplement += 1;
            continue;
          }
          const ov = overrideFromDetail(detail);
          const skipText = "[历史跑批] 未找到群聊补充信息，跳过";
          if (!skipFeishu && threadId) await sendHumanReply(chatId, threadId, skipText, asUser);
          if (!ov) {
            const msg = `[历史跑批] OMS 场景码 ${asText(firstAtom(detail).sceneOverviewCode)} 无对应场景卡，跳过选场景`;
            if (!skipFeishu && threadId) await sendHumanReply(chatId, threadId, msg, asUser);
            rounds.push({
              round,
              outputPath: result.outputPath,
              ruleOutputPath: result.ruleOutputPath,
              action: "skipped_no_scene_card",
              note: "无对应场景卡",
            });
            outcome = "skipped_no_scene_card";
            progress.skipped_no_scene_card += 1;
            break;
          }
          simulated.push("未找到群聊补充，按 OMS 审核员场景继续");
          rounds.push({
            round,
            outputPath: result.outputPath,
            ruleOutputPath: result.ruleOutputPath,
            action: "skip_l1_override",
            note: `overrideScene=${ov.sceneKey}`,
            sceneKey: ov.sceneKey,
          });
          progress.l1_override += 1;
          continue;
        }

        if (result.outputPath === "transfer_human") {
          const ov = overrideFromDetail(detail);
          if (!ov) {
            const msg = `[历史跑批] OMS 场景码 ${asText(firstAtom(detail).sceneOverviewCode)} 无对应场景卡，跳过选场景`;
            if (!skipFeishu && threadId) await sendHumanReply(chatId, threadId, msg, asUser);
            rounds.push({
              round,
              outputPath: result.outputPath,
              ruleOutputPath: result.ruleOutputPath,
              action: "skipped_no_scene_card",
              note: "无对应场景卡",
            });
            outcome = "skipped_no_scene_card";
            progress.skipped_no_scene_card += 1;
            break;
          }
          const reply = `选择场景：${ov.sceneName}\n来源：OMS 审核员实际选择`;
          if (!skipFeishu && threadId) await sendHumanReply(chatId, threadId, reply, asUser);
          simulated.push(`选择场景：${ov.sceneName}（来源：OMS 审核员实际选择）`);
          rounds.push({
            round,
            outputPath: result.outputPath,
            ruleOutputPath: result.ruleOutputPath,
            action: "override_scene",
            note: `overrideScene=${ov.sceneKey}`,
            sceneKey: ov.sceneKey,
          });
          progress.l2_override += 1;
          continue;
        }

        if (result.outputPath === "needs_field_clarification") {
          const mocked = mockMissingAttachments(detail, result);
          const infoItems = (result.missingRequirementItems || []).filter(Boolean);
          if (infoItems.length) {
            const supplement = `[模拟补信息] ${infoItems.join("；")}。按客户原单、异常单及附件对应关系执行，数量以实物清点为准。`;
            appendRequirement(detail, supplement);
            mocked.push(...infoItems);
          }
          const reply = `[模拟] 已补齐${mocked.length ? `：${mocked.join("、")}` : "（无缺失项可改）"}`;
          if (!skipFeishu && threadId) await sendHumanReply(chatId, threadId, reply, asUser);
          simulated.push(reply);
          rounds.push({
            round,
            outputPath: result.outputPath,
            ruleOutputPath: result.ruleOutputPath,
            action: "l3_mock_attachment",
            note: mocked.join("、") || "无缺失项可改",
          });
          progress.l3_mock_attachment += 1;
          continue;
        }

        rounds.push({
          round,
          outputPath: result.outputPath,
          ruleOutputPath: result.ruleOutputPath,
          action: "stop_unexpected",
          note: result.outputPath,
        });
        outcome = result.outputPath;
        break;
      }

      if (final && outcome === "unknown" && final.outputPath !== "sop_generated") {
        outcome = "max_rounds_exceeded";
        progress.max_rounds_exceeded += 1;
        if (!skipFeishu && threadId) {
          await sendHumanReply(chatId, threadId, "[历史跑批] 超过 3 轮仍未生成 SOP，停止", asUser);
        }
      }

      const caseRec = {
        orderNo,
        outcome,
        threadId,
        rounds,
        simulated,
        final: final ? slimResult(final) : null,
        omsWriteAttempted: false,
      };
      writeFileSync(resolve(outDir, "per-case", `${orderNo}.json`), `${JSON.stringify(caseRec, null, 2)}\n`, "utf8");
      allResults.push(caseRec);

      if (final?.outputPath === "sop_generated" && !isSopGenerateFailure(final)) {
        writeSopMd(resolve(outDir, "sop-for-scoring", `${orderNo}.md`), {
          orderNo,
          detail,
          result: final,
          rounds,
          simulated,
        });
      }

      done.add(orderNo);
      progress.processed = done.size;
      progress.processedOrderNos = [...done];
      progress.lastVascNo = orderNo;
      progress.lastProcessedAt = nowIso();
      writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
      writeFileSync(resultsPath, `${JSON.stringify(allResults, null, 2)}\n`, "utf8");
      console.log(`done ${orderNo} outcome=${outcome} rounds=${rounds.length} thread=${threadId || "-"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`error ${orderNo} ${msg}`);
      progress.feishuErrors += 1;
      progress.lastVascNo = orderNo;
      progress.lastProcessedAt = nowIso();
      writeFileSync(
        resolve(outDir, "per-case", `${orderNo}.json`),
        `${JSON.stringify({ orderNo, outcome: "error", error: msg, rounds, threadId }, null, 2)}\n`,
        "utf8",
      );
      writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
      if (/缺少环境变量|禁止使用综合解决方案|FEISHU_APP_ID/.test(msg)) throw err;
      console.warn(`continue after ${orderNo}`);
    }
  }

  const scoringRows: Array<Record<string, string>> = [];
  for (const rec of allResults) {
    const no = asText(rec.orderNo);
    const final = asRecord(rec.final);
    if (asText(final.failureGate) === "llm-generate-sop") continue;
    if (asText(final.outputPath) !== "sop_generated" && asText(rec.outcome) !== "l4_direct" && asText(rec.outcome) !== "sop_after_rounds") {
      continue;
    }
    if (!existsSync(resolve(outDir, "sop-for-scoring", `${no}.md`))) continue;
    scoringRows.push({
      orderNo: no,
      scene: asText(final.sceneName) || asText(final.sceneKey),
      category: asText(sampleMeta(allDetails.find((d) => asText(d.orderNo) === no) || {}).category),
      rounds: String(asArray(rec.rounds).length),
      note: asText(rec.outcome),
    });
  }
  writeScoringTemplate(outDir, scoringRows);
  writeDemoSummary(outDir, allResults, allDetails, chatId);
  const detailsCopy = resolve(outDir, "details.json");
  if (detailsPath !== detailsCopy) {
    try {
      copyFileSync(detailsPath, detailsCopy);
    } catch {
      /* ignore */
    }
  }
  console.log(JSON.stringify({ ...progress, sopFiles: scoringRows.length, omsWrite: isOmsWriteEnabled() }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
