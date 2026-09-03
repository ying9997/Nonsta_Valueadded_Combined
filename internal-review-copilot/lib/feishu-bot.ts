import { envText } from "./env.ts";
import { loadValidUserToken, type TokenSource } from "./feishu-user-token.ts";

const FEISHU_HOST = "https://open.feishu.cn/open-apis";
/** Internal marker only. Appended to the last body line; never put in the title. */
const AI_TAG = "💪";

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
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

export function getTokenSource(): TokenSource {
  return cachedToken?.source || "tenant";
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

async function feishuJson(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const token = await getToken();
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

function extractText(item: Record<string, unknown>): string {
  const body = asRecord(item.body);
  const content = String(body.content || "");
  if (!content) return String(item.msg_type || "");
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (typeof parsed.text === "string") return parsed.text;
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
  return sendGroupMessage(chatId, buildPost(topic, [`已创建审核话题：${topic}`]));
}

function pushMessageItems(out: FeishuMessage[], items: unknown[], fallback: { threadId: string; chatId: string }): void {
  for (const raw of items) {
    const item = asRecord(raw);
    out.push({
      messageId: String(item.message_id || ""),
      threadId: String(item.thread_id || fallback.threadId),
      chatId: String(item.chat_id || fallback.chatId),
      text: extractText(item),
      createTime: String(item.create_time || ""),
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
