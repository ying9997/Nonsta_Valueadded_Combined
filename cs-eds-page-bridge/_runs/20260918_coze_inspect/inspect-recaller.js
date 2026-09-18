const fs = require("fs");
const path = require("path");

const BASE = "https://api.coze.cn";
const SPACE = "7417755373999767571";
const ENV = [
  "D:/DA/_tmp/20260827_server_pull/projects/experts/.env",
  "D:/DA/experts/.env",
  "D:/DA/experts-push/.env",
];

const IDS = {
  recaller_user: "7686392709108842530",
  recaller_D: "7656806829235077126",
  recaller_F: "7681305318780944411",
  recaller_A: "7649758025938485283",
  query_new: "7686730241176551462",
  query_f: "7681286672969678888",
  query_old_f1: "7686361673971695625",
  bot_client: "7685975376836739124",
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

function slim(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "schema" || k === "workflow_schema" || k === "canvas" || k === "icon_url") continue;
    if (typeof v === "string" && v.length > 400) out[k] = v.slice(0, 400) + "…";
    else out[k] = v;
  }
  return out;
}

async function req(method, pathname, query, body) {
  const url = new URL(BASE + pathname);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
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
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 800) };
  }
  return {
    http: res.status,
    code: parsed.code,
    msg: parsed.msg || parsed.message || "",
    data: parsed.data,
    error: parsed.error,
  };
}

function fmtTs(v) {
  if (v === undefined || v === null || v === "") return v;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1e9) return v;
  const ms = n > 1e12 ? n : n * 1000;
  try {
    return new Date(ms).toISOString();
  } catch {
    return v;
  }
}

async function versions(id) {
  const all = await req("GET", "/v1/workflows/" + id + "/versions", {
    publish_status: "all",
    page_size: 30,
    include_input_output: "false",
  });
  const published = await req("GET", "/v1/workflows/" + id + "/versions", {
    publish_status: "published_online",
    page_size: 30,
  });
  const draft = await req("GET", "/v1/workflows/" + id + "/versions", {
    publish_status: "unpublished_draft",
    page_size: 10,
  });
  const items = (all.data && (all.data.items || all.data.versions)) || [];
  return {
    all_http: all.http,
    all_code: all.code,
    all_msg: all.msg,
    all_count: Array.isArray(items) ? items.length : null,
    published_count: Array.isArray(published.data && (published.data.items || published.data.versions))
      ? (published.data.items || published.data.versions).length
      : null,
    published_http: published.http,
    published_code: published.code,
    published_msg: published.msg,
    draft_count: Array.isArray(draft.data && (draft.data.items || draft.data.versions))
      ? (draft.data.items || draft.data.versions).length
      : null,
    latest: Array.isArray(items)
      ? items.slice(0, 5).map((x) => ({
          version: x.version,
          description: (x.description || "").slice(0, 120),
          created_at: fmtTs(x.created_at),
          updated_at: fmtTs(x.updated_at),
          publish_status: x.publish_status || x.status,
        }))
      : slim(all.data),
    published_latest: Array.isArray(published.data && (published.data.items || published.data.versions))
      ? (published.data.items || published.data.versions).slice(0, 3).map((x) => ({
          version: x.version,
          description: (x.description || "").slice(0, 80),
          created_at: fmtTs(x.created_at),
          publish_status: x.publish_status || x.status,
        }))
      : slim(published.data),
  };
}

async function detail(id) {
  const r = await req("GET", "/v1/workflows/" + id);
  const det = (r.data && (r.data.workflow_detail || r.data.workflow || r.data)) || r.data;
  return {
    id,
    http: r.http,
    code: r.code,
    msg: r.msg,
    detail: slim(det),
    created_at: det && fmtTs(det.created_at),
    updated_at: det && fmtTs(det.updated_at),
    name: det && (det.workflow_name || det.name),
    description: det && (det.description || "").slice(0, 280),
  };
}

