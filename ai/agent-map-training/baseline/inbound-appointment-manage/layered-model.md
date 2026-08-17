# Layered Model

状态：已根据 Q1-Q6 归档包整理初稿；表达层和验收层等待后续归档包。

| 层级 | 内容 | 当前理解 | 缺口 | 来源 |
| --- | --- | --- | --- | --- |
| 业务层 | 用户、场景、目标、边界 | 入库前后的预约送仓管理流程；覆盖创建、修改、取消、分批到仓、状态查询、违规费、POD 下载指引；边界是不代客执行写操作。 | 业务角色和用户画像尚未单独展开。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| 任务层 | AI 要完成的任务与判断 | 操作指引、只读状态查询、费用/POD 解读；需要判断 intent、是否有单号、是否越界。 | `SOP 分发器` 和 `只读解读器` 需做概念卡。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2`、`step2-q5-q6` |
| 流程层 | 主链路、分支、回退 | 主体路由是 `intent -> routePath -> kb_only / api_chain -> 输出指引或解读`。无单号的指引走 KB；查询、违规费、有单号 POD 走 API + KB；越界请求转交或提示其他 expert / 人工。 | planner / agent loop 的转交机制后置。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
| 知识层 | KB、规则、示例、术语 | KB 覆盖预约 SOP、LCL/FCL/Express 预约规则、修改/取消、违规费、分批到仓、POD 下载。示例调用标题帮助理解中文场景和 intent 映射。 | Q7 将继续展开规则、知识或历史案例。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2`、`step2-q3-q4` |
| 工具层 | API、外部系统、数据接口 | 主路径使用 `booking.list` 查询预约记录；必要时用 `getOrderDetail` 辅助/兜底。明确不调用写接口、不调用 `exportPodPdf`、不查询实时 slot。 | API 字段级映射待后续文件角色 / 节点点亮阶段展开。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| 表达层 | prompts、回复结构、用户可见输出 | 已知输出类型包括操作步骤、状态解读、费用说明、POD 下载指引、越界转交说明。 | Q8 输出给谁消费尚未归档。 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
| 验收层 | 测试、节点点亮、质量标准 | 暂未归档。 | 等待节点点亮或验收阶段归档包。 | - |
