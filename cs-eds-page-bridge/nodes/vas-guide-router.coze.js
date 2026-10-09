/** 扣子粘贴用（JavaScript）。强制唤起 → greeting；读页回传 → page_tool 清单卡；其它 → guide。 */

const BACKEND_RENDER = "renderA2UI";
const CATALOG_ID = "ai-chatbot-builtin";
const A2UI_VERSION = "v0.9";
const LINK_TRIGGERS = new Set(["链路测试", "TEST_LINK"]);
const MAX_LINES = 30;
const MAX_CHARS = 1400;
const EVENT_NO_RE = /EB\d{6,}/i;

function asText(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function compactChat(text) {
  return asText(text).replace(/\s+/g, "").replace(/[？?！!。．.、，,]/g, "");
}

function extractEventNo(text) {
  const hit = asText(text).match(EVENT_NO_RE);
  return hit ? hit[0].toUpperCase() : "";
}

function isForcedExceptionAsk(text) {
  const t = compactChat(text);
  if (!t) return false;
  return t.indexOf("我的异常单") >= 0 && EVENT_NO_RE.test(t) && t.indexOf("应该提交哪个增值产品") >= 0;
}

function isGreetingAsk(text) {
  const raw = asText(text);
  if (LINK_TRIGGERS.has(raw) || LINK_TRIGGERS.has(compactChat(raw))) return true;
  return isForcedExceptionAsk(raw);
}

function isVasFlagOn(params) {
  const t = asText(params._vas_guide_active || params.vas_guide_active).toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

function isGeneralAsk(text) {
  const t = compactChat(text);
  if (!t) return false;
  if (t === "你好" || t === "您好" || t === "在吗" || t === "在么" || t === "嗨" || t === "hi" || t === "hello" || t === "早上好") {
    return true;
  }
  if (t.indexOf("退出") >= 0 || t.indexOf("转人工") >= 0 || t.indexOf("普通客服") >= 0 || t.indexOf("不问增值") >= 0) {
    return true;
  }
  if (t.indexOf("运费") >= 0 || t.indexOf("物流轨迹") >= 0 || t.indexOf("快递到哪") >= 0 || t.indexOf("包裹到哪") >= 0) {
    return true;
  }
  if (t.indexOf("改密码") >= 0 || t.indexOf("登录不了") >= 0) return true;
  return false;
}

function isVasIntent(text) {
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
  for (var i = 0; i < keys.length; i++) {
    if (t.indexOf(keys[i]) >= 0) return true;
  }
  return false;
}

function unwrapParams(args) {
  if (!args || typeof args !== "object") return {};
  const nested = args.params;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested;
  return args;
}

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  const text = asText(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function looksLikeDehydratedDom(value) {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  if (!text || text.length < 20) return false;
  return /dehydrated|interactiveElements|browserState|updateTree|page-agent|axTree/i.test(text);
}

function identity(params, userInput) {
  return {
    user_input: asText(userInput),
    conversation_id: asText(params._conversation_id || params.conversation_id),
    user_id: asText(params._user_id || params.user_id),
    username: asText(params._username || params.username),
    customer_code: asText(params._customer_code || params.customer_code),
    sidecar_intact: true,
  };
}

function buildGreeting(eventNo) {
  const no = eventNo || "（测试会话）";
  return (
    "收到您的异常单 " +
    no +
    "。\n\n请用您自己的话描述一下：您希望仓库怎么处理这批货物？\n例如：「帮我辨识后换标上架到新入库单WI12345678」「帮我拍照确认状态」「这批货不要了，销毁处理」\n\n描述越详细，我越能帮您快速选对服务、填好表单。"
  );
}

function unwrapDomRoot(raw) {
  const cur = parseJson(raw);
  if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null;
  const nested = cur.dehydrated_dom ?? cur.dehydratedDom ?? cur.data ?? cur.result;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested;
  return cur;
}

function pickIndex(el, fallback) {
  const keys = ["index", "idx", "highlightIndex", "dom_id", "domId", "backendNodeId", "id"];
  for (var i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (el[key] != null && el[key] !== "") return String(el[key]);
  }
  return String(fallback);
}

function pickText(el) {
  const keys = ["text", "name", "label", "content", "description", "title", "value"];
  for (var i = 0; i < keys.length; i++) {
    const v = el[keys[i]];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extraFields(el) {
  const skip = {
    index: 1,
    idx: 1,
    highlightIndex: 1,
    dom_id: 1,
    domId: 1,
    backendNodeId: 1,
    id: 1,
    text: 1,
    name: 1,
    label: 1,
    content: 1,
    description: 1,
    title: 1,
    value: 1,
  };
  const bits = [];
  const keys = Object.keys(el);
  for (var i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = el[k];
    if (skip[k] || v == null || typeof v === "object") continue;
    bits.push(k + "=" + v);
    if (bits.length >= 3) break;
  }
  return bits.length ? "  | " + bits.join(" ") : "";
}

function findElementArray(root) {
  const found = [];
  const visit = (obj) => {
    const keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = obj[k];
      if (!Array.isArray(v) || v.length === 0) continue;
      const first = v[0];
      if (!first || typeof first !== "object" || Array.isArray(first)) continue;
      if (
        "index" in first ||
        "idx" in first ||
        "highlightIndex" in first ||
        "dom_id" in first ||
        "domId" in first ||
        "text" in first ||
        "name" in first
      ) {
        found.push({ key: k, items: v });
      }
    }
    for (var j = 0; j < keys.length; j++) {
      const v2 = obj[keys[j]];
      if (v2 && typeof v2 === "object" && !Array.isArray(v2)) visit(v2);
    }
  };
  visit(root);
  const preferred = found.find((row) => /interactive/i.test(row.key));
  return preferred || found[0] || null;
}

function buildListBody(raw) {
  const root = unwrapDomRoot(raw);
  const topKeys = root ? Object.keys(root).join(", ") : "(无法 parse JSON)";
  const lines = ["顶层字段: " + topKeys];
  if (!root) {
    lines.push(asText(raw).slice(0, 400));
    return lines.join("\n").slice(0, MAX_CHARS);
  }
  const arr = findElementArray(root);
  if (!arr) {
    if (typeof root.interactiveElements === "string" && root.interactiveElements.trim()) {
      lines.push("interactiveElements 是字符串（不是数组）：");
      lines.push(root.interactiveElements.slice(0, 800));
      return lines.join("\n").slice(0, MAX_CHARS);
    }
    lines.push("没找到可点元素数组。下面是 JSON 前 600 字，用来对字段名：");
    lines.push(JSON.stringify(root).slice(0, 600));
    return lines.join("\n").slice(0, MAX_CHARS);
  }
  lines.unshift("共 " + arr.items.length + " 条（字段名: " + arr.key + "）");
  const shown = arr.items.slice(0, MAX_LINES);
  for (var i = 0; i < shown.length; i++) {
    const item = shown[i];
    if (!item || typeof item !== "object") {
      lines.push("#" + i + "  " + String(item));
      continue;
    }
    lines.push("#" + pickIndex(item, i) + "  " + pickText(item) + extraFields(item));
  }
  if (arr.items.length > MAX_LINES) {
    lines.push("…还有 " + (arr.items.length - MAX_LINES) + " 条未列出");
  }
  const blob = JSON.stringify(root);
  const hits = ["原单上架", "入库其他服务需求"].filter((word) => blob.indexOf(word) >= 0);
  if (hits.length) lines.push("文案命中: " + hits.join("、"));
  else lines.push("文案命中: 本页 JSON 里还没有「原单上架 / 入库其他服务需求」");
  return lines.join("\n").slice(0, MAX_CHARS);
}

function listCardArguments(raw) {
  const body = buildListBody(raw);
  return JSON.stringify({
    commands: [
      { version: A2UI_VERSION, createSurface: { surfaceId: "page-list", catalogId: CATALOG_ID } },
      {
        version: A2UI_VERSION,
        updateComponents: {
          surfaceId: "page-list",
          components: [
            { id: "root", component: "Card", title: "读页清单（先不点页）", children: ["body"] },
            { id: "body", component: "Text", text: body },
          ],
        },
      },
    ],
  });
}

async function main(args) {
  const params = unwrapParams(args);
  const userInput = params.user_input ?? params.USER_INPUT ?? "";
  const dehydratedDom = params.dehydrated_dom ?? params.dehydratedDom ?? "";
  const chatText = asText(userInput);
  const base = identity(params, chatText);
  const sessionOn = isVasFlagOn(params);

  if (isGreetingAsk(chatText)) {
    const eventNo = extractEventNo(chatText);
    return Object.assign({}, base, {
      route: "greeting",
      event_no: eventNo,
      greeting_text: buildGreeting(eventNo),
      vas_session: "1",
      should_send: false,
      function_name: "",
      arguments: "",
      skip_reason: "",
      turn_kind: "greeting",
    });
  }

  const domRaw = looksLikeDehydratedDom(dehydratedDom)
    ? dehydratedDom
    : looksLikeDehydratedDom(userInput)
      ? userInput
      : null;
  if (domRaw != null) {
    return Object.assign({}, base, {
      route: "page_tool",
      event_no: extractEventNo(chatText),
      greeting_text: "",
      vas_session: sessionOn ? "1" : "0",
      should_send: true,
      function_name: BACKEND_RENDER,
      arguments: listCardArguments(domRaw),
      skip_reason: "",
      turn_kind: "page_list",
    });
  }

  if (isGeneralAsk(chatText)) {
    return Object.assign({}, base, {
      route: "query",
      event_no: extractEventNo(chatText),
      greeting_text: "",
      vas_session: "0",
      should_send: false,
      function_name: "",
      arguments: "",
      skip_reason: "普通客服 Query",
      turn_kind: "query",
    });
  }

  if (isVasIntent(chatText) || sessionOn) {
    return Object.assign({}, base, {
      route: "guide",
      event_no: extractEventNo(chatText),
      greeting_text: "",
      vas_session: "1",
      should_send: false,
      function_name: "",
      arguments: "",
      skip_reason: "进 VAS 指引 LLM",
      turn_kind: "guide",
    });
  }

  return Object.assign({}, base, {
    route: "query",
    event_no: extractEventNo(chatText),
    greeting_text: "",
    vas_session: "0",
    should_send: false,
    function_name: "",
    arguments: "",
    skip_reason: "普通客服 Query",
    turn_kind: "query",
  });
}
