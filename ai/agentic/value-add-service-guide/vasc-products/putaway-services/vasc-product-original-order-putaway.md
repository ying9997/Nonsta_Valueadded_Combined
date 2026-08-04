---
title: 原单上架
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, original-order-putaway, standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/vas-exception-handling.md
  - source-references/kb-business-source-snapshots/parcel-barcode-exception-subsidy-putaway.md
  - source-references/kb-business-source-snapshots/product-barcode-third-party-putaway.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202407031503503
vasc_product_name: 原单上架
vasc_product_type: standard
vasc_submission_entry: exception_order
vasc_handling_method: original_order_putaway
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 原单上架

## 摘要

`原单上架` 是入库异常链路中的标准 VASC 产品，用于客户希望异常货物继续使用原入库单承接上架的场景。它不是单一仓库动作，而是一个 VASC 产品，下面编排了多个候选增值服务项/原子，例如更换商品包装、补/换商品条码、第三方商品条码关联、补贴包裹条码等。

AI 使用本页时，必须先判断“异常货物是否还能使用原入库单”。只有实物、异常对象、原入库单状态和客户处理意图都支持原单承接时，才进入本产品；进入本产品后，还要根据具体异常和客户需求动态判断可选原子。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202407031503503` |
| VASC 产品名称 | 原单上架 |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 使用原入库单上架 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PEWC`、`TS` |

## 适用判断

选择 `原单上架` 前，AI 需要确认：

1. 异常货物可以继续由原入库单承接。
2. 客户不是要求换新入库单、无箱单预报单、销毁、自提或调拨。
3. 异常对象与要选择的原子对象匹配，例如商品异常选择商品类动作，包裹异常选择包裹条码动作。
4. 若是第三方商品条码问题，异常必须符合“商品有条码但系统无法识别”的业务口径。
5. 字段、模板、附件和具体配置不在本页定版，应进入第 4 部分服务项/原子配置知识。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 商品条码可回原单承接 | 入库-补贴原商品条码、入库-更换新商品条码 | 异常暂存商品补标后回到原入库单上架 | 异常单通过增值单处理，原入库单继续承接上架 | 通常为终态。 |
| 第三方商品条码关联 | 入库-第三方商品条码关联 | 商品无需换实物标签或按来源要求完成关联后，回原单继续扫描上架 | 第三方条码与 Winit SKU 关系补齐，原入库单继续承接 | 通常为终态；仅适用于 `B01E1316` 类场景。 |
| 包裹条码可回原单承接 | 入库-补贴包裹条码 | 异常暂存包裹补贴可用包裹条码后回原单上架 | 包裹信息重新挂回原入库单/原包裹承接关系 | 通常为终态。 |
| 包装处理后回原单 | 入库-更换商品包装 | 商品更换或加固包装后回原单上架 | 原入库单不改变，增值单记录包装处理动作 | 通常为终态。 |
| 原单状态或实物关系不支持 | 不应进入本产品 | 实物继续暂存或转其他处理 | 信息流应转新单、预报单、销毁、自提或非标 | 非闭环，需要改选处理方向。 |

## 可处理异常索引

以下异常来自异常到 VASC 映射，表示 normalized 数据中存在 `exception -> 原单上架` 的关联。是否实际推荐，还需结合客户处理意图和原子可选条件。

