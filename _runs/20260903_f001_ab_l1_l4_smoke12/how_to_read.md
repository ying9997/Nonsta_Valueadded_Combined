# 怎么读这次 dry-run

不是正式准确率，不写入 eval-v0.1。

| 范围 | 读法 |
|---|---|
| F-001 L1–L4 | 按**当前能力**评估 |
| A/B L1–L2 | 按**当前分流**评估 |
| A/B L3/L4 | `future_target`。当前转人工**不算失败**，只说明 target_spec 尚未实现 |

当前结果：3 条 `needs_requirement_clarification`（三个 L1），9 条 `transfer_human`，0 条 `needs_field_clarification` / `sop_generated`。

| id | target_mode | 目标 | 当前 outputPath | decision | top1 | 怎么读 |
|---|---|---|---|---|---|---|
| smoke-f001-l1-01 | current_supported | needs_requirement_clarification | needs_requirement_clarification | — | — | 当前与目标一致 |
| smoke-f001-l2-01 | current_supported | transfer_human | transfer_human | unsupported | — | 转到人工，但不是 ambiguous |
| smoke-f001-l3-01 | current_supported | needs_field_clarification | transfer_human | unsupported | — | 当前未进 check-completeness |
| smoke-f001-l4-01 | current_supported | sop_generated | transfer_human | unsupported | — | 当前未出 SOP |
| smoke-a-l1-01 | current_supported | needs_requirement_clarification | needs_requirement_clarification | — | — | 当前与目标一致 |
| smoke-a-l2-01 | current_supported | transfer_human | transfer_human | ambiguous | inbound_label_identify | 当前分流可接受 |
| smoke-a-l3-target-01 | future_target | needs_field_clarification | transfer_human | unsupported | — | **不算失败** |
| smoke-a-l4-target-01 | future_target | sop_generated | transfer_human | ambiguous | inbound_label_identify | **不算失败** |
| smoke-b-l1-01 | current_supported | needs_requirement_clarification | needs_requirement_clarification | — | — | 当前与目标一致 |
| smoke-b-l2-01 | current_supported | transfer_human | transfer_human | unsupported | — | 转到人工，但不是 ambiguous |
| smoke-b-l3-target-01 | future_target | needs_field_clarification | transfer_human | unsupported | — | **不算失败** |
| smoke-b-l4-target-01 | future_target | sop_generated | transfer_human | ambiguous | inbound_photo_hold | **不算失败** |
