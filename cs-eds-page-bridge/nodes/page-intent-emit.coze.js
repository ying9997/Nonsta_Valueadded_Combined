/** Coze 代码节点粘贴用（JavaScript）。由 page-intent-emit.ts 生成，不要手改两份逻辑。 */
/**
 * Bot Client 封口节点：把页面 sidecar 原样交给 tool_call_send。
 * 贴进 Coze：用同目录 page-intent-emit.coze.js（纯 JS）。本文件给本地测试。
 * 禁止 import / export。扣子入参可能是 { params } 也可能是扁平字段，必须 unwrap。
 *
 * 输入 params：
 *   sidecar          专家/会话变量里的页面 JSON（string 或 object）
 *   user_input       本轮 USER_INPUT
 *   dehydrated_dom   SDK workflow/run 上报的脱水 DOM（没有就空）
 *
 * 输出：
 *   should_send      是否接 tool_call_send
 *   function_name    pageRead | renderA2UI | ""
 *   arguments        插件要的 JSON 字符串
 *   skip_reason      不发时的原因
 *   sidecar_intact   是否原样转发（未改 commands）
 *   turn_kind        pageRead | renderA2UI | page_read_result | idle
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

function asText(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** 扣子代码节点有时是 main({params})，有时直接 main({user_input,...})。扁平时 params 是 undefined，一读就整格输出变 null。 */
function unwrapParams(args) {
  if (!args || typeof args !== "object") return {};
  const rec = args;
  const nested = rec.params;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested;
  }
  return rec;
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
    const pageUi = (structured).pageUi;
    if (pageUi && typeof pageUi === "object") {
      return { ...obj, ...(pageUi) };
    }
  }
  const pageUi = obj.pageUi;
  if (pageUi && typeof pageUi === "object" && !Array.isArray(pageUi)) {
    return { ...obj, ...(pageUi) };
  }
  return obj;
}

function commandsOf(sidecar) {
  const fromArgs = parseJson(sidecar.arguments);
  if (fromArgs && typeof fromArgs === "object" && !Array.isArray(fromArgs)) {
    const cmds = (fromArgs).commands;
    if (Array.isArray(cmds)) return cmds;
  }
  if (Array.isArray(sidecar.commands)) return sidecar.commands;
  const payload = sidecar.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const cmds = (payload).commands;
    if (Array.isArray(cmds)) return cmds;
  }
  return null;
}

function walkUnknown(value, visit) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkUnknown(item, visit);
    return;
  }
  const obj = value;
  visit(obj);
  for (const nested of Object.values(obj)) walkUnknown(nested, visit);
}

function validateCommands(commands) {
  if (commands.length === 0) return "commands 为空";
  const surfaceIds = new Set();
  const rootsBySurface = new Map();

  for (const item of commands) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "命令不是对象";
    const cmd = item;
    if (cmd.version !== A2UI_VERSION) return "缺少 version: v0.9";

    if (cmd.createSurface && typeof cmd.createSurface === "object") {
      const surface = cmd.createSurface;
      const surfaceId = asText(surface.surfaceId);
      if (!surfaceId) return "createSurface 缺少 surfaceId";
      if (surface.catalogId !== CATALOG_ID) {
        return `catalogId 必须是 ${CATALOG_ID}`;
      }
      surfaceIds.add(surfaceId);
    }

    if (cmd.updateComponents && typeof cmd.updateComponents === "object") {
      const update = cmd.updateComponents;
      const surfaceId = asText(update.surfaceId);
      const components = update.components;
      if (!Array.isArray(components)) return "updateComponents.components 必须是数组";
      for (const component of components) {
        if (!component || typeof component !== "object") return "component 非法";
        const row = component;
        if (!asText(row.id) || !asText(row.component)) return "component 缺少 id/component";
        if (row.id === "root") {
          rootsBySurface.set(surfaceId, (rootsBySurface.get(surfaceId) || 0) + 1);
        }
        if (Array.isArray(row.children) && row.children.some((id) => typeof id !== "string")) {
          return "children 只能是组件 id 字符串";
        }
      }
    }
  }

  for (const [surfaceId, count] of rootsBySurface) {
    if (count !== 1) return `Surface ${surfaceId} 必须恰好一个 root`;
  }

  let badAction = "";
  walkUnknown(commands, (node) => {
    if (badAction) return;
    const event = node.event;
    if (event && typeof event === "object") {
      const name = asText((event).name);
      if (name && !CARD_ACTIONS.has(name)) {
        badAction = `卡片 action 只能是 readPage/operatePage，收到 ${name}`;
      }
    }
    const method = asText(node.method);
    if (method === "executeJavascript") {
      badAction = "禁止 executeJavascript";
    }
    if (method && node.args != null && !PAGE_METHODS.has(method) && !node.actions) {
      if (node.component == null && (node.requireConfirmation != null || Array.isArray(node.args))) {
        badAction = `operatePage method 不在白名单: ${method}`;
      }
    }
  });
  return badAction;
}

