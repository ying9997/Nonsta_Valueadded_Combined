# Deferred Questions

本文件记录暂不展开、需要后续处理的问题。

| 问题 | 暂缓原因 | 触发条件 | 状态 | 来源 |
| --- | --- | --- | --- | --- |
| 非标增值 SOP expert 迁移 | baseline 拆解尚未开始 | `_inbox` 出现迁移阶段归档包 | 暂缓 | 初始化建档 / 2026-08-09 |
| `SOP 分发器` 概念 | 当前正在做 AI 10 问，不展开概念四步法 | 进入概念卡阶段 | 待处理 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| `只读解读器` 概念 | 当前正在做 AI 10 问，不展开概念四步法 | 进入概念卡阶段 | 待处理 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| `intent` 的上游来源 | 当前阶段只看 design 中 intent 如何被消费 | 概念四步法或编排层阶段 | 待处理 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| `inputContext` / `previousOutput` 来源 | 当前主路径没有展开依赖上游事实 | 文件与能力层级映射或跨 expert 编排阶段 | 待处理 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| `deliveryWayHint` 完整业务背景 | 当前只需保留“辅助选择预约规则和 KB”的模块作用 | 业务字段概念卡阶段 | 待处理 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| 顶层 `query` 与 `inputs.intent=query` 命名冲突 | 这是 baseline design 可读性问题，当前不重构 | design 评审或重构阶段 | 记录 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| planner / agent loop 如何消费转交说明 | 当前 Q5-Q6 只拆 expert 内边界和路由，不展开上层编排 | 编排层阶段 | 待处理 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
