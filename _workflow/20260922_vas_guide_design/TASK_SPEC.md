# 增值指引 Workflow 节点设计与 Prompt 组装方案

## Context

`Nonsta_Valueadded_Combined` 项目的 AI 客服侧栏需要一个「大脑」：当卖家在 EDS 增值下单页打开侧栏时，AI 帮客户把需求说清楚、分流到正确路径、生成可回填的需求描述和需求背景说明。

当前状态：
- **通道层** (`cs-eds-page-bridge`) 基本通了（画布绿灯，卡在绑 Bot + 真页联调）
- **大脑层**（指引 workflow）**还没有** — 这是本次要补的
- `vas/engine/prompts/` 有完整的 classify → clarify → recommend prompt 设计，但无 Coze 实现
- `internal-review-copilot/` 有 82 张场景卡 + 齐全性校验逻辑（`check-scene-completeness.ts`），生产级

目标：产出一套可直接给 Cursor 执行的任务规格，Cursor 跑完后在 `cs-eds-page-bridge/` 生成所有文件，用户只需贴进 Coze + 连线。

---

## 0. 输出接口约束（探测 Query 后确认）

> **重要发现**：Query 没有正式输出变量。Bot Client 结束节点也是空的。

**客户可见的回复**通过 Coze 的**中途输出节点**（`type: output`, `streamingOutput: true`）在 workflow 运行过程中直接流式推送到聊天气泡。**不是**从结束节点返回。

**给前端的工具指令**（pageRead / renderA2UI / stage）通过 workflow 内部的 `tool_call_send` 插件（cobra_agent_http）发出。也**不经过**结束节点。

**结束节点**：`terminatePlan: returnVariables`，变量列表为空（或只有 `sidecar` 字符串）。Bot Client 结束节点不消费 Query 的任何输出。

### VAS 指引 workflow 必须遵守的输出契约

| 能力 | 实现方式 | 和 Query 完全一致 |
|---|---|---|
| 客户看到的文字回复 | workflow 内部用 `输出` 节点（`streamingOutput=true`） | 是 |
| 给前端的工具指令（版本B） | workflow 内部用 `tool_call_send` 插件 | 是 |
| 结束节点返回值 | 空（或只有 `sidecar`） | 是 |
| Bot Client 结束节点 | **不改**，保持空 | 是 |

> 这意味着 `vas_output_format` 代码节点**不需要**返回 `bot_reply` 给 Bot Client。回复直接从 LLM 后面的输出节点流式推到气泡。后续加回 Query 分支时，选择器只切路由，下游结束节点不用动。

---

## 1. 架构概览

### 1.1 在 Bot Client 中的位置

```
Bot Client (cs_Bot_Client_v2p_link / 7687981752618582066):

A/B 客户分流
  → vas_guide_router (代码节点, 替换 page_link_probe)
  → [选择器] route_switch
      route="greeting"  → [输出节点 streamingOutput=true] 固定开场 → 结束(空)
      route="guide"     → [LLM] vas_guide_llm → [代码] vas_output_format
                            → [输出节点 streamingOutput=true] 客户回复 → 结束(空)
                            → (版本B) [tool_call_send] renderA2UI 卡片
      route="page_tool" → tool_call_send_page → 结束(空)
      route="query"     → Query → 结束(空)
```

所有分支最终都到同一个空结束节点。**客户看到的内容只从 `输出` 节点出来**，不从结束节点出来。

### 1.2 多轮对话状态管理

Coze 对话流的 LLM 节点自带对话记忆。利用这一点：
- **Turn 1**: 代发触发句 → `vas_guide_router` 检测到 → `输出` 节点直接推固定开场话术到气泡
- **Turn 2+**: 客户后续消息 → `vas_guide_router` 检测非触发句 → route="guide" → LLM 节点（自动带上前几轮对话历史）→ `输出` 节点推回复到气泡

状态判定方法（`vas_guide_router` 代码节点）：
- V1 简化：只区分「触发句」和「非触发句」。非触发句全走 guide LLM。
- guide LLM 自己根据对话历史判断当前阶段（在 system prompt 里写死：如果用户突然问了无关问题，告知「先完成当前流程」或输入「退出」回到普通客服）。

### 1.3 两个输出版本

