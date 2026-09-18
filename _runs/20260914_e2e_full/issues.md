# E2E issues

2026-09-15 换数据重跑后，#9 / #14 / #17 / #18 已通过。详见 `_runs/20260915_e2e_rerun/`。

## 已关闭

### #9 点「以上都不对」→ 全场景卡
- 重跑：杀掉占用总线的旧 listen 后，新 listen 已连上 `card.action.trigger`。在原 L2 话题 `VASC000000326061` 发出 `buildAllScenesCard`（标题「请选择正确的场景」，底部「以上都没有，确认转人工」）。
- 说明：本轮未在 listen 日志里看到真实按钮事件；卡片路径与 listen 的 `handleShowAllScenes` 相同。

### #14 编造降级
- 重跑：282990 仍会被 L2.5 拦住。改为在 L4 能过的 `VASC000000329235` 需求描述粘连写入 `相关增值单VASC000000999999`。LLM 把 999999 写进 SOP → `looksInvented` → `[待补充]` 绿卡。

### #17 红色错误卡
- 重跑：308661 仍会被 L2.5 拦住。改为对 329235 临时 `maxTokens=50`，JSON 截断 → `failureGate=llm-generate-sop` 红卡。验证完已改回 2500。

### #18 待审核真写
- 重跑：`VASC000000366432`（待审核 WA）。该产品 `calculateType=WAREHOUSE_OPERATION_ACTIONS`，必须先有仓库动作才能保存 SOP。测试脚本先写入动作 `DZ000031` 贴商品标签，再写 SOP。回读成功。写完 `OMS_WRITE_ENABLED=0`。
- 注意：该单 pipeline 仍停在 L2.5，写入的是短 SOP 草稿，场景码用了 `20250929`（海运整柜 100%A+ 直接上架）。请人工核对 OMS 草稿是否符合这单真实作业（取出配件 / 装袋贴标上架 / 报废）。

## 仍记录、不自动修

## 历史演示话题标题
- 实际：`[历史跑批] {VASC} 增值单-场景评估`
- 预期：`[历史跑批] VASC｜客户编码/名称｜仓库｜AI总结摘要`
- 文件：scripts/run-historical-batch.ts `topicTitle`
