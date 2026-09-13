# P3 数据清洗记录

## 剔除

| VASC | 原因 | 影响 |
|------|------|------|
| VASC000000332778 | EB0126080632030982 关联场景为「仓库已完成 需补收费用」，非入库核心 | 不进入 golden；若在 T14 HQ 池中仅作脏样例标注 |
| VASC000000333147 | 同 EB 搜不到可靠关联增值单，数据质量问题；原拟定 T4 L4 golden | **从 golden 删除** |

## Golden 补位

T14 自然 L4 且场景为【入库】尺重/标签辨识后换标上架（`20250407004`）的样本，在剔除 332778/333147 后**无剩余可用自然 L4**（`samples-l4.jsonl` 中 T4 仅此两单）。

因此用已确认的 demo L4 案补位：

| VASC | expectedScene | 来源 | 说明 |
|------|---------------|------|------|
| VASC000000326061 | `inbound_label_identify` | `demo_all.details.json` | 用户确认 expectedScene 保持尺重换标；作为 333147 的替换条 |

## 最终 `t14-golden.jsonl`（5 条）

| VASC | 最佳场景（OMS 全名） | sceneKey | 出口 | layer |
|------|---------------------|----------|------|-------|
| VASC000000311652 | 【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架 | `inbound_package_barcode_batch_relabel` | sop_generated | L4 |
| VASC000000315774 | 同上 | `inbound_package_barcode_batch_relabel` | needs_field_clarification | L3 |
| VASC000000298617 | 【入库】指定商品拍照暂存 | `inbound_photo_hold` | sop_generated | L3 |
| VASC000000305805 | 【入库】关联第三方商品条码上架 | `inbound_third_party_merchandise_barcode` | sop_generated | L2 |
| VASC000000326061 | 【入库】尺重/标签辨识后换标上架 | `inbound_label_identify` | sop_generated | L4 |

字段：`expectedScene`（最佳）+ `acceptableScenes`（可接受，含 §2.1 兜底处已标注）。

## 评测输入

- Golden：`internal-review-copilot/eval/golden/t14-golden.jsonl`
- Details 合并：`_runs/20260909_p3_eval/t14-golden-details.json`（T14 details + demo 的 326061）
- 隔离：`runPipeline()` 不读 golden

## 未改动

- pipeline 代码
- 场景卡
- `pending-hypotheses.md`（本轮不处理）
