---
title: ABC类包裹或子包裹内商品错装暂存
type: reference
entity_type: inbound_exception
tags: [inbound, exception, package-level, product-level, wrong-item, customer-action, value-added-service]
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
exception_code: B01E1516
exception_name: ABC类包裹/子包裹内商品错装暂存（需客户处理）
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# ABC类包裹或子包裹内商品错装暂存

## 摘要

`B01E1516` 表示 ABC 类包裹或子包裹内商品错装：商品有条码且条码属于包裹所属订单，但商品或单品不属于当前包裹/子包裹。来源定义说明异常商品会移至异常区暂存，客户需提交新入库单和更换包裹条码增值服务换单上架；Winit 会将原异常包裹终止，并将原入库单状态更新为已上架。

本异常不是普通商品条码异常，而是包裹/子包裹内商品归属错位。AI 应围绕“换单上架、拍照确认、销毁或非标”判断。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E1516` |
| 异常名称 | ABC类包裹/子包裹内商品错装暂存（需客户处理） |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01,B02,B03,B04` |
| 异常对象 | 商品 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 错装商品移至异常区暂存。 | 原包裹或子包裹与错装商品要分开处理。 |
| 信息流 | 商品条码属于订单，但不属于当前包裹/子包裹。 | 当前包裹信息流不能直接承接该商品。 |
| 后续信息流 | 原异常包裹终止，原入库单更新已上架。 | 异常商品通常需要新入库单换单上架。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407031507376` | 入库商品拍照 | inactive | 仅作为历史/映射证据，不直接推荐。 |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 来源定义中的主要换单承接方向。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁异常商品时使用。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 特殊错装处理使用。 |
| `VASC202504251617529` | 原单上架（直接上架） | active | 仅在来源和系统支持时使用。 |
| `VASC202505282347101` | 新单上架（直接上架） | active | 仅在新单方向且可直接上架时使用。 |

## AI 判断要点

1. 确认商品条码是否属于订单但不属于当前包裹/子包裹。
2. 若需要继续上架，优先确认客户新入库单和换单上架资料。
3. 若客户无法确认错装商品，可先参考拍照/识别方向，但 inactive 产品不能作为当前默认入口。
4. 不要把本异常简单回答成“补商品条码”。

## 证据边界

- 本页只解释异常和 VASC 索引，不定义换单字段、包裹条码字段和费用。
- normalized 证明候选关系，不证明每个错装场景都能直接上架。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
