/**
 * 第 0 步：打测试 Bot，看回复里标识还在不在。
 *
 * 用法（PowerShell）：
 *   $env:COZE_BOT_ID = "你的测试BotID"   # 必须绑对话流 7685975376836739124
 *   node run-marker-test.js
 *
 * Token 读取顺序：环境变量 COZE_API_TOKEN / COZE_WORKFLOW_PAT，
 * 否则读本机已有的 experts .env（不会把 token 写进本目录）。
 *
 * 不改现网 Query / Bot / recaller。本脚本只发一条聊天并扫描回复。
 */
const fs = require("fs");
const path = require("path");

const BASE = "https://api.coze.cn";
const SPACE_ID = "7417755373999767571";
const BOT_CLIENT_WF = "7685975376836739124";
const USER_ID = "test_marker_001";
const QUESTION = "我有一批包裹需要换标签上架，应该选哪个增值产品？";
const MARK_BEGIN = "<!--SIDECAR_BEGIN-->";
const MARK_END = "<!--SIDECAR_END-->";

const OUT = __dirname;
const ENV_CANDIDATES = [
  "D:/DA/_tmp/20260827_server_pull/projects/experts/.env",
  "D:/DA/experts/.env",
  "D:/DA/experts-push/.env",
];

function loadToken() {
  if (process.env.COZE_API_TOKEN) return process.env.COZE_API_TOKEN.trim();
  if (process.env.COZE_WORKFLOW_PAT) return process.env.COZE_WORKFLOW_PAT.trim();
  for (const p of ENV_CANDIDATES) {
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");
    const m = txt.match(/^(?:COZE_API_TOKEN|COZE_WORKFLOW_PAT)=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function loadBotId() {
  const fromEnv = (process.env.COZE_BOT_ID || process.env.BOT_ID || "").trim();
  if (fromEnv) return fromEnv;
  const local = path.join(OUT, "bot-id.txt");
  if (fs.existsSync(local)) {
    const v = fs.readFileSync(local, "utf8").trim();
    if (v && !v.startsWith("<") && !v.startsWith("#")) return v;
  }
  return "";
}

function redact(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/sat_[A-Za-z0-9]+/g, "sat_[REDACTED]")
    .replace(/pat_[A-Za-z0-9]+/g, "pat_[REDACTED]");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function call(pathname, { method, body, query } = {}) {
  const token = loadToken();
  if (!token) throw new Error("NO_TOKEN：请设置 COZE_API_TOKEN，或确认 experts/.env 里有 PAT");
  const url = new URL(BASE + pathname);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 2500) };
  }
  return { http: res.status, body: parsed, text: text.slice(0, 2000) };
}

function collectAssistantTexts(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const chunks = [];
  for (const m of list) {
    const role = m.role || m.sender_type || "";
    const type = m.type || m.msg_type || "";
    const content = typeof m.content === "string" ? m.content : "";
    const isAssistant =
      role === "assistant" || role === "bot" || type === "answer" || type === "verbose";
    if (!content) continue;
    if (type === "answer" || (isAssistant && type !== "verbose" && type !== "follow_up")) {
      chunks.push({ type: type || role, content });
    }
  }
  return chunks;
}

function inspectText(text) {
  const hasBegin = typeof text === "string" && text.includes(MARK_BEGIN);
  const hasEnd = typeof text === "string" && text.includes(MARK_END);
  let jsonOk = false;
  let type = "";
  let parseError = "";
  if (hasBegin && hasEnd) {
    const inner = text.slice(text.indexOf(MARK_BEGIN) + MARK_BEGIN.length, text.indexOf(MARK_END)).trim();
    try {
      const obj = JSON.parse(inner);
      jsonOk = obj && typeof obj === "object";
      type = obj && obj.type ? String(obj.type) : "";
    } catch (e) {
      parseError = e && e.message ? e.message : String(e);
    }
  }
  return {
    hasBegin,
    hasEnd,
    alive: hasBegin && hasEnd,
    jsonOk,
    type,
    parseError,
  };
}

