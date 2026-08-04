# Coze 代码节点说明

每个文件为**单文件闭环**，无跨文件 import，可直接复制到 Coze 工作流代码节点使用。

**Coze 格式**：`main({ params })` 通过 `params` 获取输入变量，输出必须为 `const ret = { "key": value }; return ret;` 的 Object 键值对形式。

**KB**：代客索赔条款与渠道时效见上级目录 [prompts/kb.md](../prompts/kb.md)；本地/OpenAI 路径由 `scripts/llm-openai.ts` 自动读取并注入 `{{kbMd}}`。

| 节点 | 文件 |
|------|------|
| validate-input | [validate-input.ts](./validate-input.ts) |
| build-compensate-list-data | [build-compensate-list-data.ts](./build-compensate-list-data.ts) |
| fetch-compensate-list | [fetch-compensate-list.ts](./fetch-compensate-list.ts) |
| format-output | [format-output.ts](./format-output.ts) |
| llm-analyze | [llm-analyze.ts](./llm-analyze.ts)（声明） |
| winit-openapi-plugin | [winit-openapi-plugin.ts](./winit-openapi-plugin.ts)（插件占位） |