| | 版本 A（降级/先做） | 版本 B（完整/后做） |
|---|---|---|
| 客户看到的回复 | `输出` 节点 streamingOutput=true 推纯文本 | 同左（文字仍走输出节点） |
| 表单填写 | 客户手动复制粘贴 | `tool_call_send` → `renderA2UI` 卡片，带"一键填写"按钮 |
| 实现差异 | `vas_output_format` 只格式化文本 | `vas_output_format` 额外输出 function_name + arguments → 接 `tool_call_send` 插件 |
| 前端依赖 | 无 | 通道打通 + 前端支持 A2UI |

**先只实现版本 A**。版本 B 的 `tool_call_send` 接线在连线指南里预写好，但 V1 不接。

---

## 2. 节点规格

### 2.1 `vas_guide_router` (代码节点, JavaScript)

**输入**（从 Coze 开始节点）：
- `USER_INPUT` / `user_input`: 当前轮用户消息
- `_conversation_id`, `_user_id`, `_username`, `_customer_code`

**输出**：
```json
{
  "route": "greeting | guide | page_tool | query",
  "event_no": "EB0126...",
  "user_input": "原始用户输入",
  "conversation_id": "...",
  "user_id": "...",
  "username": "..."
}
```

**路由逻辑**：
1. 匹配 `我的异常单{EB}应该提交哪个增值产品` → `route="greeting"`, 提取 `event_no`
2. 匹配 `链路测试` / `TEST_LINK` → `route="greeting"`（开发测试）
3. 输入看起来是脱水 DOM（`dehydrated` / `interactiveElements`）→ `route="page_tool"`（保留原有读页出卡）
4. **其他所有输入** → `route="guide"`（进 VAS 指引 LLM）

> 注意：V1 简化——非触发句全进 guide，不走 Query。这意味着测试阶段客服只有 VAS 指引功能，没有通用问答。后续接 Query 只需在选择器加一条「else → Query」分支。

**文件**: `nodes/vas-guide-router.coze.js` + `nodes/vas-guide-router.ts`

### 2.1b `route="page_tool"` 分支：读页 / 出卡 / 点页（通道测试）

这条分支**独立于 guide LLM**，只走代码节点 + 插件，用来单独测通路。逻辑全部从现有 `page-link-probe.coze.js` 继承。

#### 三步时序

```
Step 1 — 读页：
  测试命令「读页测试」/ TEST_PAGE_READ
    → router 输出 route="page_tool", function_name="pageRead", arguments={"reason":"channel_test"}
    → tool_call_send 插件发出 pageRead
    → 输出节点: "正在读取页面，请稍候…"
    → 前端收到 pageRead → 读当前 EDS 页 DOM → 作为下一轮对话输入打回来

Step 2 — 出卡：
  前端回传脱水 DOM（interactiveElements）
    → router 检测 looksLikeDehydratedDom=true
    → router 调用 buildListBody() + listCardArguments() 生成清单卡 JSON
    → route="page_tool", function_name="renderA2UI", arguments=卡片JSON
    → tool_call_send 插件发出 renderA2UI
    → 输出节点: "已生成页面清单，请查看卡片"
    → 前端渲染卡片（标题「读页清单（先不点页）」，列出 interactiveElements）

Step 3 — 点页（前端执行，后台不参与）：
  用户点卡片按钮「确认选中」
    → 前端读卡片 action.event = operatePage
    → 前端执行 selectOption(index, optionText)
    → 后台不需要额外节点
```

#### router 代码中 page_tool 的输出

当 `route="page_tool"` 时，router 的输出增加以下字段（和 guide/greeting 并列）：

```json
{
  "route": "page_tool",
  "function_name": "pageRead",
  "arguments": "{\"reason\":\"channel_test\"}",
  "page_status_message": "正在读取页面，请稍候…",
  "event_no": "",
  "user_input": "...",
  "conversation_id": "...", "user_id": "...", "username": "..."
}
```

或（脱水 DOM 进来时）：

```json
{
  "route": "page_tool",
  "function_name": "renderA2UI",
  "arguments": "{\"commands\":[{\"version\":\"v0.9\",\"createSurface\":{...}},{\"version\":\"v0.9\",\"updateComponents\":{...}}]}",
  "page_status_message": "已生成页面清单，请查看卡片",
  "event_no": "",
  "user_input": "...",
  "conversation_id": "...", "user_id": "...", "username": "..."
}
```

#### 画布接线

```
route="page_tool"
  → tool_call_send_page 插件（5 根线）
      function_name  ← router.function_name
      arguments      ← router.arguments  （必须是字符串）
      conversation_id ← router.conversation_id
      user_id         ← router.user_id
      username        ← router.username
  → [输出节点 streamingOutput=true] {{page_status_message}}
  → 结束（空）
```

