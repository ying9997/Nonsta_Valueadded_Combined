/**
 * LLM 节点声明：`llm-comment`（非可执行代码节点）
 * ---
 * 本文件**仅作契约说明**：与 `workflow.json` 中 `id: "llm-comment"`、`type: "llm"` 的节点一致。
 * 实际调用由 Coze 的 LLM 节点或本地 `scripts/run-expert.ts` → `runLlmNode` 完成。
 *
 * **请勿**在本专家的 `workflow.json` 里把本文件写成 `"file": "nodes/llm-comment.ts"` 类型的代码节点；也不要为本文添加 `process.argv` 入口。
 *
 * **Prompt**：`prompts/main.md`（相对本专家目录）。
 *
 * 【输入】`runLlmNode(expertDir, params)` 中 `params` 须含 `workflow` 本节点 `inputs` 白名单中的键（Runner 从上下文按名注入）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | query | string | 上游委托任务 |
 * | customerIntent | string | 客户诉求摘要 |
 * | expression | string | 原始算式（可含 `SKU_QTY(wh=,sku=)` 或 `SKU_QTY`；成功后 `expressionNormalized` 为替换后的纯数字算式） |
 * | result | { structured?: object; analysis?: string } | 前置 `evaluate-expression` 的完整 `result`；`structured` 可含 `skuUsableQtyUsed`、`skuResolutions` |
 * | inputContext | object（可选） | `sourceExpertId?`、`previousOutput?`、`chainId?`；`previousOutput` → `{{inputContext.previousOutput}}` |
 * | examplesMd | string（可选） | Few-shot 全文；对应 `prompts/main.md` 中 **`{{examplesMd}}`**。本地 `run-expert` 未注入时由 `runLlmNode` 读取 `prompts/examples.md`；Coze 导出由 **`load-examples-text`** 输出并绑定（启用 `branching` 时与 `textNodes` 互斥，见 `coze.config.yml`） |
 *
 * 【输出】与 `workflow.json` 本节点 `outputs` 一致：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | { structured: object; analysis: string } | `parseLlmJson` 解析模型 JSON；`structured` 建议含点评字段（见 `prompts/main.md`） |
 *
 * 其它占位符由 `scripts/llm-openai.ts` 统一替换（如 `{{expression}}`、`{{query}}`、`{{customerIntent}}`、`{{examplesMd}}`）。
 */

export {};
