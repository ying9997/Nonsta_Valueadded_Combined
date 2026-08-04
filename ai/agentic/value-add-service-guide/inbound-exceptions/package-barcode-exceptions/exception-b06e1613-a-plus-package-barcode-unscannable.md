---
title: A+包裹条码无法扫描
type: reference
entity_type: inbound_exception
tags: [inbound, exception, package-level, barcode, in-warehouse, customer-action, value-added-service]
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
exception_code: B06E1613
exception_name: A+包裹条码无法扫描
exception_stage: in_warehouse_operation
exception_object_level: package
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# A+包裹条码无法扫描

## 摘要

`B06E1613` 表示仓库在出库进行 A+ 包裹条码采集时，实物上无包裹条码，无法进行采集。来源责任方为 `WINIT_WAREHOUSE`，但仍标记需要客户确认。

本异常发生在库内/出库采集环节，虽然属于包裹条码问题，但不是入库到仓时的包裹条码异常。AI 应判断是否需要库内轻加工补标、拍照确认、库内非标特批或库内销毁。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B06E1613` |
| 异常名称 | A+包裹条码无法扫描 |
| 异常节点 | `IN_WAREHOUSE` |
| 来源 SG | `B06,B12` |
| 异常对象 | 包裹 |
| 责任方 | WINIT 仓库 |
| 是否需要客户确认 | 是 |
| 是否收费 | 否 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | A+ 包裹在库内出库采集时缺少可扫描包裹条码。 | 货物已在仓内，不是未到仓。 |
| 信息流 | 包裹条码采集失败。 | 出库或库内处理无法继续完成包裹采集动作。 |
| 当前卡点 | 实物上无包裹条码。 | 需要客户确认是否补标、拍照、非标或销毁。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407031456553` | 库内轻加工 | active | 可通过库内补贴/处理包裹条码时判断。 |
| `VASC202407031511413` | 库内商品拍照 | active | 需要先确认包裹或实物时判断。 |
| `VASC202411192250069` | 库内非标增值（特批） | active | 标准库内动作无法承接时判断。 |
| `VASC202504171850278` | 库内销毁 | active | 客户要求销毁时判断。 |

## AI 判断要点

1. 确认异常发生在出库 A+ 包裹条码采集，而不是入库收货。
2. 确认实物是否确实无包裹条码，而非条码破损或系统无法识别。
3. 根据客户意图判断补标、拍照、销毁或非标。
4. 不要默认走入库原单/新单上架产品。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定版包裹条码文件、贴标模板、费用和仓库 SOP。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
