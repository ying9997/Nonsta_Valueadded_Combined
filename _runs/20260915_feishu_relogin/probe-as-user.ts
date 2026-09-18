import { loadEnvFiles } from "../../internal-review-copilot/lib/env.ts";
import { sendThreadPlainText } from "../../internal-review-copilot/lib/feishu-bot.ts";
import { loadValidUserToken } from "../../internal-review-copilot/lib/feishu-user-token.ts";

const CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const THREAD = "om_x100b65ba2fd8d084c446d87ebdd2bfb";

async function main(): Promise<void> {
  loadEnvFiles();
  const user = await loadValidUserToken();
  if (!user) throw new Error("没有 user token");
  console.log(`name=${user.profile?.name || ""} source=${user.source} scope=${user.profile?.scope || ""}`);
  const sent = await sendThreadPlainText(CHAT, THREAD, "金萤身份连通测试，可忽略。");
  console.log(`ok messageId=${sent.messageId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
