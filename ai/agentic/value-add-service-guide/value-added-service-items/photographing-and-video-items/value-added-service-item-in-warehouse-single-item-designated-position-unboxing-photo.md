---
title: 单品指定位置开箱拍照
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
service_item_code: OSF6V1595
service_item_name: 单品指定位置开箱拍照
service_item_aliases: [增值原子, 增值事件, 库内指定位置拍照, 单品开箱拍照]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品拍照辨识
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 单品指定位置开箱拍照

## 摘要

`单品指定位置开箱拍照` 是库内非标增值（免审核）VASC 下的商品级拍照原子，用于拣选指定单品或商品，开箱后按客户指定位置拍照并反馈辨识结果。

本原子属于库内 `OSF632` 场景，不是入库 `OW01V1610`。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1595` |
| 服务项名称 | 单品指定位置开箱拍照 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 3 |
| 互斥组 | 商品拍照辨识 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库拣选客户指定的单品或商品，开箱后根据客户指定位置辨识拍照，并反馈结果。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库单品需要开箱后拍指定位置 | 是 | 主数据定义为拣选指定单品或商品，开箱后指定位置拍照。 |
| 客户只需要普通库内开箱拍照 | 不应优先选 | 应查 `库内-商品开箱拍照`。 |
| 不拆外包装进行辨识 | 不应选 | 应查 `单品辨识（不开箱）`。 |
| 入库异常指定位置拍照 | 不应直接选本原子 | 应查入库 `OW01V1610`。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1595` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的商品选择、指定位置、照片数量、示例图或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 指定单品或商品 | 定位拍照对象 | 主数据要求拣选指定单品或商品。 |
| 指定拍照位置 | 本原子的核心输入 | 主数据明确按客户指定位置拍照。 |
| 辨识目的 | 需要仓库反馈结果 | 主数据流程为辨识拍照并反馈。 |

## 证据边界

- 本页不定版配置字段、照片数量、示例图字段、附件格式、费用金额和仓库国家差异。
- 不得把库内指定位置拍照和入库指定位置拍照混用。

## 相关链接

- [库内-商品开箱拍照](value-added-service-item-in-warehouse-product-unboxing-photo.md)
- [入库-单品指定位置开箱拍照](value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

