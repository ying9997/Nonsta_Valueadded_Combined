import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CHAT = "oc_6566160ccb2def51937469fe8144efdb";
const WINIT_FEISHU = "136f0a06630e975e";
const outDir = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });

const raw = execFileSync(
  "C:\\Users\\ying.jin\\AppData\\Roaming\\npm\\lark-cli.cmd",
  [
    "--profile",
    "zengzhi-consult",
    "im",
    "+chat-members-list",
    "--chat-id",
    CHAT,
    "--as",
    "bot",
    "--member-types",
    "user,bot",
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
    shell: true,
    windowsHide: true,
  },
);

const j = JSON.parse(raw);
writeFileSync(`${outDir}/members-raw.json`, raw, "utf8");
const users = j.data?.users || [];
const bots = j.data?.bots || [];
const truncations = j.data?.truncations || [];

const byTenant: Record<string, { name: string; openId: string }[]> = {};
for (const u of users) {
  const k = u.tenant_key || "(empty)";
  if (!byTenant[k]) byTenant[k] = [];
  byTenant[k].push({ name: u.name, openId: u.member_id });
}

const roster = users.map((u: { name?: string; member_id?: string; tenant_key?: string }) => ({
  name: u.name,
  openId: u.member_id,
  tenantKey: u.tenant_key,
  isWinitFeishu: u.tenant_key === WINIT_FEISHU,
}));

writeFileSync(`${outDir}/roster.json`, JSON.stringify({
  chatId: CHAT,
  userTotalReported: j.data?.user_total,
  botTotalReported: j.data?.bot_total,
  usersFetched: users.length,
  botsFetched: bots.length,
  hasMore: j.data?.has_more,
  truncations,
  tenantCounts: Object.fromEntries(Object.entries(byTenant).map(([k, v]) => [k, v.length])),
  roster,
  bots,
}, null, 2), "utf8");

const lines = ["name\topen_id\ttenant_key\twinit_feishu", ...roster.map((r) => `${r.name}\t${r.openId}\t${r.tenantKey}\t${r.isWinitFeishu ? "Y" : "N"}`)];
writeFileSync(`${outDir}/roster.tsv`, lines.join("\n"), "utf8");

console.log(JSON.stringify({
  usersFetched: users.length,
  reported: j.data?.user_total,
  bots: bots.length,
  hasMore: j.data?.has_more,
  truncations,
  tenantCounts: Object.fromEntries(Object.entries(byTenant).map(([k, v]) => [k, v.length])),
}, null, 2));
