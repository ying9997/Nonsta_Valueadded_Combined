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
  B7: 9,
  B8: 9,
};

const BUCKET_PRIORITY = ["B1", "B5", "B6", "B7", "B2", "B3", "B8", "B4"];

const BUCKET_PATTERNS = {
  B1: /换标|补贴.*标签|标签.*补贴|尺重|辨识后|条码不符|条码不对|贴错条码|重新贴标|覆盖标签|清除标签|换商品标签|商品条码/i,
  B2: /串仓|调拨|海运整柜|无主货|新单上架|异常单|包裹类异常/i,
  B3: /拍照|视频|暂存|质检|验货|入库视频/i,
  B4: /自提|销毁|包材|合箱|收集SN|透明标签|拆包|拆箱上架|加急入库/i,
  B5: /货权|拆分SKU|商品组合|库内换标|更换SKU|不良品上架|良品转不良|不良品转良品/i,
  B6: /审计盘点|盘点|重新拍照|尺重测量|良品\/不良|不良品检测|外观辨识|库内拍照|库内视频/i,
  B7: /冻结|解冻|取消出库|库内销毁|代采购|加固|作废出库|指令性标签/i,
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

const RELABEL_21 = /尺重|标签辨识|换标上架|条码不符|补贴新标签|商品条码.*换成|换成.*商品条码/i;

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
    const customerTurns = msgs.filter((m) => m.sender === "customer" && m.content.length > 5).length;
    const agentAsks = msgs.filter(
      (m) =>
        m.sender === "agent" &&
        (m.content.includes("？") || m.content.includes("?") || /吗$|呢$|是否|还需|请提供|请上传/.test(m.content))
    ).length;
    candidates.push({
      conversationId: r["对话ID"] || "",
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
      likelyRelabel21: RELABEL_21.test(blob),
      vascNos,
      leafPlan: {
        intent: true,
        missing: agentAsks > 0 || /附件|标签|对应关系|上传|缺少|还需要/.test(blob),
        sop_gate: "deferred",
      },
      sortKey: stableHash(r["对话ID"] || firstIntent),
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
        requested: quota,
        got: take.length,
        note: take.length < 10 ? "below_soft_floor_10" : "below_quota",
      });
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

  // Ensure B1 relabel21 count >= 10 if possible
  const b1Selected = selected.filter((s) => s.primaryBucket === "B1");
  let relabel21Selected = b1Selected.filter((s) => s.likelyRelabel21).length;
  if (relabel21Selected < 10) {
    const extra = (byBucket.B1 || []).filter(
      (c) => c.likelyRelabel21 && !selectedIds.has(c.conversationId)
    );
    for (const c of extra) {
      if (relabel21Selected >= 10) break;
      selectedIds.add(c.conversationId);
      selected.push({ ...c, selectionReason: "b1_relabel21_floor" });
      relabel21Selected++;
    }
  }

  const finalByBucket = {};
  for (const s of selected) {
    finalByBucket[s.primaryBucket] = (finalByBucket[s.primaryBucket] || 0) + 1;
  }

  const sessionsPayload = {
    version: "udesk-stratified-v0.1",
    phase: "0-2",
    leafRolesThisRelease: ["intent", "missing"],
    sopGate: "deferred_see_VASC-SOP补齐链路探测.md",
    sourceCsv: "workspace/data/raw/data_udesk_log_database_增值.csv",
    rulesRef: "agent-inventory-assist/03_evaluation/抽样规则草稿-真实客服会话-V0.1.md",
    generatedAt: new Date().toISOString(),
    quotaTarget: BUCKET_QUOTA,
    sessionCount: selected.length,
    finalByPrimaryBucket: finalByBucket,
    relabel21InSelected: selected.filter((s) => s.likelyRelabel21).length,
    highRiskTagged: selected.filter((s) => s.highRisk.length).length,
    withVasc: selected.filter((s) => s.vascNos.length).length,
    coverageGaps,
    sessions: selected.map((s) => ({
      conversationId: s.conversationId,
      date: s.date,
      primaryBucket: s.primaryBucket,
      bucketHits: s.bucketHits,
      highRisk: s.highRisk,
      likelyRelabel21: s.likelyRelabel21,
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
    "# udesk-stratified-v0.1",
    "",
    "Udesk 全量真实分层抽样（阶段 0～2）。叶子本发布仅规划 `intent` / `missing`；`sop_gate` 见 `../VASC-SOP补齐链路探测.md`。",
    "",
    "| 文件 | 说明 |",
    "|------|------|",
    "| `sessions.json` | 终选会话配额清单 |",
    "| `README.md` | 本说明 |",
    "",
    `会话数：${selected.length} · 规则：抽样规则草稿 V0.1 · 权威：EVAL-AUTHORITY.md`,
    "",
    "中间产物：`_runs/20260829_udesk_sample/`",
    "",
    "## 粗桶实得",
    "",
    "| 桶 | 目标 | 实得 |",
    "|----|------|------|",
    ...Object.keys(BUCKET_QUOTA).map(
      (id) => `| ${id} | ${BUCKET_QUOTA[id]} | ${finalByBucket[id] || 0} |`
    ),
    "",
    `2.1 亲缘（likelyRelabel21）：${sessionsPayload.relabel21InSelected}`,
    `高危标签会话：${sessionsPayload.highRiskTagged}`,
    `含 VASC 号：${sessionsPayload.withVasc}`,
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme, "utf8");

  console.log(
    JSON.stringify(
      {
        eligible: eligible.length,
        candidates: candidates.length,
        selected: selected.length,
        finalByBucket,
        relabel21: sessionsPayload.relabel21InSelected,
        coverageGaps,
        out: OUT_DIR,
        run: RUN_DIR,
      },
      null,
      2
    )
  );
}

main();
