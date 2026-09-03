import { envText } from "./env.ts";

export interface LlmConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  timeoutMs: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

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
  options: { jsonMode?: boolean; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const url = `${config.baseURL}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1600,
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };

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
