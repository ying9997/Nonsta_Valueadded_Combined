const fs = require("fs");
const path = require("path");

const BASE = "https://api.coze.cn";
const BOT = "7680824665929056310";
const OUT = __dirname;
const ENV = [
  "D:/DA/_tmp/20260827_server_pull/projects/experts/.env",
  "D:/DA/experts/.env",
  "D:/DA/experts-push/.env",
];

function loadToken() {
  if (process.env.COZE_API_TOKEN) return process.env.COZE_API_TOKEN.trim();
  for (const p of ENV) {
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, "utf8");
    const m = t.match(/^(?:COZE_API_TOKEN|COZE_WORKFLOW_PAT)=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function redact(s) {
  return s.replace(/sat_[A-Za-z0-9]+/g, "sat_[REDACTED]").replace(/pat_[A-Za-z0-9]+/g, "pat_[REDACTED]");
}

async function call(pathname, body, query) {
  const url = new URL(BASE + pathname);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + loadToken(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 800) };
  }
  return { http: res.status, body: parsed };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function scan(text) {
  const s = String(text || "");
  return {
    hasSidecar: s.includes("<!--SIDECAR_BEGIN-->"),
    hasRender: s.includes("renderA2UI"),
    hasPageRead: s.includes("pageRead"),
    hasClick0: s.includes("clickElement"),
    preview: s.replace(/\s+/g, " ").slice(0, 280),
  };
}

async function one(name, content) {
  const created = await call("/v3/chat", {
    bot_id: BOT,
    user_id: "probe_channel_001",
    stream: false,
    additional_messages: [{ role: "user", content, content_type: "text" }],
  });
  const data = (created.body && created.body.data) || {};
  const chatId = data.id || "";
  const conv = data.conversation_id || "";
  let status = data.status || "";
  const t0 = Date.now();
  while (chatId && conv && status && status !== "completed" && status !== "failed" && Date.now() - t0 < 120000) {
    await sleep(2500);
    const r = await call("/v3/chat/retrieve", null, { conversation_id: conv, chat_id: chatId });
    status = (r.body && r.body.data && r.body.data.status) || status;
  }
  let msgs = [];
  if (chatId && conv) {
    const listed = await call("/v3/chat/message/list", null, { conversation_id: conv, chat_id: chatId });
    const d = listed.body && listed.body.data;
    msgs = Array.isArray(d) ? d : (d && d.messages) || [];
  }
  const texts = msgs.map((m) => ({
    role: m.role,
    type: m.type,
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content || "").slice(0, 400),
  }));
  const joined = texts.map((t) => t.content).join("\n");
  return {
    name,
    http: created.http,
    code: created.body && created.body.code,
    msg: created.body && (created.body.msg || created.body.message),
    status,
    chatId,
    conv,
    nMsg: msgs.length,
    types: texts.map((t) => (t.type || "") + "/" + (t.role || "")),
    scan: scan(joined),
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (!loadToken()) {
    fs.writeFileSync(path.join(OUT, "chat-probe.json"), '{"error":"NO_TOKEN"}', "utf8");
    console.log(JSON.stringify({ error: "NO_TOKEN" }));
    process.exit(2);
  }
  const a = await one("出卡测试", "出卡测试");
  const b = await one("推荐问句", "我有一批包裹需要换标签上架，应该选哪个增值产品？");
  const out = { bot_id: BOT, a, b };
  fs.writeFileSync(path.join(OUT, "chat-probe.json"), redact(JSON.stringify(out, null, 2)), "utf8");
  console.log(
    JSON.stringify(
      {
        出卡测试: { code: a.code, status: a.status, msg: a.msg, nMsg: a.nMsg, scan: a.scan, types: a.types },
        推荐问句: { code: b.code, status: b.status, msg: b.msg, nMsg: b.nMsg, scan: b.scan, types: b.types },
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
