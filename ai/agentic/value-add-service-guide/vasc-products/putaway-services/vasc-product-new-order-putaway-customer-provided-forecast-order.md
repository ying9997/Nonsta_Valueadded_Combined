---
title: 新单上架（客户提供预报单）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, new-order-putaway, non-standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/no-box-list-forecast-faq.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202412111831129
vasc_product_name: 新单上架（客户提供预报单）
vasc_product_type: non_standard
vasc_submission_entry: exception_order
vasc_handling_method: new_order_putaway
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 新单上架（客户提供预报单）

## 摘要

`新单上架（客户提供预报单）` 是入库异常链路中的非标 VASC 产品，用于客户使用无箱单预报单相关信息承接异常货物上架的场景。normalized 数据显示，本产品只编排一个原子：`入库-提供无箱单预报单上架`。

本产品不是普通新单上架，也不是补贴包裹条码。它的核心是客户补充原始无箱单预报信息，使仓库能把到仓实物与预报单关系重新识别并完成上架。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202412111831129` |
| VASC 产品名称 | 新单上架（客户提供预报单） |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 非标增值 |
| 提交主体 | 客户 / 客服 |
| 执行主体 | 仓库 |
| 处理方式 | 客户提供预报单承接上架 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PS`、`PEWC`、`STOP`、`SHD`、`EWC` |

## 适用判断

选择本产品前，AI 需要确认：

1. 客户使用的是无箱单预报相关入库链路，且能提供原始无箱单预报信息。
2. 异常处理意图是用客户提供的预报单信息承接上架。
3. 当前不是普通客户创建新入库单，也不是 WINIT 创建新入库单。
4. 当前不是只需要补贴包裹条码或直接上架。
5. 无箱单预报入库单本身不支持通过入库单入口创建标准/非标增值；本产品只能按异常链路和 normalized 映射谨慎使用。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 客户补充原始无箱单预报信息 | 入库-提供无箱单预报单上架 | 异常暂存或待识别货物回到入库上架链路 | 由客户提供的预报单信息承接上架，异常单通过增值处理闭环 | 通常为终态。 |
| 客户无法提供预报信息 | 本产品不应直接执行 | 实物继续暂存或转其他处理方向 | 信息流停留在异常待补资料，或改选普通新单、原单、销毁、自提等方向 | 非闭环。 |
| 只是包裹条码缺失/破损 | 不应直接套用 | 实物可能通过补贴包裹条码回到原单或新单 | 信息流应查补包裹条码相关 VASC/原子 | 非本产品闭环。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 新单上架（客户提供预报单）` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1622` | 入库-提供无箱单预报单上架 | N | 入库-提供无箱单预报单上架 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 入库-提供无箱单预报单上架 | 客户使用无箱单预报单入库，货物到仓后识别信息丢失或无法识别，客户能提供原始无箱单信息。 | normalized 和原子页有证据；字段配置缺失。 |

## 与其他新单产品的区别

| 产品 | 区别 |
|---|---|
| 新单上架（客户创建入库单） | 客户创建普通新入库单承接；本页是客户提供无箱单预报单信息。 |
| 新单上架（WINIT创建入库单） | WINIT 创建新入库单承接；本页由客户提供预报单信息。 |
| 新单上架（直接上架） | 直接上架，通常不需要补充无箱单预报资料；本页需要客户提供预报信息。 |
| 原单上架 | 继续使用原入库单；本页使用预报单信息承接。 |

## 证据边界

- 本页不生成字段配置、预报单模板、附件格式、识别码字段和费用结论。
- 无箱单预报 FAQ 中存在大量普通下单和识别码规则，不能全部泛化为本异常处理 VASC 的配置字段。
- 若客户无法提供原始无箱单信息，不能承诺本产品可闭环。

## 相关链接

- [入库-提供无箱单预报单上架](../../value-added-service-items/putaway-items/value-added-service-item-inbound-no-box-list-forecast-putaway.md)
- [新单上架（客户创建入库单）](vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
