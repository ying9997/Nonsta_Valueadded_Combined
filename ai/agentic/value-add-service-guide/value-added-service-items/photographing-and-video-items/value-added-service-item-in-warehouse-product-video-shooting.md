---
title: 库内商品拍摄视频
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
service_item_code: OSF6V1651
service_item_name: 库内商品拍摄视频
service_item_aliases: [增值原子, 增值事件, 库内拍视频, 商品视频拍摄]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品拍照辨识
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内商品拍摄视频

## 摘要

`库内商品拍摄视频` 是库内非标增值（免审核）VASC 下的商品级视频拍摄原子，用于仓库根据客户提供的操作 SOP 拍摄库内商品相关视频。

主数据列举两个常见场景：提供商品在库视频，或模拟商品出库视频。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1651` |
| 服务项名称 | 库内商品拍摄视频 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 7 |
| 互斥组 | 商品拍照辨识 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 场景 | 仓库动作 |
|---|---|
| 商品在库视频 | 到库位上对商品开箱拍实物，并拍到库位条码、仓库大门、商品实物等。 |
| 模拟商品出库视频 | 客户指定某个 SKU，仓库操作下架拣选并模拟出库。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户需要库内商品视频而不是照片 | 是 | 主数据定义为根据客户 SOP 拍摄库内视频。 |
| 客户需要模拟出库过程 | 可考虑 | 主数据列举模拟商品出库视频。 |
| 客户只需要照片 | 不应选 | 应查库内商品外观拍照、开箱拍照或指定位置拍照。 |
| 客户需要海外仓监控视频调查 | 不应选 | 应查监控视频调查类原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1651` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的操作 SOP、拍摄范围、视频时长、SKU、库位或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 操作 SOP | 所有视频拍摄场景 | 主数据要求客户提供操作 SOP。 |
| 商品 SKU | 定位需拍摄商品 | 主数据示例中客户指定 SKU。 |
| 视频类型 | 在库视频或模拟出库视频 | 主数据列举两类常见场景。 |

## 证据边界

- 本页不定版配置字段、视频时长、视频格式、SOP 模板、费用金额和仓库国家差异。
- 不得把本原子解释为监控视频调取服务。

## 相关链接

- [库内-商品开箱拍照](value-added-service-item-in-warehouse-product-unboxing-photo.md)
- [提供海外仓监控视频-少包裹调查](value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

