import { envText } from "./env.ts";
import type { FeishuCard } from "./feishu-card.ts";
import { loadValidUserToken, type TokenSource } from "./feishu-user-token.ts";

const FEISHU_HOST = "https://open.feishu.cn/open-apis";
/** Internal marker only. Appended to the last body line; never put in the title. */
const AI_TAG = "💪";
/** 增值咨询 Bot。卡片发送/更新/事件监听必须用这个 app，禁止综合解决方案。 */
export const ZENGZHI_CONSULT_APP_ID = "cli_aa2a76198a7adcb3";
export const COMPREHENSIVE_SOLUTION_APP_ID = "cli_a95f653304f95bcd";

let cachedTenant: { value: string; expireAt: number; appId: string } | null = null;

export interface FeishuPostContent {
  zh_cn: {
    title: string;
    content: Array<Array<Record<string, string>>>;
  };
}

export interface FeishuMessage {
  messageId: string;
  threadId: string;
  chatId: string;
  text: string;
  createTime: string;
  senderId?: string;
  senderType?: string;
  msgType?: string;
}

export interface SendResult {
  messageId: string;
  /** Root message id (`om_…`). Use this for reply / reply_list. */
  threadId: string;
  /** Native topic id (`omt_…`) when Feishu returns one. */
  topicId: string;
  skipped: boolean;
  reason?: string;
}

let cachedToken: { value: string; expireAt: number; source: TokenSource } | null = null;

function requireEnv(name: string): string {
  const value = envText(name);
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

export function aiMarker(): string {
  return AI_TAG;
}

export function isAiTaggedText(text: string): boolean {
  return text.includes(AI_TAG);
}

function mobilePostText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

export function getTokenSource(): TokenSource {
  return cachedToken?.source || "tenant";
}

export function assertConsultAppId(appId: string): string {
  const id = appId.trim();
  if (!id) throw new Error("缺少 FEISHU_APP_ID");
  if (id === COMPREHENSIVE_SOLUTION_APP_ID) {
    throw new Error(
      `禁止使用综合解决方案 Bot（${COMPREHENSIVE_SOLUTION_APP_ID}）。卡片必须用增值咨询 ${ZENGZHI_CONSULT_APP_ID}`,
    );
  }
  if (id !== ZENGZHI_CONSULT_APP_ID) {
    throw new Error(`FEISHU_APP_ID=${id} 不是增值咨询 Bot（${ZENGZHI_CONSULT_APP_ID}）`);
  }
  return id;
}

export async function getConsultTenantToken(): Promise<string> {
  const appId = assertConsultAppId(requireEnv("FEISHU_APP_ID"));
  if (cachedTenant && cachedTenant.appId === appId && Date.now() < cachedTenant.expireAt - 60_000) {
    return cachedTenant.value;
  }
  const appSecret = requireEnv("FEISHU_APP_SECRET");
  const res = await fetch(`${FEISHU_HOST}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) throw new Error(`Feishu tenant token error: ${JSON.stringify(data)}`);
  const token = String(data.tenant_access_token ?? "");
  const expire = Number(data.expire ?? 7200);
  cachedTenant = { value: token, expireAt: Date.now() + expire * 1000, appId };
  return token;
}

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expireAt - 60_000) return cachedToken.value;

  const user = await loadValidUserToken();
  if (user) {
    cachedToken = {
      value: user.token,
      expireAt: user.profile?.expire_at || Date.now() + 7_200_000,
      source: user.source,
    };
    return user.token;
  }

  const appId = requireEnv("FEISHU_APP_ID");
  const appSecret = requireEnv("FEISHU_APP_SECRET");
  const res = await fetch(`${FEISHU_HOST}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.code !== 0) throw new Error(`Feishu token error: ${JSON.stringify(data)}`);
  const token = String(data.tenant_access_token ?? "");
  const expire = Number(data.expire ?? 7200);
  cachedToken = { value: token, expireAt: Date.now() + expire * 1000, source: "tenant" };
  return token;
}

export function mentionUser(userId: string, name: string): Record<string, string> {
  return { tag: "at", user_id: userId, user_name: name };
}

export function buildPost(title: string, paragraphs: string[], mention?: { userId: string; name: string }): FeishuPostContent {
  const content: Array<Array<Record<string, string>>> = [];
  if (mention?.userId) {
    content.push([mentionUser(mention.userId, mention.name || mention.userId), { tag: "text", text: " " }]);
  }
  const body = mobilePostText(paragraphs.join("\n\n"));
  const lines = body.split("\n");
  if (!lines.some((line) => line.includes(AI_TAG))) lines.push(AI_TAG);
  for (const line of lines) {
    content.push([{ tag: "text", text: line || " " }]);
  }
  return {
    zh_cn: {
      title,
      content,
    },
  };
}

export interface DemoRoleMention {
  name: string;
  openId: string | null;
}

/** Demo-only post: `{@销售}` / `{@审核员}` → at tag or fallback `@姓名`. Does not change `buildPost`. */
export function buildDemoPost(
  title: string,
  body: string,
  mentions: Record<string, DemoRoleMention> = {},
): FeishuPostContent {
  const cleaned = mobilePostText(body);
  const lines = cleaned.split("\n");
  if (!lines.some((line) => line.includes(AI_TAG))) lines.push(AI_TAG);
  const content: Array<Array<Record<string, string>>> = [];
  const tokenRe = /\{@([^}]+)\}/g;
  for (const line of lines) {
    const row: Array<Record<string, string>> = [];
    let last = 0;
    tokenRe.lastIndex = 0;
    let match: RegExpExecArray | null = tokenRe.exec(line);
    while (match) {
      if (match.index > last) row.push({ tag: "text", text: line.slice(last, match.index) });
      const role = match[1];
      const person = mentions[role];
      if (person?.openId) row.push(mentionUser(person.openId, person.name));
      else row.push({ tag: "text", text: `@${person?.name || role}` });
      last = match.index + match[0].length;
      match = tokenRe.exec(line);
    }
    if (last < line.length) row.push({ tag: "text", text: line.slice(last) });
    content.push(row.length ? row : [{ tag: "text", text: " " }]);
  }
  return { zh_cn: { title, content } };
}

