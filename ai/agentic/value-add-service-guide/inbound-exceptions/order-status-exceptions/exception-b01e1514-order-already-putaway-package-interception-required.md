---
title: 订单状态已上架需拦截
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
exception_code: B01E1514
exception_name: 订单状态已上架需拦截
exception_stage: inbound_receiving
exception_object_level: package
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 订单状态已上架需拦截

## 摘要

`B01E1514` 表示包裹分批到仓时，原订单状态已上架，后到且未上架的包裹不能继续上架至原入库单，需要拦截到异常暂存区。来源定义要求客户提交新入库单，并提交增值单更换包裹条码上架。

本异常的关键是“原入库单已经完成/关闭了上架信息流”。AI 应优先考虑新单承接，不应默认原单继续处理。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E1514` |
| 异常名称 | 订单状态已上架需拦截 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01,B02,B03,B04` |
| 异常对象 | 包裹 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 分批到仓的后到包裹被拦截并进入异常暂存。 | 已上架部分和后到包裹要拆开判断。 |
| 信息流 | 原订单状态已上架，不能再承接未上架包裹。 | 需要新入库单或其他处理方向。 |
| 当前卡点 | 后到包裹没有可用原单上架信息流。 | 来源明确提到客户提交新入库单和更换包裹条码增值。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 来源定义中的主要承接方向。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁后到包裹时使用。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求自提时使用。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 标准路径无法处理时使用。 |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 需要先确认后到包裹实物时使用。 |
| `VASC202505282347101` | 新单上架（直接上架） | active | 仅在新单方向且系统支持直接上架时使用。 |

## AI 判断要点

1. 先确认是否为分批到仓导致原订单已上架。
2. 若客户要继续上架，要求确认新入库单承接关系。
3. 若只是想确认包裹内容，可先走拍照/视频方向。
4. 不要把后到包裹直接并回已上架订单，除非有新的业务证据。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定版更换包裹条码字段、新入库单字段、费用和 SLA。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
