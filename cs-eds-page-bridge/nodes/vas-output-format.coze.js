/** 扣子粘贴用（JavaScript）。解析 VAS 指引 LLM 的 JSON，抽出客户可见回复。V1 不调工具。 */

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
  if (typeof value === "object" && !Array.isArray(value)) return value;
  var text = asText(value);
  if (!text) return null;
  var fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced && fenced[1]) text = fenced[1].trim();
  var start = text.indexOf("{");
  var end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    var parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return null;
  } catch (e) {
    return null;
  }
}

async function main(args) {
  var params = unwrapParams(args);
  var llmOutput = parseJson(params.llm_output || params.LLM_OUTPUT || params.output || "");
  var customerMessage = asText(llmOutput && llmOutput.customer_message);

  if (!llmOutput || !customerMessage) {
    return {
      customer_reply: "抱歉，我暂时无法处理您的请求，请联系人工客服。",
      should_send_tool: false,
      function_name: "",
      arguments: "",
    };
  }

  var reply = customerMessage;
  if (asText(llmOutput.phase) === "generate" && asText(llmOutput.requirement_description)) {
    reply += "\n\n---\n";
    reply += "【需求描述】（请复制到表单「需求描述」字段）\n" + asText(llmOutput.requirement_description);
    if (asText(llmOutput.requirement_background)) {
      reply += "\n\n【需求背景说明】（请复制到表单「需求背景说明」字段）\n" + asText(llmOutput.requirement_background);
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
