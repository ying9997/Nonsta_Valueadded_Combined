/**
 * Probe: 增值咨询 Bot 用邮箱换 open_id（contact batch_get_id）。
 * 不发消息、不拉群。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../../lib/env.ts";
import { batchGetOpenIdsByEmails } from "../../lib/feishu-bot.ts";

loadEnvFiles();

const outDir = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });

const emails = [
  "ying.jin@winit.com",
  "yong.liu@winit.com",
  "juan.yang@winit.com",
  "zhenyang.kang@winit.com",
  "hongtao.han@winit.com",
  "wenwen.geng@winit.com",
];

const started = new Date().toISOString();
try {
  const map = await batchGetOpenIdsByEmails(emails);
  const rows = emails.map((email) => ({
    email,
    openId: map[email] || "",
    hit: Boolean(map[email]),
  }));
  const result = { ok: true, started, hitCount: rows.filter((r) => r.hit).length, rows };
  writeFileSync(resolve(outDir, "email-openid.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  const result = {
    ok: false,
    started,
    error: err instanceof Error ? err.message : String(err),
  };
  writeFileSync(resolve(outDir, "email-openid.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 1;
}
