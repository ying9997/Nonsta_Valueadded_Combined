# 内部审核 Copilot 本地干跑报告

- 输入文件：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\demo_all.details.json`
- 样本数：7
- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- LLM：真实 LiteLLM（失败降级 transfer_human，不中断批次）
- LLM 失败条数：0

## 规则分流（不受 LLM 影响）

| ruleOutputPath | count |
| --- | ---: |
| needs_requirement_clarification | 1 |
| transfer_human | 1 |
| needs_field_clarification | 1 |
| sop_generated | 4 |

## 最终分流（含 LLM 降级）

| outputPath | count |
| --- | ---: |
| needs_requirement_clarification | 1 |
| transfer_human | 1 |
| needs_field_clarification | 1 |
| sop_generated | 4 |

## 失败归因

| gate | count |
| --- | ---: |
| check-requirement | 1 |
| match-template | 1 |
| check-completeness | 1 |
| passed | 4 |

## 明细

| orderNo | rulePath | outputPath | 缺失项 | LLM |
| --- | --- | --- | --- | --- |
| VASC000000183069 | needs_requirement_clarification | needs_requirement_clarification | 操作动作不清 | real |
| VASC000000344421 | transfer_human | transfer_human | - | real |
| VASC000000343821 | needs_field_clarification | needs_field_clarification | 操作说明附件；商品和标签的对应关系 | real |
| VASC000000333147 | sop_generated | sop_generated | - | real |
| VASC000000326061 | sop_generated | sop_generated | - | real |
| VASC000000143515 | sop_generated | sop_generated | - | real |
| VASC000000080416 | sop_generated | sop_generated | - | real |

## match-template v0.2

| orderNo | decision | top1 | score | confidenceScore | reason |
| --- | --- | --- | ---: | ---: | --- |
| VASC000000183069 | - | - | - | - | - |
| VASC000000344421 | ambiguous | inbound_label_identify | 5 | 0.4166666666666667 | ambiguous_below_high_confidence |
| VASC000000343821 | supported | inbound_label_identify | 18 | 1 | supported_clear_top1 |
| VASC000000333147 | supported | inbound_label_identify | 11 | 0.9166666666666666 | supported_clear_top1 |
| VASC000000326061 | supported | inbound_label_identify | 7 | 0.5833333333333334 | supported_clear_top1 |
| VASC000000143515 | supported | inbound_label_identify | 11 | 0.9166666666666666 | supported_clear_top1 |
| VASC000000080416 | supported | inbound_label_identify | 15 | 1 | supported_clear_top1 |

完整结构化审核结果见 `structured-reviews.json`。规则分流见每条 `ruleOutputPath`。
