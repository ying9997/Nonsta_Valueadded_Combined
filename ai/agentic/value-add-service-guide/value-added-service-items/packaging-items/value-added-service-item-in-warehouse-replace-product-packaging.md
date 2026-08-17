---
title: 库内-更换商品包装
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
service_item_code: OSF6V1566
service_item_name: 库内-更换商品包装
service_item_aliases: [增值原子, 增值事件, 库内更换包装, 库内包装处理]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 库内-更换商品包装
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 库内-更换商品包装

## 摘要

`库内-更换商品包装` 是库内轻加工 VASC 下的商品级包装处理原子，用于在库商品增加、更换或加固商品包装。

本原子属于 `OSF632` 库内增值，不是 `OW01` 入库上架链路里的 `入库-更换商品包装`。AI 推荐时必须先确认货物当前已进入库内/在库异常链路，而不是仍处于入库异常待上架链路。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1566` |
| 服务项名称 | 库内-更换商品包装 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202407031456553` 库内轻加工 |
| VASC 顺序 | 1 |
| 默认 SLA | 0 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库对在库商品执行增加包装、更换包装或加固包装。主数据特别提示：当更换包材尺寸与原商品尺寸不一致时，需要注册新 SKU，并使用新 SKU 上架。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 在库商品包装异常、破损、受潮、未封口等，需要更换或加固包装 | 是 | 异常解决方案目录将商品包装异常、单品外包装破损、单品质量异常等库内异常指向库内轻加工/更换商品包装。 |
| DG 商品包装不符合标准，需要重新更换 DG 包装 | 可考虑 | 映射将 `B06E1628` 关联到库内轻加工。 |
| 更换后包材尺寸与原商品尺寸不一致 | 可考虑但需额外前置 | 主数据提示需注册新 SKU 并使用新 SKU 上架。 |
| 入库异常上架前更换包装 | 不应直接选本原子 | 应查 `入库-更换商品包装`，本页是库内增值。 |
| 箱/套产品包装处理 | 需谨慎核实 | 业务快照对箱/套等特殊库存形态有额外限制，不能直接套用普通单品包装逻辑。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1566` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的包装类型、包材规格、加固方式、SKU 注册或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 商品 SKU 或商品对象 | 定位在库商品 | 主数据操作对象为商品。 |
| 包装处理方式 | 增加、更换或加固包装 | 主数据定义支持这些动作。 |
| 包材或包装规格要求 | 需要指定包材时 | 业务上必要，但当前无字段级证据。 |
| 新 SKU 信息 | 更换包材尺寸与原商品尺寸不一致 | 主数据提示需注册新 SKU。 |

## 证据边界

- 本页不定版配置字段、包材类型枚举、附件模板、费用金额和仓库国家差异。
- 不得把入库 `OW01V1561` 的字段或规则直接复用到本库内原子。
- 若客户需求涉及客制包材、箱/套产品或尺寸变化，应提示核当前系统和商品注册要求。

## 相关链接

- [入库-更换商品包装](../packaging-items/value-added-service-item-inbound-replace-product-packaging.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

