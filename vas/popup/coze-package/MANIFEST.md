# 弹窗 Coze 包产出清单

| 方案文档章节 | Codex 产出物 | 状态 |
|---|---|---|
| §3 Prompt 骨架 | prompts/system-prompt.md | ✅ |
| §4 输出 Schema | bot-config.json outputSchema | ✅ |
| §2 决策树 | workflows/popup-workflow.json | ✅ |
| 知识库 | prompts/kb-standard-products.md | ✅ |

## 执行问题记录

| 编号 | 类型 | 描述 | 状态 |
|---|---|---|---|
| Q1 | [AMBIGUITY] | 仓库和方案文档未提供 Coze 平台原生 workflow 导出 JSON 的精确字段 schema；当前 `popup-workflow.json` 按交接模板表达节点、连线、变量和校验逻辑，导入 Coze 时可能需要按平台实际导出格式做字段映射。 | 待 Coze 平台导入验证 |
