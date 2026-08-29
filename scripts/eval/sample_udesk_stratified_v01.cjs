/**
 * Udesk stratified sampling — phases 0–2 (intent/missing only; no sop_gate).
 * Rules: agent-inventory-assist/03_evaluation/抽样规则草稿-真实客服会话-V0.1.md
 * Authority: agent-inventory-assist/03_evaluation/EVAL-AUTHORITY.md
 *
 * Usage: node scripts/eval/sample_udesk_stratified_v01.mjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const CSV_PATH = path.join(ROOT, "workspace/data/raw/data_udesk_log_database_增值.csv");
const RUN_DIR = path.join(ROOT, "_runs/20260829_udesk_sample");
const OUT_DIR = path.join(
  ROOT,
  "agent-inventory-assist/03_evaluation/datasets/udesk-stratified-v0.1"
);

const BUCKET_QUOTA = {
  B1: 18,
  B2: 11,
  B3: 11,
  B4: 9,
  B5: 13,
  B6: 11,
  B7: 10, // 软底线提到 10，便于验收
  B8: 9,
};

/** 粗桶 ID → 中文名（给人看的） */
const BUCKET_ZH = {
  B1: "入库·换标/辨识上架",
  B2: "入库·异常调拨/串仓",
  B3: "入库·拍照/视频/暂存",
  B4: "入库·其它",
  B5: "库内·换标/货权/SKU",
  B6: "库内·拍照/盘点/尺重",
  B7: "库内·其它（冻结/销毁/加固等）",
  B8: "入口/怎么填/报价审核咨询",
};

const FIELD_LEGEND_ZH = {
  finalByPrimaryBucket: "各粗桶最终选中了多少通会话（按主桶统计）",
  quotaTarget: "抽样开始前设定的各粗桶目标通数",
  relabel21InSelected: "OMS 审核场景名确认的 §2.1/换商品标签上架亲缘通数（须对话含 VASC 且 sceneOverviewName 命中）",
  coverageGaps: "没抽满的粗桶清单（桶代号、目标、实得、原因）；也可能含 2.1 OMS 亲缘不足",
  highRiskTagged: "带高危标签的会话通数（可与粗桶重叠）",
  withVasc: "对话文本里能抽出 VASC 增值单号的会话通数",
  sessionCount: "终选会话总通数",
  primaryBucket: "本通会话的主粗桶代号（B1～B8）",
  primaryBucketName: "主粗桶中文名",
  likelyRelabel21: "是否 OMS 确认的 §2.1 亲缘（true=sceneOverviewName 命中；不再用口语正则冒充）",
  omsRelabel21: "OMS 对照详情（匹配的 VASC、场景名、是否精确 2.1）",
  leafPlan: "本通计划切哪些叶子：intent=首轮意图，missing=中段缺信息，sop_gate=延后",
  selectionReason: "为何入选（配额/高危补强/OMS-2.1补抽等）",
};

const BUCKET_PRIORITY = ["B1", "B5", "B6", "B7", "B2", "B3", "B8", "B4"];

const BUCKET_PATTERNS = {
  B1: /换标|补贴.*标签|标签.*补贴|尺重|辨识后|条码不符|条码不对|贴错条码|重新贴标|覆盖标签|清除标签|换商品标签|商品条码/i,
  B2: /串仓|调拨|海运整柜|无主货|新单上架|异常单|包裹类异常/i,
  B3: /拍照|视频|暂存|质检|验货|入库视频/i,
  B4: /自提|销毁|包材|合箱|收集SN|透明标签|拆包|拆箱上架|加急入库/i,
  B5: /货权|拆分SKU|商品组合|库内换标|更换SKU|不良品上架|良品转不良|不良品转良品/i,
  B6: /审计盘点|盘点|重新拍照|尺重测量|良品\/不良|不良品检测|外观辨识|库内拍照|库内视频/i,
  B7: /冻结|解冻|取消出库|库内销毁|代采购|加固|作废出库|指令性标签|锁定库存|批次.*锁|不要发货|销毁库存|破损.*包装|重新包装|买.*纸箱/i,
  B8: /怎么填|如何填|需求描述|需求背景|怎么提交|怎么下单|非标特批|报价|费用|审核后|模板/i,
};

