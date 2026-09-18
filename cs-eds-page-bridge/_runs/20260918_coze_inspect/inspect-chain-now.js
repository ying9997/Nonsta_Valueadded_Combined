const fs = require("fs");
const path = require("path");

const BASE = "https://api.coze.cn";
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

function fmtTs(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1e9) return v;
  return new Date(n > 1e12 ? n : n * 1000).toISOString();
}

async function getJson(pathname, query) {
  const url = new URL(BASE + pathname);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: "Bearer " + loadToken() } });
  return { http: res.status, ...(await res.json()) };
}

async function pack(id) {
  const info = await getJson("/v1/workflows/" + id);
  const det = (info.data && info.data.workflow_detail) || {};
  const pub = await getJson("/v1/workflows/" + id + "/versions", {
    publish_status: "published_online",
    page_size: 5,
  });
  const items = (pub.data && (pub.data.items || pub.data.versions)) || [];
  return {
    id,
    http: info.http,
    code: info.code,
    msg: info.msg || "",
    name: det.workflow_name,
    updated_at: fmtTs(det.updated_at),
    created_at: fmtTs(det.created_at),
    published_count: Array.isArray(items) ? items.length : null,
    latest_published: items.slice(0, 3).map((x) => ({
      version: x.version,
      created_at: fmtTs(x.created_at),
      description: x.description || "",
    })),
  };
}

(async () => {
  const out = {
    at: new Date().toISOString(),
    recaller: await pack("7686392709108842530"),
    query: await pack("7686730241176551462"),
    bot_client: await pack("7685975376836739124"),
    test_bot: await getJson("/v1/bot/get_online_info", { bot_id: "7680824665929056310" }),
  };
  const bot = out.test_bot.data || {};
  out.test_bot_brief = {
    http: out.test_bot.http,
    code: out.test_bot.code,
    name: bot.name,
    version: bot.version,
    update_time: bot.update_time,
    workflow_info_list: (bot.workflow_info_list || []).map((w) => ({
      id: w.workflow_id || w.id,
      name: w.workflow_name || w.name,
    })),
  };
  delete out.test_bot;
  fs.writeFileSync(path.join(__dirname, "inspect-chain-now.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e));
  process.exit(1);
});