export async function batchGetOpenIdsByEmails(emails: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(emails.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  const out: Record<string, string> = {};
  if (!unique.length) return out;
  const data = await feishuJson(
    `/contact/v3/users/batch_get_id?user_id_type=open_id`,
    {
      method: "POST",
      body: JSON.stringify({ emails: unique, include_resigned: true }),
    },
    true,
  );
  const list = Array.isArray(asRecord(data.data).user_list) ? (asRecord(data.data).user_list as unknown[]) : [];
  for (const raw of list) {
    const rec = asRecord(raw);
    const email = String(rec.email || "").trim().toLowerCase();
    const openId = String(rec.user_id || rec.open_id || "");
    if (email && openId) out[email] = openId;
  }
  return out;
}

export interface ChatMember {
  openId: string;
  name: string;
}

export async function listChatMembers(chatId: string, asConsultBot = false): Promise<ChatMember[]> {
  const members: ChatMember[] = [];
  let pageToken = "";
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ member_id_type: "open_id", page_size: "100" });
    if (pageToken) q.set("page_token", pageToken);
    const data = await feishuJson(
      `/im/v1/chats/${encodeURIComponent(chatId)}/members?${q}`,
      { method: "GET" },
      asConsultBot,
    );
    const d = asRecord(data.data);
    for (const raw of Array.isArray(d.items) ? d.items : []) {
      const rec = asRecord(raw);
      const openId = String(rec.member_id || rec.member_open_id || rec.open_id || "");
      const name = String(rec.name || rec.member_name || rec.user_id || "");
      if (openId.startsWith("ou_")) members.push({ openId, name });
    }
    pageToken = d.has_more ? String(d.page_token || "") : "";
    if (!pageToken) break;
  }
  return members;
}

export async function listChatMemberOpenIds(chatId: string, asConsultBot = true): Promise<string[]> {
  return [...new Set((await listChatMembers(chatId, asConsultBot)).map((item) => item.openId))];
}

const openIdNameCache = new Map<string, string>();

