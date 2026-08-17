---
title: 新单上架（直接上架）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, new-order-putaway, direct-putaway, standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202505282347101
vasc_product_name: 新单上架（直接上架）
vasc_product_type: standard
vasc_submission_entry: exception_order
vasc_handling_method: direct_putaway
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 新单上架（直接上架）

## 摘要

`新单上架（直接上架）` 是入库异常链路中的标准 VASC 产品，用于异常货物不回原入库单，而是按客户提供的新入库单或预报单方向直接上架的场景。normalized 数据显示，本产品只编排 `直接上架` 一个原子。

本产品与 `新单上架（客户创建入库单）` 不同：后者常包含补贴包裹条码、换/补商品条码、包装处理等动作；本页强调无需额外贴标、换标或包装处理即可直接上架。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202505282347101` |
| VASC 产品名称 | 新单上架（直接上架） |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 新单方向直接上架 |
| 是否支持无业务单据 | 是 |
| 来源状态线索 | `PEWC`、`TS` |

## 适用判断

选择本产品前，AI 需要确认：

1. 客户处理意图是新单方向承接，而不是继续使用原入库单。
2. 货物无需额外补包裹条码、换商品条码、包装处理或条码关联即可上架。
3. 客户已能提供可承接的入库单号或预报信息；`直接上架` 原子存在必填 `入库单号` 字段。
4. 如果需要补包裹条码或换商品条码，应改查 `新单上架（客户创建入库单）` 或其他新单产品。
5. 如果客户明确用原入库单直接上架，应改查 `原单上架（直接上架）`。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 新单方向可承接且无需额外处理 | 直接上架 | 异常暂存或拦截货物回到上架链路，按新单方向形成库存 | 新入库单或预报信息承接上架结果，异常单通过增值完成闭环 | 通常为终态。 |
| 仍需补贴包裹条码或换商品条码 | 本产品不应单独使用 | 实物继续暂存，等待贴标/换标动作 | 信息流应转新单上架（客户创建入库单）或对应原子配置 | 非本产品闭环。 |
| 客户要求原单承接 | 本产品不适用 | 实物回原入库单上架链路 | 信息流应改选原单上架或原单直接上架 | 非本产品闭环。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 新单上架（直接上架）` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B01E01` | 入库单状态异常 | `IN_BOUND` |
| `B01E49` | 客户直发包裹串仓 | `IN_BOUND` |
| `B0102E21` | 包裹条码异常(需客户处理) | `IN_BOUND` |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` |
| `B0102E27` | 商品裸装 | `IN_BOUND` |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` |
| `B01E1470` | 订单状态被终止无法上架 | `IN_BOUND` |
| `B01E1514` | 订单状态已上架需拦截 | `IN_BOUND` |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | `IN_BOUND` |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `IN_BOUND` |
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1708` | 直接上架 | N | 直接上架 | partial_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 直接上架 | 新单方向可承接，客户要求直接上架，且不需要额外贴标、换标、包装或条码关联。 | 业务目录和原子页有证据。 |

## 与其他新单产品的区别

| 产品 | 区别 |
|---|---|
| 新单上架（客户创建入库单） | 包含补包裹条码、换商品条码、包装等候选动作；本页只编排直接上架。 |
| 新单上架（客户提供预报单） | 用无箱单预报信息承接；本页只说明直接上架产品，不沉淀预报单字段。 |
| 原单上架（直接上架） | 使用原入库单承接；本页使用新单方向承接。 |

## 证据边界

- 本页不定版字段配置、附件、模板和费用；字段细节进入 `直接上架` 原子页或配置字段模块。
- normalized 数据证明本产品与异常、原子存在关联，但不证明所有异常都可直接上架。
- 若客户需求中出现补条码、换标、包装、拍照、销毁或自提，应改查对应产品。

## 相关链接

- [直接上架](../../value-added-service-items/putaway-items/value-added-service-item-direct-putaway.md)
- [新单上架（客户创建入库单）](vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [原单上架（直接上架）](vasc-product-original-order-direct-putaway.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
