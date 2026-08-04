---
title: 包裹条码类入库异常
type: reference
entity_type: overview
tags: [inbound, exception, package-level]
source_refs: ["source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json"]
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 包裹条码类入库异常

收录包裹条码无法识别、批量异常、包裹标签异常、包裹条码与商品关系异常等问题。

## 当前异常页

- [包裹条码异常（需客户处理）](exception-b0102e21-package-barcode-abnormal-customer-action-required.md)
- [A+包商品条码和包裹条码对应关系校验不一致](exception-b01e1579-a-plus-product-barcode-package-barcode-mismatch.md)
- [包裹条码批量异常（需客户处理）](exception-b01e1615-package-barcode-batch-abnormal-customer-action-required.md)
- [A+包裹条码无法扫描](exception-b06e1613-a-plus-package-barcode-unscannable.md)

## 收录边界

- 本目录解释包裹、子包裹、A+ 包、A 包、BC 包等包裹级条码异常。
- 包裹条码异常的核心判断是原单/新单/预报单如何承接包裹信息流，不等同于商品条码换标。
- 若包裹没有任何可识别 Winit 信息，可能先进入无主货找回或拍照识别分支，再判断是否属于本目录异常。