**插件复用**：`tool_call_send_page` 和原来 `page-link-probe` 用的是同一个，已经在画布上。不需要新建插件节点，只需要改线源头从旧代码节点到新 router。

#### 测试触发命令

| 命令 | 走哪一步 | 期望 |
|---|---|---|
| `读页测试` | Step 1 | `function_name=pageRead`, 前端开始读页 |
| `TEST_PAGE_READ` | Step 1 | 同上 |
| `链路测试` | 原来走 greeting → 现在改为走 page_tool（纯通道测试，不进指引） |  |
| 前端回传 `{"dehydrated_dom":{"interactiveElements":[...]}}` | Step 2 | `function_name=renderA2UI`, 清单卡 |
| 直接贴 `fixtures/turn-dehydrated-dom-list.json` | Step 2 | 同上（本地模拟） |

> **设计决策**：`链路测试` / `TEST_LINK` 从 greeting 移到 page_tool。理由：这两个命令原来就是测通道的，放在 greeting 语义不对。触发句（`我的异常单{EB}应该提交哪个增值产品`）仍然走 greeting。

#### 和 guide 分支的未来接点

通道测通后，guide LLM 生成完需求描述（phase=generate）→ 版本 B 从 `vas_output_format` 输出 `should_send_tool=true, function_name="renderA2UI"` → 接同一个 `tool_call_send_page` 插件。即：**guide 分支和 page_tool 分支共用同一个插件节点**，只是输入来源不同。

#### 单独出「选中推荐」卡的测试命令（Step 3 验证）

为了不依赖真实读页结果也能测 Step 3 的卡片按钮，增加一个硬编码测试命令：

| 命令 | 做什么 |
|---|---|
| `出卡测试` / `TEST_CARD` | router 输出固定的 `renderA2UI` 参数，卡片内容为 `fixtures/sidecar-select-option.json`（「确认选中推荐服务」卡，带 selectOption 按钮） |

这样前端可以不读页就验证：卡片能不能画出来、按钮点了能不能选中页面下拉。

router 代码中加一个分支：
```javascript
if (chatText === "出卡测试" || chatText === "TEST_CARD") {
  return {
    route: "page_tool",
    function_name: BACKEND_RENDER,
    arguments: JSON.stringify(FIXTURE_SELECT_OPTION_CARD),
    page_status_message: "已发出测试卡片（选中推荐服务）",
    // ...其他字段
  };
}
```

`FIXTURE_SELECT_OPTION_CARD` 的内容就是 `fixtures/sidecar-select-option.json` 的 `arguments` 部分。

### 2.2 固定开场文本

触发句命中后，直接输出固定话术（不进 LLM，零延迟）：

```
收到您的异常单 {event_no}。

请用您自己的话描述一下：您希望仓库怎么处理这批货物？
例如：「帮我辨识后换标上架到新入库单WI12345678」「帮我拍照确认状态」「这批货不要了，销毁处理」

描述越详细，我越能帮您快速选对服务、填好表单。
```

**实现**：`vas_guide_router` 代码节点输出 `greeting_text` 字段 → 接 Coze `输出` 节点（`streamingOutput=true`，内容 `{{greeting_text}}`）→ 直接推到聊天气泡。**不经过结束节点**。

### 2.3 `vas_guide_llm` (LLM 节点)

**System Prompt**: 见 §3 详细设计。

**输入变量**（Mustache 注入）：
- `{{user_input}}`: 当前轮用户消息
- `{{event_no}}`: 从 router 传来的异常单号
- `{{scene_kb}}`: 场景知识库文本（从 Text 节点注入）
- `{{flow_context_kb}}`: 流程语境文本（从 Text 节点注入）

**输出格式**（LLM 被要求输出 JSON + 人话）：
```json
{
  "phase": "clarify | generate | transfer_human",
  "matched_scene": "inbound_label_identify",
  "matched_scene_name": "尺重/标签辨识后换标上架",
  "missing_info": ["辨识方法", "新入库单号"],
  "clarification_message": "（给客户的追问话术）",
  "requirement_description": "（生成的需求描述，仅 phase=generate 时有值）",
  "requirement_background": "（生成的需求背景说明，仅 phase=generate 时有值）",
  "route_category": "standard | nonstandard_exempt | nonstandard_special | transfer_human",
  "customer_message": "（给客户看的完整回复）"
}
```

