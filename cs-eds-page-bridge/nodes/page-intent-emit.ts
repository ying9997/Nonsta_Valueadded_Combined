/**
 * Bot Client 封口节点：把页面 sidecar 原样交给 tool_call_send。
 * 贴进 Coze 代码节点。禁止 import / export。
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

interface Args {
  params: Record<string, unknown>;
}

interface Output {
  should_send: boolean;
  function_name: string;
  arguments: string;
  skip_reason: string;
  sidecar_intact: boolean;
  turn_kind: string;
}

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

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
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

function parseSidecarBlob(raw: unknown): unknown {
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

function extractSidecar(raw: unknown): Record<string, unknown> {
  const parsed = parseSidecarBlob(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    if (Array.isArray(parsed)) return { commands: parsed };
    return {};
  }
  const obj = parsed as Record<string, unknown>;
  const structured = obj.structured;
  if (structured && typeof structured === "object" && !Array.isArray(structured)) {
    const pageUi = (structured as Record<string, unknown>).pageUi;
    if (pageUi && typeof pageUi === "object") {
      return { ...obj, ...(pageUi as Record<string, unknown>) };
    }
  }
  const pageUi = obj.pageUi;
  if (pageUi && typeof pageUi === "object" && !Array.isArray(pageUi)) {
    return { ...obj, ...(pageUi as Record<string, unknown>) };
  }
  return obj;
}

function commandsOf(sidecar: Record<string, unknown>): unknown[] | null {
  const fromArgs = parseJson(sidecar.arguments);
  if (fromArgs && typeof fromArgs === "object" && !Array.isArray(fromArgs)) {
    const cmds = (fromArgs as Record<string, unknown>).commands;
    if (Array.isArray(cmds)) return cmds;
  }
  if (Array.isArray(sidecar.commands)) return sidecar.commands;
  const payload = sidecar.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const cmds = (payload as Record<string, unknown>).commands;
    if (Array.isArray(cmds)) return cmds;
  }
  return null;
}

function walkUnknown(value: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkUnknown(item, visit);
    return;
  }
  const obj = value as Record<string, unknown>;
  visit(obj);
  for (const nested of Object.values(obj)) walkUnknown(nested, visit);
}

function validateCommands(commands: unknown[]): string {
  if (commands.length === 0) return "commands 为空";
  const surfaceIds = new Set<string>();
  const rootsBySurface = new Map<string, number>();

  for (const item of commands) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "命令不是对象";
    const cmd = item as Record<string, unknown>;
    if (cmd.version !== A2UI_VERSION) return "缺少 version: v0.9";

    if (cmd.createSurface && typeof cmd.createSurface === "object") {
      const surface = cmd.createSurface as Record<string, unknown>;
      const surfaceId = asText(surface.surfaceId);
      if (!surfaceId) return "createSurface 缺少 surfaceId";
      if (surface.catalogId !== CATALOG_ID) {
        return `catalogId 必须是 ${CATALOG_ID}`;
      }
      surfaceIds.add(surfaceId);
    }

    if (cmd.updateComponents && typeof cmd.updateComponents === "object") {
      const update = cmd.updateComponents as Record<string, unknown>;
      const surfaceId = asText(update.surfaceId);
      const components = update.components;
      if (!Array.isArray(components)) return "updateComponents.components 必须是数组";
      for (const component of components) {
        if (!component || typeof component !== "object") return "component 非法";
        const row = component as Record<string, unknown>;
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
      const name = asText((event as Record<string, unknown>).name);
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

function passthroughArguments(sidecar: Record<string, unknown>, fallbackObj: unknown): string {
  if (typeof sidecar.arguments === "string" && sidecar.arguments.trim()) {
    return sidecar.arguments.trim();
  }
  return JSON.stringify(fallbackObj);
}

function normalizeFunctionName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "readPage" || trimmed === BACKEND_PAGE_READ) return BACKEND_PAGE_READ;
  if (trimmed === BACKEND_RENDER) return BACKEND_RENDER;
  if (trimmed === "operatePage") return "operatePage";
  return trimmed;
}

function idle(reason: string, turnKind: string): Output {
  return {
    should_send: false,
    function_name: "",
    arguments: "",
    skip_reason: reason,
    sidecar_intact: true,
    turn_kind: turnKind,
  };
}

function send(functionName: string, args: string, intact: boolean, turnKind: string): Output {
  return {
    should_send: true,
    function_name: functionName,
    arguments: args,
    skip_reason: "",
    sidecar_intact: intact,
    turn_kind: turnKind,
  };
}

function sidecarIsEmpty(sidecar: Record<string, unknown>): boolean {
  return Object.keys(sidecar).length === 0;
}

/** 预览框只能发短句时用。不要用「点击」这种会撞上真实客服话。 */
const PHASE1_CARD_TRIGGERS = new Set(["出卡测试", "TEST_A2UI"]);
const PHASE1_READ_TRIGGERS = new Set(["读页测试", "TEST_PAGE_READ"]);
const PHASE1_CARD_ARGUMENTS =
  '{"commands":[{"version":"v0.9","createSurface":{"surfaceId":"form","catalogId":"ai-chatbot-builtin"}},{"version":"v0.9","updateComponents":{"surfaceId":"form","components":[{"id":"root","component":"Card","title":"筛选条件","children":["keywordInput","submitBtn"]},{"id":"keywordInput","component":"Input","placeholder":"请输入关键词","value":{"path":"/keyword"},"dataPath":"keyword"},{"id":"submitBtn","component":"Button","type":"primary","text":"读取当前页面","action":{"event":{"name":"readPage","context":{"reason":"用户点击读取"}}}}]}},{"version":"v0.9","updateDataModel":{"surfaceId":"form","path":"/keyword","value":""}},{"version":"v0.9","createSurface":{"surfaceId":"ops","catalogId":"ai-chatbot-builtin"}},{"version":"v0.9","updateComponents":{"surfaceId":"ops","components":[{"id":"root","component":"Card","title":"页面操作","children":["tip","clickBtn"]},{"id":"tip","component":"Text","text":"点击下方按钮执行页面操作"},{"id":"clickBtn","component":"Button","text":"点击第 0 个元素","action":{"event":{"name":"operatePage","context":{"method":"clickElement","args":[0],"requireConfirmation":true}}}}]}}]}';

async function main({ params }: Args): Promise<Output> {
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
  const chunks: string[] = [];
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    chunks.push(String(chunk));
  });
  process.stdin.on("end", () => {
    const raw = chunks.join("") || "{}";
    main({ params: JSON.parse(raw) })
      .then((result) => {
        process.stdout.write(JSON.stringify(result));
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      });
  });
}
