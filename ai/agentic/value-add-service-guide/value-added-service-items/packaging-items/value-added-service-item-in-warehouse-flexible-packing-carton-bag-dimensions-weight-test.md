---
title: 柔性打包装箱/装袋测量尺重
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, config-field]
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
service_item_code: OSF6V1640
service_item_name: 柔性打包装箱/装袋测量尺重
service_item_aliases: [增值原子, 增值事件, 装箱测尺重, 装袋测尺重, 包材装载测试]
service_item_object_level: package
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品尺重测量
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 柔性打包装箱/装袋测量尺重

## 摘要

`柔性打包装箱/装袋测量尺重` 是库内非标增值（免审核）VASC 下的包装测试和尺重测量原子，用于客户提供包材型号及需要装箱/装袋的 M 码信息后，仓库进行装箱测试，确认包材是否装得下 M 码，并反馈装载后的包裹尺重数据。

本原子关注装箱/装袋后的包裹尺重，不等同测量商品内部配件尺重。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1640` |
| 服务项名称 | 柔性打包装箱/装袋测量尺重 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 包裹/装载后包裹 |
| 所属 VASC | `VASC202411192229072` 库内非标增值（免审核） |
| VASC 顺序 | 10 |
| 互斥组 | 商品尺重测量 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 根据客户包材型号及需要装箱/装袋的 M 码信息，仓库进行装箱测试。 |
| 2 | 反馈装箱后的包裹尺重信息并拍照。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户需要测试 WINIT 标准包材或客制包材能否装下指定 M 码 | 是 | 主数据定义明确支持。 |
| 客户需要装载后包裹尺重数据 | 是 | 主数据流程要求反馈包裹尺重信息。 |
| 客户需要测量商品内部配件尺重 | 不应选 | 应查 `测量商品内部配件尺重`。 |
| 客户只是更换商品包装 | 不应直接选 | 应查包装处理类原子。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1640` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的包材型号、M 码、装箱/装袋方式、尺重字段、照片字段或附件模板，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 包材型号 | 标准包材或客制包材测试 | 主数据要求客户提供。 |
| 需要装箱/装袋的 M 码信息 | 装载测试 | 主数据要求客户提供。 |
| 期望装载方式 | 装箱或装袋 | 主数据同时覆盖装箱/装袋。 |

## 证据边界

- 本页不定版配置字段、包材型号枚举、M 码字段、尺重字段、照片格式、费用金额和仓库国家差异。
- 测试结果只说明包材装载可行性和装载后尺重，不等同正式批量打包方案。

## 相关链接

- [测量商品内部配件尺重](../product-processing-items/value-added-service-item-in-warehouse-measure-internal-accessory-dimensions-weight.md)
- [库内-更换商品包装](value-added-service-item-in-warehouse-replace-product-packaging.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)

