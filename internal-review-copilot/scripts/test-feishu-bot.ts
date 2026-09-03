/**
 * Manual Feishu bot smoke:
 *   npx tsx internal-review-copilot/scripts/test-feishu-bot.ts
 *
 * Needs FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_TEST_CHAT_ID.
 * Optional FEISHU_TEST_USER_ID + FEISHU_TEST_USER_NAME to @ someone.
 */

import { loadEnvFiles, envText } from "../lib/env.ts";
import {
  aiMarker,
  buildPost,
  createThread,
  getThreadMessages,
  getToken,
  getTokenSource,
  resolveTestChatId,
  sendDedupedOrderMessage,
  sendGroupMessage,
} from "../lib/feishu-bot.ts";

async function step(n: number, title: string, fn: () => Promise<void>): Promise<boolean> {
  console.log("");
  console.log(`${n}) ${title}`);
  try {
    await fn();
    console.log(`   结果：通过`);
    return true;
  } catch (err) {
    console.log(`   结果：失败 — ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function main(): Promise<void> {
  loadEnvFiles();
  const results: boolean[] = [];
  let chatId = "";
  const userId = envText("FEISHU_TEST_USER_ID");
  const userName = envText("FEISHU_TEST_USER_NAME") || "测试";
  const orderNo = "VASC_FEISHU_SMOKE";
  let threadId = "";

  results.push(
    await step(1, "获取 access token", async () => {
      const token = await getToken();
      if (!token) throw new Error("token 为空");
      const source = getTokenSource();
      const identity = source === "tenant" ? "机器人 tenant_access_token" : `真人 user_access_token（${source}）`;
      console.log(`   token 已拿到（长度 ${token.length}，不打印原文）`);
      console.log(`   身份：${identity}`);
    }),
  );

  results.push(
    await step(2, "解析测试群 chat_id", async () => {
      chatId = resolveTestChatId();
      console.log(`   chatId=${chatId}`);
    }),
  );

  results.push(
    await step(3, "发群消息（业务标题 + 正文末尾 💪 + 可选@）", async () => {
      if (!chatId) throw new Error("无 chatId，跳过发送");
      if (!userId) console.log("   FEISHU_TEST_USER_ID 未配置，本步不 @人");
      const sent = await sendGroupMessage(
        chatId,
        buildPost(
          "测试-增值单审核",
          ["这是一条内部审核 Copilot 连通性测试，不代表任何增值单结论。"],
          userId ? { userId, name: userName } : undefined,
        ),
      );
      console.log(`   messageId=${sent.messageId} threadId=${sent.threadId} topicId=${sent.topicId}`);
      if (!sent.messageId) throw new Error("未返回 messageId");
    }),
  );

  results.push(
    await step(4, "创建话题", async () => {
      if (!chatId) throw new Error("无 chatId");
      const topic = await createThread(chatId, `测试-增值单 ${orderNo}`);
      threadId = topic.messageId || topic.threadId;
      console.log(`   messageId=${topic.messageId} threadId=${threadId} topicId=${topic.topicId}`);
      if (!threadId) throw new Error("未返回根消息 id");
      if (!threadId.startsWith("om_")) throw new Error(`根消息 id 应为 om_ 开头，实际 ${threadId}`);
    }),
  );

  results.push(
    await step(5, "话题内回复", async () => {
      if (!chatId || !threadId) throw new Error("无 chatId/threadId");
      const reply = await sendGroupMessage(chatId, "话题内回复：后续补资料请回在这条话题下。", threadId);
      console.log(`   replyId=${reply.messageId} threadId=${reply.threadId}`);
      if (!reply.messageId) throw new Error("话题内回复未返回 messageId");
    }),
  );

  results.push(
    await step(6, "读取话题消息", async () => {
      if (!chatId || !threadId) throw new Error("无 chatId/threadId");
      const messages = await getThreadMessages(chatId, threadId);
      console.log(`   replies=${messages.length}`);
      for (const msg of messages.slice(0, 8)) {
        console.log(`   - ${msg.messageId}: ${msg.text.slice(0, 100).replace(/\n/g, " ")}`);
      }
      if (!messages.length) throw new Error("话题内没有拉到消息");
    }),
  );

  results.push(
    await step(7, "同一 orderNo 去重", async () => {
      if (!chatId || !threadId) throw new Error("无 chatId/threadId");
      const dedupNo = "VASC_FEISHU_DEDUP";
      const first = await sendDedupedOrderMessage({
        chatId,
        orderNo: dedupNo,
        title: `增值单 ${dedupNo} 缺资料`,
        body: `重复发送测试 ${dedupNo}`,
        threadId,
      });
      const second = await sendDedupedOrderMessage({
        chatId,
        orderNo: dedupNo,
        title: `增值单 ${dedupNo} 缺资料`,
        body: `不应发出 ${dedupNo}`,
        threadId,
      });
      console.log(`   firstSkip=${first.skipped} secondSkip=${second.skipped} marker=${aiMarker()}`);
      if (first.skipped) throw new Error("第一次去重发送不应 skipped");
      if (second.skipped !== true) throw new Error("第二次发送未 skipped");
    }),
  );

  const passed = results.filter(Boolean).length;
  console.log("");
  console.log(`合计 ${passed}/${results.length} 步通过`);
  if (passed < results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
