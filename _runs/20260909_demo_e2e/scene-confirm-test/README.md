# L2 场景确认闭环测试

- 日期：2026-09-10
- 单号：VASC000000326061
- 话题：`omt_19c7fc0d93cf5be2`

## 链路

1. pipeline → `transfer_human` / `awaiting_scene_confirm`，飞书发候选列表（情况 A，4 个 LLM/规则候选，不是写死 5 条）
2. 模拟回复 **2**（本轮列表里 2 = 尺重/标签辨识后换标上架 = §2.1）。任务稿写的「回复 4」是按固定 5 条编号假设的，本单动态列表里 4 是第三方条码。
3. `parseSceneReply` → `scene_confirmed` / `inbound_label_identify`
4. `overrideScene` 重跑 → `sop_generated`
5. SOP 发回同一话题

## 验收

| 项 | 结果 |
|----|------|
| 326061 完整链路 | 通过，`sop_ready` |
| 回复 0 → transferred | 单测覆盖（`parse-scene-reply.test.json`） |
| 乱码 → 追问 | 单测覆盖；话术按实际候选数写 `1-n / 0`，不是写死 1-5 |
| 场景列表来自 loadScenarioCards / topK | 本单 4 条候选 |
| poll 轮询 awaiting_scene_confirm | `scene_confirmed` 已写入 poll.log |
| SOP 同一话题 | `omt_19c7fc0d93cf5be2` |

## 副作用

`poll-and-assess --input demo-inputs.json` 把同文件里的 315774 / 298617 也评估了；298617 另发了一条转人工+选场景（`omt_19c7fd82e90f5bb9`）。可忽略。
