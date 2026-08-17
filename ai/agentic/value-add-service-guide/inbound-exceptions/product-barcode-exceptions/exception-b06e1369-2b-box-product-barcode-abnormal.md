---
title: 2B箱内商品条码异常
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, barcode, in-warehouse, customer-action, value-added-service]
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
exception_code: B06E1369
exception_name: 2B箱内商品条码异常
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 2B箱内商品条码异常

## 摘要

`B06E1369` 表示客户的 2B 库存在出库操作过程中拆箱逐件增值时，发现箱内单品没有条码，或条码与信息流记录不匹配。

本异常发生在 2B 箱内逐件操作场景，不应泛化为所有入库商品条码异常。AI 应先确认箱内单品条码缺失还是与信息流不匹配，再判断库内轻加工、拍照、库内非标特批或销毁方向。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B06E1369` |
| 异常名称 | 2B箱内商品条码异常 |
| 异常节点 | `IN_WAREHOUSE` |
| 来源 SG | `B06` |
| 异常对象 | 商品/单品 |
| 责任方 | 客户 |
| 是否需要客户确认 | 是 |
| 是否收费 | 否 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 2B 箱已拆箱并进入逐件增值/出库相关操作。 | 异常对象是箱内单品。 |
| 信息流 | 单品无条码，或条码与系统记录不匹配。 | 无法按当前信息流完成逐件操作。 |
| 当前卡点 | 2B 箱内单品身份无法稳定确认。 | 需要客户确认、拍照或库内处理。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407031456553` | 库内轻加工 | active | 可通过库内贴标/换标等动作处理时判断。 |
| `VASC202407031511413` | 库内商品拍照 | active | 需要先确认箱内单品时判断。 |
| `VASC202411192250069` | 库内非标增值（特批） | active | 标准动作无法承接时判断。 |
| `VASC202504171850278` | 库内销毁 | active | 客户要求销毁异常单品时判断。 |

## AI 判断要点

1. 确认是否为 2B 箱内逐件操作时发现的问题。
2. 区分无条码与条码不匹配。
3. 不要默认使用入库新单上架类 VASC。
4. 字段、标签文件和 SOP 不在本页定版。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不展开 2B 出库或逐件增值的完整 SOP。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