/** Resolve display name for an open_id. Fallback empty string if directory/chat lookup fails. */
export async function resolveOpenIdName(openId: string, chatId?: string): Promise<string> {
  const id = openId.trim();
  if (!id.startsWith("ou_")) return "";
  const cached = openIdNameCache.get(id);
  if (cached) return cached;
  try {
    const data = await feishuJson(
      `/contact/v3/users/${encodeURIComponent(id)}?user_id_type=open_id`,
      { method: "GET" },
      true,
    );
    const user = asRecord(asRecord(data.data).user);
    const name = String(user.name || user.en_name || "").trim();
    if (name) {
      openIdNameCache.set(id, name);
      return name;
    }
  } catch {
    /* 增值咨询可能没有 contact 权限 */
  }
  if (chatId) {
    try {
      const members = await listChatMembers(chatId, true);
      const hit = members.find((item) => item.openId === id);
      const name = (hit?.name || "").trim();
      if (name && !name.startsWith("ou_")) {
        openIdNameCache.set(id, name);
        return name;
      }
    } catch {
      /* 可能缺 im:chat.members:read */
    }
  }
  return "";
}

export async function ensureMembersInChat(
  chatId: string,
  memberOpenIds: string[],
): Promise<{ added: string[]; alreadyIn: string[]; failed: string[] }> {
  const added: string[] = [];
  const alreadyIn: string[] = [];
  const failed: string[] = [];
  const wanted = [...new Set(memberOpenIds.filter((id) => id.startsWith("ou_")))];
  if (!wanted.length) return { added, alreadyIn, failed };

  let inChat: string[] = [];
  try {
    inChat = await listChatMemberOpenIds(chatId, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`警告：查询群成员失败，跳过拉人：${msg}`);
    return { added, alreadyIn, failed: wanted };
  }
  const inSet = new Set(inChat);
  const toAdd: string[] = [];
  for (const id of wanted) {
    if (inSet.has(id)) alreadyIn.push(id);
    else toAdd.push(id);
  }
  if (!toAdd.length) return { added, alreadyIn, failed };

  try {
    await feishuJson(
      `/im/v1/chats/${encodeURIComponent(chatId)}/members?member_id_type=open_id`,
      {
        method: "POST",
        body: JSON.stringify({ id_list: toAdd }),
      },
      true,
    );
    added.push(...toAdd);
  } catch (err) {
    const bulkMsg = err instanceof Error ? err.message : String(err);
    console.warn(`警告：批量拉人失败，改为逐个尝试：${bulkMsg}`);
    for (const id of toAdd) {
      try {
        await feishuJson(
          `/im/v1/chats/${encodeURIComponent(chatId)}/members?member_id_type=open_id`,
          {
            method: "POST",
            body: JSON.stringify({ id_list: [id] }),
          },
          true,
        );
        added.push(id);
      } catch (oneErr) {
        const msg = oneErr instanceof Error ? oneErr.message : String(oneErr);
        console.warn(`警告：拉入 ${id} 失败：${msg}`);
        failed.push(id);
      }
    }
  }
  return { added, alreadyIn, failed };
}

function replyTargetId(id: string): string {
  // Reply / reply_list require open_message_id (`om_`), not topic id (`omt_`).
  if (id.startsWith("omt_")) {
    throw new Error(`需要根消息 id（om_…）才能回复/拉回复，收到的是话题 id：${id}`);
  }
  return id;
}

function toSendResult(data: Record<string, unknown>, fallbackThread = ""): SendResult {
  const d = asRecord(data.data);
  const messageId = String(d.message_id || "");
  const topicId = String(d.thread_id || "");
  return {
    messageId,
    threadId: messageId || fallbackThread,
    topicId,
    skipped: false,
  };
}

async function feishuJson(path: string, init: RequestInit, asConsultBot = false): Promise<Record<string, unknown>> {
  const token = asConsultBot ? await getConsultTenantToken() : await getToken();
  const res = await fetch(`${FEISHU_HOST}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const raw = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Feishu API ${path} 返回非 JSON（HTTP ${res.status}）：${raw.slice(0, 200)}`);
  }
  if (data.code !== 0) throw new Error(`Feishu API ${path} error: ${JSON.stringify(data)}`);
  return data;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function flattenPostRows(rows: unknown[]): string {
  const texts: string[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const rec = asRecord(cell);
      if (rec.tag === "text") texts.push(String(rec.text || ""));
      if (rec.tag === "at") texts.push(`@${rec.user_name || rec.user_id || ""}`);
    }
  }
  return texts.join("");
}

