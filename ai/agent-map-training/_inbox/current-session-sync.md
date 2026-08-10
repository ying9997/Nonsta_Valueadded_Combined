# Current Session Sync Inbox

用途：当前教练会话的阶段性归档包收件箱。新 session 定期读取本文件，并整理进正式训练目录。

## 同步规则

- 当前会话继续做教练问答、逐步评审和思维纠偏。
- 每完成一个小环节，追加一个 `ARCHIVE_PACKET`。
- 新 session 只负责把归档包整理到正式文件，不在本文件里展开新讨论。

## 归档包格式

```markdown
## ARCHIVE_PACKET YYYY-MM-DD HH:mm

### 阶段

### 本轮有效产出

### 思维纠偏

### 后置问题

### 下一步
```

## ARCHIVE_PACKET 2026-08-09 initial

### 阶段

会话协作机制确认。

### 本轮有效产出

- 确认采用“双会话 + 同步收件箱”机制。
- 当前会话定位：教练问答、逐步评审、思维纠偏。
- 新 session 定位：维护 `work/agent-map-training/` 正式训练档案。
- 同步方式：当前会话每完成小环节，生成归档包并追加到 `_inbox/current-session-sync.md`。

### 思维纠偏

- 防止多个会话继续制造碎片化。
- 训练现场和文档归档分工，但通过 `_inbox` 保持同步。

### 后置问题

- 正式目录结构由新 session 初始化。

### 下一步

- 当前会话继续步骤2：围绕 `inbound/inbound-appointment-manage` 完成 AI 项目 10 问。
- 下一小节：用户改写 Q1-Q2 后评审，再进入 Q3-Q4。

## ARCHIVE_PACKET 2026-08-09 step2-q1-q2

### 阶段

步骤2：AI 项目 10 问 / Q1-Q2。

### 本轮有效产出

#### Q1 Agent 工作在哪个业务流程中？

合格答案要点：

- `inbound/inbound-appointment-manage` 工作在入库前后的预约送仓管理流程中。
- 覆盖预约送仓的操作指引、修改/取消、分批到仓、预约状态查询、违规费理解、预约 POD 下载指引。
- 类型是“操作指引 + 只读状态查询/解读”类 Agent。
- 明确不是自动执行类 Agent，不代客创建、修改或取消预约单。

设计依据：

- 标题：预约送仓操作指引。
- 设计定位：直发产品预约送仓的操作 SOP 分发器 + 预约单/违规费只读解读器。
- 边界：仅提供指引，不代客创建或取消预约单，不代客下载 PDF。
- 业务背景：判断是否要预约 -> 创建预约 -> 获取预约码 -> 司机凭码送仓。

#### Q2 用户在什么触发点使用 Agent？

合格答案要点：

- 用户会在预约送仓相关的多个触发点使用该 Agent。
- 覆盖创建预约前/创建中、预约创建后查询状态、修改或取消预约、分批到仓、违规费争议、预约 POD 下载。
- 不只是服务“创建中”，而是覆盖预约送仓的操作前、中、后多个节点。
- 示例调用标题可以作为理解 intent 的入口，帮助把中文场景和 intent 枚举对应起来。

设计依据：

- `create_guide`：怎么预约送仓、预约码在哪。
- `modify_guide`：能否修改预约时间、怎么改 slot。
- `cancel_guide`：取消预约、是否扣费。
- `split_shipment`：分批到仓怎么处理。
- `query`：预约单状态查询。
- `penalty`：违规费查询/申诉。
- `pod_guide`：预约 POD 下载。

### 思维纠偏

- 已从“把 Agent 绑定到单一业务时点”修正为“先识别 Agent 覆盖的业务流程段和多个触发节点”。
- 用户识别到：不仅要知道核心触发点和主链路，也要知道次要触发点和支线链路。
- 用户识别到：示例调用的中文标题可以帮助理解 intent 和典型场景的映射。
- 用户能主动延后“intent 是上游怎么生成的”这类来源问题，先聚焦当前 design 中 intent 如何被消费。

### 后置问题

- “SOP 分发器”和“只读解读器”概念暂时不展开，后续在文件角色映射或概念四步法阶段处理。
- `intent` 的上游来源暂时不追，后续在“定义 -> 作用 -> 缺失处理 -> 来源”四步法中处理。

### 下一步

- 继续步骤2 Q3-Q4：
  - Q3：用户输入是什么？
  - Q4：系统已知事实有哪些？

## ARCHIVE_PACKET 2026-08-09 step2-q3-q4

### 阶段

步骤2：AI 项目 10 问 / Q3-Q4。

### 本轮有效产出

#### Q3 用户输入是什么？

合格答案要点：

- 用户输入分为两类：自然语言意图和业务字段。
- 自然语言意图：用户描述自己想做什么，例如预约、修改预约、取消预约、查询预约状态、处理分批到仓、咨询违规费、下载预约 POD。
- 业务字段：
  - `intent`：可选，用于标记业务意图；缺省时可由顶层 `query` / `customerIntent` 的关键词推断。
  - `inboundOrderNos` / `inboundOrderNo`：查询预约状态、违规费、POD 时用于定位入库单。
  - `bookingNo`：已知预约单号时可直接查询。
  - `deliveryWayHint`：送仓方式提示，如 LCL / FCL / Express，用于辅助选择预约规则和 KB。
  - `warehouseCode`：仓库编码上下文，辅助 KB 或查询语境，不是核心必填。
- 必填关系：
  - `create_guide` / `modify_guide` / `cancel_guide` / `split_shipment` / `pod_guide`（无单号）可走纯 KB，通常不强制单号。
  - `query` / `penalty` / `pod_guide`（有单号）需要 `inboundOrderNos` / `inboundOrderNo` / `bookingNo` 至少其一。

设计依据：

- 最小入参表。
- 参数提示。
- `inputs` 业务字段表。
- 示例调用。

#### Q4 系统已知事实有哪些？

合格答案要点：

- 系统侧信息分为 API 事实、规则知识、上下文三类。
- API 事实：
  - `query` / `penalty` / `pod_guide`（有单号）会走 `api_chain`。
  - 主路径使用 `booking.list` 查询预约记录、预约状态、违规费相关字段。
  - `getOrderDetail` 可作为辅助/兜底，用于补充 `bookingNo`、`inboundBookingStatus`、`winitProductCode` 等入库单上下文。
- 规则知识：
  - KB 提供预约 SOP、LCL/FCL/Express 预约规则、修改/取消规则、违规费规则、分批到仓规则、POD 下载指引。
  - KB 不是系统事实，而是用于解释和生成操作指引的规则依据。
- 上下文：
  - design 提到 `inputContext` / `previousOutput`，但当前主路径没有展开依赖上游事实。
  - 当前可理解为链式编排时承接前序信息的可选上下文。
- 明确不调用 / 不使用：
  - 不调用 `create` / `cancel` 等写接口。
  - 不调用 `exportPodPdf`，不代客下载 PDF。
  - 不调用 `queryAvailableWarehouseinPlan` 查询实时 slot，只引导客户到万邑联预约页。

设计依据：

- 数据拉取与兜底。
- OpenAPI 预约链。
- `routePath=kb_only / api_chain`。
- 边界分工。

### 思维纠偏

- 用户已能区分自然语言意图和确定性业务字段。
- 用户已能区分 API 事实和 KB 规则知识：API 返回线上真实字段值；KB/SOP 提供规则、解释依据和操作步骤。
- 用户识别到同名概念跨层级造成的 design 可读性问题：顶层 `query` 与 `inputs.intent=query` 不是同一层级概念。
- 用户能主动把 `inputContext / previousOutput` 暂定为可选上下文，不在当前阶段深挖来源。

### 后置问题

- `inputContext / previousOutput` 的具体来源和跨 expert 编排机制后置到“文件与能力层级映射”或“概念四步法”阶段。
- `deliveryWayHint` 的完整业务背景后置；当前只保留“用于辅助选择预约规则和 KB”的当前模块作用。
- `query` 命名冲突作为 design 可读性问题记录，当前不重构 baseline。

### 下一步

- 继续步骤2 Q5-Q6：
  - Q5：Agent 可选择或推荐的候选范围是什么？
  - Q6：Agent 需要做哪些路由或决策？

## ARCHIVE_PACKET 2026-08-09 coaching-format-rule

### 阶段

训练流程规范更新。

### 本轮有效产出

用户确认：每个问题如果只给题目，会像“无头苍蝇”一样找 design，很痛苦；但如果同时给出：

- 该问题要回答什么；
- 应该去 design 哪些位置找；
- 重点回答方向；
- 哪些点不要发散；
- 本问题和相邻问题的区别；

就能明显降低阅读阻力，并帮助建立地图式学习路径。

### 思维纠偏

- 训练问题不能只给抽象题目，必须给“阅读定位 + 回答边界 + 防发散提醒”。
- 这不是替用户回答，而是帮助用户知道去哪里找、按什么维度找、找到什么程度算够。

### 后置问题

- 后续模板中应沉淀“问题提示块”格式。

### 下一步

后续所有阶段问题都使用以下格式：

```markdown
## Qx 问题

这个问题不是问：...
这个问题要回答：...

请按格式回答：
...

提示你从这些地方找：
- ...

重点回答：
- ...

注意：
- ...
```

## ARCHIVE_PACKET 2026-08-09 step2-q5-q6

### 阶段

步骤2：AI 项目 10 问 / Q5-Q6。

### 本轮有效产出

#### Q5 Agent 可选择或推荐的候选范围是什么？

合格答案要点：

- 该 Agent 的候选范围不是“代客执行操作”，而是围绕预约送仓管理流程提供操作指引、只读查询和状态/费用/POD 解读。
- 可处理范围：
  1. 创建预约指引：如何预约送仓、预约码在哪里。
  2. 修改预约指引：如何修改预约时间/slot。
  3. 取消预约指引：如何取消预约、是否涉及费用。
  4. 分批到仓处理：收到分批到仓通知后如何处理。
  5. 预约状态查询：基于入库单号或预约单号查询预约状态。
  6. 违规费查询/说明：解释未预约、取消、未到仓等费用。
  7. 预约 POD 下载指引：说明如何在万邑联自助下载。
- 明确不能做：
  - 不代客创建预约单。
  - 不代客修改或取消预约单。
  - 不调用 create / cancel 等写接口。
  - 不调用实时 slot 查询接口，只引导客户到平台页面查看。
  - 不代客下载 PDF。
  - 不处理库容额度、入库单总状态、签收轨迹、增值服务配置等其他 expert 范围。
- 超出范围时：
  - 当前 expert 层面应给出转交说明或建议由对应 expert 处理。
  - planner 如何调度属于上层编排机制，当前阶段后置确认。

设计依据：

- 调用说明的适用场景。
- 设计定位的边界分工。
- 数据拉取与兜底中的 OpenAPI 预约链。
- “不是预约写操作代理”“不是 Slot 实时查询器”。

