---
title: 库内-异常商品销毁
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, product-level, destroy, config-field]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1704
service_item_name: 库内-异常商品销毁
service_item_aliases: [增值原子, 增值事件, 库内销毁, 异常商品销毁]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 库内-异常商品销毁
charge_required: unknown
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# 库内-异常商品销毁

## 摘要

`库内-异常商品销毁` 是库内销毁 VASC 下的商品销毁原子，用于针对库内异常商品，将货物销毁。normalized 主数据特别注明：此销毁服务无法提供销毁证明。

本原子与上架前商品销毁不同：上架前商品销毁面向入库异常、已卸货未上架或异常暂存阶段；本页面向库内异常商品销毁。若客户要求 DG 商品销毁或销毁证明，应查 `DG商品销毁` 或业务确认，不能用本原子承诺证明。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1704` |
| 服务项名称 | 库内-异常商品销毁 |
| PSCG | `OSF6` 库内 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202504171850278` 库内销毁 |
| VASC 顺序 | 1 |
| 互斥组 | 库内-异常商品销毁 |
| 是否收费 | unknown |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 确认库内异常商品范围。 |
| 2 | 对指定异常商品执行销毁。 |
| 3 | 反馈销毁处理结果。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 库内异常商品需要销毁 | 是 | normalized 主数据明确“针对库内异常商品”提供销毁服务。 |
| 客户接受无法提供销毁证明 | 是 | normalized 主数据注明无法提供销毁证明。 |
| 入库上架前商品异常需要销毁 | 不应直接套用 | 应查上架前商品销毁或上架前包裹销毁。 |
| DG 商品销毁或客户要求销毁证明 | 不应选 | 应查 `DG商品销毁` 或业务确认。 |
| 只销毁单品内部配件 | 不应选 | 应查辨识单品配件后销毁。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1704` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的商品范围、销毁确认、异常单关联、附件或结果反馈字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 库内异常商品对象 | 定位待销毁商品 | 主数据操作对象为商品。 |
| 销毁意图确认 | 所有销毁场景 | 业务上必要，但字段未定版。 |
| 是否需要销毁证明 | 判断是否适用本原子 | 主数据明确本服务无法提供销毁证明。 |
| 特殊品类或 DG 信息 | 特殊销毁需求 | 需业务确认，字段未定版。 |

## 证据边界

- 本页不定版配置字段、附件格式、销毁证明、费用金额、特殊品类处理和仓库国家差异。
- 本原子明确无法提供销毁证明；不能为了满足客户证明诉求而套用本原子。
- “商品销毁”和“包裹销毁”“配件销毁”不能混用。

## 相关链接

- [DG商品销毁](value-added-service-item-in-warehouse-dg-product-destruction.md)
- [上架前商品销毁](value-added-service-item-pre-putaway-product-destruction.md)
- [辨识单品配件后销毁](value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
