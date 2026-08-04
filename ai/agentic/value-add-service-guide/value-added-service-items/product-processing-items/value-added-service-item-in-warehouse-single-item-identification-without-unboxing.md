---
title: 单品辨识（不开箱）
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
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1627
service_item_name: 单品辨识（不开箱）
service_item_aliases: [增值原子, 增值事件, 不开箱辨识, 单品辨识]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品拍照辨识
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 单品辨识（不开箱）

## 摘要

`单品辨识（不开箱）` 是库内非标增值（免审核）VASC 下的商品级辨识原子，用于仓库在不拆单品外包装的情况下，按客户提供的辨识方法确认单品数量、标签内容（含第三方商品标签）等差异并反馈。

本原子不是开箱拍照；如需拆开包装拍照，应查开箱拍照类原子。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1627` |
| 服务项名称 | 单品辨识（不开箱） |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 6 |
| 互斥组 | 商品拍照辨识 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库根据客户提供的辨识方法，在不拆单品外包装的情况下，辨识单品数量、标签内容（含第三方商品标签）等差异，并反馈结果。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 需要在不拆外包装的情况下辨识数量或标签内容 | 是 | 主数据定义明确支持。 |
| 需要核对第三方商品标签内容 | 可考虑 | 主数据明确包含第三方商品标签。 |
| 需要开箱查看内部商品或细节 | 不应选 | 应查开箱拍照或指定位置开箱拍照。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1627` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的辨识方法、商品范围、标签字段、数量字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品 SKU 或单品对象 | 定位辨识对象 | 操作对象为商品。 |
| 辨识方法 | 本原子的核心输入 | 主数据要求客户提供辨识方法。 |
| 需要辨识的差异类型 | 数量、标签内容、第三方标签等 | 主数据列举这些对象。 |

## 证据边界

- 本页不定版配置字段、辨识模板、附件格式、照片要求、费用金额和仓库国家差异。
- 不得承诺拆开单品外包装。

## 相关链接

- [单品指定位置开箱拍照](../photographing-and-video-items/value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

