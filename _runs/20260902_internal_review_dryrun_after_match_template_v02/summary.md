# 内部审核 Copilot 本地干跑报告

- 输入文件：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_ow01v1602_review_orders\details.json`
- 样本数：16
- 链路：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- SOP：本地 mock，未调用真实 LLM，未拉实时 OMS

## 分流统计

| outputPath | count |
| --- | ---: |
| transfer_human | 15 |
| needs_field_clarification | 1 |

## 失败归因

| gate | count |
| --- | ---: |
| match-template | 15 |
| check-completeness | 1 |

## 明细

| orderNo | outputPath | 命中节点 | 缺失项 |
| --- | --- | --- | --- |
| VASC000000348495 | transfer_human | match-template | - |
| VASC000000348477 | needs_field_clarification | check-completeness | 操作说明附件；商品和标签的对应关系 |
| VASC000000347559 | transfer_human | match-template | - |
| VASC000000347556 | transfer_human | match-template | - |
| VASC000000347553 | transfer_human | match-template | - |
| VASC000000347550 | transfer_human | match-template | - |
| VASC000000347547 | transfer_human | match-template | - |
| VASC000000347544 | transfer_human | match-template | - |
| VASC000000347541 | transfer_human | match-template | - |
| VASC000000347538 | transfer_human | match-template | - |
| VASC000000347535 | transfer_human | match-template | - |
| VASC000000347532 | transfer_human | match-template | - |
| VASC000000347529 | transfer_human | match-template | - |
| VASC000000347526 | transfer_human | match-template | - |
| VASC000000347520 | transfer_human | match-template | - |
| VASC000000347517 | transfer_human | match-template | - |

## match-template v0.2

| orderNo | decision | top1 | score | confidenceScore | reason |
| --- | --- | --- | ---: | ---: | --- |
| VASC000000348495 | unsupported | - | 0 | 0 | unsupported_direct_scan_shelve |
| VASC000000348477 | supported | inbound_label_identify | 20 | 1 | supported_clear_top1 |
| VASC000000347559 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347556 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347553 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347550 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347547 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347544 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347541 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347538 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347535 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347532 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347529 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347526 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347520 | unsupported | - | 0 | 0 | unsupported_intercept_hold |
| VASC000000347517 | unsupported | - | 0 | 0 | unsupported_intercept_hold |

完整 `decision` / `topK` / `confidenceScore` / `reason` 见 `dryrun-results.json` 的 `matchResult`。当前 16 条待审核单无最终结论，不能当 gold。
