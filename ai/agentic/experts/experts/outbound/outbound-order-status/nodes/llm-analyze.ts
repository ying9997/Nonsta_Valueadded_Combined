/**
 * LLM 节点声明：`llm-analyze`（非可执行代码节点）
 * ---
 * 与 `workflow.json` 中 `type: "llm"`、`id: "llm-analyze"` 一致；推理由 Coze LLM 或 `scripts/runLlmNode` 执行。
 * **请勿**将本文件配置为 `workflow.json` 的代码节点 `file`；无 `main` / `process.argv` 入口。
 *
 * **Prompt**：`prompts/main.md`（占位符与 `workflow.json` 入参一致，含 `{{outboundTimingFacts}}`、`{{packageMeasurementFacts}}`、`{{timingRequiresNarrowing}}`；可选 `{{enrichedContext}}`）。
 *
 * 【输入】`params`（与 `workflow.json` 本节点 `inputs` 一致）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | query | string | `{{query}}` |
 * | outboundOrderNos | string[] | `{{outboundOrderNos}}`（JSON） |
 * | prunedOrderData | object | 剪枝后的出库单 JSON → `{{prunedOrderData}}`；本地亦可通过 `buildEnrichedContext` 合并进 `{{enrichedContext}}` |
 * | outboundTimingFacts | object[] | getPackageDetail 确定性时效事实 → `{{outboundTimingFacts}}` |
 * | packageMeasurementFacts | object[] | getPackageDetail 确定性实际尺寸重量事实 → `{{packageMeasurementFacts}}` |
 * | timingRequiresNarrowing | boolean | 子单超过批处理上限 → `{{timingRequiresNarrowing}}` |
 * | customerIntent | string | `{{customerIntent}}` |
 * | statusLexicon | string | `{{statusLexicon}}` |
 * | statusScenarios | string | `{{statusScenarios}}` |
 * | jsonFieldGuide | string | `{{jsonFieldGuide}}` |
 *
 * 说明：`workflow.json` **未**将 `inputContext` 列入本 LLM 节点 `inputs`，故 `{{inputContext.previousOutput}}` 在 LLM 侧无来自上下文的注入；`format-output` 仍可从初始 `context` 读取 `inputContext`。
 *
 * 【输出】
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | { structured: object; analysis: string } | 出库单状态解读 JSON，供 `format-output.ts` |
 */

export {};
