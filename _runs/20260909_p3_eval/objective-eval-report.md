# 客观评测报告

## 数据集
- Golden labels: `t14-golden.jsonl`（5 条）
- Pipeline: post-P1
- Input: `_runs/20260909_p3_eval/t14-golden-details.json`
- skipLlm: true
- 隔离确认: golden 文件不被 `runPipeline` 读取 ✓

## 端到端指标

| 中文名 | 英文名 | 值 |
|--------|-------|---|
| 出口准确率 | outputPath Accuracy | 3/5 (60.0%) |
| 场景精准匹配率 | sceneKey Exact Match | 1/5 (20.0%) |
| 场景可接受匹配率 | sceneKey Acceptable Match | 1/5 (20.0%) |

## check-requirement（第一关）

| 中文名 | 英文名 | 值 |
|--------|-------|---|
| 误拦率 | False Block Rate | 0/5 (0.0%) |
| 漏放率 | False Pass Rate | 0/5 (0.0%) |
| 动作命中率 | Action Coverage | 13.3% |

## match-template（第二关）

| 中文名 | 英文名 | 值 |
|--------|-------|---|
| 场景判对率 | Scene Top-1 Accuracy | 1/5 (20.0%) |
| 误判无场景率 | False Unsupported Rate | 1/5 (20.0%) |
| 动作约束命中率 | Action Constraint Hit Rate | 1/5 (20.0%) |

## check-completeness（第三关）

| 中文名 | 英文名 | 值 |
|--------|-------|---|
| 缺失字段召回率 | Missing Fields Recall | 100.0% |
| 缺失字段精确率 | Missing Fields Precision | 100.0% |

## 逐条对比

| VASC | 预期场景（OMS 全名） | 实际场景 | 场景✓ | 预期出口 | 实际出口 | 出口✓ | 差异说明 |
|------|-------------------|---------|------|---------|---------|------|----------|
| VASC000000311652 | 【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架 | 【入库】包裹类异常换商品标签上架 | ✗ | sop_generated | sop_generated | ✓ | 场景不符 inbound_package_barcode_batch_relabel→inbound_package_exception_relabel_shelving；动作覆盖 0% exp=补贴包裹标签|上架 act=换商品标签 |
| VASC000000315774 | 【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架 | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 精准✓ | needs_field_clarification | needs_field_clarification | ✓ | 动作覆盖 67% exp=辨识|补贴包裹标签|上架 act=辨识|补贴包裹标签 |
| VASC000000298617 | 【入库】指定商品拍照暂存 | 【入库】尺重/标签辨识后换标上架 | ✗ | sop_generated | transfer_human | ✗ | 出口 sop_generated→transfer_human；场景不符 inbound_photo_hold→inbound_label_identify；动作覆盖 0% exp=拍照|回传照片|暂存 act=辨识 |
| VASC000000305805 | 【入库】关联第三方商品条码上架 | （空） | ✗ | sop_generated | transfer_human | ✗ | 出口 sop_generated→transfer_human；场景不符 inbound_third_party_merchandise_barcode→(empty)；动作覆盖 0% exp=补贴包裹|关联第三方单品码|上架 act=；误判无场景/unsupported |
| VASC000000326061 | 【入库】尺重/标签辨识后换标上架 | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | ✗ | sop_generated | sop_generated | ✓ | 场景不符 inbound_label_identify→inbound_package_barcode_batch_relabel；动作覆盖 0% exp=辨识|换标|上架 act=补贴包裹标签 |

## 错误归因

| 组件 | 错误类型 | 频率 | 示例 VASC |
|------|---------|------|----------|
| match-template | 场景不可接受 | 4 | VASC000000311652, VASC000000298617, VASC000000305805 |
| match-template | 误判无场景 | 1 | VASC000000305805 |
