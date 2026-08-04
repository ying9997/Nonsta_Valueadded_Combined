---
title: 库存批次号错误
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, batch, in-warehouse, customer-action, value-added-service]
source_refs:
  - source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
exception_code: B05E1382
exception_name: 库存批次号错误
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 库存批次号错误

## 摘要

`B05E1382` 表示启用生产批次管理或保质期管理的在库商品，实物批次号信息与入库单批次号信息不匹配。来源定义说明仓库会对同一入库单同一 SKU 关联库位上的商品进行盘点、移库，并将库存批次号信息调整正确。

本异常发生在库内批次管理场景。AI 应围绕批次核实、拍照/盘点、库内处理、特批非标或销毁判断。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 在库商品存在批次号实物与入库单信息不匹配。 | 需要盘点、移库或批次信息调整。 |
| 信息流 | 库存批次号信息不正确。 | 影响批次管理库存准确性。 |
| 当前卡点 | 批次号不匹配。 | 需确认批次信息和库内处理方式。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 库内处理可承接时判断。 |
| `VASC202407031511413` 库内商品拍照 | active | 需要先确认实物批次时使用。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 复杂批次处理或标准路径不足时使用。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁时判断。 |

## AI 判断要点

- 先确认商品是否启用批次/保质期管理。
- 不得自行生成正确批次号，应要求客户或系统证据确认。
- 来源提到盘点和移库，但字段和具体 SOP 不在本页定版。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定版批次修改、盘点模板、移库 SOP 和费用。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
