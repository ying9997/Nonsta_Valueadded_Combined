---
title: 商品质量异常（影响销售）
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, quality, packaging, customer-action, value-added-service]
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
exception_code: B01E1314
exception_name: 商品质量异常(影响销售)
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 商品质量异常（影响销售）

## 摘要

`B01E1314` 表示包裹实物已到仓，但包裹内商品存在影响销售的质量或包装问题。来源定义列举外包装受潮、破损、空包、未封口、包材不规范、组合/连体包装、同 SKU 不同单品外包装明显差异、商品出现玻璃碎片等情况。

该商品会进入异常暂存区并产生暂存费用。AI 应先帮助客户判断是否需要拍照确认、继续上架、新单承接、销毁、自提或特批非标。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 商品已到仓但因质量/包装问题进入异常暂存。 | 商品可能影响销售，不能按正常上架路径处理。 |
| 信息流 | 异常单等待客户处理意见。 | 需要客户确认是否可上架、销毁、自提或特殊处理。 |
| 当前卡点 | 商品状态影响销售或包装不符合要求。 | 不能只按条码或数量问题处理。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407012141008` 新单上架（WINIT创建入库单） | active | 仅在业务支持 Winit 创建新单时使用。 |
| `VASC202407031503503` 原单上架 | active | 客户确认可继续按原单处理时判断。 |
| `VASC202407031507376` 入库商品拍照 | inactive | 仅作为历史/映射证据。 |
| `VASC202407161056217` 新单上架（客户创建入库单） | active | 需要新单承接时判断。 |
| `VASC202409121753076` 上架前销毁 | active | 客户要求销毁异常商品时判断。 |
| `VASC202411192240522` 上架前自提 | active | 客户要求取回时判断。 |
| `VASC202411192246131` 入库非标增值（特批） | active | 特殊处理使用。 |
| `VASC202504251617529` 原单上架（直接上架） | active | 仅在来源和系统支持时使用。 |
| `VASC202505282347101` 新单上架（直接上架） | active | 仅在新单方向且可直接上架时使用。 |

## AI 判断要点

- 先确认异常影响的是商品质量/包装，而不是商品条码。
- 若客户对异常结果有异议，可引导先确认图片或拍照方向，但 inactive 产品不能作为当前默认入口。
- 若客户继续上架，需确认可销售性和系统承接方式。
- 不定版质量判责、赔付、费用和图片要求。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 本页不定义商品质量判定标准、赔付规则和字段配置。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
