/**
 * 贴进对话流 cs_Bot_Client_v2p_1 的代码节点 page_intent_emit。
 * 语言必须是 JavaScript。不要贴 TypeScript。
 *
 * 测试：
 *   「读页测试」→ pageRead。前端回传的是纯文本可访问树，例如 [198]<textarea placeholder=...
 *   「出卡测试」→ renderA2UI。卡片上「确认」按钮走 operatePage.inputText，往「轨迹查询」填 test。
 *   读页文本回来 → 再调一次 renderA2UI，回复「已收到读页结果」。能对上「轨迹查询」编号时，确认按钮带上该编号。
 * 卡片格式对齐 cs-eds-page-bridge/a2ui（catalogId=ai-chatbot-builtin，version=v0.9）。
 * 扣子入参有时是 {params}，有时是扁平字段，必须 unwrap，否则六个输出全是 null。
 */

const BACKEND_PAGE_READ = "pageRead";
const BACKEND_RENDER = "renderA2UI";
const CATALOG_ID = "ai-chatbot-builtin";
const A2UI_VERSION = "v0.9";
const CARD_ACTIONS = new Set(["readPage", "operatePage"]);
const PAGE_METHODS = new Set([
  "clickElement",
  "inputText",
  "selectOption",
  "scroll",
  "scrollHorizontally",
]);
const READ_TRIGGERS = new Set(["读页测试", "TEST_PAGE_READ"]);
const CARD_TRIGGERS = new Set(["出卡测试", "TEST_CARD"]);
const TRACK_LABEL = "轨迹查询";
const MAX_LINES = 30;
const MAX_CHARS = 1400;

function asText(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
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

function asDomText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function looksLikeAxTree(text) {
  return /\[\d+\]\s*</.test(text);
}

function looksLikeDehydratedDom(value) {
  const text = asDomText(value);
  if (!text || text.length < 20) return false;
  if (/dehydrated|interactiveElements|browserState|updateTree|page-agent|axTree/i.test(text)) return true;
  return looksLikeAxTree(text);
}

function findLabeledIndex(text, label) {
  const src = String(text || "");
  const re = /\[(\d+)\]\s*</g;
  let match;
  while ((match = re.exec(src))) {
    const chunk = src.slice(match.index, match.index + 320);
    if (chunk.indexOf(label) >= 0) return Number(match[1]);
  }
  return null;
}

function parseSidecarBlob(raw) {
  if (typeof raw === "string") {
    const begin = "<!--SIDECAR_BEGIN-->";
    const end = "<!--SIDECAR_END-->";
    const start = raw.indexOf(begin);
    const stop = raw.indexOf(end);
    if (start >= 0 && stop > start) {
      return parseJson(raw.slice(start + begin.length, stop).trim());
    }
  }
  return parseJson(raw);
}

function extractSidecar(raw) {
  const parsed = parseSidecarBlob(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    if (Array.isArray(parsed)) return { commands: parsed };
    return {};
  }
  const obj = parsed;
  const structured = obj.structured;
  if (structured && typeof structured === "object" && !Array.isArray(structured)) {
    const pageUi = structured.pageUi;
    if (pageUi && typeof pageUi === "object") return { ...obj, ...pageUi };
  }
  const pageUi = obj.pageUi;
  if (pageUi && typeof pageUi === "object" && !Array.isArray(pageUi)) return { ...obj, ...pageUi };
  return obj;
}

function commandsOf(sidecar) {
  const fromArgs = parseJson(sidecar.arguments);
  if (fromArgs && typeof fromArgs === "object" && !Array.isArray(fromArgs)) {
    const cmds = fromArgs.commands;
    if (Array.isArray(cmds)) return cmds;
  }
  if (Array.isArray(sidecar.commands)) return sidecar.commands;
  const payload = sidecar.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload) && Array.isArray(payload.commands)) {
    return payload.commands;
  }
  return null;
}

function walkUnknown(value, visit) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkUnknown(item, visit);
    return;
  }
  visit(value);
  for (const nested of Object.values(value)) walkUnknown(nested, visit);
}

