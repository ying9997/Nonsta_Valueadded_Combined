/**
 * Query F_1 出口节点：从专家人话里拆出页面 sidecar，把人话洗干净交给 A1。
 * 贴进副本 Query cs_Default_Query_v4_staging_F_1。禁止 import / export。
 * 现网 Query（staging_D / staging_F）不要贴。
 *
 * 输入 params：
 *   reply_to_user         recaller D 的对客草稿（可能带 SIDECAR 标记）
 *   handoff_log_markdown  可选；标识若只出现在 handoff 里也能拆
 *
 * 输出：
 *   sidecar       给 Bot Client 的 JSON 字符串（没有则为 ""）
 *   reply_clean   去掉标识后的人话，给 A1 的 summary
 *   has_sidecar   是否拆到了合法 JSON
 */

interface Args {
  params: Record<string, unknown>;
}

interface Output {
  sidecar: string;
  reply_clean: string;
  has_sidecar: boolean;
}

const BEGIN = "<!--SIDECAR_BEGIN-->";
const END = "<!--SIDECAR_END-->";

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function findBlock(text: string): { jsonText: string; clean: string } | null {
  const start = text.indexOf(BEGIN);
  const stop = text.indexOf(END);
  if (start < 0 || stop < 0 || stop <= start) return null;
  const jsonText = text.slice(start + BEGIN.length, stop).trim();
  const clean = `${text.slice(0, start)}${text.slice(stop + END.length)}`.replace(/\n{3,}/g, "\n\n").trim();
  return { jsonText, clean };
}

function parseObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stringifyArgs(value: unknown, fallback: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") return JSON.stringify(value);
  return JSON.stringify(fallback);
}

function commandsFrom(obj: Record<string, unknown>): unknown[] | null {
  if (Array.isArray(obj.commands)) return obj.commands;
  const payload = obj.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const cmds = (payload as Record<string, unknown>).commands;
    if (Array.isArray(cmds)) return cmds;
  }
  const args = obj.arguments;
  if (args && typeof args === "object" && !Array.isArray(args)) {
    const cmds = (args as Record<string, unknown>).commands;
    if (Array.isArray(cmds)) return cmds;
  }
  if (typeof args === "string") {
    const parsed = parseObject(args);
    if (parsed && Array.isArray(parsed.commands)) return parsed.commands;
  }
  return null;
}

function toPluginEnvelope(obj: Record<string, unknown>): Record<string, unknown> {
  const fn = String(obj.function_name ?? "").trim();
  const type = String(obj.type ?? "").trim();
  const kind = fn || type;

  if (kind === "pageRead" || kind === "readPage") {
    return {
      function_name: "pageRead",
      arguments: stringifyArgs(obj.arguments ?? obj.payload, { reason: "need_page_facts" }),
    };
  }

  if (kind === "renderA2UI") {
    if (typeof obj.arguments === "string" && obj.arguments.trim()) {
      return { function_name: "renderA2UI", arguments: obj.arguments.trim() };
    }
    const commands = commandsFrom(obj);
    if (Array.isArray(commands)) {
      return { function_name: "renderA2UI", arguments: JSON.stringify({ commands }) };
    }
  }

  return obj;
}

function pickBlock(
  reply: string,
  handoff: string,
): { jsonText: string; replyClean: string } | null {
  const fromReply = findBlock(reply);
  if (fromReply) {
    return { jsonText: fromReply.jsonText, replyClean: fromReply.clean };
  }
  const fromHandoff = findBlock(handoff);
  if (fromHandoff) {
    return { jsonText: fromHandoff.jsonText, replyClean: reply.trim() };
  }
  return null;
}

async function main({ params }: Args): Promise<Output> {
  const reply = asText(params.reply_to_user ?? params.replyToUser ?? "");
  const handoff = asText(params.handoff_log_markdown ?? params.handoffLogMarkdown ?? "");
  const block = pickBlock(reply, handoff);
  if (!block) {
    return { sidecar: "", reply_clean: reply.trim(), has_sidecar: false };
  }
  const parsed = parseObject(block.jsonText);
  if (!parsed) {
    return { sidecar: "", reply_clean: block.replyClean, has_sidecar: false };
  }
  return {
    sidecar: JSON.stringify(toPluginEnvelope(parsed)),
    reply_clean: block.replyClean,
    has_sidecar: true,
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
