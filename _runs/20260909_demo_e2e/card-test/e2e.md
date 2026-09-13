# 飞书卡片 + 按钮 E2E 记录

- 日期：2026-09-10
- 监听：`npx tsx internal-review-copilot/scripts/listen-card-actions.ts`（`card.action.trigger` / `--as bot` / 综合解决方案 `cli_a95f653304f95bcd`）
- 人员：`_runs/20260909_demo_e2e/demo-personnel.json`（韩洪涛 + 耿文文，禁止 fallback `FEISHU_TEST_USER_ID`）

## 为何卡片用 lark-cli 重发

`demo-e2e --send-feishu --card` 走 Copilot `.env` 的 **增值咨询** tenant（`tokenSource=tenant`）。  
事件监听绑在本机 lark-cli 默认应用 **综合解决方案**。两边不是同一个 app，点按钮收不到事件。

因此三种卡片用 `lark-cli im +messages-send --as bot` **再发一遍**到测试群 `oc_80b07f38ed6833df3787a97a496f1097`，监听才能接到 `card.action.trigger`。

326061 的 `case-store` 已把 `feishuThreadId` 改成综合解决方案这条根消息，点按钮后 SOP 卡片会回同一话题。

## 群里的卡片（请点 326061 的场景按钮）

| Case | 单号 | 卡片 | message_id |
|------|------|------|------------|
| L2 场景选择 | VASC000000326061 | 蓝色 header + 场景按钮 | `om_x100b651c5e9adc80c4e81d32b6c4e8b` |
| L4 SOP | VASC000000315774 | 绿色 header + SOP 确认按钮 | `om_x100b651c5e1388a8c126b13938d6963` |
| L3 追问 | VASC000000298617 | 橙色 header，无按钮，@韩洪涛 + @耿文文 | `om_x100b651c5e3f7080c285d82fb85e3b6` |

L2 请点 **「尺重/标签辨识后换标上架」**（不要点 AI 推荐的第一条，除非你就要测那条）。

预期：

1. 原卡片按钮消失，变成「已确认场景：尺重/标签辨识后换标上架（由 耿文文 确认）」
2. 监听日志：`scene_confirmed → running pipeline` → `sop_generated`
3. 同一话题出现绿色 SOP 卡片

## @人

L3 卡片 lark_md：

- 销售 `<at id=ou_ca7db67030e3816c9b4c92b668fed784>` 韩洪涛
- 审核员 `<at id=ou_a59d62e22e542e6689abf3fea1e3d087>` 耿文文
- 不含金萤 `ou_eb348d6d88390e3f1a9fd70e76f89d6d`

## 监听命令（已在跑）

```
npx tsx internal-review-copilot/scripts/listen-card-actions.ts \
  --store _runs/20260909_demo_e2e/card-test/case-store.json \
  --input _runs/20260909_demo_e2e/demo-inputs.json \
  --personnel _runs/20260909_demo_e2e/demo-personnel.json \
  --out _runs/20260909_demo_e2e/card-test
```

增值咨询那条旧卡片（`om_x100b651c43e090acc21248cac96e704`）可忽略，点了监听也收不到。
