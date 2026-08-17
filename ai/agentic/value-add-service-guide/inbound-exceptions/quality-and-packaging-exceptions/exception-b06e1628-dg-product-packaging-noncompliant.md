---
title: DG商品包装不符合标准
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, packaging, dg, in-warehouse, customer-action, value-added-service]
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
exception_code: B06E1628
exception_name: DG商品包装不符合标准
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# DG商品包装不符合标准

## 摘要

`B06E1628` 表示 DG 商品包装不符合标准，来源定义明确为 DG 商品包装非 UN 纸箱。

本异常涉及危险品/带电类包装合规，AI 不能把它当作普通包装破损。后续处理需要判断是否可通过库内轻加工/拍照/特批非标处理，或客户选择销毁。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | DG 商品在库内被发现包装非 UN 纸箱。 | 包装不合规可能阻断出库或后续处理。 |
| 信息流 | 异常单等待客户处理。 | 当前来源未提供完整整改 SOP。 |
| 当前卡点 | DG 包装合规问题。 | 需保留审核、仓库能力和合规边界。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 若标准库内包装处理可承接时判断。 |
| `VASC202407031511413` 库内商品拍照 | active | 需要先确认包装状态时使用。 |
| `VASC202411192250069` 库内非标增值（特批） | active | DG 特殊处理或合规确认需要特批时判断。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁 DG 商品时判断。 |

## AI 判断要点

- 明确这是 DG 包装不合规，不是普通外包装破损。
- 不承诺仓库一定可以更换 DG 包装或出具证明；需看产品/原子和审核边界。
- 字段、证明、供应商和费用不在本页定版。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定义 DG 合规标准细则和处置 SOP。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
