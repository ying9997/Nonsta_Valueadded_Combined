# F-001 / A / B 12 条目标态 smoke · 当前代码 dry-run

- 输入：`_tmp/f001_ab_b_l1_l4_smoke_20260903/smoke_12.details.json`
- 样本数：12
- **不是**正式准确率，**不写入** eval-v0.1
- SOP：本地 mock；未改运行时代码
- 解读全文：`how_to_read.md`

## 怎么读

| 范围 | 读法 |
|---|---|
| F-001 L1–L4 | 按**当前能力**评估 |
| A/B L1–L2 | 按**当前分流**评估 |
| A/B L3/L4 | `future_target`。当前转人工**不算失败**，只说明 target_spec 尚未实现 |

## 分流

| outputPath | n |
|---|---:|
| needs_requirement_clarification | 3 |
| transfer_human | 9 |
| needs_field_clarification | 0 |
| sop_generated | 0 |

## 明细

| id | target_mode | 目标 | 当前 outputPath | decision | top1 |
|---|---|---|---|---|---|
| smoke-f001-l1-01 | current_supported | needs_requirement_clarification | needs_requirement_clarification | — | — |
| smoke-f001-l2-01 | current_supported | transfer_human | transfer_human | unsupported | — |
| smoke-f001-l3-01 | current_supported | needs_field_clarification | transfer_human | unsupported | — |
| smoke-f001-l4-01 | current_supported | sop_generated | transfer_human | unsupported | — |
| smoke-a-l1-01 | current_supported | needs_requirement_clarification | needs_requirement_clarification | — | — |
| smoke-a-l2-01 | current_supported | transfer_human | transfer_human | ambiguous | inbound_label_identify |
| smoke-a-l3-target-01 | future_target | needs_field_clarification | transfer_human | unsupported | — |
| smoke-a-l4-target-01 | future_target | sop_generated | transfer_human | ambiguous | inbound_label_identify |
| smoke-b-l1-01 | current_supported | needs_requirement_clarification | needs_requirement_clarification | — | — |
| smoke-b-l2-01 | current_supported | transfer_human | transfer_human | unsupported | — |
| smoke-b-l3-target-01 | future_target | needs_field_clarification | transfer_human | unsupported | — |
| smoke-b-l4-target-01 | future_target | sop_generated | transfer_human | ambiguous | inbound_photo_hold |
