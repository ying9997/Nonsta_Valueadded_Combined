---
title: 商品条码类入库异常
type: reference
entity_type: overview
tags: [inbound, exception, product-level]
source_refs: ["source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json"]
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 商品条码类入库异常

收录商品条码、单品条码、第三方商品条码无法识别、缺失、异常或需要客户处理的异常。

## 当前异常页

- [商品条码异常（需客户处理）](exception-b01e1315-product-barcode-abnormal-customer-action-required.md)
- [商品有条码但系统无法识别](exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md)
- [单品条码无法扫描（需客户处理）](exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md)
- [2B箱内商品条码异常](exception-b06e1369-2b-box-product-barcode-abnormal.md)
- [库内单品条码异常（人工不可识别）](exception-b0809e05-in-warehouse-single-item-barcode-abnormal-manually-unrecognizable.md)

## 收录边界

- 本目录解释商品/单品/第三方商品条码相关异常本身、客户判断点和可关联 VASC 索引。
- VASC 产品细节放入 `vasc-products/`。
- 增值服务项、字段、模板和附件要求放入 `value-added-service-items/`。
- “入库-第三方商品条码关联”只可在有证据支撑的异常场景中推荐，不能泛化为所有商品条码异常。
