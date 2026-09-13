import { envText } from "./env.ts";

export interface LlmConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  timeoutMs: number;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type ChatMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      content: string;
    };

export interface ChatCompletionWithTools {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: "stop" | "tool_calls" | string;
}

export interface ToolCallHistoryEntry {
  round: number;
  toolName: string;
  arguments: Record<string, unknown>;
  result: string;
}

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<string> | string;

export class LlmError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

export function resolveLlmConfig(): LlmConfig {
  const apiKey = envText("LITELLM_API_KEY") || envText("OPENAI_API_KEY");
  if (!apiKey) {
    throw new LlmError(
      "缺少 LITELLM_API_KEY（或 OPENAI_API_KEY），无法调用真实 LLM。",
    );
  }
  const rawBase = (
    envText("LITELLM_BASE_URL") ||
    envText("OPENAI_BASE_URL") ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const baseURL = rawBase.endsWith("/v1") ? rawBase : `${rawBase}/v1`;
  const model =
    envText("LITELLM_MODEL") ||
    envText("OPENAI_MODEL") ||
    envText("OPENAI_MODEL_EP") ||
    "claude-sonnet-4-5";
  const timeoutMs = Number(envText("LITELLM_TIMEOUT_MS") || "45000") || 45_000;
  return { apiKey, baseURL, model, timeoutMs };
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export function sanitizeJsonish(text: string): string {
  return text
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

export function extractFirstJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const source = fenced?.[1] || text;
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

export async function callChat(
  config: LlmConfig,
  messages: ChatMessage[],
  options: {
    jsonMode?: boolean;
    maxTokens?: number;
    temperature?: number;
    onDelta?: (chunk: string) => void;
  } = {},
): Promise<string> {
  const url = `${config.baseURL}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1600,
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };
  if (options.onDelta) body.stream = true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (options.onDelta && response.ok && response.body) {
      const content = await readChatSse(response, options.onDelta);
      if (!content) throw new LlmError("LLM 返回空内容。");
      return content;
    }
    const raw = await response.text();
    if (!response.ok) {
      throw new LlmError(`LLM API error ${response.status}: ${raw.slice(0, 400)}`, response.status);
    }
    const data = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (!content) throw new LlmError("LLM 返回空内容。");
    return content;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmError(`LLM 调用超时（${config.timeoutMs}ms）。`);
    }
    throw new LlmError(err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

async function readChatSse(response: Response, onDelta: (chunk: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split(/\n/);
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        const piece = json.choices?.[0]?.delta?.content || "";
        if (piece) {
          full += piece;
          onDelta(piece);
        }
      } catch {
        /* ignore malformed sse chunk */
      }
    }
  }
  return full.trim();
}

async function postChatCompletion(
  config: LlmConfig,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${config.baseURL}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new LlmError(`LLM API error ${response.status}: ${raw.slice(0, 400)}`, response.status);
    }
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmError(`LLM 调用超时（${config.timeoutMs}ms）。`);
    }
    throw new LlmError(err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

function parseToolCallMessage(data: Record<string, unknown>): ChatCompletionWithTools {
  const choices = data.choices as
    | Array<{
        finish_reason?: string;
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>
    | undefined;
  const choice = choices?.[0];
  const message = choice?.message || {};
  const toolCalls: ToolCall[] = (message.tool_calls || [])
    .filter((tc) => tc.function?.name)
    .map((tc) => ({
      id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`,
      type: "function" as const,
      function: {
        name: String(tc.function?.name),
        arguments: String(tc.function?.arguments || "{}"),
      },
    }));
  const finishReason = String(choice?.finish_reason || (toolCalls.length ? "tool_calls" : "stop"));
  return {
    content: message.content ?? null,
    toolCalls,
    finishReason,
  };
}

/**
 * Multi-round OpenAI-compatible tool calling loop.
 * `executeTool` runs locally (handlers provided by caller).
 */
