---
title: 库内非标增值（需审核）
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
vasc_product_code: VASC202412111836315
vasc_product_name: 库内非标增值（需审核）
vasc_product_type: non_standard
vasc_submission_entry: unknown
vasc_handling_method: unknown
vasc_active_status: active
related_pscg: OSF632 库内增值
---

# 库内非标增值（需审核）

## 摘要

`库内非标增值（需审核）` 是 `OSF632` 库内增值下的 active 非标 VASC 产品。normalized 数据显示，本产品需要 PD 审核，允许审核中修改，不要求客户确认，并编排两个候选原子：`单品拆分后上架（拆分为多个SKU）` 和 `检查商品尺重（退货商品）`。

本产品与 `库内非标增值（免审核）` 的关键区别是：这里的场景必须经过审核，不能因同属库内非标而套用免审核产品的原子和口径。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202412111836315` |
| VASC 产品名称 | 库内非标增值（需审核） |
| PSCG | `OSF632` 库内增值 |
| 启用状态 | active |
| 产品类型 | 非标增值 |
| 提交主体 | 客户 / 客服 |
| 执行主体 | 仓库 |
| 审核部门 | `PD` |
| 是否需要审核 | Y |
| 是否允许审核中修改 | Y |
| 是否需要客户确认 | N |
| 是否支持无业务单据 | 否 |
| 关联 PSC 线索 | `OSF632008274` |
| 来源列表线索 | `STOCK_SHELVES`、`STORAGE`、`DESTRUCTION` |

## 适用判断

选择本产品前，AI 需要确认：

1. 需求发生在库内/在库异常链路。
2. 客户需要的是拆分为多个 SKU 后上架，或退货已上架商品尺重复测。
3. 该需求属于需审核非标产品，而不是免审核库内非标或标准库内轻加工。
4. 两个原子都是候选项，产品级非必选，不能同时默认推荐。
5. 字段证据缺失，不能生成确定字段清单、拆分模板、尺重模板或审核字段。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 拆分为多个 SKU 后上架 | 单品拆分后上架（拆分为多个SKU） | 在库一个单品拆分为多个新 SKU，贴新标签后使用新入库单上架，原商品做 `L007` 盘亏 | 信息流承接新 SKU、新入库单、拆分关系和原商品盘亏 | 取决于审核、拆分和上架结果。 |
| 退货商品尺重复测 | 检查商品尺重（退货商品） | 仓库随机抽取退货已上架商品外包装测量并拍照，实物通常仍回到库内库存 | 信息流记录尺重结果，并根据测量结果更新系统商品尺重 | 可能闭环尺重异议。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 库内非标增值（需审核）` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E08` | 商品包装异常 | `IN_WAREHOUSE` |
| `B05E014` | 单品质量异常 | `IN_WAREHOUSE` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OSF6V1597` | 单品拆分后上架（拆分为多个SKU） | N | 单品拆分后上架（拆分为多个SKU） | missing_field_evidence |
| 2 | `OSF6V1625` | 检查商品尺重（退货商品） | N | 检查商品尺重（退货商品） | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 不应选择的场景 | 证据状态 |
|---|---|---|---|
| 单品拆分后上架（拆分为多个SKU） | 在库一个单品需要拆分为多个新 SKU，贴新标签并使用新入库单上架。 | 拆分为同一个 SKU；多个 SKU 组合为一个 SKU；无需审核的标准拆分。 | normalized 和原子页有证据；字段配置缺失。 |
| 检查商品尺重（退货商品） | 退货已上架商品需要按客户指定 SKU 和复测数量进行尺重复测、拍照并更新系统商品尺重。 | 普通商品尺重、内部配件尺重、包材装箱测试。 | normalized 和原子页有证据；字段配置缺失。 |

## 审核边界

- 本产品 `VASC_REQUIRE_REVIEW = Y`，审核部门为 `PD`，不能绕过审核承诺仓库必然执行。
- `VASC_REQUIRE_CUSTOMER_CONFIRM = N` 只代表产品属性中的客户确认要求，不代表不需要客户提供清晰需求、SKU、拆分关系或复测数量。
- 是否收费、是否产生成本、是否有效等原子级字段在现有原子页中仍有 `conditional` 或 `unknown`，回答时应保留不确定性。

## 证据边界

- 本页不定版字段、附件、SKU 对应关系模板、标签文件格式、尺重字段、照片数量、审核字段、费用金额和国家仓库差异。
- normalized 只关联 `B0102E08` 和 `B05E014` 两个库内异常；不能扩展到所有库内异常。
- 本产品与免审核、特批库内非标产品并列存在，必须按具体原子和审核属性区分。

## 相关链接

- [单品拆分后上架（拆分为多个SKU）](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-multiple-skus.md)
- [检查商品尺重（退货商品）](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-return-product-dimensions-weight-check.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