function validateCommands(commands) {
  if (commands.length === 0) return "commands 为空";
  const rootsBySurface = new Map();
  for (const item of commands) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "命令不是对象";
    if (item.version !== A2UI_VERSION) return "缺少 version: v0.9";
    if (item.createSurface && typeof item.createSurface === "object") {
      const surface = item.createSurface;
      if (!asText(surface.surfaceId)) return "createSurface 缺少 surfaceId";
      if (surface.catalogId !== CATALOG_ID) return "catalogId 必须是 " + CATALOG_ID;
    }
    if (item.updateComponents && typeof item.updateComponents === "object") {
      const update = item.updateComponents;
      const surfaceId = asText(update.surfaceId);
      if (!Array.isArray(update.components)) return "updateComponents.components 必须是数组";
      for (const component of update.components) {
        if (!component || typeof component !== "object") return "component 非法";
        if (!asText(component.id) || !asText(component.component)) return "component 缺少 id/component";
        if (component.id === "root") {
          rootsBySurface.set(surfaceId, (rootsBySurface.get(surfaceId) || 0) + 1);
        }
        if (Array.isArray(component.children) && component.children.some((id) => typeof id !== "string")) {
          return "children 只能是组件 id 字符串";
        }
      }
    }
  }
  for (const [surfaceId, count] of rootsBySurface) {
    if (count !== 1) return "Surface " + surfaceId + " 必须恰好一个 root";
  }
  let badAction = "";
  walkUnknown(commands, (node) => {
    if (badAction) return;
    const event = node.event;
    if (event && typeof event === "object") {
      const name = asText(event.name);
      if (name && !CARD_ACTIONS.has(name)) {
        badAction = "卡片 action 只能是 readPage/operatePage，收到 " + name;
      }
    }
    const method = asText(node.method);
    if (method === "executeJavascript") badAction = "禁止 executeJavascript";
    if (method && node.args != null && !PAGE_METHODS.has(method) && !node.actions) {
      if (node.component == null && (node.requireConfirmation != null || Array.isArray(node.args))) {
        badAction = "operatePage method 不在白名单: " + method;
      }
    }
  });
  return badAction;
}

function passthroughArguments(sidecar, fallbackObj) {
  if (typeof sidecar.arguments === "string" && sidecar.arguments.trim()) return sidecar.arguments.trim();
  return JSON.stringify(fallbackObj);
}

