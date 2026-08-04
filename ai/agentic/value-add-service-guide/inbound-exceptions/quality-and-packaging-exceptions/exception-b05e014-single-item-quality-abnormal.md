---
title: 单品质量异常
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, quality, in-warehouse, customer-action, value-added-service]
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
exception_code: B05E014
exception_name: 单品质量异常
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 单品质量异常

## 摘要

`B05E014` 表示单品在库内存储期间被仓库发现存在质量问题，例如单品破损、变形、受潮等。来源定义要求客户根据仓库图片提供单品处理意见。

本异常发生在库内单品层级，后续可以是拍照确认、库内轻加工/非标处理、审核类处理或库内销毁。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 单品在库内存储期间出现破损、变形或受潮。 | 商品仍在仓内，状态可能影响销售或出库。 |
| 信息流 | 异常单等待客户提供处理意见。 | 当前信息流不证明可直接继续发货。 |
| 当前卡点 | 客户需确认单品是否修复、继续处理或销毁。 | 处理方向取决于客户判断和仓库能力。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 可通过库内处理修复或调整时判断。 |
| `VASC202407031511413` 库内商品拍照 | active | 客户需要先确认质量状态时使用。 |
| `VASC202411192229072` 库内非标增值（免审核） | active | 免审核非标原子可承接时判断。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 特殊质量处理使用。 |
| `VASC202412111836315` 库内非标增值（需审核） | active | 需审核的库内非标处理。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁异常单品时判断。 |

## AI 判断要点

- 先确认质量问题类型：破损、变形、受潮或其他。
- 若客户需确认实物，应先索引库内商品拍照。
- 若客户要继续使用，判断库内轻加工或非标是否能承接。
- 不定版质量判责、赔付和字段。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不展开库内非标原子选择和字段配置。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
