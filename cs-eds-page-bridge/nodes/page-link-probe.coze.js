/** 扣子粘贴用（JavaScript）。强制唤起「我的异常单{EB}应该提交哪个增值产品」→ pageRead；读页回传 → 清单卡。 */

const BACKEND_PAGE_READ = "pageRead";
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

function isPageReadAsk(text) {
  const raw = asText(text);
  if (LINK_TRIGGERS.has(raw) || LINK_TRIGGERS.has(compactChat(raw))) return true;
  return isForcedExceptionAsk(raw);
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
  } catch {
    return null;
  }
}

function looksLikeDehydratedDom(value) {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  if (!text || text.length < 20) return false;
  return /dehydrated|interactiveElements|browserState|updateTree|page-agent|axTree/i.test(text);
}

function idle(reason, turnKind) {
  return {
    should_send: false,
    function_name: "",
    arguments: "",
    skip_reason: reason,
    sidecar_intact: true,
    turn_kind: turnKind,
  };
}

function send(functionName, args, turnKind) {
  return {
    should_send: true,
    function_name: functionName,
    arguments: args,
    skip_reason: "",
    sidecar_intact: true,
    turn_kind: turnKind,
  };
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
  for (const key of keys) {
    if (el[key] != null && el[key] !== "") return String(el[key]);
  }
  return String(fallback);
}

function pickText(el) {
  const keys = ["text", "name", "label", "content", "description", "title", "value"];
  for (const key of keys) {
    const v = el[key];
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
  for (const k of Object.keys(el)) {
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
    for (const k of Object.keys(obj)) {
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
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === "object" && !Array.isArray(v)) visit(v);
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
  for (let i = 0; i < shown.length; i++) {
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
  if (isPageReadAsk(chatText)) {
    const eventNo = extractEventNo(chatText);
    return send(
      BACKEND_PAGE_READ,
      JSON.stringify({
        reason: eventNo ? "forced_exception_ask" : "link_probe_need_interactive_list",
        event_no: eventNo,
      }),
      BACKEND_PAGE_READ,
    );
  }
  const domRaw = looksLikeDehydratedDom(dehydratedDom)
    ? dehydratedDom
    : looksLikeDehydratedDom(userInput)
      ? userInput
      : null;
  if (domRaw != null) {
    return send(BACKEND_RENDER, listCardArguments(domRaw), "page_list");
  }
  return idle("不是强制唤起异常单问句，也不是读页回传", "idle");
}
