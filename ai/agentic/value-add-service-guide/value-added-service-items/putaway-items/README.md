---
title: 上架类增值服务项
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, direct-putaway]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 上架类增值服务项

收录直接上架、暂存后上架、提供预报单上架等实际仓库动作。

## 当前已生成服务项页

| 服务项编码 | 服务项 | 文件 |
|---|---|---|
| `OW01V1708` | 直接上架 | [value-added-service-item-direct-putaway.md](value-added-service-item-direct-putaway.md) |
| `OW01V1622` | 入库-提供无箱单预报单上架 | [value-added-service-item-inbound-no-box-list-forecast-putaway.md](value-added-service-item-inbound-no-box-list-forecast-putaway.md) |
| `OSF6V1681` | 错装商品直接上架 | [value-added-service-item-in-warehouse-mispacked-product-direct-putaway.md](value-added-service-item-in-warehouse-mispacked-product-direct-putaway.md) |
| `OSF6V1591` | 拍照暂存后上架 | [value-added-service-item-in-warehouse-putaway-after-photo-temporary-storage.md](value-added-service-item-in-warehouse-putaway-after-photo-temporary-storage.md) |

## 维护边界

- 上架类原子必须先区分承接信息流：原入库单、新入库单、无箱单预报单或其他非标承接。
- `直接上架` 可以被不同 VASC 产品复用，字段相同不代表业务含义完全相同。
- `入库-提供无箱单预报单上架` 是无箱单预报信息承接，不等同普通新单上架。
- 字段配置以服务项页内字段证据状态为准；不得把 VASC 产品页中的上架方向直接写成原子字段。
