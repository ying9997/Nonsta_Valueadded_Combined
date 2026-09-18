const fs = require("fs");
const path = require("path");

const BASE = "https://api.coze.cn";
const ENV = [
  "D:/DA/_tmp/20260827_server_pull/projects/experts/.env",
  "D:/DA/experts/.env",
  "D:/DA/experts-push/.env",
];

function loadToken() {
  for (const p of ENV) {
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, "utf8");
    const m = t.match(/^(?:COZE_API_TOKEN|COZE_WORKFLOW_PAT)=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

async function getJson(pathname, query) {
  const url = new URL(BASE + pathname);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: "Bearer " + loadToken() } });
  return res.json();
}

function slimWf(list) {
  if (!Array.isArray(list)) return list;
  return list.map((w) => ({
    id: w.workflow_id || w.id,
    name: w.workflow_name || w.name,
    plugin_id: w.plugin_id,
  }));
}

(async () => {
  const bot = await getJson("/v1/bot/get_online_info", { bot_id: "7680824665929056310" });
  const d = bot.data || {};
  const wfDetail = async (id) => {
    const body = await getJson("/v1/workflows/" + id);
    const det = (body.data && body.data.workflow_detail) || {};
    return {
      id,
      name: det.workflow_name,
      keys: Object.keys(det),
      publish_status: det.publish_status,
      status: det.status,
      mode: det.mode || det.workflow_mode,
      updated_at: det.updated_at,
      has_schema: Boolean(det.schema || det.workflow_schema),
    };
  };
  const out = {
    bot_name: d.name,
    workflow_info_list: slimWf(d.workflow_info_list),
    variables: (d.variables || []).map((v) => ({
      key: v.key || v.name,
      desc: (v.description || "").slice(0, 80),
    })),
    bot_client: await wfDetail("7685975376836739124"),
    query_sidecar: await wfDetail("7686730241176551462"),
    query_f: await wfDetail("7681286672969678888"),
  };
  fs.writeFileSync(path.join(__dirname, "bot-bind.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
