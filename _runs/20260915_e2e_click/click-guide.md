# E2E 真人点按钮

- 测试群：`oc_80b07f38ed6833df3787a97a496f1097`
- listen store：`_runs/20260915_e2e_click/case-store.json`
- OMS_WRITE_ENABLED=0

## 请你现在点

| 项 | 话题 | 请点 / 请发 |
|---|---|---|
| #9 | `om_x100b65ba1e84a4a0c4272b8dfb89f0e` | 蓝卡「以上都不对，查看更多场景」 |
| #15 | `om_x100b65ba1b5f60a0c211fd29d25fa29` | 绿卡「SOP 需要修改」，再回复修改意见 |
| #21/#22/#23 | `om_x100b65ba1e84a4a0c4272b8dfb89f0e` | @咨询机器人：拍照暂存 / 关联第三方 / 啊啊啊 |

## @bot 代发

- 未用金萤身份代发 @bot（asUser=true botOpenId=-），请你在 #9 话题里手动 @咨询机器人。

## 流水线

- #9 蓝卡 path=sop_generated
- #15 绿卡 path=sop_generated

