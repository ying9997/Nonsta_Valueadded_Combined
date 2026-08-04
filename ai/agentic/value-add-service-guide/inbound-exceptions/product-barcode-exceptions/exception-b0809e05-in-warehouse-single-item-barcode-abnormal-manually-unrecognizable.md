---
title: 库内单品条码异常（人工不可识别）
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, barcode, in-warehouse, value-added-service]
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
exception_code: B0809E05
exception_name: 库内单品条码异常--人工不可识别
exception_stage: in_warehouse_storage
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: false
---

# 库内单品条码异常（人工不可识别）

## 摘要

`B0809E05` 表示货物在海外仓存储过程中，操作员发现商品条码异常，例如氧化、脱落、磨损等，无法扫描且人工也无法识别。normalized 当前仅将该异常关联到 `库内销毁`。

本异常与 `B05E1586` 的区别是：`B05E1586` 可包含条码人工可识别但扫描枪无法扫描；本异常明确人工也不可识别。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 在库单品条码氧化、脱落、磨损等。 | 单品身份无法通过扫描或人工确认。 |
| 信息流 | 单品与系统库存关系无法稳定识别。 | 当前 normalized 只给库内销毁候选。 |
| 当前卡点 | 人工不可识别。 | 不能直接承诺补标或继续上架。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202504171850278` 库内销毁 | active | 唯一 normalized 候选，客户要求或业务确认销毁时判断。 |

## AI 判断要点

- 明确人工不可识别，不要和可人工识别的条码异常混淆。
- 若客户要求补标或拍照，当前映射证据不足，需业务确认。
- 本页不定版身份确认、赔付和销毁字段。

## 证据边界

- normalized 只证明库内销毁候选关系。
- 本页不定义条码恢复、身份识别和费用规则。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [库内销毁](../../vasc-products/destruction-services/vasc-product-in-warehouse-destruction.md)
