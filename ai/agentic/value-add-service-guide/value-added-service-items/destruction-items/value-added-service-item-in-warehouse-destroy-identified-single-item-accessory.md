---
title: 辨识单品配件后销毁
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
service_item_code: OSF6V1649
service_item_name: 辨识单品配件后销毁
service_item_aliases: [增值原子, 增值事件, 配件辨识后销毁, 单品配件销毁]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品拍照辨识
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 辨识单品配件后销毁

## 摘要

`辨识单品配件后销毁` 是库内非标增值（免审核）VASC 下的商品级配件处理原子，用于仓库先辨识单品配件，再将辨识出来的配件销毁。

本原子只销毁辨识出来的配件，不等同整件商品销毁或异常商品销毁。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1649` |
| 服务项名称 | 辨识单品配件后销毁 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 5 |
| 互斥组 | 商品拍照辨识 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库辨识单品配件，并将辨识出来的配件销毁。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 需要辨识单品配件并销毁 | 是 | 主数据定义和流程均支持。 |
| 需要辨识配件后更换 | 不应选 | 应查 `辨识单品配件后更换`。 |
| 需要销毁整件商品 | 不应直接选 | 应查库内异常商品销毁或 DG 商品销毁等销毁原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1649` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的配件清单、销毁确认、商品选择或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品或单品对象 | 定位需处理商品 | 操作对象为商品。 |
| 配件辨识方法 | 确认需销毁配件 | 主数据要求先辨识。 |
| 销毁范围 | 仅销毁辨识出的配件 | 主数据流程指向配件销毁。 |

## 证据边界

- 本页不定版配置字段、销毁模板、配件清单格式、附件字段、费用金额和仓库国家差异。
- 不得把配件销毁扩展为整件商品销毁。

## 相关链接

- [辨识单品配件后更换](../product-processing-items/value-added-service-item-in-warehouse-replace-identified-single-item-accessory.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

