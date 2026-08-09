# AI Agent 地图式学习档案

本目录是 `AI-cs-expert-study` 仓库内的地图式学习档案项目，用于沉淀教练会话产生的阶段结论、思维纠偏、模板、任务和迁移材料。

## 协作边界

- 教练会话：负责即时问答、逐步提问、评审回答、指出层级错位，并追加 `ARCHIVE_PACKET`。
- 档案会话：读取 `_inbox/current-session-sync.md`，把尚未整理的归档包沉淀到正式 Markdown 文件。
- 本目录不替代教练会话继续提问训练。
- 本目录不一次性代填所有训练答案。
- 正式文件应保留来源：`current-session-sync.md / 对应 ARCHIVE_PACKET 时间`。

## 当前重点

1. 先围绕 baseline expert：`agentic/experts/experts/inbound/inbound-appointment-manage/` 学会拆完整 expert。
2. 再迁移到非标增值 SOP expert。
3. 迁移阶段只在 `_inbox` 出现迁移阶段归档包后展开。

## 同步入口

- 收件箱：`_inbox/current-session-sync.md`
- 多端当前进度：`runtime/progress_state.json`
- 多端事件流：`runtime/events.jsonl`
- 当前状态：`02-current-status.md`
- 延迟问题：`retros/deferred-questions.md`
- 思维纠偏：`retros/thinking-correction-log.md`

## 多台 Codex 同步

多端继续训练时，以 `runtime/progress_state.json` 为唯一当前进度源。

- 另一台机器启动 Codex 时，使用 `prompts/codex-session-bootstrap.md`。
- 操作规则见 `docs/multi-codex-sync-guide.md`。
- 同一时间只允许一个 Codex 推进训练；需要占用时写入 `runtime/lock.json`。

## 当前进度

- 已归档：AI 项目 10 问 Q1-Q6。
- 下一步：等待教练会话继续 Q7-Q8。
- 迁移阶段：未开始。

## 参考源

- baseline expert：`../agentic/experts/experts/inbound/inbound-appointment-manage/`
- 非标增值 SOP expert 迁移材料：等待外部 `Vas-Nonstandard-Guide` 仓库和 `_inbox` 迁移阶段归档包。