function normalizeFunctionName(name) {
  const trimmed = name.trim();
  if (trimmed === "readPage" || trimmed === BACKEND_PAGE_READ) return BACKEND_PAGE_READ;
  if (trimmed === BACKEND_RENDER) return BACKEND_RENDER;
  if (trimmed === "operatePage") return "operatePage";
  return trimmed;
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

function send(functionName, args, intact, turnKind) {
  return {
    should_send: true,
    function_name: functionName,
    arguments: args,
    skip_reason: "",
    sidecar_intact: intact,
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
    index: 1, idx: 1, highlightIndex: 1, dom_id: 1, domId: 1, backendNodeId: 1, id: 1,
    text: 1, name: 1, label: 1, content: 1, description: 1, title: 1, value: 1,
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
        "index" in first || "idx" in first || "highlightIndex" in first ||
        "dom_id" in first || "domId" in first || "text" in first || "name" in first
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

function axTreeLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\[\d+\]\s*</.test(line));
}

function buildAxBody(text) {
  const lines = axTreeLines(text);
  const index = findLabeledIndex(text, TRACK_LABEL);
  const head = ["已收到读页结果。", "带编号的元素 " + lines.length + " 个。"];
  if (index != null) head.push("「" + TRACK_LABEL + "」编号: " + index);
  else head.push("这段文本里还没有「" + TRACK_LABEL + "」。");
  return head.concat(lines.slice(0, MAX_LINES)).join("\n").slice(0, MAX_CHARS);
}

function buildListBody(raw) {
  const text = asDomText(raw);
  if (looksLikeAxTree(text)) return buildAxBody(text);
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
    lines.push("没找到可点元素数组。下面是 JSON 前 600 字：");
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
  if (arr.items.length > MAX_LINES) lines.push("…还有 " + (arr.items.length - MAX_LINES) + " 条未列出");
  return lines.join("\n").slice(0, MAX_CHARS);
}

function confirmButton(index) {
  return {
    id: "confirmBtn",
    component: "Button",
    type: "primary",
    text: "确认",
    action: {
      event: {
        name: "operatePage",
        context: {
          method: "inputText",
          args: [index, "test"],
          requireConfirmation: true,
          confirmationText: "往「" + TRACK_LABEL + "」输入 test",
        },
      },
    },
  };
}

function cardArguments(title, body, index) {
  const children = ["body"];
  const components = [
    { id: "root", component: "Card", title: title, children: children },
    { id: "body", component: "Text", text: body },
  ];
  if (index != null) {
    children.push("confirmBtn");
    components.push(confirmButton(index));
  }
  return JSON.stringify({
    commands: [
      { version: A2UI_VERSION, createSurface: { surfaceId: "page-list", catalogId: CATALOG_ID } },
      {
        version: A2UI_VERSION,
        updateComponents: { surfaceId: "page-list", components: components },
      },
    ],
  });
}

function listCardArguments(raw) {
  const text = asDomText(raw);
  return cardArguments("已收到读页结果", buildListBody(raw), findLabeledIndex(text, TRACK_LABEL));
}

function testCardArguments(raw) {
  const text = asDomText(raw);
  const index = findLabeledIndex(text, TRACK_LABEL);
  const body = index != null
    ? "点「确认」后，往页面上的「" + TRACK_LABEL + "」（编号 " + index + "）输入 test。"
    : "工具已发出这张卡。这一轮没有读页文本，还对不上「" + TRACK_LABEL + "」的编号，所以先不放确认按钮。请先发「读页测试」。";
  return cardArguments("确认填入轨迹查询", body, index);
}

async function main(args) {
  const params = unwrapParams(args);
  const userInput = params.user_input ?? params.USER_INPUT ?? "";
  const dehydratedDom = params.dehydrated_dom ?? params.dehydratedDom ?? "";
  const chatText = asText(userInput);

  if (READ_TRIGGERS.has(chatText)) {
    return send(
      BACKEND_PAGE_READ,
      JSON.stringify({ reason: "channel_test" }),
      true,
      BACKEND_PAGE_READ,
    );
  }
  if (CARD_TRIGGERS.has(chatText)) {
    const tree = looksLikeDehydratedDom(dehydratedDom) ? dehydratedDom : "";
    return send(BACKEND_RENDER, testCardArguments(tree), false, BACKEND_RENDER);
  }

  let sidecar = extractSidecar(params.sidecar ?? params.page_ui ?? params.pageUi);
  if (Object.keys(sidecar).length === 0 && !looksLikeDehydratedDom(userInput)) {
    sidecar = extractSidecar(userInput);
  }

  const functionName = normalizeFunctionName(asText(sidecar.function_name) || asText(sidecar.type));
  const commands = commandsOf(sidecar);

  if (functionName === BACKEND_PAGE_READ) {
    const argsObj = parseJson(sidecar.arguments) || { reason: asText(sidecar.reason) || "need_page_facts" };
    return send(BACKEND_PAGE_READ, passthroughArguments(sidecar, argsObj), true, BACKEND_PAGE_READ);
  }

  if (commands) {
    const error = validateCommands(commands);
    if (error) return idle("A2UI 不合法，拒绝下发: " + error, "idle");
    const argsString = passthroughArguments(sidecar, { commands });
    const intact = typeof sidecar.arguments === "string"
      ? sidecar.arguments.trim() === argsString
      : JSON.stringify({ commands }) === argsString;
    return send(BACKEND_RENDER, argsString, intact, BACKEND_RENDER);
  }

  if (functionName === BACKEND_RENDER) return idle("renderA2UI 但没有 commands", "idle");
  if (functionName === "operatePage") return idle("operatePage 由卡片点击触发，这里不下发", "idle");

  const domRaw = looksLikeDehydratedDom(dehydratedDom)
    ? dehydratedDom
    : looksLikeDehydratedDom(userInput)
      ? userInput
      : null;
  if (domRaw != null) {
    return send(BACKEND_RENDER, listCardArguments(domRaw), false, "page_list");
  }

  const wantRead = sidecar.need_page_read === true || sidecar.needPageRead === true
    || params.force_page_read === true || params.forcePageRead === true;
  if (wantRead) {
    return send(
      BACKEND_PAGE_READ,
      JSON.stringify({ reason: asText(sidecar.reason) || "need_page_facts" }),
      true,
      BACKEND_PAGE_READ,
    );
  }

  return idle("不是读页测试，也不是读页回传", "idle");
}

if (typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.includes("--stdin")) {
  const chunks = [];
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => chunks.push(String(chunk)));
  process.stdin.on("end", () => {
    const parsed = JSON.parse(chunks.join("") || "{}");
    const payload = parsed && parsed.__coze_flat === true ? parsed.input : { params: parsed };
    main(payload)
      .then((result) => process.stdout.write(JSON.stringify(result)))
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      });
  });
}
