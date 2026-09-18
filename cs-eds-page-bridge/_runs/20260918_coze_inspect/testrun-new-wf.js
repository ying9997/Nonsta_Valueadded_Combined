const fs = require("fs");
const path = require("path");

const BASE = "https://api.coze.cn";
const WF = "7686795138925297691";
const TEST_BOT = "7680824665929056310";
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

function slim(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "schema" || k === "workflow_schema" || k === "canvas" || k === "icon_url") continue;
    if (typeof v === "string" && v.length > 800) out[k] = v.slice(0, 800) + "…";
    else out[k] = v;
  }
  return out;
}

async function req(method, pathname, query, body) {
  const url = new URL(BASE + pathname);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v == null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: "Bearer " + loadToken(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 2000) };
  }
  return { http: res.status, code: parsed.code, msg: parsed.msg || parsed.message || "", data: parsed.data, raw: parsed.raw, debug_url: parsed.debug_url || (parsed.data && parsed.data.debug_url), execute_id: parsed.execute_id || (parsed.data && parsed.data.execute_id) };
}

(async () => {
  if (!loadToken()) {
    console.log(JSON.stringify({ error: "NO_TOKEN" }));
    process.exit(1);
  }
  const info = await req("GET", "/v1/workflows/" + WF);
  const det = (info.data && (info.data.workflow_detail || info.data.workflow || info.data)) || {};
  const versions = await req("GET", "/v1/workflows/" + WF + "/versions", {
    publish_status: "all",
    page_size: 10,
    include_input_output: "true",
  });
  const published = await req("GET", "/v1/workflows/" + WF + "/versions", {
    publish_status: "published_online",
    page_size: 5,
    include_input_output: "true",
  });

  const parameters = {
    USER_INPUT: "出卡测试",
    CONVERSATION_NAME: "Default",
  };

  const runs = {};
  runs.workflow_run_empty = await req("POST", "/v1/workflow/run", null, {
    workflow_id: WF,
    parameters: {},
  });
  runs.workflow_run_user = await req("POST", "/v1/workflow/run", null, {
    workflow_id: WF,
    parameters,
  });
  runs.workflow_run_bot = await req("POST", "/v1/workflow/run", null, {
    workflow_id: WF,
    bot_id: TEST_BOT,
    parameters,
  });
  runs.chat = await req("POST", "/v1/workflows/chat", null, {
    workflow_id: WF,
    additional_messages: [{ role: "user", content_type: "text", content: "出卡测试" }],
    parameters,
  });
  runs.chat_bot = await req("POST", "/v1/workflows/chat", null, {
    workflow_id: WF,
    bot_id: TEST_BOT,
    additional_messages: [{ role: "user", content_type: "text", content: "出卡测试" }],
    parameters,
  });

  const report = {
    at: new Date().toISOString(),
    workflow_id: WF,
    info: { http: info.http, code: info.code, msg: info.msg, detail: slim(det) },
    versions: slim(versions.data),
    published: slim(published.data),
    runs: Object.fromEntries(
      Object.entries(runs).map(([k, v]) => [
        k,
        {
          http: v.http,
          code: v.code,
          msg: String(v.msg || "").slice(0, 500),
          debug_url: v.debug_url,
          execute_id: v.execute_id,
          data: typeof v.data === "string" ? v.data.slice(0, 800) : slim(v.data),
          raw: v.raw ? String(v.raw).slice(0, 400) : undefined,
        },
      ])
    ),
  };
  const out = path.join(__dirname, "testrun-7686795138925297691.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e));
  process.exit(1);
});
