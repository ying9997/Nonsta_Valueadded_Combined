# v2 vs v3 对比（同一批 40，RAG 关）

- v2：L2 弱信号 + 名单 15 + 边界
- v3：再修 L2.5 单据信息 + B 类近邻改判

| 指标 | v2 | v3 | 变化 |
|------|----|----|------|
| L4 | 30/40 | 29/40 | -1 |
| 误拦 | 10/39 (25.6%) | 10/39 (25.6%) | 0 |
| 场景匹配 | 15/40 | 17/40 | 2 |

## A 类 5 条
| VASC | OMS | v2 场景 / 出口 | v3 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000313224 | 包裹串仓异常调拨 | 包裹串仓异常调拨 / needs_field_clarification | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated / high | MISS | 升L4 |
| VASC000000335355 | A+包裹更换标签上架 | 包装破损商品更换包材重新上架 / sop_generated | - / transfer_human /  | MISS | 掉L4 |
| VASC000000309402 | 商品外观辨识+贴标上架 | 商品外观辨识+贴标上架 / needs_field_clarification | 商品外观辨识+贴标上架 / sop_generated / high | HIT | 升L4 |
| VASC000000333423 | 商品外观辨识+贴标上架 | 商品外观辨识+贴标上架 / needs_field_clarification | 商品外观辨识+贴标上架 / sop_generated / high | HIT | 升L4 |
| VASC000000338076 | 库内加固 | 良品/不良品检测 / transfer_human | 包装破损商品更换包材重新上架 / sop_generated / high | MISS | 升L4 |
HIT 2/5

## B 类 6 条
| VASC | OMS | v2 场景 / 出口 | v3 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000326295 | “包裹条码批量异常（需客户处理）”辨识后补贴 | 包裹类异常换商品标签上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / transfer_human / low | HIT | 掉L4 |
| VASC000000298617 | 指定商品拍照暂存 | 尺重/标签辨识后换标上架 / needs_field_clarification | 指定商品拍照暂存 / sop_generated / high | HIT | 升L4 |
| VASC000000309288 | 商品外观辨识+贴标上架 | A+包裹更换标签上架 / transfer_human | 商品外观辨识+贴标上架 / needs_field_clarification / high | HIT | 同 |
| VASC000000292770 | 异常商品转不良品上架 | 良品/不良品检测 / transfer_human | A+包裹更换标签上架 / transfer_human / medium | MISS | 同 |
| VASC000000338049 | 良品转不良品上架 | 良品/不良品检测 / transfer_human | 良品转不良品上架 / sop_generated / high | HIT | 升L4 |
| VASC000000344016 | 良品转不良品上架 | 异常商品转不良品上架 / sop_generated | 良品转不良品上架 / sop_generated / high | HIT | 同 |
HIT 5/6

## C 类 1 条
| VASC | OMS | v2 场景 / 出口 | v3 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000272679 | A+包裹更换标签上架 | A+包裹更换标签上架 / sop_generated | A+包裹更换标签上架 / sop_generated / high | HIT | 同 |
HIT 1/1

## D 类 3 条
| VASC | OMS | v2 场景 / 出口 | v3 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000309966 | 拆包/拆箱上架 | “包裹条码批量异常（需客户处理）”辨识后补贴 / needs_field_clarification | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated / high | MISS | 升L4 |
| VASC000000321948 | 库内加固 | 包装破损商品更换包材重新上架 / sop_generated | 包装破损商品更换包材重新上架 / sop_generated / high | MISS | 同 |
| VASC000000305805 | 关联第三方商品条码上架 | 尺重/标签辨识后换标上架 / transfer_human | 尺重/标签辨识后换标上架 / transfer_human / low | MISS | 同 |
HIT 0/3

## L2.5 那 5 条
| VASC | OMS | v2 场景 / 出口 | v3 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000313224 | 包裹串仓异常调拨 | 包裹串仓异常调拨 / needs_field_clarification | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated / high | MISS | 升L4 |
| VASC000000309402 | 商品外观辨识+贴标上架 | 商品外观辨识+贴标上架 / needs_field_clarification | 商品外观辨识+贴标上架 / sop_generated / high | HIT | 升L4 |
| VASC000000333423 | 商品外观辨识+贴标上架 | 商品外观辨识+贴标上架 / needs_field_clarification | 商品外观辨识+贴标上架 / sop_generated / high | HIT | 升L4 |
| VASC000000298617 | 指定商品拍照暂存 | 尺重/标签辨识后换标上架 / needs_field_clarification | 指定商品拍照暂存 / sop_generated / high | HIT | 升L4 |
| VASC000000309966 | 拆包/拆箱上架 | “包裹条码批量异常（需客户处理）”辨识后补贴 / needs_field_clarification | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated / high | MISS | 升L4 |
HIT 3/5

