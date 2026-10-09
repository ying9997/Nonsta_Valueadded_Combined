# HANDOFF

智能客服 **EDS 页面操作**（读页 / 出卡 / 点页）通道。  
日期：2026-09-22。空间：Coze `7417755373999767571`。  
项目目录：`D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge`

本文件给**完全没有上下文的新会话**。说明书 `README.md` 里仍混有旧方案（Query 后插三格、标识通道），**接线以本文「当前权威架构」为准**。

VAS 指引（大脑层）本地文件已按 `_workflow/20260922_vas_guide_design/TASK_SPEC.md` 落在 `cs-eds-page-bridge/`。**画布上还没贴**，试验画布仍是 `page_link_probe`。贴法见 `cs-eds-page-bridge/coze-import/导入-vas-guide.md`。

---

## 给新会话的背景

用户要的不是再做一套客服，而是：卖家在 EDS 增值下单页打开智能客服侧栏时，AI 能让前端 **读当前页、弹出操作卡、按卡去点页面**。

强制唤起客服时，前端会**自动代发**一句客户问题。用户定的正式入口是：

> 我的异常单{EventNO}应该提交哪个增值产品？

这句 → 跳过 Query / expert，直接发 `pageRead`。  
其它问题 → 常规 Query / expert。  
读页 JSON 回来 → 先出「读页清单」卡，**先不点页**。

分层（外→内，不要打乱）：

```
EDS 下单页侧栏（前端：A2UI + page-agent 读/点页）
  → 智能客服后台（已有；queryToolCall 轮询 cobra）
    → 最外层对话流 Bot Client
      → 子流程 Query（真正问答）
        → experts_recaller
          → 各个 expert
```

阶段一只证明**通道**。场景 / SOP / 填哪几个字段是阶段二。内部审核 Copilot 不是这条线。

---

## 当前权威架构

正式画布：**`cs_Bot_Client_v2p_link`** / `7687981752618582066`

```
A/B 客户分流
  → page_link_probe          （代码，JavaScript）
  → if_should_send
       真 → tool_call_send_page → 结束     ← 强制唤起问句 / 读页回传
       假 → Query（cs_Default_Query_v4_staging_F）→ 结束
绑用户「新增数据」那条线不要动
```

`page_link_probe` 必须在选择器**前面**。选择器读它的 `should_send`。

贴上 VAS 指引之后（文件已齐，**画布尚未替换**）应变为：

```
A/B 客户分流
  → vas_guide_router
  → route_switch
       greeting  → 输出_greeting（{{greeting_text}}）→ 结束（空）
       guide     → vas_guide_llm → vas_output_format → 输出_guide（{{customer_reply}}）→ 结束（空）
       page_tool → tool_call_send_page → 结束（空）
       否则      → Query → 结束（空）
```

| 客户这句话 | 贴 VAS 之前（当前画布） | 贴 VAS 之后 |
|---|---|---|
| `我的异常单EB…应该提交哪个增值产品` | `pageRead` | **greeting** 固定开场，不调 pageRead |
| `链路测试` / `TEST_LINK` | 同上读页 | **greeting**（测试开场） |
| 脱水 DOM | `renderA2UI` 清单卡 | 仍是 **page_tool** 清单卡 |
| 其它（你好、辨识换标…） | Query / expert | **guide** LLM（V1 不进 Query） |

| 客户这句话 | 节点做什么 |
|---|---|
| `我的异常单EB…应该提交哪个增值产品`（可有空格、问号） | `pageRead`，arguments 带 `reason=forced_exception_ask` 和 `event_no` |
| `链路测试` / `TEST_LINK` | 同上读页（只给画布试跑） |
| 下一轮输入像脱水 DOM（`interactiveElements` / `dehydrated` / `page-agent`） | `renderA2UI` 清单卡，标题「读页清单（先不点页）」，**不要** `operatePage` / `selectOption` |
| 其它（你好、运费…） | `should_send=false` → Query |

