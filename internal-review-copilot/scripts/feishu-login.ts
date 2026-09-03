/**
 * Local Feishu OAuth login to obtain user_access_token.
 *
 *   npx tsx internal-review-copilot/scripts/feishu-login.ts
 *
 * Requires FEISHU_APP_ID / FEISHU_APP_SECRET.
 * Redirect URI must be registered on the Feishu app, default:
 *   http://localhost:9988/callback
 *
 * Token is written to internal-review-copilot/.feishu-user-token.json (gitignored).
 * Do not put user_access_token in .env or source.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { exec } from "node:child_process";
import { randomBytes } from "node:crypto";
import { envText, loadEnvFiles } from "../lib/env.ts";
import {
  buildAuthorizeUrl,
  exchangeCodeForUserToken,
  getFeishuUserInfo,
  oauthPort,
  oauthRedirectUri,
  userTokenFilePath,
  writeUserTokenFile,
} from "../lib/feishu-user-token.ts";

function html(title: string, body: string): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>
  <body style="font-family:sans-serif;padding:32px;max-width:640px">
  <h1>${title}</h1><p>${body}</p></body>`;
}

function send(res: ServerResponse, status: number, body: string, type = "text/html; charset=utf-8"): void {
  const buf = Buffer.from(body);
  res.writeHead(status, { "Content-Type": type, "Content-Length": buf.length });
  res.end(buf);
}

function openBrowser(url: string): void {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn(`无法自动打开浏览器，请手动访问：\n${url}`);
  });
}

async function main(): Promise<void> {
  loadEnvFiles();
  const appId = envText("FEISHU_APP_ID");
  if (!appId || !envText("FEISHU_APP_SECRET")) {
    throw new Error("缺少 FEISHU_APP_ID / FEISHU_APP_SECRET。请先配置 internal-review-copilot/.env");
  }
  const redirectUri = oauthRedirectUri();
  const port = oauthPort();
  const state = randomBytes(16).toString("hex");
  const authorizeUrl = buildAuthorizeUrl(appId, redirectUri, state);
  let done = false;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    if (url.pathname !== "/callback") {
      if (url.pathname === "/") {
        res.writeHead(302, { Location: authorizeUrl });
        res.end();
        return;
      }
      send(res, 404, html("Not found", "只处理 /callback"));
      return;
    }
    if (done) {
      send(res, 200, html("已完成", "可以关闭此页。"));
      return;
    }
    const code = url.searchParams.get("code") || "";
    const backState = url.searchParams.get("state") || "";
    if (!code || backState !== state) {
      send(res, 400, html("授权失败", "缺少 code 或 state 不匹配。请回到终端重新运行登录脚本。"));
      return;
    }
    try {
      const token = await exchangeCodeForUserToken(code);
      let name = "";
      let openId = "";
      try {
        const info = await getFeishuUserInfo(token.access_token);
        name = info.name;
        openId = info.open_id;
      } catch {
        // user info is optional; token is enough
      }
      const saved = writeUserTokenFile({ ...token, name, open_id: openId, scope: token.scope });
      done = true;
      send(
        res,
        200,
        html("飞书登录成功", `已写入本地 token 文件。请关闭此页，回到终端。有效期约 2 小时，过期后重新运行登录脚本或等待自动 refresh。`),
      );
      console.log("");
      console.log(`已获取 user_access_token，有效期 2 小时。到期后重新运行本脚本。`);
      if (name) console.log(`登录身份：${name}`);
      console.log(`实际授予 scope：${token.scope || "（响应未返回 scope 字段）"}`);
      console.log(`已写入：${saved}`);
      console.log("不要把该文件提交到 git，也不要写入 .env。");
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 300);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      send(res, 500, html("换 token 失败", message));
      console.error(message);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  console.log(`本地回调：${redirectUri}`);
  console.log("请在飞书开放平台确认：");
  console.log("  1) 重定向 URL 含 http://localhost:9988/callback");
  console.log("  2) 用户身份权限已开通 im:message / im:message:send / im:message.send_as_user（取交集）");
  console.log("  3) 权限变更后如需发布，先发布再重新授权");
  console.log("正在打开飞书授权页…");
  console.log(authorizeUrl);
  openBrowser(authorizeUrl);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
