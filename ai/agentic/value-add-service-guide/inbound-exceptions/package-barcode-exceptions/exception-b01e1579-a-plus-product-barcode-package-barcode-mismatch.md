---
title: A+包商品条码和包裹条码对应关系校验不一致
type: reference
entity_type: inbound_exception
tags: [inbound, exception, package-level, product-level, barcode, customer-action, value-added-service]
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
exception_code: B01E1579
exception_name: A+包商品条码和包裹条码对应关系校验不一致
exception_stage: inbound_receiving
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# A+包商品条码和包裹条码对应关系校验不一致

## 摘要

`B01E1579` 表示客户入库时扫描包裹上的全部条码，系统校验 A+ 包商品条码和包裹条码对应关系时发现不一致并报错。

本异常同时涉及包裹条码和商品条码的对应关系。AI 不能只推荐“补包裹条码”或“换商品条码”，必须先确认是哪一层关系不一致，以及客户要原单、新单、销毁还是非标处理。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E1579` |
| 异常名称 | A+包商品条码和包裹条码对应关系校验不一致 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01` |
| 异常对象 | 商品/包裹关系 |
| 责任方 | 客户 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | A+ 包实物已进入扫描/校验环节。 | 异常对象不是单纯缺条码，而是条码关系不一致。 |
| 信息流 | 商品条码和包裹条码对应关系校验失败。 | 系统无法确认商品与包裹的正确承接关系。 |
| 当前卡点 | A+ 包内商品与包裹信息流不一致。 | 需客户确认原单、新单、销毁或非标方向。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 仅在业务支持 Winit 创建新单时使用。 |
| `VASC202407031503503` | 原单上架 | active | 关系可纠正且原单可承接时使用。 |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 需客户新单承接时使用。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁时使用。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 标准关系处理无法承接时使用。 |

## AI 判断要点

1. 确认是 A+ 包的商品条码与包裹条码关系校验不一致。
2. 让客户确认正确的包裹与商品对应关系。
3. 根据关系是否能回到原单，判断原单上架或新单上架。
4. 不定版字段、附件、条码模板和费用。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 当前来源定义较短，本页不补充未证实的具体校验规则。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
