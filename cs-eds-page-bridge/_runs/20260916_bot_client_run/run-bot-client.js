const fs = require("fs");
const path = require("path");

const WF = "7685975376836739124";
const BASE = "https://api.coze.cn";
const ROOT = "D:/DA/Nonsta_Valueadded_Combined/cs-eds-page-bridge";
const OUT = path.join(ROOT, "_runs", "20260916_bot_client_run");
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

function redact(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/sat_[A-Za-z0-9]+/g, "sat_[REDACTED]")
    .replace(/pat_[A-Za-z0-9]+/g, "pat_[REDACTED]");
}

function parseData(data) {
  if (typeof data !== "string") return data;
  try {
    const once = JSON.parse(data);
    if (typeof once === "string") {
      try {
        return JSON.parse(once);
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    return data;
  }
}

function baseParams(extra) {
  return {
    CONVERSATION_NAME: "Default",
    _conversation_id: "page-bridge-smoke",
    _user_id: "page-bridge-smoke",
    _username: "page-bridge-smoke",
    _customer_code: "smoke",
    _customer_name: "smoke",
    USER_INPUT: extra.USER_INPUT || "",
    sidecar: extra.sidecar || "",
  };
}

async function call(pathname, body) {
  const token = loadToken();
  if (!token) throw new Error("NO_TOKEN");
  const res = await fetch(BASE + pathname, {
    method: body ? "POST" : "GET",
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
  return { http: res.status, body: parsed, text: text.slice(0, 1500) };
}

async function runWorkflow(name, parameters) {
  const got = await call("/v1/workflow/run", { workflow_id: WF, parameters });
  const b = got.body || {};
  return {
    name,
    http: got.http,
    code: b.code,
    msg: b.msg || b.message || "",
    debug_url: b.debug_url,
    execute_id: b.execute_id,
    data: parseData(b.data),
    raw_keys: Object.keys(b),
    snippet: JSON.stringify(b).slice(0, 800),
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const detail = await call("/v1/workflows/" + WF);
  const d = (detail.body.data && detail.body.data.workflow_detail) || {};
  const info = {
    workflow_id: d.workflow_id || WF,
    workflow_name: d.workflow_name,
    description: d.description,
    app_id: d.app_id,
    keys: d && typeof d === "object" ? Object.keys(d) : [],
    http: detail.http,
    code: detail.body.code,
  };
  fs.writeFileSync(path.join(OUT, "workflow-detail.json"), redact(info), "utf8");
  console.log(JSON.stringify({ detail: info }));

  const outCard = JSON.parse(
    fs.readFileSync(path.join(ROOT, "coze-import", "测试数据-出卡.json"), "utf8"),
  );
  const pageRead = JSON.parse(
    fs.readFileSync(path.join(ROOT, "coze-import", "测试数据-读页.json"), "utf8"),
  );

  const cases = [
    ["出卡", baseParams({ sidecar: outCard.sidecar, USER_INPUT: outCard.sidecar })],
    ["读页", baseParams({ sidecar: pageRead.sidecar, USER_INPUT: pageRead.sidecar })],
    ["普通问答", baseParams({ sidecar: "{}", USER_INPUT: "你好，帮我看一下增值单" })],
  ];

  const results = [];
  for (const [name, parameters] of cases) {
    const r = await runWorkflow(name, parameters);
    results.push(r);
    const data = r.data && typeof r.data === "object" ? r.data : {};
    console.log(
      JSON.stringify({
        name,
        http: r.http,
        code: r.code,
        msg: r.msg,
        function_name: data.function_name,
        should_send: data.should_send,
        debug_url: r.debug_url,
      }),
    );
  }
  fs.writeFileSync(path.join(OUT, "coze-run-results.json"), redact(results), "utf8");
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
