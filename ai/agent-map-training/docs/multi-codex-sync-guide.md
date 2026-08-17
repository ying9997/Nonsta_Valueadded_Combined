# 多台 Codex 同步操作指引

## 目标

让本机 Codex 和另一台机器上的 Codex 使用同一个学习进度，而不是各自凭聊天上下文推进。

唯一事实源：

```text
AI-cs-expert-study/agent-map-training/
```

## 每次开始前

1. 打开另一台机器上的 Codex。
2. 粘贴 `prompts/codex-session-bootstrap.md` 里的启动 prompt。
3. 要求它先读取：
   - `runtime/progress_state.json`
   - `runtime/events.jsonl`
   - `_inbox/current-session-sync.md`
   - `retros/thinking-correction-log.md`
4. 让它先报告当前阶段，不要立刻重开训练。

## 每次结束前

正在推进训练的 Codex 必须：

1. 更新 `runtime/progress_state.json`。
2. 追加 `runtime/events.jsonl`。
3. 如果完成一个小节，追加 `_inbox/current-session-sync.md`。
4. 提交并推送 GitHub。

## 防冲突规则

同一时间只允许一个 Codex 推进训练。

如果需要临时占用，写入 `runtime/lock.json`：

```json
{
  "locked": true,
  "owner": "macbook-codex",
  "thread_id": "019fdfde-070b-7382-8192-4e9ef9d385cd",
  "task": "Q7-Q8 coaching",
  "updated_at": "2026-08-10T10:00:00+08:00"
}
```

另一个 Codex 看到 `locked=true` 时，只能读取和总结，不能推进或写入。

## 当前进度解释

`runtime/progress_state.json` 是机器可读状态。

常见字段：

- `current_phase`：当前训练阶段。
- `current_section`：当前问题小节。
- `waiting_for`：当前等待谁做什么。
- `latest_completed`：最近完成的小节。
- `next_questions`：下一轮应该回答的问题。
- `source_thread_id`：教练会话来源。
- `archive_thread_id`：档案会话来源。

`runtime/events.jsonl` 是追加式流水账，用于跨机器回看最近发生了什么。

`_inbox/current-session-sync.md` 是归档收件箱，用于沉淀 `ARCHIVE_PACKET`。

## 推荐使用方式

另一台机器上，先只让 Codex 做三件事：

```text
1. 查看当前状态
2. 等待你回答当前问题
3. 评审你的回答并更新进度
```

不要一开始就让它整理全部文档或迁移非标增值项目。

