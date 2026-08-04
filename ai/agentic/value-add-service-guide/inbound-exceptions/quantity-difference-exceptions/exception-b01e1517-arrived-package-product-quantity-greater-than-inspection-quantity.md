---
title: 到仓包裹商品数量大于验货数量
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, quantity-difference, customer-action, value-added-service]
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
exception_code: B01E1517
exception_name: 到仓包裹商品数量大于验货数量（需客户处理）
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 到仓包裹商品数量大于验货数量

## 摘要

`B01E1517` 表示包裹实物已到海外仓，但包裹内收到的单品数量大于商品验货数量。来源定义说明 Winit 仅上架原入库单验货数量的商品，并将入库单状态更新为已上架，多出的异常商品移至异常区暂存。

本异常的重点是“多出的商品如何承接”。来源给出的处理方式是客户提交新入库单，并提交更换包裹条码增值服务换单上架。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E1517` |
| 异常名称 | 到仓包裹商品数量大于验货数量（需客户处理） |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01,B02,B03,B04` |
| 异常对象 | 商品 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 原验货数量内商品上架，多出的商品进入异常暂存。 | 不能把整包都视为未上架。 |
| 信息流 | 原入库单按验货数量上架并更新为已上架。 | 多出商品无法继续由原信息流承接。 |
| 当前卡点 | 到仓数量大于验货数量。 | 需要客户对多出商品提交新单、销毁、拍照确认或非标处理。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407031507376` | 入库商品拍照 | inactive | 仅作为历史/映射证据。 |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 来源定义中的主要承接方向。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁多出商品时使用。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 特殊数量处理或标准路径无法承接时使用。 |

## AI 判断要点

1. 区分“多出的异常商品”和“已按原验货数量上架的商品”。
2. 若客户要上架多出商品，优先确认新入库单承接。
3. 若客户需要先确认多出商品，可提示拍照/识别方向，但不能使用 inactive 产品作为当前确定入口。
4. 不要把数量差异直接解释成仓库少上架。

## 证据边界

- 本页不定义新入库单字段、更换包裹条码字段、费用和 SLA。
- normalized 只证明候选 VASC 关系，不证明所有多件场景都可直接上架。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
