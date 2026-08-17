---
title: 库内非标增值（特批）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, in-warehouse, non-standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/nonstandard-vas-application-process.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202411192250069
vasc_product_name: 库内非标增值（特批）
vasc_product_type: non_standard
vasc_submission_entry: unknown
vasc_handling_method: unknown
vasc_active_status: active
related_pscg: OSF632 库内增值
---

# 库内非标增值（特批）

## 摘要

`库内非标增值（特批）` 是 `OSF632` 库内增值下的 active 非标 VASC 产品。normalized 数据显示，本产品需要 PD 审核、客户确认，并允许审核中修改；业务快照说明该产品提交后由万邑通审核并输出报价，经客户确认报价后下发仓库操作执行。

本产品编排 6 个候选原子：代采购包材物料、审计盘点、DG 商品销毁、货权转移两种模式、库内其他服务需求。它是特批产品，不是标准库内轻加工、免审核库内非标或普通库内销毁的替代品。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202411192250069` |
| VASC 产品名称 | 库内非标增值（特批） |
| PSCG | `OSF632` 库内增值 |
| 启用状态 | active |
| 产品类型 | 非标增值 |
| 提交主体 | 客户 / 客服 |
| 执行主体 | 仓库 |
| 审核部门 | `PD` |
| 是否需要审核 | Y |
| 是否允许审核中修改 | Y |
| 是否需要客户确认 | Y |
| 是否支持无业务单据 | 否 |
| 关联 PSC 线索 | `OSF632008274` |
| 来源列表线索 | `STOCK_SHELVES`、`STORAGE`、`DESTRUCTION` |

## 适用判断

选择本产品前，AI 需要确认：

1. 需求发生在库内/在库异常或库存处理链路。
2. 客户需求属于特批库内非标范围，而不是标准库内轻加工、库内商品拍照、库内销毁或免审核库内非标可承接范围。
3. 如果是包材采购、审计盘点、DG 商品销毁或货权转移，应优先选择对应明确原子，不要直接走 `库内其他服务需求`。
4. 如果是未归纳的库内特殊服务，才考虑 `库内其他服务需求`。
5. 本产品需要审核、报价和客户确认；不能承诺立即下发仓库执行。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 采购包材/物料 | 代采购包材物料 | 实物货物通常仍在库内，包材或工具物料采购到位后承接后续包装/加工 | 增值单记录采购支持需求、报价和执行结果 | 通常非终态。 |
| 库存审计 | 审计盘点 | 实物按全盘或指定 SKU 抽盘范围被盘点，必要时后续调整库存 | 信息流反馈盘点结果，可能衔接库存调整或异常闭环 | 取决于盘点结论。 |
| DG 商品销毁 | DG商品销毁 | DG 商品进入销毁处理，可能由专业销毁机构处理并产出销毁证明 | 增值单记录销毁和证明需求；库存/异常状态随销毁完成更新 | 可能闭环销毁需求。 |
| 货权转移 | 货权转移（换标模式）/（改数模式） | 商品库存从原货权方转移到目标货权方；换标模式可能涉及标签处理，改数模式侧重数量/系统处理 | 信息流承接货权转移关系、数量和目标账号/货主信息 | 取决于货权转移完成。 |
| 其他库内定制服务 | 库内其他服务需求 | 按审核后的 SOP 执行，可能继续暂存、加工、上架、销毁或其他处理 | 信息流进入审核、报价、客户确认、仓库执行链路 | 取决于特批 SOP。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 库内非标增值（特批）` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E08` | 商品包装异常 | `IN_WAREHOUSE` |
| `B05E012` | 单品外包装破损 | `IN_WAREHOUSE` |
| `B05E013` | 包裹内商品错装 | `IN_WAREHOUSE` |
| `B05E014` | 单品质量异常 | `IN_WAREHOUSE` |
| `B05E1382` | 库存批次号错误 | `IN_WAREHOUSE` |
| `B05E1383` | 计划外批次 | `IN_WAREHOUSE` |
| `B05E1586` | 单品条码无法扫描(需客户处理） | `IN_WAREHOUSE` |
| `B06E1369` | 2B箱内商品条码异常 | `IN_WAREHOUSE` |
| `B06E1370` | 2B箱内多单品 | `IN_WAREHOUSE` |
| `B06E1371` | 2B箱内少单品 | `IN_WAREHOUSE` |
| `B06E1613` | A+包裹条码无法扫描 | `IN_WAREHOUSE` |
| `B06E1628` | DG商品包装不符合标准 | `IN_WAREHOUSE` |
| `B06E1735` | 打包完成后作废出库单（有商品增值） | `IN_WAREHOUSE` |
| `B07E1339` | 自提单取消出库（需要客户下入库单） | `IN_WAREHOUSE` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OSF6V1648` | 代采购包材物料 | N | 代采购包材物料 | missing_field_evidence |
| 2 | `OSF6V1660` | 审计盘点 | N | 审计盘点 | missing_field_evidence |
| 3 | `OSF6V1644` | DG商品销毁 | N | DG商品销毁 | missing_field_evidence |
| 4 | `OSF6V1646` | 货权转移（换标模式） | N | 货权转移（换标模式） | missing_field_evidence |
| 5 | `OSF6V1647` | 货权转移（改数模式） | N | 货权转移（改数模式） | missing_field_evidence |
| 6 | `OSF6V1603` | 库内其他服务需求 | N | 库内其他服务需求 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 不应选择的场景 | 证据状态 |
|---|---|---|---|
| 代采购包材物料 | 客户需要 WINIT 协助采购海外定制包材、客制包材或操作工具物料，供后续包装/加工使用。 | 只是使用仓库现有包材更换包装。 | normalized、原子页和业务快照有证据；字段配置缺失。 |
| 审计盘点 | 客户需要对名下全部账号、关联账号、主子账号或指定账号库存做全盘/抽盘。 | 只盘点指定 SKU 数量且无需审计口径。 | normalized 和原子页有证据；字段配置缺失。 |
| DG商品销毁 | DG 商品需要销毁，且可能需要销毁证明或专业机构处理。 | 普通异常商品销毁，可用库内-异常商品销毁承接。 | normalized、原子页和业务快照有证据；字段配置缺失。 |
| 货权转移（换标模式） | 指定 SKU 全球库存全部转移且单次转移单品数合计不超过 300 个，或指定 SKU 部分库存转移。 | 全球库存全部转移且单品数大于 300 个。 | normalized 和原子页有证据；字段配置缺失。 |
| 货权转移（改数模式） | 指定 SKU 全球库存全部转移且单次转移单品数大于 300 个。 | 部分库存转移或不满足改数模式数量口径。 | normalized 和原子页有证据；字段配置缺失。 |
| 库内其他服务需求 | 标准和已归纳非标原子都无法承接的库内特殊定制服务，需要审核、报价、客户确认和 SOP。 | 已有明确原子可承接；需求不清楚或不可执行。 | normalized、原子页和非标流程快照有证据；字段配置缺失。 |

