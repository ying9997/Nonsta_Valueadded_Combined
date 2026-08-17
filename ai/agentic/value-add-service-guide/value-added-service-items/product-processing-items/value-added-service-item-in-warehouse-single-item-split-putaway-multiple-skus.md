---
title: 单品拆分后上架（拆分为多个SKU）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, product-level, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/nonstandard-vas-application-process.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1597
service_item_name: 单品拆分后上架（拆分为多个SKU）
service_item_aliases: [增值原子, 增值事件, 单品拆分后上架, 拆分为多个SKU, 指定商品拆分]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 单品拆分后上架（拆分为多个SKU）
charge_required: conditional
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# 单品拆分后上架（拆分为多个SKU）

## 摘要

`单品拆分后上架（拆分为多个SKU）` 是库内非标增值（需审核）VASC 下的商品拆分上架原子，用于将在库一个单品拆分后贴新的标签，并以拆分后的新 SKU 重新上架。

本原子与 `单品拆分后上架（拆分为一个SKU）` 的关键区别是拆分结果：本页是拆分为多个 SKU，且所属 VASC 为需审核非标增值。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1597` |
| 服务项名称 | 单品拆分后上架（拆分为多个SKU） |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202412111836315` 库内非标增值（需审核） |
| VASC 顺序 | 1 |
| 互斥组 | 单品拆分后上架（拆分为多个SKU） |
| 是否收费 | conditional，需审核报价后确认 |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 定位客户指定的在库单品。 |
| 2 | 将该单品拆分为多个新 SKU。 |
| 3 | 对拆分后的 SKU 贴新标签。 |
| 4 | 将拆分后的 SKU 重新上架。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库一个单品需要拆分为多个新 SKU 并上架 | 是 | normalized 主数据明确“在库一个单品进行拆分后贴新的标签，拆分后的 SKU 为新 SKU 后重新上架”。 |
| 客户下错入库单、需要按指定商品拆分 | 可考虑 | 业务快照将“指定商品拆分”列为库内非标历史审批场景。 |
| 拆分后仍是同一个 SKU | 不应选 | 应查 `单品拆分后上架（拆分为一个SKU）`。 |
| 只是把多个 SKU 组合成一个 SKU | 不应选 | 应查商品组合原子。 |
| 无需审核的标准拆分需求 | 不应直接套用 | 本原子所属 VASC 为库内非标增值（需审核）。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1597` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的原单品、新 SKU 对应关系、拆分数量、标签文件、上架字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 待拆分商品或单品对象 | 定位在库货物 | 主数据操作对象为商品。 |
| 拆分后的多个 SKU 对应关系 | 执行拆分和贴新标签 | 主数据明确拆分后的 SKU 为新 SKU。 |
| 拆分数量和上架要求 | 拆分后重新上架 | 业务上必要，但字段未定版。 |
| 标签或条码要求 | 拆分后贴新标签 | 主数据明确需要贴新的标签。 |
| 非标审核与报价确认所需说明 | 需审核非标增值 | 非标流程要求需求清晰、可执行，并经过审核报价。 |

## 证据边界

- 本页不定版配置字段、拆分模板、SKU 对应关系模板、标签文件格式、费用金额和仓库国家差异。
- 本页不能替代非标审核；是否可执行以审核、报价和仓库能力确认为准。
- 不得把“拆分为多个 SKU”和“拆分为一个 SKU”混用。

## 相关链接

- [单品拆分后上架（拆分为一个SKU）](value-added-service-item-in-warehouse-single-item-split-putaway-one-sku.md)
- [库内-商品拆分](value-added-service-item-in-warehouse-product-splitting.md)
- [库内-商品组合](value-added-service-item-in-warehouse-product-combination.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
