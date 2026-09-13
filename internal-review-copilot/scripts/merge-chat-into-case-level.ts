/**
 * Round 2.1: merge three-chat supplement into case_level 入库 dataset.
 *
 * Usage:
 *   npx tsx internal-review-copilot/scripts/merge-chat-into-case-level.ts \
 *     --cases workspace/_runs/20260908_case_level_exploration_v2/by_flow/case_level_dataset_入库.json \
 *     --chats workspace/_runs/20260908_three_chat_supplement/three_chat_discussions_combined_filtered.json \
 *     --out _runs/20260908_3scene_build_v3
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/env.ts";
import { asArray, asRecord, asText } from "../lib/oms-adapter.ts";
import type { JsonRecord } from "../lib/types.ts";

function arg(name: string, fallback = ""): string {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  return idx >= 0 ? process.argv[idx + 1] || fallback : fallback;
}

const THIRD_CHAT_ID = "oc_5b8848d27b7b3fa4a10eab865c4f9ffc";

interface ChatRec {
  discussionId: string;
  chatId: string;
  chatName: string;
  detail: string;
  relatedNos: string;
  relatedVasc: string[];
  relatedEb: string[];
}

function hasConversation(raw: string, status: string): boolean {
  if (status === "not_found") return false;
  const t = (raw || "").trim();
  if (!t) return false;
  if (t === "not_found" || t.startsWith("not_found")) return false;
  return true;
}

function extractNos(blob: string): { vasc: string[]; eb: string[] } {
  const upper = blob.toUpperCase();
  return {
    vasc: [...new Set(upper.match(/VASC\d{6,}/g) || [])],
    eb: [...new Set(upper.match(/EB\d{6,}/g) || [])],
  };
}

function formatChatBlock(chat: ChatRec): string {
  return `--- 群聊: ${chat.chatName} (${chat.chatId}) ---\n${chat.detail.trim()}`;
}

function alreadyHasChatBlock(raw: string, chatId: string): boolean {
  return raw.includes(`(${chatId})`) || raw.includes(chatId);
}

function parseChatRow(row: JsonRecord): ChatRec | null {
  const discussionId = asText(row["讨论ID"] ?? row.discussionId ?? row.threadId);
  const detail = asText(row["对话详情"] ?? row.conversationDetail ?? row.detail);
  if (!discussionId || !detail) return null;
  const chatId = asText(row["群ID"] ?? row.chatId ?? row.groupId);
  const chatName = asText(row["群名称"] ?? row.chatName ?? row.groupName) || chatId;
  const relatedNos = asText(row["关联单号"] ?? row.relatedOrders ?? row.relatedNos);
  const nos = extractNos(`${relatedNos}\n${detail}`);
  return {
    discussionId,
    chatId,
    chatName,
    detail,
    relatedNos,
    relatedVasc: nos.vasc,
    relatedEb: nos.eb,
  };
}

function main(): void {
  loadEnvFiles();
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "../..");
  const casesPath = resolve(
    projectRoot,
    arg("cases") ||
      "workspace/_runs/20260908_case_level_exploration_v2/by_flow/case_level_dataset_入库.json",
  );
  const chatsPath = resolve(
    projectRoot,
    arg("chats") ||
      "workspace/_runs/20260908_three_chat_supplement/three_chat_discussions_combined_filtered.json",
  );
  const outDir = resolve(projectRoot, arg("out") || "_runs/20260908_3scene_build_v3");

  if (!existsSync(casesPath) || !existsSync(chatsPath)) {
    console.error(`missing input:\n  cases=${casesPath}\n  chats=${chatsPath}`);
    process.exit(1);
  }

  const casesRaw = JSON.parse(readFileSync(casesPath, "utf8"));
  const meta = Array.isArray(casesRaw) ? {} : asRecord(casesRaw.meta);
  const cases = (Array.isArray(casesRaw) ? casesRaw : asArray(casesRaw.cases)).map(asRecord);

  const chatRows = (JSON.parse(readFileSync(chatsPath, "utf8")) as unknown[])
    .map((r) => parseChatRow(asRecord(r)))
    .filter((r): r is ChatRec => Boolean(r));

  const byThread = new Map<string, ChatRec[]>();
  const byVasc = new Map<string, ChatRec[]>();
  const byEb = new Map<string, ChatRec[]>();

  const pushMap = (m: Map<string, ChatRec[]>, key: string, rec: ChatRec) => {
    if (!key) return;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(rec);
  };

  for (const chat of chatRows) {
    pushMap(byThread, chat.discussionId, chat);
    for (const v of chat.relatedVasc) pushMap(byVasc, v, chat);
    for (const e of chat.relatedEb) pushMap(byEb, e, chat);
  }

  let beforeFound = 0;
  let afterFound = 0;
  let newlyFilled = 0;
  let appendedThird = 0;
  const matchMethods = { threadId: 0, vascNo: 0, ebNo: 0 };
  const matchLog: Array<Record<string, unknown>> = [];

  const enriched = cases.map((caseRec) => {
    const status0 = asText(caseRec.conversationRawStatus);
    const raw0 = asText(caseRec.conversationRaw);
    const had = hasConversation(raw0, status0);
    if (had) beforeFound += 1;

    const threadIds = asArray(caseRec.threadIds).map((x) => asText(x)).filter(Boolean);
    const vascNos = asArray(caseRec.vascNos).map((x) => asText(x).toUpperCase()).filter(Boolean);
    const ebNos = asArray(caseRec.ebNos).map((x) => asText(x).toUpperCase()).filter(Boolean);

    // Collect candidate chats with method tags
    type Cand = { chat: ChatRec; method: "threadId" | "vascNo" | "ebNo" };
    const cands: Cand[] = [];
    const seenDisc = new Set<string>();

    const addAll = (list: ChatRec[] | undefined, method: Cand["method"]) => {
      if (!list) return;
      for (const chat of list) {
        const key = `${chat.discussionId}||${chat.chatId}`;
        if (seenDisc.has(key)) continue;
        seenDisc.add(key);
        cands.push({ chat, method });
      }
    };

    for (const tid of threadIds) addAll(byThread.get(tid), "threadId");

    // Fallback / supplement: order-number match when missing or for third-chat append
    for (const v of vascNos) addAll(byVasc.get(v), "vascNo");
    for (const e of ebNos) addAll(byEb.get(e), "ebNo");

    if (!cands.length) {
      if (had) afterFound += 1;
      return caseRec;
    }

    // Prefer threadId matches; keep unique chats by chatId+discussionId
    const byKey = new Map<string, Cand>();
    for (const c of cands) {
      const k = `${c.chat.discussionId}||${c.chat.chatId}`;
      const prev = byKey.get(k);
      if (!prev || (prev.method !== "threadId" && c.method === "threadId")) {
        byKey.set(k, c);
      }
    }
    const selected = [...byKey.values()];

    let raw = raw0.trim();
    let status = status0 || (had ? "found" : "not_found");
    let changed = false;
    const usedMethods = new Set<string>();

    if (!had) {
      // Fill from matches (prefer threadId-first ordering)
      selected.sort((a, b) => {
        const rank = (m: string) => (m === "threadId" ? 0 : m === "ebNo" ? 1 : 2);
        return rank(a.method) - rank(b.method);
      });
      const blocks = selected.map(({ chat, method }) => {
        usedMethods.add(method);
        return formatChatBlock(chat);
      });
      if (blocks.length) {
        raw = blocks.join("\n\n");
        status = "found";
        changed = true;
        newlyFilled += 1;
      }
    } else {
      // Already has conversation: append third-chat (or any missing chatId) blocks
      for (const { chat, method } of selected) {
        if (alreadyHasChatBlock(raw, chat.chatId) && alreadyHasChatBlock(raw, chat.discussionId)) {
          continue;
        }
        // Round 2.1 emphasis: append third chat extras; also append other missing groups
        const isThird = chat.chatId === THIRD_CHAT_ID;
        const missingGroup = !alreadyHasChatBlock(raw, chat.chatId);
        if (!isThird && !missingGroup) continue;
        if (!missingGroup && alreadyHasChatBlock(raw, chat.discussionId)) continue;
        raw = `${raw.trim()}\n\n${formatChatBlock(chat)}`;
        usedMethods.add(method);
        changed = true;
        if (isThird) appendedThird += 1;
      }
      if (changed) status = "found";
    }

    if (changed) {
      for (const m of usedMethods) {
        if (m === "threadId") matchMethods.threadId += 1;
        else if (m === "ebNo") matchMethods.ebNo += 1;
        else matchMethods.vascNo += 1;
      }
      matchLog.push({
        caseId: asText(caseRec.caseId),
        beforeHad: had,
        methods: [...usedMethods],
        chatIds: [...new Set(selected.map((c) => c.chat.chatId))],
        discussionIds: [...new Set(selected.map((c) => c.chat.discussionId))],
      });
    }

    if (hasConversation(raw, status)) afterFound += 1;

    return {
      ...caseRec,
      conversationRaw: raw,
      conversationRawStatus: status,
      conversationEnrichment: {
        enrichedAt: new Date().toISOString(),
        changed,
        methods: [...usedMethods],
        source: "20260908_three_chat_supplement",
      },
    };
  });

  mkdirSync(outDir, { recursive: true });
  const outJson = resolve(outDir, "case_level_dataset_入库_enriched.json");
  writeFileSync(
    outJson,
    `${JSON.stringify(
      {
        meta: {
          ...meta,
          enrichedFrom: {
            cases: casesPath,
            chats: chatsPath,
            chatCount: chatRows.length,
            enrichedAt: new Date().toISOString(),
          },
        },
        cases: enriched,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const total = cases.length;
  const summaryMd = `# chat-merge-summary（Round 2.1）

- 生成时间: ${new Date().toISOString()}
- case 输入: \`${casesPath}\`
- 群聊输入: \`${chatsPath}\`（${chatRows.length} 条）
- 输出: \`${outJson}\`

## 覆盖率

| 指标 | 数量 | 比例 |
|------|-----:|-----:|
| case 总数 | ${total} | 100% |
| 原 conversationRaw 有内容 | ${beforeFound} | ${((beforeFound / total) * 100).toFixed(1)}% |
| 补充后有内容 | ${afterFound} | ${((afterFound / total) * 100).toFixed(1)}% |
| 净增有内容 case | ${afterFound - beforeFound} | — |
| 从空补齐 | ${newlyFilled} | — |
| 追加第三群对话的 case 次数 | ${appendedThird} | — |

## 匹配方式分布（发生变更的 case 上累计）

| 方式 | 次数 |
|------|-----:|
| threadId（讨论ID） | ${matchMethods.threadId} |
| ebNo（关联单号/正文） | ${matchMethods.ebNo} |
| vascNo（关联单号/正文） | ${matchMethods.vascNo} |

## 说明

- 空/not_found：按 threadIds→讨论ID 优先填充；不足再用 VASC/EB 关联。
- 已有对话：检查并追加缺失群（尤其第三群 \`${THIRD_CHAT_ID}\`），块头带群名称与群 ID。
- 变更明细见 \`chat-merge-matches.json\`（${matchLog.length} 条）。
`;

  writeFileSync(resolve(outDir, "chat-merge-summary.md"), summaryMd, "utf8");
  writeFileSync(
    resolve(outDir, "chat-merge-matches.json"),
    `${JSON.stringify({ matchLog, matchMethods, beforeFound, afterFound, newlyFilled, appendedThird }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        total,
        beforeFound,
        afterFound,
        newlyFilled,
        appendedThird,
        matchMethods,
        changedCases: matchLog.length,
        outJson,
      },
      null,
      2,
    ),
  );
}

main();
