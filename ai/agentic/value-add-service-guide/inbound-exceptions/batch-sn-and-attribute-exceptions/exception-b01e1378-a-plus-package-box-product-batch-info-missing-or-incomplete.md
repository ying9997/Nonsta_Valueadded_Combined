---
title: A+包裹或箱产品无批次信息或批次信息不全
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
exception_code: B01E1378
exception_name: A+包裹/箱产品无批次信息或批次信息不全
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# A+包裹或箱产品无批次信息或批次信息不全

## 摘要

`B01E1378` 表示启用批次管理的商品到仓后，A+ 包裹或 2B 商品包裹内实物无批次信息或批次信息不全。来源定义说明商品包裹整包上架到异常区，需要客户确认商品实物批次信息并提交增值单处理。

来源列出的处理方式包括：商品换新商品标签使用新入库单上架、上架前自提、上架前销毁。normalized 目前只映射到拍照、新单上架、销毁和入库非标特批；AI 不应补出未映射的自提 VASC 结论。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | A+ 包裹或 2B 商品包裹整包进入异常区。 | 批次信息不完整会影响批次管理商品上架。 |
| 信息流 | 系统需要客户确认实物批次信息。 | 当前批次信息无法支撑正常上架。 |
| 当前卡点 | 批次信息缺失或不全。 | 需要确认批次、换标新单、销毁或非标处理。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031507376` 入库商品拍照 | inactive | 仅作为历史/映射证据。 |
| `VASC202407161056217` 新单上架（客户创建入库单） | active | 批次确认后通过新单承接时判断。 |
| `VASC202409121753076` 上架前销毁 | active | 客户要求销毁时判断。 |
| `VASC202411192246131` 入库非标增值（特批） | active | 批次特殊处理或标准路径不足时判断。 |

## AI 判断要点

- 先确认商品是否启用批次管理。
- 要求客户确认实物批次信息，不能替客户编造批次。
- 自提虽在来源处理方式中出现，但 normalized 当前未给本异常映射自提 VASC，回答时应标记需业务确认。
- 字段、批次模板和标签文件不在本页定版。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定义批次字段、标签模板和费用。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