## 出口或场景有变化的单
| VASC | OMS | v2 | v3 | 场景 | L4 |
|------|-----|----|----|------|-----|
| VASC000000342198 | 批量辨识商品后补贴商品条码及包裹条码上架 | 批量辨识商品后补贴商品条码及包裹条码上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated | HIT→MISS | 同 |
| VASC000000299199 | 批量辨识商品后补贴商品条码及包裹条码上架 | 包裹类异常换商品标签上架 / sop_generated | 商品质检 / transfer_human | MISS→MISS | 掉 |
| VASC000000330249 | 组合后上架 | 组合后上架 / sop_generated | 组合后上架 / needs_field_clarification | HIT→HIT | 掉 |
| VASC000000270780 | 组合后上架 | 组合后上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / transfer_human | HIT→MISS | 掉 |
| VASC000000326295 | “包裹条码批量异常（需客户处理）”辨识后补贴 | 包裹类异常换商品标签上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / transfer_human | MISS→HIT | 掉 |
| VASC000000320616 | “包裹条码批量异常（需客户处理）”辨识后补贴 | 关联第三方商品条码上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated | MISS→HIT | 同 |
| VASC000000329235 | 包裹类异常换商品标签上架 | 包裹类异常换商品标签上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / transfer_human | HIT→MISS | 掉 |
| VASC000000342429 | 包裹类异常换商品标签上架 | 包裹类异常换商品标签上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated | HIT→MISS | 同 |
| VASC000000313224 | 包裹串仓异常调拨 | 包裹串仓异常调拨 / needs_field_clarification | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated | HIT→MISS | 升 |
| VASC000000320358 | 指定商品拍照暂存 | 包裹串仓异常调拨 / sop_generated | 指定商品拍照暂存 / sop_generated | MISS→HIT | 同 |
| VASC000000298617 | 指定商品拍照暂存 | 尺重/标签辨识后换标上架 / needs_field_clarification | 指定商品拍照暂存 / sop_generated | MISS→HIT | 升 |
| VASC000000326745 | 拆包/拆箱上架 | 包裹类异常换商品标签上架 / sop_generated | “包裹条码批量异常（需客户处理）”辨识后补贴 / transfer_human | MISS→MISS | 掉 |
| VASC000000309966 | 拆包/拆箱上架 | “包裹条码批量异常（需客户处理）”辨识后补贴 / needs_field_clarification | “包裹条码批量异常（需客户处理）”辨识后补贴 / sop_generated | MISS→MISS | 升 |
| VASC000000335355 | A+包裹更换标签上架 | 包装破损商品更换包材重新上架 / sop_generated |  / transfer_human | MISS→MISS | 掉 |
| VASC000000309402 | 商品外观辨识+贴标上架 | 商品外观辨识+贴标上架 / needs_field_clarification | 商品外观辨识+贴标上架 / sop_generated | HIT→HIT | 升 |
| VASC000000309288 | 商品外观辨识+贴标上架 | A+包裹更换标签上架 / transfer_human | 商品外观辨识+贴标上架 / needs_field_clarification | MISS→HIT | 同 |
| VASC000000333423 | 商品外观辨识+贴标上架 | 商品外观辨识+贴标上架 / needs_field_clarification | 商品外观辨识+贴标上架 / sop_generated | HIT→HIT | 升 |
| VASC000000338049 | 良品转不良品上架 | 良品/不良品检测 / transfer_human | 良品转不良品上架 / sop_generated | MISS→HIT | 升 |
| VASC000000344016 | 良品转不良品上架 | 异常商品转不良品上架 / sop_generated | 良品转不良品上架 / sop_generated | MISS→HIT | 同 |
| VASC000000338076 | 库内加固 | 良品/不良品检测 / transfer_human | 包装破损商品更换包材重新上架 / sop_generated | MISS→MISS | 升 |

## 相对 v2 的 L4 进出
- v2 L4 仍在: 22/30
- 回退: VASC000000299199, VASC000000330249, VASC000000270780, VASC000000326295, VASC000000318930, VASC000000329235, VASC000000326745, VASC000000335355
- 新进 L4: VASC000000313224, VASC000000298617, VASC000000309966, VASC000000309402, VASC000000333423, VASC000000338049, VASC000000338076

## 验收
- A 类 HIT: 2/5
- B 类 HIT: 5/6 （目标 ≥3） 达标
- C 类 272679: sop_generated 达标
- 误拦: 10/39 (25.6%) 目标 ≤10% 未达
- 部署: 不能部署