**Coze 设置**：
- 模型：使用空间默认（通常是豆包或 GPT-4）
- Temperature: 0.2（低创造性，高确定性）
- JSON Mode: 开启
- 对话记忆：开启（Coze LLM 节点默认带历史）

### 2.4 `vas_output_format` (代码节点, JavaScript)

**角色**：解析 LLM 的 JSON 输出，提取 `customer_message` 给下游 `输出` 节点推到气泡；版本 B 额外准备 `tool_call_send` 参数。

**输入**: `vas_guide_llm` 的 JSON 输出

**输出**：
```json
{
  "customer_reply": "（给客户看的完整文本，含需求描述格式化。接到输出节点 streamingOutput=true）",
  "should_send_tool": false,
  "function_name": "",
  "arguments": ""
}
```

`customer_reply` → 接 Coze `输出` 节点（`streamingOutput=true`，内容 `{{customer_reply}}`）→ 直接推到聊天气泡。

版本 B 额外：`should_send_tool=true` 时 → 接 `tool_call_send` 插件节点（`function_name` + `arguments` + `conversation_id` / `user_id` / `username`）。文本回复和工具指令**同时发出**，互不阻塞。

**输出流向（和 Query 完全一致）**：
```
vas_output_format
  ├─ customer_reply → [输出节点 streamingOutput=true] → 客户气泡
  ├─ (版本B) function_name + arguments → [tool_call_send 插件] → 前端 queryToolCall
  └─ → 结束节点（空，不带变量）
```

**文件**: `nodes/vas-output-format.coze.js` + `nodes/vas-output-format.ts`

---

## 3. Prompt 设计

### 3.1 System Prompt (`prompts/vas-guide-system.md`)

这是整个方案的核心。分为 6 个 Section：

#### Section 1: 角色定义

```
你是万邑联增值下单指引助手。客户从异常单进入增值产品信息页面时，你帮客户：
1. 理解客户的处理需求
2. 识别对应的增值场景
3. 检查信息是否齐全，缺什么就追问什么
4. 信息齐全后生成「需求描述」和「需求背景说明」，供客户一键填入表单

你的对话风格：
- 简洁、专业、一步到位。不要列一堆选项让客户自己选，帮客户选。
- 一次最多追问 2-3 个问题，不要一口气抛一堆。
- 不报价、不承诺审核结果、不描述仓库内部操作流程。
- 不要输出 AI 内部推理过程。
```

#### Section 2: 对话状态机

```
你根据对话历史判断当前处于哪个阶段：

阶段 A — 收集需求：
  客户刚描述了需求（或回答了你的追问）。
  你要做：识别场景 → 检查信息齐全性 → 决定追问还是生成。

阶段 B — 信息齐全，生成输出：
  所有必填信息已收集到。
  你要做：生成「需求描述」和「需求背景说明」，给客户确认。

阶段 C — 客户确认或修改：
  客户说「可以」「没问题」→ 输出最终版本。
  客户要求修改 → 调整后重新输出。

在每个阶段，你的 JSON 输出的 phase 字段不同：
  - 阶段 A 且信息不齐全 → phase="clarify"
  - 阶段 A/B 信息齐全 → phase="generate"
  - 场景无法识别或超出范围 → phase="transfer_human"
```

#### Section 3: 场景识别规则

```
根据客户描述，识别以下场景之一。如果客户描述模糊，从描述中主动推断（参考推断规则），不要列选项让客户选。

匹配时看客户描述中的关键动作词 + 处理对象。对照 {{scene_kb}} 中的场景信号。
```

> **这里注入 `{{scene_kb}}` 变量**，内容为场景知识库精编版（见 §3.2）。

#### Section 4: 信息齐全性检查

```
识别到场景后，对照该场景的「必填信息」列表逐条检查：

检查规则：
- 客户原文直接写了 → 有
- 可以从上下文推断出 → 有（例如：「整单处理」= 处理范围已知）
- 异常单号在开场话术中已有 → 有，不必再问
- 仓库信息在页面上下文中已有 → 有，不必再问
- 客户确实没提到 → 缺失，需要追问

宁可判为「有」也不要过度追问。追问太多客户会觉得 AI 不好用。
```

#### Section 5: 输出生成

