---
title: 订单状态被终止无法上架
type: reference
entity_type: inbound_exception
tags: [inbound, exception, order-level, package-level, customer-action, value-added-service]
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
exception_code: B01E1470
exception_name: 订单状态被终止无法上架
exception_stage: inbound_receiving
exception_object_level: package
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 订单状态被终止无法上架

## 摘要

`B01E1470` 表示订单包裹已到海外仓，但订单状态已被客户终止，仓库拦截后无法继续按原路径上架。来源定义说明包裹会暂存至异常区并产生额外暂存费用，需要客户及时联系客服处理。

本异常与普通“入库单状态异常”相近，但关键差异是已明确为客户终止状态。AI 不能直接承诺原单上架，应优先判断是否需要新单承接、销毁、自提、直接上架或特批非标。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E1470` |
| 异常名称 | 订单状态被终止无法上架 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01` |
| 异常对象 | 包裹 |
| 责任方 | 客户 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 包裹已到仓并被拦截。 | 实物存在，但不能按已终止订单继续上架。 |
| 信息流 | 原订单/入库单处于终止状态。 | 原信息流中断，通常需要新的承接关系或客户明确退出上架。 |
| 当前卡点 | 客户终止导致仓库无法上架。 | 需客户选择新单、销毁、自提或其他处理。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 常见处理方向，客户新建入库单承接。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户不再上架并要求销毁时使用。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求提走时使用。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 标准路径不能承接时使用。 |
| `VASC202505282347101` | 新单上架（直接上架） | active | 仅在新单方向且系统支持直接上架时使用。 |

## AI 判断要点

1. 确认终止是否为客户终止；本页不覆盖质控终止后仍可能原单处理的其他场景。
2. 若客户希望继续上架，优先确认新入库单承接关系。
3. 若客户不再上架，按包裹对象判断销毁或自提。
4. 不要把“已终止”回答成简单补标签即可恢复原单上架。

## 证据边界

- normalized 证明候选 VASC 关系，不证明每个终止订单都能直接上架。
- 本页不定版订单恢复、状态回退、费用金额或客服操作流程。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
