/**
 * 声明节点：llm-analyze（类型 llm，非可执行代码节点）
 *
 * 与 workflow.json 中 id 为 llm-analyze 的节点一致：
 * - inputs: query, trackingIds, country, lastMileProductName, carrierCode, region, customerIntent, enrichedContext, inputContext, kbMd
 * - outputs: analysisResult
 *
 * Prompt: ../prompts/main.md
 * Runner：scripts/run-expert.ts / scripts/llm-openai.ts 注入占位符（含 {{kbMd}} 等）。
 */