```
当所有必填信息齐全时，生成两段文本：

1.「需求描述」— 用结构化的专业语言把客户的需求梳理清楚。包含：
   - 处理对象（异常单号、SKU、数量）
   - 处理动作（辨识换标/拍照/销毁/…）
   - 去向（上架到哪个入库单 / 销毁 / 自提）
   - 附件说明（如有）
   格式：简洁段落，不超过 300 字。

2.「需求背景说明」— 解释为什么需要这个增值服务。包含：
   - 异常原因
   - 为什么不能走标准流程
   格式：1-2 句话。

同时给出分流判断 route_category：
- "standard" — 可以走标准增值，建议客户返回选择标准产品
- "nonstandard_exempt" — 非标免审（命名服务），选对应产品即可
- "nonstandard_special" — 非标特批（其他服务需求），需要填写需求描述
- "transfer_human" — 无法处理，建议转人工
```

#### Section 6: JSON 输出格式

```
每次回复必须输出以下 JSON（严格遵守，不要有多余字段）：

{
  "phase": "clarify | generate | transfer_human",
  "matched_scene": "场景key（如 inbound_label_identify），未识别时空字符串",
  "matched_scene_name": "场景中文名",
  "missing_info": ["缺失字段1", "缺失字段2"],
  "clarification_message": "给客户的追问（phase=clarify时）",
  "requirement_description": "生成的需求描述（phase=generate时）",
  "requirement_background": "生成的需求背景说明（phase=generate时）",
  "route_category": "standard | nonstandard_exempt | nonstandard_special | transfer_human",
  "customer_message": "给客户看的完整回复（这是实际展示给客户的文本）"
}

customer_message 是客户看到的回复。其他字段是给下游代码节点用的。
```

### 3.2 场景知识库 (`prompts/vas-guide-kb-scenes.md`)

从 `internal-review-copilot/knowledge/scenario-cards/` 精编。V1 覆盖以下场景（有 `requiredInfoFields` 的优先）：

| 场景 key | 场景名 | 类别 | 优先级 |
|---|---|---|---|
| `inbound_label_identify` | 尺重/标签辨识后换标上架 | 入库 | 高频 |
| `inbound_package_exception_relabel_shelving` | 包裹类异常换商品标签上架 | 入库 | 高频 |
| `inbound_photo_hold` | 指定商品拍照暂存 | 入库 | 高频 |
| `inbound_package_barcode_batch_relabel` | 包裹条码批量异常补贴标签上架 | 入库 | 中频 |
| `inbound_third_party_merchandise_barcode` | 关联第三方条码上架 | 入库 | 中频 |
| `instock_relabel_change_sku` | 库内指定商品更换标签上架(换SKU) | 库内 | 中频 |
| `instock_photo_video` | 库内拍摄照片/视频 | 库内 | 中频 |
| `instock_ownership_transfer` | 库内货权转移 | 库内 | 中频 |
| `instock_inventory_freeze` | 库内库存冻结/解冻 | 库内 | 低频 |
| `instock_good_to_defective` | 良品转不良品上架 | 库内 | 低频 |

每个场景条目格式：
```
### 场景: {scene_name} (key: {scene_key})
类别: {category}
识别信号:
  强信号: {strong signals}
  弱信号: {weak signals}
排除信号: {negative signals}
必填信息:
  1. {field}: {description}（例: {examples}）
  2. ...
可选信息:
  1. {field}: {description}
  2. ...
```

**数据来源**: 直接从 `knowledge/scenario-cards/*.json` 的 `positiveSignals`, `negativeSignals`, `requiredInfoFields`, `optionalInfoFields` 字段提取。

**脚本**: 写一个 `scripts/build-vas-guide-kb-scenes.ts` 从场景卡 JSON 自动生成此文件。

### 3.3 流程语境知识库 (`prompts/vas-guide-kb-flow-context.md`)

直接复用 `vas/engine/prompts/kb-flow-context.md`，**不做修改**。内容包括：
- 入库三阶段（S1 卸货到仓 / S2 验货核对 / S3 上架入库）
- 异常类型与阻断阶段
- PSC 差异矩阵
- 流程复原目标速查

### 3.4 推断规则知识库 (`prompts/vas-guide-kb-rules.md`)

从 `vas/engine/prompts/kb-inference-rules.md` + `kb-decision-system-prompt.md` 合并精简：
- 保留推断规则表（IR-B0102E23-001~006, IR-B03E03-001~004）
- 保留禁止项（不推荐 forbiddenProducts、不编造、不报价）
- **去掉** VASC 编码相关内容（客户侧不需要知道 VASC code）
- **新增** 客户侧分流规则：
  - 客户描述命中标准增值产品 → route_category="standard"
  - 命中命名非标服务（A类5个：货权转移、审计盘点、代采购包材、DG商品销毁） → route_category="nonstandard_exempt"
  - 命中有模板的非标场景（B类） → route_category="nonstandard_special"
  - 无法匹配 / C类无模板 → route_category="transfer_human"