async function waitChat(conversationId, chatId) {
  const deadline = Date.now() + 180000;
  let last = null;
  while (Date.now() < deadline) {
    const got = await call("/v3/chat/retrieve", {
      query: { conversation_id: conversationId, chat_id: chatId },
    });
    last = got;
    const st = (got.body && got.body.data && got.body.data.status) || "";
    if (st === "completed" || st === "failed" || st === "canceled" || st === "requires_action") {
      return got;
    }
    await sleep(2000);
  }
  return last;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const botId = loadBotId();
  if (!botId) {
    const msg = [
      "缺少测试 Bot ID。",
      "请先设环境变量 COZE_BOT_ID（绑了对话流 " + BOT_CLIENT_WF + " 的那个测试 Bot），",
      "或把 Bot ID 写成一行放到本目录 bot-id.txt（不要提交）。",
      "空间: " + SPACE_ID,
    ].join("");
    fs.writeFileSync(path.join(OUT, "chat-api-result.json"), redact({ error: "NO_BOT_ID" }), "utf8");
    console.error(msg);
    process.exit(2);
  }

  const created = await call("/v3/chat", {
    method: "POST",
    body: {
      bot_id: botId,
      user_id: USER_ID,
      stream: false,
      additional_messages: [
        {
          role: "user",
          content: QUESTION,
          content_type: "text",
        },
      ],
    },
  });

  const data = (created.body && created.body.data) || {};
  const chatId = data.id || data.chat_id || "";
  const conversationId = data.conversation_id || "";
  const firstStatus = data.status || "";

  let retrieve = created;
  if (chatId && conversationId && firstStatus && firstStatus !== "completed") {
    retrieve = await waitChat(conversationId, chatId);
  }

  const retrieveData = (retrieve.body && retrieve.body.data) || {};
  const finalChatId = retrieveData.id || chatId;
  const finalConvId = retrieveData.conversation_id || conversationId;

  let messagesBody = null;
  if (finalChatId && finalConvId) {
    const listed = await call("/v3/chat/message/list", {
      query: { conversation_id: finalConvId, chat_id: finalChatId },
    });
    messagesBody = listed.body;
  }

  const messageList =
    (messagesBody && (messagesBody.data || (messagesBody.data && messagesBody.data.messages))) ||
    data.messages ||
    [];
  const msgs = Array.isArray(messageList)
    ? messageList
    : Array.isArray(messageList.messages)
      ? messageList.messages
      : [];

  const assistantChunks = collectAssistantTexts(msgs);
  const combined = assistantChunks.map((c) => c.content).join("\n\n");
  const scan = inspectText(combined);
  const firstAnswer = assistantChunks.find((c) => c.type === "answer") || assistantChunks[0];
  const answerScan = inspectText(firstAnswer ? firstAnswer.content : "");

  const summary = {
    bot_id: botId,
    bot_client_workflow_id: BOT_CLIENT_WF,
    space_id: SPACE_ID,
    question: QUESTION,
    http: created.http,
    code: created.body && created.body.code,
    msg: (created.body && (created.body.msg || created.body.message)) || "",
    chat_id: finalChatId,
    conversation_id: finalConvId,
    status: retrieveData.status || firstStatus,
    assistant_chunks: assistantChunks.length,
    sidecar_in_all_assistant: scan,
    sidecar_in_first_answer: answerScan,
    debug_url:
      retrieveData.debug_url ||
      (finalChatId
        ? "https://www.coze.cn/work_flow?space_id=" +
          SPACE_ID +
          "&workflow_id=" +
          BOT_CLIENT_WF
        : ""),
  };

  fs.writeFileSync(path.join(OUT, "chat-api-result.json"), redact({ summary, created: created.body, retrieve: retrieve.body, messages: messagesBody }), "utf8");
  fs.writeFileSync(
    path.join(OUT, "chat-bubble-output.txt"),
    [
      "# 聊天气泡（Chat API 拼出的 assistant 文本）",
      "# 标识存活(全部assistant): " + (scan.alive ? "YES" : "NO"),
      "# 标识存活(首条answer): " + (answerScan.alive ? "YES" : "NO"),
      "# JSON可parse: " + (scan.jsonOk ? "YES" : "NO"),
      "# type: " + (scan.type || "(无)"),
      "",
      combined || "(没有拿到 assistant 文本。看 chat-api-result.json 的 code/msg)",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        标识是否存活: scan.alive,
        首条answer是否有标识: answerScan.alive,
        JSON可解析: scan.jsonOk,
        type: scan.type || "",
        status: summary.status,
        chat_id: finalChatId,
        conversation_id: finalConvId,
        回复预览: combined.slice(0, 400),
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
