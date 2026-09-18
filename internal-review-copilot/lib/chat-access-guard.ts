import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { copilotDir } from "./env.ts";
import {
  getChatMeta,
  listChatMembersDetailed,
  sendPlainTextToChat,
  type ChatMember,
} from "./feishu-bot.ts";
import { isWinitTenant } from "./winit-tenant.ts";

export const FORBIDDEN_REPLY_TEXT = "禁止使用";

export type ChatKind = "p2p" | "group";

export interface AccessDecision {
  allow: boolean;
  reason: string;
  chatKind: ChatKind | "";
  externalNames: string[];
  truncated: boolean;
  failed: boolean;
}

export interface MemberClassified {
  users: ChatMember[];
  internal: ChatMember[];
  external: ChatMember[];
  unknownTenant: ChatMember[];
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const FAIL_TTL_MS = 60 * 1000;
const cache = new Map<string, { at: number; ttl: number; value: AccessDecision }>();

function isUserMember(member: ChatMember): boolean {
  const t = (member.memberType || "user").toLowerCase();
  if (t === "app" || t === "bot") return false;
  return member.openId.startsWith("ou_");
}

export function classifyMembers(members: ChatMember[]): MemberClassified {
  const users = members.filter(isUserMember);
  const internal: ChatMember[] = [];
  const external: ChatMember[] = [];
  const unknownTenant: ChatMember[] = [];
  for (const user of users) {
    if (!user.tenantKey) unknownTenant.push(user);
    else if (isWinitTenant(user.tenantKey)) internal.push(user);
    else external.push(user);
  }
  return { users, internal, external, unknownTenant };
}

function cacheGet(key: string): AccessDecision | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > hit.ttl) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: AccessDecision, ttl = CACHE_TTL_MS): void {
  cache.set(key, { at: Date.now(), ttl, value });
}

export function resetChatAccessCacheForTests(): void {
  cache.clear();
}

function deny(partial: Omit<AccessDecision, "allow">): AccessDecision {
  return { allow: false, ...partial };
}

function allow(partial: Omit<AccessDecision, "allow">): AccessDecision {
  return { allow: true, ...partial };
}

async function resolveChatKind(chatId: string, hinted?: string): Promise<ChatKind> {
  const hint = String(hinted || "").toLowerCase();
  if (hint === "p2p" || hint === "group") return hint;
  const meta = await getChatMeta(chatId, true);
  return meta.chatMode === "p2p" ? "p2p" : "group";
}

