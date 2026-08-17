---
title: 包裹内商品错装
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, package-level, wrong-item, customer-action, value-added-service]
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
exception_code: B05E013
exception_name: 包裹内商品错装
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 包裹内商品错装

## 摘要

`B05E013` 表示到仓包裹 A/BC 子包裹存在包裹内实物条码与系统条码不一致。来源定义要求客户根据异常照片核实商品实物上贴的商品标签是否正确，并按不同情况提交新入库单和更换/补贴包裹条码、必要时更换单品条码增值服务。

本异常的重点是商品标签是否正确。AI 不能只按“错装”推荐固定 VASC，需要先区分商品标签/第三方标签正确还是错误。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 包裹或子包裹内商品与系统条码关系不一致。 | 需要看异常照片和实物标签。 |
| 信息流 | 系统条码与实物条码不一致，当前包裹信息流无法直接承接。 | 常见处理需要新入库单和条码增值。 |
| 当前卡点 | 标签正确性未确认。 | 标签正确和错误对应不同服务项组合。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 条码/包装处理可由库内轻加工承接时判断。 |
| `VASC202407031511413` 库内商品拍照 | active | 需要客户先核实照片/实物标签时使用。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 标准处理无法承接时使用。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁时判断。 |

## AI 判断要点

- 先让客户核实商品标签/第三方商品标签是否正确。
- 标签正确时，重点判断新入库单和包裹条码处理。
- 标签错误时，可能还涉及更换单品条码。
- 本页不定版具体字段、标签文件和费用。

## 证据边界

- normalized 只证明候选 VASC 关系。
- 来源处理方式提到的具体服务项组合需回到 VASC 产品页和原子页确认。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
