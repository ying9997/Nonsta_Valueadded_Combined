/**
 * 本机预览：话题根直接发卡片（无外层摘要）。只发测试群，禁止正式群，不动 40。
 *
 *   npx tsx internal-review-copilot/_runs/20260918_card_as_topic/send-preview.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../../lib/env.ts";
import { sendCardInNewTopic } from "../../lib/feishu-bot.ts";
import type { FeishuCard } from "../../lib/feishu-card.ts";

const TEST_CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const OFFICIAL_CHAT = "oc_6566160ccb2def51937469fe8144efdb";
const here = dirname(fileURLToPath(import.meta.url));

function md(content: string): FeishuCard["elements"][number] {
  return { tag: "div", text: { tag: "lark_md", content } };
}

function orangePreview(): FeishuCard {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "⚠ 【预览·卡片即话题】需求不清晰 — PREVIEW-ORANGE" },
      template: "orange",
    },
    elements: [
      md("**增值单** PREVIEW-ORANGE\n**客户** 预览客户 / PREVIEW\n**仓库** USWC5"),
      { tag: "hr" },
      md("**客户需求描述不够完整，以下信息需要补充：**"),
      md("❓ 操作动作不清（这是格式预览，不是真单）"),
      { tag: "hr" },
      md(
        "请看话题左侧/话题根：应直接是这张橙色卡片，外面不应再有「已创建审核话题」那段摘要。\n本条不 @ 任何人，未写入 OMS，未改 40。",
      ),
    ],
  };
}

function greenPreview(): FeishuCard {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "✅ 【预览·卡片即话题】AI 已写入 OMS — PREVIEW-GREEN" },
      template: "green",
    },
    elements: [
      md("**增值单** PREVIEW-GREEN\n**客户** 预览客户 / PREVIEW\n**仓库** USWC5"),
      { tag: "hr" },
      md("**仓库操作 SOP（样例）**\n1. 按异常单定位待处理包裹\n2. 按客户要求完成操作\n3. 关闭异常单"),
      { tag: "hr" },
      md(
        "请看话题左侧/话题根：应直接是这张绿色卡片，外面不应再有「已创建审核话题」那段摘要。\n本条不 @ 任何人，未写入 OMS，未改 40。",
      ),
    ],
  };
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (TEST_CHAT === OFFICIAL_CHAT) throw new Error("测试群与正式群相同，拒绝发送");
  mkdirSync(here, { recursive: true });

  const orange = await sendCardInNewTopic(TEST_CHAT, "unused-outer-title-orange", orangePreview());
  console.log(`orange messageId=${orange.messageId} threadId=${orange.threadId} topicId=${orange.topicId}`);

  const green = await sendCardInNewTopic(TEST_CHAT, "unused-outer-title-green", greenPreview());
  console.log(`green messageId=${green.messageId} threadId=${green.threadId} topicId=${green.topicId}`);

  const payload = {
    chatId: TEST_CHAT,
    chatName: "增值沟通测试-历史抽样",
    officialUntouched: OFFICIAL_CHAT,
    server40Untouched: true,
    orange,
    green,
    sentAt: new Date().toISOString(),
  };
  writeFileSync(resolve(here, "sent.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const mdOut = [
    "# 卡片即话题 · 测试群预览",
    "",
    "- 群：**增值沟通测试-历史抽样**",
    `- chat_id：\`${TEST_CHAT}\``,
    "- 正式群未发、40 未改",
    "",
    "| 卡片 | 话题根应为 | message_id | topic_id |",
    "|---|---|---|---|",
    `| 橙 · 需求不清晰 | 卡片本身，无外层摘要 | \`${orange.messageId}\` | \`${orange.topicId}\` |`,
    `| 绿 · SOP 已写入 | 卡片本身，无外层摘要 | \`${green.messageId}\` | \`${green.topicId}\` |`,
    "",
    "请在测试群左侧点开标题带「【预览·卡片即话题】」的两条。若话题根仍是一段「已创建审核话题」文字，再把卡片嵌在下面，就是还没改对。",
    "",
  ].join("\n");
  writeFileSync(resolve(here, "result.md"), mdOut, "utf8");
}

await main();
