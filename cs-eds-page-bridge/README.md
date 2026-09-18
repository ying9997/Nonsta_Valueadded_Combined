# cs-eds-page-bridge（给人看的说明书）

这个目录只做一件事：让智能客服**聊天窗能弹出前端卡片、能让前端去读/点 EDS 页面**。  
内部审核 Copilot、旧 expert 包、SOP 准不准，都先不管。

工作分两阶段：

| 阶段 | 目标 | 现在是否要做 |
|---|---|---|
| 一 | 链路跑通：卡能出、读页指令能发出去、点按钮能点到页 | **现在做** |
| 二 | 输出准确：场景对、SOP 对、填的字段对 | 阶段一绿灯后再做 |

给前端转发：[`contracts/给前端-联调契约.md`](contracts/给前端-联调契约.md)。  
时序图要看懂什么：[`contracts/时序图-你要做什么.md`](contracts/时序图-你要做什么.md)。  
导入 Coze 小工作流：[`coze-import/Workflow-page_intent_emit_smoke-draft-0001.zip`](coze-import/Workflow-page_intent_emit_smoke-draft-0001.zip)，步骤见 [`coze-import/导入并测试.md`](coze-import/导入并测试.md)。

### 标识通道第 0 步（和 tool_call_send 并行；卖家页不要 JSON）

目标：专家回复后面跟一段 `<!--SIDECAR_BEGIN-->` 标识。副本 Query F_1 拆走标识交给 Bot Client 插件；A1 / 卖家页只留人话。Coze 预览里可以看见 sidecar。**不要求卡片内容正确。** 现网 Query / Bot / recaller 仍不动。

| 你要看的 | 路径 |
|---|---|
| 标识长什么样 | [`marker/marker-format.md`](marker/marker-format.md) |
| 粘贴到 expert 结束节点的测试文本 | [`marker/test-marker-recommend.txt`](marker/test-marker-recommend.txt) |
| Coze 里怎么贴（路径 A / B） | [`marker/coze-inject-guide.md`](marker/coze-inject-guide.md) |
| **副本 F_1 加 sidecar 出口（已授权）** | [`marker/query-f1-sidecar-outlet.md`](marker/query-f1-sidecar-outlet.md) |
| recaller 到底打哪张 expert | [`marker/recaller-routing-analysis.md`](marker/recaller-routing-analysis.md) |
| 测试问题 | [`marker/test-questions.md`](marker/test-questions.md) |
| 打测试 Bot 的脚本 + 诊断表 | [`_runs/20260917_marker_test/`](_runs/20260917_marker_test/) |
| 选中样例（catalog `selectOption`） | [`fixtures/sidecar-select-option.json`](fixtures/sidecar-select-option.json) |

### 你现在要做的（副本 F_1 出口 + 对话流接线）

1. 只在副本 Query F_1 加 `extract_sidecar`：[`marker/query-f1-sidecar-outlet.md`](marker/query-f1-sidecar-outlet.md)
2. 对话流 v2p_1 把 Query.sidecar 接到 `page_intent_emit`：[`coze-import/接线-Bot-Client.md`](coze-import/接线-Bot-Client.md)
3. 现网 Query / 共享 recaller / 现网 Bot 不要动

测试 Bot 必须绑对话流 **`7685975376836739124`**。旧画布 `7685663589169381391` 没有末尾三格。

---


## 你必须知道的（其余可以后补）

现有智能客服已经能聊天，层是这样套的（从外到内）：

```
EDS 下单页上的聊天窗（前端做的）
  → 后台几乎原样转给 Coze
    → 最外层画布 cs_Bot_Client_v2p_1（谁在登录）
      → 子流程 cs_Default_Query_v4_staging_F（真正问答）
        → 需要专家时 experts_recaller
          → 各个 expert
```

**阶段一只动测试 Bot 这条链：** 最外层 Bot Client 副本 + **副本 Query F_1 的 sidecar 出口**。现网 Query / 共享 recaller / 现网 Bot 不要改。