插件仍是现网那套：`cobra_agent_http` / `tool_call_send`。五个入参：`function_name`、`arguments`（**必须是 JSON 字符串**）、`conversation_id`、`user_id`、`username`。

发给前端的两句口令：

| 后台 tool 名 | 谁执行 | 注意 |
|---|---|---|
| `pageRead` | 前端收到就读当前 EDS 页 | 不是卡片按钮名 |
| `renderA2UI` | 前端按 catalog `ai-chatbot-builtin` v0.9 画卡 | `arguments.commands` 数组 |
| 卡片按钮 `readPage` / `operatePage` | 用户点卡后前端自己做 | **不要**再单独发一条 `operatePage` 的 `tool_call_send` |
| catalog `selectOption` | `[index, 页上看得见的原文]` | 不要用 `clickElement(0)` 当真选中 |

扣子代码节点语言是 **JavaScript（language 5）**。贴 `*.coze.js`，不要贴带类型的 `*.ts`。

---

## Coze ID（核对用）

| 名字 | ID | 现在怎么用 |
|---|---|---|
| 空间 | `7417755373999767571` | 全在这个空间 |
| 现网 Query | `cs_Default_Query_v4_staging_F` / `7681286672969678888` | **不要改内部**；v2p_link 只引用它当子流程 |
| 现网 Bot Client | `cs_Bot_Client_v2p` / `7498200020837040179` | 现网客服外层。曾被改过；**不要再往现网叠测** |
| 测试副本 v2p_1 | `7685975376836739124` | 较早的测试对话流（Query 后三格那套） |
| 测试副本 v2p_3 | `7686800546686418959` | 2026-09-21 更新过，描述「万邑联客服上下文管理」 |
| **正式试验画布** | **`cs_Bot_Client_v2p_link` / `7687981752618582066`** | Query 前选择器。2026-09-21 试运行已绿 |
| 独立探测对话流 | `7687975722099572771` | 导入快捷包，**没有嵌进 Bot Client**，不要当正式入口 |
| smoke 小工作流 | `page_intent_emit_smoke` / `7685762023372046362` | 只测 JSON 形状，不是客服主链 |
| 测试 Bot | `【测试 - 图片识别】客服-全场景-Default` / `7680824665929056310` | 应绑 v2p_link；2026-09-21 查到 **workflow 列表空，没绑上** |
| 现网 Bot | `客服-全场景-Default` / `7447371549063626790` | **不要绑试验画布、不要拿来测短句** |
| 插件 | `cobra_agent_http` `7473322438084935720`，接口 `tool_call_send` `7473425348437475378` | 复制已有「函数调用」，不要用 cobra OMS 那张工作流 |

画布链接：  
https://www.coze.cn/work_flow?workflow_id=7687981752618582066&space_id=7417755373999767571

已绿的一次执行：  
https://www.coze.cn/work_flow?execute_id=7687986724261642278&space_id=7417755373999767571&workflow_id=7687981752618582066&execute_mode=2

---

## 探索过程（怎么走到现在）

按时间，只记后来还影响决策的事。

### 1. 先定通道，不准动现网 Query / recaller

智能客服已经能聊天。页面能力（读 DOM、画 A2UI、点选）在前端。AI 侧只要发出 `pageRead` / `renderA2UI`。  
不要新开 cobra 接口。Query 里已有「函数调用」= `tool_call_send`（现在用来发「正在思考」`stage`）。复制一格，改 `function_name`。

`Workflow-cobra_api_1-draft-611` 是同一插件的**另一个接口（查 OMS）**，不是这个。

### 2. 标识通道（sidecar）和插件通道是两条线

一度想让专家在 `analysis` 后面跟 `<!--SIDECAR_BEGIN-->`，Query 副本 F_1 拆走，Bot Client 再转插件。卖家气泡只留人话。  
探测：Chat API 气泡里**看不到**标识，也看不到 `renderA2UI`。插件走 cobra，Chat 列表验不出来。  
**验收不要混：** 标识有没有活过 A1 ≠ 插件有没有进 `queryToolCall`。

