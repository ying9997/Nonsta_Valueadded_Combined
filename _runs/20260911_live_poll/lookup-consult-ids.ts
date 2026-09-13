import { loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import {
  batchGetOpenIdsByEmails,
  ensureMembersInChat,
  listChatMembers,
  resolveTestChatId,
} from "../../internal-review-copilot/lib/feishu-bot.ts";

const EMAILS: Record<string, string[]> = {
  耿文文: ["wenwen.geng@winit.com"],
  金萤: ["ying.jin@winit.com"],
  韩洪涛: ["hongtao.han@winit.com"],
  何静: ["jing.he@winit.com", "he.jing@winit.com", "jinghe@winit.com"],
  李颖: ["ying.li@winit.com", "li.ying@winit.com", "liying@winit.com"],
};

async function main(): Promise<void> {
  loadEnvFiles();
  const allEmails = Object.values(EMAILS).flat();
  console.log("batch_get_id as consult bot...");
  let byEmail: Record<string, string> = {};
  try {
    byEmail = await batchGetOpenIdsByEmails(allEmails);
    console.log("email hits", JSON.stringify(byEmail, null, 2));
  } catch (err) {
    console.log("batch_get_id failed:", err instanceof Error ? err.message : err);
  }

  const chatId = resolveTestChatId();
  const members = await listChatMembers(chatId, true);
  console.log(`consult-bot chat members=${members.length}`);
  for (const name of Object.keys(EMAILS)) {
    const hits = members.filter((m) => m.name === name || m.name.includes(name));
    const emailHit = EMAILS[name].map((e) => byEmail[e]).find(Boolean);
    console.log(
      `${name}: emailId=${emailHit || "-"} chat=${hits.map((h) => `${h.name}=${h.openId}`).join("|") || "NOT_IN_CHAT"}`,
    );
  }

  const needInvite = ["何静", "李颖"]
    .map((name) => {
      const fromEmail = EMAILS[name].map((e) => byEmail[e]).find(Boolean);
      const fromChat = members.find((m) => m.name === name)?.openId;
      return { name, openId: fromEmail || fromChat || "" };
    })
    .filter((item) => item.openId);
  if (needInvite.length) {
    const ensure = await ensureMembersInChat(
      chatId,
      needInvite.map((item) => item.openId),
    );
    console.log("ensure", JSON.stringify(ensure));
    const after = await listChatMembers(chatId, true);
    for (const name of ["何静", "李颖", "耿文文", "金萤"]) {
      const hits = after.filter((m) => m.name === name);
      console.log(`after ${name}: ${hits.map((h) => h.openId).join("|") || "NOT_IN_CHAT"}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
