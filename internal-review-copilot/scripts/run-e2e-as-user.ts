/**
 * Prompt H 真人路径：用金萤 user token 在测试群话题里发消息，触发 listen 同一套处理。
 *
 *   npx tsx internal-review-copilot/scripts/run-e2e-as-user.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CaseStore } from "../lib/case-store.ts";
import { loadEnvFiles, projectDir } from "../lib/env.ts";
import { sendThreadPlainText } from "../lib/feishu-bot.ts";
import { loadValidUserToken } from "../lib/feishu-user-token.ts";

const TEST_CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const BOT_OPEN_ID = "ou_931554d4eb61010cb726db63848eb571";
const MSG_GAP_MS = 12_000;
const L2 = "VASC000000326061";
const L4 = "VASC000000329235";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  loadEnvFiles();
  process.env.OMS_WRITE_ENABLED = "0";
  const root = projectDir();
  const outDir = resolve(root, "_runs/20260915_e2e_click");
  const store = new CaseStore(resolve(outDir, "case-store.json"));
  const user = await loadValidUserToken();
  if (!user) throw new Error("没有金萤 user token，无法用你的身份发消息");

  const l2 = store.get(L2);
  const l4 = store.get(L4);
  if (!l2?.feishuThreadId) throw new Error(`缺少 ${L2} 话题`);
  if (!l4?.feishuThreadId) throw new Error(`缺少 ${L4} 话题`);

  store.upsert({ vascNo: L2, status: "awaiting_scene_confirm" });
  store.upsert({ vascNo: L4, status: "sop_ready" });

  const notes: string[] = [];
  const send = async (threadId: string, text: string, label: string) => {
    const sent = await sendThreadPlainText(TEST_CHAT, threadId, text);
    notes.push(`${label} → ${sent.messageId}`);
    console.log(`${label} messageId=${sent.messageId}`);
    await sleep(MSG_GAP_MS);
  };

  await send(l2.feishuThreadId, "以上都不对，查看更多场景", "#9 以上都不对");
  await send(
    l4.feishuThreadId,
    `<at user_id="${BOT_OPEN_ID}">增值咨询</at> 拍照暂存`,
    "#21 拍照暂存",
  );
  await send(
    l4.feishuThreadId,
    `<at user_id="${BOT_OPEN_ID}">增值咨询</at> 关联第三方`,
    "#22 关联第三方",
  );
  await send(
    l4.feishuThreadId,
    `<at user_id="${BOT_OPEN_ID}">增值咨询</at> 啊啊啊`,
    "#23 啊啊啊",
  );

  writeFileSync(
    resolve(outDir, "as-user-sent.json"),
    `${JSON.stringify({ at: new Date().toISOString(), notes, asUser: true }, null, 2)}\n`,
    "utf8",
  );
  console.log("as-user done");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
