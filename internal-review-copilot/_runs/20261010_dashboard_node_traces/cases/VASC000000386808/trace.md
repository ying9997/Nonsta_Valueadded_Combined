# VASC000000386808 workflow trace

- runId: VASC000000386808-1791627204416-19
- detailSource: internal-review-copilot\_runs\20260922_clarif_week\details.json
- aiWriteTime: 2026-09-22T10:37:25+08:00
- outputPath: sop_generated
- scene: inbound_label_identify 【入库】尺重/标签辨识后换标上架
- nodes: validate-input -> context-bind -> check-requirement -> match-template -> sku-consistency-check -> t1-sku-relabel-check -> check-scene-completeness -> llm-generate-sop -> format-output

| # | node | durationMs | output summary |
|---:|---|---:|---|
| 1 | validate-input | 0 |  |
| 2 | context-bind | 0 |  |
| 3 | check-requirement | 0 | true |
| 4 | match-template | 17435 | supported |
| 5 | sku-consistency-check | 0 | unknown |
| 6 | t1-sku-relabel-check | 0 | skip |
| 7 | check-scene-completeness | 8520 | true |
| 8 | llm-generate-sop | 56169 |  |
| 9 | format-output | 0 |  |

Full raw input/output is in trace.json.
