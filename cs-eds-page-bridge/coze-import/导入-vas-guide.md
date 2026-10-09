# 导入：VAS 指引（替换 page_link_probe）

在现有试验画布 **`cs_Bot_Client_v2p_link`** / `7687981752618582066` 上改，**不要新建对话流、不要覆盖现网 v2p**。

## 0. 用现成 zip 覆盖导入（按这个做）

包：[`cs_Bot_Client_v2p_link_vas.zip`](cs_Bot_Client_v2p_link_vas.zip)  
从你导出的 `Chatflow-cs_Bot_Client_v2p_link-draft-9189.zip` 改出来，**画布 id 没变**。

1. Coze → 对话流 → 导入 → 选这个 zip
2. 提示覆盖 **`cs_Bot_Client_v2p_link`** 时：**确认覆盖**（就是 7687981752618582066 这张）
3. 如果问要不要覆盖 `cs_Bot_Client_v2p` / `v2p_1` / `v2p_3`：**一律取消**
4. **不要选新建**。新建会把 Query 子流程弄丢
5. 打开后核对下面「贴完以后长这样」；LLM 模型若空白，选空间里已有的豆包/GPT，JSON Mode 打开
6. 测试 Bot 增加用户变量 **`_vas_guide_active`**（文本，默认空）。没有也能跑：增值关键词仍进指引，打招呼进 Query；短句续聊会弱一点
7. 发布这张试验画布。测试 Bot 再绑它。现网 Bot 不要绑

下面 1–5 节是同一套改动的对照清单（zip 里已经改好）。若覆盖后某格代码是空的，再按节把 `*.coze.js` / prompt 贴回去。

客户能看见的字，只从画布上的 **「输出」** 节点出来（流式）。结束节点保持空。不要给结束节点加 Output 去对齐导出文件。

V1 只做纯文本。读页清单卡仍保留：输入像脱水 DOM 时走原来的 `tool_call_send`（灰度插件，不要换成现网 cobra）。

## 贴完以后长这样

```
A/B 客户分流
  → vas_guide_router
  → assign_vas_session（记住是否在增值会话）
  → [选择器] route_switch   读 router 的 route
       route = greeting   → 输出_greeting（{{greeting_text}}）→ 结束（空）
       route = guide      → 三份知识库 → LLM → vas_output_format
                            → 输出_guide（{{customer_reply}}）→ 结束（空）
       route = page_tool  → tool_call_send（灰度插件）→ 结束（空）
       否则 / route=query → Query（线上 cs_Default_Query_v4_staging_F）→ 结束（空）
绑用户「新增数据」那条线不要动
```

谁走哪条：

| 客户说 | 走哪 |
|---|---|
| `我的异常单EB…应该提交哪个增值产品` / `链路测试` | greeting 开场 |
| 上架 / 换标 / 辨识 / 拍照 / 入库单 WI… 等增值话 | guide |
| 会话中的短句（如「商品条码异常」「你可以查信息」） | 仍走 guide |
| `你好`、查运费、退出、其它普通问题 | **Query 普通客服** |
| 脱水 DOM | page_tool 清单卡 |

所有分支汇入**同一个空结束节点**。

## 1. 替换代码节点

1. 打开原来的 `page_link_probe` 格子（也可以改名叫 `vas_guide_router`）
2. 语言必须是 **JavaScript**（language 5），不要 TypeScript
3. 整段换成 [`nodes/vas-guide-router.coze.js`](../nodes/vas-guide-router.coze.js)
4. 输入仍接开始节点：`USER_INPUT` / `user_input`，以及 `_conversation_id` `_user_id` `_username` `_customer_code`（和现在插件那格一样）
5. 确认输出字段里能看到：`route`、`event_no`、`user_input`、`greeting_text`、`conversation_id`、`user_id`、`username`、`should_send`、`function_name`、`arguments`

触发句（和前端代发对齐）：

> 我的异常单{EB}应该提交哪个增值产品

画布试跑仍可用：`链路测试`。这两句现在都进 **greeting**，**不再直接 pageRead**。

## 2. 改选择器

原来读 `should_send` 的 `if_should_send` 改成读 **`route`**（名字可改成 `route_switch`）。

