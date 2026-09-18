const fs = require("fs");
const path = require("path");

const WF = "7685762023372046362";
const BASE = "https://api.coze.cn";
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

function summarize(label, res, body) {
  const data = body && body.data;
  let items = undefined;
  if (data && Array.isArray(data.items)) {
    items = data.items
      .filter((x) => String(x.workflow_id || x.workflowId || "") === WF || String(x.workflow_name || "").includes("page_intent"))
      .map((x) => ({
        workflow_id: x.workflow_id,
        workflow_name: x.workflow_name,
        app_id: x.app_id,
      }));
  }
  return {
    label,
    http: res.status,
    code: body && body.code,
    msg: body && (body.msg || body.message),
    keys: body ? Object.keys(body) : [],
    data_keys: data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : undefined,
    items,
    snippet: JSON.stringify(body).slice(0, 400),
  };
}

async function call(method, urlPath, body) {
  const token = loadToken();
  const res = await fetch(BASE + urlPath, {
    method,
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
    parsed = { raw: text.slice(0, 500) };
  }
  return summarize(method + " " + urlPath, res, parsed);
}

(async () => {
  const sidecar = JSON.stringify({ function_name: "pageRead", arguments: { reason: "probe" } });
  const params = { sidecar };
  const out = [];
  out.push(await call("GET", "/v1/workflows/" + WF));
  out.push(await call("GET", "/v1/workflows?publish_status=unpublished_draft&workflow_mode=workflow&page_num=1&page_size=50"));
  out.push(await call("POST", "/v1/workflow/run", { workflow_id: WF, parameters: params, execute_mode: "DEBUG" }));
  out.push(await call("POST", "/v1/workflow/run", { workflow_id: WF, parameters: params, ext: { execute_mode: "DEBUG" } }));
  out.push(await call("POST", "/v1/workflow/stream_run", { workflow_id: WF, parameters: params }));
  out.push(await call("POST", "/v1/workflow/publish", { workflow_id: WF }));
  out.push(await call("POST", "/v1/workflows/" + WF + "/publish", { connector_ids: ["1024"] }));
  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(
    "D:/DA/Nonsta_Valueadded_Combined/cs-eds-page-bridge/_runs/20260916_coze_smoke/coze-probe.json",
    JSON.stringify(out, null, 2),
    "utf8"
  );
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
