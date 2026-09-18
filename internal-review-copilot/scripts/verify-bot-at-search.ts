/**
 * Send 3 @增值咨询 messages in the latest E2E thread as the logged-in user (金萤).
 *
 *   npx tsx internal-review-copilot/scripts/verify-bot-at-search.ts
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { projectDir } from "../lib/env.ts";

const CHAT = "oc_80b07f38ed6833df3787a97a496f1097";
const BOT_OPEN_ID = "ou_931554d4eb61010cb726db63848eb571";
const QUERIES = ["帮我找拍照暂存", "关联第三方", "啊啊啊"];

function runLark(args: string[], cwd: string): { ok: boolean; stdout: string; stderr: string; status: number | null } {
  const result = spawnSync("npx.cmd", ["--yes", "lark-cli", "--as", "user", ...args], {
    encoding: "utf8",
    cwd,
    timeout: 60000,
    windowsHide: true,
    env: {
      ...process.env,
      LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
      LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1",
    },
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function main(): void {
  const outDir = resolve(projectDir(), "_runs/20260914_e2e_topic_scene_wrong");
  const rec = JSON.parse(readFileSync(resolve(outDir, "l3.feishu.json"), "utf8")) as { threadId?: string; chatId?: string };
  const threadId = rec.threadId || "";
  if (!threadId) throw new Error("missing threadId");
  console.log(`chat=${rec.chatId || CHAT} thread=${threadId} bot=${BOT_OPEN_ID}`);

  for (const query of QUERIES) {
    const text = `<at user_id="${BOT_OPEN_ID}">增值咨询</at> ${query}`;
    const args = [
      "im",
      "+messages-reply",
      "--message-id",
      threadId,
      "--reply-in-thread",
      "--text",
      text,
    ];
    let sent = runLark(args, projectDir());
    if (!sent.ok && /high-risk|confirm/i.test(`${sent.stdout}\n${sent.stderr}`)) {
      sent = runLark([...args, "--confirmed"], projectDir());
    }
    console.log(`query=${query} ok=${sent.ok} status=${sent.status}`);
    console.log((sent.stdout || sent.stderr).slice(0, 2000));
    if (!sent.ok) process.exit(1);
  }
}

main();