| 异常编码 | 异常名称 | 异常节点 | 对象线索 |
|---|---|---|---|
| `B0102E21` | 包裹条码异常(需客户处理) | `IN_BOUND` | 包裹 |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` | 商品/包裹质量 |
| `B0102E27` | 商品裸装 | `IN_BOUND` | 商品 |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` | 商品 |
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` | 商品 |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` | 商品 |
| `B01E1579` | A+包商品条码和包裹条码对应关系校验不一致 | `IN_BOUND` | 包裹/商品关系 |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `IN_BOUND` | 包裹 |
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` | 商品 |

## 原子编排

以下为 `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md` 中记录的产品到原子编排。`required = N` 表示该原子不是产品级必选项，不代表所有场景都可选。

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1561` | 入库-更换商品包装 | N | 入库-更换商品包装 | partial_field_evidence |
| 2 | `OW01V1559` | 入库-更换新商品条码 | N | 贴商品标 | partial_field_evidence |
| 3 | `OW01V1558` | 入库-补贴原商品条码 | N | 贴商品标 | partial_field_evidence |
| 4 | `OW01V1572` | 入库-第三方商品条码关联 | N | 贴商品标 | missing_field_evidence |
| 5 | `OW01V1825` | 入库-补贴原商品条码（带示例图） | N | 贴商品标 | partial_field_evidence |
| 6 | `OW01V1573` | 入库-商品其他标签（非商品条码） | N | 入库-商品附加标签 | partial_field_evidence |
| 7 | `OW01V1560` | 入库-补贴包裹条码 | N | 入库-补贴包裹条码 | partial_field_evidence |

## 原子动态可选性

本节只记录“什么业务条件下可考虑该原子”。具体字段配置放到第 4 部分，不在本页展开。

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 入库-更换商品包装 | 商品包装/质量异常，客户要求更换包装后仍使用原单上架。 | 业务表有场景证据；需结合异常对象和包装类异常页。 |
| 入库-更换新商品条码 | 商品实物贴的商品条码/第三方商品条码错误，但实物与原入库单商品一致，需要更换正确商品条码后原单上架。 | 业务表有场景证据；同“贴商品标”组内与其他商品标原子互斥。 |
| 入库-补贴原商品条码 | 商品实物与原入库单商品一致，但原商品条码无法扫描或需要补贴异常单登记商品条码后原单上架。 | 业务表有场景证据；同“贴商品标”组内互斥。 |
| 入库-第三方商品条码关联 | 商品有第三方条码但系统无法识别，且客户已维护第三方条码与 Winit SKU 关联，要求使用原单继续上架。 | 强限制：只支持“商品有条码但系统无法识别”类异常；不适用于普通商品条码异常。 |
| 入库-补贴原商品条码（带示例图） | normalized 编排存在该原子，但当前业务快照未沉淀独立场景口径。 | 仅作为候选原子索引；推荐前需补充场景证据。 |
| 入库-商品其他标签（非商品条码） | normalized 编排存在该原子，但当前异常解决方案中未形成清晰原单上架场景。 | 仅作为候选原子索引；推荐前需补充场景证据。 |
| 入库-补贴包裹条码 | 包裹条码异常、A+ 包商品条码和包裹条码关系异常等场景，客户能确认原入库单并要求使用原单上架。 | 业务表和包裹条码 SOP 有场景证据。 |

## 互斥与组合规则

- `贴商品标` 互斥组内通常只能选择一个商品贴标类原子，例如更换新商品条码、补贴原商品条码、第三方商品条码关联、带示例图的补贴原商品条码。
- `入库-更换商品包装`、`入库-商品附加标签`、`入库-补贴包裹条码` 属于不同分组；是否可组合要看系统实际选项和异常解决方案，不得只凭分组推断可以任意组合。
- normalized 数据提供产品级候选原子，不完整表达“异常编码 -> 客户需求 -> 原子”的全部条件。AI 必须结合 `vas-exception-solution-catalog.md` 的客户需求描述判断。

## 与其他上架产品的区别

| 产品 | 区别 |
|---|---|
| 新单上架（客户创建入库单） | 使用客户新建入库单承接异常货物，而不是原入库单。 |
| 新单上架（WINIT创建入库单） | 由 WINIT 创建新入库单承接，适用范围比客户创建新单更窄。 |
| 原单上架（直接上架） | 直接上架产品强调无需或少量额外动作；本页 `原单上架` 是包含多个候选原子的综合产品。 |

## 证据边界

- 本页不生成字段配置、模板、附件、枚举和费用结论。
- 字段证据状态只说明已有部分字段证据，不代表字段配置已经完整。
- 若业务表中存在入口关闭、不推荐或历史备注，AI 回答时必须保留限制。
- 若某原子只在 normalized 编排中出现，但没有业务场景证据，本页只标为候选，不作为推荐结论。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
