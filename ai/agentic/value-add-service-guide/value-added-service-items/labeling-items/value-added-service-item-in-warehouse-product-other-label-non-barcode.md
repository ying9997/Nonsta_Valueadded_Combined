---
title: 库内-商品其他标签（非商品条码）
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
service_item_code: OSF6V1574
service_item_name: 库内-商品其他标签（非商品条码）
service_item_aliases: [增值原子, 增值事件, 库内商品其他标签, 非商品条码标签]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 库内-商品附加标签
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-商品其他标签（非商品条码）

## 摘要

`库内-商品其他标签（非商品条码）` 是库内轻加工 VASC 下的商品级贴标原子，用于客户指定在库商品，要求仓库粘贴非商品条码类标签。

本原子不处理商品条码、SKU 标签或第三方商品条码关联。可覆盖的标签示例包括英代标签、欧代标签、尺寸标签、环保标签、产地标签、使用说明标签等。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1574` |
| 服务项名称 | 库内-商品其他标签（非商品条码） |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031456553` 库内轻加工 |
| VASC 顺序 | 5 |
| 互斥组 | 库内-商品附加标签 |
| 默认 SLA | 2 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库针对客户指定的在库商品粘贴非商品条码标签。标签通常包含商品描述、用途、合规或说明信息，但不作为商品识别条码使用。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库商品需要补贴英代、欧代、尺寸、环保、产地或说明标签 | 是 | 主数据列举了这些非商品条码标签示例。 |
| 商品其他类标签缺失，需要补充非商品条码类标签 | 可考虑 | 增值产品说明将库内商品其他标签用于补贴其他非商品条码类标签。 |
| 需要补贴商品条码或第三方商品条码 | 不应选 | 应查库内补贴原商品条码或库内更换新商品条码。 |
| 入库上架前补贴商品其他标签 | 不应直接选本原子 | 应查入库 `OW01V1573`。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1574` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的标签文件、标签尺寸、贴标位置、是否所有商品同标签或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品 SKU 或在库商品对象 | 定位需贴标商品 | 主数据操作对象为商品。 |
| 标签内容或标签文件 | 贴非商品条码标签 | 主数据说明由卖家指定标签。 |
| 标签类型 | 英代、欧代、尺寸、环保、产地、说明等 | 主数据列举示例。 |
| 贴标位置 | 需要指定位置时 | 业务上必要，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、标签文件格式、标签尺寸枚举、贴标位置字段、费用金额和仓库国家差异。
- 不得用于商品条码、SKU 标签或第三方商品条码关联。
- 不得把入库 `OW01V1573` 的字段证据直接复用到本库内原子。

## 相关链接

- [入库-商品其他标签（非商品条码）](value-added-service-item-inbound-product-other-label-non-barcode.md)
- [库内-补贴原商品条码](value-added-service-item-in-warehouse-original-product-barcode-labeling.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