function passthroughArguments(sidecar, fallbackObj) {
  if (typeof sidecar.arguments === "string" && sidecar.arguments.trim()) {
    return sidecar.arguments.trim();
  }
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

function sidecarIsEmpty(sidecar) {
  return Object.keys(sidecar).length === 0;
}

/** 预览框只能发短句时用。不要用「点击」这种会撞上真实客服话。 */
const PHASE1_CARD_TRIGGERS = new Set(["出卡测试", "TEST_A2UI"]);
const PHASE1_READ_TRIGGERS = new Set(["读页测试", "TEST_PAGE_READ"]);
const PHASE1_CLICK_TRIGGERS = new Set(["点页测试", "TEST_CLICK"]);
/** 对照原型 sop-card-v6。arguments 是 JSON 字符串，给后台测解析。 */
const PHASE1_CARD_ARGUMENTS = JSON.stringify({
  commands: [
    {
      version: "v0.9",
      createSurface: { surfaceId: "sop", catalogId: "ai-chatbot-builtin" },
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId: "sop",
        components: [
          {
            id: "root",
            component: "Card",
            title: "操作 SOP — 良品转不良品上架",
            children: ["body", "confirmBtn", "reviseBtn"],
          },
          {
            id: "body",
            component: "Text",
            text: "1. 按出库单 WO12120399145 下架指定商品（86 件）\n2. 按新入库单 WI51339338 补贴包裹标签\n3. 使用新入库单做不良品上架\n4. 上架后登记「单品包装破损」异常，复核时确认为不良品\n5. 操作完成后拍照留存",
          },
          {
            id: "confirmBtn",
            component: "Button",
            type: "primary",
            text: "确认并使用",
            action: {
              event: {
                name: "operatePage",
                context: {
                  requireConfirmation: true,
                  confirmationText: "确认后将按 SOP 在当前页选中处理方式与增值服务，不会提交审核。",
                  actions: [
                    { method: "selectOption", args: [0, "原单上架"] },
                    { method: "selectOption", args: [1, "入库其他服务需求"] },
                  ],
                },
              },
            },
          },
          {
            id: "reviseBtn",
            component: "Button",
            text: "让 AI 再改一版",
          },
        ],
      },
    },
  ],
});
/** 点页短卡。SOP 出卡用上面那包。 */
const PHASE1_CLICK_ARGUMENTS =
  '{"commands":[{"version":"v0.9","createSurface":{"surfaceId":"ops","catalogId":"ai-chatbot-builtin"}},{"version":"v0.9","updateComponents":{"surfaceId":"ops","components":[{"id":"root","component":"Card","title":"点页","children":["b"]},{"id":"b","component":"Button","text":"点第0个","action":{"event":{"name":"operatePage","context":{"method":"clickElement","args":[0],"requireConfirmation":true}}}}]}}]}';

async function main(args) {
  const params = unwrapParams(args);
  let sidecar = extractSidecar(params.sidecar ?? params.page_ui ?? params.pageUi);
  const userInput = params.user_input ?? params.USER_INPUT ?? "";
  const dehydratedDom = params.dehydrated_dom ?? params.dehydratedDom ?? "";
  const chatText = asText(userInput);
  if (PHASE1_CARD_TRIGGERS.has(chatText)) {
    return send(BACKEND_RENDER, PHASE1_CARD_ARGUMENTS, true, BACKEND_RENDER);
  }
  if (PHASE1_READ_TRIGGERS.has(chatText)) {
    return send(
      BACKEND_PAGE_READ,
      JSON.stringify({ reason: "eds_value_add_form_need_facts" }),
      true,
      BACKEND_PAGE_READ,
    );
  }
  if (PHASE1_CLICK_TRIGGERS.has(chatText)) {
    return send(BACKEND_RENDER, PHASE1_CLICK_ARGUMENTS, true, BACKEND_RENDER);
  }
  if (sidecarIsEmpty(sidecar)) {
    sidecar = extractSidecar(userInput);
  }
  const pageReadResult = looksLikeDehydratedDom(dehydratedDom) || looksLikeDehydratedDom(userInput);

  const functionName = normalizeFunctionName(asText(sidecar.function_name) || asText(sidecar.type));
  const commands = commandsOf(sidecar);

  if (functionName === BACKEND_PAGE_READ) {
    const argsObj = parseJson(sidecar.arguments) || { reason: asText(sidecar.reason) || "need_page_facts" };
    return send(BACKEND_PAGE_READ, passthroughArguments(sidecar, argsObj), true, BACKEND_PAGE_READ);
  }

  if (commands) {
    const error = validateCommands(commands);
    if (error) return idle(`A2UI 不合法，拒绝下发: ${error}`, "idle");
    const argsString = passthroughArguments(sidecar, { commands });
    const intact =
      typeof sidecar.arguments === "string"
        ? sidecar.arguments.trim() === argsString
        : JSON.stringify({ commands }) === argsString;
    return send(BACKEND_RENDER, argsString, intact, BACKEND_RENDER);
  }

  if (functionName === BACKEND_RENDER) {
    return idle("renderA2UI 但没有 commands", "idle");
  }

  if (pageReadResult) {
    return idle("本轮是 pageRead 回传的 DOM，等待专家 sidecar", "page_read_result");
  }

  if (functionName === "operatePage") {
    return idle("operatePage 由卡片点击触发，封口节点不下发", "idle");
  }

  const wantRead =
    sidecar.need_page_read === true ||
    sidecar.needPageRead === true ||
    params.force_page_read === true ||
    params.forcePageRead === true;
  if (wantRead) {
    return send(
      BACKEND_PAGE_READ,
      JSON.stringify({ reason: asText(sidecar.reason) || "need_page_facts" }),
      true,
      BACKEND_PAGE_READ,
    );
  }

  return idle("sidecar 无法识别为 pageRead 或 renderA2UI", "idle");
}

if (typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.includes("--stdin")) {
  const chunks = [];
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
