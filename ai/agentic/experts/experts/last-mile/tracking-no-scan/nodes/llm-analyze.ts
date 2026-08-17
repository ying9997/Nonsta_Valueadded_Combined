/**
 * 声明节点：llm-analyze（类型 llm，非可执行代码节点）
 *
 * 与 workflow.json 中 id 为 llm-analyze 的节点一致：
 * - inputs: query, trackingIds, outboundOrderNos, customerIntent, enrichedContext, inputContext
 * - outputs: analysisResult
 *
 * Prompt: ../prompts/main.md（`{{kbMd}}` 由 llm-openai 注入；enrichedContext 来自前置 fetch-and-enrich，含 **analysisClock**）
 * 本地 Runner：scripts/run-expert.ts → validate → fetch-and-enrich → 本节点 → format-output
 */
