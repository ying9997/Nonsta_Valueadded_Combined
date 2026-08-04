---
title: 计划外批次
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
exception_code: B05E1383
exception_name: 计划外批次
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 计划外批次

## 摘要

`B05E1383` 表示启用生产批次管理或保质期管理的在库商品，其实物批次号信息没有入库记录。来源定义说明仓库会对同一入库单同一 SKU 关联库位上的商品进行盘点，盘点后对该批次货物做验货上架。

本异常的核心是“实物批次未在信息流中登记”。AI 应提示客户确认批次来源和处理方向，不能自行补写批次号。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 在库商品出现计划外批次。 | 需要盘点确认该批次货物范围。 |
| 信息流 | 实物批次无入库记录。 | 当前批次信息流无法直接支撑正常库存管理。 |
| 当前卡点 | 批次未登记或不在计划内。 | 需客户确认批次并选择库内处理、拍照或销毁。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 库内处理可承接时判断。 |
| `VASC202407031511413` 库内商品拍照 | active | 需要先确认实物批次时使用。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 复杂批次处理或标准路径不足时使用。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁时判断。 |

## AI 判断要点

- 确认商品是否启用批次/保质期管理。
- 先查是否有入库记录，不能把计划外批次当作普通批次号错误。
- 来源提到盘点后验货上架，但具体字段、盘点模板和费用不在本页定版。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定义批次登记、盘点和验货上架的执行字段。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
