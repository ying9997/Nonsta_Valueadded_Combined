# 非标提报指南实验包总控

## 实验包目标

本实验包用于串行梳理“非标提报指南”进入正式 value-add expert 体系前所需的业务参考、域计划差异、API/KB/GAP 差异、实现准入检查、实现设计草案和总评审材料。

实验区产物仅作为待验收草案、差异分析和串联记录。未经过总控验收和人工确认的内容，不得写成正式结论，也不得同步到正式项目文件。

## 正式同步目标路径

后续如经总控验收和人工确认，才允许由对应会话将确认后的内容同步到正式项目目标路径：

- `docs/experts/value-add/value-add-nonstandard-submission-guide.md`
- `docs/plan/value-add-experts-plan.md`
- `docs/plan/value-add-api-matrix.md`
- `docs/plan/value-add-implementation-review-checklist.md`
- `experts/value-add/value-add-nonstandard-submission-guide/design.md`

正式同步动作不在本总控初始化会话执行。

## 严格串行顺序

本实验包按以下阶段严格串行推进：

1. S1 业务参考
2. S2 域 plan delta
3. S3 API/KB/GAP delta
4. S4 实现准入 checklist delta
5. S5 实现 design 草案
6. S6 总评审

只有当前阶段完成 `completion-summary.md`，且总控会话验收通过并在 `session-board.md` 标记为 `ACCEPTED` 后，才允许启动下一阶段。

## 验收回路

每个子会话完成后，必须在其阶段目录写入 `completion-summary.md`，内容至少包括：

- 本会话产物路径
- 读过的关键来源
- 关键结论
- 阻塞项
- 与上游是否一致
- 是否建议进入下一步

人工将子会话的 `completion-summary.md` 摘要贴回总控会话。总控会话只负责验收、更新阶段状态和串联下一会话，不直接写业务正文。

## BLOCKED 回退规则

如果下游阶段发现上游文档存在矛盾、缺口或不可执行内容：

- 不自行修改上游文档
- 在本阶段 `completion-summary.md` 标记 `BLOCKED`
- 写清楚冲突点、涉及上游文件、建议回退到哪个阶段修正
- 停止继续定稿

总控会话验收 BLOCKED 后，在 `session-board.md` 标记对应阶段为 `BLOCKED`，并等待人工确认回退或修正路径。

## 读写边界

正式项目只读：

- `D:\DA\Nonsta_Valueadded_Combined\ai\agentic\experts`
- `D:\DA\Nonsta_Valueadded_Combined\ai\agentic\value-add-service-guide`

实验区只写：

- `D:\DA\Nonsta_Valueadded_Combined\workspace\experiments\nonstandard-submission-guide`

禁止事项：

- 不直接修改正式项目文件
- 不进入代码实现
- 不创建 `manifest`、`workflow`、`nodes`、`prompts`
- 不导出 Coze
- 不把未确认内容写成正式结论
