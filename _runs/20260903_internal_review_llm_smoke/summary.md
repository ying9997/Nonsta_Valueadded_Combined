# 内部审核 Copilot 本地干跑报告

- 输入文件：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_ow01v1602_review_orders\details.json`
- 样本数：1
- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- LLM：真实 LiteLLM（失败降级 transfer_human，不中断批次）
- LLM 失败条数：0

## 规则分流（不受 LLM 影响）

| ruleOutputPath | count |
| --- | ---: |
| needs_field_clarification | 1 |

## 最终分流（含 LLM 降级）

| outputPath | count |
| --- | ---: |
| needs_field_clarification | 1 |

## 失败归因

| gate | count |
| --- | ---: |
| check-completeness | 1 |

## 明细

| orderNo | rulePath | outputPath | 缺失项 | LLM |
| --- | --- | --- | --- | --- |
| VASC000000348477 | needs_field_clarification | needs_field_clarification | 操作说明附件；商品和标签的对应关系 | real |

## match-template v0.2

| orderNo | decision | top1 | score | confidenceScore | reason |
| --- | --- | --- | ---: | ---: | --- |
| VASC000000348477 | supported | inbound_label_identify | 20 | 1 | supported_clear_top1 |

完整结构化审核结果见 `structured-reviews.json`。规则分流见每条 `ruleOutputPath`。
