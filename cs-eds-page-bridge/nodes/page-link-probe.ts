/**
 * Query 前选择器：强制唤起代发「我的异常单{EB}应该提交哪个增值产品」→ pageRead；
 * 读页 JSON 回来 → 清单卡（先不点页）；其它问句进 Query / expert。
 * 贴扣子用同目录 page-link-probe.coze.js。
 * 「链路测试」只留给画布试跑。
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

function isPageReadAsk(text: string): boolean {
  const raw = asText(text);
  if (LINK_TRIGGERS.has(raw) || LINK_TRIGGERS.has(compactChat(raw))) return true;
  return isForcedExceptionAsk(raw);
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

function send(functionName: string, args: string, turnKind: string): Output {
  return {
    should_send: true,
    function_name: functionName,
    arguments: args,
    skip_reason: "",
    sidecar_intact: true,
    turn_kind: turnKind,
  };
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

async function main(args: Args | Record<string, unknown>): Promise<Output> {
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