## 特批边界

- 本产品提交后需要万邑通审核并输出报价，经客户确认报价后才下发仓库执行。
- `VASC_REQUIRE_CUSTOMER_CONFIRM = Y`，AI 回答时必须保留客户确认报价这一环节。
- `库内其他服务需求` 是兜底原子，不得覆盖代采购包材、DG 销毁、货权转移、审计盘点等已有明确原子。
- 若异常页或业务快照标注“不推荐使用”“系统暂不支持暂存”等限制，应优先保留限制。

## 证据边界

- 本页不定版字段、附件、SOP、报价字段、客户确认字段、销毁证明模板、盘点模板、货权转移表格、费用金额和国家仓库差异。
- normalized 只证明产品与异常/原子的候选关系，不证明每个异常都能选择所有 6 个原子。
- 本产品与免审核、需审核库内非标产品并列存在，必须按具体原子和审核/客户确认属性区分。

## 相关链接

- [代采购包材物料](../../value-added-service-items/packaging-items/value-added-service-item-in-warehouse-procure-packaging-materials.md)
- [审计盘点](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-audit-inventory-count.md)
- [DG商品销毁](../../value-added-service-items/destruction-items/value-added-service-item-in-warehouse-dg-product-destruction.md)
- [货权转移（换标模式）](../../value-added-service-items/transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md)
- [货权转移（改数模式）](../../value-added-service-items/transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md)
- [库内其他服务需求](../../value-added-service-items/other-service-demand-items/value-added-service-item-in-warehouse-other-service-demand.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