通道方案对比（甲继续走插件转发）：  
`D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\_runs\20260917_channel_compare\方案对比与探测报告.md`

### 3. 第一版接线：Query **后面**插三格

`page_intent_emit` → 选择器 → `tool_call_send_page`。短句「出卡测试 / 读页测试 / 点页测试」。  
踩坑：代码节点贴了 TS / `main({params})`，扣子传入扁平字段 → 输出全 null，选择器走否则，插件没调。要 `unwrapParams`，贴 `.coze.js`。

### 4. 插件「成功」但前端空；不是字数限额

- 短包 `createSurface`（约 103 字符）能进 `queryToolCall`，侧栏仍空。  
- 带标题正文的卡、SOP 卡一度被当成「太长」。后台后来说：**不是长度，是解析 / 签名原文**。  
- 签名要对齐插件 Python：`token + action+app_key+data+format+platform+sign_method+timestamp+version + token`；`data` 用 `json.dumps(sort_keys=True, separators=(',',':'), ensure_ascii=False)`；`toolCall.id = base64(userId+conversationId+timestamp+function_name)`，不要把 arguments 塞进 id，不要把中文转 `\u`。  
对照：`scripts/tool-call-send.py`、`contracts/给后台-sop卡-renderA2UI.md`。  
插件成功长这样：`code "0"`、`isSuccess true`、`msg 操作成功`、**`data: null` 就是成功**。

### 5. 出卡成功但页没动 → 改成「先读页」

写死 `selectOption [0,原单上架]/[1,入库其他服务需求]` 在真页上对不上。  
用户定：先读页拿到 `interactiveElements` 的 **index**，再出清单卡，**先不点**。点页以后用真编号。前端说和 page-agent 一致：`clickElement(index)` / `selectOption(index, 可见原文)`。catalog **没有** `dom_id` 字段；编号就是数组下标（也要能读 `idx` / `highlightIndex` / `dom_id` 别名）。

### 6. 架构纠正：选择器在 Query **前面**

用户明确：强制唤起时不该先跑 expert。  
独立导入的 `page_link_probe` 对话流（`7687975722099572771`）**没有**嵌进 Bot Client，架构错了。  
正确：在 Bot Client 上、进 Query 之前分叉。zip 从  
`D:\DA\Nonsta_Valueadded_Combined\Chatflow-cs_Bot_Client_v2p_1-draft-8069.zip`  
改出 `cs_Bot_Client_v2p_link.zip`。Query **只引用 workflowId**，不要打进 zip（打进去会覆盖现网 Query）。扣子「新建」导入常丢掉 Query 子流程格子，要手补「工作流」节点。

补 Query 时曾把线接反：`page_link_probe` 晾成断头，选择器插在 A/B 和 Query 中间。必须：A/B → probe → 选择器。

### 7. 正式触发从「链路测试」改成代发问句

用户：强制唤起会自动代发。认这句（2026-09-22 已从「怎么处理」改成）：

`我的异常单` + `EB` 单号 + `应该提交哪个增值产品`

没有单号、或不是「我的异常单」开头 → 走 expert。旧句「怎么处理」不再调工具。

### 8. 2026-09-21 真实账号试运行（已验证）

参数：`_user_id=265302`、`_username=ying.jin@winit.com`、`_customer_code=10006189`、  
`USER_INPUT=我的异常单EB0126092112345678怎么处理`、`_conversation_id=cs-eds-link-265302-20260921`

画布三格全绿：`page_link_probe` 抽出单号并 `pageRead`；选择器真分支；插件「操作成功」；Query 未跑。  
接口 `workflow/run` 也是 Success、4 秒、0 token（没进 expert）。  
测试 Bot Chat API **没跑通**（Bot 未绑这张对话流）。  
侧栏是否收到 `queryToolCall=pageRead`：**本会话未在 EDS 页验证**。

