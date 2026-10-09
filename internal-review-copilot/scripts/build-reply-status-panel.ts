/**
 * Build a local L1/L2.5 reply status panel from case-store, poll/listen logs,
 * and optionally Feishu thread messages.
 *
 * Read-only: does not mutate case-store or send Feishu messages.
 *
 *   npx tsx scripts/build-reply-status-panel.ts \
 *     --store _runs/live_poll/case-store.json \
 *     --poll-log _runs/live_poll/poll.log \
 *     --listen-log logs/listen.log \
 *     --out _runs/20261009_reply_status_panel \
 *     --fetch-threads
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { asText } from "../lib/oms-adapter.ts";

type JsonRecord = Record<string, unknown>;

interface CaseRow {
  vascNo: string;
  level: "L1" | "L2.5";
  status: string;
  aiOutputPath: string;
  ruleOutputPath: string;
  customer: string;
  warehouse: string;
  missingFields: string[];
  feishuThreadId: string;
  clarificationSentAt: string;
  replyReceivedAt: string;
  replyCount: number;
  replySenders: string[];
  latestReplyAt: string;
  latestReplyText: string;
  allRepliesText: string;
  agentHeardReply: boolean;
  workflowReran: boolean;
  blockedReason: string;
  diagnosis: string;
  logEvents: string[];
  threadLink: string;
}

interface LevelEvidence {
  hasCheckCompleteness: boolean;
  hasCheckRequirement: boolean;
  hasSceneCompletenessNode: boolean;
}

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function asArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function asRecord(raw: unknown): JsonRecord {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as JsonRecord) : {};
}

function csvCell(raw: unknown): string {
  const text = String(raw ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function html(raw: unknown): string {
  return String(raw ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseTimeMs(raw: string): number {
  const text = String(raw || "").trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
    const normalized = text.replace(" ", "T").replace(/$/, "+08:00");
    const n = Date.parse(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Date.parse(text);
  return Number.isFinite(n) ? n : 0;
}

function shortText(raw: string, max = 120): string {
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function caseLevel(rec: JsonRecord, evidence?: LevelEvidence): "L1" | "L2.5" | "" {
  const path = asText(rec.aiOutputPath) || asText(rec.ruleOutputPath);
  const rule = asText(rec.ruleOutputPath);
  if (evidence?.hasCheckCompleteness || evidence?.hasSceneCompletenessNode) return "L2.5";
  if (path === "needs_field_clarification" || rule === "needs_field_clarification") return "L2.5";
  if (evidence?.hasCheckRequirement) return "L1";
  if (path === "needs_requirement_clarification" || rule === "needs_requirement_clarification") return "L1";
  return "";
}

function blankEvidence(): LevelEvidence {
  return { hasCheckCompleteness: false, hasCheckRequirement: false, hasSceneCompletenessNode: false };
}

function parseLevelEvidence(paths: string[]): Map<string, LevelEvidence> {
  const byOrder = new Map<string, LevelEvidence>();
  for (const path of paths) {
    if (!path || !existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/VASC\d{12}/);
      if (!match) continue;
      const order = match[0];
      const evidence = byOrder.get(order) || blankEvidence();
      if (/gate=check-completeness|failureGate=check-completeness/.test(line)) evidence.hasCheckCompleteness = true;
      if (/gate=check-requirement|failureGate=check-requirement/.test(line)) evidence.hasCheckRequirement = true;
      if (/node=check-scene-completeness|check-scene-completeness/.test(line)) evidence.hasSceneCompletenessNode = true;
      byOrder.set(order, evidence);
    }
  }
  return byOrder;
}

function parseLogEvents(paths: string[]): Map<string, string[]> {
  const byOrder = new Map<string, string[]>();
  for (const path of paths) {
    if (!path || !existsSync(path)) continue;
    const source = basename(path);
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/VASC\d{12}/);
      if (!match) continue;
      const order = match[0];
      const events = byOrder.get(order) || [];
      if (
        /reply_received|assessed|reassessed|reassess_missing_detail|reply_poll_error|reassess_error|im\.message|sop_edit|scene_wrong|reminded/.test(
          line,
        )
      ) {
        events.push(`${source}: ${line.trim()}`);
      }
      byOrder.set(order, events.slice(-30));
    }
  }
  return byOrder;
}

function fetchThreadMessages(args: { profile: string; threadId: string }): JsonRecord[] {
  const child = spawnSync(
    "lark-cli",
    [
      "--profile",
      args.profile,
      "im",
      "+threads-messages-list",
      "--as",
      "bot",
      "--thread",
      args.threadId,
      "--order",
      "asc",
      "--page-size",
      "50",
      "--page-all",
      "--format",
      "json",
      "--no-reactions",
    ],
    {
      encoding: "utf8",
      timeout: 60_000,
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
        LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1",
      },
    },
  );
  if (child.status !== 0) {
    throw new Error((child.stderr || child.stdout || "lark-cli failed").slice(0, 500));
  }
  const payload = asRecord(JSON.parse(child.stdout || "{}"));
  const data = asRecord(payload.data);
  return asArray(data.messages).map(asRecord);
}

function humanReplies(messages: JsonRecord[], since: string): Array<{ at: string; sender: string; text: string; link: string }> {
  const sinceMs = parseTimeMs(since);
  return messages
    .filter((msg) => {
      const sender = asRecord(msg.sender);
      const senderType = asText(sender.sender_type).toLowerCase();
      const msgType = asText(msg.msg_type).toLowerCase();
      if (senderType === "app" || senderType === "bot") return false;
      if (msgType === "interactive" || msgType === "system") return false;
      if (sinceMs && parseTimeMs(asText(msg.create_time)) <= sinceMs) return false;
      return Boolean(asText(msg.content).trim());
    })
    .map((msg) => {
      const sender = asRecord(msg.sender);
      return {
        at: asText(msg.create_time),
        sender: asText(sender.name) || asText(sender.id) || "群成员",
        text: asText(msg.content),
        link: asText(msg.message_app_link),
      };
    });
}

function classifyBlocked(row: {
  feishuThreadId: string;
  clarificationSentAt: string;
  logEvents: string[];
  replyCount: number;
  agentHeardReply: boolean;
  workflowReran: boolean;
  status: string;
}): string {
  if (!row.feishuThreadId) return "missing_thread_id";
  if (!row.clarificationSentAt) return "missing_clarification_sent_at";
  if (row.logEvents.some((line) => line.includes("reassess_missing_detail"))) return "reassess_missing_detail";
  if (row.logEvents.some((line) => line.includes("reply_poll_error"))) return "reply_poll_error";
  if (row.logEvents.some((line) => line.includes("reassess_error"))) return "reassess_error";
  if (row.replyCount > 0 && !row.agentHeardReply) return "human_replied_but_agent_not_marked";
  if (row.agentHeardReply && !row.workflowReran && row.status === "reply_received") return "reply_received_not_reassessed";
  if (row.replyCount === 0 && row.status.includes("awaiting")) return "waiting_for_reply";
  return "";
}

function diagnose(row: Pick<CaseRow, "blockedReason" | "status" | "replyCount" | "agentHeardReply" | "workflowReran">): string {
  if (row.blockedReason === "reassess_missing_detail") {
    return "已标记 reply_received，但重跑时当前 details 输入找不到该 VASC，workflow 无法启动。";
  }
  if (row.blockedReason === "reply_poll_error") return "拉取话题回复失败，需看 poll.log 的 reply_poll_error。";
  if (row.blockedReason === "reassess_error") return "重跑 pipeline 抛错，需看 poll.log 的 reassess_error。";
  if (row.blockedReason === "human_replied_but_agent_not_marked") {
    return "话题里有人回复，但 case-store/log 未出现 reply_received，属于漏听或 IM 未开。";
  }
  if (row.blockedReason === "reply_received_not_reassessed") {
    return "已收到回复但没有 reassessed 日志，重跑 worker 未推进。";
  }
  if (row.blockedReason === "waiting_for_reply") return "追问已发出，目前未看到人工回复。";
  if (row.workflowReran) return "已进入重跑链路。";
  if (row.agentHeardReply) return "agent 已监听到回复，但未发现明确重跑完成日志。";
  if (row.replyCount > 0) return "有话题回复，需确认是否应触发回流。";
  return "";
}

function statusClass(row: CaseRow): string {
  if (row.blockedReason) return "bad";
  if (row.workflowReran) return "good";
  if (row.agentHeardReply) return "warn";
  return "idle";
}

function renderHtml(rows: CaseRow[], stats: Record<string, number>): string {
  const generatedAt = new Date().toISOString();
  const cards = Object.entries(stats)
    .map(([key, value]) => `<div class="stat"><b>${html(value)}</b><span>${html(key)}</span></div>`)
    .join("");
  const trs = rows
    .map((row) => {
      const events = row.logEvents.slice(-8).map((line) => `<div>${html(shortText(line, 220))}</div>`).join("");
      const thread = row.threadLink
        ? `<a href="${html(row.threadLink)}" target="_blank" rel="noreferrer">${html(row.feishuThreadId)}</a>`
        : html(row.feishuThreadId);
      return `<tr class="${statusClass(row)}">
        <td class="sticky-id">${html(row.vascNo)}</td>
        <td>${html(row.level)}</td>
        <td>${html(row.status)}</td>
        <td>${html(row.aiOutputPath || row.ruleOutputPath)}</td>
        <td class="wide"><div class="resize-box missing">${html(row.missingFields.join("\n"))}</div></td>
        <td>${html(row.clarificationSentAt)}</td>
        <td>${html(row.replyCount)}</td>
        <td>${html(row.replySenders.join(" / "))}</td>
        <td>${html(row.latestReplyAt)}</td>
        <td class="conversation"><div class="resize-box convo">${html(row.allRepliesText)}</div></td>
        <td>${row.agentHeardReply ? "yes" : "no"}</td>
        <td>${row.workflowReran ? "yes" : "no"}</td>
        <td>${html(row.blockedReason)}</td>
        <td class="diagnosis"><div class="resize-box diag">${html(row.diagnosis)}</div></td>
        <td>${thread}</td>
        <td class="logs"><div class="resize-box logbox">${events}</div></td>
      </tr>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>L1/L2.5 Reply Status Panel</title>
  <style>
    body { margin: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f7f8fb; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .meta { color: #667085; margin-bottom: 18px; }
    .stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 20px; }
    .stat { background: white; border: 1px solid #d9dee8; border-radius: 8px; padding: 10px 12px; min-width: 120px; }
    .stat b { display: block; font-size: 22px; }
    .stat span { color: #667085; font-size: 12px; }
    .table-wrap { overflow: auto; border: 1px solid #d9dee8; background: white; }
    table { min-width: 2300px; border-collapse: collapse; background: white; }
    th, td { border-bottom: 1px solid #eaedf3; border-right: 1px solid #eef1f6; padding: 8px; text-align: left; vertical-align: top; font-size: 12px; }
    th { position: sticky; top: 0; background: #eef2f7; z-index: 1; }
    th.resizable { resize: horizontal; overflow: auto; min-width: 80px; }
    .sticky-id { position: sticky; left: 0; background: inherit; z-index: 0; font-weight: 600; }
    th:first-child { left: 0; z-index: 2; }
    .wide { min-width: 320px; }
    .conversation { min-width: 620px; }
    .diagnosis { min-width: 300px; }
    .logs { min-width: 460px; }
    .resize-box { white-space: pre-wrap; overflow: auto; resize: both; min-height: 42px; max-height: 260px; padding: 6px; border: 1px solid transparent; border-radius: 6px; background: rgba(255,255,255,.65); }
    .resize-box:hover { border-color: #b8c2d6; background: white; }
    .missing { min-width: 280px; min-height: 64px; }
    .convo { min-width: 560px; min-height: 92px; }
    .diag { min-width: 260px; }
    .logbox { min-width: 420px; }
    tr.bad { background: #fff1f0; }
    tr.warn { background: #fff8e6; }
    tr.good { background: #effaf3; }
    tr.idle { background: #ffffff; }
    a { color: #2454d6; }
  </style>
</head>
<body>
  <h1>L1/L2.5 话题回复状态面板</h1>
  <div class="meta">Generated at ${html(generatedAt)}. Rows: ${rows.length}.</div>
  <div class="stats">${cards}</div>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="resizable">VASC</th><th class="resizable">层级</th><th class="resizable">当前状态</th><th class="resizable">AI出口</th><th class="resizable">缺失项</th><th class="resizable">追问时间</th>
        <th class="resizable">回复数</th><th class="resizable">回复人</th><th class="resizable">最新回复时间</th><th class="resizable">完整会话</th>
        <th class="resizable">agent监听到</th><th class="resizable">workflow重跑</th><th class="resizable">卡点</th><th class="resizable">链路诊断</th><th class="resizable">话题</th><th class="resizable">日志</th>
      </tr>
    </thead>
    <tbody>${trs}</tbody>
  </table>
  </div>
</body>
</html>
`;
}

function main(): void {
  const storePath = resolve(arg("store", "internal-review-copilot/_runs/20261008_l1_l25_readonly/case-store.json"));
  const outDir = resolve(arg("out", "internal-review-copilot/_runs/reply_status_panel"));
  const pollLog = arg("poll-log");
  const listenLog = arg("listen-log");
  const profile = arg("profile", "zengzhi-consult");
  const fetchThreads = hasFlag("fetch-threads");
  const fetchLimit = Number(arg("fetch-limit", "10000")) || 10000;
  mkdirSync(outDir, { recursive: true });

  const raw = readJson(storePath);
  const records = Array.isArray(raw) ? raw.map(asRecord) : asArray(asRecord(raw).cases).map(asRecord);
  const logEvents = parseLogEvents([pollLog, listenLog]);
  const levelEvidence = parseLevelEvidence([pollLog, listenLog]);
  const rows: CaseRow[] = [];
  let fetched = 0;

  for (const rec of records) {
    const vascNo = asText(rec.vascNo);
    const level = caseLevel(rec, levelEvidence.get(vascNo));
    if (!level) continue;
    const threadId = asText(rec.feishuThreadId);
    const events = logEvents.get(vascNo) || [];
    let replies: ReturnType<typeof humanReplies> = [];
    let threadLink = "";
    if (fetchThreads && threadId && fetched < fetchLimit) {
      try {
        const messages = fetchThreadMessages({ profile, threadId });
        fetched += 1;
        replies = humanReplies(messages, asText(rec.clarificationSentAt));
        threadLink = replies.find((item) => item.link)?.link || asText(messages[0]?.message_app_link);
      } catch (err) {
        events.push(`thread_fetch_error: ${err instanceof Error ? err.message : err}`);
      }
    }
    const latest = replies[replies.length - 1];
    const allRepliesText = replies
      .map((item, index) => `${index + 1}. ${item.at} ${item.sender}: ${item.text}`)
      .join("\n\n");
    const base = {
      vascNo,
      level,
      status: asText(rec.status),
      aiOutputPath: asText(rec.aiOutputPath),
      ruleOutputPath: asText(rec.ruleOutputPath),
      customer: asText(rec.customer),
      warehouse: asText(rec.warehouse),
      missingFields: asArray(rec.missingFields).map(asText).filter(Boolean),
      feishuThreadId: threadId,
      clarificationSentAt: asText(rec.clarificationSentAt),
      replyReceivedAt: asText(rec.replyReceivedAt),
      replyCount: replies.length,
      replySenders: [...new Set(replies.map((item) => item.sender))],
      latestReplyAt: latest?.at || "",
      latestReplyText: latest ? shortText(latest.text, 180) : "",
      allRepliesText,
      agentHeardReply: Boolean(asText(rec.replyReceivedAt) || events.some((line) => line.includes("reply_received"))),
      workflowReran: Boolean(events.some((line) => line.includes("reassessed")) || !["reply_received"].includes(asText(rec.status)) && Boolean(asText(rec.replyReceivedAt))),
      logEvents: events,
      threadLink,
    };
    const blockedReason = classifyBlocked(base);
    rows.push({ ...base, blockedReason, diagnosis: diagnose({ ...base, blockedReason }) });
  }

  rows.sort((a, b) => {
    const severity = (row: CaseRow) => (row.blockedReason ? 0 : row.agentHeardReply && !row.workflowReran ? 1 : 2);
    return severity(a) - severity(b) || a.level.localeCompare(b.level) || a.vascNo.localeCompare(b.vascNo);
  });

  const stats = {
    total: rows.length,
    L1: rows.filter((row) => row.level === "L1").length,
    "L2.5": rows.filter((row) => row.level === "L2.5").length,
    "human replied": rows.filter((row) => row.replyCount > 0).length,
    "agent heard": rows.filter((row) => row.agentHeardReply).length,
    "workflow reran": rows.filter((row) => row.workflowReran).length,
    blocked: rows.filter((row) => row.blockedReason).length,
    "reassess_missing_detail": rows.filter((row) => row.blockedReason === "reassess_missing_detail").length,
  };

  writeFileSync(resolve(outDir, "reply-status-panel.json"), `${JSON.stringify({ stats, rows }, null, 2)}\n`, "utf8");
  const headers = [
    "vascNo",
    "level",
    "status",
    "aiOutputPath",
    "missingFields",
    "clarificationSentAt",
    "replyCount",
    "replySenders",
    "latestReplyAt",
    "latestReplyText",
    "allRepliesText",
    "agentHeardReply",
    "workflowReran",
    "blockedReason",
    "diagnosis",
    "feishuThreadId",
    "threadLink",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.vascNo,
        row.level,
        row.status,
        row.aiOutputPath || row.ruleOutputPath,
        row.missingFields.join(" / "),
        row.clarificationSentAt,
        row.replyCount,
        row.replySenders.join(" / "),
        row.latestReplyAt,
        row.latestReplyText,
        row.allRepliesText,
        row.agentHeardReply ? "yes" : "no",
        row.workflowReran ? "yes" : "no",
        row.blockedReason,
        row.diagnosis,
        row.feishuThreadId,
        row.threadLink,
      ].map(csvCell).join(","),
    ),
  ].join("\n");
  writeFileSync(resolve(outDir, "reply-status-panel.csv"), `${csv}\n`, "utf8");
  writeFileSync(resolve(outDir, "reply-status-panel.html"), renderHtml(rows, stats), "utf8");
  console.log(`reply status panel written: ${outDir}`);
  console.log(JSON.stringify(stats, null, 2));
}

main();
