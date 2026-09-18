# H11 SKU 一致性校验 — VASC000000370434

- outputPath: `sop_generated`
- scene: `inbound_label_identify` 【入库】尺重/标签辨识后换标上架
- skuCheck.triggered: `true`
- skuCheck.match: `mismatch`
- oldWi: `WI51636814` (377 SKU)
- newWi: `WI52653783` (21 SKU)
- source: `dws`
- nodesHit: validate-input → context-bind → check-requirement → match-template → sku-consistency-check → check-scene-completeness → llm-generate-sop → format-output
- 差异：原单 377 个 SKU、新单 21 个 SKU。原单有但新单没有：EXA2428-SLR、EXA2830-SLR、EXA3033-SLR、EXA3337-SLR、EXA3740-SLR、EXA4042-SLR、EXA4245-SLR、EXA4548-SLR、EXB1820-SLR、EXB2022-SLR 等共 377 个；新单有但原单没有：EXA2428G、EXA2830G、EXA3033G、EXA3337G、EXA3740G、EXA4042G、EXA4245G、EXA4548G、EXB1820G、EXB2022G 等共 21 个
- 展示位置：飞书绿卡/橙卡顶部「请审核人员关注」，不写进仓库 SOP
- 审核员提示见 `auditor-hint.txt`