#### Q6 Agent 需要做哪些路由或决策？

合格答案要点：

- 该 Agent 先判断用户意图 `intent`，再结合是否有单号，决定走纯 KB 指引还是 API + KB 解读。
- 核心路由：
  1. `intent` 识别/归一：根据用户 `query` / `customerIntent` / `inputs.intent` 判断属于 `create_guide`、`modify_guide`、`cancel_guide`、`split_shipment`、`query`、`penalty`、`pod_guide` 中哪一类。
  2. `routePath` 判断：
     - `create_guide` / `modify_guide` / `cancel_guide` / `split_shipment`：走 `kb_only`，输出操作步骤和规则说明。
     - `query` / `penalty`：需要单号，走 `api_chain`，查询预约记录后结合 KB 解读。
     - `pod_guide`：无单号走 `kb_only`，有单号走 `api_chain`。
  3. 单号完整性判断：当 intent 需要查询预约状态、违规费或有单号 POD 时，需要 `inboundOrderNos` / `inboundOrderNo` / `bookingNo` 至少其一，否则需要补充信息或走通用指引。
  4. API 使用判断：`api_chain` 主路径调用 `booking.list`；必要时用 `getOrderDetail` 作为辅助/兜底补充入库单上下文。
  5. 边界判断：库容额度、入库单总状态、签收轨迹、增值服务推荐或代客写操作不在本 expert 范围内，应输出转交或人工/其他 expert 处理说明。

设计依据：

- 设计定位中的 `routePath=kb_only / api_chain`。
- 适用场景 intent 表。
- 最小入参表。
- 数据拉取与兜底。
- OpenAPI 预约链中的调用/不调用说明。

### 思维纠偏

- 用户已能区分 Q5 和 Q6：
  - Q5 是边界：允许处理什么、不能处理什么。
  - Q6 是分流：拿到请求后怎么判断 intent、routePath、是否查 API。
- 用户通过“design 原文/intent -> 可处理范围 -> 能力类型归类 -> 结论”的路径完成 Q5，而不是凭感觉总结。
- 抽取方法沉淀：
  - 先贴 design 明细；
  - 再归类；
  - 最后写总结。

### 后置问题

- planner / agent loop 如何消费转交说明，后置到编排层讨论。

### 下一步

- 继续步骤2 Q7-Q8：
  - Q7：Agent 依据哪些规则、知识或历史案例？
  - Q8：Agent 输出给谁消费？

## ARCHIVE_PACKET 2026-08-10 11:11

### 阶段

步骤2：AI 项目 10 问 / Q7-Q8。

### 本轮有效产出

#### Q7 Agent 依据哪些规则、知识或历史案例？

用户通过评审后的答案要点：

- Agent 的依据主要分为业务规则 / SOP、KB / Prompt 知识片段、API 参考和边界约束三类。
- 业务规则 / SOP 包括多单合并、LCL/FCL/Express 预约规则、卸货方式、仓库当地时间、FCL 必填字段、取消时限、分批到仓确认、POD 下载条件等。
- KB / Prompt 知识片段按不同 intent 加载：
  - `create_guide` 加载 `booking-sop`。
  - `query` 加载 `booking-api-reference` 状态码 + `booking-rules` + SOP 摘要。
  - `penalty` 加载 `penalty-rules`。
  - `pod_guide` 加载 `pod-download-guide`。
- API 参考包括 `booking.list` 的预约记录、状态码、违规费字段；必要时用 `getOrderDetail` 兜底。
- 边界约束包括不调用 `create` / `cancel` / `exportPodPdf`、不查实时 slot、不承诺减免。

设计依据：

- `design.md` 的数据拉取与兜底。
- 核心业务规则。
- 路由与 KB 拼接。
- Prompt 知识片段。
- KB 溯源表。

#### Q8 Agent 输出给谁消费？

用户通过评审后的答案要点：

- 第一消费方是客户 / 卖家运营：消费操作指引、状态解读、费用说明、POD 下载指引，并据此自行到万邑联平台操作。
- 第二消费方是 planner / 上层编排：消费 `scopeAction`、`referExpertId`、`requiresManualAction`、`outputContext.nextExpertId` 等结构化信号，决定是否转其他 expert 或人工。
- 第三消费方是客服 / 人工运营：在转人工、费用争议、异常拆单等场景消费上下文。

设计依据：

- `design.md` 的输出设计。
- `analysis` 原则。
- 对客约束。
- 专家转介。

### 思维纠偏

- Q7 中 `routePath` 是选择依据的机制，不是依据本身；应把业务规则、KB、API 参考、边界约束作为主体。
- Q8 的第一消费方应先看最终用户，而不是先看 planner；planner 消费的是结构化转介和编排信号。
- `booking-api-reference` 中的状态码先理解为预约单状态码 / 状态解释，不必在当前阶段展开完整状态机。

### 后置问题

- `WBO` / `SBO` / `RBO` 等预约状态码的完整枚举和业务含义后置到文件角色映射或概念四步法阶段。
- `outputContext.nextExpertId` 与 planner / agent loop 的具体衔接机制后置到编排层讨论。

### 下一步

- 继续步骤2 Q9-Q10：
  - Q9：怎么判断 Agent 做得好不好？
  - Q10：这个 Agent 在全局链路中的位置是什么？

## ARCHIVE_PACKET 2026-08-10 13:57

### 阶段

步骤2：AI 项目 10 问 / Q8 补充 + Q9-Q10。

### 本轮有效产出

#### Q8 补充：失败、缺失、歧义如何处理？

用户通过评审后的答案要点：

- 缺少必要字段：`query` / `penalty` / 有单号 POD 场景需要 WI 单号或 `bookingNo`，否则补充信息或走通用指引。
- API 失败或查不到：`booking.list` 失败或为空时，用 `getOrderDetail` 兜底；仍无结果则 `requiresManualAction=true`。
- 越界请求：库容、入库总状态、签收轨迹、增值服务配置等转对应 expert。
- 禁止动作：不能代客创建 / 修改 / 取消预约，不能下载 PDF，不能查实时 slot。
- 争议或异常：违规费争议大、特殊拆单、整柜异常退费等转人工。
- 歧义 intent：先根据 `query` / `customerIntent` / `inputs.intent` 推断；不确定时不编造，追问或给通用指引。

#### Q9 怎么判断 Agent 做得好不好？

用户通过评审后的答案要点：

- 是否正确识别 `intent`。
- 是否选对 `routePath`。
- 是否在该查 API 时查 API、该走 KB 时走 KB。
- 是否不越界、不编造费用、不代客操作。
- 是否能输出可执行指引或正确 expert 转介。

#### Q10 这个 Agent 在全局链路中的位置是什么？

用户通过评审后的答案要点：

- 它位于入库链路里的“预约送仓管理”节点。
- 它处理预约 SOP、预约状态、违规费、POD 指引。
- 它与库容、入库总状态、签收轨迹、增值服务配置等 expert 有边界和转介关系。

### 思维纠偏

- Q8 补充不是重复“输出给谁消费”，而是补齐失败、缺失、歧义、越界和异常场景下的处理策略。
- Q9 的验收标准不能只看回答完整度，要看路由、事实、规则、边界、异常处理和可执行性。
- Q10 要从全局业务链路定位，而不是复述本 expert 内部工作流。

### 后置问题

- 步骤3需要把当前 10 问沉淀成分层模型：业务层、任务层、流程层、知识层、工具层、表达层。
- 文件角色映射需要确认 `design.md`、`manifest.json`、`workflow.json`、`nodes/`、`prompts/`、KB 的分工。

### 下一步

- 步骤2已完成。
- 进入步骤3：分层模型与文件角色映射。

## ARCHIVE_PACKET 2026-08-10 13:57-step2-summary

### 阶段

步骤2：AI 项目 10 问总结。

### 本轮有效产出

- Q1-Q2 已完成：定位业务流程和用户触发点。
- Q3-Q4 已完成：拆分用户输入、系统事实、API 事实和 KB 规则知识。
- Q5-Q6 已完成：明确候选范围、能力边界、intent 路由和 `kb_only` / `api_chain` 分流。
- Q7-Q8 已完成：明确规则 / KB / API / 边界依据，以及客户、planner、人工三类输出消费方。
- Q8 补充已完成：明确失败、缺失、歧义、越界和异常处理策略。
- Q9-Q10 已完成：明确 Agent 验收标准和全局链路位置。

### 思维纠偏

- 已从“看单个字段/节点”推进到“按业务层、输入层、流程层、知识层、工具层、表达层看 Agent”。
- 已能区分：事实来源、规则依据、路由机制、输出消费方、失败处理和全局位置。
- 已建立一个可迁移的 10 问拆解框架，后续可用于非标增值 SOP expert。

### 后置问题

- `intent` 上游来源和 planner 调度机制仍后置。
- `inputContext.previousOutput` 的来源和缓存复用机制仍后置。
- 预约状态码 `WBO` / `SBO` / `RBO` 的完整含义仍后置。

### 下一步

- 进入步骤3：分层模型与文件角色映射。

## ARCHIVE_PACKET 2026-08-10 14:01

### 阶段

步骤3：系统分层建模 / 3.1-3.3。

### 本轮有效产出

#### 3.1 业务场景层是什么？

- 业务场景层是直发产品入库前后的预约送仓管理流程。
- 覆盖客户如何预约送仓、查询 / 修改 / 取消预约、分批到仓、违规费查询、预约 POD 下载指引。
- 边界是只提供指引和只读解读，不代客创建 / 修改 / 取消预约，不下载 PDF，不查实时 slot；库容、入库总状态、签收轨迹、增值服务配置等转其他 expert。

#### 3.2 输入事实层包含哪些输入？

- 用户输入：`query`、`customerIntent`、`inputs.intent`、`inboundOrderNos` / `inboundOrderNo`、`bookingNo`、`deliveryWayHint`、`warehouseCode`。
- 系统事实：`booking.list` 返回的预约记录、状态码、违规费字段；`getOrderDetail` 返回的 `bookingNo`、`inboundBookingStatus`、`winitProductCode` 等兜底事实。
- 上下文：`inputContext`，包含 `chainId`、`previousOutput`；当前仅能确认字段存在，具体来源和复用机制仍后置。

#### 3.3 候选范围层是什么？

