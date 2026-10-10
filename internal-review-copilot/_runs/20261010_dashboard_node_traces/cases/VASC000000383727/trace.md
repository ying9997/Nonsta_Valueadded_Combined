# VASC000000383727 workflow trace

- runId: VASC000000383727-1791627111411-18
- detailSource: internal-review-copilot\_runs\20260922_clarif_week\details.json
- aiWriteTime: 2026-09-21T19:17:04+08:00
- outputPath: sop_generated
- scene: inbound_package_barcode_batch_relabel 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架
- nodes: validate-input -> context-bind -> check-requirement -> match-template -> sku-consistency-check -> t1-sku-relabel-check -> check-scene-completeness -> llm-generate-sop -> format-output

| # | node | durationMs | output summary |
|---:|---|---:|---|
| 1 | validate-input | 0 |  |
| 2 | context-bind | 0 |  |
| 3 | check-requirement | 0 | true |
| 4 | match-template | 34819 | supported |
| 5 | sku-consistency-check | 1 | unknown |
| 6 | t1-sku-relabel-check | 0 | skip |
| 7 | check-scene-completeness | 10551 | true |
| 8 | llm-generate-sop | 47617 |  |
| 9 | format-output | 0 |  |

Full raw input/output is in trace.json.
