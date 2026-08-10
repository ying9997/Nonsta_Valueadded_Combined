# File Role Map

状态：阶段4“文件与能力层级映射”已完成 4.1-4.3；当前等待 4.4-4.6。

| 文件 / 目录 | 角色 | 所在层级 | 与主链路关系 | 备注 | 来源 |
| --- | --- | --- | --- | --- | --- |
| `agentic/experts/experts/inbound/inbound-appointment-manage/` | baseline expert 源目录 | expert 本体 | 承载预约送仓 expert 的业务、编排、节点、prompt、KB | 作为文件与能力映射的根目录 | 仓库复制后校正 / 2026-08-09 |
| `design.md` | 路书 / 能力地图 / 设计说明书 | 设计与业务边界层 | 不直接执行，但定义业务定位、边界、路由、API 取舍、输出和验收 | 人和工程系统理解 expert 的总设计依据 | `ARCHIVE_PACKET 2026-08-10 18:47-phase4-4.1-4.3` |
| `manifest.json` | 身份卡 / 调用说明 / 输入输出契约摘要 | Expert 入口契约层 | 供外部系统识别何时调用、传什么输入、预期什么输出 | 重点是外部识别与调用，不解释内部 workflow | `ARCHIVE_PACKET 2026-08-10 18:47-phase4-4.1-4.3` |
| `workflow.json` | 节点编排图 / 运行时接线表 / 学习地图索引 | 运行时编排层 | 串起 nodes、LLM 节点和 format-output，声明节点 inputs/outputs/cozeIo | 当前只读节点职责、输入输出、能力类型和消费关系，不做源码审计 | `ARCHIVE_PACKET 2026-08-10 18:47-phase4-4.1-4.3` |
