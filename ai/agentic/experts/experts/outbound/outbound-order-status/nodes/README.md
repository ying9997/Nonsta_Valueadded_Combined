# Coze 代码节点说明

每个业务节点文件为**单文件闭环**，可直接复制到 Coze 工作流代码节点使用。

**Coze 格式**：`main({ params })` 通过 `params` 获取输入变量，输出必须为 `const ret = { "key": value }; return ret;` 的 Object 键值对形式。

## 万邑通数据拉取（design-spec §6）

- 主链路先走 **`queryOutboundOrderList`（id/54）** 定位订单；当客户询问承运商或列表结果缺少承运商时，再由 `build-carrier-detail-winit` → 批处理插件 → `merge-carrier-detail` 调 **`queryOutboundOrder`（id/55）** 补充实际承运商。
- 当 `query` / `customerIntent` 命中发货时效或包裹实际尺寸重量意图时，`build-outbound-timing-detail` 从 id/54 的主单与 `packageList[].packageNum` 生成 `wh.outbound.getPackageDetail` 动作；跟踪号输入只调用精确匹配子单。返回由 `merge-outbound-timing-detail` 裁剪为安全的 `outboundTimingFacts` 与 `packageMeasurementFacts`，实际测量只取 `actualWeight`、`actualVolume`、`actualContainerList`。
- 当 `query` / `customerIntent` 命中派送失败退回、关联退货单、退回到仓或完成状态时，`build-outbound-return-detail` 从直接 WO 或 id/54 已解析结果生成 `rma.returnGoodsOrder.queryReturnOderList` 动作。`merge-outbound-return-detail` 精确匹配 `outboundOrderNo`，区分成功、成功空数据、业务失败和分页不完整；不得把接口失败解释成没有退货单。
- `build` 对每个 token 产出动作：`WO...` 仅 `outboundOrderNum`；非 `WO` 按 `trackingNo` 优先 + `sellerOrderNo` 兜底。默认最多 **100** 条动作（`COZE_WINIT_PLUGIN_BATCH_MAX`）。

**多单拉取策略（环境变量，仅 batch 路径）**

- `COZE_WINIT_PLUGIN_BATCH_MAX`：插件批处理动作上限（默认 `100`）。
- `COZE_WINIT_LIST_DATE_START` / `COZE_WINIT_LIST_DATE_END`：列表日期窗口（不设则默认近一年）。

## 节点列表

| 节点文件 | 输入 | 输出 | 说明 |
|----------|------|------|------|
| resolve-outbound-lookup.ts | outboundOrderNos | outboundOrderNos, lookupMeta | 仅规范化与去重：WO 去子单尾缀，非 WO 保留原值 |
| build-outbound-primary-winit.ts | outboundOrderNos | actions, actionPlans, winitPluginBatchActionsCount | 统一组装 `queryOutboundOrderList` 批处理动作 |
| merge-winit-outbound-plugin-batch.ts | outboundOrderNos, actionPlans, winitPluginOutputList, winitPluginBatchActionsCount | rawOrderData | 合并 list 结果，按 `WO > trackingNo > sellerOrderNo` 优先级择优 |
| build-outbound-timing-detail.ts | rawOrderData, outboundOrderNos, query, customerIntent | actions, actionPlans, timingIntentMatched, measurementIntentMatched, requiresNarrowing | 时效或实际尺寸重量意图生成 `getPackageDetail` 三字段动作；超过100子单不静默截断 |
| merge-outbound-timing-detail.ts | actionPlans, winitPluginOutputList, requiresNarrowing | outboundTimingFacts, packageMeasurementFacts, requiresNarrowing, 计数 | 区分成功、成功空数据和业务失败；实际测量不回退预估值 |
| build-outbound-return-detail.ts | rawOrderData, outboundOrderNos, query, customerIntent | actions, actionPlans, returnLookupMeta | 仅退货事实意图生成查询动作；直接 WO 不依赖 id/54 成功 |
| merge-outbound-return-detail.ts | actionPlans, winitPluginOutputList, returnLookupMeta | returnOrderFacts, returnLookupResults, returnLookupMeta, 计数 | 精确匹配 WO；兼容状态别名；保留空数据/失败/分页边界 |
| build-carrier-detail-winit.ts | rawOrderData, query, customerIntent | actions, actionPlans, carrierDetailActionsCount | 为缺少承运商或明确承运商诉求的订单生成 id/55 动作 |
| merge-carrier-detail.ts | rawOrderData, actionPlans, winitPluginOutputList | rawOrderData, carrierFacts | 安全合并 id/55 详情并确定性提取承运商；失败时保留 id/54 |
| winit-openapi-plugin.ts | — | — | **占位声明**（非可执行），对应导出画布插件 |
| prune-outbound-json.ts | rawOrderData, maxPackagesPerOrder?, … | prunedOrderData, _pruneMeta | JSON 剪枝；`list[]` 每项附加 `isPlatformWaybill`（OSF822* / 产品名含 3PL） |
| load-status-knowledge.ts | — | statusLexicon, statusScenarios, jsonFieldGuide | 知识片段 |
| format-output.ts | analysisResult, carrierFacts, outboundTimingFacts, packageMeasurementFacts, returnOrderFacts, returnLookupResults, returnLookupMeta, prunedOrderData, inputContext? | result, outputContext, enrichedContext | 格式化输出，并确定性覆盖承运商、时效、测量和关联退货单事实；失败时不误报无退货单 |

## Prompt 知识片段

供 Agent 解读出库单状态的知识片段位于 `prompts/`。`load-status-knowledge` 内嵌精简版，与 prompts 保持同步。
