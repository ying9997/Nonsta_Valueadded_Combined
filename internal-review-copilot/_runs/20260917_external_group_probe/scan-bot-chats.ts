/**
 * 扫描增值咨询 Bot 已加入的群，按万邑通 tenant 识别外部成员。只读，不发消息。
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WINIT_TENANT = "136f0a06630e975e";
const BOT_CHATS = [
  { chatId: "oc_80b07f38ed6833df3787a97a496f1097", name: "增值沟通测试-历史抽样" },
  { chatId: "oc_867cf8749520eaa910938681d51f6e41", name: "非标增值审核测试群" },
];

function listMembers(chatId: string) {
  const raw = execFileSync(
    "lark-cli",
    [
      "--profile",
      "zengzhi-consult",
      "im",
      "+chat-members-list",
      "--chat-id",
      chatId,
      "--as",
      "bot",
      "--page-all",
      "--page-limit",
      "0",
      "--format",
      "json",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
        LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1",
      },
    },
  );
  return JSON.parse(raw) as {
    ok?: boolean;
    data?: {
      external?: boolean;
      truncations?: unknown[];
      users?: Array<{ name?: string; member_id?: string; tenant_key?: string }>;
      bots?: Array<{ name?: string; app_id?: string; tenant_key?: string }>;
    };
  };
}

function classify(tenantKey: string | undefined) {
  return tenantKey && tenantKey !== WINIT_TENANT ? "external" : "internal";
}

const outDir = dirname(fileURLToPath(import.meta.url));
const scannedAt = new Date().toISOString();
const groups = BOT_CHATS.map((chat) => {
  const res = listMembers(chat.chatId);
  const users = res.data?.users || [];
  const externals = users.filter((u) => classify(u.tenant_key) === "external");
  return {
    ...chat,
    truncations: res.data?.truncations || [],
    userCount: users.length,
    botCount: (res.data?.bots || []).length,
    internalUsers: users.filter((u) => classify(u.tenant_key) !== "external").map((u) => u.name),
    externalUsers: externals.map((u) => ({ name: u.name, tenantKey: u.tenant_key, openId: u.member_id })),
    users,
  };
});

const report = groups
  .map((g) => {
    const status = g.externalUsers.length
      ? `有外部成员，列出外部成员清单：${g.externalUsers.map((u) => u.name).join("、")}`
      : "无外部成员";
    return [
      "智能体名称：增值咨询",
      "所有者：金萤",
      `加入的群名称：${g.name}`,
      `群ID：${g.chatId}`,
      `状态：${status}`,
    ].join("\n");
  })
  .join("\n\n");

writeFileSync(resolve(outDir, "scan.json"), JSON.stringify({ scannedAt, winitTenant: WINIT_TENANT, groups }, null, 2), "utf8");
writeFileSync(resolve(outDir, "daily-alert-draft.md"), `${report}\n`, "utf8");
console.log(report);
