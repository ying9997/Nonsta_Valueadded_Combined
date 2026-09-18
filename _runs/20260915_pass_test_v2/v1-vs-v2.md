# v1 vs v2 对比（同一批 40，RAG 关）

- v1：修 L2 前（`_runs/20260915_pass_test`）
- v2：A 改法后（弱信号 + 名单 15 + 边界 + low 口径），RAG 仍关

| 指标 | v1 | v2 | 变化 |
|------|----|----|------|
| L4 | 24/40 | 30/40 | 6 |
| 误拦 | 16/39 (41.0%) | 10/39 (25.6%) | -6 |
| 场景匹配 | 11/40 | 15/40 | 4 |

## A 类 5 条（原 unsupported）
| VASC | OMS | v1 场景 / 出口 | v2 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000313224 | 包裹串仓异常调拨 | - / transfer_human | 包裹串仓异常调拨 / needs_field_clarification / high | HIT | 同 |
| VASC000000335355 | A+包裹更换标签上架 | - / transfer_human | 包装破损商品更换包材重新上架 / sop_generated / high | MISS | 升L4 |
| VASC000000309402 | 商品外观辨识+贴标上架 | - / transfer_human | 商品外观辨识+贴标上架 / needs_field_clarification / high | HIT | 同 |
| VASC000000333423 | 商品外观辨识+贴标上架 | - / transfer_human | 商品外观辨识+贴标上架 / needs_field_clarification / high | HIT | 同 |
| VASC000000338076 | 库内加固 | - / transfer_human | 良品/不良品检测 / transfer_human / medium | MISS | 同 |
HIT 3/5  升L4 1

## B 类 6 条（近邻混淆）
| VASC | OMS | v1 场景 / 出口 | v2 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000326295 | “包裹条码批量异常（需客户处理）”辨识后补贴 | 尺重/标签辨识后换标上架 / transfer_human | 包裹类异常换商品标签上架 / sop_generated / high | MISS | 升L4 |
| VASC000000298617 | 指定商品拍照暂存 | 尺重/标签辨识后换标上架 / transfer_human | 尺重/标签辨识后换标上架 / needs_field_clarification / medium | MISS | 同 |
| VASC000000309288 | 商品外观辨识+贴标上架 | A+包裹更换标签上架 / transfer_human | A+包裹更换标签上架 / transfer_human / medium | MISS | 同 |
| VASC000000292770 | 异常商品转不良品上架 | 良品/不良品检测 / transfer_human | 良品/不良品检测 / transfer_human / medium | MISS | 同 |
| VASC000000338049 | 良品转不良品上架 | 良品/不良品检测 / transfer_human | 良品/不良品检测 / transfer_human / medium | MISS | 同 |
| VASC000000344016 | 良品转不良品上架 | 良品/不良品检测 / transfer_human | 异常商品转不良品上架 / sop_generated / high | MISS | 升L4 |
HIT 0/6  升L4 2

## C 类 1 条（判对但低置信转人工）
| VASC | OMS | v1 场景 / 出口 | v2 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000272679 | A+包裹更换标签上架 | A+包裹更换标签上架 / transfer_human | A+包裹更换标签上架 / sop_generated / high | HIT | 升L4 |
HIT 1/1  升L4 1

## D 类 3 条（需求太短/口语）
| VASC | OMS | v1 场景 / 出口 | v2 场景 / 出口 / 置信 | 场景 | L4 |
|------|-----|----------------|----------------------|------|-----|
| VASC000000309966 | 拆包/拆箱上架 | “包裹条码批量异常（需客户处理）”辨识后补贴 / transfer_human | “包裹条码批量异常（需客户处理）”辨识后补贴 / needs_field_clarification / high | MISS | 同 |
| VASC000000321948 | 库内加固 | 拆分SKU / transfer_human | 包装破损商品更换包材重新上架 / sop_generated / high | MISS | 升L4 |
| VASC000000305805 | 关联第三方商品条码上架 | 尺重/标签辨识后换标上架 / needs_field_clarification | 尺重/标签辨识后换标上架 / transfer_human / low | MISS | 同 |
HIT 0/3  升L4 1

