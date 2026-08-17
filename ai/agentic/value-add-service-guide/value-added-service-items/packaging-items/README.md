---
title: 包装处理类增值服务项
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, repack]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 包装处理类增值服务项

收录更换商品包装、增加包装、柔性打包、代采购包材物料等增值服务项。

## 当前已生成服务项页

| 服务项编码 | 服务项 | 文件 |
|---|---|---|
| `OW01V1561` | 入库-更换商品包装 | [value-added-service-item-inbound-replace-product-packaging.md](value-added-service-item-inbound-replace-product-packaging.md) |
| `OSF6V1566` | 库内-更换商品包装 | [value-added-service-item-in-warehouse-replace-product-packaging.md](value-added-service-item-in-warehouse-replace-product-packaging.md) |
| `OSF6V1640` | 柔性打包装箱/装袋测量尺重 | [value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md](value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md) |
| `OSF6V1648` | 代采购包材物料 | [value-added-service-item-in-warehouse-procure-packaging-materials.md](value-added-service-item-in-warehouse-procure-packaging-materials.md) |

## 维护边界

- 包装类原子必须区分标准包装字段和客制/特殊包装需求。
- 当前已证实字段不等于所有仓库和国家都支持对应包材。
- 客制包材、特殊 SOP、包材库存和附件要求需要额外证据，不得直接从标准字段推断。
