# VASC000000370932 workflow trace

- runId: VASC000000370932-1791626992109-2
- detailSource: internal-review-copilot\_runs\20260916_interaction_e2e\details.json
- aiWriteTime: 2026-09-16T21:47:44+08:00
- outputPath: sop_generated
- scene: inbound_parcel_cross_warehouse_transfer 【入库】包裹串仓异常调拨
- nodes: validate-input -> context-bind -> check-requirement -> match-template -> sku-consistency-check -> t1-sku-relabel-check -> check-scene-completeness -> llm-generate-sop -> format-output

| # | node | durationMs | output summary |
|---:|---|---:|---|
| 1 | validate-input | 0 |  |
| 2 | context-bind | 0 |  |
| 3 | check-requirement | 0 | true |
| 4 | match-template | 13034 | supported |
| 5 | sku-consistency-check | 0 | unknown |
| 6 | t1-sku-relabel-check | 0 | skip |
| 7 | check-scene-completeness | 5238 | true |
| 8 | llm-generate-sop | 45230 |  |
| 9 | format-output | 0 |  |

Full raw input/output is in trace.json.
