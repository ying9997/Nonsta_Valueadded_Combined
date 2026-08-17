---
title: 单品外包装破损
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, packaging, in-warehouse, customer-action, value-added-service]
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
exception_code: B05E012
exception_name: 单品外包装破损
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 单品外包装破损

## 摘要

`B05E012` 表示海外仓在拣选出库时发现单品外包装破损，无法确定商品是否正常，无法正常发货，需要客户进一步确认。来源备注说明订单有可用库存时会拣选无异常单品出库。

本异常发生在库内出库拣选场景，AI 应先判断客户是要拍照确认、更换/修复包装、销毁，还是走库内非标。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 单品在库内拣选时发现外包装破损。 | 异常单品不能正常发货。 |
| 信息流 | 出库/库存处理需要客户确认异常单品处理。 | 有其他可用库存时可能先拣选无异常单品出库。 |
| 当前卡点 | 无法确认商品是否正常。 | 需要客户确认或选择增值处理。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 更换/修复包装等标准库内处理。 |
| `VASC202407031511413` 库内商品拍照 | active | 需要客户先确认破损情况时使用。 |
| `VASC202411192229072` 库内非标增值（免审核） | active | 免审核库内非标原子可承接时判断。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 特殊处理使用。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁异常单品时使用。 |

## AI 判断要点

- 区分库内出库拣选发现的破损和入库到仓包装异常。
- 若客户要继续销售，优先确认能否修复包装或拍照确认。
- 不定版可用库存出库策略、费用和包装字段。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定义破损判责、赔付和出库取消规则。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
