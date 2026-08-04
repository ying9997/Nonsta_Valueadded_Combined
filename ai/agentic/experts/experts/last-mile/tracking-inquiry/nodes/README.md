# Coze 代码节点说明

每个文件为**单文件闭环**，无跨文件 import，可直接复制到 Coze 工作流代码节点使用。

**Coze 格式**：`main({ params })` 通过 `params` 获取输入变量，输出必须为 `const ret = { "key": value }; return ret;` 的 Object 键值对形式。

`derive-checking-type.ts` 只生成新建查件的推荐类型，禁止覆盖接口返回的 `primaryCheckingType`。RDscan（退回妥投）或上游出库专家提供的 `DF / 派送失败` 关联退货单事实，确定性推荐 `FR / 退回原因`，且优先于 OT/NT；没有这两类结构化证据时不得仅凭“可能退回”等文本推荐 FR。

`fetch-tail-trace-list.ts` 和 `format-output.ts` 只输出查件所需字段，不透传接口原始整行。WCR 且没有 `checkingResults`、`feedbackMsg`、`returnReasons` 时，最终话术由代码生成，避免臆测供应商状态或承诺主动通知。

`format-output.ts` 返回标准顶层 `structured` / `analysis`；后置 `build-result-alias.ts` 生成兼容别名 `result`，两者内容保持一致。
