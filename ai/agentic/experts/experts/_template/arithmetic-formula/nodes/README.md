# 节点说明（`nodes/`）

本目录包含：

- **可执行代码节点**（`workflow.json` 里带 `"file": "nodes/xxx.ts"`）：须含 `main`、末尾可选 `process.argv` 供本地 Runner 调试用；文件头 **【输入】/【输出】** 与 workflow 一致。**禁止**在此类文件中使用 `export` / `import`（含 `export {}`）；Coze FaaS 代码节点不承认 ES 模块语法，会报错。占位用的 `llm-*.ts`、`winit-openapi-plugin.ts` 仅在本仓库作说明，不粘贴进 Coze 代码节点，可不受此条约束。
- **LLM 节点声明文件**（如 **`llm-comment.ts`**）：与 workflow 中 **`type: "llm"`** 的节点 **id 对应**（命名建议 `llm-<workflow-id>.ts`）。**仅注释契约**，含 Prompt 路径、与 `inputs`/`outputs` 白名单一致的表格；**禁止**当作代码节点挂到 `file`；**禁止**写 `process.argv` 入口。实际推理在 Coze LLM 或 `scripts/runLlmNode`。

- **Coze 插件占位声明**（如 **`winit-openapi-plugin.ts`**）：与 `coze.config.yml` 导出为 **`type: plugin`** 的万邑通节点对应；说明默认 **`action`** 与调用边界约定。**禁止**挂到 `workflow.json` 的 `file`。

新建专家时：每增加一个 LLM 节点，在 `nodes/` 增加对应声明 `.ts`，并在 `design.md` 节点表中引用该文件。

本模板 **`build-winit-inventory-data.ts`**：拼装 id/58 请求体 JSON 字符串（`winitRequestData`），供 Coze 上万邑通插件 **`data`** 入参拉线（不经开始节点）。**`fetch-sku-inventory.ts`**：经 Coze 代理拉数或消费插件响应；**`evaluate-expression.ts`** 只做占位符替换与算术。改库存协议时同步改 build + fetch。

**本地 Runner**：仅对 `file` 指向的 `.ts` 做 `ts-node` 执行；`llm-*.ts` 声明文件不会被 Runner 当入口加载。
