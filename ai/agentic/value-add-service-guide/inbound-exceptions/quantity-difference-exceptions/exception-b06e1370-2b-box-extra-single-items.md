---
title: 2B箱内多单品
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, quantity-difference, in-warehouse, value-added-service]
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
exception_code: B06E1370
exception_name: 2B箱内多单品
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: false
---

# 2B箱内多单品

## 摘要

`B06E1370` 表示客户 2B 库存在出库操作过程中拆箱逐件增值时，发现箱内单品数量比信息流记录的多。

本异常是库内 2B 箱内数量差异，不是入库收货数量差异。AI 应先确认多出的单品数量、SKU 和箱内信息流，再判断库内轻加工、拍照、非标特批或销毁方向。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 2B 箱拆箱后发现实际单品数量多于系统记录。 | 多出的单品需要单独确认处理。 |
| 信息流 | 箱内单品数量与记录不一致。 | 当前出库/增值信息流无法直接闭环。 |
| 当前卡点 | 数量多出。 | 需要客户或仓库确认后续处理口径。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 库内处理、贴标或重新整理可承接时判断。 |
| `VASC202407031511413` 库内商品拍照 | active | 需要确认箱内实物时使用。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 标准路径无法承接时使用。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁多出单品时判断。 |

## AI 判断要点

- 区分 2B 箱内多单品和入库包裹多商品。
- 不要直接承诺多出单品可入库或出库，需先确认信息流。
- 本页不定版盘点、数量调整和费用字段。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 当前来源未提供完整处理 SOP，回答时应保留业务确认边界。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
