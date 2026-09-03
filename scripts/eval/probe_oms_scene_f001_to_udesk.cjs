/**
 * OMS scene → reverse find Udesk conversations for F-001 scene.
 */
const fs = require("fs");
const path = require("path");

const SCENE = "【入库】尺重/标签辨识后换标上架";
const ROOT = path.resolve(__dirname, "../..");
const CSV = path.join(ROOT, "workspace/data/raw/data_udesk_log_database_增值.csv");
const REPULL = "D:/DA/outputs/value_added_related_probe/all_interface_repull.json";
const CACHE = path.join(ROOT, "_runs/20260829_udesk_sample/oms_vasc_scene_cache.json");
const OUT_DIR = path.join(
  ROOT,
  "agent-inventory-assist/03_evaluation/datasets/oms-scene-f001-v0.1"
);

function parseCSV(content) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      current.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) {
      current.push(field);
      field = "";
      if (current.length > 1) rows.push(current);
      current = [];
      if (ch === "\r") i++;
    } else field += ch;
  }
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const o = {};
    headers.forEach((h, i) => {
      o[h] = (row[i] || "").trim();
    });
    return o;
  });
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const j = JSON.parse(fs.readFileSync(REPULL, "utf8"));
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};

  const vascMeta = new Map();
  for (const r of j.vaAtomRows || []) {
    if (String(r.sceneOverviewName || "") !== SCENE) continue;
    const cur = vascMeta.get(r.orderNo) || {
      orderNo: r.orderNo,
      sceneOverviewName: r.sceneOverviewName,
      sop: r.sop || "",
      serviceName: r.serviceName || "",
      wis: [],
      ebs: [],
      source: "repull",
    };
    if (r.sop && !cur.sop) cur.sop = r.sop;
    const blob = `${r.sop || ""}\n${r.requirementDescription || ""}\n${r.vasDes || ""}`;
    cur.wis = uniq([...cur.wis, ...(blob.match(/WI\d{6,}/gi) || [])]);
    cur.ebs = uniq([...cur.ebs, ...(blob.match(/EB\d{6,}/gi) || [])]);
    vascMeta.set(r.orderNo, cur);
  }
  // also include live-cache exact hits not in repull
  for (const [v, o] of Object.entries(cache)) {
    if (!(o.exact21 || (o.matchedScenes || []).some((s) => s === SCENE))) continue;
    if (vascMeta.has(v)) continue;
    const sop = (o.sops && o.sops[0]) || "";
    vascMeta.set(v, {
      orderNo: v,
      sceneOverviewName: (o.scenes || [])[0] || SCENE,
      sop,
      serviceName: (o.services || [])[0] || "",
      wis: uniq(sop.match(/WI\d{6,}/gi) || []),
      ebs: uniq(sop.match(/EB\d{6,}/gi) || []),
      source: "oms_cache",
      statusDesc: o.statusDesc,
    });
  }

  const needles = [];
  for (const m of vascMeta.values()) {
    needles.push({ kind: "vasc", value: m.orderNo, meta: m });
    for (const w of m.wis) needles.push({ kind: "wi", value: w, meta: m });
    for (const e of m.ebs) needles.push({ kind: "eb", value: e, meta: m });
  }

  const udesk = parseCSV(fs.readFileSync(CSV, "utf8"));
  const hitsBySession = new Map();
  for (const row of udesk) {
    const id = row["对话ID"] || "";
    const text = `${row.messages || ""}\n${row["场景分类"] || ""}`;
    for (const n of needles) {
      if (!n.value || !text.includes(n.value)) continue;
      const cur = hitsBySession.get(id) || {
        conversationId: id,
        date: row["对话开始时间"] || "",
        customerMsgCount: parseInt(row["对话客户消息数"] || "0", 10) || 0,
        sceneClassification: row["场景分类"] || "",
        matched: [],
      };
      cur.matched.push({
        kind: n.kind,
        value: n.value,
        vasc: n.meta.orderNo,
        sceneOverviewName: n.meta.sceneOverviewName,
        sopHead: (n.meta.sop || "").slice(0, 180),
        source: n.meta.source,
      });
      hitsBySession.set(id, cur);
    }
  }

  const sessions = [...hitsBySession.values()].map((s) => {
    const vascs = uniq(s.matched.map((m) => m.vasc));
    return {
      ...s,
      matchedVascs: vascs,
      matchKinds: uniq(s.matched.map((m) => m.kind)),
    };
  });
  sessions.sort((a, b) => (b.customerMsgCount || 0) - (a.customerMsgCount || 0));

  const payload = {
    version: "oms-scene-f001-v0.1-probe",
    sceneOverviewName: SCENE,
    method:
      "OMS sceneOverviewName exact → VASC(+sop, WI/EB from sop text) → reverse search Udesk CSV",
    vascPoolSize: vascMeta.size,
    udeskHitSessions: sessions.length,
    vascs: [...vascMeta.values()],
    sessions,
    proposedTop3: sessions.slice(0, 3).map((s) => ({
      conversationId: s.conversationId,
      date: s.date,
      customerMsgCount: s.customerMsgCount,
      matchedVascs: s.matchedVascs,
      noteZh: "候选；待会话摘要与需求收束切点后再冻结",
    })),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(OUT_DIR, "probe_oms_to_udesk.json"), JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        vascPool: vascMeta.size,
        udeskHits: sessions.length,
        top3: payload.proposedTop3,
        out: OUT_DIR,
      },
      null,
      2
    )
  );
}

main();
