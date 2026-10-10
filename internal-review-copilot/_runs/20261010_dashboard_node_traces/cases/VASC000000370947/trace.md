# VASC000000370947 workflow trace

- runId: VASC000000370947-1791627166820-1
- detailSource: internal-review-copilot\_runs\20260916_interaction_e2e\details.json
- aiWriteTime: 2026-09-16T21:47:39+08:00
- outputPath: sop_generated
- scene: inbound_package_barcode_batch_relabel 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架
- nodes: validate-input -> context-bind -> check-requirement -> match-template -> sku-consistency-check -> t1-sku-relabel-check -> check-scene-completeness -> llm-generate-sop -> format-output

| # | node | durationMs | output summary |
|---:|---|---:|---|
| 1 | validate-input | 0 |  |
| 2 | context-bind | 1 |  |
| 3 | check-requirement | 0 | true |
| 4 | match-template | 13482 | supported |
| 5 | sku-consistency-check | 2830 | partial |
| 6 | t1-sku-relabel-check | 2547 | multi_need_mapping |
| 7 | check-scene-completeness | 8681 | true |
| 8 | llm-generate-sop | 18000 |  |
| 9 | format-output | 1 |  |

Full raw input/output is in trace.json.
