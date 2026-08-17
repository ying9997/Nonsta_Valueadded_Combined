---
title: 拍照暂存后上架
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
  - source-references/kb-business-source-snapshots/vas-product-details.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1591
service_item_name: 拍照暂存后上架
service_item_aliases: [增值原子, 增值事件, 拍照后上架, 暂存后上架]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 拍照暂存后上架
charge_required: false
cost_generated: false
effective: true
field_evidence_status: missing
---

# 拍照暂存后上架

## 摘要

`拍照暂存后上架` 是库内轻加工 VASC 下的商品级上架原子，用于客户在库内拍照增值完成后，选择将商品先暂存，并在无需其他增值服务的情况下直接上架。

本原子不是拍照动作本身，而是拍照服务完成后的后续上架动作。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1591` |
| 服务项名称 | 拍照暂存后上架 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031456553` 库内轻加工 |
| VASC 顺序 | 6 |
| 互斥组 | 拍照暂存后上架 |
| 默认 SLA | 0 天 |
| 是否收费 | N |
| 是否产生成本 | 空/未提供 |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

主数据说明：完成库内拍照服务后，仓库会为不同商品贴上唯一辨识码；客户指示上架时，仓库清除贴在商品上的辨识码（非商品条码），然后直接将商品上架。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 库内商品已完成拍照增值，客户确认无需其他增值，要求上架 | 是 | 主数据定义为拍照服务完成后的暂存后上架。 |
| 客户还需要换标、包装、拆分、组合等处理 | 不应直接选 | 本原子前提是无需其他增值服务。 |
| 客户需要仓库先拍照 | 不应选 | 应查库内商品外观拍照、库内商品开箱拍照或其他拍照原子。 |
| 入库异常拍照后继续处理 | 不应直接套用 | 入库异常链路应查 `OW01` 入库拍照/后续上架相关产品。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1591` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的拍照单关联、暂存辨识码、商品选择、上架确认或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 已完成的拍照增值信息 | 关联前置拍照服务 | 主数据说明本原子发生在拍照服务完成后。 |
| 需要上架的商品对象 | 定位暂存商品 | 操作对象为商品。 |
| 确认无需其他增值 | 判断是否可直接上架 | 主数据定义前提是无需其他增值服务。 |

## 证据边界

- 本页不定版配置字段、拍照单关联字段、暂存辨识码字段、上架确认字段或费用金额。
- 不得把本原子当成拍照服务本身。
- 不得用于仍需换标、包装、拆分、组合或其他增值的场景。

## 相关链接

- [库内-更换商品包装](../packaging-items/value-added-service-item-in-warehouse-replace-product-packaging.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

