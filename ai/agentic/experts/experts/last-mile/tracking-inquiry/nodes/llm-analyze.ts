/**
 * LLM 节点声明：`llm-analyze`（非可执行代码节点）
 * ---
 * 与 `workflow.json` 中 `type: "llm"`、`id: "llm-analyze"` 一致。
 *
 * **Prompt**：`prompts/main.md`（占位符含 `{{tailTraceFacts}}`、`{{kbMd}}` 等，见 `scripts/llm-openai.ts`）。
 *
 * 【输入】
 * | 字段 | 说明 |
 * |------|------|
 * | query / customerIntent | 委托与意图 |
 * | trackingIds / outboundOrderNos / inquiryIds | 归一化后的查询键 |
 * | enrichedContext | 可选；上游 delivery-status 等 |
 * | inputContext | 可选；含 previousOutput |
 * | tailTraceFacts | **fetch-tail-trace-list** 产出的确定性事实（JSON） |
 *
 * 【输出】analysisResult：`{ structured, analysis }`
 */

export {};
