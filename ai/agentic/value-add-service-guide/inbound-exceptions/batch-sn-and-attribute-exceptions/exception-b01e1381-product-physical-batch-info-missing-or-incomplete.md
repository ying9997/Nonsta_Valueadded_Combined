---
title: 商品实物无批次信息或批次信息不全
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, batch, customer-action, value-added-service]
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
exception_code: B01E1381
exception_name: 商品实物无批次信息或批次信息不全
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 商品实物无批次信息或批次信息不全

## 摘要

`B01E1381` 表示启用批次管理的商品到仓后，商品实物无批次信息或批次信息不全。来源定义说明商品包裹整包上架到异常区，需要客户确认商品实物批次信息并提交增值单处理。

本异常与 `B01E1378` 相近，但这里描述的是商品实物批次信息缺失或不完整。normalized 当前仅关联上架前销毁和入库非标增值（特批）。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 批次管理商品进入异常区。 | 批次信息缺失影响正常上架。 |
| 信息流 | 批次信息不足，等待客户确认。 | 不能由 AI 补写批次信息。 |
| 当前卡点 | 商品实物批次信息缺失或不全。 | 当前 normalized 只给出销毁和特批非标候选。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202409121753076` 上架前销毁 | active | 客户决定销毁时判断。 |
| `VASC202411192246131` 入库非标增值（特批） | active | 需要特殊批次处理或标准路径不足时判断。 |

## AI 判断要点

- 先确认商品是否启用批次管理。
- 客户必须确认实物批次信息，AI 不得编造。
- 虽然来源提到新单上架、自提、销毁等处理方式，但本页 VASC 索引以 normalized 为准；未映射的方向只能提示需业务确认。
- 字段、模板、批次录入规则不在本页定版。

## 证据边界

- normalized 只证明本异常当前与销毁、入库非标特批存在候选关系。
- 本页不定义批次字段和费用。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
