/**
 * 解析 VAS 指引 LLM 的 JSON，抽出客户可见回复。
 * V1 不调工具。贴扣子用同目录 vas-output-format.coze.js。
 */

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
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

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  let text = asText(value);
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function fallback(): {
  customer_reply: string;
  should_send_tool: boolean;
  function_name: string;
  arguments: string;
} {
  return {
    customer_reply: "抱歉，我暂时无法处理您的请求，请联系人工客服。",
    should_send_tool: false,
    function_name: "",
    arguments: "",
  };
}

export async function main(args: unknown): Promise<{
  customer_reply: string;
  should_send_tool: boolean;
  function_name: string;
  arguments: string;
}> {
  const params = unwrapParams(args);
  const llmOutput = parseJson(params.llm_output ?? params.LLM_OUTPUT ?? params.output ?? "");
  const customerMessage = asText(llmOutput?.customer_message);

  if (!llmOutput || !customerMessage) {
    return fallback();
  }

  let reply = customerMessage;
  const phase = asText(llmOutput.phase);
  const description = asText(llmOutput.requirement_description);
  const background = asText(llmOutput.requirement_background);
  if (phase === "generate" && description) {
    reply += "\n\n---\n";
    reply += "【需求描述】（请复制到表单「需求描述」字段）\n" + description;
    if (background) {
      reply += "\n\n【需求背景说明】（请复制到表单「需求背景说明」字段）\n" + background;
    }
    reply += "\n---\n\n如需修改请直接告诉我，确认无误后请复制到表单提交。";
  }

  return {
    customer_reply: reply,
    should_send_tool: false,
    function_name: "",
    arguments: "",
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
