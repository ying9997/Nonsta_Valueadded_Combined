---
title: 指定商品盘点
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
service_item_code: OSF6V1626
service_item_name: 指定商品盘点
service_item_aliases: [增值原子, 增值事件, SKU盘点, 指定商品清点]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 盘点
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 指定商品盘点

## 摘要

`指定商品盘点` 是库内非标增值（免审核）VASC 下的商品级盘点原子，用于将在库商品按 SKU 进行清点数量，并根据实际盘点结果调整系统库存。

本原子是库存数量核实和调整动作，不是拍照、换标或包装处理。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1626` |
| 服务项名称 | 指定商品盘点 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 11 |
| 互斥组 | 盘点 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 将在库商品按 SKU 进行清点数量。 |
| 2 | 根据盘点结果调整系统库存。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户需要核实指定 SKU 的在库数量 | 是 | 主数据定义为按 SKU 清点数量。 |
| 盘点后需要调整系统库存 | 是 | 主数据流程明确根据盘点结果调整系统库存。 |
| 只需要拍照确认商品状态 | 不应选 | 应查拍照类原子。 |
| A 包上架数量与验货数量一致但客户仍要查少单品视频 | 不应选视频调查，应考虑盘点 | 少单品调查原子明确该场景不提供视频，需提交库内盘点增值。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1626` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的 SKU、仓库范围、盘点数量、库存调整字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 需要盘点的 SKU | 定位盘点对象 | 主数据要求按 SKU 盘点。 |
| 盘点范围 | 指定商品范围或库内范围 | 业务上必要，但字段未定版。 |
| 盘点目的 | 库存差异、少单品核实等 | 业务上用于判断，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、盘点模板、库存调整字段、费用金额和仓库国家差异。
- 盘点后库存调整以实际系统能力和审核规则为准。

## 相关链接

- [提供海外仓监控视频-少单品调查](../photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

