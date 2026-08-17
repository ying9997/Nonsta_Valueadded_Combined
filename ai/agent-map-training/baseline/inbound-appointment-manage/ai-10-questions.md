# AI 10 Questions

状态：Q1-Q6 已根据教练会话归档包整理；Q7-Q10 等待后续归档包。

| 序号 | 问题 | 当前答案 | 缺口 | 来源 |
| --- | --- | --- | --- | --- |
| 1 | 这个 AI 项目解决谁的什么问题？ | 该 Agent 工作在入库前后的预约送仓管理流程中，覆盖预约送仓操作指引、修改/取消、分批到仓、预约状态查询、违规费理解和预约 POD 下载指引。它是“操作指引 + 只读状态查询/解读”类 Agent，不代客创建、修改或取消预约单。 | `SOP 分发器`、`只读解读器` 后续用概念四步法展开。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| 2 | 用户入口是什么？ | 用户会在预约送仓相关的操作前、中、后多个触发点使用：创建预约前/创建中、预约后查状态、修改或取消预约、分批到仓、违规费争议、预约 POD 下载。示例调用标题可作为中文场景到 intent 枚举的理解入口。 | intent 上游来源后置；当前只看 design 中 intent 如何被消费。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| 3 | 输入是什么？ | 输入分为自然语言意图和业务字段。自然语言意图表达用户想做什么；业务字段包括 `intent`、`inboundOrderNos` / `inboundOrderNo`、`bookingNo`、`deliveryWayHint`、`warehouseCode`。纯 KB 指引通常不强制单号；`query` / `penalty` / 有单号的 `pod_guide` 需要入库单号或预约单号至少其一。 | `deliveryWayHint` 完整业务背景后置。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| 4 | 系统已知事实有哪些？ | 系统侧信息分为 API 事实、规则知识和上下文。API 事实来自 `booking.list` 主路径，必要时用 `getOrderDetail` 辅助/兜底；规则知识来自预约 SOP、LCL/FCL/Express 规则、修改/取消、违规费、分批到仓、POD 下载指引；`inputContext` / `previousOutput` 暂理解为链式编排的可选上下文。系统明确不调用写接口、不调用 `exportPodPdf`，也不查询实时 slot。 | `inputContext` / `previousOutput` 来源后置；顶层 `query` 与 `inputs.intent=query` 命名冲突只记录，不重构 baseline。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| 5 | Agent 可选择或推荐的候选范围是什么？ | 候选范围是预约送仓管理流程中的操作指引、只读查询和状态/费用/POD 解读：创建预约指引、修改预约指引、取消预约指引、分批到仓处理、预约状态查询、违规费查询/说明、预约 POD 下载指引。不能代客写操作、不能实时查 slot、不能下载 PDF，也不处理库容额度、入库单总状态、签收轨迹、增值服务配置等其他 expert 范围。 | planner 如何消费转交说明后置到编排层。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
| 6 | Agent 需要做哪些路由或决策？ | 先识别 / 归一 `intent`，再结合是否有单号决定走 `kb_only` 还是 `api_chain`。`create_guide`、`modify_guide`、`cancel_guide`、`split_shipment` 走 KB；`query`、`penalty` 需要单号并走 API + KB；`pod_guide` 无单号走 KB，有单号走 API + KB。还要判断单号完整性、是否需要 `booking.list` / `getOrderDetail`，以及是否越界到其他 expert 或人工处理。 | planner / agent loop 如何执行转交后置。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
| 7 | 依赖哪些知识库、规则或 API？ | 待归档。下一步教练会话问题：Agent 依据哪些规则、知识或历史案例？ | 等待 Q7 归档包。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
| 8 | 失败、缺失、歧义如何处理？ | 待归档。下一步教练会话问题：Agent 输出给谁消费？当前题目表述与教练会话 Q8 名称存在差异，待后续归档时校正。 | 等待 Q8 归档包，并校正 10 问题面。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
| 9 | 如何验收效果？ | 待归档 | 待归档 | - |
| 10 | 迁移到新项目时哪些保持不变，哪些需要替换？ | 待归档 | 待归档 | - |