---

## 已完成的产物

权威都在 `D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge`。不要在 `D:\DA` 根新建。

### 给人看的说明书 / 接线

| 路径 | 用途 | 状态 |
|---|---|---|
| `cs-eds-page-bridge\README.md` | 项目说明书；**后半仍有 Query 后插三格的旧步骤** | 混旧文；接线看本 HANDOFF |
| `cs-eds-page-bridge\coze-import\导入-v2p-link.md` | 正式包怎么导入、怎么补 Query、怎么测代发问句 | 现行接线说明 |
| `cs-eds-page-bridge\coze-import\导入-链路探测.md` | 独立探测包（无 Query） | 仅冒烟，不是正式入口 |
| `cs-eds-page-bridge\coze-import\接线-v2p3-Query前选择器.md` | 手改 v2p_3 的步骤 | 可参考；现用的是新建的 v2p_link |
| `cs-eds-page-bridge\coze-import\接线-Bot-Client.md` | **旧**：Query 后三格 + sidecar | 不要当现行步骤 |
| `cs-eds-page-bridge\coze-import\导入并测试.md` | smoke 小工作流 | 只测 JSON |
| `cs-eds-page-bridge\coze-import\导入Query副本.md` | F_1 sidecar 出口 | 标识通道；现网 Query 不要用这包覆盖 |

### 扣子节点（贴画布）

| 路径 | 用途 | 状态 |
|---|---|---|
| `nodes\page-link-probe.coze.js` | **现行**代码节点（贴这个） | 已本地单测 PASS |
| `nodes\page-link-probe.ts` | 同源 TS，方便测 | 不要贴进扣子 |
| `nodes\page-intent-emit.coze.js` | 旧：出卡测试 / SOP 卡 | 现网试验画布已换成 probe |
| `nodes\page-intent-emit.ts` | 同上 | 同上 |
| `nodes\extract-sidecar.ts` | 标识通道拆包 | 未接进 v2p_link |

### 可导入包（zip 可能被 gitignore，以磁盘为准）

| 路径 | 用途 |
|---|---|
| `cs-eds-page-bridge\coze-import\cs_Bot_Client_v2p_link.zip` | **优先导入**的 Bot Client（Query 前选择器） |
| `Nonsta_Valueadded_Combined\Chatflow-cs_Bot_Client_v2p_1-draft-8069.zip` | 原包；build 脚本的源 |
| `cs-eds-page-bridge\coze-import\page_link_probe.zip` / `cs_Bot_Client_page_link_probe.zip` | 独立探测，无 Query |
| `cs-eds-page-bridge\coze-import\Workflow-page_intent_emit_smoke-draft-0001.zip` | 代码节点 smoke |
| `cs-eds-page-bridge\coze-import\cs_Bot_Client_v2p_1-page-bridge.zip` | 旧：Query 后三格 |

生成脚本：`scripts\build-bot-client-link-zip.js`、`build-page-link-probe-zip.js`、`build-bot-client-page-zip.js`、`build-coze-smoke-zip.js`、`build-query-sidecar-zip.js`。

### 契约 / 夹具 / 签名

