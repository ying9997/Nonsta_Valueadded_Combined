/**
 * LLM 节点声明：`llm-analyze`（非可执行代码节点）
 * ---
 * 与 `workflow.json` 中 `type: "llm"`、`id: "llm-analyze"` 一致；推理由 Coze LLM 或 `scripts/runLlmNode` 执行。
 * **请勿**将本文件配置为 `workflow.json` 的代码节点 `file`；无 `main` / `process.argv` 入口。
 *
 * **Prompt**：`prompts/main.md`。
 *
 * 【输入】`params`（与 `workflow.json` 本节点 `inputs` 一致）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | query | string | 上游委托任务；`{{query}}` |
 * | enrichedContext | string \| object | `merge-enriched-context` 产出的 JSON；占位符 `{{enrichedContext}}` |
 * | customerIntent | string | `{{customerIntent}}` |
 * | inputContext | object（可选） | `{{inputContext.previousOutput}}` 等 |
 *
 * 【输出】
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | { structured: object; analysis: string } | 轨迹解读 JSON；`structured` 含 `orderIds`、`trackingIds`、`documentRefs`、**`carriers`** 等，供 `format-output.ts` 与 API `carrierHints` 合并；**`scanFacts` 由 format 自 `enrichedContext.computedScanFacts` 写入，模型无需输出** |
 */

export {};
