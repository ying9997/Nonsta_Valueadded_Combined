const fs = require("fs");

const WF = "7685762023372046362";
const BASE = "https://api.coze.cn";
const ENV_CANDIDATES = [
  "D:/DA/_tmp/20260827_server_pull/projects/experts/.env",
  "D:/DA/experts/.env",
  "D:/DA/experts-push/.env",
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

(async () => {
  const token = loadToken();
  const res = await fetch(BASE + "/v1/workflows/" + WF, {
    headers: { Authorization: "Bearer " + token },
  });
  const body = await res.json();
  const d = (body.data && body.data.workflow_detail) || {};
  const keep = {
    workflow_id: d.workflow_id,
    workflow_name: d.workflow_name,
    description: d.description,
    app_id: d.app_id,
    space_id: d.space_id || d.workspace_id,
    publish_status: d.publish_status,
    status: d.status,
    mode: d.mode || d.workflow_mode,
    created_at: d.created_at,
    updated_at: d.updated_at,
    all_keys: Object.keys(d),
  };
  console.log(JSON.stringify(keep, null, 2));
  fs.writeFileSync(
    "D:/DA/Nonsta_Valueadded_Combined/cs-eds-page-bridge/_runs/20260916_coze_smoke/workflow-detail.json",
    JSON.stringify(keep, null, 2),
    "utf8"
  );

  const space = keep.space_id;
  if (space) {
    const listRes = await fetch(
      BASE +
        "/v1/workflows?space_id=" +
        space +
        "&publish_status=unpublished_draft&workflow_mode=workflow&page_num=1&page_size=20",
      { headers: { Authorization: "Bearer " + token } }
    );
    const listBody = await listRes.json();
    console.log("list_code", listBody.code, listBody.msg);
  }
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
