---
title: 测量商品内部配件尺重
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
service_item_code: OSF6V1639
service_item_name: 测量商品内部配件尺重
service_item_aliases: [增值原子, 增值事件, 内部配件尺重测量, 配件长宽高重量]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品尺重测量
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 测量商品内部配件尺重

## 摘要

`测量商品内部配件尺重` 是库内非标增值（免审核）VASC 下的商品级测量原子，用于仓库根据客户示例图检查商品内部配件的长宽高和重量，并拍照反馈。

本原子关注商品内部配件，不等同普通商品尺重检查或包裹装箱后尺重测量。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1639` |
| 服务项名称 | 测量商品内部配件尺重 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 9 |
| 互斥组 | 商品尺重测量 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库根据客户提供的示例图，检查商品内部配件的长、宽、高和重量，并拍照反馈。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 需要测量商品内部配件长宽高和重量 | 是 | 主数据流程明确支持。 |
| 需要拍照反馈测量结果 | 是 | 主数据流程明确包含拍照反馈。 |
| 需要测试包材装箱/装袋后的包裹尺重 | 不应选 | 应查柔性打包装箱/装袋测量尺重。 |
| 退货商品整体尺重检查 | 不应直接选 | 应查检查商品尺重（退货商品）。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1639` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的示例图、配件清单、长宽高字段、重量字段、照片字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品或配件对象 | 定位内部配件 | 操作对象为商品。 |
| 示例图 | 指导仓库识别需测量配件 | 主数据要求客户提供示例图。 |
| 需测量的配件范围 | 内部配件尺重 | 业务上必要，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、测量模板、附件格式、照片格式、费用金额和仓库国家差异。
- 不得把内部配件尺重测量扩展为整件商品或包裹尺重测量。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