export async function callChatWithTools(
  config: LlmConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  executeTool: ToolExecutor,
  options: {
    maxTokens?: number;
    temperature?: number;
    maxToolRounds?: number;
  } = {},
): Promise<{
  finalContent: string;
  toolCallHistory: ToolCallHistoryEntry[];
  totalRounds: number;
}> {
  const maxToolRounds = options.maxToolRounds ?? 3;
  const conversation: ChatMessage[] = [...messages];
  const toolCallHistory: ToolCallHistoryEntry[] = [];
  let lastContent = "";
  let totalRounds = 0;

  for (let round = 1; round <= maxToolRounds; round++) {
    totalRounds = round;
    const body: Record<string, unknown> = {
      model: config.model,
      messages: conversation,
      tools,
      tool_choice: "auto",
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 1200,
    };

    let data: Record<string, unknown>;
    try {
      data = await postChatCompletion(config, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Model/gateway may reject tools → caller can degrade to v2
      if (/tool/i.test(msg) || /400/.test(msg) || /unsupported/i.test(msg)) {
        throw new LlmError(`TOOL_CALLING_UNSUPPORTED: ${msg}`, err instanceof LlmError ? err.status : undefined);
      }
      throw err;
    }

    const parsed = parseToolCallMessage(data);
    if (parsed.content) lastContent = parsed.content.trim();

    const wantsTools =
      parsed.finishReason === "tool_calls" ||
      (parsed.toolCalls.length > 0 && parsed.finishReason !== "stop");

    if (!wantsTools || parsed.toolCalls.length === 0) {
      if (!lastContent && parsed.content) lastContent = parsed.content.trim();
      // 有工具调用但最终非 JSON → 再要一轮严格 JSON
      if (toolCallHistory.length > 0 && lastContent && !/\{[\s\S]*"matchedScene"/.test(lastContent)) {
        try {
          const data2 = await postChatCompletion(config, {
            model: config.model,
            messages: [
              ...conversation,
              {
                role: "user",
                content:
                  "请基于以上工具结果，直接输出最终分类 JSON（不要再调用工具，不要 markdown）：{\"matchedScene\":\"...\",\"matchedSceneName\":\"...\",\"confidence\":\"high|medium|low\",\"reasoning\":\"...\",\"conclusionOneLiner\":\"不超过30字的结论\",\"extractedActions\":[],\"alternativeScenes\":[],\"ambiguous\":false}",
              },
            ],
            temperature: options.temperature ?? 0.1,
            max_tokens: options.maxTokens ?? 1200,
            response_format: { type: "json_object" },
          });
          const parsed2 = parseToolCallMessage(data2);
          if (parsed2.content?.trim()) lastContent = parsed2.content.trim();
          totalRounds += 1;
        } catch {
          // keep lastContent
        }
      }
      return { finalContent: lastContent, toolCallHistory, totalRounds };
    }

    conversation.push({
      role: "assistant",
      content: parsed.content,
      tool_calls: parsed.toolCalls,
    });

    for (const tc of parsed.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = { _raw: tc.function.arguments };
      }
      let result: string;
      try {
        result = await executeTool(tc.function.name, args);
      } catch (err) {
        result = JSON.stringify({
          error: true,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      toolCallHistory.push({
        round,
        toolName: tc.function.name,
        arguments: args,
        result,
      });
      conversation.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
  }

  // Exceeded max rounds — ask once more without tools for final JSON
  try {
    const data = await postChatCompletion(config, {
      model: config.model,
      messages: [
        ...conversation,
        {
          role: "user",
          content:
            "已达到工具调用轮次上限。请基于已有信息直接输出最终 JSON 分类结果（不要再调用工具）。",
        },
      ],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 1200,
      response_format: { type: "json_object" },
    });
    const parsed = parseToolCallMessage(data);
    if (parsed.content?.trim()) lastContent = parsed.content.trim();
    totalRounds += 1;
  } catch {
    // keep lastContent
  }

  return { finalContent: lastContent, toolCallHistory, totalRounds };
}
