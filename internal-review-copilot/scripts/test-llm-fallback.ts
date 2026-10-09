/**
 * 本机单测：LLM 原因码分类 + 模型降级链（不打真实网关）。
 *
 *   npx tsx internal-review-copilot/scripts/test-llm-fallback.ts
 */
import {
  callChat,
  classifyLlmFailure,
  formatLlmErrorForUser,
  LlmError,
  parseFallbackModels,
  resolveModelChain,
  shouldTryNextModel,
  type LlmConfig,
} from "../lib/llm-client.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

// --- classify ---
assert(
  classifyLlmFailure(
    'LLM API error 400: {"error":{"message":"litellm.BadRequestError: AnthropicException - Access to Anthropic models is not allowed for this account. Received Model Group=claude-sonnet-4-5"}}',
    400,
  ) === "llm_auth_or_model_denied",
  "anthropic not allowed → auth_or_model_denied",
);
assert(classifyLlmFailure("LLM API error 401: invalid_api_key", 401) === "llm_auth_or_model_denied", "401");
assert(classifyLlmFailure("LLM API error 429: rate limit", 429) === "llm_rate_limit", "429");
assert(classifyLlmFailure("LLM API error 502: bad gateway", 502) === "llm_upstream_5xx", "502");
assert(classifyLlmFailure("LLM 调用超时（45000ms）。") === "llm_timeout", "timeout msg");
assert(classifyLlmFailure("LLM 返回空内容。") === "llm_empty", "empty");
assert(classifyLlmFailure("random boom") === "llm_other", "other");

assert(shouldTryNextModel("llm_auth_or_model_denied"), "fallback on auth");
assert(shouldTryNextModel("llm_timeout"), "fallback on timeout");
assert(shouldTryNextModel("llm_upstream_5xx"), "fallback on 5xx");
assert(shouldTryNextModel("llm_rate_limit"), "fallback on 429");
assert(!shouldTryNextModel("llm_empty"), "no fallback on empty");
assert(!shouldTryNextModel("llm_other"), "no fallback on generic 4xx other");

const fb = parseFallbackModels("claude-sonnet-4-6, claude-haiku-4-5,claude-sonnet-4-5", "claude-sonnet-4-5");
assert(fb.join(",") === "claude-sonnet-4-6,claude-haiku-4-5", `fallback parse got ${fb.join(",")}`);

const chain = resolveModelChain({
  apiKey: "x",
  baseURL: "https://example.com/v1",
  model: "claude-sonnet-4-5",
  fallbackModels: ["claude-sonnet-4-6", "claude-haiku-4-5"],
  timeoutMs: 5000,
});
assert(chain.join(",") === "claude-sonnet-4-5,claude-sonnet-4-6,claude-haiku-4-5", "model chain");

const human = formatLlmErrorForUser(
  new LlmError("LLM API error 400: Access to Anthropic...", 400, "llm_auth_or_model_denied", "claude-sonnet-4-5"),
);
assert(human.includes("原因码：llm_auth_or_model_denied"), "human reason code");
assert(!human.includes("AnthropicException"), "human no raw dump");
assert(human.includes("模型通道不可用"), "human label");

// --- callChat fallback with mocked fetch ---
const originalFetch = globalThis.fetch;
let fetchCalls: Array<{ model: string }> = [];

function mockFetchSequence(
  responses: Array<{ status: number; body: string } | { okContent: string }>,
): void {
  let i = 0;
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || "{}")) as { model?: string };
    fetchCalls.push({ model: String(body.model || "") });
    const step = responses[i++] || { status: 500, body: "exhausted" };
    if ("okContent" in step) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: step.okContent } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(step.body, {
      status: step.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

const cfg: LlmConfig = {
  apiKey: "test-key",
  baseURL: "https://example.com/v1",
  model: "claude-sonnet-4-5",
  fallbackModels: ["claude-sonnet-4-6", "claude-haiku-4-5"],
  timeoutMs: 8000,
};

async function runFallbackCases(): Promise<void> {
  fetchCalls = [];
  mockFetchSequence([
    {
      status: 400,
      body: JSON.stringify({
        error: {
          message:
            "litellm.BadRequestError: AnthropicException - Access to Anthropic models is not allowed",
        },
      }),
    },
    { okContent: "FALLBACK_OK" },
  ]);
  const text = await callChat(cfg, [{ role: "user", content: "hi" }]);
  assert(text === "FALLBACK_OK", `expected FALLBACK_OK got ${text}`);
  assert(fetchCalls.length === 2, `expected 2 fetches got ${fetchCalls.length}`);
  assert(fetchCalls[0].model === "claude-sonnet-4-5", "first primary");
  assert(fetchCalls[1].model === "claude-sonnet-4-6", "second fallback");

  fetchCalls = [];
  mockFetchSequence([
    { status: 400, body: '{"error":{"message":"bad request unrelated"}}' },
  ]);
  let threw = false;
  try {
    await callChat(cfg, [{ role: "user", content: "hi" }]);
  } catch (err) {
    threw = true;
    assert(err instanceof LlmError, "throws LlmError");
    assert((err as LlmError).reason === "llm_other", `reason ${(err as LlmError).reason}`);
  }
  assert(threw, "generic 400 should not walk fallbacks");
  assert(fetchCalls.length === 1, "only primary attempted");

  fetchCalls = [];
  mockFetchSequence([
    {
      status: 400,
      body: JSON.stringify({
        error: { message: "Access to Anthropic models is not allowed" },
      }),
    },
    {
      status: 400,
      body: JSON.stringify({
        error: { message: "Access to Anthropic models is not allowed" },
      }),
    },
    { okContent: "HAIKU_OK" },
  ]);
  const text2 = await callChat(cfg, [{ role: "user", content: "hi" }]);
  assert(text2 === "HAIKU_OK", "third model wins");
  assert(
    fetchCalls.map((c) => c.model).join(",") ===
      "claude-sonnet-4-5,claude-sonnet-4-6,claude-haiku-4-5",
    "full chain",
  );
}

await runFallbackCases();
globalThis.fetch = originalFetch;

console.log("test-llm-fallback: ok");
