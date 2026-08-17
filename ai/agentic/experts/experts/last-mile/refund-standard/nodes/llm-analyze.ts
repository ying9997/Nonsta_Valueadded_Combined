/**
 * LLM 节点声明：`llm-analyze`（非可执行代码节点）
 * ---
 * 与 `workflow.json` 中 `type: "llm"`、`id: "llm-analyze"` 一致；推理由 Coze LLM 或 `scripts/runLlmNode` 执行。
 * **请勿**将本文件配置为 `workflow.json` 的代码节点 `file`；无 `main` / `process.argv` 入口。
 *
 * **Prompt**：`prompts/main.md`（及各专家注入的条款 Markdown：`refundLexicon`、`clauseMatrix` 等）。
 *
 * 【输入】`params`（与 `workflow.json` 本节点 `inputs` 白名单一致）：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | query | string | `{{query}}`（框架顶层；Coze 自 `开始.query`） |
 * | scenario | string | `{{scenario}}`（业务字段；Coze 自 `开始.inputs.scenario`） |
 * | customerIntent | string | `{{customerIntent}}`（框架顶层） |
 * | trackingIds | string[] | `{{trackingIds}}`（JSON） |
 * | outboundOrderNos | string[] | 出库单号列表 |
 * | enrichedContext | string \| object | `{{enrichedContext}}`；**经 validate-input 合并后含 `analysisClock`（utcIso 等为当前 UTC）** |
 * | inputContext | object（可选） | 链式上下文 |
 * | countryResolved | string | `{{countryResolved}}` |
 * | countryShardMode | string | `{{countryShardMode}}` |
 * | refundLexicon | string | `{{refundLexicon}}` |
 * | clauseMatrix | string | `{{clauseMatrix}}` |
 * | designatedCountryShard | string | `{{designatedCountryShard}}` |
 * | calculationGuide | string | `{{calculationGuide}}` |
 * | examplesMd | string | `{{examplesMd}}`；Coze 接 `examples-text.output`；本地缺省则读 `prompts/examples.md` |
 *
 * 【输出】
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | analysisResult | { structured: object; analysis: string } | 条款匹配与理算说明 JSON，供 `format-output.ts` |
 */

export {};