function scoreBuckets(text) {
  const scores = {};
  for (const [id, re] of Object.entries(BUCKET_PATTERNS)) {
    if (re.test(text)) scores[id] = (scores[id] || 0) + 1;
  }
  const inhouse = /库内|库存|货权|IH0|OSF6/i.test(text);
  const inbound = /入库|异常单|EB0|WI\d|OW01|到仓/i.test(text);
  if (inhouse) {
    for (const id of ["B5", "B6", "B7"]) if (scores[id]) scores[id] += 2;
  }
  if (inbound) {
    for (const id of ["B1", "B2", "B3", "B4"]) if (scores[id]) scores[id] += 2;
  }
  // 拍照 alone tends to land B3; if clearly 库内, prefer B6
  if (scores.B3 && inhouse && /盘点|库内|重新拍照|尺重测量/.test(text)) {
    scores.B6 = (scores.B6 || 0) + 3;
  }
  return scores;
}

function primaryBucketFromScores(scores) {
  let best = null;
  let bestScore = -1;
  for (const id of BUCKET_PRIORITY) {
    const s = scores[id] || 0;
    if (s > bestScore) {
      bestScore = s;
      best = id;
    }
  }
  return bestScore > 0 ? best : null;
}

function hitBuckets(text) {
  return Object.keys(BUCKET_PATTERNS).filter((id) => BUCKET_PATTERNS[id].test(text));
}

const HIGH_RISK = [
  { id: "H1", re: /随便(填|编|写)|帮我编|你编一个|虚构|乱填/i },
  { id: "H2", re: /保证今天|一定(要|能)做完|先出\s*SOP|先生成SOP|必须今天/i },
  { id: "H3", re: /标准增值|标准换标|不用非标|走标准/i },
  { id: "H4", re: /没(有)?上传|附件还没|标签文件.*稍后|先提交.*附件/i },
  { id: "H5", re: /异常单号.*(多少|什么|哪个)|WI.*(多少|什么)|仓库是哪个/i },
];

/** OMS 亲缘命中表（由 TOM/oms.VaOrderService_getVasList 打标，见 _tmp/.../build_oms_relabel21_cache.py） */
const OMS_RELABEL21_HITS_PATHS = [
  path.join(ROOT, "_runs/20260829_udesk_sample/oms_relabel21_hits.json"),
  path.join(ROOT, "_tmp/20260829_udesk_probe/oms_relabel21_hits.json"),
];

function loadOmsRelabel21Hits() {
  for (const p of OMS_RELABEL21_HITS_PATHS) {
    if (!fs.existsSync(p)) continue;
    const doc = JSON.parse(fs.readFileSync(p, "utf8"));
    const byId = new Map();
    for (const h of doc.hits || []) {
      byId.set(h.conversationId, {
        exact21: !!h.exact21,
        matchedVascs: h.matchedVascs || [],
        matchedScenes: [
          ...new Set((h.details || []).flatMap((d) => d.matchedScenes || [])),
        ],
        source: "oms.VaOrderService_getVasList.sceneOverviewName",
      });
    }
    return { byId, path: p, poolSize: byId.size, exact21: doc.exact21 || 0 };
  }
  return { byId: new Map(), path: null, poolSize: 0, exact21: 0 };
}

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
    } else {
      if (ch === '"') inQuotes = true;
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
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1) rows.push(current);
  }
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (row[i] || "").trim();
    });
    return obj;
  });
}

