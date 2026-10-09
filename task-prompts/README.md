# task-prompts

这里存放可直接复制到新 Codex/Cursor 会话里的任务 prompt。

使用规则：

- 每个 prompt 只对应一个 `TASK.md` 任务编号或一个明确子任务编号。
- 新会话不要临场改范围；需要变更范围时，先回到 `TASK.md` 修改任务。
- 每个 prompt 必须包含：
  - 任务边界
  - 允许读取/修改的范围
  - Agent 自验证步骤
  - 人工验收步骤
  - 40 部署准入门槛
  - TASK.md 回写要求
- 未经用户明确授权，不得部署 40。
- 若 prompt 与 `TASK.md` 冲突，以 `TASK.md` 为准，先停下来回写/修正 prompt。