聊天窗要「去读页 / 弹出卡片」，不是再写一套接口。Query 画布里已经有很多名叫 **「函数调用」** 的插件节点，插件是 `cobra_agent_http`，接口名 `tool_call_send`。现在它们用来告诉聊天窗「正在思考」（`function_name = stage`）。我们 **复制一个同样的插件节点**，只把 `function_name` 换成前端要的 `pageRead` 或 `renderA2UI`。

`D:\DA\Nonsta_Valueadded_Combined\ai\agentic\Coze工作流导出\Workflow-cobra_api_1-draft-611` **不是这个。** 那个工作流是同一插件里的另一个接口（查 OMS）。不要接到那张画布上。

---

## 阶段一要在 Coze 加什么（对照画布）

打开：**cs_Bot_Client_v2p_1**（zip：`Chatflow-cs_Bot_Client_v2p_1-draft-8069.zip`）

找到主对话这条线（不要动「新增数据 → 结束」那条绑用户的线）：

```
cs_Default_Query_v4_staging_F（子流程，已经在画布上）
    → 【在这里插入下面 3 个节点】
    → 结束
```

| 顺序 | 你在 Coze 里加的节点类型 | 画布建议标题 | 本地 vibe 文件 | 做什么 |
|---|---|---|---|---|
| 1 | **代码** | `page_intent_emit` | `nodes/page-intent-emit.ts` 全文贴进去 | 决定这次是「读页」还是「出卡」，吐出 `function_name` + `arguments` |
| 2 | **选择器** | `if_should_send` | 无 | `should_send` 为真才走插件；假的直接结束（普通问答不受影响） |
| 3 | **插件** | `tool_call_send_page` | 无，**复制 Query 里已有的「函数调用」** | 把上一格的两段字发给聊天窗 |

插件 5 根线（和现有「函数调用」一样）：

- `function_name` ← 代码节点的 `function_name`
- `arguments` ← 代码节点的 `arguments`（必须是字符串）
- `conversation_id` / `user_id` / `username` ← 开始节点那三个用户字段

**阶段一最快冒烟（可以先不做代码节点）：**  
插件上把 `function_name` 写死为 `renderA2UI`，`arguments` 贴 `fixtures/sidecar-render-a2ui.json` 里 `arguments` 那一段的 JSON 字符串。能出卡就证明管道通了，再换成代码节点。

`cs_Default_Query_v4_staging_F` 那张现网 Query **不要改**。已授权改的是副本 **F_1**：加 `extract_sidecar` 出口。步骤：[`marker/query-f1-sidecar-outlet.md`](marker/query-f1-sidecar-outlet.md)。

---

## 前端三个问题，用人话对齐画布

### 1. 怎么让前端去读页面？

你这边 **只发一个指令**。读页面的动作前端已经写好了，我们不写读 DOM 的代码。

1. 代码节点输出 `function_name = pageRead`
2. 插件节点 `tool_call_send_page` 把它发出去
3. 聊天窗收到后，前端自己去读当前 EDS 页

读回来的「页面长什么样」会作为 **下一轮对话的输入** 再进 Bot Client（从前端时序上走他们的上报，不是我们再做一个 Coze 节点叫 toolCalled）。

阶段一验收：聊天窗或网络里能看到发出了 `pageRead`；点卡片上「读取当前页面」后，前端确认他们读到了页。

### 2. 怎么弹出卡片？点卡片谁去点页面？

「出卡」= 聊天记录里除了文字气泡，再出现一张前端画的操作卡片。

1. 代码节点输出 `function_name = renderA2UI`，`arguments` 里带 `commands` 数组
2. `commands` 必须用前端 catalog 里登记过的组件（`ai-chatbot-builtin`，v0.9）。对不上，前端不画
3. 用户点卡片上的按钮后，**前端自己去点/填 EDS 页**。Coze 画布上 **没有** 叫 `toolCalled` 的节点，也不用加。那是聊天窗告诉后台「我点完了」的回执，阶段一不用管怎么实现

阶段一冒烟验收：EDS 页侧栏能出卡（短句「出卡测试」仍用 `sidecar-render-a2ui.json`）。推荐选中走 `fixtures/sidecar-select-option.json`（`selectOption`）。

### 术语哪些可以后补

