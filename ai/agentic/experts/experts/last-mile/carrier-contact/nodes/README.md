# Coze 代码节点说明

每个文件为**单文件闭环**，无跨文件 import，可直接复制到 Coze 工作流代码节点使用。

**Coze 格式**：`main({ params })` 通过 `params` 获取输入变量，输出必须为 `const ret = { "key": value }; return ret;` 的 Object 键值对形式。

| 节点 | 说明 |
|------|------|
| validate-input | 最小线索校验；`enrichedContext` 注入 `analysisClock` |
| load-carrier-knowledge | 组装 `kbMd`（内嵌 KB，与 `prompts/kb.md` 同步） |
| format-output | `result` / `outputContext` |

维护 KB 后请运行：`node experts/last-mile/carrier-contact/scripts/embed-kb-into-load.mjs`