---

## 4. 代码节点实现规格

### 4.1 `vas-guide-router.coze.js`

基于现有 `page-link-probe.coze.js` 改写。保留：
- `unwrapParams()`, `asText()`, `compactChat()`, `extractEventNo()` 等工具函数
- `looksLikeDehydratedDom()` 判断（保留读页能力）
- `buildListBody()` + `listCardArguments()` 读页出卡逻辑

修改：
- `isForcedExceptionAsk()` 更新匹配句式为 `我的异常单{EB}应该提交哪个增值产品`
- `main()` 返回值改为 `{ route, event_no, user_input, ... }` 格式
- 新增路由分支：
  - 触发句 → `route="greeting"`
  - 脱水 DOM → `route="page_tool"`（复用原有 send() 逻辑）
  - 其他 → `route="guide"`

### 4.2 `vas-output-format.coze.js`

```javascript
async function main(args) {
  const params = unwrapParams(args);
  const llmOutput = parseJson(params.llm_output || params.LLM_OUTPUT || "{}");

  // 降级：LLM 没返回有效 JSON
  if (!llmOutput || !llmOutput.customer_message) {
    return {
      customer_reply: "抱歉，我暂时无法处理您的请求，请联系人工客服。",
      should_send_tool: false,
      function_name: "",
      arguments: "",
    };
  }

  // phase=generate 时，在客户消息后附加格式化的需求描述（版本A：供客户复制）
  var reply = llmOutput.customer_message;
  if (llmOutput.phase === "generate" && llmOutput.requirement_description) {
    reply += "\n\n---\n";
    reply += "【需求描述】（请复制到表单「需求描述」字段）\n" + llmOutput.requirement_description;
    if (llmOutput.requirement_background) {
      reply += "\n\n【需求背景说明】（请复制到表单「需求背景说明」字段）\n" + llmOutput.requirement_background;
    }
    reply += "\n---\n\n如需修改请直接告诉我，确认无误后请复制到表单提交。";
  }

  return {
    customer_reply: reply,        // → 接 输出节点(streamingOutput=true) → 客户气泡
    should_send_tool: false,      // V1 不调工具；版本B改为true + 下面两个字段
    function_name: "",            // 版本B: "renderA2UI"
    arguments: "",                // 版本B: JSON.stringify({commands:[...]})
  };
}
```

**下游接线**：
- `customer_reply` → Coze `输出` 节点（`streamingOutput=true`，内容 `{{customer_reply}}`）→ 聊天气泡
- `should_send_tool=true` 时（版本B）→ `function_name` + `arguments` + `conversation_id`/`user_id`/`username` → `tool_call_send` 插件 → 前端 `queryToolCall`
- 最后 → 结束节点（空，不带变量）

---

## 5. 文件清单

所有文件在 `D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\` 下：

```
nodes/
  vas-guide-router.coze.js          ← 路由代码节点（贴进 Coze）
  vas-guide-router.ts               ← TypeScript 源（本地测试用）
  vas-output-format.coze.js         ← 输出格式化代码节点
  vas-output-format.ts              ← TypeScript 源

prompts/
  vas-guide-system.md               ← LLM 系统 prompt（贴进 Coze LLM 节点）
  vas-guide-kb-scenes.md            ← 场景知识库（贴进 Coze Text 节点）
  vas-guide-kb-flow-context.md      ← 流程语境（复制 vas/engine 同名文件）
  vas-guide-kb-rules.md             ← 推断规则（精简合并版）

scripts/
  build-vas-guide-kb-scenes.ts      ← 从场景卡 JSON 自动生成 kb-scenes.md
  test-vas-guide-router.ts          ← router 代码节点单测
  test-vas-guide-system.ts          ← prompt dry-run 测试（发给 LLM 验证输出格式）
  test-vas-output-format.ts         ← output format 代码节点单测

coze-import/
  导入-vas-guide.md                 ← Coze 导入/连线操作手册
