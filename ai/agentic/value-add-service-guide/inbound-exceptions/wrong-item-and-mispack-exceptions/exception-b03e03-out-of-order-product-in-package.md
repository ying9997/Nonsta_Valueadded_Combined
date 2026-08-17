---
title: 包裹内出现订单外商品
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, wrong-item, customer-action, value-added-service]
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
exception_code: B03E03
exception_name: 包裹内出现订单外商品
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 包裹内出现订单外商品

## 摘要

`B03E03` 表示包裹已到仓，但仓库发现包裹内存在不属于该入库单的 SKU。来源定义要求客户在 1 个工作日内提交增值服务，以免货物被销毁，并提示客户根据仓库图片优化后续发货。

本异常的核心是商品实物与入库单计划商品不一致。AI 不应直接按商品条码异常或数量差异处理，必须先判断订单外商品是否需要新单承接、原单处理、拍照确认、销毁、自提或非标。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B03E03` |
| 异常名称 | 包裹内出现订单外商品 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B03` |
| 异常对象 | 商品 |
| 责任方 | 客户 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 包裹实物已到仓，订单外商品被识别为异常商品。 | 正常计划商品和订单外商品要分开判断。 |
| 信息流 | 原入库单没有该 SKU 的计划信息。 | 当前入库单不能直接承接订单外商品上架。 |
| 当前卡点 | 商品不属于该入库单。 | 通常需要新入库单、拍照确认、销毁、自提或非标处理。 |

## 客户处理选项

| 客户意图 | 判断条件 | 可关联 VASC 方向 |
|---|---|---|
| 新单承接 | 订单外商品需要作为新入库单商品上架。 | 新单上架（客户创建入库单）、新单上架（WINIT创建入库单）、新单上架（直接上架）。 |
| 原单处理 | 来源和系统确认仍可由原单承接。 | 原单上架。 |
| 先确认实物 | 客户需根据图片/拍照确认 SKU 或状态。 | 入库商品拍照；注意该产品在 normalized 中为 inactive。 |
| 销毁或自提 | 客户不再上架或要求提走。 | 上架前销毁、上架前自提。 |
| 特殊处理 | 标准路径无法承接。 | 入库非标增值（特批）。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 仅在业务和系统支持 Winit 创建新单时使用。 |
| `VASC202407031503503` | 原单上架 | active | 只有确认原单可承接订单外商品时使用。 |
| `VASC202407031507376` | 入库商品拍照 | inactive | 只能作为历史/映射证据，不作为当前默认入口。 |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 常见的新单承接方向。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁时判断。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求自提时判断。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 特殊需求使用。 |
| `VASC202505282347101` | 新单上架（直接上架） | active | 仅在来源和系统入口明确支持时使用。 |

## 证据边界

- normalized 只证明本异常与上述 VASC 存在候选关系。
- 本页不定义订单外商品的具体 SKU 录入、标签、附件和费用字段。
- 若客户只问 VASC 下原子配置，应跳转到 VASC 产品页和增值服务项页。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
