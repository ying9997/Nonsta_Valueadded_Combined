/**
 * 回看增值咨询 Bot 的私聊：有没有非万邑通的人来过，机器人有没有回过不该回的内容。
 *
 *   npx tsx internal-review-copilot/scripts/audit-p2p-access.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyMembers, decideChatAccess, judgeBotReplies } from "../lib/chat-access-guard.ts";
import { copilotDir, loadEnvFiles } from "../lib/env.ts";
import { listChatMembersDetailed, listChatMessages, listJoinedChats } from "../lib/feishu-bot.ts";

loadEnvFiles();

const outDir = resolve(copilotDir(), "_runs", "20260917_p2p_access_audit");
mkdirSync(outDir, { recursive: true });

export type P2pVerdict =
  | "internal"
  | "external_no_bot_reply"
  | "external_forbid_only"
  | "external_leaked_reply"
  | "unknown_or_failed";

interface P2pRow {
  chatId: string;
  name: string;
  peerName: string;
  peerOpenId: string;
  tenantKey: string;
  internal: boolean;
  userMsgCount: number;
  botMsgCount: number;
  forbidCount: number;
  leaked: string[];
  verdict: P2pVerdict;
  accessReason: string;
  error: string;
}

function verdictOf(row: Omit<P2pRow, "verdict">): P2pVerdict {
  if (row.error) return "unknown_or_failed";
  if (row.internal) return "internal";
  if (row.leaked.length) return "external_leaked_reply";
  if (row.forbidCount > 0) return "external_forbid_only";
  return "external_no_bot_reply";
}

const chats = (await listJoinedChats(true)).filter((item) => item.chatMode === "p2p");
const rows: P2pRow[] = [];

for (const chat of chats) {
  const base = {
    chatId: chat.chatId,
    name: chat.name || chat.chatId,
    peerName: "",
    peerOpenId: "",
    tenantKey: "",
    internal: false,
    userMsgCount: 0,
    botMsgCount: 0,
    forbidCount: 0,
    leaked: [] as string[],
    accessReason: "",
    error: "",
  };
  try {
    const page = await listChatMembersDetailed(chat.chatId, true);
    const classified = classifyMembers(page.members);
    const peer = classified.users[0];
    if (peer) {
      base.peerName = peer.name;
      base.peerOpenId = peer.openId;
      base.tenantKey = peer.tenantKey;
    }
    const access = await decideChatAccess({
      chatId: chat.chatId,
      chatType: "p2p",
      senderOpenId: peer?.openId,
      senderTenantKey: peer?.tenantKey,
    });
    base.internal = access.allow;
    base.accessReason = access.reason;
    const messages = await listChatMessages(chat.chatId, { pageSize: 50 });
    base.userMsgCount = messages.filter((item) => item.senderType !== "app").length;
    const judged = judgeBotReplies(messages);
    base.botMsgCount = judged.botCount;
    base.forbidCount = judged.forbidCount;
    base.leaked = judged.leaked;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  }
  const row: P2pRow = { ...base, verdict: verdictOf(base) };
  rows.push(row);
  console.log(`${row.verdict}\t${row.peerName || row.name}\tbot=${row.botMsgCount}\tleaked=${row.leaked.length}`);
}

const leaked = rows.filter((row) => row.verdict === "external_leaked_reply");
const external = rows.filter((row) => row.verdict.startsWith("external") || row.verdict === "unknown_or_failed");

const md = [
  "# 私聊拦截核查",
  "",
  `扫描时间：${new Date().toISOString()}`,
  "",
  `机器人当前私聊会话：**${rows.length}** 个。`,
  "",
  `| 判定 | 人数 | 含义 |`,
  `|---|---|---|`,
  `| 万邑通内部 | ${rows.filter((row) => row.verdict === "internal").length} | 可以正常对话 |`,
  `| 外部且机器人没回过 | ${rows.filter((row) => row.verdict === "external_no_bot_reply").length} | 人来过，但机器人没搭话 |`,
  `| 外部且只回了「禁止使用」 | ${rows.filter((row) => row.verdict === "external_forbid_only").length} | 拦截生效 |`,
  `| **外部且回了别的内容** | **${leaked.length}** | 这才是要抓的漏 |`,
  `| 看不清 | ${rows.filter((row) => row.verdict === "unknown_or_failed").length} | 名单拉失败，按有风险记 |`,
  "",
  leaked.length
    ? "**有漏回。** 下面这些人不是万邑通，但机器人回过「禁止使用」以外的话："
    : "**没有发现「非万邑通私聊却得到业务回复」。**",
  "",
  ...(rows.length
    ? [
        "| 对方 | 是否内部 | 对方消息 | 机器人回复 | 禁止使用 | 漏回摘要 | 判定 |",
        "|---|---|---|---|---|---|---|",
        ...rows.map(
          (row) =>
            `| ${row.peerName || row.name} | ${row.internal ? "是" : "否"} | ${row.userMsgCount} | ${row.botMsgCount} | ${row.forbidCount} | ${row.leaked[0] || ""} | ${row.verdict} |`,
        ),
      ]
    : [
        "会话列表里 **0 条私聊**。飞书给机器人的「已加入会话」接口通常只返回群，不返回私聊，所以这里空着 **不能** 说明没人找过机器人。",
        "要盯私聊，必须打开消息订阅（`LISTEN_IM=1` + `im.message.receive_v1`），来一条记一条。",
      ]),
  "",
  "说明：这条扫描看的是**已经发生过的聊天记录**，不依赖 listen 是否打开。",
  "单聊「禁止使用」要当场拦住，还需要 listen 打开 `LISTEN_IM=1` 并订阅 `im.message.receive_v1`。",
  "",
].join("\n");

writeFileSync(resolve(outDir, "p2p-rows.json"), `${JSON.stringify({ chats: rows.length, leaked: leaked.length, rows }, null, 2)}\n`, "utf8");
writeFileSync(resolve(outDir, "result.md"), md, "utf8");
console.log(`leaked=${leaked.length} externalish=${external.length} wrote ${outDir}`);