```

---

## 6. 测试计划

### 6.1 代码节点单测 (`test-vas-guide-router.ts`)

**路由判定**：

| 输入 | 期望 route | 期望 event_no |
|---|---|---|
| `我的异常单EB0126092143应该提交哪个增值产品` | `greeting` | `EB0126092143` |
| `我的异常单EB0126092143应该提交哪个增值产品？` | `greeting` | `EB0126092143` |
| `帮我辨识后换标上架到新入库单WI50259337` | `guide` | `` |
| `你好` | `guide` | `` |
| `链路测试` | `page_tool` | `` |
| `TEST_PAGE_READ` | `page_tool` | `` |
| `读页测试` | `page_tool` | `` |
| `出卡测试` | `page_tool` | `` |
| `TEST_CARD` | `page_tool` | `` |
| `{"dehydrated":true,"interactiveElements":[...]}` | `page_tool` | `` |

**page_tool 分支输出验证**：

| 输入 | 期望 function_name | 期望 arguments 包含 |
|---|---|---|
| `读页测试` | `pageRead` | `"reason":"channel_test"` |
| `链路测试` | `pageRead` | `"reason":"link_probe"` |
| `出卡测试` | `renderA2UI` | `"commands":[`, `selectOption` |
| `fixtures/turn-dehydrated-dom-list.json` 的内容 | `renderA2UI` | `"commands":[`, `读页清单` |

**脱水 DOM 解析验证**（用 `fixtures/turn-dehydrated-dom-list.json`）：

| 检查项 | 期望 |
|---|---|
| 卡片标题 | `读页清单（先不点页）` |
| 列出 3 个元素 | `#0 原单上架`, `#1 入库其他服务需求`, `#2 需求描述` |
| 文案命中 | `原单上架、入库其他服务需求` |

### 6.2 Prompt Dry-Run (`test-vas-guide-system.ts`)

用 LLM API 直接调用，验证输出 JSON 格式正确：

| 测试场景 | 模拟对话 | 期望 phase | 期望 route_category |
|---|---|---|---|
| 清晰描述-辨识换标 | "帮我把这批264箱货物辨识后换标上架到新入库单WI50259337，包裹和SKU的对应关系见附件" | `generate` | `nonstandard_special` |
| 模糊描述 | "帮我处理下这批货" | `clarify` | — |
| 拍照暂存 | "先拍照看看什么情况" | `clarify` (缺拍摄要求细节) | — |
| 超出范围 | "帮我查一下这个快递到哪了" | `transfer_human` | `transfer_human` |
| 标准增值 | "帮我做一下轻加工" | `generate` | `standard` |

### 6.3 集成测试流程

#### 6.3a 通道测试（page_tool 分支，不依赖 LLM）

1. 代码节点单测 → page_tool 路由 + DOM 解析全绿
2. 贴进 Coze 画布试运行：
   - `读页测试` → 插件绿，`function_name=pageRead`，气泡"正在读取页面…"
   - `出卡测试` → 插件绿，`function_name=renderA2UI`，气泡"已发出测试卡片"
   - 贴 `fixtures/turn-dehydrated-dom-list.json` 内容 → 插件绿，侧栏出「读页清单」卡片
3. 真页联调（需要前端就绪）：
   - `读页测试` → 前端读页 → DOM 回传 → 清单卡 → 完整 Step 1-2 通路
   - 点卡片按钮 → 前端执行 selectOption → Step 3 通路

#### 6.3b 指引测试（guide 分支）

1. Prompt dry-run 5 个场景通过
2. 贴进 Coze 画布试运行：
   - Turn 1: `我的异常单EB0126092143应该提交哪个增值产品` → 应输出开场话术
   - Turn 2: `帮我辨识后换标上架` → 应追问（缺新入库单号、对应关系等）
   - Turn 3: `新入库单WI50259337，对应关系见附件，共264箱` → 应生成需求描述

#### 6.3c 通路可以独立于指引先测

page_tool 分支**全部是代码节点 + 插件**，不依赖 LLM prompt 和场景知识库。Cursor 可以先交付 router + page_tool 测试通过，再做 guide 分支的 prompt。

---

## 7. Coze 连线指南 (`coze-import/导入-vas-guide.md`)

### 7.1 在现有画布 `cs_Bot_Client_v2p_link` 上改

1. **替换代码节点**: 把 `page_link_probe` 的代码替换为 `vas-guide-router.coze.js`
2. **加 LLM 节点**: `vas_guide_llm`
   - System Prompt: 贴 `prompts/vas-guide-system.md`
   - 加 Text 节点注入 `prompts/vas-guide-kb-scenes.md` → 变量名 `scene_kb`
   - 加 Text 节点注入 `prompts/vas-guide-kb-flow-context.md` → 变量名 `flow_context_kb`
   - 加 Text 节点注入 `prompts/vas-guide-kb-rules.md`（拼入 system prompt 或单独注入）
   - 输入: `user_input` 从 router, `event_no` 从 router
   - JSON Mode: 开
3. **加代码节点**: `vas_output_format`，贴 `vas-output-format.coze.js`
4. **加 2 个输出节点**（Coze 画布「输出」类型节点，`streamingOutput=true`）：
   - `输出_greeting`: 内容 `{{greeting_text}}`，接在 router 的 greeting 分支后
   - `输出_guide`: 内容 `{{customer_reply}}`，接在 `vas_output_format` 后
5. **改选择器**: `route_switch` 读 router 的 `route` 字段
   - `route == "greeting"` → `输出_greeting`（streamingOutput=true）→ 结束（空）
   - `route == "guide"` → `vas_guide_llm` → `vas_output_format` → `输出_guide`（streamingOutput=true）→ 结束（空）
   - `route == "page_tool"` → `tool_call_send_page` → 结束（空）
   - 否则 → Query → 结束（空）
   **所有分支汇入同一个空结束节点**。客户看到的文字只从 `输出` 节点出来。

### 7.2 不要动的

- Query `cs_Default_Query_v4_staging_F` 内部不动
- 现网 Bot / recaller / expert 不动
- 绑用户那条线不动

---

## 8. 给 Cursor 的执行指令

> **工作目录**: `D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\`
> **不要** 在 `D:\DA` 根新建文件。
> **不要** 修改 `internal-review-copilot/` 或 `vas/engine/` 的文件，只读取。

### Step 1: 生成场景知识库

写 `scripts/build-vas-guide-kb-scenes.ts`：
- 读 `../internal-review-copilot/knowledge/scenario-cards/*.json`
- 筛选 `status !== "retired_dedicated_atom"` 且 有 `requiredInfoFields` 的卡
- 按 §3.2 格式输出到 `prompts/vas-guide-kb-scenes.md`
- 运行: `npx tsx scripts/build-vas-guide-kb-scenes.ts`

### Step 2: 写 prompt 文件

按 §3 的设计写 4 个 prompt 文件。其中：
- `vas-guide-kb-flow-context.md` 直接复制 `../vas/engine/prompts/kb-flow-context.md`
- `vas-guide-kb-rules.md` 从 `../vas/engine/prompts/kb-inference-rules.md` + `kb-decision-system-prompt.md` 精简合并
- `vas-guide-system.md` 按 §3.1 的 6 个 Section 组装

### Step 3: 写代码节点

按 §4 写 4 个文件（.ts + .coze.js 各两对）。`.coze.js` 版本：
- 不要 TypeScript 类型注解
- 要有 `unwrapParams()`
- 入口 `async function main(args)`
- 参考 `nodes/page-link-probe.coze.js` 的模式

### Step 4: 写测试

按 §6 写 3 个测试文件。运行方式：
```powershell
cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
npx tsx ../cs-eds-page-bridge/scripts/test-vas-guide-router.ts
npx tsx ../cs-eds-page-bridge/scripts/test-vas-guide-system.ts
npx tsx ../cs-eds-page-bridge/scripts/test-vas-output-format.ts
```
（利用 internal-review-copilot 的 tsconfig 和 node_modules）

### Step 5: 写导入手册

按 §7 写 `coze-import/导入-vas-guide.md`。

### Step 6: 更新 HANDOFF

在 `_workflow/20260922_cs_eds_page_bridge_handoff/HANDOFF.md` 的「当前状态」表格和「下一步计划」中补充 VAS 指引 workflow 的进展。

---

## 9. 关键设计决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| VAS 指引作为独立 workflow，不接 expert | 独立 | 不和现有 expert/recaller 耦合，可独立迭代 |
| 多轮对话用 LLM 节点自带记忆 | LLM 记忆 | 最简实现；无需 Coze 变量管理 |
| 场景识别用 LLM 而非规则引擎 | LLM | Coze 代码节点无法跑 match-template.ts 的复杂逻辑；LLM 配合场景卡知识足够 |
| V1 先做纯文本输出 | 版本 A | 即使工具不通，客户也能手动复制；先验证业务价值 |
| 所有场景覆盖 | V1 只做有 requiredInfoFields 的 ~30 张卡 | 这些有结构化必填字段，追问逻辑质量高；其余走兜底 |
| SOP 生成 | 不做（已移到 TOM 内部） | 客户侧只需要需求描述和需求背景，不需要 SOP |
| 触发句 | `我的异常单{EB}应该提交哪个增值产品` | 和前端代发原文对齐（待确认） |
