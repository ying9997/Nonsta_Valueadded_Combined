# 给前端：页面读 / 卡 / 点 联调契约（可直接转发）

这次只约定通道：侧栏能不能画出卡、读当前页、按按钮去点页面。  
卡片上要填哪些真实业务字段，下一阶段再说；**这次不要求内容正确**。

## 角色（全文都按这个叫）

| 称呼 | 是谁 | 干什么 |
|---|---|---|
| **你们 / 前端侧** | EDS 页 + 侧栏聊天窗（A2UI / 读页 / 点页 SDK） | 画卡、读当前业务页、按卡片按钮去点/填页 |
| **我们 / AI侧** | Coze 对话流（`cs_Bot_Client_v2p_1`）+ 智能客服后台 | 发出 `pageRead` / `renderA2UI` 口令；卡片 JSON 里写好按钮 |

下文 **「你们」= 前端侧**，**「我们」= AI侧**。不要理解成别的团队。

同源文件：`a2ui/catalog.json`、`a2ui/prompt.md`、`fixtures/sidecar-render-a2ui.json`、`fixtures/sidecar-page-read.json`、`fixtures/card-action-operate-page.json`。

AI侧发指令的通道和现网客服「正在思考」是同一条：Coze 插件 `cobra_agent_http` / `tool_call_send`。前端侧对应时序图里的 **queryToolCall 拿到一条 tool**。

---

## 前端侧问的两句话，AI侧直接答

### 1. pageRead：AI侧怎么告诉前端侧开始读？前端侧怎么把页面信息给 AI侧？

**开始读：** 前端侧继续 `queryToolCall` 轮询。收到：

- `function_name`（或 tool name）= **`pageRead`**
- `arguments` = 字符串，parse 之后：

```json
{ "reason": "eds_value_add_form_need_facts" }
```

`reason` 可空，有则写日志。收到这条就开始读当前业务页（侧栏外面那页），不要等用户再点一次。

**页面信息怎么给 AI侧：** 按前端侧时序图 Phase 2：

- 用 **`workflow/run`** 把脱水 DOM 报上来（不要放在 `toolCalled` 的业务载荷里）
- 然后再打一条 **`toolCalled`，只表示 ack（成功收到指令）**，不要把 DOM 塞进 ack

### 2. A2UI 怎么传给前端侧？operatePage 做完怎么告诉 AI侧？

**出卡：** 前端侧 `queryToolCall` 收到：

- name = **`renderA2UI`**
- `arguments` parse 之后：

```json
{ "commands": [ /* A2UI v0.9 命令数组 */ ] }
```

`commands` 必须能用前端侧内建 catalog（`catalogId: "ai-chatbot-builtin"`）画出来。标准样例就是 `fixtures/sidecar-render-a2ui.json` 的 `arguments`。

卡片按钮的 action 名只能是 **`readPage`** / **`operatePage`**。注意两个读页名字不要混：

- AI侧下发的后台 tool：`pageRead`
- 用户点卡片上的按钮：`readPage`

**点页（点卡）：** AI侧 **不会**再单独发一条 `operatePage` 的 `tool_call_send`。点卡不是第三条后台口令，而是出卡 JSON 里按钮上已经写好的 `action.event`。用户一点，前端侧自己执行 `operatePage`。做完按 Phase 4 走 **`toolCalled` 回传执行结果**（或只在卡片里提示）。AI侧 Coze 画布上没有名为 toolCalled 的节点。

---

## 三条对照时序图

| 时序 | 谁先动 | 前端侧 `queryToolCall` 看到的 name | arguments（parse 后） | 前端侧接下来做什么 | 怎么回给 AI侧 |
|---|---|---|---|---|---|
| Phase 2 读页 | AI侧 | `pageRead` | `{ "reason": "..." }` | 读业务页脱水 DOM | `workflow/run` 上报 DOM；`toolCalled` 仅 ack |
| Phase 3 出卡 | AI侧 | `renderA2UI` | `{ "commands": [ ... ] }` | 在侧栏气泡画 A2UI 卡 | 不用回（画出来即可） |
| Phase 4 点卡 | 用户点卡 | **不是** queryToolCall 下发 | 卡片 `action.event` | 执行 `readPage` 或 `operatePage` | 读页同 Phase 2；点页结果 `toolCalled` |

正常文字对话仍是 Phase 1 的 `sendMessage` SSE，与这三条并行存在。

---

## 为什么样例只有「出卡」「读页」，点卡在哪？

AI侧通过 `tool_call_send` 只发两种后台口令：

1. **读页** `pageRead` → `fixtures/sidecar-page-read.json`
2. **出卡** `renderA2UI` → `fixtures/sidecar-render-a2ui.json`

**点卡没有第三条后台 JSON**，因为点卡不是 AI侧再推一条 tool。它已经写在出卡样例的按钮里：

- 点「读取当前页面」→ 前端侧执行 catalog **`readPage`**（样例：`fixtures/card-action-read-page.json`）
- 点「点击第 0 个元素」→ 前端侧执行 catalog **`operatePage`**（样例：`fixtures/card-action-operate-page.json`）

这次联调点卡：先按出卡样例把两张卡画出来，再点第二张卡上的按钮（需确认后再点第 0 个元素）。不要等 AI侧再发一个 `function_name=operatePage`。

`operatePage` 禁止 `executeJavascript`。

---

## 谁先谁后（两边同时准备，不要互相等）

| 事 | 要不要等对方 | 人话 |
|---|---|---|
| 前端侧把「画卡 / 读页 / 点页」发到 **测试环境 EDS 页** | **不用等 AI侧** | 契约就是上面三条。测试页有了，AI侧才能在真页面上看卡 |
| AI侧发出 `renderA2UI` / `pageRead` | **不用等业务规则定完** | 这次用下面的固定样例 JSON。不要求卡上的字、按钮对得上真实增值单；先证明管道通 |
| 真页面联调 | **两边都要就绪** | 测试页聊天窗已能画卡、读页、点页；且绑的是 AI侧改过的那条 Bot |

请前端侧回 AI侧三句话：

1. 测试环境 EDS 下单页 URL  
2. 这个 URL 上的聊天窗是否已含 A2UI + 读页 + 点页  
3. 聊天窗绑的 Coze Bot 名称 / ID（应绑对话流 `cs_Bot_Client_v2p_1` / `7685975376836739124`）

`queryStandardExceptionWithPlanPage` 是另一套业务接口（异常方案），**和本次出卡/读页/点页无关**，不用改这个契约。

---

## 样例 JSON（这次联调用这个，不要自己编）

| 能力 | 谁发出 | 文件 |
|---|---|---|
| 出卡 | AI侧 `tool_call_send` / `renderA2UI` | `fixtures/sidecar-render-a2ui.json` |
| 读页（后台要读） | AI侧 `tool_call_send` / `pageRead` | `fixtures/sidecar-page-read.json` |
| 点卡-读页按钮 | 用户点卡，前端侧执行 `readPage` | `fixtures/card-action-read-page.json`（已含在出卡 JSON 的按钮里） |
| 点卡-点第 0 个元素 | 用户点卡，前端侧执行 `operatePage` | `fixtures/card-action-operate-page.json`（仅短句冒烟） |
| 点卡-选中推荐产品/原子 | 用户点卡，前端侧执行 `selectOption` | `fixtures/sidecar-select-option.json` / `fixtures/card-action-select-option.json` |
