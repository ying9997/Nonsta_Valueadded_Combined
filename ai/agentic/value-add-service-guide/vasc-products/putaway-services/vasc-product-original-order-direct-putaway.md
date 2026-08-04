---
title: 原单上架（直接上架）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, original-order-putaway, direct-putaway, standard-vasc, active-vasc]
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
vasc_product_code: VASC202504251617529
vasc_product_name: 原单上架（直接上架）
vasc_product_type: standard
vasc_submission_entry: exception_order
vasc_handling_method: direct_putaway
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 原单上架（直接上架）

## 摘要

`原单上架（直接上架）` 是入库异常链路中的标准 VASC 产品，用于异常货物仍可由原入库单承接，且客户要求直接上架的场景。它与普通 `原单上架` 的区别在于：本产品以 `直接上架` 原子为核心，通常不需要复杂贴标、换标、包装或第三方条码关联。

normalized 数据显示，本产品除 `直接上架` 外，还编排了更换新商品条码、覆盖包裹标签、补贴包裹条码等候选原子；这些候选原子不代表所有直接上架场景都可选，必须结合客户需求动态判断。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202504251617529` |
| VASC 产品名称 | 原单上架（直接上架） |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 使用原入库单直接上架 |
| 是否支持无业务单据 | 是 |
| 来源状态线索 | `PEWC`、`SHD`、`TS` |

## 适用判断

选择本产品前，AI 需要确认：

1. 客户处理意图是继续使用原入库单上架。
2. 实物和信息流仍能由原入库单承接。
3. 客户要求直接上架，且无需普通 `原单上架` 中的复杂补/换商品条码、包装等处理。
4. 若只是需要覆盖包裹标签或补贴包裹条码，应明确这是原单直接上架产品下的候选动作，不等同所有直接上架场景。
5. 若客户要求使用新入库单或无箱单预报单承接，应改查新单类产品。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 原单可承接且无需额外处理 | 直接上架 | 异常暂存或拦截货物回到原入库单上架链路 | 原入库单继续承接上架，异常单通过增值完成闭环 | 通常为终态。 |
| 原单可承接但需要轻量标签动作 | 覆盖包裹标签、补贴包裹条码、必要时更换新商品条码 | 货物完成对应标签动作后回原单上架 | 原入库单继续承接；增值单记录标签动作 | 条件闭环。 |
| 原单不能承接 | 本产品不适用 | 实物继续暂存或转新单、销毁、自提等方向 | 信息流应改选新单上架、销毁、自提或非标 | 非本产品闭环。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 原单上架（直接上架）` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B01E01` | 入库单状态异常 | `IN_BOUND` |
| `B01E49` | 客户直发包裹串仓 | `IN_BOUND` |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | `IN_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1708` | 直接上架 | N | 直接上架 | partial_field_evidence |
| 2 | `OW01V1559` | 入库-更换新商品条码 | N | 未提供 | partial_field_evidence |
| 3 | `OW01V1736` | 入库-覆盖包裹标签 | N | 未提供 | partial_field_evidence |
| 4 | `OW01V1560` | 入库-补贴包裹条码 | N | 未提供 | partial_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 直接上架 | 原入库单可承接，客户要求直接上架，且不需要额外补贴标签、换标、包装或关联条码。 | 业务目录和原子页有证据。 |
| 入库-更换新商品条码 | normalized 编排存在；只有当原单直接上架前确需更换商品条码时才考虑。 | 候选原子；推荐前需结合异常解决方案。 |
| 入库-覆盖包裹标签 | 入库包裹标签需要覆盖，但覆盖后仍使用原单直接上架方向。 | 字段证据较完整；不等同补包裹条码。 |
| 入库-补贴包裹条码 | 原单仍可承接，但需要补贴包裹条码后上架。 | 候选原子；需确认不是新单承接。 |

## 与其他上架产品的区别

| 产品 | 区别 |
|---|---|
| 原单上架 | 综合原单上架产品，包含包装、商品条码、第三方条码关联等更完整原子编排。 |
| 新单上架（直接上架） | 使用客户提供的新入库单或预报单方向承接；本页使用原入库单。 |
| 新单上架（客户创建入库单） | 客户创建普通新入库单，通常涉及补贴新单包裹条码等动作。 |

## 证据边界

- 本页不定版字段配置、附件、模板和费用；字段细节进入原子页或配置字段模块。
- normalized 数据证明产品下存在多个候选原子，但不证明它们可在任意异常下组合。
- `直接上架` 的前置判断是原单可承接且客户明确要求直接上架。

## 相关链接

- [直接上架](../../value-added-service-items/putaway-items/value-added-service-item-direct-putaway.md)
- [入库-覆盖包裹标签](../../value-added-service-items/labeling-items/value-added-service-item-inbound-cover-package-label.md)
- [原单上架](vasc-product-original-order-putaway.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
