import { loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import { listChatMembers, resolveTestChatId } from "../../internal-review-copilot/lib/feishu-bot.ts";

async function main(): Promise<void> {
  loadEnvFiles();
  const chatId = resolveTestChatId();
  const members = await listChatMembers(chatId, true);
  const names = ["何静", "李颖", "耿文文", "金萤"];
  console.log(`chat=${chatId} members=${members.length}`);
  for (const want of names) {
    const hits = members.filter((m) => m.name === want || m.name.includes(want));
    console.log(`${want}: ${hits.length ? hits.map((h) => `${h.name}=${h.openId}`).join(" | ") : "NOT_IN_CHAT"}`);
  }
  console.log("--- all names ---");
  for (const m of members.sort((a, b) => a.name.localeCompare(b.name, "zh"))) {
    console.log(`${m.name}\t${m.openId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
