---
title: 库内-补贴原商品条码
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
service_item_code: OSF6V1564
service_item_name: 库内-补贴原商品条码
service_item_aliases: [增值原子, 增值事件, 库内补贴原 SKU 标签, 库内补标]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 贴标/换标
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-补贴原商品条码

## 摘要

`库内-补贴原商品条码` 是库内轻加工 VASC 下的商品级补标原子，用于在库商品需要补贴原商品标签的场景。商品标签范围包含商品条码和第三方商品标签，例如 FNSKU 标签。

本原子强调“原商品标签”，不改变目标 SKU；如果客户需要更换为新 SKU 标签，应查 `库内-更换新商品条码`。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1564` |
| 服务项名称 | 库内-补贴原商品条码 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031456553` 库内轻加工 |
| VASC 顺序 | 3 |
| 互斥组 | 贴标/换标 |
| 默认 SLA | 1 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库按客户指定范围补贴原商品标签。主数据支持两类范围：

| 范围 | 说明 |
|---|---|
| 随机拣选单品 | 适用于商品化管理，客户指定商品 SKU 在库所有商品。 |
| 指定单品/批次 | 适用于商品化管理、单品化管理或批次管理商品，客户指定单品、批次或随机拣选商品。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库商品需要补贴原商品标签后继续处理 | 是 | 主数据定义为补贴原商品标签。 |
| 2B 箱内商品条码异常、多单品/少单品，按实物补贴商品条码上架 | 可考虑 | 异常解决方案目录将相关库内异常指向库内轻加工/库内-补贴原商品条码。 |
| 单品条码无法扫描，需要按实物补贴商品条码上架 | 可考虑 | 映射将该类库内异常关联到库内轻加工。 |
| 需要更换为新 SKU 标签 | 不应选 | 应查 `库内-更换新商品条码`。 |
| 入库异常上架前补贴原商品条码 | 不应直接选本原子 | 应查入库 `OW01` 补贴原商品条码原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1564` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的商品选择、批次选择、原标签文件、第三方条码关联或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 原商品 SKU 或在库商品对象 | 定位需补标商品 | 主数据操作对象为商品。 |
| 原商品标签或第三方商品标签信息 | 补贴商品标签 | 主数据说明商品标签可包含商品条码和第三方商品标签。 |
| 拣选范围 | 随机拣选、指定单品或指定批次 | 主数据区分拣选范围。 |

## 证据边界

- 本页不定版配置字段、标签文件格式、第三方条码关联字段、打印规格、费用金额和仓库国家差异。
- 不得把入库 `OW01V1558` 的字段或适用条件直接复用到本库内原子。
- 不得把“补贴原商品条码”解释成“更换新商品条码”。

## 相关链接

- [库内-更换新商品条码](value-added-service-item-in-warehouse-new-product-barcode-labeling.md)
- [入库-补贴原商品条码](value-added-service-item-inbound-original-product-barcode-labeling.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

