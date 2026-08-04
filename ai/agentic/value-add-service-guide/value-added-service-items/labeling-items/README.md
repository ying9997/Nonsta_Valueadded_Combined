---
title: 贴标换标类增值服务项
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, relabel]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 贴标换标类增值服务项

收录商品条码、包裹条码、第三方条码关联、覆盖标签、清除标签等增值服务项。

## 当前已生成服务项页

| 服务项编码 | 服务项 | 文件 |
|---|---|---|
| `OW01V1560` | 入库-补贴包裹条码 | [value-added-service-item-inbound-package-barcode-labeling.md](value-added-service-item-inbound-package-barcode-labeling.md) |
| `OW01V1559` | 入库-更换新商品条码 | [value-added-service-item-inbound-new-product-barcode-labeling.md](value-added-service-item-inbound-new-product-barcode-labeling.md) |
| `OW01V1558` | 入库-补贴原商品条码 | [value-added-service-item-inbound-original-product-barcode-labeling.md](value-added-service-item-inbound-original-product-barcode-labeling.md) |
| `OW01V1825` | 入库-补贴原商品条码（带示例图） | [value-added-service-item-inbound-original-product-barcode-labeling-with-sample-image.md](value-added-service-item-inbound-original-product-barcode-labeling-with-sample-image.md) |
| `OW01V1572` | 入库-第三方商品条码关联 | [value-added-service-item-inbound-third-party-product-barcode-association.md](value-added-service-item-inbound-third-party-product-barcode-association.md) |
| `OW01V1736` | 入库-覆盖包裹标签 | [value-added-service-item-inbound-cover-package-label.md](value-added-service-item-inbound-cover-package-label.md) |
| `OW01V1573` | 入库-商品其他标签（非商品条码） | [value-added-service-item-inbound-product-other-label-non-barcode.md](value-added-service-item-inbound-product-other-label-non-barcode.md) |
| `OSF6V1564` | 库内-补贴原商品条码 | [value-added-service-item-in-warehouse-original-product-barcode-labeling.md](value-added-service-item-in-warehouse-original-product-barcode-labeling.md) |
| `OSF6V1565` | 库内-更换新商品条码 | [value-added-service-item-in-warehouse-new-product-barcode-labeling.md](value-added-service-item-in-warehouse-new-product-barcode-labeling.md) |
| `OSF6V1574` | 库内-商品其他标签（非商品条码） | [value-added-service-item-in-warehouse-product-other-label-non-barcode.md](value-added-service-item-in-warehouse-product-other-label-non-barcode.md) |
| `OSF6V1643` | 库内-清除商品标签 | [value-added-service-item-in-warehouse-clear-product-label.md](value-added-service-item-in-warehouse-clear-product-label.md) |

## 维护边界

- 条码类原子必须区分包裹级和商品级对象。
- 商品条码类原子必须区分补贴原商品条码、更换新商品条码和第三方商品条码关联；第三方商品条码关联是系统关系补齐，不等同重新贴标。
- `入库-补贴原商品条码（带示例图）` 不是 `入库-补贴原商品条码` 的别名，它有独立编码和必填示例图片字段。
- `入库-商品其他标签（非商品条码）` 只能用于非商品条码标签，不能替代商品条码/单品条码贴标。
- 包裹标签覆盖不等同补贴包裹条码；前者覆盖 DG/UN/自定义等包裹标签，后者处理入库承接条码。
- 字段配置以服务项页内的字段证据状态为准，不得把缺失证据写成无字段。
