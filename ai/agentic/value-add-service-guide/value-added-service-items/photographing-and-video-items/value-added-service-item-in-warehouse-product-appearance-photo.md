---
title: 库内-商品外观拍照
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
service_item_code: OSF6V1569
service_item_name: 库内-商品外观拍照
service_item_aliases: [增值原子, 增值事件, 库内外观拍照, 商品外观照片]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 拍照
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-商品外观拍照

## 摘要

`库内-商品外观拍照` 是库内商品拍照 VASC 下的商品级拍照原子，用于客户指定 SKU 后，仓库在不拆开销售包装/物流包装的情况下拍摄商品外观照片。

本原子强调“不拆包装”。若客户需要拆开外包装或销售包装拍照，应查 `库内-商品开箱拍照`。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1569` |
| 服务项名称 | 库内-商品外观拍照 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031511413` 库内商品拍照 |
| VASC 顺序 | 1 |
| 互斥组 | 拍照 |
| 默认 SLA | 0 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库按客户指定 SKU 拍摄每组单品三张照片：正面、侧面、背面。拍照时不拆开销售包装或物流包装，拍照后按照原 SKU 上架。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库商品疑似信息流和实物流不一致，需要拍外观核验 | 是 | 业务快照说明库内商品外观拍照主要用于在库商品实物照片校验。 |
| 客户只需要外观三面照片，不需要拆包装 | 是 | 主数据明确不拆销售包装/物流包装。 |
| 需要商品条码、实物细节或拆包后照片 | 不应选 | 应查 `库内-商品开箱拍照`。 |
| 入库异常上架前拍照 | 不应直接选本原子 | 应查入库拍照原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1569` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的 SKU、数量、照片角度、拍照要求或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品 SKU | 指定拍照对象 | 主数据要求客户指定 SKU。 |
| 拍照数量或商品范围 | 多件商品拍照 | 业务上必要，但字段未定版。 |
| 关注的外观问题 | 信息流/实物流核验 | 业务上用于执行，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、附件格式、照片交付格式、费用金额和仓库国家差异。
- 不得承诺会拆开销售包装或物流包装。
- 拍照后按原 SKU 上架，不代表完成换标、包装或其他处理。

## 相关链接

- [入库-商品开箱拍照](value-added-service-item-inbound-product-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

