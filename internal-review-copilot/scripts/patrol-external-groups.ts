/**
 * 扫一遍增值咨询 Bot 已加入的群，按万邑通白名单统计非万邑通成员。
 * 禁止使用 与 巡检告警共用 config/winit-tenant-whitelist.json。
 *
 *   npx tsx internal-review-copilot/scripts/patrol-external-groups.ts
 *   npx tsx internal-review-copilot/scripts/patrol-external-groups.ts --send
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyMembers } from "../lib/chat-access-guard.ts";
import { copilotDir, loadEnvFiles } from "../lib/env.ts";
import {
  getChatMeta,
  listChatMembersDetailed,
  listJoinedChats,
  sendCardMessage,
  type FeishuChatMeta,
} from "../lib/feishu-bot.ts";
import type { FeishuCard } from "../lib/feishu-card.ts";
import { loadWinitTenants } from "../lib/winit-tenant.ts";

const ALARM_CHAT_ID = "oc_90f9e873b8b880b666f2b1e1257d224a";
const EXCEPTION_CHAT_ID = "oc_6566160ccb2def51937469fe8144efdb";

loadEnvFiles();

const send = process.argv.includes("--send");
const outDir = resolve(copilotDir(), "_runs", "20260917_winit_whitelist");
mkdirSync(outDir, { recursive: true });

export interface PatrolRow {
  chatId: string;
  name: string;
  externalFlag: boolean;
  chatMode: string;
  total: number;
  externalCount: number;
  externalNames: string[];
  truncated: boolean;
  failed: boolean;
  failReason: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function namesCell(names: string[]): string {
  if (!names.length) return "";
  const shown = names.slice(0, 20);
  const extra = names.length > 20 ? ` 等${names.length}人` : "";
  return `${shown.join("、")}${extra}`;
}

async function scanChat(meta: FeishuChatMeta): Promise<PatrolRow> {
  try {
    const page = await listChatMembersDetailed(meta.chatId, true);
    const classified = classifyMembers(page.members);
    const blocked = [...classified.external, ...classified.unknownTenant];
    return {
      chatId: meta.chatId,
      name: meta.name || meta.chatId,
      externalFlag: meta.external,
      chatMode: meta.chatMode,
      total: classified.users.length,
      externalCount: blocked.length,
      externalNames: blocked.map((item) => item.name || item.openId),
      truncated: page.truncated,
      failed: false,
      failReason: page.truncated ? "member_list_truncated" : "",
    };
  } catch (err) {
    return {
      chatId: meta.chatId,
      name: meta.name || meta.chatId,
      externalFlag: meta.external,
      chatMode: meta.chatMode,
      total: 0,
      externalCount: 0,
      externalNames: [],
      truncated: false,
      failed: true,
      failReason: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildPatrolCard(rows: PatrolRow[]): Record<string, unknown> {
  const scanned = rows.length;
  const externalGroups = rows.filter((row) => row.externalFlag).length;
  const nonWinit = rows.reduce((sum, row) => sum + row.externalCount, 0);
  const needAttention = nonWinit > 0 || rows.some((row) => row.failed || row.truncated);
  const headerColor = needAttention ? "orange" : "green";
  const tag = needAttention ? "需要关注" : "无需关注";
  const tagColor = needAttention ? "orange" : "green";
  const tenants = loadWinitTenants()
    .map((item) => item.label)
    .join("；");

  return {
    schema: "2.0",
    config: {
      update_multi: true,
      width_mode: "fill",
      style: {
        text_size: {
          title: { default: "heading-2", pc: "heading-2", mobile: "heading-3" },
          body: { default: "normal", pc: "normal", mobile: "normal" },
          caption: { default: "notation", pc: "notation", mobile: "notation" },
        },
      },
    },
    header: {
      title: { tag: "plain_text", content: "群成员巡检通知" },
      subtitle: { tag: "plain_text", content: `巡检日期：${todayStamp()}  ·  机器人：增值咨询` },
      template: headerColor,
      icon: { tag: "standard_icon", token: "approval_colorful" },
      text_tag_list: [
        { tag: "text_tag", text: { tag: "plain_text", content: tag }, color: tagColor },
      ],
    },
    body: {
      direction: "vertical",
      padding: "12px 12px 20px 12px",
      vertical_spacing: "12px",
      elements: [
        {
          tag: "column_set",
          flex_mode: "none",
          background_style: needAttention ? "orange-50" : "green-50",
          horizontal_spacing: "8px",
          columns: [
            {
              tag: "column",
              width: "weighted",
              weight: 1,
              padding: "12px 8px 12px 8px",
              elements: [{ tag: "markdown", content: `<font color='grey'>外部群</font>\n**${externalGroups}**`, text_align: "center" }],
            },
            {
              tag: "column",
              width: "weighted",
              weight: 1,
              padding: "12px 8px 12px 8px",
              elements: [{ tag: "markdown", content: `<font color='grey'>非万邑通成员</font>\n**${nonWinit}**`, text_align: "center" }],
            },
            {
              tag: "column",
              width: "weighted",
              weight: 1,
              padding: "12px 8px 12px 8px",
              elements: [{ tag: "markdown", content: `<font color='grey'>已扫描群</font>\n**${scanned}**`, text_align: "center" }],
            },
          ],
        },
        {
          tag: "table",
          page_size: 10,
          row_height: "low",
          header_style: { background_style: "grey", bold: true, text_align: "left" },
          columns: [
            { name: "chat", display_name: "群名", data_type: "text", width: "auto" },
            { name: "kind", display_name: "群类型", data_type: "options", width: "auto" },
            { name: "total", display_name: "总人数", data_type: "number", width: "80px", horizontal_align: "right" },
            { name: "ext", display_name: "外部人数", data_type: "number", width: "80px", horizontal_align: "right" },
            { name: "names", display_name: "外部人员名称", data_type: "text", width: "auto" },
          ],
          rows: rows.map((row) => ({
            chat: row.name,
            kind: [
              {
                text: row.externalFlag ? "外部" : "内部",
                color: row.externalFlag ? "orange" : "green",
              },
            ],
            total: row.total,
            ext: row.failed ? -1 : row.externalCount,
            names: row.failed || row.truncated ? `【${row.failReason || "拉取失败"}】` : namesCell(row.externalNames),
          })),
        },
        {
          tag: "markdown",
          text_size: "notation",
          content: `<font color='grey'>内部 = 万邑通飞书 + Winit 关联组织（US/UK/AU/DE/System Account）。${tenants}。所有者：金萤</font>`,
        },
      ],
    },
  };
}

async function ensureExceptionChat(chats: FeishuChatMeta[]): Promise<FeishuChatMeta[]> {
  if (chats.some((item) => item.chatId === EXCEPTION_CHAT_ID)) return chats;
  try {
    const meta = await getChatMeta(EXCEPTION_CHAT_ID, true);
    return [...chats, meta];
  } catch (err) {
    console.warn(`exception chat meta failed: ${err instanceof Error ? err.message : err}`);
    return chats;
  }
}

const joined = (await listJoinedChats(true)).filter((item) => item.chatMode !== "p2p");
const chats = await ensureExceptionChat(joined);
const rows: PatrolRow[] = [];
for (const chat of chats) {
  const row = await scanChat(chat);
  rows.push(row);
  console.log(
    `${row.externalFlag ? "EXT" : "INT"} ${row.total}/${row.externalCount} ${row.name} ${row.failed ? row.failReason : ""}`.trim(),
  );
}

const card = buildPatrolCard(rows);
writeFileSync(resolve(outDir, "patrol-rows.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
writeFileSync(resolve(outDir, "patrol-card.json"), `${JSON.stringify(card, null, 2)}\n`, "utf8");

let messageId = "";
if (send) {
  const sent = await sendCardMessage(ALARM_CHAT_ID, card as FeishuCard);
  messageId = sent.messageId;
  console.log(`sent ${messageId} → ${ALARM_CHAT_ID}`);
}

writeFileSync(
  resolve(outDir, "sent.md"),
  [
    `# 巡检卡 ${todayStamp()}`,
    "",
    send ? `已发到告警群，message_id=\`${messageId}\`` : "未发（没有 `--send`）",
    "",
    `| 群 | 飞书外部群 | 总人数 | 非万邑通 |`,
    `|---|---|---|---|`,
    ...rows.map(
      (row) =>
        `| ${row.name} | ${row.externalFlag ? "是" : "否"} | ${row.total} | ${row.failed ? "拉取失败" : row.externalCount} |`,
    ),
    "",
  ].join("\n"),
  "utf8",
);

console.log(`wrote ${outDir}`);
