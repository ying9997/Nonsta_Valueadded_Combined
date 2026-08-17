---
title: 商品裸装
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, packaging, customer-action, value-added-service]
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
exception_code: B0102E27
exception_name: 商品裸装
exception_stage: inbound_receiving
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 商品裸装

## 摘要

`B0102E27` 表示包裹实物已到海外仓，但商品注册信息为物流包装，实际商品没有物流包装。来源定义说明包裹已上架至异常暂存区并产生暂存费用，并提示客户更改商品入库包装属性、勾选裸货标签；若未开通出库加包装权限，需要联系销售开通。

本异常重点是商品包装属性与实物包装状态不一致。AI 不应直接说“贴标即可”，需要先判断客户是否更新商品属性、继续上架、销毁、自提或特殊处理。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 商品到仓但无物流包装。 | 商品可能无法按注册包装属性进入正常上架/出库链路。 |
| 信息流 | 商品注册信息与实物包装属性不一致。 | 需要客户更新商品入库包装属性或选择其他处理。 |
| 当前卡点 | 裸装商品与物流包装要求不匹配。 | 后续可能是新单、原单、销毁、自提或非标。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407012141008` 新单上架（WINIT创建入库单） | active | 仅在业务支持 Winit 创建新单时使用。 |
| `VASC202407031503503` 原单上架 | active | 原单可承接且属性处理完成时判断。 |
| `VASC202407161056217` 新单上架（客户创建入库单） | active | 需要客户新单承接时判断。 |
| `VASC202409121753076` 上架前销毁 | active | 客户要求销毁时判断。 |
| `VASC202411192240522` 上架前自提 | active | 客户要求自提时判断。 |
| `VASC202411192246131` 入库非标增值（特批） | active | 标准路径无法承接时判断。 |
| `VASC202505282347101` 新单上架（直接上架） | active | 仅在新单方向且可直接上架时使用。 |

## AI 判断要点

- 先确认商品注册包装属性和实物包装状态。
- 若客户要继续上架，需先处理属性/权限问题，再判断承接 VASC。
- 不要把“出库加包装权限”写成已开通；来源只说明未开通时联系销售。
- 字段、权限申请和费用不在本页定版。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定义商品属性修改步骤、出库加包装权限流程或费用。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
