---
title: 入库单状态异常
type: reference
entity_type: inbound_exception
tags: [inbound, exception, order-level, package-level, customer-action, value-added-service]
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
exception_code: B01E01
exception_name: 入库单状态异常
exception_stage: inbound_receiving
exception_object_level: package
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 入库单状态异常

## 摘要

`B01E01` 表示订单包裹已到海外仓，但入库单状态或直发验货状态不满足正常上架要求。来源定义明确包含两类状态卡点：入库单为草稿或终止；直发自验订单未验货完成。

本异常不是单纯的条码、质量或数量问题。AI 回答时要先判断系统是否已自动提交订单并允许仓库继续上架；若不满足自动提交条件，包裹会暂存至异常区并产生额外暂存费用，需要客户更新入库单状态并联系客服提交增值服务单。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E01` |
| 异常名称 | 入库单状态异常 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01` |
| 异常对象 | 包裹 |
| 责任方 | 客户 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 包裹已到海外仓。 | 已到仓不等于可直接上架，仍要看入库单状态和直发验货状态。 |
| 信息流 | 入库单状态为草稿/终止，或直发自验未验货完成。 | 当前入库单信息流无法稳定承接仓库上架动作。 |
| 自动提交分支 | 直发海外验订单信息齐全，或直发自验订单已验货完成，且英德订单已填写进口商。 | 来源说明符合这些条件时，系统生成异常的同时会自动提交订单，仓库可操作上架。 |
| 异常暂存分支 | 不属于自动提交条件。 | 包裹暂存至异常区，产生额外暂存费用，客户需更新入库单状态并提交增值服务单。 |

## 客户处理选项

| 客户意图 | 判断条件 | 可关联 VASC 方向 |
|---|---|---|
| 直接上架 | 系统/业务确认已满足直接上架条件。 | 原单上架（直接上架）、新单上架（直接上架）。 |
| 新单承接 | 原入库单状态不能继续承接，客户需要创建新入库单。 | 新单上架（客户创建入库单）。 |
| 拍照确认 | 客户需要先确认到仓包裹或实物状态。 | 入库非标拍照或提供视频。 |
| 销毁 | 客户不再上架该异常包裹。 | 上架前销毁。 |
| 自提 | 客户要求提走异常包裹。 | 上架前自提。 |
| 特殊处理 | 标准处理无法承接，且需审批/SOP。 | 入库非标增值（特批）。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 原单状态不能承接时，客户创建新单后判断。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁异常包裹时判断。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求自提时判断。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 特殊需求使用，不能作为默认兜底。 |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 需要先确认实物或责任时判断。 |
| `VASC202504251617529` | 原单上架（直接上架） | active | 仅在状态和系统入口支持直接原单上架时使用。 |
| `VASC202505282347101` | 新单上架（直接上架） | active | 仅在新单方向且无需复杂补标动作时使用。 |

## AI 判断要点

1. 先确认异常编码是 `B01E01`，不要与 `B01E1470` 订单状态被终止无法上架混淆。
2. 询问或读取入库单当前状态：草稿、终止、直发自验未完成、还是已自动提交。
3. 若来源条件已满足自动提交，不要额外推荐不必要的非标处理。
4. 若进入异常暂存，先让客户更新入库单状态或明确处理意图，再匹配 VASC。
5. 字段、费用金额、状态恢复操作和客服提交细节不在本页定版。

## 证据边界

- normalized 只证明本异常与上述 VASC 存在候选关系，不证明每个状态异常都能直接选择所有 VASC。
- 本页不定义具体系统状态枚举、字段配置、费用金额和客服操作步骤。
- 自动提交条件来自项目内事件快照；实际能否上架仍需以系统状态和仓库处理结果为准。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
