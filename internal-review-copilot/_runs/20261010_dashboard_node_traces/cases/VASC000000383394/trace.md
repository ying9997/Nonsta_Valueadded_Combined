# VASC000000383394 workflow trace

- runId: VASC000000383394-1791627055683-15
- detailSource: internal-review-copilot\_runs\20260922_clarif_week\details.json
- aiWriteTime: 2026-09-21T15:27:49+08:00
- outputPath: sop_generated
- scene: instock_remove_cover_label 【库内】清除/覆盖标签
- nodes: validate-input -> context-bind -> check-requirement -> match-template -> sku-consistency-check -> t1-sku-relabel-check -> check-scene-completeness -> llm-generate-sop -> format-output

| # | node | durationMs | output summary |
|---:|---|---:|---|
| 1 | validate-input | 0 |  |
| 2 | context-bind | 0 |  |
| 3 | check-requirement | 0 | true |
| 4 | match-template | 9510 | supported |
| 5 | sku-consistency-check | 0 | unknown |
| 6 | t1-sku-relabel-check | 0 | skip |
| 7 | check-scene-completeness | 0 | true |
| 8 | llm-generate-sop | 46203 |  |
| 9 | format-output | 0 |  |

Full raw input/output is in trace.json.
