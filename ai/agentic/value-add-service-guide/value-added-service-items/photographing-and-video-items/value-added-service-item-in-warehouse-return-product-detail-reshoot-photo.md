---
title: 退货商品补拍细节照
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
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1677
service_item_name: 退货商品补拍细节照
service_item_aliases: [增值原子, 增值事件, 退货商品细节照, 补拍商品细节照片]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品拍照辨识
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 退货商品补拍细节照

## 摘要

`退货商品补拍细节照` 是库内非标增值（免审核）VASC 下的退货商品拍照原子，用于客户要求仓库对退货入库商品补拍商品细节照片。

本原子针对退货入库商品，不等同普通库内商品外观拍照或库内商品开箱拍照。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1677` |
| 服务项名称 | 退货商品补拍细节照 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 8 |
| 互斥组 | 商品拍照辨识 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库针对退货入库商品，按照客户示例图要求开箱补拍商品细节照片。主数据列举的照片包括外箱标签照、内部商品细节图、内部商品标签照等。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 退货入库商品需要补拍细节照片 | 是 | 主数据定义明确支持。 |
| 客户提供示例图，要求按示例补拍 | 是 | 主数据流程要求按照客户示例图。 |
| 普通在库商品外观三面拍照 | 不应选 | 应查库内商品外观拍照。 |
| 普通在库商品开箱拍照 | 不应优先选 | 应查库内商品开箱拍照。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1677` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的示例图、退货单据、商品范围、照片类型或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 退货商品对象 | 定位需补拍商品 | 主数据限定退货入库商品。 |
| 示例图 | 指导仓库补拍 | 主数据要求按照客户示例图。 |
| 需补拍的细节范围 | 外箱标签、内部细节、内部标签等 | 主数据列举这些照片类型。 |

## 证据边界

- 本页不定版配置字段、示例图字段、照片数量、附件格式、费用金额和仓库国家差异。
- 不得把退货商品补拍细节照泛化为所有在库商品拍照。

## 相关链接

- [库内-商品开箱拍照](value-added-service-item-in-warehouse-product-unboxing-photo.md)
- [库内-商品外观拍照](value-added-service-item-in-warehouse-product-appearance-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