- 候选范围层不是单纯的 intent 列表，而是 Agent 可处理的业务问题集合 + 每类问题对应的处理形态 + 明确不可处理边界。
- 候选范围层分三类：
  - 纯 KB 指引类：包括创建预约指引、修改预约指引、取消预约指引、分批到仓处理、无单号的预约 POD 下载指引。这些场景不要求单号，不查 API，主要输出 SOP、规则说明、操作步骤。
  - API + KB 解读类：包括预约状态查询、违规费说明 / 查询、有单号的预约 POD 下载判断。这些场景需要 `inboundOrderNo` / `inboundOrderNos` / `bookingNo` 至少其一，查 `booking.list`，必要时用 `getOrderDetail` 兜底，再结合 KB 解读。
  - 越界转介 / 禁止处理类：包括代客创建 / 修改 / 取消预约、实时 slot 查询、PDF 下载、库容 / 额度、入库单总状态、签收轨迹、VASC 推荐、服务项配置、已提交增值单状态。这些不属于本 expert 的候选范围，要么明确禁止，要么转对应 expert / 人工。
- 候选范围层 = 能处理什么 + 用哪种方式处理 + 什么不能处理。

### 思维纠偏

- 业务场景层要先定业务流程段和边界，不要直接跳到节点实现。
- 输入事实层要区分用户给的输入、API 查回来的系统事实、链式编排上下文。
- 候选范围层要区分“可回答 / 可指引 / 可解读”和“可代客执行”；该 expert 不具备写操作代理能力。

### 后置问题

- `inputContext.previousOutput` 的来源和缓存复用机制仍无法从当前材料完全确定。
- planner 如何消费 `referExpertId` / `outputContext.nextExpertId` 仍后置到编排层。

### 下一步

- 继续步骤3 3.4-3.6：
  - 3.4 决策路由层有哪些分支？
  - 3.5 规则与知识层有哪些 KB/API/SOP？
  - 3.6 能力编排层如何运转？

## ARCHIVE_PACKET 2026-08-10 14:26

### 阶段

步骤3：系统分层建模 / 3.4-3.6。

### 本轮有效产出

#### 3.4 决策路由层有哪些分支？

- 决策路由层不是一条线，而是四层判断：
  1. 用户想做什么：由 `validate-intent` 把用户问题归一成 `create_guide`、`modify_guide`、`cancel_guide`、`split_shipment`、`query`、`penalty`、`pod_guide`。
  2. 这个 intent 走 KB 还是 API：由 `route-intent` 根据 intent 和是否有单号，输出 `kb_only`、`api_chain`、`skipApi`、`skipOrderDetail`；如果 `validationOk !== true`，则进入 `invalid`。
  3. 如果进入 API 链，查哪些事实：`skipApi=false` 时查预约记录；`skipOrderDetail=false` 时查入库单详情。
  4. 查到入库单后，它是否仍属于本 expert 的业务边界：由 `scope-guard` 根据 `winitProductCode` / PSC 做业务范围二次路由 / 出域判断。
- `scope-guard` 同时属于能力编排层和决策路由层：
  - 在能力编排层，它是 workflow 中的一个节点。
  - 在决策路由层，它承担业务边界判断和转介决策。
- `scope-guard` 不能缺少，因为 `routePath` 只回答“怎么处理这个 intent”，不能保证“这个订单真的属于本 expert 能处理的业务范围”。
- `scope-guard` 的分支包括：
  - 直发预约链路：继续回答。
  - 标准头程 `OW01011`：转 `inbound/inbound-process-guide`。
  - 非直发预约链路：转 `inbound/inbound-process-guide` 或提示确认产品选型与送仓规则。

#### 3.5 规则与知识层有哪些 KB/API/SOP？

- SOP / KB：`booking-sop`、`booking-rules`、`penalty-rules`、`split-shipment`、`premium-booking`、`pod-download-guide`。
- API / 状态参考：`booking-api-reference`，覆盖 OpenAPI 链路、预约状态码、POD / 状态码、FCL 必填、合并规则。
- OpenAPI 事实源：`winit.wh.inbound.booking.list` 用于预约记录、状态码、违规费字段；`winit.wh.inbound.getOrderDetail` 用于兜底表头事实。
- KB 溯源来自 `_kb` 文档、直发预约 FAQ、直发散货预约 FAQ、直发预约违规费 FAQ、分批到仓背景、增值预约送仓 FAQ、直发快递入仓 FAQ 等。

#### 3.6 能力编排层如何运转？

- 编排主线是：输入 → `validate-intent` → `route-intent` → 按路由决定 API / KB 分支 → 汇总 API 事实与 KB → `llm-analyze` → `format-output`。
- `api_chain` 下有两条并行事实链：
  - 入库单详情链：`resolve-inbound-lookup` → `build-winit-inbound-detail` → 插件 / 本地代理 → `fetch-inbound-order`。
  - 预约列表链：`build-booking-list-request` → 插件 / 本地代理 → `fetch-booking-list`。
- `summarize-booking-records` 合并 `booking.list` 与 `getOrderDetail` 表头兜底，输出 `bookingSummary` 和 `bookingRecords`。
- `scope-guard` 根据 PSC / 链路判断是否回答或转 `inbound/inbound-process-guide`。
- `load-booking-kb` 按 intent、送仓方式、routePath 拼接 KB，输出 `kbContent` / `kbScope`。
- `format-output` 把 LLM 输出和 `bookingSummary` / `scopeGuard` 合并成 `structured`、`analysis`、`outputContext`。

### 思维纠偏

- 决策路由层不只是 intent 表；还包含 routePath、skipApi、skipOrderDetail、scope-guard 等运行时 branch。
- 规则与知识层要区分 KB/SOP、API 参考、真实 API 事实源和 KB 溯源。
- 能力编排层要看节点顺序和节点职责，不只看 Mermaid 图。

### 后置问题

- `llm-analyze` 的具体 prompt 行为需要后续结合 `prompts/main.md` 在输出契约层继续看。
- 插件 / 本地代理在 Coze 运行时和本地 Runner 的差异后置，不在当前层展开。

### 下一步

- 继续步骤3 3.7-3.9：
  - 3.7 输出契约层输出什么？
  - 3.8 人工确认 / 兜底层在哪里？
  - 3.9 评测验收层有什么依据？

## ARCHIVE_PACKET 2026-08-10 15:40

### 阶段

步骤3：系统分层建模 / 3.7、3.9、3.10 修订。

### 本轮有效产出

用户确认 3.8 没问题，并修订：

- 3.7 输出契约层补充为四类输出：
  1. `analysis`：人读的自然语言答案。
  2. `structured`：系统读的结构化结果。
  3. `outputContext`：链式编排继续接力用的摘要。
  4. `enrichedContext`：保留 `bookingSummary` / `scopeGuard` 的中间上下文。
- 3.7 进一步明确：
  - `analysis` 给客户 / 卖家运营读，包含操作步骤、状态解释、费用说明、POD 下载指引、边界提醒等。
  - `structured` 给系统读，由 LLM structured 加上 `format-output.ts` 合并的 `bookingSummary` / `scopeGuard` 组成。
  - `outputContext` 给链式编排 / 下游 expert 接力使用，包含 `expertId`、`resultSummary`、`chainId`，转介时带 `nextExpertId`。
  - `enrichedContext` 保存更详细的中间判断依据，如预约汇总、数据质量、PSC 守卫、转介判断。
  - `outputContext` / `enrichedContext` 被哪个上层 planner 如何消费，当前材料无法确定。
- 3.9 和 3.10 的依据范围修订：
  - `study/` 目录不作为 baseline expert 的依据。
  - 只使用 `agentic/experts/...` 下的 `design.md`、workflow、nodes、prompts、`package.json`、scripts、fixtures 等原始工程材料。

### 思维纠偏

- 输出契约层不能只列字段，要说清四类输出分别给谁看、承载什么、由哪个文件保证。
- `outputContext` / `enrichedContext` 虽然在 `format-output.ts` 中明确生成，但上层 planner 如何稳定消费它们，当前材料不能确定。
- 训练依据要收窄到 baseline expert 的原始工程材料；`study/` 是学习材料，不作为 baseline expert 的事实依据。

### 后置问题

- 后续在步骤4看主链路和支线时，继续只引用 `agentic/experts/...` 的工程材料作为 baseline 依据。

### 下一步

- 进入步骤4：主链路、支线与节点点亮。

## ARCHIVE_PACKET 2026-08-10 15:44

### 阶段

步骤4：主链路、支线与节点点亮 / 4.1-4.3。

### 本轮有效产出

#### 4.1 这个 expert 的主链路是什么？

- 主链路是用户提出预约送仓相关问题后，expert 先识别 intent，再判断走纯 KB 还是 API + KB，随后加载对应知识 / 事实，最后由 LLM 生成分析并由 `format-output` 输出契约。
- 抽象主链路：`inputs -> validate-intent -> route-intent -> load-booking-kb / api_chain facts -> summarize / scope-guard -> llm-analyze -> format-output`。
- 更准确地说，这个 expert 没有唯一业务 happy path，而是有两个主干：纯 KB 指引主干和 API + KB 解读主干；二者在 `llm-analyze -> format-output` 汇合。

#### 4.2 主要支线有哪些？

- 纯 KB 指引支线：`create_guide`、`modify_guide`、`cancel_guide`、`split_shipment`、无单号 `pod_guide`，点亮 `kb_only`，跳过 API，加载对应 KB 后输出 SOP / 规则 / 操作步骤。
- API + KB 解读支线：`query`、`penalty`、有单号 `pod_guide`，点亮 `api_chain`，查询 `booking.list`，必要时查 `getOrderDetail`，再结合 KB 解读状态、违规费或 POD 条件。
- invalid / 缺参支线：`query` / `penalty` 缺少 `inboundOrderNos` / `inboundOrderNo` / `bookingNo` 时，`validate-intent` 返回 `validationOk=false`，`route-intent` 输出 `routePath=invalid`，后续不查 API。
- 业务出域 / 转介支线：API 链查到订单后，由 `scope-guard` 判断 PSC 是否属于直发预约链路；标准头程或非直发预约链路转 `inbound/inbound-process-guide`。
- 兜底 / 人工支线：`booking.list` 失败或为空时，`summarize-booking-records` 尝试用 `getOrderDetail` 表头兜底；仍无预约数据时 `requiresManualAction=true`。

#### 4.3 节点点亮总表是什么？

| 场景 | 会点亮的关键节点 | 不点亮 / 跳过 | 结果 |
| --- | --- | --- | --- |
| 纯 KB 指引 | `validate-intent`、`route-intent`、`load-booking-kb`、`llm-analyze`、`format-output` | `fetch-booking-list` 实质跳过，`fetch-inbound-order` 实质跳过 | 输出 SOP / 规则 / 操作步骤 |
| API + KB 解读 | `validate-intent`、`route-intent`、`resolve-inbound-lookup`、`build-winit-inbound-detail`、`fetch-inbound-order`、`build-booking-list-request`、`fetch-booking-list`、`summarize-booking-records`、`scope-guard`、`load-booking-kb`、`llm-analyze`、`format-output` | 无；但具体 action 可因无单号或 skip 标志为空 | 输出预约状态 / 违规费 / POD 条件解读 |
| invalid / 缺参 | `validate-intent`、`route-intent`、`load-booking-kb`、`llm-analyze`、`format-output` | API 和订单详情链跳过 | 输出补充信息或通用指引，不能编造事实 |
| 业务出域 | API 事实链 + `scope-guard` + `format-output` | 不强行给预约步骤 | 输出转介信号 `scopeAction` / `referExpertId` |
| API 无结果兜底 | API 事实链 + `summarize-booking-records` + `format-output` | 若兜底也无结果，则没有可靠预约事实 | `dataQuality=missing`，`requiresManualAction=true` |