export async function decideChatAccess(input: {
  chatId: string;
  chatType?: string;
  senderTenantKey?: string;
  senderOpenId?: string;
}): Promise<AccessDecision> {
  const chatId = String(input.chatId || "").trim();
  if (!chatId) {
    return deny({
      reason: "missing_chat_id",
      chatKind: "",
      externalNames: [],
      truncated: false,
      failed: true,
    });
  }

  let chatKind: ChatKind;
  try {
    chatKind = await resolveChatKind(chatId, input.chatType);
  } catch (err) {
    return deny({
      reason: `chat_meta_failed:${err instanceof Error ? err.message : err}`,
      chatKind: "",
      externalNames: [],
      truncated: false,
      failed: true,
    });
  }

  if (chatKind === "p2p") {
    const senderKey = String(input.senderTenantKey || "").trim();
    if (senderKey) {
      if (isWinitTenant(senderKey)) {
        return allow({
          reason: "p2p_sender_winit",
          chatKind,
          externalNames: [],
          truncated: false,
          failed: false,
        });
      }
      return deny({
        reason: "p2p_sender_not_winit",
        chatKind,
        externalNames: [input.senderOpenId || senderKey],
        truncated: false,
        failed: false,
      });
    }
  }

  const cachedKey = `${chatKind}:${chatId}`;
  const hit = cacheGet(cachedKey);
  if (hit) return hit;

  try {
    const page = await listChatMembersDetailed(chatId, true);
    if (page.truncated) {
      const decision = deny({
        reason: "member_list_truncated",
        chatKind,
        externalNames: [],
        truncated: true,
        failed: false,
      });
      cacheSet(cachedKey, decision, FAIL_TTL_MS);
      return decision;
    }
    const classified = classifyMembers(page.members);
    if (chatKind === "p2p") {
      const sender = input.senderOpenId
        ? classified.users.find((item) => item.openId === input.senderOpenId)
        : undefined;
      const target = sender || classified.users[0];
      if (!target || !target.tenantKey) {
        const decision = deny({
          reason: "p2p_tenant_unknown",
          chatKind,
          externalNames: target ? [target.name || target.openId] : [],
          truncated: false,
          failed: true,
        });
        cacheSet(cachedKey, decision, FAIL_TTL_MS);
        return decision;
      }
      const decision = isWinitTenant(target.tenantKey)
        ? allow({
            reason: "p2p_member_winit",
            chatKind,
            externalNames: [],
            truncated: false,
            failed: false,
          })
        : deny({
            reason: "p2p_member_not_winit",
            chatKind,
            externalNames: [target.name || target.openId],
            truncated: false,
            failed: false,
          });
      cacheSet(cachedKey, decision);
      return decision;
    }

    const blocked = [...classified.external, ...classified.unknownTenant];
    if (blocked.length) {
      const decision = deny({
        reason: classified.unknownTenant.length ? "group_member_tenant_unknown" : "group_has_non_winit",
        chatKind,
        externalNames: blocked.map((item) => item.name || item.openId),
        truncated: false,
        failed: false,
      });
      cacheSet(cachedKey, decision);
      return decision;
    }
    const decision = allow({
      reason: "group_all_winit",
      chatKind,
      externalNames: [],
      truncated: false,
      failed: false,
    });
    cacheSet(cachedKey, decision);
    return decision;
  } catch (err) {
    const decision = deny({
      reason: `member_list_failed:${err instanceof Error ? err.message : err}`,
      chatKind,
      externalNames: [],
      truncated: false,
      failed: true,
    });
    cacheSet(cachedKey, decision, FAIL_TTL_MS);
    return decision;
  }
}

export function accessAuditLogPath(): string {
  return join(copilotDir(), "logs", "access-audit.jsonl");
}

export function judgeBotReplies(messages: Array<{ text?: string; senderType?: string }>): {
  botCount: number;
  forbidCount: number;
  leaked: string[];
} {
  let botCount = 0;
  let forbidCount = 0;
  const leaked: string[] = [];
  for (const msg of messages) {
    if (String(msg.senderType || "") !== "app") continue;
    botCount += 1;
    const text = String(msg.text || "").trim();
    if (text === FORBIDDEN_REPLY_TEXT) forbidCount += 1;
    else leaked.push(text.slice(0, 80));
  }
  return { botCount, forbidCount, leaked };
}

function appendAccessAudit(row: Record<string, unknown>): void {
  try {
    const path = accessAuditLogPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify({ ts: new Date().toISOString(), ...row })}\n`, "utf8");
  } catch (err) {
    console.warn(`access audit log failed: ${err instanceof Error ? err.message : err}`);
  }
}

/** 不允许时回复「禁止使用」并返回 true（调用方应立刻停掉后续处理）。 */
export async function rejectIfForbidden(input: {
  chatId: string;
  chatType?: string;
  senderTenantKey?: string;
  senderOpenId?: string;
}): Promise<boolean> {
  const decision = await decideChatAccess(input);
  const shouldLog = !decision.allow || decision.chatKind === "p2p";
  if (shouldLog) {
    appendAccessAudit({
      chatId: input.chatId,
      chatType: input.chatType || decision.chatKind,
      senderOpenId: input.senderOpenId || "",
      allow: decision.allow,
      reason: decision.reason,
      externalNames: decision.externalNames,
      truncated: decision.truncated,
      failed: decision.failed,
    });
    console.warn(
      `access ${decision.allow ? "allow" : "deny"} chat=${input.chatId} kind=${decision.chatKind} reason=${decision.reason} ext=${decision.externalNames.length}`,
    );
  }
  if (decision.allow) return false;
  try {
    await sendPlainTextToChat(input.chatId, FORBIDDEN_REPLY_TEXT);
  } catch (err) {
    console.warn(`forbid reply failed: ${err instanceof Error ? err.message : err}`);
  }
  return true;
}
