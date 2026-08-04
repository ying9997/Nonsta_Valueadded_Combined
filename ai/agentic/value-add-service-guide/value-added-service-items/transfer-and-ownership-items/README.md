---
title: 调拨与货权类增值服务项
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, transfer]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 调拨与货权类增值服务项

收录包裹串仓异常调拨、货权转移换标模式、货权转移改数模式等增值服务项。

## 当前已生成服务项页

| 服务项编码 | 服务项 | 文件 |
|---|---|---|
| `OW01V1654` | 包裹串仓异常调拨 | [value-added-service-item-inbound-cross-warehouse-package-transfer.md](value-added-service-item-inbound-cross-warehouse-package-transfer.md) |
| `OSF6V1646` | 货权转移（换标模式） | [value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md](value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md) |
| `OSF6V1647` | 货权转移（改数模式） | [value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md](value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md) |

## 维护边界

- 调拨类原子必须明确起始仓、目的仓和支持仓群。
- `包裹串仓异常调拨` 当前仅有 `DE/DEBR2`、`USWC/USWC2` 仓群证据，不能泛化到任意跨仓调拨。
- 字段配置以服务项页证据状态为准，缺字段证据时不得生成调拨字段清单。