## 出口或场景有变化的单
| VASC | OMS | v1 | v2 | 场景 | L4 |
|------|-----|----|----|------|-----|
| VASC000000342198 | 批量辨识商品后补贴商品条码及包裹条码上架 | 尺重/标签辨识后换标上架 / sop_generated | 批量辨识商品后补贴商品条码及包裹条码上架 / sop_generated | MISS→HIT | 同 |
| VASC000000270780 | 组合后上架 | 包裹类异常换商品标签上架 / needs_field_clarification | 组合后上架 / sop_generated | MISS→HIT | 升 |
| VASC000000326295 | “包裹条码批量异常（需客户处理）”辨识后补贴 | 尺重/标签辨识后换标上架 / transfer_human | 包裹类异常换商品标签上架 / sop_generated | MISS→MISS | 升 |
| VASC000000313224 | 包裹串仓异常调拨 |  / transfer_human | 包裹串仓异常调拨 / needs_field_clarification | MISS→HIT | 同 |
| VASC000000320358 | 指定商品拍照暂存 | 指定商品拍照暂存 / sop_generated | 包裹串仓异常调拨 / sop_generated | HIT→MISS | 同 |
| VASC000000298617 | 指定商品拍照暂存 | 尺重/标签辨识后换标上架 / transfer_human | 尺重/标签辨识后换标上架 / needs_field_clarification | MISS→MISS | 同 |
| VASC000000305805 | 关联第三方商品条码上架 | 尺重/标签辨识后换标上架 / needs_field_clarification | 尺重/标签辨识后换标上架 / transfer_human | MISS→MISS | 同 |
| VASC000000309966 | 拆包/拆箱上架 | “包裹条码批量异常（需客户处理）”辨识后补贴 / transfer_human | “包裹条码批量异常（需客户处理）”辨识后补贴 / needs_field_clarification | MISS→MISS | 同 |
| VASC000000335355 | A+包裹更换标签上架 |  / transfer_human | 包装破损商品更换包材重新上架 / sop_generated | MISS→MISS | 升 |
| VASC000000272679 | A+包裹更换标签上架 | A+包裹更换标签上架 / transfer_human | A+包裹更换标签上架 / sop_generated | HIT→HIT | 升 |
| VASC000000309402 | 商品外观辨识+贴标上架 |  / transfer_human | 商品外观辨识+贴标上架 / needs_field_clarification | MISS→HIT | 同 |
| VASC000000333423 | 商品外观辨识+贴标上架 |  / transfer_human | 商品外观辨识+贴标上架 / needs_field_clarification | MISS→HIT | 同 |
| VASC000000344016 | 良品转不良品上架 | 良品/不良品检测 / transfer_human | 异常商品转不良品上架 / sop_generated | MISS→MISS | 升 |
| VASC000000321948 | 库内加固 | 拆分SKU / transfer_human | 包装破损商品更换包材重新上架 / sop_generated | MISS→MISS | 升 |

## 原 24 条 L4 是否回退
- 原 L4 条数: 24
- 仍 L4: 24/24
- 回退: 无

## 验收对照任务书
- A 类 HIT: 3/5 （目标 ≥3） 达标
- B 类 HIT: 0/6 （目标 ≥3） 未达
- C 类 272679: 出口=sop_generated 场景=HIT 置信=high （目标：不转人工） 达标
- D 类: 已记 pending，本轮不修
- 误拦: 10/39 (25.6%) 目标 ≤15%（更好 ≤10%） 未达
- 原 24 条 L4 回退: 无 达标
- RAG: 试跑 0/6 变好，默认仍关
- 部署: 不能部署 40
