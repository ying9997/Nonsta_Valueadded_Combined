# Thinking Correction Log

本文件记录教练会话指出的层级错位、思维纠偏和后续提醒。

| 时间 | 原始问题 / 表述 | 纠偏点 | 正确层级 | 后续动作 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 2026-08-09 | 多会话同时推进容易继续制造碎片 | 训练现场和文档归档需要分工，用 `_inbox` 保持同步 | 协作机制 | 保持教练会话负责训练、档案会话负责归档 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 initial` |
| 2026-08-09 | 把 Agent 绑定到单一业务时点 | 应先识别 Agent 覆盖的业务流程段和多个触发节点 | 业务层 | Q1-Q2 先拆流程段和触发点，再看 intent | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| 2026-08-09 | 追问 intent 是上游怎么生成的 | 当前阶段先看 design 中 intent 如何被消费，来源问题后置 | 来源 / 编排层 | 放入 deferred questions，后续用概念四步法处理 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2` |
| 2026-08-09 | 混淆自然语言意图和确定性业务字段 | 用户输入应拆成自然语言意图和业务字段两类 | 输入层 | Q3 继续用“自然语言 + 字段”结构分析 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| 2026-08-09 | 混淆 API 事实和 KB 规则知识 | API 返回线上真实字段值；KB/SOP 提供规则、解释依据和操作步骤 | 工具层 / 知识层 | Q4 和后续 Q7 分开处理事实与规则 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| 2026-08-09 | 顶层 `query` 与 `inputs.intent=query` 容易读成同一概念 | 同名词跨层级出现时要标注层级，不急着重构 baseline | 输入层 / 设计可读性 | 记录为 design 可读性问题 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4` |
| 2026-08-09 | 只给抽象题目导致无头绪找 design | 训练问题需要提供阅读定位、回答边界、防发散提醒 | 训练方法 | 后续问题使用问题提示块模板 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 coaching-format-rule` |
| 2026-08-09 | 混淆 Q5 和 Q6 | Q5 是边界；Q6 是分流和决策 | 能力边界层 / 流程层 | 先抽取 design 明细，再归类，最后总结 | `current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6` |
