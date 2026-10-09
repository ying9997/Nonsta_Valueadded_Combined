# P0-010 Prompt：接入 queryPackageInfos 补足 L2.5 数量事实

请执行根目录 `TASK.md` 中的 `P0-010`：

`修 context/tool facts 未用于完整性判断：把 OMS 字段、商品明细、附件文件名、场景概述作为 L2.5 已知事实参与判定`

本会话聚焦子方向：`VASC000000420921` 暴露的 WI -> `oms.SystemOrderService_queryPackageInfos` 数量事实链路。

注意：本 prompt 只是 `P0-014 reply 后 badcase 闭环优化体系` 下的一个原子修复方向。它不能替代闭环表、badcase 分桶、gold cases 回归集，也不能说明整个 workflow 优化已完成。

## 背景

`VASC000000420921` 中，AI/L2.5 追问 `处理数量或范围未说明`。审核人员回复：

`@增值咨询 客户提供的新的单据可以判断数量 cc@金萤`

已确认接口口径：

- 业务展示号：`WINIT_ORDER_NO=WI53076935`（10 位）
- 接口精确查询号：`SYSTEM_ORDER_NO=WI530769351`（11 位）
- `queryPackageInfos where[systemOrderNo]=WI530769351` 可返回：
  - 包裹数：`totalElements=241`
  - 每包 SKU 数：`PackageInfo.skuQty`，该样本每包 1
  - 单品数/商品数总量优先读系统订单主表：`ESTIMATE_ITEM_QTY=241` / `ESTIMATE_MERCHANDISE_QTY=11`
- `systemOrderNo` 为空时会返回全部入库包裹，调用方必须 fail-closed，禁止空值调用。

## 任务边界

1. 本会话只处理 `P0-010` 的 context/tool facts 接入，不改场景识别、不改 L2.5 卡片文案、不改必填字段规则本身、不改 reply_received 状态机。
2. 目标是：当客户需求或 OMS 上下文提供上架入库单号时，系统能查询/读取包裹数量、SKU 数、商品数等事实，并作为 `knownFactLines` 进入 L2.5 完整性判断。
3. 不部署 40，不写 OMS，不触发线上重评。
4. 不改现网 Query / recaller。
5. 如果发现必须改场景卡 requiredInfoFields，停止并输出应转入 `P0-011` 的证据，不要在本会话直接改规则。

## 必读文件/证据

- `TASK.md`
- `oms.SystemOrderService_queryPackageInfos-api.md`
- `queryStandardExceptionWithPlanPage接口文档.md`
- `internal-review-copilot/_runs/20261009_reply_closure_live/reply-closure-report.md`
- `internal-review-copilot/_runs/20261009_reply_closure_live/live-oms-readonly.json`
- `internal-review-copilot/scripts/analyze-reply-closure.ts`
- `internal-review-copilot/lib/oms-adapter.ts`
- `internal-review-copilot/lib/context-bind.ts`
- `internal-review-copilot/lib/check-scene-completeness.ts`
- `internal-review-copilot/lib/types.ts`
- `internal-review-copilot/scripts/test-g2-pipeline.ts`
- `internal-review-copilot/scripts/test-oms-adapter.ts`

## 实现要求

1. 先定位当前 `knownFactLines` 的来源和传递链路：
   - OMS/TOM detail -> `buildAgentInput`
   - `contextFacts.knownFactLines`
   - `formatKnownOrderFacts`
   - L2.5 `buildInfoPrompt`
2. 设计最小接入方式：
   - 能从 10 位 `WINIT_ORDER_NO` 找到或转换到 11 位 `SYSTEM_ORDER_NO` 时，才调用 `queryPackageInfos`。
   - 无法确认 `SYSTEM_ORDER_NO` 时，不得空值调用；应记录缺口或跳过。
   - 将包裹数、单品数、商品数、每包 SKU 数等摘要成 `knownFactLines`。
3. L2.5 判断中，`处理数量/处理范围` 应能从这些事实中判为已知，而不是继续追问客户。
4. 保留 null 回退逻辑：实测长宽高体为空时，不影响数量事实；尺寸/重量字段如后续使用，应回退到 `seller*` 预估字段。
5. 本任务只做本机验证；如需真实 TOM/OMS 调用，只能只读，并且必须 fail-closed。