### 思维纠偏

- 主链路不是单一线性 happy path；该 expert 至少有“纯 KB 指引”和“API + KB 解读”两个主干。
- 支线不是只按 intent 分，还要按 `routePath`、缺参、业务出域、API 无结果兜底来分。
- 节点点亮要区分“workflow 上存在节点”和“本场景中该节点是否实际执行有效动作”；例如 `skipApi=true` 时 fetch 节点可能仍在图上，但业务上是跳过。

### 后置问题

- 4.4 需要继续展开 API 链路如何点亮。
- 4.5 需要继续展开 KB 链路如何点亮。
- 4.6 需要继续展开业务出域 / 转介链路如何点亮。

### 下一步

- 继续步骤4 4.4-4.6：
  - 4.4 API 链路如何点亮？
  - 4.5 KB 链路如何点亮？
  - 4.6 业务出域 / 转介链路如何点亮？

## ARCHIVE_PACKET 2026-08-10 16:35

### 阶段

步骤4：主链路、支线与节点点亮 / 4.4-4.6。

### 本轮有效产出

#### 4.4 API 链路如何点亮？

- API 链路的触发条件是 `routePath=api_chain`，主要来自 `query`、`penalty`、有单号的 `pod_guide`。
- 点亮顺序：
  1. `validate-intent` 校验并归一输入，`query` / `penalty` 必须有 `inboundOrderNos` / `inboundOrderNo` / `bookingNo`。
  2. `route-intent` 输出 `routePath=api_chain`、`skipApi=false`，有查询键时 `skipOrderDetail=false`。
  3. `resolve-inbound-lookup` 把入库单号拆成 `wiOrderNos` / `customerRefNos`。
  4. `build-winit-inbound-detail` 构造 `winit.wh.inbound.getOrderDetail` actions。
  5. `build-booking-list-request` 构造 `winit.wh.inbound.booking.list` action。
  6. `fetch-inbound-order` 拉取入库单表头，输出 `rawOrderData`。
  7. `fetch-booking-list` 拉取预约记录，输出 `bookingRecords`。
  8. `summarize-booking-records` 合并预约 API 记录和订单表头兜底，输出 `bookingSummary`。
- API 链路点亮成功的可观察结果：`skipApi=false`、有 booking action、`bookingRecords` 或 order header fallback 被汇总、`bookingSummary.dataQuality` 不是无意义空值。

#### 4.5 KB 链路如何点亮？

- KB 链路几乎所有场景都会点亮，因为最终回答都需要规则 / SOP 支撑；区别在于加载哪组 KB。
- 点亮条件来自 `intent`、`deliveryWayHint`、`warehouseCode`、`routePath` 和 query 文本。
- `load-booking-kb` 按 intent 选择片段：
  - `create_guide`：`booking-sop`，并按 LCL / FCL / Express 过滤；同时可加入 `booking-api-reference` 的 API 链路 / 核心规则 / FCL 必填。
  - `modify_guide`：`booking-rules` 修改 / 变更 + SOP 通用说明。
  - `cancel_guide`：`booking-rules` 取消 / 免费取消 + `penalty-rules` 未到仓 / 超时取消。
  - `split_shipment`：`split-shipment` + SOP 合并预约 / 通用说明。
  - `penalty`：`penalty-rules`，如 query 命中增值 / 付费预约则加 `premium-booking`，并补充快递 / 仓内上架相关 SOP。
  - `query`：`booking-api-reference` 预约状态码 / API 链路 + `booking-rules` + SOP 通用说明。
  - `pod_guide`：`pod-download-guide` + `booking-api-reference` POD / 状态码 + `booking-rules` 预约状态。
- KB 链路点亮成功的可观察结果是 `kbContent` 非空、`kbScope` 带有 intent 和 routePath，例如 `query:api_chain` 或 `create_guide:LCL:kb_only`。

#### 4.6 业务出域 / 转介链路如何点亮？

- 业务出域 / 转介链路由 `scope-guard` 点亮，它不是 intent 主路由，而是 API 链之后基于订单事实的业务范围二次判断。
- 点亮前提：通常需要 API 链拿到 `rawOrderData`，并能从入库单表头读到 `winitProductCode` / `productCode`。
- 判断逻辑：
  - `routePath=kb_only` 或没有 PSC：`scopeAction=answer`，不做出域转介。
  - PSC 匹配标准头程 `OW01011`：`scopeAction=refer_process_guide`，`referExpertId=inbound/inbound-process-guide`。
  - PSC 不匹配直发预约链路 `OW01021/22/31/32`：`scopeAction=refer_process_guide`，转 `inbound/inbound-process-guide` 或提示确认产品选型与送仓规则。
  - PSC 属于直发预约链路：`scopeAction=answer`，继续由本 expert 回答。
- `format-output` 会把 `scopeAction`、`referExpertId` 合并进 `structured`，并在有 `referExpertId` 时写入 `outputContext.nextExpertId`。

### 思维纠偏

- API 链路不是单独一个 API 调用，而是入库单详情链和预约列表链两条事实链，再由 `summarize-booking-records` 汇总。
- KB 链路不是只在 `kb_only` 场景点亮；API + KB 解读也要点亮 KB，用来解释 API 事实。
- 业务出域 / 转介不是普通异常兜底，而是基于 PSC 的业务边界判断。

### 后置问题

- 4.7 需要继续展开失败 / 兜底链路，包括 invalid、API 空结果、manual action。
- 4.8 需要继续展开输出链路如何把中间结果合成 `structured`、`analysis`、`outputContext`、`enrichedContext`。
- 4.9 需要明确哪些链路不存在或当前无法确定。

### 下一步

- 继续步骤4 4.7-4.9：
  - 4.7 失败 / 兜底链路如何点亮？
  - 4.8 输出链路如何点亮？
  - 4.9 哪些链路不存在或无法确定？

## ARCHIVE_PACKET 2026-08-10 16:54-step4-close

### 阶段

步骤4：主链路、支线与节点点亮 / 4.7-4.9。

### 本轮有效产出

#### 4.7 失败 / 兜底链路如何点亮？

- 失败 / 兜底链路不是一条单独的 `need_human` 分支，而是分布在校验、路由、API fetch、预约汇总和输出合并几个节点里。
- 第一类失败：输入校验失败。
  - `validate-intent` 对 `query` / `penalty` 要求至少有 `inboundOrderNos` / `inboundOrderNo` / `bookingNo`。
  - 如果缺少查询键，输出 `validationOk=false` 和错误信息。
  - `route-intent` 看到 `validationOk !== true` 后输出 `routePath=invalid`、`skipApi=true`、`skipOrderDetail=true`、`kbOnly=true`。
  - 这表示后续不再查 API，而是让 LLM 基于错误、intent 和 KB 给出补充信息要求。
- 第二类失败：API 被主动跳过。
  - KB-only intent 或 invalid 路径会让 `build-booking-list-request` 返回空 `actions`。
  - `fetch-booking-list` 在 `skipApi=true` 时返回空 `bookingRecords`。
  - `fetch-inbound-order` 在 `skipOrderDetail=true` 时返回 `rawOrderData.list=[]`，并带 `_fetchMeta.strategy=skipped`。
  - 这不是异常，而是正常的“不要查 API”路径。
- 第三类失败：API 查不到或本地补拉失败。
  - `fetch-booking-list` 如果插件输出为空、本地 Coze 代理缺 env、或调用异常，会降级为 `bookingRecords=[]`。
  - `fetch-inbound-order` 如果缺 env 或单次调用异常，会降级为空 `rawOrderData.list=[]`。
  - 节点内部不会把这些失败直接抛给最终用户，而是把空事实交给 `summarize-booking-records`。
- 第四类兜底：预约列表为空时用入库单表头兜底。
  - `summarize-booking-records` 先标准化 `booking.list` 结果。
  - 如果预约 API 没有记录，再从 `getOrderDetail` 表头提取 `bookingNo` / `inboundBookingStatus` / `appointmentDate` / 仓库等预约提示字段。
  - 兜底成功时 `dataQuality=order_header_fallback`。
  - 如果连表头兜底也没有记录，`dataQuality=missing`。
- 第五类兜底：人工动作标记。
  - 对 `query` / `penalty`，如果合并后仍无记录，`summarize-booking-records` 输出 `requiresManualAction=true`。
  - `format-output` 会把这个字段合并到 `structured.requiresManualAction`。
  - 这表示需要人工确认 / 后续处理，而不是系统已经完成事实查询。
- 另外，业务出域不是失败兜底，而是 `scope-guard` 的边界判断；它通过 `scopeAction` / `referExpertId` 表达转介。

#### 4.8 输出链路如何点亮？

- 输出链路从 `llm-analyze` 的 `analysisResult` 开始，最后由 `format-output` 统一点亮。
- 输入来源有四类：
  - LLM 输出：`analysisResult.structured` 和 `analysisResult.analysis`。
  - 事实汇总：`bookingSummary`。
  - 业务边界判断：`scopeGuard`。
  - 上下文：`inputContext.chainId`。
- `format-output` 先把 `analysisResult` 归一化：
  - 如果是空值，给默认 `analysis="未收到模型输出。"`。
  - 如果是字符串，尝试按 JSON 解析；解析失败就把字符串当作自然语言 `analysis`。
  - 如果是对象，读取其中的 `structured` 和 `analysis`。
- `structured` 的点亮逻辑：
  - 先保留 LLM 给出的 `structured`。
  - 如果 `bookingSummary.recordCount` 存在且 LLM 未写 `bookingRecords`，补入 `bookingSummary.records`。
  - 如果有 `totalPenaltyFee` 且 LLM 未写 `penaltyFee`，补入费用字段。
  - 始终补入 `bookingSummary.dataQuality`。
  - 如果 `bookingSummary.requiresManualAction=true`，补入 `requiresManualAction=true`。
  - 如果 `scopeGuard` 有 `scopeAction` / `referExpertId` 且 LLM 未写，补入对应字段。
- `analysis` 的点亮逻辑：
  - 优先使用 LLM 的自然语言答案。
  - 如果没有，则输出占位文本 `（无 analysis 字段）`。
  - 这说明最终对客文本主要依赖 LLM，而 `format-output` 只做兜底和契约整理。
