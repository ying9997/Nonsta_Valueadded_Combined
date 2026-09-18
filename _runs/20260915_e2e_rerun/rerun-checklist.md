# E2E 4 项重跑（2026-09-15）

- 测试群：`oc_80b07f38ed6833df3787a97a496f1097`
- listen：已启动，`OMS_WRITE_ENABLED=0`
- 写完后 `.env`：`OMS_WRITE_ENABLED=0`
- 未部署 40

- [x] 9. 点「以上都不对」→ 全场景卡  ✅ listen 已连；同一 L2 话题发出 `buildAllScenesCard`（请选择正确的场景 / 以上都没有，确认转人工）
- [x] 14. 编造降级：[待补充] + 黄色提示  ✅ 构造粘连单号 `相关增值单VASC000000999999`，SOP 降级绿卡
- [x] 17. 红色错误卡（JSON 截断）  ✅ 临时 maxTokens=50，红卡后已改回 2500
- [x] 18. 待审核真写 OMS  ✅ `VASC000000366432` 写入 sceneOverviewCode + sop + nweon，dry-run=false

产物目录：`Nonsta_Valueadded_Combined/_runs/20260915_e2e_rerun/`
