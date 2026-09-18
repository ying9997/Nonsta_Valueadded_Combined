/**
 * Whitelist used by 禁止使用 + 巡检告警.
 *
 *   npx tsx internal-review-copilot/scripts/test-winit-tenant.ts
 */
import { classifyMembers, judgeBotReplies } from "../lib/chat-access-guard.ts";
import { isWinitTenant, loadWinitTenants } from "../lib/winit-tenant.ts";
import type { ChatMember } from "../lib/feishu-bot.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const tenants = loadWinitTenants();
assert(tenants.length === 2, "whitelist has 2 tenants");
assert(isWinitTenant("136f0a06630e975e"), "飞书 tenant is internal");
assert(isWinitTenant("10b2a3f0fdc79759"), "Winit 关联组织 tenant is internal");
assert(!isWinitTenant(""), "empty key is external");
assert(!isWinitTenant("unknown-tenant"), "unknown tenant is external");

const members: ChatMember[] = [
  { openId: "ou_feishu", name: "金萤", tenantKey: "136f0a06630e975e", memberType: "user" },
  { openId: "ou_lark", name: "Willie Lam", tenantKey: "10b2a3f0fdc79759", memberType: "user" },
  { openId: "ou_bot", name: "bot", tenantKey: "136f0a06630e975e", memberType: "app" },
];
const allInternal = classifyMembers(members);
assert(allInternal.users.length === 2, "bots excluded from people");
assert(allInternal.external.length === 0 && allInternal.unknownTenant.length === 0, "both keys internal");

const mixed = classifyMembers([
  ...members,
  { openId: "ou_ext", name: "客户甲", tenantKey: "not-winit", memberType: "user" },
  { openId: "ou_unk", name: "无名", tenantKey: "", memberType: "user" },
]);
assert(mixed.external.map((item) => item.name).join() === "客户甲", "non-winit counted external");
assert(mixed.unknownTenant.map((item) => item.name).join() === "无名", "missing tenant fail-closed");

const replies = judgeBotReplies([
  { senderType: "user", text: "你好" },
  { senderType: "app", text: "禁止使用" },
  { senderType: "app", text: "这是SOP卡片" },
]);
assert(replies.botCount === 2 && replies.forbidCount === 1 && replies.leaked.join() === "这是SOP卡片", "leaked reply detected");

console.log("test-winit-tenant ok");