- `outputContext` 的点亮逻辑：
  - 固定写入 `expertId=inbound-appointment-manage`。
  - `resultSummary` 取 `analysis` 前 200 字。
  - `chainId` 来自 `inputContext.chainId`，没有则为空。
  - 如果 `scopeGuard.referExpertId` 存在，写入 `nextExpertId`。
- `enrichedContext` 的点亮逻辑：
  - 原样带出 `bookingSummary` 和 `scopeGuard`。
  - 它用于追溯、调试或后续编排复用；是否被外层 planner 稳定消费，当前材料无法完全确定。

#### 4.9 哪些链路不存在或无法确定？

- 不存在的链路：
  - 没有代客创建预约链路：`booking.create` 不调用。
  - 没有代客取消预约链路：`booking.cancel` 不调用。
  - 没有代客修改预约写操作链路；只提供修改预约 SOP。
  - 没有实时 slot 查询链路：`queryAvailableWarehouseinPlan` 有规格但本 expert 不调用。
  - 没有待预约单列表链路：`unBookingOrder.list` 不调用，只在 KB 中说明待预约单来源。
  - 没有 PDF 文件下载 / 转发链路：`exportPodPdf` 不调用，`pod_guide` 只给万邑联自助下载 SOP。
  - 没有统一 `need_human` branch；本 expert 用 `requiresManualAction`、`scopeAction`、`referExpertId`、禁止写操作等信号表达兜底 / 转介。
  - baseline expert 自身没有数据回流层；扩大到 `experts_recaller` 后，可以确认存在“会话级上下文回传层”：`outputContext`、`structured` / `analysis`、`enrichedContext` 会被写入 `sessionHandoff`，并在后续 expert 调用时作为 `previousOutput` 或 `inputs.enrichedContext` 复用。
  - 但这仍是运行时编排上下文复用，不是用于持续优化 KB / prompt / eval 的数据回流闭环。当前工程中没有看到客户反馈、人工处理结果、失败样本自动写回知识库、prompt 或评测集的机制。
- 当前无法确定的链路：
  - 在 baseline expert 自身材料中，无法确定 `outputContext` / `enrichedContext` 被外层 planner 如何消费；但把范围放宽到 `agentic/experts/experts_recaller` 后，可以看到外层编排会消费这些字段。
  - `call-expert.ts` 调用子 expert 后，会解析 `structured`、`analysis`、`outputContext`，并可选解析 `enrichedContext`。
  - `post-expert-output.ts` 消费 `outputContext` 来更新 `chainContext`、勾选 plan、追加执行日志；同时把 `structured` / `analysis` / `outputContext` / `enrichedContext` 写入 `sessionHandoff.steps[]`。
  - `check-planner-output.ts` 初始化 `chainContext.chainId` 和 `sessionHandoff`。
  - `resolve-next-queue-job.ts` 读取并透传 `sessionHandoff`，暴露上一跳的 `last_step_result_json` / `last_step_expert_id` 给后续 prompt / 参数构造。
  - `build-expert-invoke-baseline.ts` 用 `sessionHandoff` 构造下一跳 expert 的 `inputContext.previousOutput`；如果 manifest 开启 `x_recaller_propagate_previous_enriched_context=true`，还会把历史 `enrichedContext` 归并成域索引后塞进 `inputs.enrichedContext`。
  - `merge-queue-input-params.ts` 合并 LLM 生成参数和 baseline 参数，且 baseline 的 `inputContext` / `inputs.enrichedContext` 优先。
  - `chainId` 在上层链式编排中的具体使用方式，当前材料不能完全确定。
  - 线上 Coze 插件失败时是否有平台级重试 / 告警 / 人工兜底，当前 expert 代码只能确认本地节点会降级为空事实。
  - `scopeAction=refer_process_guide` 后，上层是否自动调用 `inbound/inbound-process-guide`，当前只能确认 `outputContext.nextExpertId` 被写出，不能确认外层一定自动接力。
  - `enrichedContext` 是否被下游 expert 读取，取决于目标 expert manifest 是否显式开启 `x_recaller_propagate_previous_enriched_context=true`；没有开启时不能假设一定透传。

### 思维纠偏

- 失败链路不能只找一个 `need_human` 节点；这里的失败表达分散在 `validationOk`、`routePath=invalid`、`dataQuality=missing`、`requiresManualAction`、`scopeAction`、`referExpertId`。
- 空 API 结果不等于系统崩溃；在这个 expert 里，很多 fetch 失败会被降级为空列表，再由汇总节点判断数据质量和人工动作。
- “不存在的链路”要和“有 OpenAPI 规格但本 expert 不调用”区分开；不能因为文档里出现接口名就认为运行时链路已点亮。
- 输出链路要区分对客文本、机器结构化字段、编排摘要和追溯上下文。

### 后置问题

- 步骤5 可以把步骤2-4 中反复出现的概念沉淀成四步法：业务边界、事实链路、决策链路、输出契约。
- 后续迁移非标增值 SOP expert 时，要优先检查是否存在类似的“有接口规格但不调用”的误判风险。

### 下一步

- 步骤4已完成。
- 等待进入步骤5：概念四步法与后置问题清理。

## ARCHIVE_PACKET 2026-08-10 17:20-step4-4.9-revision

### 阶段

步骤4：4.9 不存在 / 无法确定链路修订；同步修订步骤3：3.10 数据回流层。

### 本轮有效产出

- 修订 4.9：不再简单说“没有数据回流闭环”，而是区分两层：
  - **有**：链路内上下文回流 / `sessionHandoff` / `enrichedContext` 传播。
  - **没有明确证据**：学习型数据回流 / badcase 到 KB-prompt-eval 的闭环。
- 修订 4.9：不再说 `outputContext` / `enrichedContext` 的外层消费完全无法确定；在 baseline expert 自身材料中无法确定，但扩大到 `experts_recaller` 后可以确认：
  - `call-expert.ts` 解析子 expert 的 `structured`、`analysis`、`outputContext`，并可选解析 `enrichedContext`。
  - `post-expert-output.ts` 用 `outputContext` 更新 `chainContext`、plan 和执行日志，并把 `structured` / `analysis` / `outputContext` / `enrichedContext` 写入 `sessionHandoff.steps[]`。
  - `check-planner-output.ts` 初始化 `chainContext.chainId` 和 `sessionHandoff`。
  - `resolve-next-queue-job.ts` 透传 `sessionHandoff`，并暴露上一跳 `last_step_result_json` / `last_step_expert_id`。
  - `build-expert-invoke-baseline.ts` 用 `sessionHandoff` 构造下一跳的 `inputContext.previousOutput`；当目标 manifest 开启 `x_recaller_propagate_previous_enriched_context=true` 时，把历史 `enrichedContext` 归并后传入 `inputs.enrichedContext`。
  - `merge-queue-input-params.ts` 合并 LLM 参数和 baseline 参数，且 baseline 的 `inputContext` / `inputs.enrichedContext` 优先。
- 同步修订 3.10：baseline expert 自身没有独立数据回流层；`experts_recaller` 有运行时上下文回传层；但当前工程没有看到客户反馈、人工处理结果、真实会话标注、线上失败样本自动写回知识库、prompt 或评测集的机制。

### 思维纠偏

- “数据回流”不能只按有没有自动优化闭环来二分；要先区分运行时上下文回传和学习型数据回流。
- `outputContext` / `enrichedContext` 在单个 expert 内只是输出契约；放到 `experts_recaller` 外层编排里，才看到它们如何进入 `sessionHandoff` 并影响下一跳。
- “当前无法确定”必须带范围：baseline expert 自身无法确定，不代表扩展到外层编排后仍无法确定。

### 后置问题

- 步骤5 总结方法论时，需要加入“分析范围边界”这一条：先看单 expert，再看外层 orchestrator / recaller。
- 后续迁移非标增值 SOP expert 时，要检查目标 expert 是否开启 `x_recaller_propagate_previous_enriched_context`，以及是否需要消费上一跳 `previousOutput`。

### 下一步

- 步骤4仍为完成状态。
- 等待进入步骤5：概念四步法与后置问题清理。

## ARCHIVE_PACKET 2026-08-10 17:24-step5-5.1-5.3

### 阶段

步骤5：概念四步法与后置问题清理 / 5.1-5.3。

### 本轮有效产出

#### 5.1 这次 baseline 拆解沉淀出的“概念四步法”是什么？

四步法是：**业务边界 -> 事实链路 -> 决策链路 -> 输出契约**。

1. 业务边界：先回答这个 expert 到底处理什么、不处理什么、什么时候转介。
   - 对 `inbound-appointment-manage` 来说，它处理预约送仓 SOP、预约状态查询、违规费说明、POD 下载指引。
   - 它不代客创建 / 修改 / 取消预约，不查实时 slot，不下载 PDF，不处理入库总状态 / 签收轨迹 / VASC 服务项。
   - 业务边界不是一句描述，而是“可处理范围 + 禁止动作 + 转介范围”。
2. 事实链路：再回答系统靠哪些输入和 API / KB 得到事实。
   - 用户输入：intent、query、单号、bookingNo、仓库、送仓方式 hint。
   - API 事实：`booking.list`、`getOrderDetail` 表头兜底。
   - KB 事实：booking SOP、预约规则、违规费规则、分批到仓规则、POD 下载指引、API reference。
   - 事实链路要区分“运行时真的调用”和“文档里有规格但不调用”。
3. 决策链路：然后回答系统如何选择路径。
   - `validate-intent` 判断 intent 和必填查询键。
   - `route-intent` 判断 `kb_only` / `api_chain` / `invalid`，并设置 `skipApi` / `skipOrderDetail`。
   - `scope-guard` 用 PSC / `winitProductCode` 做业务范围二次判断，必要时转 `inbound/inbound-process-guide`。
   - `summarize-booking-records` 用 `dataQuality` 和 `requiresManualAction` 表达缺失 / 兜底。
4. 输出契约：最后回答结果给谁消费、以什么结构继续流转。
   - `analysis` 给人读。
   - `structured` 给系统读。
   - `outputContext` 给外层链式编排 / handoff 用。
   - `enrichedContext` 给追溯、复用和下一跳上下文传播用。

这个四步法的价值：它逼我们先从业务闭环看，再看事实来源，再看路由判断，最后看输出消费；避免一上来陷进节点细节。

#### 5.2 四步法如何落到文件 / 节点上？

四步法不是抽象口号，必须能映射到具体文件和节点。

- 业务边界主要看：
  - `manifest.json`：expert 描述、输入 schema、候选 intent。
  - `design.md`：定位、覆盖范围、不覆盖范围、禁止项、转人工条件。
  - `prompts/main.md`：对客口径和禁止承诺。
- 事实链路主要看：
  - `workflow.json`：哪些节点真的在链路里。
  - `nodes/build-booking-list-request.ts` / `fetch-booking-list.ts`：预约列表 API 链。
  - `nodes/build-winit-inbound-detail.ts` / `fetch-inbound-order.ts`：入库单表头兜底链。
  - `nodes/load-booking-kb.ts` 和 `prompts/kb/*.md`：KB 选择和知识依据。
  - `design.md` 的“不调用”表：识别有规格但不参与运行时的接口。
