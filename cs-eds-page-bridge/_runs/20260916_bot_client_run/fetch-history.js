const fs = require("fs");
const path = require("path");

const WF = "7685975376836739124";
const BASE = "https://api.coze.cn";
const EXE = "7685977699416637455";
const ENV_CANDIDATES = [
  "D:/DA/_tmp/20260827_server_pull/projects/experts/.env",
  "D:/DA/experts/.env",
];

function loadToken() {
  for (const p of ENV_CANDIDATES) {
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, "utf8");
    const m = txt.match(/^(?:COZE_API_TOKEN|COZE_WORKFLOW_PAT)=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

async function get(urlPath) {
  const res = await fetch(BASE + urlPath, {
    headers: { Authorization: "Bearer " + loadToken() },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 2000) };
  }
  return { http: res.status, body };
}

(async () => {
  const paths = [
    `/v1/workflows/${WF}/run_histories/${EXE}`,
    `/v1/workflow/run_histories?workflow_id=${WF}&execute_id=${EXE}`,
    `/v1/workflows/${WF}`,
  ];
  const out = [];
  for (const p of paths) {
    const r = await get(p);
    out.push({
      path: p,
      http: r.http,
      code: r.body.code,
      msg: r.body.msg || r.body.message,
      snippet: JSON.stringify(r.body).slice(0, 1200),
    });
  }
  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(
    "D:/DA/Nonsta_Valueadded_Combined/cs-eds-page-bridge/_runs/20260916_bot_client_run/history.json",
    JSON.stringify(out, null, 2),
    "utf8",
  );
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
