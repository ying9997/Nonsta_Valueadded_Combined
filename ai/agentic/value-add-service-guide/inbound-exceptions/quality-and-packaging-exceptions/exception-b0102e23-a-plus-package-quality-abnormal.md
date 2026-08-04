---
title: A+包裹质量异常
type: reference
entity_type: inbound_exception
tags: [inbound, exception, package-level, product-level, quality, packaging, customer-action, value-added-service]
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
exception_code: B0102E23
exception_name: A+包裹质量异常
exception_stage: inbound_receiving
exception_object_level: package
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# A+包裹质量异常

## 摘要

`B0102E23` 表示 A+ 包裹实物已到仓，但存在外包装异常、包材不规范或打包不规范等质量问题，例如受潮、破损、空包、未封口、编织袋/蛇皮袋/透明包装、木箱木架尖锐物外露、组合/连体包装等。

来源定义说明包裹已上架至异常暂存区并产生暂存费用，客户需联系客服提交增值服务单及时处理上架。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | A+ 包裹到仓后进入异常暂存。 | 包裹质量/包装状态影响正常入库处理。 |
| 信息流 | 异常单等待客户处理意见和增值选择。 | 不等同于商品条码或数量差异。 |
| 当前卡点 | 包裹外包装或打包方式不符合处理要求。 | 需判断上架、拍照、销毁、自提或非标。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031503503` 原单上架 | active | 原单仍可承接且处理后上架时判断。 |
| `VASC202407031507376` 入库商品拍照 | inactive | 仅作为历史/映射证据。 |
| `VASC202407161056217` 新单上架（客户创建入库单） | active | 需要新单承接时判断。 |
| `VASC202409121753076` 上架前销毁 | active | 客户要求销毁时判断。 |
| `VASC202411192240522` 上架前自提 | active | 客户要求提走时判断。 |
| `VASC202411192246131` 入库非标增值（特批） | active | 特殊包装/质量处理使用。 |
| `VASC202504251617529` 原单上架（直接上架） | active | 仅在来源和系统支持直接上架时使用。 |
| `VASC202505282347101` 新单上架（直接上架） | active | 仅在新单方向且可直接上架时使用。 |

## AI 判断要点

- 先确认异常对象是 A+ 包裹质量/包装，而非商品本体质量。
- 若客户要继续上架，判断原单、新单或直接上架是否有系统入口。
- `入库商品拍照` 为 inactive，不能作为当前默认推荐入口。
- 本页不定版包装整改字段、费用和照片要求。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 包装规范细节、国家仓库差异和费用不在本页定版。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