- 决策链路主要看：
  - `nodes/validate-intent.ts`：intent 识别、别名归一、查询键校验。
  - `nodes/route-intent.ts`：`kb_only` / `api_chain` / `invalid`，以及 `skipApi` / `skipOrderDetail`。
  - `nodes/scope-guard.ts`：PSC 业务边界二次路由。
  - `nodes/summarize-booking-records.ts`：API 记录、表头兜底、`dataQuality`、`requiresManualAction`。
- 输出契约主要看：
  - `nodes/format-output.ts`：`structured` / `analysis` / `outputContext` / `enrichedContext` 的最终合成。
  - `workflow.json` 的 node outputs：确认输出字段是否是正式契约。
  - `experts_recaller/nodes/call-expert.ts` / `post-expert-output.ts` / `build-expert-invoke-baseline.ts`：确认外层如何消费 `outputContext` / `enrichedContext`。

落地顺序建议：

1. 先读 `manifest.json` 和 `design.md`，不要先读 node。
2. 再读 `workflow.json`，画出运行时链路。
3. 再读关键 nodes，确认分支条件和字段。
4. 最后读外层 orchestrator / recaller，确认输出是否被下一跳消费。

#### 5.3 如何处理“分析范围边界”：单 expert、外层编排、学习闭环分别怎么看？

分析范围必须显式声明，否则容易把三类东西混在一起。

第一层：单 expert 内部。

- 只看 `agentic/experts/experts/inbound/inbound-appointment-manage/` 时，可以确认：
  - 它如何识别 intent。
  - 它如何选择 KB / API。
  - 它调用哪些 API，跳过哪些 API。
  - 它如何输出 `structured` / `analysis` / `outputContext` / `enrichedContext`。
- 但单 expert 内部不能回答：
  - 外层 planner 如何消费 `outputContext`。
  - 下一跳 expert 是否接收 `enrichedContext`。
  - session handoff 如何组织。

第二层：外层编排 / recaller。

- 扩大到 `agentic/experts/experts_recaller/` 后，可以确认：
  - `call-expert.ts` 解析子 expert 输出。
  - `post-expert-output.ts` 把结果写入 `sessionHandoff.steps[]` 并更新 `chainContext`。
  - `resolve-next-queue-job.ts` 透传 `sessionHandoff`，暴露上一跳结果。
  - `build-expert-invoke-baseline.ts` 把上一跳结果变成下一跳 `inputContext.previousOutput`，并在 manifest 开关允许时传播 `inputs.enrichedContext`。
- 所以 `outputContext` / `enrichedContext` 的消费不是完全未知，而是要看外层目录才能确认。

第三层：学习型数据回流。

- 运行时上下文回传不等于学习型数据回流。
- 当前能确认的是：链路内上下文可以回传、复用、handoff。
- 当前没有明确证据的是：客户反馈、人工处理结果、失败样本自动写回 KB / prompt / eval。
- 因此正确说法是：
  - 有运行时上下文回流。
  - 没看到持续优化知识库 / prompt / 评测集的数据闭环。

判断规则：

- 如果问题问“这个 expert 自己做了什么”，范围限定在 expert 目录。
- 如果问题问“输出给谁消费 / 下一跳怎么用”，必须扩到外层 orchestrator / recaller。
- 如果问题问“系统会不会越用越好”，必须找反馈采集、标注、badcase 管理、KB/prompt/eval 更新机制；不能用 session handoff 代替。

### 思维纠偏

- 四步法不是“先画流程图”，而是先定业务边界，再找事实来源，再拆决策，再看输出契约。
- 文件阅读顺序要从 `manifest/design/workflow` 到 nodes，再到外层 recaller；不要反过来从某个 node 推全局。
- 以后说“不存在”或“无法确定”必须带范围：单 expert 范围、外层编排范围、学习闭环范围。

### 后置问题

- 5.4 需要清理本阶段剩余后置问题：哪些需要带入迁移，哪些已经解决。
- 5.5 需要把 baseline 拆解方法迁移成非标增值 SOP expert 的检查清单。
- 5.6 需要定义进入阶段2前的验收标准。

### 下一步

- 继续步骤5 5.4-5.6：
  - 5.4 后置问题清单如何收口？
  - 5.5 迁移到非标增值 SOP expert 时优先检查什么？
  - 5.6 进入阶段2前的验收标准是什么？

## ARCHIVE_PACKET 2026-08-10 17:40-step4-correction-and-4.1-4.3

### 阶段

步骤4纠偏并重启：文件与能力层级映射 / 4.1-4.3。

### 本轮有效产出

#### 纠偏说明

- 用户指出此前步骤4方向错误：不应是“主链路、支线与节点点亮”，而应是“文件与能力层级映射”。
- 处理方式：
  - 早前“步骤4：主链路、支线与节点点亮 / 4.1-4.9”标注为误归档，不计入有效步骤4。
  - 早前“步骤5：概念四步法与后置问题清理 / 5.1-5.3”建立在错误步骤4之上，也不计入当前有效进度。
  - 步骤4重启为“文件与能力层级映射”，共 6 题；本轮完成 4.1-4.3。

#### 4.1 文件与能力层级映射的目标是什么？

- 目标不是再画业务流程，而是回答：**一个 expert 的能力分别由哪些文件承载，每类文件在系统里负责什么层级的能力。**
- 这一步要把“文件”从路径清单升级成“能力地图”：
  - 哪些文件定义业务范围。
  - 哪些文件定义输入 / 输出契约。
  - 哪些文件定义运行时编排。
  - 哪些文件实现确定性节点能力。
  - 哪些文件承载 KB / SOP / 规则知识。
  - 哪些文件负责测试、验收、调试或外层 handoff。
- 对 `inbound-appointment-manage` 来说，文件与能力层级映射要服务两个目的：
  - 读懂 baseline：知道每个能力去哪里找依据。
  - 后续迁移：迁移非标增值 SOP expert 时，知道哪些能力必须复刻、哪些可以删减、哪些需要外层编排配合。
- 本步骤不再回答“主链路如何走”，而是回答“主链路背后的能力分别落在哪些文件上”。

#### 4.2 baseline expert 的文件 / 目录可以分成哪些能力层级？

可以分成 8 个能力层级：

1. Expert 身份与入口契约层。
   - 说明这个 expert 是谁、什么时候被调用、接受哪些输入。
   - 典型文件：`manifest.json`。
2. 设计与业务边界层。
   - 说明覆盖范围、不覆盖范围、API 取舍、转人工条件、本地验收口径。
   - 典型文件：`design.md`。
3. 运行时编排层。
   - 说明节点顺序、输入输出字段、哪些节点真正参与运行。
   - 典型文件：`workflow.json`。
4. 确定性节点能力层。
   - 用 TypeScript 节点实现 intent 识别、路由、API request 构造、API 输出解析、兜底汇总、scope guard、输出格式化。
   - 典型目录：`nodes/*.ts`。
5. LLM 推理与对客表达层。
   - 约束模型如何基于事实和 KB 生成回答，哪些话不能说。
   - 典型文件：`prompts/main.md`。
6. KB / SOP / 规则知识层。
   - 承载预约 SOP、预约规则、违规费规则、分批到仓、POD 下载、API reference。
   - 典型目录：`prompts/kb/*.md`。
7. 测试 / 验收 / 调试层。
   - 用 smoke、fixture、线上测试、run history inspect 确认 expert 是否可运行、输出是否符合契约。
   - 典型文件：`agentic/experts/package.json`、`scripts/smoke-inbound-appointment-manage.ts`、`scripts/fixtures/inbound-appointment-manage.fixture.example.json`、`scripts/README.md`。
8. 外层编排 / handoff 层。
   - 不在 baseline expert 自身目录内，但负责消费 `outputContext` / `enrichedContext`，把上一跳结果传给下一跳。
   - 典型目录：`agentic/experts/experts_recaller/nodes/*.ts`。

#### 4.3 每个能力层级对应哪些核心文件？

核心映射如下：

| 能力层级 | 核心文件 / 目录 | 主要作用 |
| --- | --- | --- |
| Expert 身份与入口契约层 | `manifest.json` | 定义 expert id、描述、输入 schema、intent 枚举、何时使用 |
| 设计与业务边界层 | `design.md` | 定义业务定位、覆盖范围、不处理范围、API 取舍、转人工、验收标准 |
| 运行时编排层 | `workflow.json` | 定义节点列表、执行顺序、节点输入输出、Coze IO 类型 |
| 确定性节点能力层 | `nodes/validate-intent.ts`、`route-intent.ts`、`resolve-inbound-lookup.ts`、`build-*`、`fetch-*`、`summarize-booking-records.ts`、`scope-guard.ts`、`load-booking-kb.ts`、`format-output.ts` | 把业务规则落成可执行节点能力 |
| LLM 推理与对客表达层 | `prompts/main.md` | 约束 LLM 的回答结构、表达口径、禁止项 |
| KB / SOP / 规则知识层 | `prompts/kb/*.md` | 提供 SOP、预约规则、违规费规则、分批到仓、POD 下载、API 字段解释 |
| 测试 / 验收 / 调试层 | `package.json` scripts、`scripts/smoke-inbound-appointment-manage.ts`、fixture、`scripts/README.md` | 提供 smoke、本地真实 API 验收、线上测试和 run history inspect 方法 |
| 外层编排 / handoff 层 | `experts_recaller/nodes/call-expert.ts`、`post-expert-output.ts`、`check-planner-output.ts`、`resolve-next-queue-job.ts`、`build-expert-invoke-baseline.ts`、`merge-queue-input-params.ts` | 负责跨 expert 的输出解析、session handoff、previousOutput / enrichedContext 传播 |

### 思维纠偏

- “文件与能力层级映射”不是流程拆解；流程拆解回答节点怎么走，文件映射回答能力由哪些文件承载。
- 不能把 `workflow.json` 当成所有能力来源；它只说明运行时节点组织，业务边界要看 `design.md` / `manifest.json`，知识依据要看 `prompts/kb`。
- 外层 `experts_recaller` 不属于 baseline expert 自身能力，但属于输出契约被消费的编排环境；分析时要明确范围。

### 后置问题

- 4.4 需要继续把 `nodes/*.ts` 逐个映射到具体能力。
- 4.5 需要把 `experts_recaller` 的外层 handoff 文件映射到跨 expert 能力。
- 4.6 需要把正式 `file-role-map.md` 收口成迁移可用的检查清单。

### 下一步

- 继续步骤4 4.4-4.6：
  - 4.4 节点文件如何映射到具体能力？
  - 4.5 外层编排 / handoff 文件如何映射到跨 expert 能力？
  - 4.6 最终 file-role-map 如何收口并服务迁移？

