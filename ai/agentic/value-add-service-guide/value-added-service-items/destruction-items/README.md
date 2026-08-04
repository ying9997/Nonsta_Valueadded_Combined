---
title: 销毁类增值服务项
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, destroy]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 销毁类增值服务项

收录包裹销毁、商品销毁、异常商品销毁、DG 商品销毁等增值服务项。

## 当前已生成服务项页

| 服务项编码 | 服务项 | 文件 |
|---|---|---|
| `OW01V1703` | 上架前包裹销毁 | [value-added-service-item-pre-putaway-package-destruction.md](value-added-service-item-pre-putaway-package-destruction.md) |
| `OW01V1563` | 上架前商品销毁 | [value-added-service-item-pre-putaway-product-destruction.md](value-added-service-item-pre-putaway-product-destruction.md) |
| `OSF6V1649` | 辨识单品配件后销毁 | [value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md](value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md) |
| `OSF6V1644` | DG商品销毁 | [value-added-service-item-in-warehouse-dg-product-destruction.md](value-added-service-item-in-warehouse-dg-product-destruction.md) |
| `OSF6V1704` | 库内-异常商品销毁 | [value-added-service-item-in-warehouse-exception-product-destruction.md](value-added-service-item-in-warehouse-exception-product-destruction.md) |

## 维护边界

- 销毁类原子必须先区分异常对象：商品级销毁和包裹级销毁不能混用。
- `上架前包裹销毁` 主数据明确无法提供销毁证明；客户要求证明时不能按标准原子承诺。
- `上架前商品销毁` 只适用于入库异常、已卸货未上架或异常暂存阶段的商品级处理；已上架库存销毁应查库内销毁。
- 字段配置以服务项页内字段证据状态为准；当前不得定版销毁证明、附件格式、特殊品类和国家仓库差异。
