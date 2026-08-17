---
title: 单品条码无法扫描（需客户处理）
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
exception_code: B05E1586
exception_name: 单品条码无法扫描(需客户处理）
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 单品条码无法扫描（需客户处理）

## 摘要

`B05E1586` 表示单品在出库拣选时出现条码异常，万邑通海外仓无法通过系统识别商品。来源定义覆盖三类情况：单品条码无法扫描但人工可识别、单品存在多个不同的可识别条码、单品条码已被使用。

本异常发生在库内/出库拣选相关节点，不能按入库收货阶段的商品条码异常直接处理。AI 应优先判断是否可通过库内轻加工、拍照确认、库内非标特批或库内销毁处理。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B05E1586` |
| 异常名称 | 单品条码无法扫描(需客户处理） |
| 异常节点 | `IN_WAREHOUSE` |
| 来源 SG | `B05` |
| 异常对象 | 商品/单品 |
| 责任方 | 客户 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 单品在库内出库拣选或处理时被识别为条码异常。 | 商品仍在库内，不能按当前条码完成操作。 |
| 信息流 | 条码无法被扫描枪读取、存在多个冲突条码，或条码已被使用。 | 系统无法确认单品与库存/出库信息的稳定关系。 |
| 当前卡点 | 条码人工可识别与系统可扫描/可用不是同一回事。 | 需要客户确认处理方式。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407031456553` | 库内轻加工 | active | 可通过库内贴标/换标/包装等动作处理时判断。 |
| `VASC202407031511413` | 库内商品拍照 | active | 需要先确认条码或实物时判断。 |
| `VASC202411192250069` | 库内非标增值（特批） | active | 标准库内产品无法承接时判断。 |
| `VASC202504171850278` | 库内销毁 | active | 客户要求销毁异常单品时判断。 |

## AI 判断要点

1. 区分“扫描不出信息”和“扫描后系统无法识别”；后者不属于来源定义中的第一类。
2. 判断是否需要补贴/更换条码、拍照确认或销毁。
3. 不能把本异常默认推荐入库 `OW01` 上架产品。
4. 字段和附件要求以服务项页为准，本页不定版。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不展开库内轻加工下具体原子选择和配置字段。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
