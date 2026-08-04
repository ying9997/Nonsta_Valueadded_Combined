/**
 * 声明节点：llm-analyze（类型 llm，非可执行代码节点）
 *
 * 与 workflow.json 中 id 为 llm-analyze 的节点一致：
 * - inputs: query, trackingIds, outboundOrderNos, customerIntent, enrichedContext, claimChannelKnown, inputContext
 * - outputs: analysisResult
 *
 * Prompt: ../prompts/main.md（分支附录已内嵌；expert.md 仅供本地文档）
 * 本地 Runner：scripts/run-expert.ts 通过 scripts/llm-openai.ts 调用 OpenAI，并注入上述占位符（含 {{claimChannelKnown}}）。
 */
