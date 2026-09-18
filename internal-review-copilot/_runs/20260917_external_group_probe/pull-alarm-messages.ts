import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const env = {
  ...process.env,
  LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
  LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1",
};

const raw = execFileSync(
  "C:\\Users\\ying.jin\\AppData\\Roaming\\npm\\lark-cli.cmd",
  [
    "--profile",
    "zengzhi-consult",
    "im",
    "+chat-messages-list",
    "--chat-id",
    "oc_90f9e873b8b880b666f2b1e1257d224a",
    "--as",
    "bot",
    "--order",
    "desc",
    "--page-size",
    "50",
    "--no-reactions",
    "--format",
    "json",
  ],
  { encoding: "utf8", env, shell: true, windowsHide: true },
);

writeFileSync(new URL("./alarm-recent.json", import.meta.url), raw, "utf8");
const j = JSON.parse(raw);
const messages = j.data?.messages || [];
const finance = messages.filter(
  (m) =>
    m.sender?.id === "cli_a4be717e663fd00d" ||
    String(m.sender?.name || "").includes("财务") ||
    String(m.sender?.name || "").includes("金融"),
);
const summary = messages.slice(0, 20).map((m) => ({
  t: m.create_time,
  type: m.msg_type,
  name: m.sender?.name,
  app: m.sender?.id,
  content: String(m.content || "").slice(0, 500),
  body: m.body ? JSON.stringify(m.body).slice(0, 300) : undefined,
}));
writeFileSync(new URL("./alarm-preview.json", import.meta.url), JSON.stringify({ financeCount: finance.length, finance, summary }, null, 2), "utf8");
console.log(JSON.stringify({ total: messages.length, finance: finance.length, names: [...new Set(messages.map((m) => m.sender?.name))] }, null, 2));
