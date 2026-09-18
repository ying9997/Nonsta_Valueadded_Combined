# 金丝雀本机 E2E（2026-09-16）

门禁：本机连飞书；卡片只进测试群 `oc_80b07f38ed6833df3787a97a496f1097`；`OMS_WRITE_ENABLED=0`；未点「切到正式群」。

## 配置

| 项 | 值 |
|----|----|
| CANARY_MODE | 1 |
| CANARY_LIMIT | 2（本机加快看按钮；40 上用 5） |
| CANARY_CHAT_ID | 测试群 |
| BREAKER_ALERT_USER_ID | `ou_d09d7409a63201462177f4d8a8b1ac7b`（金萤 / 增值咨询） |
| 正式群 | 本机 `FEISHU_TEST_CHAT_ID` 仍是测试群，避免误点补发 |

## 结果

| 单号 | 出口 | 飞书 |
|------|------|------|
| VASC000000296370 | 绿卡 SOP | 测试群新话题 `omt_19cf958f960f5a78` |
| VASC000000342198 | 红卡 SOP JSON 失败 | 测试群已发卡 |

满额后：

- `canary_promote_card_sent personal=ou_d09d7409a63201462177f4d8a8b1ac7b`
- `canary_promote_card_sent chat=` 测试群

请在飞书 **增值咨询** 私聊 + 测试群 看「没问题，切到正式群」按钮。本机先**不要点**（点了会把这 2 单再发一遍到测试群，安全但会刷屏）。

## 未覆盖

- 没有点按钮（避免补发）
- 未写 OMS
- 未发正式群
