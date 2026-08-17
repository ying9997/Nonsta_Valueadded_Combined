/**
 * LLM 节点声明：`llm-analyze`（非可执行代码节点）
 * ---
 * 与 `workflow.json` 中 `type: "llm"`、`id: "llm-analyze"` 一致；推理由 Coze LLM 或 `scripts/runLlmNode` 执行。
 * **请勿**将本文件配置为 `workflow.json` 的代码节点 `file`；无 `main` / `process.argv` 入口。
 *
 * **Prompt**：`prompts/main.md`
 *
 * 【输入】`params`（与 `workflow.json` 本节点 `inputs` 白名单一致）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | query | string | `{{query}}`（框架顶层） |
 * | customerIntent | string | `{{customerIntent}}` |
 * | countryResolved | string | `{{countryResolved}}` |
 * | goodsInfo | object | `{{goodsInfo}}`（type, weight, dimensions） |
 * | kbContent | string | `{{kbContent}}`（load-knowledge 路由后的聚焦 KB） |
 * | enrichedContext | string \| object | `{{enrichedContext}}` |
 * | examplesMd | string | `{{examplesMd}}`（textNode: prompts/examples.md） |
 *
 * 【输出】
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | { structured: object; analysis: string } | 推荐结果 JSON，供 `format-output.ts` |
 */

export {};
