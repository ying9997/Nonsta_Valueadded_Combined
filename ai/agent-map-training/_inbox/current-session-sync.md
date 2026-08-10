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
