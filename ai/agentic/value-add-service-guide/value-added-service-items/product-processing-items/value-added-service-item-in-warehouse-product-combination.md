---
title: 库内-商品组合
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
service_item_code: OSF6V1804
service_item_name: 库内-商品组合
service_item_aliases: [增值原子, 增值事件, 商品组合, 在库商品组合]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: ""
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-商品组合

## 摘要

`库内-商品组合` 是库内轻加工 VASC 下的商品级处理原子，用于将在库多个 SKU 组合为 1 个 SKU，并按新 SKU 重新上架售卖。

主数据提示：该服务仅支持单一产品库存；箱/套产品库存进行商品组合时，需要同步提交套装/箱产品转单一产品分类库存调整单。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1804` |
| 服务项名称 | 库内-商品组合 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031456553` 库内轻加工 |
| VASC 顺序 | 8 |
| 默认 SLA | 0 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 按客户组合要求组合成品。 |
| 2 | 组合后使用新 SKU 上架。 |
| 3 | 原商品做 `L007` 盘亏。 |

> 当前主数据的 `processFlow` 文本中出现“拆分为多个SKU”的表述，但 `eventDefine` 明确为多个 SKU 组合为 1 个 SKU。AI 回答时应以服务项名称和定义为主，将流程理解为组合后使用新 SKU 上架。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库多个 SKU 需要组合成 1 个 SKU 后重新上架售卖 | 是 | 主数据定义明确支持。 |
| 单一产品库存的组合 | 是 | 主数据提示仅支持单一产品库存。 |
| 箱/套产品库存需要组合 | 需额外处理 | 主数据要求同步提交套装/箱产品转单一产品分类库存调整单。 |
| 一个单品拆分为多个 SKU | 不应选 | 应查 `库内-商品拆分`。 |
| 非标按客户摆放要求装箱组合 | 需核非标组合流程 | 业务快照中另有非标商品组合流程，不能直接套用本标准原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1804` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的原 SKU 组合关系、新 SKU、组合数量、库存调整单、L007 字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 原 SKU 组合关系 | 多个 SKU 组合为 1 个 SKU | 主数据定义支持该关系。 |
| 新 SKU | 组合后重新上架 | 主数据要求按新 SKU 上架。 |
| 库存形态 | 单一产品库存、箱/套产品库存 | 主数据限制单一产品库存，箱/套产品需同步库存调整单。 |
| 组合数量和规则 | 组合执行 | 业务上必要，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、组合模板、新 SKU 字段、库存调整单字段、L007 字段、费用金额和仓库国家差异。
- 不得把“组合”和“拆分”混用。
- 箱/套产品库存的组合必须提示存在额外库存调整单要求。

## 相关链接

- [库内-商品拆分](value-added-service-item-in-warehouse-product-splitting.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

