# 前端页面工具契约（现行）

旧的 `handoff/contracts/tool-calling-schema.md`（`vas_form_action` / select+fill）**作废**，不要再往前端塞那套 JSON。

前端现行通道来自：

- `a2ui/catalog.json` + `a2ui/prompt.md`（A2UI 真源）
- 智能客服 SDK 时序：`queryToolCall` / `workflow/run` / `toolCalled`

本目录封口节点只做一件事：把下面三包 **原样** 交给已有插件 `cobra_agent_http.tool_call_send`。A1 的人话走原来的「输出」节点，不经过这里。

## 三条 tool 怎么走

| 谁发出 | `tool_call_send.function_name` | `arguments`（JSON 字符串） | 前端怎么回 |
|---|---|---|---|
| 后台要读页 | `pageRead` | `{"reason":"..."}` | SDK 读脱水 DOM，用 **`workflow/run` 上报**（不是 `toolCalled` 载荷），再 `toolCalled` 只 ack |
| 后台要出卡 | `renderA2UI` | `{"commands":[ ...A2UI v0.9... ]}` | SDK 画 `A2UICard`。卡片里按钮的 action 名是 catalog 的 `readPage` / `operatePage` |
| 用户点卡片 | 不经本节点 | 卡片 `action.event.context` | SDK 操作 DOM 后，结果走 **`toolCalled`** |

注意两个名字：

- 后台 tool：`pageRead`（时序图 Phase 2）
- 卡片按钮：`readPage`（catalog functions）

不要把卡片 action 名改成 `pageRead`，前端 catalog 校验会失败。

## `tool_call_send` 插件入参（已在 Query 画布使用）

和现在的 `stage` 完全同一插件，只换 `function_name`：

| 字段 | 来源 |
|---|---|
| `function_name` | 本节点输出 `function_name` |
| `arguments` | 本节点输出 `arguments`（必须是字符串） |
| `conversation_id` | `_conversation_id` |
| `user_id` | `_user_id` |
| `username` | `_username` |

## A2UI `commands` 硬规则（摘自 catalog prompt）

1. 每条命令 `version: "v0.9"`
2. `createSurface.catalogId` 必须是 `ai-chatbot-builtin`
3. 每个 Surface 有且仅有一个 `id: "root"`
4. 结构用 `updateComponents`，数据用 `updateDataModel`
5. `children` / `child` 只放组件 id，不放文本
6. 表单要回写必须同时有 `value.path`（带 `/`）和 `dataPath`（不带 `/`）
7. 卡片 action 只有 `readPage` / `operatePage`
8. `operatePage` 禁止 `executeJavascript`；提交 / 保存草稿不要自动点

完整组件表见 `a2ui/prompt.md`。

## 旁路：为什么不让 A1 带 JSON

Query 是 v2p：对人说话在中途「输出」节点就发出去了，结束节点不往 Bot Client 带字段。A1 会把 JSON 改写成句子，`tools_msg_cleaner` 还会清程序符号。

所以页面 JSON 必须走 **sidecar**：专家 `structured` 里单独一格 → 会话变量或 Query 结束显式带回 → Bot Client 本节点 → `tool_call_send`。人话仍走 A1。
