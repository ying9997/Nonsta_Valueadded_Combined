/**
 * Query 前选择器（VAS 指引）：强制唤起 → greeting；增值问句 → guide；
 * 其它 → Query；读页 JSON → page_tool 清单卡。
 * 贴扣子用同目录 vas-guide-router.coze.js。
 */
interface Output {
  route: "greeting" | "guide" | "page_tool" | "query";
  event_no: string;
  user_input: string;
  greeting_text: string;
  vas_session: string;
  conversation_id: string;
  user_id: string;
  username: string;
  customer_code: string;
  should_send: boolean;
  function_name: string;
  arguments: string;
  skip_reason: string;
  sidecar_intact: boolean;
  turn_kind: string;
}

const BACKEND_RENDER = "renderA2UI";
const CATALOG_ID = "ai-chatbot-builtin";
const A2UI_VERSION = "v0.9";
const LINK_TRIGGERS = new Set(["链路测试", "TEST_LINK"]);
const MAX_LINES = 30;
const MAX_CHARS = 1400;
const EVENT_NO_RE = /EB\d{6,}/i;

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function compactChat(text: string): string {
  return asText(text).replace(/\s+/g, "").replace(/[？?！!。．.、，,]/g, "");
}

function extractEventNo(text: string): string {
  const hit = asText(text).match(EVENT_NO_RE);
  return hit ? hit[0].toUpperCase() : "";
}

/** 强制唤起代发：我的异常单{EventNO}应该提交哪个增值产品 */
function isForcedExceptionAsk(text: string): boolean {
  const t = compactChat(text);
  if (!t) return false;
  return t.includes("我的异常单") && EVENT_NO_RE.test(t) && t.includes("应该提交哪个增值产品");
}

function isGreetingAsk(text: string): boolean {
  const raw = asText(text);
  if (LINK_TRIGGERS.has(raw) || LINK_TRIGGERS.has(compactChat(raw))) return true;
  return isForcedExceptionAsk(raw);
}

function isVasFlagOn(params: Record<string, unknown>): boolean {
  const t = asText(params._vas_guide_active ?? params.vas_guide_active).toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

/** 普通客服：打招呼、退出增值、查运费/轨迹等，不进指引 LLM */
function isGeneralAsk(text: string): boolean {
  const t = compactChat(text);
  if (!t) return false;
  if (["你好", "您好", "在吗", "在么", "嗨", "hi", "hello", "早上好"].includes(t)) return true;
  if (t.includes("退出") || t.includes("转人工") || t.includes("普通客服") || t.includes("不问增值")) {
    return true;
  }
  if (t.includes("运费") || t.includes("物流轨迹") || t.includes("快递到哪") || t.includes("包裹到哪")) {
    return true;
  }
  if (t.includes("改密码") || t.includes("登录不了")) return true;
  return false;
}

function isVasIntent(text: string): boolean {
  const t = compactChat(text);
  if (!t) return false;
  if (/WI\d{6,}/i.test(t) || EVENT_NO_RE.test(t)) return true;
  const keys = [
    "上架",
    "换标",
    "辨识",
    "拍照",
    "销毁",
    "自提",
    "增值",
    "异常单",
    "入库单",
    "贴标",
    "补贴",
    "包裹",
    "商品条码",
    "轻加工",
    "换包装",
    "暂存",
    "货权",
    "盘点",
    "换商品标签",
    "条码异常",
  ];
  for (let i = 0; i < keys.length; i++) {
    if (t.includes(keys[i])) return true;
  }
  return false;
}

function unwrapParams(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== "object") return {};
  const rec = args as Record<string, unknown>;
  const nested = rec.params;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return rec;
}