| 路径 | 用途 |
|---|---|
| `contracts\给前端-联调契约.md` | 可转发前端：pageRead / renderA2UI / 点卡 |
| `contracts\时序图-你要做什么.md` | 时序图里哪些词不用懂、谁做什么 |
| `contracts\给后台-sop卡-renderA2UI.md` | SOP 卡测参 + 签名原文 |
| `contracts\frontend-tool-protocol.md`、`a2ui-contracts.md`、两个 `.schema.json` | 字段级 |
| `a2ui\catalog.json` | 前端组件登记拷贝 |
| `fixtures\turn-dehydrated-dom-list.json` | 清单卡单测 DOM |
| `fixtures\sidecar-sop-card-a2ui.json` + `.arguments.txt` | 给后台测解析的 SOP 卡 |
| `fixtures\sidecar-select-option.json` | 推荐选中（阶段二才用点页） |
| `fixtures\sidecar-render-a2ui.json` | 短句冒烟出卡（含 clickElement 占位） |
| `fixtures\sidecar-page-read.json` | 读页样例 |
| `scripts\tool-call-send.py` | 本地复刻插件签名；token 走环境变量 `COBRA_TOOL_CALL_TOKEN`，**不要写入仓库** |
| `scripts\test-tool-call-send-sign.py` | 签名锁测 |
| `scripts\test-page-link-probe.ts` | 现行选择器单测 |
| `scripts\test-page-intent-emit.ts` | 旧封口节点单测 |

### 标识 / 专家结束节点（阶段二预备，不是现行主链）

| 路径 | 用途 |
|---|---|
| `marker\expert-end-node-design.md` | 专家只吐人话+标识，自己不调插件 |
| `marker\marker-format.md` | 标识格式 |
| `marker\test-marker-recommend.txt` / `test-marker-page-read.txt` | 可粘贴样例 |
| `marker\coze-inject-guide.md`、`query-f1-sidecar-outlet.md` | 副本 F_1 怎么加出口 |
| `marker\recaller-routing-analysis.md` | recaller 打哪张 expert |
| `_workflow\20260917_marker_chat_channel\计划.md` | 标识方案计划（未授权改现网） |

### 运行记录（中间件，验收偶尔看）

