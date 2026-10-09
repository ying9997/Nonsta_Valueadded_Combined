import { envText } from "./env.ts";

/** SOP/对话 LLM 失败原因码（对人短文案 + 日志；与业务「场景不清」分开）。 */
export type LlmFailureReason =
  | "llm_auth_or_model_denied"
  | "llm_rate_limit"
  | "llm_upstream_5xx"
  | "llm_timeout"
  | "llm_empty"
  | "llm_bad_output"
  | "llm_other";

export interface LlmConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  /** 主模型失败且可降级时，按顺序尝试（来自 LITELLM_MODEL_FALLBACKS）。 */
  fallbackModels: string[];
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
  /** HTTP status from LiteLLM/OpenAI-compatible API, e.g. 400 / 401 / 502. Undefined = 还没拿到 HTTP 码（超时、断网）. */
  readonly status?: number;
  readonly reason: LlmFailureReason;
  /** 出错时正在用的模型名（主模型或某个 fallback）。 */
  readonly model?: string;
  constructor(
    message: string,
    status?: number,
    reason?: LlmFailureReason,
    model?: string,
  ) {
    super(message);
    this.name = "LlmError";
    this.status = status;
    this.reason = reason ?? classifyLlmFailure(message, status);
    this.model = model;
  }
}

/** 从 API 错误正文 / 状态码归类（供降级决策与对人短文案）。 */
export function classifyLlmFailure(message: string, status?: number): LlmFailureReason {
  const msg = message || "";
  const low = msg.toLowerCase();
  if (
    /调用超时|timeout|aborterror|timed out|econnreset|enotfound|fetch failed/i.test(msg) ||
    /timeout/i.test(low)
  ) {
    return "llm_timeout";
  }
  if (status === 429 || /rate.?limit|too many requests|quota/i.test(low)) {
    return "llm_rate_limit";
  }
  if (status != null && status >= 500) return "llm_upstream_5xx";
  if (/^LLM 返回空内容/.test(msg)) return "llm_empty";
  if (
    status === 401 ||
    status === 403 ||
    /not allowed|access to .+ models is not allowed|invalid_api_key|incorrect api key|unauthorized|forbidden|permission.?denied|model_not_found|does not exist|do not have access|model group/i.test(
      low,
    ) ||
    (status === 400 &&
      /anthropicexception|invalid_request_error|access to anthropic|received model group/i.test(low))
  ) {
    return "llm_auth_or_model_denied";
  }
  if (status != null && status >= 400 && status < 500) {
    if (/model|anthropic|allowed|not found|permission/i.test(low)) {
      return "llm_auth_or_model_denied";
    }
    return "llm_other";
  }
  return "llm_other";
}

/** 这些原因码：同模型重试耗尽后，可换 LITELLM_MODEL_FALLBACKS 里的下一个模型。 */
export function shouldTryNextModel(reason: LlmFailureReason): boolean {
  return (
    reason === "llm_auth_or_model_denied" ||
    reason === "llm_upstream_5xx" ||
    reason === "llm_timeout" ||
    reason === "llm_rate_limit"
  );
}

const REASON_LABEL: Record<LlmFailureReason, string> = {
  llm_auth_or_model_denied: "模型通道不可用（权限/模型组）",
  llm_rate_limit: "模型限流",
  llm_upstream_5xx: "模型服务暂时异常",
  llm_timeout: "模型调用超时",
  llm_empty: "模型返回空内容",
  llm_bad_output: "模型输出无法解析",
  llm_other: "模型调用失败",
};

/** 飞书卡/对外短文案：不塞整段 LiteLLM JSON。 */
export function formatLlmErrorForUser(err: LlmError | { reason: LlmFailureReason; message?: string }): string {
  const reason = err.reason;
  const label = REASON_LABEL[reason] || REASON_LABEL.llm_other;
  return `AI 写 SOP 失败（${label}），请人工撰写。原因码：${reason}`;
}

