---
title: 库内-商品开箱拍照
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
  - source-references/kb-business-source-snapshots/vas-monitoring.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1570
service_item_name: 库内-商品开箱拍照
service_item_aliases: [增值原子, 增值事件, 库内开箱拍照, 商品开箱照片]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 拍照
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-商品开箱拍照

## 摘要

`库内-商品开箱拍照` 是库内商品拍照 VASC 下的商品级开箱拍照原子，用于客户指定商品 SKU 及数量后，仓库拆开外包装及销售包装并拍摄商品相关照片。

本原子与 `库内-商品外观拍照` 的核心区别是是否拆包装：本原子会拆外包装和销售包装；外观拍照不拆。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1570` |
| 服务项名称 | 库内-商品开箱拍照 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031511413` 库内商品拍照 |
| VASC 顺序 | 2 |
| 互斥组 | 拍照 |
| 默认 SLA | 0 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库按客户指定商品 SKU 及数量拆开外包装和销售包装，并提供以下照片：

| 阶段 | 照片 |
|---|---|
| 拆包前 | 外箱条码 1 张 |
| 拆包后 | 商品条码照片 1 张，商品实物照 3~4 张 |

商品实物照包括商品全览图、商品细节图等。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库商品疑似信息流和实物流不一致，需要拆包拍照核验 | 是 | 业务快照说明库内商品开箱拍照主要用于在库商品实物照片校验。 |
| 客户需要商品条码、商品全览和细节照片 | 是 | 主数据列明照片类型。 |
| 商品有塑封薄膜覆盖、亚克力板等拆后无法复原销售包装 | 不应继续操作 | 主数据明确仓库无法继续操作。 |
| 只需要外观三面照片且不拆包装 | 不应选 | 应查 `库内-商品外观拍照`。 |
| 入库异常上架前开箱拍照 | 不应直接选本原子 | 应查入库 `OW01` 拍照原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1570` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的 SKU、数量、拆包确认、照片数量、包装不可复原判断或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品 SKU | 指定拍照对象 | 主数据要求客户指定商品 SKU。 |
| 数量 | 指定拍照范围 | 主数据要求指定 SKU 及数量。 |
| 是否允许拆开外包装/销售包装 | 开箱拍照 | 主数据动作需要拆包装。 |
| 关注的商品细节 | 需要特定细节照片时 | 业务上用于执行，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、附件格式、照片交付格式、费用金额和仓库国家差异。
- 不得对塑封薄膜、亚克力板等拆后无法复原包装承诺继续操作。
- 拍照输出不能替代后续换标、包装、销毁、自提或上架决策。

## 相关链接

- [库内-商品外观拍照](value-added-service-item-in-warehouse-product-appearance-photo.md)
- [入库-商品开箱拍照](value-added-service-item-inbound-product-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