| 路径 | 用途 |
|---|---|
| `_runs\20260921_page_link_import\result-real-user.md` | 真实账号试运行结论 |
| `_runs\20260921_page_intent_null\result.md` | 输出全 null 的诊断 |
| `_runs\20260917_channel_compare\方案对比与探测报告.md` | 甲乙丙丁通道 |
| `_runs\20260917_marker_test\` | 标识 Chat API 探测 |

---

## 参考文档（按用途）

先读本 HANDOFF，再按需打开，不要从 README 从头执行旧步骤。

### 产品 / 业务（页面该干什么）

| 文档 | 用来干什么 |
|---|---|
| `workspace\product\reference-prds\PRD-AI增值指引侧栏助手.md` | 侧栏自动打开、**代发开场话术**、上下文 `eventNo`。现行 Coze 触发句是「我的异常单{EB}应该提交哪个增值产品」，和 PRD 里较长的开场模板**不是同一句**。未验证前端线上实际代发原文。 |
| `workspace\product\` 下 BRD / 非标增值生成 Agent V1.0（若打开项目能搜到） | 人确认前不回填、不提交；Agent 不直接点浏览器 |
| `agent-inventory-assist\_workflow\20260831_pageagent_oms_probe\PRD更新备忘-页面联动与PageAgent探测.md` | 禁止把人话交给 page-agent 去点；要用编号动作；提交按钮永不在可点名单 |
| `cs-eds-page-bridge\queryStandardExceptionWithPlanPage接口文档.md` | 异常 → 方案壳 → vascCode + atoms。阶段二选中用，阶段一清单卡不用 |
| 原型 `workspace\prototypes\current\B_侧边栏真实体验版.html`（及 `Vas-Nonstandard-Guide\prototypes\` 同名） | SOP 卡长什么样；后台测参对照 sop-card-v6 |

### 前端协议（我们发什么，他们做什么）

以 `contracts\给前端-联调契约.md` + `contracts\时序图-你要做什么.md` 为准。  
`queryToolCall` / `toolCalled` / `workflow/run` 是前端↔后台的词，**不是 Coze 画布节点**。

### 不要当成这条线的

| 路径 | 为什么不是 |
|---|---|
| `internal-review-copilot\` | 内部审核 Copilot，不是卖家侧栏客服 |
| `ai\agentic\Coze工作流导出\Workflow-cobra_api_1-draft-611` | cobra 查 OMS |
| 现网 Query / 共享 recaller 画布 | 隔离门：阶段一不改 |

---

## 当前状态

| 项 | 状态 |
|---|---|
| Query 前选择器画布 | **已有** `7687981752618582066`，线仍是 probe→选择器→插件/Query |
| 代发问句 → pageRead → 插件成功、跳过 Query | **已验证**（2026-09-21 画布试运行 + 真实账号） |
| 读页回传 → 清单卡 | **本地单测 PASS**；Coze / 侧栏 **未验证** |
| 点页（selectOption 真编号） | **明确先不做** |
| 测试 Bot 绑 v2p_link | **未绑**（2026-09-21 `workflow_info_list` 空） |
| EDS 侧栏收到 pageRead | **未验证** |
| VAS 指引（大脑层）本地文件 | **已齐** |
| VAS 指引覆盖包 | **已打** `cs-eds-page-bridge/coze-import/cs_Bot_Client_v2p_link_vas.zip`（从 9189 改，id 仍是 7687981752618582066） |
| VAS 指引贴进画布 | **待再覆盖** 新包（Query 分支已接通；追问已放宽） |
| 专家 sidecar 主链 | **不是现行路径**；设计文档还在 |
| 现网 Query / recaller | 按门禁不应改；现网 Bot Client 历史上被改过，不要再叠测 |
| README 与现行接线 | **部分过时** |

---

## 当前卡点或待确认项

1. **前端代发原文**是否就是「我的异常单{EB}应该提交哪个增值产品」。不是这句，router 不会走开场。未拿到线上原文。  
2. **VAS 指引尚未贴进画布**。本地文件已齐；贴之前试验画布仍是 pageRead 通道。  
3. **测试 Bot 改绑** `cs_Bot_Client_v2p_link`。不绑，侧栏仍打旧画布。  
4. **EDS 测试页 URL + 聊天窗是否已含 A2UI/读页**。Cursor 不能代替真页验收。  
5. `page_link_probe` / `vas_guide_router` 的 `dehydrated_dom` 曾和 `USER_INPUT` 接到同一句问话。真 DOM 必须能从 `USER_INPUT` 或单独字段进来（代码两种都认）。  
6. 插件成功 ≠ 前端 `queryToolCall` 有值。最后一公里在 cobra / 侧栏轮询，要用**同一** `user_id` + `conversation_id`。

通道仍卡在 **绑 Bot + 真页联调**。大脑层卡在 **把文件贴进 v2p_link 画布**。

---

## 下一步计划建议

1. 按 `cs-eds-page-bridge/coze-import/导入-vas-guide.md` **§0**：导入 `cs_Bot_Client_v2p_link_vas.zip`，**覆盖**试验画布 `7687981752618582066`。不要新建，不要覆盖现网 v2p。  
2. 画布试运行三轮：触发句 → 开场；「帮我辨识后换标上架」→ 追问；补齐 WI + 附件 + 箱数 → 需求描述。  
3. 确认测试 Bot `7680824665929056310` 绑的是 `cs_Bot_Client_v2p_link`（`7687981752618582066`），不是现网 v2p。  
4. 向前端要：测试 EDS URL、侧栏是否已发 A2UI、绑的 Bot id。读页清单卡仍走 `page_tool` 分支。  
5. 用户点名后再做：版本 B（`renderA2UI` 一键填写）、选择器否则真正回到 Query、用清单真 index 出 `selectOption`。  
6. 不要改 recaller / 现网 Query；不要把试验画布绑现网 Bot。

---

## 踩过的坑，绝对不要再踩

1. **不要改现网 Query、共享 recaller。** 不要用 Query zip 覆盖 staging_F。  
2. **不要把试验画布绑到现网 Bot** `7447371549063626790`。  
3. **不要把 Query 整张打进 Bot Client zip。** 只引用 id；格子丢了就手补子流程。  
4. **不要把独立 `page_link_probe` 对话流当成已接到客服。** 选择器必须在 Bot Client、Query 前面。  
5. **`page_link_probe` 不能断头。** 顺序固定：A/B → probe → 选择器 →（真插件 / 假 Query）。  
6. **扣子代码节点贴 JavaScript。** 不要贴 TS；要用 `unwrapParams`（扣子常传扁平 `{user_input}`）。  
7. **`arguments` 必须是字符串。** 对象会挂。  
8. **插件 `data: null` + 「操作成功」是成功。** 不要当成没发出去。  
9. **Chat API 看不到 `tool_call_send`。** 看画布调试页或 EDS `queryToolCall`。  
10. **不要把「字数超了」当根因。** 已证是签名/解析。改签名脚本，不要截断 SOP 卡。  
11. **不要用 `clickElement(0)` 当真业务选中。** 先读页拿 index；选中用 `selectOption`。  
12. **不要单独发 `operatePage` 插件。** 点卡是卡片 JSON 里的按钮。  
13. **不要混验收：** 标识通道有没有 JSON ≠ 插件通道前端有没有收到。  
14. **不要把 cobra token / Coze sat_ / Cookie 写进文档或 git。**  
15. **不要新建 `D:\DA` 根目录文件。** 产物放本项目 `cs-eds-page-bridge` 或 `_workflow` / `_runs`。  
16. **不要一轮抛一堆确认题挡住贴画布。** 阶段一先跑通再谈 SOP 准不准。  
17. **`dehydrated_dom` 不要长期接到 USER_INPUT 当唯一来源**（本轮碰巧没坏）。  
18. README / `接线-Bot-Client.md` 里「Query 后面插三格」是旧图，不要照着改现行 v2p_link。

---

## 快速恢复上下文命令

```powershell
Get-Content -Raw -Encoding UTF8 "D:\DA\Nonsta_Valueadded_Combined\_workflow\20260922_cs_eds_page_bridge_handoff\HANDOFF.md"
Get-Content -Raw -Encoding UTF8 "D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\coze-import\导入-v2p-link.md"
Get-Content -Raw -Encoding UTF8 "D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\coze-import\导入-vas-guide.md"
Get-Content -Raw -Encoding UTF8 "D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\nodes\vas-guide-router.coze.js"