| 词 | 现在要不要懂 |
|---|---|
| 代码节点 / 插件节点 / 选择器 | 要，就是你在 Coze 里拖的三种块 |
| `tool_call_send` | 要，已经存在的「函数调用」插件 |
| `pageRead` / `renderA2UI` | 要，发给聊天窗的两句口令 |
| catalog v0.9 | 要知道：卡片 JSON 必须对上前端登记的组件 |
| SDK、queryToolCall、ack、dehydrated_dom、toolCalled 节点 | **阶段一不用懂**，都是前端/后台管道内部的名字 |

---

## 去哪里测？（不是在 Cursor 里看）

Cursor 里的 `npx tsx ...test-page-intent-emit.ts` 只证明 JSON 没写错。  
**真验收必须打开带智能客服聊天窗的 EDS 增值下单页。**

找前端要这三句话（缺一不可，否则卡出不来）：

1. 测试环境的 EDS 下单页 URL（哪套 staging / 测试卖家后台）
2. 这个 URL 上的聊天窗 **已经发了 A2UI + 读页/点页** 的版本（没发的话，Coze 怎么发指令都没人画卡）
3. 这个聊天窗绑的是哪条 Coze Bot（应是 `cs_Bot_Client_v2p_1` 或它指向的 Bot；绑错画布等于白改）

测法：打开那个 URL → 登录 → 打开侧栏客服 → 随便说一句触发 Bot Client 跑完 Query → 看侧栏有没有卡。

---

## 跟前端怎么联调

**要他们把能力接到「聊天窗实际绑定的那套测试环境」，不是只在他们本地 demo 里有。**  
我们 Coze 改的是 staging 画布的话，前端也必须是 staging 页。两套对不上，联调无意义。

联调清单（可直接转给前端）：

1. staging EDS 页 URL + 是否已含 A2UI 聊天窗  
2. 聊天窗绑定的 Coze Bot / workflow 名称或 ID  
3. 他们收到 `tool_call_send` 且 `function_name=renderA2UI` 时是否画卡  
4. 他们收到 `function_name=pageRead` 时是否读当前页  
5. 卡片按钮 `readPage` / `operatePage` 是否按 catalog 执行。选中下拉用 **`selectOption`**（`args=[index, optionText]`），一组就用 `actions`；不要用 `clickElement(0)` 当推荐选中。  

我们提供：`fixtures/sidecar-select-option.json`（推荐选中）、`fixtures/sidecar-render-a2ui.json`（短句冒烟出卡）、`a2ui/catalog.json`（与他们同源）。

阶段一 **不要求** 专家 SOP 正确，不要求自动填对需求描述。

---

## 本地 JSON 自检（开发用，不是你的验收环境）

```powershell
cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
npx tsx ..\cs-eds-page-bridge\scripts\test-page-intent-emit.ts
npx tsx ..\cs-eds-page-bridge\scripts\test-extract-sidecar.ts
```

## 目录

| 路径 | 用途 |
|---|---|
| `marker/` | 标识通道第 0 步：格式、粘贴文本、Coze 操作指引、recaller 指向分析 |
| `_runs/20260917_marker_test/` | 第 0 步 Chat API 脚本和逐节点诊断表 |
| `marker/query-f1-sidecar-outlet.md` | 副本 Query F_1 加 sidecar 出口、对话流接线（现网 Query 不动） |
| `nodes/extract-sidecar.ts` | 贴进 F_1：拆标识、洗净人话 |
| `nodes/page-intent-emit.ts` | 贴进 Coze「代码」节点 |
| `fixtures/sidecar-select-option.json` | 推荐选中：catalog `selectOption` 批量 |
| `fixtures/sidecar-render-a2ui.json` | 短句冒烟出卡（仍含 clickElement 第 0 个） |
| `coze-import/cs_Bot_Client_v2p_1-page-bridge.zip` | 已接好选择器 + tool_call_send 的 Bot Client 包 |
| `coze-import/接线-Bot-Client.md` | 导入或手加节点的步骤；Query.sidecar 接到封口节点 |
| `fixtures/sidecar-page-read.json` | 阶段一读页样例 |
| `a2ui/catalog.json` | 前端组件登记拷贝 |
| `contracts/` | 字段说明，联调时备查 |
