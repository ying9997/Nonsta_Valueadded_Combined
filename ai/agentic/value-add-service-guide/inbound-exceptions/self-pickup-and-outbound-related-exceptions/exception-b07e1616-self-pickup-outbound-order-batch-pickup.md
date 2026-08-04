---
title: 自提出库单分批提货
type: reference
entity_type: inbound_exception
tags: [inbound, exception, outbound-related, self-pickup, package-level, customer-action, value-added-service]
source_refs:
  - source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - vasc-products/nonstandard-and-other-services/vasc-product-outbound-nonstandard-special-approval.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
exception_code: B07E1616
exception_name: 自提出库单分批提货
exception_stage: outbound
exception_object_level: package
exception_node: OUT_BOUND
exception_requires_customer_action: true
---

# 自提出库单分批提货

## 摘要

`B07E1616` 表示自提出库货物中，客户预约尾程供应商提货时，因车辆大小或体积限制等原因，货物无法全部提走，部分货物滞留仓库。

来源定义明确：原出库单状态不更新，等待客户重新预约提货时间；滞留期间整单仓储费和滞仓费正常收取；由于没有信息流记录，过程中若有丢失，损失由客户承担。normalized 将该异常关联到 `出库非标增值（特批）`。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 部分自提货物已被提走，剩余货物滞留仓库。 | 实物处于出库关联滞留状态。 |
| 信息流 | 原出库单状态不更新。 | 等待客户重新预约提货时间或提出特批处理需求。 |
| 费用风险 | 整单仓储费和滞仓费正常收取；无信息流记录导致过程丢失风险由客户承担。 | AI 应提示风险边界。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202411192253186` 出库非标增值（特批） | active | 唯一 normalized 候选；用于出库特殊定制需求，需审核、报价和客户确认。 |

## AI 判断要点

- 必须说明这是 `OUT_BOUND` 出库关联异常，不是普通入库异常。
- 若客户只是重新预约提货，不一定需要 VASC。
- 若客户提出拆托、重组、销毁、暂存或其他特殊处理，才进入出库非标特批判断。
- 不定版出库单状态流转、字段、费用和尾程供应商操作细节。

## 证据边界

- normalized 只证明 `B07E1616 -> 出库非标增值（特批）` 的候选关系。
- 本页不展开出库非标原子配置；详见 VASC 产品页。

## 相关链接

- [出库非标增值（特批）](../../vasc-products/nonstandard-and-other-services/vasc-product-outbound-nonstandard-special-approval.md)
- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
