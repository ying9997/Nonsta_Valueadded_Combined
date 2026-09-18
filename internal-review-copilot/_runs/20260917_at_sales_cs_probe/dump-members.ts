import { writeFileSync } from "node:fs";
import { loadEnvFiles } from "../../lib/env.ts";
import { listChatMembers } from "../../lib/feishu-bot.ts";

loadEnvFiles();
const official = await listChatMembers("oc_867cf8749520eaa910938681d51f6e41", true);
const test = await listChatMembers("oc_80b07f38ed6833df3787a97a496f1097", true);
const out = { official, test };
writeFileSync(new URL("./members-utf8.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
