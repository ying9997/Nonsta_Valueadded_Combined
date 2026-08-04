---
title: 新单上架（客户创建入库单）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, new-order-putaway, standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/parcel-barcode-exception-subsidy-putaway.md
  - source-references/kb-business-source-snapshots/parcel-order-product-putaway.md
  - source-references/kb-business-source-snapshots/exception-inbound.md
  - source-references/kb-business-source-snapshots/direct-ship-order-overseas-warehouse.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202407161056217
vasc_product_name: 新单上架（客户创建入库单）
vasc_product_type: standard
vasc_submission_entry: exception_order
vasc_handling_method: new_order_putaway
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 新单上架（客户创建入库单）

## 摘要

`新单上架（客户创建入库单）` 是入库异常链路中的标准 VASC 产品，用于客户自行创建新的入库单，让异常货物脱离原入库单信息流并按新入库单承接上架。

该产品的关键不是“上架”两个字，而是“客户已创建或需要创建新入库单”。AI 必须先判断原入库单是否不能或不应继续承接，以及客户是否能提供新入库单、新包裹条码等信息。进入本产品后，再根据异常对象和客户需求动态选择补包裹条码、补/换商品条码、包装处理等原子。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202407161056217` |
| VASC 产品名称 | 新单上架（客户创建入库单） |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 客户提供新入库单承接上架 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PEWC`、`TS` |

## 适用判断

选择本产品前，AI 需要确认：

1. 客户处理意图是用新入库单承接异常货物。
2. 新入库单由客户创建，不是 WINIT 创建，也不是无箱单预报单直接承接。
3. 原入库单不能继续承接，或客户明确要求换新单上架。
4. 异常对象与要选择的原子对象匹配。
5. 客户是否已具备新入库单号、新包裹条码、商品信息等配置资料。具体字段放到第 4 部分，不在本页展开。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 包裹改由客户新单承接 | 入库-补贴包裹条码 | 异常暂存包裹补贴新单可用包裹条码后，按客户新建入库单上架 | 客户新建入库单成为承接信息流，原异常单通过增值单处理 | 通常为终态。 |
| 商品改由客户新单承接 | 入库-更换新商品条码、必要时补贴原商品条码 | 异常暂存商品完成商品标处理后，按新入库单上架 | 商品与客户新单中的 SKU/包裹关系重新匹配 | 通常为终态。 |
| 包装处理后新单上架 | 入库-更换商品包装 | 商品或包裹完成包装处理后，按客户新单上架 | 新入库单承接上架结果，增值单记录包装动作 | 通常为终态。 |
| 原单已上架、终止或不应继续承接 | 常见为补包裹条码或换商品标 | 异常暂存货物不回原单，转客户新单承接 | 原单与异常处理分离，新单承担后续入库和库存形成 | 通常为终态。 |
| 客户尚未创建新单或资料不足 | 不应直接执行本产品 | 实物继续暂存 | 信息流停留在异常单/增值待补资料状态 | 非闭环，需要客户先补齐新单和条码资料。 |

## 可处理异常索引

以下异常来自异常到 VASC 映射，表示 normalized 数据中存在 `exception -> 新单上架（客户创建入库单）` 的关联。