## Agent 自验证

修改前：

1. 说明当前 `VASC000000420921` 为什么会问 `处理数量或范围未说明`。
2. 说明当前代码是否已把 WI / 商品明细 / 包裹数放入 `knownFactLines`。
3. 说明 `WI53076935` 与 `WI530769351` 的区别，以及代码将如何避免空值/错号调用。

修改后：

1. 新增或更新测试，至少覆盖：
   - 传入 `SYSTEM_ORDER_NO=WI530769351` 时，生成 `包裹数=241`、`单品数=241`、`商品数=11` 等 known facts。
   - `systemOrderNo` 为空时不调用 `queryPackageInfos`，并 fail-closed。
   - L2.5 prompt 包含数量事实，`处理数量/处理范围` 不应被判缺失。
   - 错传 10 位 `WINIT_ORDER_NO=WI53076935` 时，不应误当作有效查询结果。
2. 至少运行：
   - `npx tsx scripts/test-oms-adapter.ts`
   - `npx tsx scripts/test-g2-pipeline.ts`
   - 相关新增测试
3. 如果有只读 live OMS 验证，产出命令、输入参数、返回摘要；不得写 OMS/TOM。
4. 运行 `git diff -- <相关文件>`，说明只改了 `P0-010` 范围。

## 最终 E2E 测试群

如果本机验证通过，并且用户要求做最终端到端验收，请把改动后的样本单发送到这个飞书群：

`oc_d45527b0abea480fcca82c269798c376`

E2E 发送要求：

1. 至少包含 `VASC000000420921`。
2. 如本轮同时覆盖其他样本，发送前列出全部 VASC 单号。
3. 发送前必须说明每单预期结果，例如：
   - `VASC000000420921`：数量事实已由 `WI530769351` 的 `queryPackageInfos` 补足，不应再追问 `处理数量或范围未说明`。
4. 发送前必须确认是否只是发验收群卡片，还是会触发 OMS/TOM 写入。
5. 未经用户明确要求“开始 E2E 发送”或“授权发送到验收群”，不得主动发群。
6. E2E 只能发到 `oc_d45527b0abea480fcca82c269798c376`，不得发到生产业务群。

## 人工验收

产出验证报告，至少包含：

1. `VASC000000420921` 修改前行为：AI 追问 `处理数量或范围未说明`。
2. 接口事实：`WI53076935` vs `WI530769351`、`totalElements=241`、`ESTIMATE_ITEM_QTY=241`、`ESTIMATE_MERCHANDISE_QTY=11`。
3. 修改后 `knownFactLines` 示例。
4. 修改后 L2.5 prompt/判断证据：数量事实已进入系统已掌握信息。
5. 测试命令和结果。
6. 未覆盖风险：
   - 如何稳定从 10 位 Winit 单号拿到 11 位 systemOrderNo。
   - 当前是否只支持入库单，是否影响出库单。
   - live OMS 调用失败或返回空时的降级行为。
7. 如果做了 E2E 发送，补充：
   - 发送群：`oc_d45527b0abea480fcca82c269798c376`
   - 发送单号
   - 飞书 message/thread id
   - 群内卡片/文本是否符合预期
   - 是否发生 OMS/TOM 写入

## 40 部署准入

不得部署 40。

如果后续认为可以部署 40，必须先输出：

1. 本机 unit/integration/E2E 或等价只读验证结果。
2. 影响文件和影响服务。
3. 是否涉及 TOM/OMS 只读调用。
4. fail-closed 保护：空 `systemOrderNo` 不调用、不分页扫全量。
5. 回滚方案。
6. 是否需要先执行 `40-snapshot-code.sh`。
7. 等待用户明确回复“授权部署 40”。

## TASK.md 回写

结束前在 `P0-010` 后补：

1. 执行会话链接。
2. 修改文件。
3. 验证命令和结果。
4. 报告路径。
5. 当前状态：完成 / 阻塞 / 等人工确认 / 等 40 授权。