/**
 * 要不要对这次 LLM 失败再打一次（同一模型）。
 *
 * - 4xx：同模型不重试（权限/模型名错了再打也没用）；换模型由 shouldTryNextModel 决定。
 * - 5xx / 无 status（超时等）：同模型最多再试 1 次。
 * - 429：同模型再试 1 次（短退避）。
 */
function shouldRetryLlm(err: LlmError, alreadyRetried: boolean): boolean {
  if (alreadyRetried) return false;
  if (err.reason === "llm_empty") return false;
  if (err.reason === "llm_rate_limit") return true;
  if (err.status != null && err.status >= 400 && err.status < 500) return false;
  if (err.status != null && err.status >= 500) return true;
  return err.status == null;
}

/** 解析 `a,b,c`；去掉空项与与主模型重复的项。 */
export function parseFallbackModels(raw: string, primary: string): string[] {
  const seen = new Set<string>([primary.trim()].filter(Boolean));
  const out: string[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const m = part.trim();
    if (!m || seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

export function resolveModelChain(config: LlmConfig): string[] {
  return [config.model, ...(config.fallbackModels || [])].filter(Boolean);
}

export function resolveLlmConfig(): LlmConfig {
  const apiKey = envText("LITELLM_API_KEY") || envText("OPENAI_API_KEY");
  if (!apiKey) {
    throw new LlmError(
      "缺少 LITELLM_API_KEY（或 OPENAI_API_KEY），无法调用真实 LLM。",
      undefined,
      "llm_other",
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
  const fallbackModels = parseFallbackModels(
    envText("LITELLM_MODEL_FALLBACKS") || "claude-sonnet-4-6,claude-haiku-4-5",
    model,
  );
  const timeoutMs = Number(envText("LITELLM_TIMEOUT_MS") || "45000") || 45_000;
  return { apiKey, baseURL, model, fallbackModels, timeoutMs };
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export function stripJsonTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, "$1");
}

/**
 * Last-resort cleanup when JSON.parse of the original text already failed.
 * Do not run this *before* the first parse: converting “ ” to " inside string
 * values (e.g. scene name 【入库】“包裹条码批量异常…”) turns valid JSON into a syntax error.
 */
export function sanitizeJsonish(text: string): string {
  return stripJsonTrailingCommas(
    text.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'"),
  );
}

/**
 * LLM often copies 场景名 【入库】“…” into JSON as unescaped ASCII quotes:
 *   "scenarioName": "【入库】"包裹条码批量异常（需客户处理）"辨识后…"
 * That is invalid JSON (V8: line 6 column 25). Turn those inner quotes into
 * curly quotes so the outer JSON string stays intact.
 */
export function neutralizeQuotedSceneNames(text: string): string {
  return text.replace(/【([^】\n]{1,12})】"([^"\n]{1,80})"/g, "【$1】“$2”");
}

/** Parse LLM JSON: original text first, then trailing-comma / curly-delimiter fallbacks. */
export function parseJsonishObject(text: string): unknown {
  const extracted = (extractFirstJsonObject(text) || text).trim();
  const attempts = [
    extracted,
    stripJsonTrailingCommas(extracted),
    neutralizeQuotedSceneNames(extracted),
    stripJsonTrailingCommas(neutralizeQuotedSceneNames(extracted)),
    sanitizeJsonish(extracted),
    sanitizeJsonish(neutralizeQuotedSceneNames(extracted)),
  ];
  let lastErr: unknown;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
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

async function callChatOnce(
  config: LlmConfig,
  model: string,
  messages: ChatMessage[],
  options: {
    jsonMode?: boolean;
    maxTokens?: number;
    temperature?: number;
    onDelta?: (chunk: string) => void;
    _isRetry?: boolean;
  },
): Promise<string> {
  const url = `${config.baseURL}/chat/completions`;
  const body: Record<string, unknown> = {
    model,
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
      if (!content) throw new LlmError("LLM 返回空内容。", undefined, "llm_empty", model);
      return content;
    }
    const raw = await response.text();
    if (!response.ok) {
      throw new LlmError(
        `LLM API error ${response.status}: ${raw.slice(0, 400)}`,
        response.status,
        undefined,
        model,
      );
    }
    const data = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (!content) throw new LlmError("LLM 返回空内容。", undefined, "llm_empty", model);
    return content;
  } catch (err) {
    const llmErr =
      err instanceof LlmError
        ? err
        : err instanceof Error && err.name === "AbortError"
          ? new LlmError(
              `LLM 调用超时（${config.timeoutMs}ms）。`,
              undefined,
              "llm_timeout",
              model,
            )
          : new LlmError(
              err instanceof Error ? err.message : String(err),
              undefined,
              undefined,
              model,
            );
    const retryable = shouldRetryLlm(llmErr, Boolean(options._isRetry));
    if (retryable) {
      console.warn(
        `LLM model=${model} reason=${llmErr.reason} status=${llmErr.status ?? "error"}, retrying in 2s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return callChatOnce(config, model, messages, { ...options, _isRetry: true });
    }
    throw llmErr;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 主模型 →（可降级原因）fallback 列表。同模型最多重试 1 次；换模型每个再试一轮。
 */
export async function callChat(
  config: LlmConfig,
  messages: ChatMessage[],
  options: {
    jsonMode?: boolean;
    maxTokens?: number;
    temperature?: number;
    onDelta?: (chunk: string) => void;
    _isRetry?: boolean;
  } = {},
): Promise<string> {
  const chain = resolveModelChain(config);
  let lastErr: LlmError | undefined;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const content = await callChatOnce(config, model, messages, {
        ...options,
        _isRetry: false,
      });
      if (i > 0) {
        console.warn(
          `llm_fallback used=${model} from=${chain[0]} reason=${lastErr?.reason || "unknown"}`,
        );
      }
      return content;
    } catch (err) {
      lastErr =
        err instanceof LlmError
          ? err
          : new LlmError(err instanceof Error ? err.message : String(err), undefined, undefined, model);
      const hasNext = i < chain.length - 1;
      if (hasNext && shouldTryNextModel(lastErr.reason)) {
        console.warn(
          `LLM model=${model} failed reason=${lastErr.reason}; trying fallback ${chain[i + 1]}`,
        );
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new LlmError("LLM 调用失败。", undefined, "llm_other");
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

async function postChatCompletionOnce(
  config: LlmConfig,
  model: string,
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
      body: JSON.stringify({ ...body, model }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new LlmError(
        `LLM API error ${response.status}: ${raw.slice(0, 400)}`,
        response.status,
        undefined,
        model,
      );
    }
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmError(
        `LLM 调用超时（${config.timeoutMs}ms）。`,
        undefined,
        "llm_timeout",
        model,
      );
    }
    throw new LlmError(
      err instanceof Error ? err.message : String(err),
      undefined,
      undefined,
      model,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function postChatCompletion(
  config: LlmConfig,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const chain = resolveModelChain(config);
  let lastErr: LlmError | undefined;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const data = await postChatCompletionOnce(config, model, body);
      if (i > 0) {
        console.warn(
          `llm_fallback used=${model} from=${chain[0]} reason=${lastErr?.reason || "unknown"}`,
        );
      }
      return data;
    } catch (err) {
      lastErr =
        err instanceof LlmError
          ? err
          : new LlmError(err instanceof Error ? err.message : String(err), undefined, undefined, model);
      const hasNext = i < chain.length - 1;
      if (hasNext && shouldTryNextModel(lastErr.reason)) {
        console.warn(
          `LLM model=${model} failed reason=${lastErr.reason}; trying fallback ${chain[i + 1]}`,
        );
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new LlmError("LLM 调用失败。", undefined, "llm_other");
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
                  "请基于以上工具结果，直接输出最终分类 JSON（不要再调用工具，不要 markdown）：{\"matchedScene\":\"...\",\"topicSummary\":\"用一句话概括客户核心需求（不超过60字）\",\"matchedSceneName\":\"...\",\"confidence\":\"high|medium|low\",\"reasoning\":\"...\",\"conclusionOneLiner\":\"不超过30字的结论\",\"extractedActions\":[],\"alternativeScenes\":[],\"ambiguous\":false}",
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
