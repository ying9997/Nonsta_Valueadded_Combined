# E2E issues

不自动修。下列项未达到 Prompt H 的通过标准。

## #9 点「以上都不对」→ 全场景卡
- 实际：脚本在同一话题续发全场景卡，候选=67。检查脚本找的是文案「以上都不是」，卡上写的是「以上都没有，确认转人工」。
- 预期：点「以上都不对」→ 全场景卡（群里其实已经发出）
- 涉及文件：`lib/feishu-card.ts`、`scripts/run-e2e-full.ts`（断言文案过时）
- 建议：把断言改成同时认「以上都没有 / 以上都不是」；或在群里点一次蓝卡「以上都不对」做人工确认

## #14 282990 编造降级：[待补充] + 黄色提示
- 实际：`outputPath=needs_field_clarification`，没走到 SOP 生成，所以没有 `[待补充]` 绿卡
- 预期：L4 绿卡 degraded + 黄色提示
- 涉及文件：`lib/generate-text.ts`、`lib/run-pipeline.ts`
- 上次 9/15 是用「L4 能过的单 + 粘连编造单号」才触发。本轮直接跑 282990，先被 L2.5 拦住了

## #17 308661 红色错误卡（不是蓝色选场景）
- 实际：override 场景后停在 L2.5 橙色卡（缺信息），没进 SOP，所以没有红卡
- 预期：SOP JSON 失败 → 红色错误卡
- 涉及文件：`lib/run-pipeline.ts`、`lib/feishu-card.ts`
- 上次 9/15 是临时把 SOP `maxTokens=50` 才打出红卡，测完已改回 2500。本轮没有再造 JSON 截断

## 警告项
- #18 正常写入：本轮 `OMS_WRITE_ENABLED=0`。上次已对 VASC000000366432 真写过。


