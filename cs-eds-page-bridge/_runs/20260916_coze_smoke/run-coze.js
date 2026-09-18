const fs = require("fs");
const path = require("path");

const WF = "7685762023372046362";
const BASE = "https://api.coze.cn";
const ROOT = "D:/DA/Nonsta_Valueadded_Combined/cs-eds-page-bridge";
const OUT = path.join(ROOT, "_runs", "20260916_coze_smoke");
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

async function runOne(name, parameters) {
  const token = loadToken();
  if (!token) throw new Error("NO_TOKEN");
  const res = await fetch(BASE + "/v1/workflow/run", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workflow_id: WF, parameters }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 2000) };
  }
  return {
    name,
    http: res.status,
    code: body.code,
    msg: body.msg || body.message || "",
    debug_url: body.debug_url,
    execute_id: body.execute_id,
    data: parseData(body.data),
    raw_keys: Object.keys(body),
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const cases = [
    ["出卡", JSON.parse(fs.readFileSync(path.join(ROOT, "coze-import", "测试数据-出卡.json"), "utf8"))],
    ["读页", JSON.parse(fs.readFileSync(path.join(ROOT, "coze-import", "测试数据-读页.json"), "utf8"))],
    ["空", JSON.parse(fs.readFileSync(path.join(ROOT, "coze-import", "测试数据-空.json"), "utf8"))],
  ];
  const expect = {
    出卡: { function_name: "renderA2UI", should_send: true },
    读页: { function_name: "pageRead", should_send: true },
    空: { function_name: "", should_send: false },
  };
  const results = [];
  for (const [name, parameters] of cases) {
    const r = await runOne(name, parameters);
    const d = r.data && typeof r.data === "object" ? r.data : {};
    const ok =
      r.http === 200 &&
      (r.code === 0 || r.code === "0") &&
      String(d.function_name ?? "") === expect[name].function_name &&
      Boolean(d.should_send) === expect[name].should_send;
    r.pass = ok;
    r.expect = expect[name];
    results.push(r);
    console.log(
      JSON.stringify({
        name,
        pass: ok,
        http: r.http,
        code: r.code,
        msg: r.msg,
        function_name: d.function_name,
        should_send: d.should_send,
        skip_reason: d.skip_reason,
        turn_kind: d.turn_kind,
        sidecar_intact: d.sidecar_intact,
        debug_url: r.debug_url,
      })
    );
  }
  fs.writeFileSync(path.join(OUT, "coze-run-results.json"), redact(results), "utf8");
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
