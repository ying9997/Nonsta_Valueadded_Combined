---
title: 库内-商品拆分
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, product-level, config-field]
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
service_item_code: OSF6V1576
service_item_name: 库内-商品拆分
service_item_aliases: [增值原子, 增值事件, 商品拆分, 在库商品拆分]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: ""
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-商品拆分

## 摘要

`库内-商品拆分` 是库内轻加工 VASC 下的商品级处理原子，用于将在库一个单品拆分后贴新 SKU 标签，并按拆分后的新 SKU 重新上架。

主数据流程明确包含三步：拆分单品为多个 SKU、拆分后使用新 SKU 上架、原商品做 `L007` 盘亏。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1576` |
| 服务项名称 | 库内-商品拆分 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031456553` 库内轻加工 |
| VASC 顺序 | 7 |
| 默认 SLA | 0 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 拆分单品，拆分为多个 SKU。 |
| 2 | 拆分后使用新 SKU 上架。 |
| 3 | 原商品做 `L007` 盘亏。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库单品需要拆分为多个 SKU 后重新上架 | 是 | 主数据定义和流程均支持。 |
| 拆分后需要贴新 SKU 标签 | 是 | 主数据定义包含贴新 SKU 标签。 |
| 多个 SKU 组合成一个 SKU | 不应选 | 应查 `库内-商品组合`。 |
| 非标准商品拆分为一个 SKU 或多个 SKU 的特殊流程 | 需核其他非标原子 | normalized 中另有非标拆分后上架原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1576` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的原 SKU、新 SKU、拆分数量、标签文件、盘亏字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 原商品 SKU 或在库商品对象 | 定位待拆分商品 | 主数据操作对象为商品。 |
| 拆分后的新 SKU | 拆分后上架 | 主数据要求使用新 SKU 上架。 |
| 拆分关系和数量 | 拆分为多个 SKU | 主数据流程支持拆分为多个 SKU，但字段未定版。 |
| 新 SKU 标签 | 拆分后贴标 | 主数据定义包含贴新 SKU 标签。 |

## 证据边界

- 本页不定版配置字段、拆分模板、标签文件格式、L007 系统字段、费用金额和仓库国家差异。
- 不得把“拆分”和“组合”混用。
- 涉及非标拆分后上架时，应查对应非标原子，不直接套用本标准库内轻加工原子。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