async function tryRun(id) {
  const r = await req("POST", "/v1/workflow/run", null, {
    workflow_id: id,
    parameters: {},
  });
  return {
    id,
    http: r.http,
    code: r.code,
    msg: String(r.msg || "").slice(0, 400),
  };
}

async function listByStatus(status, mode) {
  const items = [];
  for (let page = 1; page <= 8; page++) {
    const r = await req("GET", "/v1/workflows", {
      workspace_id: SPACE,
      page_num: page,
      page_size: 30,
      publish_status: status,
      workflow_mode: mode || "",
    });
    if (r.code !== 0) {
      return { status, mode: mode || "all", error: { http: r.http, code: r.code, msg: r.msg }, items };
    }
    const batch = (r.data && (r.data.items || r.data.workflows)) || [];
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const w of batch) items.push(w);
    if (batch.length < 30) break;
  }
  return { status, mode: mode || "all", count: items.length, items };
}

function pickName(listWrap, needle) {
  const items = (listWrap && listWrap.items) || [];
  return items
    .filter((w) => {
      const name = String(w.workflow_name || w.name || "");
      const id = String(w.workflow_id || w.id || "");
      return (
        name.toLowerCase().includes(needle) ||
        id === needle ||
        Object.values(IDS).includes(id)
      );
    })
    .map((w) => ({
      id: w.workflow_id || w.id,
      name: w.workflow_name || w.name,
      updated_at: fmtTs(w.updated_at),
      created_at: fmtTs(w.created_at),
      description: (w.description || "").slice(0, 140),
    }));
}

(async () => {
  if (!loadToken()) {
    console.log(JSON.stringify({ error: "NO_TOKEN" }));
    process.exit(1);
  }
  const report = { at: new Date().toISOString(), space: SPACE, workflows: {}, versions: {}, runs: {} };
  for (const [key, id] of Object.entries(IDS)) {
    report.workflows[key] = await detail(id);
    report.versions[key] = await versions(id);
    if (key.startsWith("recaller") || key.startsWith("query")) {
      report.runs[key] = await tryRun(id);
    }
  }

  const lists = {
    published_online: await listByStatus("published_online"),
    unpublished_draft: await listByStatus("unpublished_draft"),
    published_online_workflow: await listByStatus("published_online", "workflow"),
    unpublished_draft_workflow: await listByStatus("unpublished_draft", "workflow"),
    unpublished_draft_chatflow: await listByStatus("unpublished_draft", "chatflow"),
  };

  report.list_hits = {};
  for (const [k, wrap] of Object.entries(lists)) {
    report.list_hits[k] = {
      error: wrap.error || null,
      count: wrap.count,
      recaller: pickName(wrap, "recaller"),
      query: pickName(wrap, "query"),
      bot_client: pickName(wrap, "bot_client"),
      user_id: pickName(wrap, IDS.recaller_user),
    };
  }

  const outPath = path.join(__dirname, "inspect-recaller.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  const brief = {
    at: report.at,
    workflows: Object.fromEntries(
      Object.entries(report.workflows).map(([k, v]) => [
        k,
        {
          id: v.id,
          http: v.http,
          code: v.code,
          msg: v.msg,
          name: v.name,
          created_at: v.created_at,
          updated_at: v.updated_at,
          description: v.description,
        },
      ])
    ),
    versions: Object.fromEntries(
      Object.entries(report.versions).map(([k, v]) => [
        k,
        {
          all_code: v.all_code,
          all_msg: v.all_msg,
          all_count: v.all_count,
          published_count: v.published_count,
          published_msg: v.published_msg,
          draft_count: v.draft_count,
          latest: v.latest,
          published_latest: v.published_latest,
        },
      ])
    ),
    runs: report.runs,
    list_hits: report.list_hits,
  };
  console.log(JSON.stringify(brief, null, 2));
})().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e));
  process.exit(1);
});
