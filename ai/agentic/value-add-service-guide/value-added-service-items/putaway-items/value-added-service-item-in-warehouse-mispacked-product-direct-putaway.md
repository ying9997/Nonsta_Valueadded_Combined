---
title: 错装商品直接上架
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
confidence: low
fidelity: summary
status: draft
service_item_code: OSF6V1681
service_item_name: 错装商品直接上架
service_item_aliases: [增值原子, 增值事件, 错装直接上架]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 贴标/换标
charge_required: false
cost_generated: false
effective: true
field_evidence_status: missing
---

# 错装商品直接上架

## 摘要

`错装商品直接上架` 是库内轻加工 VASC 下的商品级直接上架原子，用于包裹内商品错装等库内异常中，客户确认需要根据实物上的商品条码信息直接上架的场景。

当前该原子的主数据定义和流程字段为空，只有编排映射、异常解决方案目录和主数据基础属性能支撑上述边界。因此本页置信度为 `low`，AI 回答时必须提示当前知识库证据较薄。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1681` |
| 服务项名称 | 错装商品直接上架 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031456553` 库内轻加工 |
| VASC 顺序 | 4 |
| 互斥组 | 贴标/换标 |
| 默认 SLA | 0 天 |
| 是否收费 | N |
| 是否产生成本 | 空/未提供 |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

当前主数据没有提供明确动作描述。结合异常解决方案目录，本原子可理解为：针对库内错装商品，客户确认按实物上的商品条码信息直接上架，仓库据此完成上架处理。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 包裹内商品错装，客户需要用实物上的商品条码上架 | 是 | 异常解决方案目录将该处理方向指向库内轻加工/错装商品直接上架。 |
| 包裹内商品错装，但客户要求更换掉实物条码后上架 | 不应选 | 应查 `库内-更换新商品条码`。 |
| 入库异常中的直接上架 | 不应直接选本原子 | 应查入库 `OW01V1708` 直接上架。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1681` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的商品选择、良品/不良品、实物条码确认、上架目标或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常商品对象 | 定位错装商品 | 操作对象为商品。 |
| 是否确认按实物条码直接上架 | 本原子的核心判断 | 异常解决方案目录支持该方向。 |
| 实物条码信息 | 需要按实物条码上架 | 业务上必要，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、上架目标字段、附件模板、费用金额和良品/不良品规则。
- 主数据未提供 `eventDefine` 和 `processFlow`，因此不得扩展复杂流程。
- 不得把本原子和入库 `直接上架` 混用。

## 相关链接

- [直接上架](value-added-service-item-direct-putaway.md)
- [库内-更换新商品条码](../labeling-items/value-added-service-item-in-warehouse-new-product-barcode-labeling.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