cd D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot
npx tsx ..\cs-eds-page-bridge\scripts\test-page-link-probe.ts
npx tsx ..\cs-eds-page-bridge\scripts\test-vas-guide-router.ts
npx tsx ..\cs-eds-page-bridge\scripts\test-vas-output-format.ts
npx tsx ..\cs-eds-page-bridge\scripts\test-vas-guide-system.ts
```

试运行问句：`我的异常单EB0126092143应该提交哪个增值产品？`  
贴 VAS 之前：触发句应 pageRead；贴之后：应出开场话术。  
普通对照 `你好`：贴之前进 Query；贴之后 V1 进指引 LLM。

---

## 给新会话的执行建议

1. **先读本文件 + `导入-v2p-link.md` + `导入-vas-guide.md`。** 不要从 README 中间「阶段一要在 Coze 加什么」开干。  
2. 打开画布 `7687981752618582066`：未贴 VAS 前确认线还是 probe → 选择器；贴 VAS 后确认 router → route 选择器。  
3. 用户若问「继续联调」：先问测试 Bot 绑了没有、EDS URL 是什么；**不要**再导入一遍 zip，**不要**再改 Query。  
4. 用户若问「专家 / SOP / 选哪个原子」：那是阶段二。先看清单卡在真页出没出来。专家设计可读 `marker\expert-end-node-design.md`，不要把 sidecar 接到现网 Query。  
5. 改代码节点后：改 `page-link-probe.ts` 和 `.coze.js` 两份，跑 `test-page-link-probe.ts`，把 `.coze.js` 贴回扣子（语言 JavaScript）。  
6. 对人说话用中文、少术语；画布操作写「哪一格、哪根线」。
