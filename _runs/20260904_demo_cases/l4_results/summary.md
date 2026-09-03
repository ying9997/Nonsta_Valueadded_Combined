# 内部审核 Copilot 本地干跑报告

- 输入文件：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_demo_cases\l4_patched_details.json`
- 样本数：4
- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- LLM：真实 LiteLLM（失败降级 transfer_human，不中断批次）
- LLM 失败条数：0

## 规则分流（不受 LLM 影响）

| ruleOutputPath | count |
| --- | ---: |
| sop_generated | 4 |

## 最终分流（含 LLM 降级）

| outputPath | count |
| --- | ---: |
| sop_generated | 4 |

## 失败归因

| gate | count |
| --- | ---: |
| passed | 4 |

## 明细

| orderNo | rulePath | outputPath | 缺失项 | LLM |
| --- | --- | --- | --- | --- |
| VASC000000333147 | sop_generated | sop_generated | - | real |
| VASC000000326061 | sop_generated | sop_generated | - | real |
| VASC000000143515 | sop_generated | sop_generated | - | real |
| VASC000000080416 | sop_generated | sop_generated | - | real |

## match-template v0.2

| orderNo | decision | top1 | score | confidenceScore | reason |
| --- | --- | --- | ---: | ---: | --- |
| VASC000000333147 | supported | inbound_label_identify | 11 | 0.9166666666666666 | supported_clear_top1 |
| VASC000000326061 | supported | inbound_label_identify | 7 | 0.5833333333333334 | supported_clear_top1 |
| VASC000000143515 | supported | inbound_label_identify | 11 | 0.9166666666666666 | supported_clear_top1 |
| VASC000000080416 | supported | inbound_label_identify | 15 | 1 | supported_clear_top1 |

完整结构化审核结果见 `structured-reviews.json`。规则分流见每条 `ruleOutputPath`。
