---
title: 库内-清除商品标签
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
service_item_code: OSF6V1643
service_item_name: 库内-清除商品标签
service_item_aliases: [增值原子, 增值事件, 清除商品标签, 库内清除标签]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 标签类
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-清除商品标签

## 摘要

`库内-清除商品标签` 是库内非标增值（免审核）VASC 下的商品级标签处理原子，用于客户要求仓库按示例图片清除指定商品标签的场景。

本原子只沉淀“清除指定标签”的动作，不等同补贴商品条码、更换新商品条码或补贴其他标签。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1643` |
| 服务项名称 | 库内-清除商品标签 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 1 |
| 互斥组 | 标签类 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库根据客户提供的示例图片，清除指定商品标签。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库商品需要清除指定标签 | 是 | 主数据流程为根据客户示例图片清除指定标签。 |
| 需要补贴新标签或更换条码 | 不应选 | 应查补贴原商品条码、更换新商品条码或商品其他标签原子。 |
| 入库包裹标签覆盖/清除 | 不应直接选 | 本原子是库内商品级标签清除，不是入库包裹标签处理。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1643` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的示例图片、标签位置、清除方式、商品选择或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品 SKU 或在库商品对象 | 定位需处理商品 | 操作对象为商品。 |
| 需要清除的标签示例图片 | 标识清除对象 | 主数据流程明确需要客户示例图片。 |
| 标签位置说明 | 标签不易识别时 | 业务上有帮助，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、图片格式、标签位置字段、清除工具、费用金额和仓库国家差异。
- 不得推断支持所有材质标签清除；需要以仓库可操作性为准。

## 相关链接

- [库内-商品其他标签（非商品条码）](value-added-service-item-in-warehouse-product-other-label-non-barcode.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

