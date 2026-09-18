const fs = require("fs");

const BASE = "https://api.coze.cn";
const ENV = "D:/DA/_tmp/20260827_server_pull/projects/experts/.env";

function loadToken() {
  const txt = fs.readFileSync(ENV, "utf8");
  const m = txt.match(/^(?:COZE_API_TOKEN|COZE_WORKFLOW_PAT)=(.+)$/m);
  return m ? m[1].trim() : "";
}

async function get(p) {
  const res = await fetch(BASE + p, { headers: { Authorization: "Bearer " + loadToken() } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 800) };
  }
  return { path: p, http: res.status, code: body.code, msg: body.msg, snippet: JSON.stringify(body).slice(0, 900) };
}

(async () => {
  const space = "7417755373999767571";
  const out = [];
  for (const p of [
    `/v1/bots?space_id=${space}&page_size=20`,
    `/v1/space/published_bots_list?space_id=${space}&page_size=20`,
    `/v1/bots/list?space_id=${space}`,
    `/v1/workspace/${space}/bots`,
  ]) {
    out.push(await get(p));
  }
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