## ARCHIVE_PACKET 2026-08-10 18:06-canonical-110-curriculum

### 阶段

课程源纠偏：固化 110 题主课程表，并重置阶段4题目。

### 本轮有效产出

- 用户确认：此前仓库中没有完整 110 题训练清单，Codex 不应自行编造题目。
- 新增 `agent-map-training/110-question-curriculum.md` 作为唯一主课程来源。
- 明确总题量：
  - 阶段1：现状对齐，6 题。
  - 阶段2：项目基础画像，10 题。
  - 阶段3：系统分层建模，10 题。
  - 阶段4：文件与能力层级映射，10 题。
  - 阶段5：主链路与支线识别，10 题。
  - 阶段6：概念四步法训练，10 个核心概念，每个 4 问，共 40 题。
  - 阶段7：节点点亮验收，10 题。
  - 阶段8：迁移到非标增值 SOP expert，14 题。
  - 合计：`6 + 10 + 10 + 10 + 10 + 40 + 10 + 14 = 110`。
- 阶段4正确题目重置为：
  - 4.1 `design.md` 在系统里承担什么角色？
  - 4.2 `manifest.json` 承担什么角色？
  - 4.3 `workflow.json` 承担什么角色？
  - 4.4 `nodes/` 承担什么角色？
  - 4.5 `prompts/` 承担什么角色？
  - 4.6 `coze.config.yml` 承担什么角色？
  - 4.7 KB 文件和 prompt 的关系是什么？
  - 4.8 API 节点和 KB 节点的关系是什么？
  - 4.9 LLM 节点在整个链路中做什么？
  - 4.10 `format-output` 为什么重要？
- `runtime/curriculum.json`、`progress_state.json`、`progress-board.md` 已重置为阶段4 4.1-4.3，尚未回答。
- 回答格式固定为：`【回答结论】 -> 【思考过程】 -> 【依据】`。

### 思维纠偏

- 如果仓库没有全量课程表，必须明确告知用户，而不是根据已有错误状态补题。
- 进度文件不是课程源；课程源现在固定为 `110-question-curriculum.md`。
- 后续每次继续训练前，必须先读取主课程表，再读 runtime 状态。

### 后置问题

- 阶段1的 6 个明细题目当前仍未在仓库完整保存；如需复盘，必须先向用户确认。
- 旧的误归档内容保留审计记录，但不作为有效阶段4/5依据。

### 下一步

- 重新开始阶段4 4.1-4.3，并按固定格式回答：
  - 4.1 `design.md` 在系统里承担什么角色？
  - 4.2 `manifest.json` 承担什么角色？
  - 4.3 `workflow.json` 承担什么角色？

## ARCHIVE_PACKET 2026-08-10 18:47-phase4-4.1-4.3

### 阶段

阶段4：文件与能力层级映射 / 4.1-4.3。

### 本轮有效产出

#### 4.1 `design.md` 在系统里承担什么角色？

【回答结论】

`design.md` 是这个 expert 的**路书 / 能力地图 / 设计说明书**。

它不负责真正执行节点，也不是给模型直接生成答案的 prompt。它的作用是把这个 expert 的“该做什么、不该做什么、怎么分流、查哪些 API、用哪些 KB、输出什么、怎么验收”先讲清楚。

一句话：`design.md` 是人和工程系统理解这个 expert 的总设计依据。

【思考过程】

- 判断一个文件角色，先看它是否参与运行时。`design.md` 不在 `workflow.json` 的节点列表里，所以它不是运行时节点。
- 但它覆盖的信息非常全：
  - 定义业务定位：预约送仓 SOP 分发器 + 预约单 / 违规费只读解读器。
  - 定义边界：不代客创建 / 取消预约，不下载 PDF，不查实时 slot。
  - 定义 intent 和 routePath：哪些走 `kb_only`，哪些走 `api_chain`。
  - 定义 API 取舍：`booking.list` 读取，`booking.create` / `cancel` / `exportPodPdf` / `queryAvailableWarehouseinPlan` 不调用。
  - 定义 workflow 顺序和节点职责。
  - 定义输出字段：`structured`、`analysis`、`outputContext`、`enrichedContext`。
  - 定义验收方式：smoke 命令、API 链断言、`dataQuality` 要求等。
- 所以它不是“代码”，而是把业务、工程、节点、KB、测试串起来的设计地图。

【依据】

- `agentic/experts/experts/inbound/inbound-appointment-manage/design.md` 开头明确定位为“预约送仓操作指引”。
- `design.md` 的“设计定位”说明 `kb_only` 和 `api_chain` 两类路径。
- `design.md` 的“边界分工”“不调用”“对客约束”定义能力边界。
- `design.md` 的“工作流编排”“节点说明”描述 workflow 和 nodes 的关系。
- `design.md` 的“输出设计”“本地验收”定义输出契约和验收标准。

#### 4.2 `manifest.json` 承担什么角色？

【回答结论】

`manifest.json` 是这个 expert 的**身份卡 / 调用说明 / 输入输出契约摘要**。

它告诉外部系统：

- 这个 expert 叫什么、属于哪个 domain。
- 什么时候应该调用它。
- 它声称具备哪些 capabilities。
- 调用它可以传哪些输入字段。
- 它会输出什么基本结构。

一句话：`manifest.json` 是 expert 暴露给外部编排层的“注册信息和入口契约”。

【思考过程】

- 和 `design.md` 相比，`manifest.json` 更短、更结构化，也更像机器可读的注册文件。
- 它不解释完整业务逻辑，也不展开 workflow。
- 它只提供外部调度需要知道的关键信息：
  - `id`: `inbound-appointment-manage`
  - `domain`: `inbound`
  - `name`: `预约送仓操作指引`
  - `description`: 什么时候用它、能处理哪些问题、不处理哪些问题
  - `capabilities`: 能力清单
  - `inputSchema`: 可接受的输入字段，比如 `intent`、`inboundOrderNos`、`bookingNo`、`warehouseCode`、`deliveryWayHint`
  - `outputSchema`: 输出包含 `structured` 和 `analysis`
- 所以它的重点不是“内部怎么做”，而是“外部怎么识别和调用它”。

【依据】

- `agentic/experts/experts/inbound/inbound-appointment-manage/manifest.json` 中定义了 `id`、`domain`、`name`、`description`。
- `manifest.json` 的 `capabilities` 列出预约创建指引、修改指引、取消指引、状态查询、违规费说明、POD 下载等能力。
- `inputSchema` 定义 `intent` 枚举和入参字段。
- `outputSchema` 定义输出为 `structured` 和 `analysis`。

#### 4.3 `workflow.json` 承担什么角色？

【回答结论】

`workflow.json` 是这个 expert 的**节点编排图 / 运行时接线表 / 学习地图索引**。

它不定义业务边界，也不写具体节点逻辑；它负责说明：

- 运行时有哪些节点。
- 每个节点调用哪个文件。
- 每个节点吃什么输入。
- 每个节点吐什么输出。
- 哪些输出会影响后续分支。
- 每个节点大致属于哪类能力。
- Coze 侧需要识别哪些 IO 类型。

一句话：`workflow.json` 是把 `nodes/`、LLM 节点和最终输出节点串起来的运行时骨架。

【思考过程】

- 判断 `workflow.json` 的角色，要看它的结构：它是一个 `nodes` 数组，每个元素都有 `id`、`file`、`inputs`、`outputs`，部分还有 `cozeIo`。
- 它说明的是“怎么连线”，不是“为什么这么设计”。
- 现阶段关注到**节点职责 + 输入输出 + 是否主链路必需**就够了，不需要读到每个节点内部代码细节。
- 现在看 `nodes/` 的合适粒度是 4 个问题：
  1. 这个 node 是干什么的？例如 `validate-intent` 是识别 / 校验意图，`route-intent` 是决定走 KB 还是 API。
  2. 它吃什么输入？看 `workflow.json` 里的 `inputs`，不用先深挖代码。
  3. 它吐什么输出？看 `outputs`，重点记住会影响后续分支的字段，比如 `intent`、`routePath`、`skipApi`、`bookingSummary`、`scopeGuard`。
  4. 它属于哪类能力？例如校验节点、路由节点、查数节点、KB 注入节点、LLM 分析节点、输出格式化节点、安全 / 边界节点。
- 暂时不用关注：
  - 每个函数怎么写。
  - 正则怎么匹配。
  - API response 怎么逐字段解析。
  - TypeScript 细节。
  - 异常处理的每行实现。
- 现在学的是“地图”，不是“源码审计”。`nodes/` 先看到“每个节点在链路中负责哪一段能力、输入输出是什么、谁消费它”就够了。

【依据】

- `agentic/experts/experts/inbound/inbound-appointment-manage/workflow.json` 顶层是 `nodes` 数组。
- 每个节点定义了 `id`、`file`、`inputs`、`outputs`。
- `llm-analyze` 节点标记为 `type: "llm"`。
- `format-output` 输出 `structured`、`analysis`、`outputContext`、`enrichedContext`。
- 多个节点包含 `cozeIo.outputs`，说明它也承担 Coze 工作流 IO 类型声明的作用。

### 思维纠偏

- 阶段4看文件角色，不是直接做源码审计。
- `design.md` 是路书和能力地图；`manifest.json` 是外部入口契约；`workflow.json` 是运行时节点接线表。
- 读 `workflow.json` 时，当前只需要看节点职责、输入、输出、能力类型和消费关系；不要提前钻进每个 node 的 TypeScript 实现细节。

### 后置问题

- 4.4 进入 `nodes/` 时，仍然沿用“地图粒度”：先问节点干什么、吃什么、吐什么、属于哪类能力。
- 4.5 再看 `prompts/`，区分 LLM 任务提示和 KB 知识注入。
- 4.6 再看 `coze.config.yml`，确认 Coze 导入 / 配置关系。

### 下一步

- 继续阶段4 4.4-4.6：
  - 4.4 `nodes/` 承担什么角色？
  - 4.5 `prompts/` 承担什么角色？
  - 4.6 `coze.config.yml` 承担什么角色？

## ARCHIVE_PACKET 2026-08-10 15:02-step3-close

### 阶段

步骤3：系统分层建模 / 3.7-3.10。

### 本轮有效产出

#### 3.7 输出契约层输出什么？

- 输出契约层有四类输出：
  1. `analysis`：人读的自然语言答案。
  2. `structured`：系统读的结构化结果。
  3. `outputContext`：链式编排继续接力用的摘要。
  4. `enrichedContext`：保留 `bookingSummary` / `scopeGuard` 的中间上下文。
- `analysis` 是给人看的自然语言答案：
  - 它是 LLM 生成的文字解释，客户 / 卖家运营主要读这个。
  - 里面应包含操作步骤、状态解释、费用说明、POD 下载指引、边界提醒等。
  - `design.md` 的 `analysis` 原则约束它怎么说：例如以“您需要在万邑联平台操作”开头，不承诺减免，不编造金额。
  - 当前层不用掌握 LLM envelope 怎么解析、字符串 JSON 怎么 coerce。
