---
title: 2B箱内少单品
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, quantity-difference, in-warehouse, value-added-service]
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
exception_code: B06E1371
exception_name: 2B箱内少单品
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: false
---

# 2B箱内少单品

## 摘要

`B06E1371` 表示客户 2B 库存在出库操作过程中拆箱逐件增值时，发现箱内单品数量比信息流记录的少。

本异常是库内 2B 箱内数量差异，不是入库少件调查。AI 应先确认少单品数量、箱内记录和是否需要拍照/盘点，再判断库内轻加工、非标特批或销毁等方向。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 2B 箱拆箱后实际单品少于系统记录。 | 可能影响出库或增值执行。 |
| 信息流 | 箱内单品数量与记录不一致。 | 需要确认短少原因和处理方式。 |
| 当前卡点 | 数量少于记录。 | 需要调查或客户确认，不应直接生成赔付/补货结论。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 库内整理或处理可承接时判断。 |
| `VASC202407031511413` 库内商品拍照 | active | 需要确认箱内实物时使用。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 标准路径无法承接时使用。 |
| `VASC202504171850278` 库内销毁 | active | 若客户选择退出处理且有销毁对象时判断。 |

## AI 判断要点

- 区分库内 2B 箱内少单品和入库少单品。
- 需要结合箱内记录、仓库图片或盘点结果判断。
- 本页不定版赔付、退费、盘点字段或费用。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 当前来源未提供完整短少处理 SOP。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
