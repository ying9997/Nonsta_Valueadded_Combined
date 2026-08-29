/**
 * Phase 3: cut intent/missing leaves from udesk-stratified-v0.1 sessions.
 * No sop_gate. Max 2 leaves per session this release.
 *
 * Usage: node scripts/eval/sample_udesk_leaves_v01.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const CSV_PATH = path.join(ROOT, "workspace/data/raw/data_udesk_log_database_增值.csv");
const SESSIONS_PATH = path.join(
  ROOT,
  "agent-inventory-assist/03_evaluation/datasets/udesk-stratified-v0.1/sessions.json"
);
const OUT_DIR = path.join(
  ROOT,
  "agent-inventory-assist/03_evaluation/datasets/udesk-stratified-v0.1"
);
const RUN_DIR = path.join(ROOT, "_runs/20260829_udesk_sample");

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

function cleanContent(text) {
  return (text || "")
    .replace(/\t.*?：.*?\n------\n?/g, "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/\b1[3-9]\d{9}\b/g, "[PHONE]")
    .trim();
}

function isNoiseCustomer(content) {
  return (
    !content ||
    content.length < 6 ||
    /^(人工客服|你好|您好|hello|hi)$/i.test(content) ||
    /^【图片】/.test(content) ||
    /^【文件】/.test(content)
  );
}

function isAgentAsk(content) {
  return (
    content.includes("？") ||
    content.includes("?") ||
    /吗$|呢$|是否|还需|请提供|请上传|还缺|缺少|麻烦.*发|发一下|确认下/.test(content)
  );
}

function effectiveTurns(messages) {
  const turns = [];
  for (const m of messages) {
    if (m.sender === "system") continue;
    const content = cleanContent(m.content);
    if (!content) continue;
    if (m.sender === "customer" && isNoiseCustomer(content)) continue;
    turns.push({
      role: m.sender === "customer" ? "customer" : "agent",
      content: content.slice(0, 1200),
      time: m.time,
    });
  }
  return turns;
}

function findIntentLeaf(turns) {
  const idx = turns.findIndex((t) => t.role === "customer");
  if (idx < 0) return null;
  // merge first 1–3 consecutive customer openers if no agent yet
  let end = idx;
  while (end + 1 < turns.length && turns[end + 1].role === "customer" && end - idx < 2) end++;
  const utterance = turns
    .slice(idx, end + 1)
    .map((t) => t.content)
    .join("\n")
    .slice(0, 800);
  return {
    leaf_role: "intent",
    history: [],
    user_utterance: utterance,
    turn_index: end,
  };
}

function findMissingLeaf(turns) {
  let sawCustomer = false;
  let sawAgentAsk = false;
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    if (t.role === "customer") sawCustomer = true;
    if (t.role === "agent" && isAgentAsk(t.content)) sawAgentAsk = true;
    if (
      sawCustomer &&
      sawAgentAsk &&
      t.role === "customer" &&
      i >= 2 &&
      !isNoiseCustomer(t.content)
    ) {
      // prefer mid conversation: not the same as intent block
      const history = turns.slice(0, i).map((x) => ({ role: x.role, content: x.content }));
      if (history.length < 2) continue;
      return {
        leaf_role: "missing",
        history,
        user_utterance: t.content.slice(0, 800),
        turn_index: i,
      };
    }
  }
  return null;
}

function sopSectionHint(session) {
  if (session.likelyRelabel21) return "2.1";
  const map = {
    B1: "2.x-inbound-relabel",
    B2: "2.x-inbound-exception",
    B3: "2.x-inbound-photo",
    B4: "2.x-inbound-other",
    B5: "3.x-inhouse-relabel-ownership",
    B6: "3.x-inhouse-photo-audit",
    B7: "3.x-inhouse-other",
    B8: "cross-entry-quote",
  };
  return map[session.primaryBucket] || null;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(RUN_DIR, { recursive: true });

  const sessionsDoc = JSON.parse(fs.readFileSync(SESSIONS_PATH, "utf8"));
  const rows = parseCSV(fs.readFileSync(CSV_PATH, "utf8"));
  const byId = new Map();
  for (const r of rows) {
    if (r["对话ID"]) byId.set(r["对话ID"], r);
  }

  const leaves = [];
  const stats = {
    sessions: sessionsDoc.sessions.length,
    withIntent: 0,
    withMissing: 0,
    missingCsv: 0,
    noIntent: 0,
    noMissing: 0,
  };

  for (const session of sessionsDoc.sessions) {
    const row = byId.get(session.conversationId);
    if (!row) {
      stats.missingCsv++;
      continue;
    }
    const turns = effectiveTurns(parseMessages(row.messages || ""));
    const base = {
      session_id: session.conversationId,
      coarse_bucket: session.primaryBucket,
      sop_section: sopSectionHint(session),
      high_risk: session.highRisk || [],
      source_ref: {
        csv: "workspace/data/raw/data_udesk_log_database_增值.csv",
        conversationId: session.conversationId,
        date: session.date,
      },
      vasc_nos: session.vascNos || [],
      pii_scrubbed: true,
      likelyRelabel21: !!session.likelyRelabel21,
      sceneClassification: session.sceneClassification || "",
    };

    const intent = findIntentLeaf(turns);
    if (intent) {
      stats.withIntent++;
      leaves.push({
        leaf_id: `${session.conversationId}__intent`,
        ...base,
        leaf_role: "intent",
        history: intent.history,
        user_utterance: intent.user_utterance,
        turn_index: intent.turn_index,
        enrichment_status: "n/a",
      });
    } else stats.noIntent++;

    const missing = findMissingLeaf(turns);
    if (missing) {
      // avoid duplicate utterance identical to intent-only
      const intentUtter = intent ? intent.user_utterance : "";
      if (missing.user_utterance !== intentUtter) {
        stats.withMissing++;
        leaves.push({
          leaf_id: `${session.conversationId}__missing`,
          ...base,
          leaf_role: "missing",
          history: missing.history,
          user_utterance: missing.user_utterance,
          turn_index: missing.turn_index,
          history_turn_count: missing.history.length,
          enrichment_status: "n/a",
        });
      } else stats.noMissing++;
    } else stats.noMissing++;
  }

  const byRole = { intent: 0, missing: 0 };
  const byBucket = {};
  for (const leaf of leaves) {
    byRole[leaf.leaf_role] = (byRole[leaf.leaf_role] || 0) + 1;
    byBucket[leaf.coarse_bucket] = byBucket[leaf.coarse_bucket] || { intent: 0, missing: 0 };
    byBucket[leaf.coarse_bucket][leaf.leaf_role]++;
  }

  const manifest = {
    version: "udesk-stratified-v0.1-leaves",
    phase: 3,
    leafRoles: ["intent", "missing"],
    sop_gate: "deferred",
    generatedAt: new Date().toISOString(),
    rulesRef: "agent-inventory-assist/03_evaluation/抽样规则草稿-真实客服会话-V0.1.md",
    sessionSource: "agent-inventory-assist/03_evaluation/datasets/udesk-stratified-v0.1/sessions.json",
    sessionCount: sessionsDoc.sessionCount,
    leafCount: leaves.length,
    stats,
    byRole,
    byBucket,
  };

  fs.writeFileSync(path.join(OUT_DIR, "leaves.jsonl"), leaves.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "leaves.manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(RUN_DIR, "03_leaves.manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  // update README
  const readmePath = path.join(OUT_DIR, "README.md");
  let readme = fs.readFileSync(readmePath, "utf8");
  if (!readme.includes("leaves.jsonl")) {
    readme += [
      "",
      "## 阶段 3 叶子（intent / missing）",
      "",
      `| leaves.jsonl | ${leaves.length} 条叶子（每通最多 intent+missing；无 sop_gate） |`,
      "| leaves.manifest.json | 计数与分桶统计 |",
      "",
      `生成时间：${manifest.generatedAt}`,
      "",
      `| leaf_role | 条数 |`,
      `|-----------|------|`,
      `| intent | ${byRole.intent} |`,
      `| missing | ${byRole.missing} |`,
      "",
    ].join("\n");
    fs.writeFileSync(readmePath, readme, "utf8");
  }

  // patch sessions.json phase marker
  sessionsDoc.phase = "0-3";
  sessionsDoc.leavesRef = "leaves.jsonl";
  sessionsDoc.leafCount = leaves.length;
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(sessionsDoc, null, 2), "utf8");

  console.log(JSON.stringify(manifest, null, 2));
}

main();