| 条件 | 接到哪 |
|---|---|
| `route == "greeting"` | 新增的「输出_greeting」 |
| `route == "guide"` | 新增的 LLM 格子 |
| `route == "page_tool"` | 原来的 `tool_call_send_page`（参数仍用 `function_name` + `arguments` + 会话三个字段） |
| 否则 | 原来的 Query 子流程 |

插件五个入参不要改：`function_name`、`arguments`（必须是 JSON 字符串）、`conversation_id`、`user_id`、`username`。

## 3. 开场输出节点

加一个 Coze **输出** 节点，勾选流式（`streamingOutput=true`）。

- 名字：`输出_greeting`
- 内容：`{{greeting_text}}`（来自 router）
- 线：选择器 greeting → 这一格 → 结束（空）

不要把开场话术接到结束节点。

## 4. LLM + 三份知识

加 LLM 节点，名字 `vas_guide_llm`。

- 系统提示：整份贴 [`prompts/vas-guide-system.md`](../prompts/vas-guide-system.md)
- 温度 0.2
- JSON Mode：开
- 对话记忆：开（默认即可）
- 输入：
  - `user_input` ← router
  - `event_no` ← router
  - `scene_kb` ← Text 节点，贴 [`prompts/vas-guide-kb-scenes.md`](../prompts/vas-guide-kb-scenes.md)
  - `flow_context_kb` ← Text 节点，贴 [`prompts/vas-guide-kb-flow-context.md`](../prompts/vas-guide-kb-flow-context.md)
  - `inference_rules_kb` ← Text 节点，贴 [`prompts/vas-guide-kb-rules.md`](../prompts/vas-guide-kb-rules.md)

三份 Text 要填进系统提示里对应的 `{{scene_kb}}` `{{flow_context_kb}}` `{{inference_rules_kb}}`。场景卡约 32 张，长文是正常的。

场景卡改了以后，在本机重跑：

```powershell
cd D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge
npx tsx scripts/build-vas-guide-kb-scenes.ts
```

再把生成的 `vas-guide-kb-scenes.md` 贴回 Text 节点。

## 5. 格式化代码 + 指引输出节点

1. 加代码节点 `vas_output_format`，语言 JavaScript，贴 [`nodes/vas-output-format.coze.js`](../nodes/vas-output-format.coze.js)
2. 输入：`llm_output` ← LLM 节点的输出
3. 再加一个 **输出** 节点 `输出_guide`，流式打开，内容 `{{customer_reply}}`
4. 线：LLM → 格式化代码 → 输出_guide → 结束（空）

V1 **不要**从格式化节点再接 `tool_call_send`。`should_send_tool` 恒为 false。版本 B 再接卡片。

## 6. 不要动的

- Query `cs_Default_Query_v4_staging_F` 内部
- 现网 Bot / recaller / expert
- 绑用户那条线
- 现网 Bot Client `7498200020837040179`
- 结束节点继续空；不要为了「和工作流导出一致」去加 Output

## 7. 画布怎么测

试运行账号可用：`_customer_code=10006189` `_user_id=265302` `_username=ying.jin@winit.com`

| 轮 | 输入 | 你应看到 |
|---|---|---|
| 1 | `我的异常单EB0126092143应该提交哪个增值产品` | 开场话术，**不进 Query** |
| 2 | `帮我辨识后换标上架` | 指引追问（尽量只问 1 个缺口） |
| 3 | `新入库单WI50259337，对应关系见附件，共264箱` | 生成需求描述 + 需求背景 |
| 对照增值 | `我要把这个包裹上架到入库单 WI88930505` | 走指引，不要进 Query |
| 对照普通 | `你好` | **进 Query 普通客服**，有回复 |
| 对照 DOM | 脱水 DOM JSON | page_tool 清单卡 |

指引追问过严可以以后单独改 `vas_guide_llm` 的 prompt，不必再动 Query。

## 8. 测试 Bot

侧栏要看到回复，测试 Bot `7680824665929056310` 必须绑这张 **v2p_link** 画布。没绑的话，画布绿灯、聊天窗仍是旧对话流。

不要绑现网 Bot `7447371549063626790`。
