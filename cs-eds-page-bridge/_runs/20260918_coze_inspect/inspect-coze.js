const fs = require("fs");
const path = require("path");

const BASE = "https://api.coze.cn";
const OUT = __dirname;
const ENV = [
  "D:/DA/_tmp/20260827_server_pull/projects/experts/.env",
  "D:/DA/experts/.env",
  "D:/DA/experts-push/.env",
];
const IDS = {
  bot_client: "7685975376836739124",
  test_bot: "7680824665929056310",
  query_new: "7686730241176551462",
  query_f1: "7686361673971695625",
  query_f: "7681286672969678888",
};

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

function pickWf(d) {
  if (!d || typeof d !== "object") return d;
  const schema = d.schema || d.workflow_schema || d.canvas || "";
  const schemaText = typeof schema === "string" ? schema : JSON.stringify(schema);
  const hits = {
    nested_F: schemaText.includes("7681286672969678888"),
    nested_F1: schemaText.includes("7686361673971695625"),
    nested_new: schemaText.includes("7686730241176551462"),
    extract_sidecar: /extract_sidecar/i.test(schemaText),
    page_intent_emit: /page_intent_emit/i.test(schemaText),
    sidecar_output: /"sidecar"/.test(schemaText) || schemaText.includes("name: sidecar"),
  };
  return {
    workflow_id: d.workflow_id || d.id,
    workflow_name: d.workflow_name || d.name,
    description: (d.description || "").slice(0, 200),
    space_id: d.space_id || d.workspace_id,
    publish_status: d.publish_status,
    status: d.status,
    mode: d.mode || d.workflow_mode || d.flow_mode,
    updated_at: d.updated_at,
    schema_bytes: schemaText.length,
    hits,
  };
}

async function getJson(pathname, query) {
  const url = new URL(BASE + pathname);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + loadToken() },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { http: res.status, code: body.code, msg: body.msg, data: body.data };
}

(async () => {
  if (!loadToken()) {
    console.log(JSON.stringify({ error: "NO_TOKEN" }));
    process.exit(1);
  }
  const report = { at: new Date().toISOString(), workflows: {}, bots: {} };
  for (const [key, id] of Object.entries({
    bot_client: IDS.bot_client,
    query_new: IDS.query_new,
    query_f1: IDS.query_f1,
    query_f: IDS.query_f,
  })) {
    const r = await getJson("/v1/workflows/" + id);
    const detail = (r.data && (r.data.workflow_detail || r.data.workflow || r.data)) || r.data;
    report.workflows[key] = {
      id,
      http: r.http,
      code: r.code,
      msg: r.msg,
      summary: pickWf(detail),
      data_keys: r.data && typeof r.data === "object" ? Object.keys(r.data) : [],
    };
  }
  const bot = await getJson("/v1/bot/get_online_info", { bot_id: IDS.test_bot });
  const botData = bot.data || {};
  report.bots.test = {
    id: IDS.test_bot,
    http: bot.http,
    code: bot.code,
    msg: bot.msg,
    name: botData.name || botData.bot_name,
    workflow_id: botData.workflow_id || (botData.work_info && botData.work_info.workflow_id),
    keys: Object.keys(botData).slice(0, 40),
  };
  fs.writeFileSync(path.join(OUT, "inspect.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