function parseMessages(raw) {
  const messages = [];
  const lines = (raw || "").split("\n");
  let currentMsg = null;
  for (const line of lines) {
    const senderMatch = line.match(
      /^(客户|系统|CE-[^\s]+|[^\s]+)\s+(20\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s*$/
    );
    if (senderMatch) {
      if (currentMsg && currentMsg.content) messages.push(currentMsg);
      const name = senderMatch[1];
      const sender = name === "客户" ? "customer" : name === "系统" ? "system" : "agent";
      currentMsg = { sender, name, time: senderMatch[2], content: "" };
      continue;
    }
    if (/^----.*----$/.test(line) || /^-----以下是.*-----$/.test(line)) continue;
    if (/^系统发送满意度/.test(line) || /^客服.*发送满意度/.test(line) || /^客户评价为/.test(line))
      continue;
    if (currentMsg) {
      const trimmed = line.trim();
      if (trimmed) {
        currentMsg.content = currentMsg.content ? `${currentMsg.content}\n${trimmed}` : trimmed;
      }
    }
  }
  if (currentMsg && currentMsg.content) messages.push(currentMsg);
  return messages;
}

function getCustomerFirstIntent(messages) {
  const customerMsgs = messages.filter(
    (m) =>
      m.sender === "customer" &&
      m.content &&
      !/^(人工客服|你好|您好|hello|hi)$/i.test(m.content) &&
      !/^【图片】/.test(m.content) &&
      !/^【文件】/.test(m.content) &&
      m.content.length > 5
  );
  if (!customerMsgs.length) return "";
  return customerMsgs
    .slice(0, 3)
    .map((m) => m.content.replace(/\t.*?：.*?\n------\n?/g, "").trim())
    .join(" ")
    .slice(0, 500);
}

function extractVascNos(text) {
  const set = new Set();
  const re = /VASC\d{9,}/gi;
  let m;
  while ((m = re.exec(text || ""))) set.add(m[0].toUpperCase());
  return [...set];
}

function hitHighRisk(text) {
  return HIGH_RISK.filter((h) => h.re.test(text)).map((h) => h.id);
}

function stableHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function ensureDirs() {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function main() {
  ensureDirs();
  if (!fs.existsSync(CSV_PATH)) {
    console.error("CSV missing:", CSV_PATH);
    process.exit(1);
  }

  console.log("Reading", CSV_PATH);
  const rows = parseCSV(fs.readFileSync(CSV_PATH, "utf8"));
  console.log("rows", rows.length);

  // ── Phase 0: probe ──
  const custMsgHist = {};
  const sceneHist = {};
  let withMessages = 0;
  let parseOk = 0;
  let customerIntentOk = 0;
  const probeSamples = [];

  for (const r of rows) {
    const n = parseInt(r["对话客户消息数"] || "0", 10) || 0;
    custMsgHist[n] = (custMsgHist[n] || 0) + 1;
    const sc = r["场景分类"] || "(空)";
    sceneHist[sc] = (sceneHist[sc] || 0) + 1;
    if (r.messages) {
      withMessages++;
      const msgs = parseMessages(r.messages);
      if (msgs.length) parseOk++;
      const intent = getCustomerFirstIntent(msgs);
      if (intent.length >= 10) {
        customerIntentOk++;
        if (probeSamples.length < 5) {
          probeSamples.push({
            conversationId: r["对话ID"],
            customerMsgCount: n,
            sceneClassification: sc,
            parsedTurns: msgs.length,
            firstIntentPreview: intent.slice(0, 160),
          });
        }
      }
    }
  }

  const eligible = rows.filter((r) => {
    const n = parseInt(r["对话客户消息数"] || "0", 10) || 0;
    if (n < 2 || !r.messages) return false;
    const msgs = parseMessages(r.messages);
    return getCustomerFirstIntent(msgs).length >= 10;
  });

  const probe = {
    phase: 0,
    csv: "workspace/data/raw/data_udesk_log_database_增值.csv",
    totalRows: rows.length,
    withMessages,
    parseOk,
    customerIntentOk,
    eligibleForSampling: eligible.length,
    customerMsgCountHistogram: custMsgHist,
    sceneClassificationTop: Object.entries(sceneHist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30),
    parseSamples: probeSamples,
    notes: [
      "Eligible: 对话客户消息数>=2, parseable customer intent >=10 chars",
      "Leaf roles this run: intent/missing only; sop_gate deferred",
    ],
  };
  writeJson(path.join(RUN_DIR, "00_probe.json"), probe);

  const omsRelabel = loadOmsRelabel21Hits();
  if (omsRelabel.path) {
    // durable copy for resampling
    fs.mkdirSync(RUN_DIR, { recursive: true });
    const durable = path.join(RUN_DIR, "oms_relabel21_hits.json");
    if (path.resolve(omsRelabel.path) !== path.resolve(durable)) {
      fs.copyFileSync(omsRelabel.path, durable);
    }
  }

  // ── Phase 1: recall ──
  const candidates = [];
  for (const r of eligible) {
    const msgs = parseMessages(r.messages);
    const firstIntent = getCustomerFirstIntent(msgs);
    const blob = `${r["场景分类"] || ""}\n${r.messages || ""}\n${firstIntent}`;
    const hits = hitBuckets(blob);
    const scores = scoreBuckets(blob);
    const primary = primaryBucketFromScores(scores);
    if (!primary) continue;
    const highRisk = hitHighRisk(blob);
    const vascNos = extractVascNos(blob);
    const conversationId = r["对话ID"] || "";
    const omsHit = omsRelabel.byId.get(conversationId) || null;
    const customerTurns = msgs.filter((m) => m.sender === "customer" && m.content.length > 5).length;
    const agentAsks = msgs.filter(
      (m) =>
        m.sender === "agent" &&
        (m.content.includes("？") || m.content.includes("?") || /吗$|呢$|是否|还需|请提供|请上传/.test(m.content))
    ).length;
    candidates.push({
      conversationId,
      date: r["对话开始时间"] || r.date || "",
      sceneClassification: r["场景分类"] || "",
      customerMsgCount: parseInt(r["对话客户消息数"] || "0", 10) || 0,
      agentMsgCount: parseInt(r["客服消息数"] || "0", 10) || 0,
      parsedTurns: msgs.length,
      customerTurns,
      agentAskTurns: agentAsks,
      firstIntentPreview: firstIntent.slice(0, 200),
      bucketHits: hits,
      primaryBucket: primary,
      highRisk,
      likelyRelabel21: !!omsHit,
      omsRelabel21: omsHit,
      vascNos,
      leafPlan: {
        intent: true,
        missing: agentAsks > 0 || /附件|标签|对应关系|上传|缺少|还需要/.test(blob),
        sop_gate: "deferred",
      },
      sortKey: stableHash(conversationId || firstIntent),
    });
  }

  const recallByBucket = {};
  for (const id of Object.keys(BUCKET_QUOTA)) recallByBucket[id] = 0;
  for (const c of candidates) recallByBucket[c.primaryBucket] = (recallByBucket[c.primaryBucket] || 0) + 1;

  writeJson(path.join(RUN_DIR, "01_recall_candidates.json"), {
    phase: 1,
    candidateCount: candidates.length,
    recallByPrimaryBucket: recallByBucket,
    highRiskHitCount: candidates.filter((c) => c.highRisk.length).length,
    withVascCount: candidates.filter((c) => c.vascNos.length).length,
    relabel21Count: candidates.filter((c) => c.likelyRelabel21).length,
  });
  fs.writeFileSync(
    path.join(RUN_DIR, "01_recall_candidates.jsonl"),
    candidates.map((c) => JSON.stringify(c)).join("\n") + "\n",
    "utf8"
  );

  // ── Phase 2: quota sample ──
  const byBucket = {};
  for (const c of candidates) {
    (byBucket[c.primaryBucket] ||= []).push(c);
  }
  for (const id of Object.keys(byBucket)) {
    byBucket[id].sort((a, b) => {
      // prefer relabel21 inside B1, then more customer turns, then stable hash
      if (id === "B1") {
        if (a.likelyRelabel21 !== b.likelyRelabel21) return a.likelyRelabel21 ? -1 : 1;
      }
      if (b.customerTurns !== a.customerTurns) return b.customerTurns - a.customerTurns;
      return a.sortKey - b.sortKey;
    });
  }

  const selected = [];
  const selectedIds = new Set();
  const coverageGaps = [];

  for (const [id, quota] of Object.entries(BUCKET_QUOTA)) {
    const pool = byBucket[id] || [];
    const take = pool.slice(0, quota);
    for (const c of take) {
      if (selectedIds.has(c.conversationId)) continue;
      selectedIds.add(c.conversationId);
      selected.push({ ...c, selectionReason: `quota:${id}` });
    }
    if (take.length < Math.min(10, quota)) {
      coverageGaps.push({
        bucket: id,
        bucketNameZh: BUCKET_ZH[id],
        requested: quota,
        got: take.length,
        note: take.length < 10 ? "below_soft_floor_10" : "below_quota",
        noteZh:
          take.length < 10
            ? `未达到软底线10通（目标${quota}，实得${take.length}）`
            : `未达到配额（目标${quota}，实得${take.length}）`,
      });
    }
  }

  // Soft floor: each bucket至少尽量补到 10（池子够的话）
  for (const id of Object.keys(BUCKET_QUOTA)) {
    let have = selected.filter((s) => s.primaryBucket === id).length;
    if (have >= 10) continue;
    const extra = (byBucket[id] || []).filter((c) => !selectedIds.has(c.conversationId));
    for (const c of extra) {
      if (have >= 10) break;
      selectedIds.add(c.conversationId);
      selected.push({ ...c, selectionReason: `soft_floor_10:${id}` });
      have++;
    }
  }

  // High-risk enhancement: up to 20 additional or overlapping tags
  const highRiskPool = candidates
    .filter((c) => c.highRisk.length)
    .sort((a, b) => b.highRisk.length - a.highRisk.length || a.sortKey - b.sortKey);
  let highRiskAdded = 0;
  for (const c of highRiskPool) {
    if (highRiskAdded >= 20) break;
    if (selectedIds.has(c.conversationId)) {
      const existing = selected.find((s) => s.conversationId === c.conversationId);
      if (existing) existing.selectionReason += "+high_risk_tag";
      continue;
    }
    selectedIds.add(c.conversationId);
    selected.push({ ...c, selectionReason: "high_risk_boost" });
    highRiskAdded++;
  }

  // Ensure OMS-confirmed §2.1 亲缘全部入选（Udesk 全池目前不足 10 则记 gap）
  const RELABEL21_TARGET = 10;
  for (const c of candidates.filter((x) => x.likelyRelabel21)) {
    if (selectedIds.has(c.conversationId)) continue;
    selectedIds.add(c.conversationId);
    selected.push({
      ...c,
      selectionReason: c.omsRelabel21 && c.omsRelabel21.exact21 ? "oms_relabel21_exact" : "oms_relabel21_affinity",
    });
  }
  let relabel21Selected = selected.filter((s) => s.likelyRelabel21).length;

  // Refresh coverage gaps after floors
  const finalByBucket = {};
  for (const s of selected) {
    finalByBucket[s.primaryBucket] = (finalByBucket[s.primaryBucket] || 0) + 1;
  }
  const coverageGapsFinal = [];
  for (const [id, quota] of Object.entries(BUCKET_QUOTA)) {
    const got = finalByBucket[id] || 0;
    if (got < Math.min(10, quota)) {
      coverageGapsFinal.push({
        bucket: id,
        bucketNameZh: BUCKET_ZH[id],
        requested: Math.max(quota, 10),
        got,
        noteZh: `仍不足：目标至少${Math.min(10, quota)}，实得${got}（Udesk池可能不够）`,
      });
    }
  }
  relabel21Selected = selected.filter((s) => s.likelyRelabel21).length;
  if (relabel21Selected < RELABEL21_TARGET) {
    coverageGapsFinal.push({
      bucket: "relabel21_oms",
      bucketNameZh: "§2.1 OMS亲缘（sceneOverviewName）",
      requested: RELABEL21_TARGET,
      got: relabel21Selected,
      noteZh: `Udesk 全池经 OMS getVasList 对照后仅 ${omsRelabel.poolSize} 通命中（精确2.1=${omsRelabel.exact21}）；禁止用口语正则凑数。证据：${omsRelabel.path || "missing"}`,
    });
  }

  const finalByBucketZh = {};
  for (const [id, n] of Object.entries(finalByBucket)) {
    finalByBucketZh[`${id} ${BUCKET_ZH[id]}`] = n;
  }

  const sessionsPayload = {
    version: "udesk-stratified-v0.1",
    phase: "0-2",
    说明:
      "本文件是从Udesk真实客服对话里分层抽出的会话清单。B1～B8是粗桶代号；请先看 fieldLegendZh 与 bucketNamesZh。",
    fieldLegendZh: FIELD_LEGEND_ZH,
    bucketNamesZh: BUCKET_ZH,
    leafRolesThisRelease: ["intent", "missing"],
    leafRolesZh: {
      intent: "首轮意图叶子（用户第一句，评场景识别）",
      missing: "中段缺信息叶子（客服追问后客户再答，评该不该追问/追什么）",
      sop_gate: "是否该出仓库SOP（本版不做，等VASC对齐事实表）",
    },
    sopGate: "deferred_see_VASC-SOP补齐链路探测.md",
    sourceCsv: "workspace/data/raw/data_udesk_log_database_增值.csv",
    rulesRef: "agent-inventory-assist/03_evaluation/抽样规则草稿-真实客服会话-V0.1.md",
    generatedAt: new Date().toISOString(),
    quotaTarget: BUCKET_QUOTA,
    quotaTargetZh: Object.fromEntries(
      Object.entries(BUCKET_QUOTA).map(([id, n]) => [`${id} ${BUCKET_ZH[id]}`, n])
    ),
    sessionCount: selected.length,
    finalByPrimaryBucket: finalByBucket,
    finalByPrimaryBucketZh: finalByBucketZh,
    relabel21InSelected: selected.filter((s) => s.likelyRelabel21).length,
    relabel21RuleZh:
      "仅当对话含 VASC，且 OMS oms.VaOrderService_getVasList 的 sceneOverviewName 命中「尺重/标签辨识后换标上架」或入库换标上架亲缘（含包裹类异常换商品标签上架等）时标 true",
    relabel21OmsPoolSize: omsRelabel.poolSize,
    relabel21OmsExact21: omsRelabel.exact21,
    relabel21EvidencePath: omsRelabel.path,
    highRiskTagged: selected.filter((s) => s.highRisk.length).length,
    withVasc: selected.filter((s) => s.vascNos.length).length,
    coverageGaps: coverageGapsFinal,
    sessions: selected.map((s) => ({
      conversationId: s.conversationId,
      date: s.date,
      primaryBucket: s.primaryBucket,
      primaryBucketName: BUCKET_ZH[s.primaryBucket],
      bucketHits: s.bucketHits,
      bucketHitsZh: (s.bucketHits || []).map((id) => BUCKET_ZH[id] || id),
      highRisk: s.highRisk,
      likelyRelabel21: s.likelyRelabel21,
      omsRelabel21: s.omsRelabel21 || null,
      vascNos: s.vascNos,
      sceneClassification: s.sceneClassification,
      customerMsgCount: s.customerMsgCount,
      firstIntentPreview: s.firstIntentPreview,
      leafPlan: s.leafPlan,
      selectionReason: s.selectionReason,
    })),
  };

  writeJson(path.join(RUN_DIR, "02_session_quota.json"), sessionsPayload);
  writeJson(path.join(OUT_DIR, "sessions.json"), sessionsPayload);

  const probeMd = [
    "# Udesk 抽样阶段 0 探查报告",
    "",
    `- 生成：${sessionsPayload.generatedAt}`,
    `- 源：\`${probe.csv}\``,
    `- 总行：${probe.totalRows}`,
    `- 有 messages：${probe.withMessages}`,
    `- 可解析轮次：${probe.parseOk}`,
    `- 有效客户意图：${probe.customerIntentOk}`,
    `- 进入抽样池（eligible）：${probe.eligibleForSampling}`,
    "",
    "## 场景分类 Top",
    "",
    "| 场景分类 | 条数 |",
    "|----------|------|",
    ...probe.sceneClassificationTop.map(([k, v]) => `| ${k.replace(/\|/g, "/")} | ${v} |`),
    "",
    "## 解析样例（5）",
    "",
    ...probe.parseSamples.map(
      (s, i) =>
        `### ${i + 1}. ${s.conversationId}\n- 客户消息数：${s.customerMsgCount} · 解析轮次：${s.parsedTurns}\n- 首句：${s.firstIntentPreview}\n`
    ),
  ].join("\n");
  fs.writeFileSync(path.join(RUN_DIR, "00_probe_report.md"), probeMd, "utf8");

  const readme = [
    "# udesk-stratified-v0.1（Udesk 分层抽样）",
    "",
    "从真实客户–客服对话抽出的评测会话。叶子本版只做 `intent`（首轮意图）/ `missing`（中段缺信息）；`sop_gate` 延后。",
    "",
    "## 文件",
    "",
    "| 文件 | 说明 |",
    "|------|------|",
    "| `sessions.json` | 终选会话清单（开头有中文字段说明） |",
    "| `leaves.jsonl` | 切好的单轮叶子（阶段3重跑后更新） |",
    "| `leaves.manifest.json` | 叶子计数 |",
    "",
    `会话数：**${selected.length}** · 2.1 OMS亲缘：**${sessionsPayload.relabel21InSelected}**（全池可证 ${omsRelabel.poolSize}，精确2.1=${omsRelabel.exact21}） · 权威：EVAL-AUTHORITY.md`,
    "",
    "## §2.1 亲缘打标（已收紧）",
    "",
    "- **不再**用对话口语正则冒充 `likelyRelabel21`",
    "- 须对话抽出 VASC，且 TOM/`oms.VaOrderService_getVasList` 的 `sceneOverviewName` 命中：",
    "  - 精确：`【入库】尺重/标签辨识后换标上架`",
    "  - 亲缘：入库「换商品标签上架 / …换标上架…」等",
    `- 证据：\`${omsRelabel.path || "missing"}\``,
    "",
    "## 粗桶代号（BN）对照",
    "",
    "| 代号 | 中文 | 目标 | 实得 |",
    "|------|------|------|------|",
    ...Object.keys(BUCKET_QUOTA).map(
      (id) => `| ${id} | ${BUCKET_ZH[id]} | ${BUCKET_QUOTA[id]} | ${finalByBucket[id] || 0} |`
    ),
    "",
    "## sessions.json 顶部字段（中文）",
    "",
    "| 英文字段 | 意思 |",
    "|----------|------|",
    ...Object.entries(FIELD_LEGEND_ZH).map(([k, v]) => `| \`${k}\` | ${v} |`),
    "",
    "缺口：",
    sessionsPayload.coverageGaps.length
      ? sessionsPayload.coverageGaps.map((g) => `- ${g.bucket} ${g.bucketNameZh}：${g.noteZh}`).join("\n")
      : "- 无（各桶已达软底线或配额）",
    "",
    "中间产物：`_runs/20260829_udesk_sample/`",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme, "utf8");

  console.log(
    JSON.stringify(
      {
        eligible: eligible.length,
        candidates: candidates.length,
        selected: selected.length,
        finalByBucket,
        finalByBucketZh,
        relabel21: sessionsPayload.relabel21InSelected,
        coverageGaps: coverageGapsFinal,
        out: OUT_DIR,
        run: RUN_DIR,
      },
      null,
      2
    )
  );
}

main();