function parseJson(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "object") return value;
  const text = asText(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksLikeDehydratedDom(value: unknown): boolean {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  if (!text || text.length < 20) return false;
  return /dehydrated|interactiveElements|browserState|updateTree|page-agent|axTree/i.test(text);
}

function identity(params: Record<string, unknown>, userInput: string): Pick<
  Output,
  "user_input" | "conversation_id" | "user_id" | "username" | "customer_code" | "sidecar_intact"
> {
  return {
    user_input: asText(userInput),
    conversation_id: asText(params._conversation_id ?? params.conversation_id),
    user_id: asText(params._user_id ?? params.user_id),
    username: asText(params._username ?? params.username),
    customer_code: asText(params._customer_code ?? params.customer_code),
    sidecar_intact: true,
  };
}

function buildGreeting(eventNo: string): string {
  const no = eventNo || "（测试会话）";
  return [
    `收到您的异常单 ${no}。`,
    "",
    "请用您自己的话描述一下：您希望仓库怎么处理这批货物？",
    "例如：「帮我辨识后换标上架到新入库单WI12345678」「帮我拍照确认状态」「这批货不要了，销毁处理」",
    "",
    "描述越详细，我越能帮您快速选对服务、填好表单。",
  ].join("\n");
}

function unwrapDomRoot(raw: unknown): Record<string, unknown> | null {
  let cur = parseJson(raw);
  if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null;
  const obj = cur as Record<string, unknown>;
  const nested =
    obj.dehydrated_dom ?? obj.dehydratedDom ?? obj.browserState ?? obj.data ?? obj.result;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return obj;
}

function pickIndex(el: Record<string, unknown>, fallback: number): string {
  const keys = ["index", "idx", "highlightIndex", "dom_id", "domId", "backendNodeId", "id"];
  for (const key of keys) {
    if (el[key] != null && el[key] !== "") return String(el[key]);
  }
  return String(fallback);
}

function pickText(el: Record<string, unknown>): string {
  const keys = ["text", "name", "label", "content", "description", "title", "value"];
  for (const key of keys) {
    const v = el[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extraFields(el: Record<string, unknown>): string {
  const skip = new Set([
    "index",
    "idx",
    "highlightIndex",
    "dom_id",
    "domId",
    "backendNodeId",
    "id",
    "text",
    "name",
    "label",
    "content",
    "description",
    "title",
    "value",
  ]);
  const bits: string[] = [];
  for (const [k, v] of Object.entries(el)) {
    if (skip.has(k) || v == null || typeof v === "object") continue;
    bits.push(`${k}=${v}`);
    if (bits.length >= 3) break;
  }
  return bits.length ? "  | " + bits.join(" ") : "";
}

function findElementArray(root: Record<string, unknown>): { key: string; items: unknown[] } | null {
  const found: { key: string; items: unknown[] }[] = [];
  const visit = (obj: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(obj)) {
      if (!Array.isArray(v) || v.length === 0) continue;
      const first = v[0];
      if (!first || typeof first !== "object" || Array.isArray(first)) continue;
      const sample = first as Record<string, unknown>;
      if (
        "index" in sample ||
        "idx" in sample ||
        "highlightIndex" in sample ||
        "dom_id" in sample ||
        "domId" in sample ||
        "text" in sample ||
        "name" in sample
      ) {
        found.push({ key: k, items: v });
      }
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object" && !Array.isArray(v)) visit(v as Record<string, unknown>);
    }
  };
  visit(root);
  const preferred = found.find((row) => /interactive/i.test(row.key));
  return preferred || found[0] || null;
}

function buildListBody(raw: unknown): string {
  const root = unwrapDomRoot(raw);
  const topKeys = root ? Object.keys(root).join(", ") : "(无法 parse JSON)";
  const lines: string[] = [`顶层字段: ${topKeys}`];
  if (!root) {
    const text = asText(raw);
    lines.push(text.slice(0, 400));
    return lines.join("\n").slice(0, MAX_CHARS);
  }

  const arr = findElementArray(root);
  if (!arr) {
    const stringEl = root.interactiveElements;
    if (typeof stringEl === "string" && stringEl.trim()) {
      lines.push("interactiveElements 是字符串（不是数组）：");
      lines.push(stringEl.slice(0, 800));
      return lines.join("\n").slice(0, MAX_CHARS);
    }
    lines.push("没找到可点元素数组。下面是 JSON 前 600 字，用来对字段名：");
    lines.push(JSON.stringify(root).slice(0, 600));
    return lines.join("\n").slice(0, MAX_CHARS);
  }

  lines.unshift(`共 ${arr.items.length} 条（字段名: ${arr.key}）`);
  const shown = arr.items.slice(0, MAX_LINES);
  for (let i = 0; i < shown.length; i++) {
    const item = shown[i];
    if (!item || typeof item !== "object") {
      lines.push(`#${i}  ${String(item)}`);
      continue;
    }
    const el = item as Record<string, unknown>;
    const index = pickIndex(el, i);
    const text = pickText(el);
    lines.push(`#${index}  ${text}${extraFields(el)}`);
  }
  if (arr.items.length > MAX_LINES) {
    lines.push(`…还有 ${arr.items.length - MAX_LINES} 条未列出`);
  }

  const blob = JSON.stringify(root);
  const hits = ["原单上架", "入库其他服务需求"].filter((word) => blob.includes(word));
  if (hits.length) lines.push(`文案命中: ${hits.join("、")}`);
  else lines.push("文案命中: 本页 JSON 里还没有「原单上架 / 入库其他服务需求」");

  return lines.join("\n").slice(0, MAX_CHARS);
}

function listCardArguments(raw: unknown): string {
  const body = buildListBody(raw);
  return JSON.stringify({
    commands: [
      {
        version: A2UI_VERSION,
        createSurface: { surfaceId: "page-list", catalogId: CATALOG_ID },
      },
      {
        version: A2UI_VERSION,
        updateComponents: {
          surfaceId: "page-list",
          components: [
            {
              id: "root",
              component: "Card",
              title: "读页清单（先不点页）",
              children: ["body"],
            },
            {
              id: "body",
              component: "Text",
              text: body,
            },
          ],
        },
      },
    ],
  });
}

export async function main(args: Record<string, unknown>): Promise<Output> {
  const params = unwrapParams(args);
  const userInput = params.user_input ?? params.USER_INPUT ?? "";
  const dehydratedDom = params.dehydrated_dom ?? params.dehydratedDom ?? "";
  const chatText = asText(userInput);
  const base = identity(params, chatText);

  const sessionOn = isVasFlagOn(params);

  if (isGreetingAsk(chatText)) {
    const eventNo = extractEventNo(chatText);
    return {
      ...base,
      route: "greeting",
      event_no: eventNo,
      greeting_text: buildGreeting(eventNo),
      vas_session: "1",
      should_send: false,
      function_name: "",
      arguments: "",
      skip_reason: "",
      turn_kind: "greeting",
    };
  }

  const domRaw = looksLikeDehydratedDom(dehydratedDom)
    ? dehydratedDom
    : looksLikeDehydratedDom(userInput)
      ? userInput
      : null;
  if (domRaw != null) {
    return {
      ...base,
      route: "page_tool",
      event_no: extractEventNo(chatText),
      greeting_text: "",
      vas_session: sessionOn ? "1" : "0",
      should_send: true,
      function_name: BACKEND_RENDER,
      arguments: listCardArguments(domRaw),
      skip_reason: "",
      turn_kind: "page_list",
    };
  }

  if (isGeneralAsk(chatText)) {
    return {
      ...base,
      route: "query",
      event_no: extractEventNo(chatText),
      greeting_text: "",
      vas_session: "0",
      should_send: false,
      function_name: "",
      arguments: "",
      skip_reason: "普通客服 Query",
      turn_kind: "query",
    };
  }

  if (isVasIntent(chatText) || sessionOn) {
    return {
      ...base,
      route: "guide",
      event_no: extractEventNo(chatText),
      greeting_text: "",
      vas_session: "1",
      should_send: false,
      function_name: "",
      arguments: "",
      skip_reason: "进 VAS 指引 LLM",
      turn_kind: "guide",
    };
  }

  return {
    ...base,
    route: "query",
    event_no: extractEventNo(chatText),
    greeting_text: "",
    vas_session: "0",
    should_send: false,
    function_name: "",
    arguments: "",
    skip_reason: "普通客服 Query",
    turn_kind: "query",
  };
}

if (typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.includes("--stdin")) {
  const chunks: string[] = [];
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    chunks.push(String(chunk));
  });
  process.stdin.on("end", () => {
    const raw = chunks.join("") || "{}";
    const parsed = JSON.parse(raw);
    const payload = parsed && parsed.__coze_flat === true ? parsed.input : { params: parsed };
    main(payload)
      .then((result) => {
        process.stdout.write(JSON.stringify(result));
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      });
  });
}