| 异常编码 | 异常名称 | 异常节点 | 典型新单承接原因 |
|---|---|---|---|
| `B01E01` | 入库单状态异常 | `IN_BOUND` | 原单状态不支持上架，客户需创建新单承接。 |
| `B01E49` | 客户直发包裹串仓 | `IN_BOUND` | 在实际所在仓库创建新单上架。 |
| `B0102E21` | 包裹条码异常(需客户处理) | `IN_BOUND` | 无法定位原单或需要新包裹条码承接。 |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` | 换包装/换信息流后新单上架。 |
| `B0102E27` | 商品裸装 | `IN_BOUND` | 需要新单承接时使用。 |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` | 异常货物改由新单承接。 |
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` | 商品未在原单下单或需换新信息流。 |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` | 原单无法承接或需补新包裹条码上架。 |
| `B01E1378` | A+包裹/箱产品无批次信息或批次信息不全 | `IN_BOUND` | 确认批次或商品信息后用新单承接。 |
| `B01E1470` | 订单状态被终止无法上架 | `IN_BOUND` | 原单终止，需新单承接。 |
| `B01E1514` | 订单状态已上架需拦截 | `IN_BOUND` | 后到包裹不能继续原单，需新单承接。 |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | `IN_BOUND` | 异常商品需新单和新包裹信息承接。 |
| `B01E1517` | 到仓包裹商品数量大于验货数量（需客户处理） | `IN_BOUND` | 多出的商品需客户创建新单承接。 |
| `B01E1579` | A+包商品条码和包裹条码对应关系校验不一致 | `IN_BOUND` | 更换正确包裹条码并用新单上架。 |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `IN_BOUND` | 批量包裹条码问题需要新单承接。 |
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` | 计划外/订单外商品通常需要新单承接。 |

## 原子编排

以下为产品到原子的候选编排。`required = N` 表示产品级非必选，不代表任意场景都可选。

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1561` | 入库-更换商品包装 | N | 入库-更换商品包装 | partial_field_evidence |
| 2 | `OW01V1560` | 入库-补贴包裹条码 | N | 入库-补贴包裹条码 | partial_field_evidence |
| 3 | `OW01V1558` | 入库-补贴原商品条码 | N | 未提供 | partial_field_evidence |
| 4 | `OW01V1559` | 入库-更换新商品条码 | N | 未提供 | partial_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 入库-更换商品包装 | 商品/A+ 包裹包装或质量异常，客户要求更换包装后使用新单上架。 | 业务表有场景证据；需结合包装/质量异常。 |
| 入库-补贴包裹条码 | 包裹条码异常、直发串仓、入库单状态异常、订单终止/已上架后到仓、错装、多货等需要新入库单和新包裹条码承接的场景。 | 业务表和 SOP 证据较充分，是本产品高频原子。 |
| 入库-补贴原商品条码 | normalized 编排存在该原子，但在新单承接场景下需确认客户是否仍需要补贴原商品条码。 | 候选原子；具体场景需补充业务证据，不默认推荐。 |
| 入库-更换新商品条码 | 商品条码异常、实物条码错误、实物与原单不一致等需要新商品条码并用新单上架的场景。 | 业务表有部分场景证据。 |

## 新单承接的典型业务分支

| 分支 | 判断方式 | 本产品中的常见原子 |
|---|---|---|
| 包裹条码异常 | 客户无法定位原单，或异常单未登记入库单，需要新入库单承接 | 入库-补贴包裹条码 |
| 直发串仓 | 包裹实际到仓仓库不是目的仓，客户选择在实际所在仓库上架 | 入库-补贴包裹条码 |
| 入库单状态异常 | 订单状态草稿/终止/已上架等导致原单无法继续承接 | 入库-补贴包裹条码 |
| 计划外商品/错装/多货 | 商品不属于原包裹/原订单或数量大于验货数量 | 入库-补贴包裹条码，必要时结合商品条码原子 |
| 商品条码异常 | 实物与原单关系不适合继续原单上架 | 入库-更换新商品条码或入库-补贴包裹条码 |

## 与其他新单产品的区别

| 产品 | 区别 |
|---|---|
| 新单上架（WINIT创建入库单） | 新入库单由 WINIT 创建；适用异常范围更窄。 |
| 新单上架（客户提供预报单） | 使用无箱单预报单承接，不等同客户创建普通新入库单。 |
| 新单上架（直接上架） | 直接上架产品强调无需补标签/包装等动作；本产品包含补包裹条码、换标、包装等候选原子。 |

## 证据边界

- 本页不生成字段配置、模板、附件、枚举和费用结论。
- normalized 数据可证明本产品候选原子和异常关联，但不完整表达所有原子的场景条件。
- 原子是否可选必须结合异常解决方案目录中的客户需求描述和系统实际可选项。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
