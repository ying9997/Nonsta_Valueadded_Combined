/**
 * List official-group members via 增值咨询 Bot and match 何静 / 李颖.
 *
 *   npx tsx scripts/lookup-chat-members.ts
 */
import { loadEnvFiles, envText } from "../lib/env.ts";
import { listChatMembers } from "../lib/feishu-bot.ts";

const CHAT = "oc_867cf8749520eaa910938681d51f6e41";
const WANTED = ["何静", "李颖", "耿文文", "金萤"];

loadEnvFiles();
const chatId = CHAT;
const members = await listChatMembers(chatId, true);
console.log(`chat=${chatId} members=${members.length} app=${envText("FEISHU_APP_ID")}`);
for (const m of members) {
  console.log(`${m.name}\t${m.openId}`);
}
console.log("--- wanted ---");
for (const name of WANTED) {
  const hits = members.filter((m) => m.name === name || m.name.includes(name));
  if (!hits.length) console.log(`${name}\tNOT_IN_CHAT`);
  else hits.forEach((h) => console.log(`${name}\t${h.openId}\tmatched=${h.name}`));
}