- `structured` 是给系统看的结构化结果：
  - 它是机器可读字段集合，来自 LLM 的 `structured`，再被 `format-output.ts` 合并 `bookingSummary` 和 `scopeGuard`。
  - 它表达 `intent`、`deliveryWayHint`、`operationSteps`、`bookingRecords`、`penaltyFee`、`dataQuality`、`scopeAction`、`referExpertId`、`requiresManualAction` 等。
  - planner / 后续节点可以根据这些字段判断是否转 expert、是否人工、数据质量如何。
  - 不需要背所有字段类型，但要知道关键字段的作用。
- `outputContext` 是给链式编排 / 下游 expert 接力用的摘要：
  - 它不是给客户看的。
  - 它包含 `expertId`、`resultSummary`、`chainId`。
  - 如果发生转介，会带 `nextExpertId`。
  - 它的作用是让上层链路知道：本 expert 处理了什么、摘要是什么、下一步可能交给谁。
  - `chainId` 和 planner 具体如何使用，当前材料无法完全确定。
- `enrichedContext` 是给追溯 / 复用 / 调试用的中间上下文包：
  - 它把 `bookingSummary` 和 `scopeGuard` 原样带出去。
  - 它比 `outputContext` 更详细，用于保留中间判断依据，例如预约汇总、数据质量、PSC 守卫、转介判断。
  - 它是否会被下游稳定消费，当前材料无法确定。
- `design.md` 明确了 `structured` 字段和 `analysis` 原则；`format-output.ts` 明确会把 `bookingSummary`、`scopeGuard` 合并进 `structured`，并生成 `outputContext` / `enrichedContext`；但 `outputContext` / `enrichedContext` 被哪个上层 planner 如何消费，当前材料无法确定。

#### 3.8 人工确认 / 兜底层在哪里？

- 没有名为 `need_human` 的统一字段；本 expert 使用 `requiresManualAction`、`scopeAction`、`referExpertId` 和禁止写操作共同表达兜底 / 转介。
- `booking.list` 失败或为空时，先用 `getOrderDetail` 的表头字段兜底；仍无结果时 `requiresManualAction=true`。
- `scope-guard` 对标准头程或非直发预约链路输出 `scopeAction=refer_process_guide` 和 `referExpertId=inbound/inbound-process-guide`。
- 对客约束明确禁止代客创建 / 修改 / 取消预约、下载 PDF、查询实时 slot、承诺减免、暴露内部 URL。
- 转人工条件包括已预约但 `booking.list` 无记录、违规费金额争议较大、分批到仓需特殊拆单、整柜 Drop 跑空 / 异常退费。

#### 3.9 评测验收层有什么依据？

- 本地验收依据包括 `design.md` 的本地验收说明、`package.json` 的 `smoke:inbound-appointment-manage` 脚本、`scripts/smoke-inbound-appointment-manage.ts` 的断言。
- KB-only 验收断言包括：`create_guide` 应走 `kb_only` 且 `skipApi=true`；LCL 场景 KB 命中散货 / LCL；`split_shipment` KB 包含 3 个自然日；无单号 `pod_guide` 走 `kb_only` 且命中 POD / 万邑联。
- API 链验收断言包括：API 场景不能 `skipApi=true`；`getOrderDetail` 不能被跳过且至少返回 1 条；`bookingSummary.dataQuality` 不能为 `missing`；`scopeGuard` 需要有 `winitProductCode`；最终应有 `structured` 或 `analysis`。
- 依据范围限定：`study/` 目录不作为 baseline expert 的依据；本题只使用 `agentic/experts/...` 下的 design、workflow、nodes、prompts、package/scripts 等原始工程材料。
- 可引用的工程材料包括：`agentic/experts/package.json` 的 `smoke:inbound-appointment-manage`、`scripts/smoke-inbound-appointment-manage.ts`、`scripts/fixtures/inbound-appointment-manage.fixture.example.json`、`scripts/README.md` 中的 `test:expert:online` / `inspect:coze-run-history` 说明、以及 expert 自身的 `design.md` 本地验收段。

#### 3.10 数据回流层是否存在？

- 结论要分两层：
  - **有**：链路内上下文回流 / session handoff / `enrichedContext` 传播。
  - **没有明确证据**：学习型数据回流 / badcase 到 KB-prompt-eval 的闭环。
- 如果只看 baseline expert 自身，也就是 `agentic/experts/experts/inbound/inbound-appointment-manage/`，没有独立的数据回流层；它只负责输出 `structured`、`analysis`、`outputContext`、`enrichedContext`。
- 扩大到 `agentic/experts/experts_recaller` 后，可以确认存在“会话级上下文回传层”：
  - `call-expert.ts` 解析子 expert 的 `structured`、`analysis`、`outputContext`，并可选解析 `enrichedContext`。
  - `post-expert-output.ts` 把 `structured` / `analysis` / `outputContext` / `enrichedContext` 写入 `sessionHandoff.steps[]`，并用 `outputContext` 更新 `chainContext`、plan 状态和执行日志。
  - `resolve-next-queue-job.ts` 透传 `sessionHandoff`，并暴露上一跳的 `last_step_result_json` / `last_step_expert_id`。
  - `build-expert-invoke-baseline.ts` 用 `sessionHandoff` 构造下一跳的 `inputContext.previousOutput`；当目标 expert manifest 开启 `x_recaller_propagate_previous_enriched_context=true` 时，会把历史 `enrichedContext` 归并后塞进 `inputs.enrichedContext`。
  - `merge-queue-input-params.ts` 合并 LLM 参数和 baseline 参数，且 baseline 的 `inputContext` / `inputs.enrichedContext` 优先。
- 但这个“回传层”是运行时编排上下文复用，不是学习型数据回流闭环。
- 当前工程中没有看到客户反馈、人工处理结果、真实会话标注、线上失败样本自动写回知识库、prompt 或评测集的机制。

### 思维纠偏

- 输出契约层要区分客户可读输出、机器可消费结构化字段和编排上下文。
- 人工确认 / 兜底层不能只找 `need_human` 字段；没有这个字段时，要看等价信号：`requiresManualAction`、`scopeAction`、`referExpertId`、转人工条件和禁止动作。
- 评测验收层要区分设计中的验收口径、本地 smoke 断言和工程脚本依据；`study/` 目录不作为 baseline expert 的依据。
- 数据回流层要区分“运行时上下文回传”和“学习型数据回流”。`experts_recaller` 能确认前者存在，但不能把它等同于 badcase 自动进入 KB / prompt / eval 的持续优化闭环。

### 后置问题

- 如果后续要建设数据回流层，需要明确：采集哪些失败样本、谁标注、写入哪里、如何进入 eval / prompt / KB 更新流程。
- 步骤4需要把本步骤的分层模型转成主链路、支线、异常分支和节点点亮图。

### 下一步

- 步骤3已完成。
- 进入步骤4：主链路、支线与节点点亮。

## ARCHIVE_PACKET 2026-08-10 14:59

### 阶段

步骤3：系统分层建模 / 3.4 决策路由层修订。

### 本轮有效产出

用户确认 3.5-3.6 没问题，并要求补全 3.4 中 `scope-guard` 进入决策路由层的显性推理。修订后 3.4 的关键结论：

- 决策路由层有四层判断：
  1. 用户想做什么：`validate-intent` 归一 intent。
  2. intent 走 KB 还是 API：`route-intent` 输出 `kb_only` / `api_chain` / `skipApi` / `skipOrderDetail`。
  3. 进入 API 链后查哪些事实：`skipApi=false` 查预约记录，`skipOrderDetail=false` 查入库单详情。
  4. 查到入库单后是否仍属于本 expert 的业务边界：`scope-guard` 根据 `winitProductCode` / PSC 做业务范围二次路由 / 出域判断。
- `scope-guard` 同时属于两个层：
  - 能力编排层：workflow 中的一个节点。
  - 决策路由层：承担业务边界判断和转介决策。
- `scope-guard` 不能缺少，因为 `routePath` 只回答“怎么处理这个 intent”，不能保证“这个订单真的属于本 expert 能处理的业务范围”。

### 思维纠偏

- 之前 3.4 隐含了“scope-guard 是二次路由”的判断，但没有把推理展开。
- 决策路由层不应只停在 `validate-intent -> route-intent -> skipApi`，还要包含业务出域判断。
- 一个节点可以同时属于两个分析层：运行时是编排节点，语义上是业务边界决策点。

### 后置问题

- 后续 3.8 人工确认 / 兜底层要继续区分 `requiresManualAction`、`scopeAction`、`referExpertId` 和禁止写操作。

### 下一步

- 继续步骤3 3.7-3.9：
  - 3.7 输出契约层输出什么？
  - 3.8 人工确认 / 兜底层在哪里？
  - 3.9 评测验收层有什么依据？

## ARCHIVE_PACKET 2026-08-10 14:24

### 阶段

步骤3：系统分层建模 / 3.3 候选范围层修订。

### 本轮有效产出

用户确认 3.1-3.2 没问题，并将 3.3 更新为：

- 候选范围层不是单纯的 intent 列表，而是 Agent 可处理的业务问题集合 + 每类问题对应的处理形态 + 明确不可处理边界。
- 纯 KB 指引类：创建预约指引、修改预约指引、取消预约指引、分批到仓处理、无单号的预约 POD 下载指引；不要求单号，不查 API，输出 SOP、规则说明、操作步骤。
- API + KB 解读类：预约状态查询、违规费说明 / 查询、有单号的预约 POD 下载判断；需要 `inboundOrderNo` / `inboundOrderNos` / `bookingNo` 至少其一，查 `booking.list`，必要时用 `getOrderDetail` 兜底，再结合 KB 解读。
- 越界转介 / 禁止处理类：代客创建 / 修改 / 取消预约、实时 slot 查询、PDF 下载、库容 / 额度、入库单总状态、签收轨迹、VASC 推荐、服务项配置、已提交增值单状态；要么明确禁止，要么转对应 expert / 人工。
- 候选范围层 = 能处理什么 + 用哪种方式处理 + 什么不能处理。

### 思维纠偏

- 3.3 不能只列可处理 intent；必须同时表达处理形态和不可处理边界。
- 候选范围层比 Q5 更进一步：它不是“能力清单”，而是“业务问题类型到处理方式的映射”。

### 后置问题

- 3.4 继续把候选范围映射到决策路由层：intent、routePath、branch。

### 下一步

- 继续步骤3 3.4-3.6：
  - 3.4 决策路由层有哪些分支？
  - 3.5 规则与知识层有哪些 KB/API/SOP？
  - 3.6 能力编排层如何运转？