function extractInteractiveText(parsed: Record<string, unknown>): string {
  const header = asRecord(parsed.header);
  const headerText = String(asRecord(header.title).content || "");
  const bits: string[] = headerText ? [headerText] : [];
  const elements = Array.isArray(parsed.elements) ? parsed.elements : [];
  for (const raw of elements) {
    const el = asRecord(raw);
    if (el.tag === "div") bits.push(String(asRecord(el.text).content || ""));
    if (el.tag === "note") {
      for (const note of Array.isArray(el.elements) ? el.elements : []) {
        bits.push(String(asRecord(note).content || ""));
      }
    }
  }
  return bits.filter(Boolean).join("\n");
}

function extractText(item: Record<string, unknown>): string {
  const body = asRecord(item.body);
  const content = String(body.content || "");
  if (!content) return String(item.msg_type || "");
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (typeof parsed.text === "string") return parsed.text;
    if (parsed.header || Array.isArray(parsed.elements)) return extractInteractiveText(parsed);
    const zh = asRecord(parsed.zh_cn);
    const title = String(zh.title || parsed.title || "");
    const rows = Array.isArray(zh.content)
      ? zh.content
      : Array.isArray(parsed.content)
        ? parsed.content
        : [];
    return [title, flattenPostRows(rows)].filter(Boolean).join("\n");
  } catch {
    return content;
  }
}

/** Demo/simulate only: reply in-thread as plain text without the AI tag so poll treats it as a human reply. */
export async function sendThreadPlainText(
  chatId: string,
  threadId: string,
  text: string,
): Promise<SendResult> {
  const rootId = replyTargetId(threadId);
  const data = await feishuJson(`/im/v1/messages/${encodeURIComponent(rootId)}/reply`, {
    method: "POST",
    body: JSON.stringify({
      content: JSON.stringify({ text }),
      msg_type: "text",
      reply_in_thread: true,
    }),
  });
  return toSendResult(data, rootId);
}

export async function sendConsultThreadText(threadId: string, text: string): Promise<SendResult> {
  const rootId = replyTargetId(threadId);
  const data = await feishuJson(
    `/im/v1/messages/${encodeURIComponent(rootId)}/reply`,
    {
      method: "POST",
      body: JSON.stringify({
        content: JSON.stringify({ text }),
        msg_type: "text",
        reply_in_thread: true,
      }),
    },
    true,
  );
  return toSendResult(data, rootId);
}

