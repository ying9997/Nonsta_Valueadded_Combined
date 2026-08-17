# 飞书桥接规则

飞书 bot 是 `agent-map-training` 的一个客户端。它不拥有独立进度，必须读取并更新同一个状态源。

## 命令

- `/map-training status`：查看当前训练进度。
- `/map-training continue`：给出当前问题和回答提示。
- `/map-training answer <内容>`：提交用户回答，进入教练评审。
- `/map-training archive`：追加本轮归档包。

## 状态源

- `runtime/progress_state.json`
- `runtime/events.jsonl`
- `_inbox/current-session-sync.md`
- `retros/thinking-correction-log.md`
