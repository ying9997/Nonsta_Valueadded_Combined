---
title: 新单上架（WINIT创建入库单）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, winit-created-order-putaway, new-order-putaway, standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/vas-exception-handling.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202407012141008
vasc_product_name: 新单上架（WINIT创建入库单）
vasc_product_type: standard
vasc_submission_entry: exception_order
vasc_handling_method: winit_created_order_putaway
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 新单上架（WINIT创建入库单）

## 摘要

`新单上架（WINIT创建入库单）` 是入库异常链路中的标准 VASC 产品，用于异常货物需要新入库单承接，且新入库单由 WINIT 创建的场景。它与 `新单上架（客户创建入库单）` 不同：本产品不是客户提供新入库单号的普通新单路径。

AI 使用本页时，必须先确认业务资料或系统入口明确支持 WINIT 创建入库单。不能因为某个异常需要“新单上架”，就默认可选本产品。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202407012141008` |
| VASC 产品名称 | 新单上架（WINIT创建入库单） |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | WINIT 创建新入库单承接上架 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PEWC`、`TS` |

## 适用判断

选择本产品前，AI 需要确认：

1. 异常货物需要脱离原入库单，用新入库单承接。
2. 新入库单由 WINIT 创建，而不是客户创建。
3. 异常编码在映射中确实关联本 VASC。
4. 异常解决方案目录中没有更具体的限制或相反备注。
5. 具体原子选择必须看异常对象和客户需求，不按候选原子列表机械全选。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 商品条码异常或订单外商品需要 WINIT 新单承接 | 入库-更换新商品条码，必要时结合商品包装处理 | 异常暂存商品完成换标或包装处理后，转由 WINIT 创建的新入库单上架 | 原异常单通过增值单处理；WINIT 新建入库单成为后续入库和库存形成的信息流 | 通常为终态。 |
| 商品裸装或质量/包装类异常需要 WINIT 新单承接 | 入库-更换商品包装 | 异常暂存商品完成包装处理后，按 WINIT 创建的新入库单上架 | 增值单记录包装动作，新入库单承接上架结果 | 通常为终态。 |
| A+ 包商品条码和包裹条码对应关系异常 | 入库-补贴包裹条码，或来源明确支持的其他条码动作 | 异常暂存包裹/商品完成正确包裹关系处理后，再进入 WINIT 新单上架 | 包裹与商品关系重建后，由 WINIT 新单承接；不能仅因编排存在就默认所有 WINIT 新单都要补包裹条码 | 通常为终态，但需看具体异常场景。 |
| 第三方商品条码可关联且系统入口支持本产品 | 入库-第三方商品条码关联 | 实物不一定需要换贴商品标；完成关联后按系统支持的入库承接关系继续上架 | 第三方条码与 Winit SKU 的关联被补齐；若业务资料指向原单上架，应转读原单上架页，不能强行归入 WINIT 新单 | 条件闭环。 |
| 仅有“需要新单”诉求，但无法确认由 WINIT 创建 | 不应直接执行本产品 | 实物继续停留在异常暂存或待客户确认状态 | 信息流停留在异常单/增值待补资料状态；需确认是否改选客户创建新单或其他产品 | 非闭环。 |

## 可处理异常索引

以下异常来自异常到 VASC 映射，表示 normalized 数据中存在 `exception -> 新单上架（WINIT创建入库单）` 的关联。

| 异常编码 | 异常名称 | 异常节点 | 判断重点 |
|---|---|---|---|
| `B0102E27` | 商品裸装 | `IN_BOUND` | 是否确需 WINIT 创建新单承接。 |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` | 质量异常处理后是否需要 WINIT 新单。 |
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` | 商品条码异常且需 WINIT 新单承接。 |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` | 若是第三方条码关联，需满足该异常的强适用条件。 |
| `B01E1579` | A+包商品条码和包裹条码对应关系校验不一致 | `IN_BOUND` | 是否由 WINIT 创建新单并承接包裹/商品关系。 |
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` | 订单外商品是否由 WINIT 新单承接。 |

## 原子编排

以下为产品到原子的候选编排。`required = N` 表示产品级非必选，不代表任意场景都可选。

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1561` | 入库-更换商品包装 | N | 入库-更换商品包装 | partial_field_evidence |
| 2 | `OW01V1559` | 入库-更换新商品条码 | N | 贴商品标 | partial_field_evidence |
| 3 | `OW01V1558` | 入库-补贴原商品条码 | N | 贴商品标 | partial_field_evidence |
| 4 | `OW01V1572` | 入库-第三方商品条码关联 | N | 贴商品标 | missing_field_evidence |
| 5 | `OW01V1560` | 入库-补贴包裹条码 | N | 入库-补贴包裹条码 | partial_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 入库-更换商品包装 | 商品质量/包装类异常处理后，需要 WINIT 创建新单承接。 | 业务表有部分场景证据；需结合具体异常页。 |
| 入库-更换新商品条码 | 商品条码异常、订单外商品、A+ 包商品/包裹关系异常等需要新商品条码并由 WINIT 新单承接的场景。 | 业务表有场景证据。 |
| 入库-补贴原商品条码 | normalized 编排存在该原子，但 WINIT 创建新单场景下具体适用条件不完整。 | 候选原子；推荐前需补充业务证据。 |
| 入库-第三方商品条码关联 | 仅在“商品有条码但系统无法识别”且第三方条码关联满足条件时考虑。 | 强限制：不适用于一般商品条码异常。 |
| 入库-补贴包裹条码 | normalized 编排存在该原子，但异常解决方案目录中有场景备注显示 WINIT 创建入库单时可能无需选择该原子。 | 候选原子；不能机械推荐。 |

## 特别边界

异常解决方案目录中存在场景说明：商品实物贴的商品条码/第三方商品条码错误且实物与异常单登记包裹条码内下单商品不一致时，可使用 WINIT 创建入库单并更换新商品条码；该备注同时说明 WINIT 创建入库单场景下“无需选择入库-补贴包裹条码”。因此，本产品页不能把编排中的 `入库-补贴包裹条码` 自动推给所有 WINIT 新单场景。

## 与客户创建新单的区别

| 产品 | 区别 |
|---|---|
| 新单上架（客户创建入库单） | 客户提供新入库单承接，覆盖更多状态、串仓、包裹条码和数量类异常。 |
| 新单上架（WINIT创建入库单） | WINIT 创建新入库单，映射异常范围较窄，需业务或系统入口明确支持。 |

## 证据边界

- 本页不生成字段配置、模板、附件、枚举和费用结论。
- normalized 数据证明候选原子和异常关联，但不完整表达所有原子的场景条件。
- `入库-补贴包裹条码` 在本产品下存在编排候选，但部分业务场景明确不需要选择；AI 必须动态判断。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