export async function updateConsultTextMessage(messageId: string, text: string): Promise<void> {
  await feishuJson(
    `/im/v1/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        msg_type: "text",
        content: JSON.stringify({ text }),
      }),
    },
    true,
  );
}

export async function sendCardMessage(
  chatId: string,
  card: FeishuCard,
  threadId?: string,
): Promise<SendResult> {
  const { open_ids: _omit, ...sendable } = card;
  const content = JSON.stringify(sendable);
  if (threadId) {
    const rootId = replyTargetId(threadId);
    const data = await feishuJson(
      `/im/v1/messages/${encodeURIComponent(rootId)}/reply`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          msg_type: "interactive",
          reply_in_thread: true,
        }),
      },
      true,
    );
    return toSendResult(data, rootId);
  }
  const data = await feishuJson(
    `/im/v1/messages?receive_id_type=chat_id`,
    {
      method: "POST",
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: "interactive",
        content,
      }),
    },
    true,
  );
  return toSendResult(data);
}

export async function updateInteractiveCard(token: string, card: FeishuCard): Promise<void> {
  await feishuJson(
    `/interactive/v1/card/update`,
    {
      method: "POST",
      body: JSON.stringify({ token, card }),
    },
    true,
  );
}

export async function sendGroupMessage(
  chatId: string,
  content: FeishuPostContent | string,
  threadId?: string,
): Promise<SendResult> {
  const post = typeof content === "string" ? buildPost("增值单审核", [content]) : content;
  if (threadId) {
    const rootId = replyTargetId(threadId);
    const data = await feishuJson(`/im/v1/messages/${encodeURIComponent(rootId)}/reply`, {
      method: "POST",
      body: JSON.stringify({
        content: JSON.stringify(post),
        msg_type: "post",
        reply_in_thread: true,
      }),
    });
    return toSendResult(data, rootId);
  }
  const data = await feishuJson(`/im/v1/messages?receive_id_type=chat_id`, {
    method: "POST",
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: "post",
      content: JSON.stringify(post),
    }),
  });
  return toSendResult(data);
}

export async function createThread(chatId: string, topic: string): Promise<SendResult> {
  const post = buildPost(topic, [`已创建审核话题：${topic}`]);
  const data = await feishuJson(
    `/im/v1/messages?receive_id_type=chat_id`,
    {
      method: "POST",
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: "post",
        content: JSON.stringify(post),
      }),
    },
    true,
  );
  return toSendResult(data);
}

export async function sendCardInNewTopic(
  chatId: string,
  topicTitle: string,
  card: FeishuCard,
): Promise<SendResult> {
  const root = await createThread(chatId, topicTitle);
  const threadId = root.messageId || root.threadId;
  if (!threadId) return sendCardMessage(chatId, card);
  const sent = await sendCardMessage(chatId, card, threadId);
  return {
    ...sent,
    threadId,
    topicId: root.topicId || sent.topicId,
  };
}

function pushMessageItems(out: FeishuMessage[], items: unknown[], fallback: { threadId: string; chatId: string }): void {
  for (const raw of items) {
    const item = asRecord(raw);
    const sender = asRecord(item.sender);
    out.push({
      messageId: String(item.message_id || ""),
      threadId: String(item.thread_id || fallback.threadId),
      chatId: String(item.chat_id || fallback.chatId),
      text: extractText(item),
      createTime: String(item.create_time || ""),
      senderId: String(sender.id || sender.open_id || ""),
      senderType: String(sender.sender_type || sender.id_type || ""),
      msgType: String(item.msg_type || ""),
    });
  }
}

async function resolveTopicId(id: string): Promise<string> {
  if (id.startsWith("omt_")) return id;
  const data = await feishuJson(`/im/v1/messages/${encodeURIComponent(replyTargetId(id))}`, { method: "GET" });
  const d = asRecord(data.data);
  const items = Array.isArray(d.items) ? d.items : [d];
  for (const raw of items) {
    const topicId = String(asRecord(raw).thread_id || "");
    if (topicId.startsWith("omt_")) return topicId;
  }
  throw new Error(`无法从 ${id} 解析话题 id（omt_）`);
}

export async function getThreadMessages(chatId: string, threadId: string): Promise<FeishuMessage[]> {
  const topicId = await resolveTopicId(threadId);
  const out: FeishuMessage[] = [];
  let pageToken = "";
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({
      container_id_type: "thread",
      container_id: topicId,
      page_size: "50",
      sort_type: "ByCreateTimeAsc",
    });
    if (pageToken) q.set("page_token", pageToken);
    const data = await feishuJson(`/im/v1/messages?${q}`, { method: "GET" });
    const d = asRecord(data.data);
    const items = Array.isArray(d.items) ? d.items : [];
    pushMessageItems(out, items, { threadId: topicId, chatId });
    pageToken = d.has_more ? String(d.page_token || "") : "";
    if (!pageToken) break;
  }
  return out;
}

export function threadMentionsOrder(messages: FeishuMessage[], orderNo: string): boolean {
  const needle = orderNo.trim().toUpperCase();
  if (!needle) return false;
  return messages.some((msg) => msg.text.toUpperCase().includes(needle));
}

export async function sendDedupedOrderMessage(args: {
  chatId: string;
  orderNo: string;
  title: string;
  body: string;
  threadId?: string | null;
  mention?: { userId: string; name: string };
}): Promise<SendResult> {
  let threadId = args.threadId || "";
  if (threadId) {
    const existing = await getThreadMessages(args.chatId, threadId);
    if (threadMentionsOrder(existing, args.orderNo)) {
      return {
        messageId: "",
        threadId,
        topicId: existing[0]?.threadId || "",
        skipped: true,
        reason: `话题内已有 ${args.orderNo}`,
      };
    }
  }
  const post = buildPost(args.title, [args.body], args.mention);
  if (!threadId) {
    const created = await sendGroupMessage(args.chatId, post);
    return created;
  }
  return sendGroupMessage(args.chatId, post, threadId);
}

export function resolveTestChatId(): string {
  return requireEnv("FEISHU_TEST_CHAT_ID");
}
