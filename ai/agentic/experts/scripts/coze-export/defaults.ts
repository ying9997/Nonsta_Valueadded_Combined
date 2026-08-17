/**
 * LLM 节点 llmParam 默认值（Coze 示例 llm-pro-reasoning-off：thinking 关闭 + reasoning_effort minimal；systemPrompt 由 prompts/main.md 覆盖）
 * 模型由命名预设选择；缺省 doubao。
 */

export interface LlmParamEntry {
  name: string;
  input: Record<string, unknown>;
}

export type LlmModelPreset = "doubao" | "deepseek";

interface LlmModelPresetSpec {
  modelName: string;
  modelType: string;
  temperature: string;
  /** provider-specific `parameters` block under llmParam */
  parametersProperties: Record<string, { type: string; value: string }>;
}

export const LLM_MODEL_PRESETS: Record<LlmModelPreset, LlmModelPresetSpec> = {
  doubao: {
    modelName: "豆包·2.0·pro",
    modelType: "1772700462",
    temperature: "0.5",
    parametersProperties: {
      max_completion_tokens: { type: "integer", value: "0" },
      reasoning_effort: { type: "string", value: "minimal" },
    },
  },
  deepseek: {
    modelName: "deepseek-v4-pro-260425",
    modelType: "961437672",
    temperature: "0.8",
    parametersProperties: {
      reasoning_effort: { type: "string", value: "minimal" },
    },
  },
};

const DEFAULT_PRESET: LlmModelPreset = "doubao";

export function resolveLlmModelPreset(preset?: string): LlmModelPreset {
  const key = (preset?.trim() || DEFAULT_PRESET) as LlmModelPreset;
  if (!(key in LLM_MODEL_PRESETS)) {
    const allowed = Object.keys(LLM_MODEL_PRESETS).join(", ");
    throw new Error(`Unknown llmNode.model preset "${preset}". Allowed: ${allowed}`);
  }
  return key;
}

export function defaultLlmParamList(preset?: string, opts?: { maxTokens?: number }): LlmParamEntry[] {
  const resolved = resolveLlmModelPreset(preset);
  const spec = LLM_MODEL_PRESETS[resolved];
  const maxTokens = Number.isFinite(opts?.maxTokens) && Number(opts?.maxTokens) > 0
    ? String(Math.floor(Number(opts?.maxTokens)))
    : "4096";

  return [
    { name: "apiMode", input: { type: "integer", value: "0" } },
    { name: "temperature", input: { type: "float", value: spec.temperature } },
    { name: "topP", input: { type: "float", value: "1" } },
    { name: "frequencyPenalty", input: { type: "float", value: "0" } },
    { name: "maxTokens", input: { type: "integer", value: maxTokens } },
    { name: "spCurrentTime", input: { type: "boolean", value: false } },
    { name: "spAntiLeak", input: { type: "boolean", value: false } },
    { name: "thinkingType", input: { type: "string", value: "disabled" } },
    { name: "responseFormat", input: { type: "integer", value: "2" } },
    { name: "modelName", input: { type: "string", value: spec.modelName } },
    { name: "modelType", input: { type: "integer", value: spec.modelType } },
    { name: "generationDiversity", input: { type: "string", value: "balance" } },
    {
      name: "parameters",
      input: {
        type: "object",
        properties: spec.parametersProperties,
        value: null,
      },
    },
    { name: "prompt", input: { type: "string", value: "" } },
    { name: "enableChatHistory", input: { type: "boolean", value: false } },
    { name: "chatHistoryRound", input: { type: "integer", value: "3" } },
    { name: "systemPrompt", input: { type: "string", value: "" } },
    { name: "stableSystemPrompt", input: { type: "string", value: "" } },
    { name: "canContinue", input: { type: "boolean", value: false } },
    { name: "loopPromptVersion", input: { type: "string", value: "" } },
    { name: "loopPromptName", input: { type: "string", value: "" } },
    { name: "loopPromptId", input: { type: "string", value: "" } },
  ];
}

export function mergeSystemPromptIntoLlmParams(
  params: LlmParamEntry[],
  systemPrompt: string
): LlmParamEntry[] {
  return params.map((p) =>
    p.name === "systemPrompt"
      ? { ...p, input: { ...p.input, value: systemPrompt } }
      : p
  );
}
