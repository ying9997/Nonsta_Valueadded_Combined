---
title: 单品拆分后上架（拆分为一个SKU）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, config-field]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/nonstandard-vas-application-process.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1596
service_item_name: 单品拆分后上架（拆分为一个SKU）
service_item_aliases: [增值原子, 增值事件, 单品拆分后上架, 拆分为一个SKU]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品组合/拆分
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 单品拆分后上架（拆分为一个SKU）

## 摘要

`单品拆分后上架（拆分为一个SKU）` 是库内非标增值（免审核）VASC 下的商品拆分上架原子，用于将单一产品拆分成同一个 SKU，并贴标后上架。

本原子与 `库内-商品拆分` 不同：本页强调拆分后仍为同一个 SKU，并使用新入库单上架；标准库内商品拆分主数据强调拆分为多个 SKU。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1596` |
| 服务项名称 | 单品拆分后上架（拆分为一个SKU） |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 2 |
| 互斥组 | 商品组合/拆分 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 拆分单品，拆分为同 1 个 SKU。 |
| 2 | 使用新入库单上架。 |
| 3 | 原商品做 `L007` 盘亏。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库单一产品需要拆分为同一个 SKU 并上架 | 是 | 主数据定义和流程均支持。 |
| 拆分后需要使用新入库单上架 | 是 | 主数据流程明确使用新入库单上架。 |
| 拆分为多个 SKU | 不应选 | 应查 `单品拆分后上架（拆分为多个SKU）` 或标准 `库内-商品拆分`。 |
| 多个 SKU 组合为一个 SKU | 不应选 | 应查商品组合原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1596` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的原商品、新入库单、拆分数量、标签文件、L007 字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 原商品 SKU 或在库商品对象 | 定位待拆分商品 | 操作对象为商品。 |
| 拆分后 SKU | 拆分为同 1 个 SKU | 主数据定义支持。 |
| 新入库单信息 | 拆分后上架 | 主数据流程要求使用新入库单上架。 |
| 拆分数量和贴标要求 | 执行拆分上架 | 业务上必要，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、拆分模板、新入库单字段、标签文件格式、L007 字段和费用金额。
- 不得把“拆分为一个 SKU”和“拆分为多个 SKU”混用。

## 相关链接

- [库内-商品拆分](value-added-service-item-in-warehouse-product-splitting.md)
- [库内-商品组合](value-added-service-item-in-warehouse-product-combination.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

