# Coze 代码节点说明

每个文件为**单文件闭环**，无跨文件 import，可直接复制到 Coze 工作流代码节点使用。

**调用约定**：`main({ params })` 经 `params` 取入参；返回值为平铺键值对象，键名须与 `workflow.json` 中对应节点的 `outputs` 一致。

更细的字段类型与说明见各 `.ts` 文件顶部注释块。

## 节点一览（与 workflow.json 对齐）

| 节点 id | 文件 | 输入（类型摘要） | 输出（类型摘要） |
|---------|------|------------------|------------------|
| validate-input | `validate-input.ts` | scenario 等 string；trackingIds/outboundOrderNos 为 string[]；enrichedContext 为对象；country 类为 string | valid boolean；error? string；归一字段 + countryResolved string、countrySource string、scenarioGuard object |
| load-refund-knowledge | `load-refund-knowledge.ts` | countryResolved、country、destinationCountry、enrichedContext 等 | 四个 Markdown 字符串 + countryResolved、countryShardMode（hit \| index \| unsupported） |
| llm-analyze | （平台 LLM 节点 / 脚本 `scripts/llm-openai.ts`） | 含 `query`、`examplesMd`（Coze 由 `coze.config.yml` 文本节点注入）及条款注入字段；见 workflow 中 llm `inputs` | analysisResult：{ structured?, analysis? } |
| format-output | `format-output.ts` | analysisResult object \| string；inputContext? object；scenarioGuard object | result（structured + analysis）；不适用 DNR 时强制清空条款匹配；outputContext（expertId、resultSummary、chainId?） |

工作流拓扑见 [`../workflow.json`](../workflow.json)。
