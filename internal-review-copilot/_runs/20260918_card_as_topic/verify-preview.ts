import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../../lib/env.ts";
import { getThreadMessages } from "../../lib/feishu-bot.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sent = JSON.parse(readFileSync(resolve(here, "sent.json"), "utf8")) as {
  chatId: string;
  orange: { messageId: string };
  green: { messageId: string };
};

loadEnvFiles();

const rows = [];
for (const [label, id] of [
  ["orange", sent.orange.messageId],
  ["green", sent.green.messageId],
] as const) {
  const msgs = await getThreadMessages(sent.chatId, id);
  const types = msgs.map((m) => m.msgType);
  const hasPostWrapper = msgs.some((m) => m.msgType === "post" || /已创建审核话题/.test(m.text || ""));
  rows.push({
    label,
    messageCount: msgs.length,
    msgTypes: types,
    hasPostWrapper,
    ok: msgs.length === 1 && types[0] === "interactive" && !hasPostWrapper,
  });
  console.log(`${label} count=${msgs.length} types=${types.join(",")} wrapper=${hasPostWrapper}`);
}

writeFileSync(resolve(here, "verify.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
if (rows.some((r) => !r.ok)) process.exit(1);
