---
title: 货权转移（换标模式）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, product-level, relabel, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/nonstandard-vas-application-process.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1646
service_item_name: 货权转移（换标模式）
service_item_aliases: [增值原子, 增值事件, 货权转移, 换标模式]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 货权转移（换标模式）
charge_required: conditional
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# 货权转移（换标模式）

## 摘要

`货权转移（换标模式）` 是库内非标增值（特批）VASC 下的货权转移原子，用于通过换标方式完成指定 SKU 库存的货权转移。normalized 主数据记录了两个场景：指定 SKU 全球库存全部转移且单次转移单品数合计不超过 300 个，或指定 SKU 部分库存转移。

本原子与 `货权转移（改数模式）` 的关键区别是处理模式和数量口径；当指定 SKU 全球库存全部转移且单品数大于 300 个时，应查改数模式。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1646` |
| 服务项名称 | 货权转移（换标模式） |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192250069` 库内非标增值（特批） |
| VASC 顺序 | 4 |
| 互斥组 | 货权转移（换标模式） |
| 是否收费 | conditional，需审核报价后确认 |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 确认待转移货权的 SKU、库存范围和转移目标。 |
| 2 | 按换标模式处理指定 SKU 库存。 |
| 3 | 在特批、报价和客户确认后完成货权转移相关仓库动作。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 指定 SKU 全球库存全部转移，单次转移单品数合计不超过 300 个 | 是 | normalized 主数据明确换标模式场景 1。 |
| 指定 SKU 部分库存转移 | 是 | normalized 主数据明确换标模式场景 2。 |
| 指定 SKU 全球库存全部转移且单品数大于 300 个 | 不应选 | 应查 `货权转移（改数模式）`。 |
| 只是跨仓调拨，不涉及货权转移 | 不应选 | 应查调拨类原子或业务确认。 |
| 客户无法明确转出/转入主体和 SKU 范围 | 不应直接承诺 | 货权转移对象不明确，需补充后特批审核。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1646` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的转出主体、转入主体、SKU 清单、单品数量、标签文件、货权证明或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 转出方和转入方 | 货权转移主体确认 | 业务上必要，但字段未定版。 |
| SKU 清单和库存范围 | 全部转移或部分转移 | normalized 主数据按指定 SKU 判断。 |
| 单品数量 | 判断换标模式或改数模式 | normalized 主数据给出 300 个数量口径。 |
| 标签或换标要求 | 换标模式执行 | 主数据名称为换标模式；字段未定版。 |
| 特批审核和报价确认材料 | 特批非标执行 | 非标流程要求需求清晰、可执行。 |

## 证据边界

- 本页不定版配置字段、货权转移模板、标签文件格式、主体字段、费用金额、税务/合规规则和仓库国家差异。
- `300 个` 口径来自 normalized 描述，仅用于区分换标模式和改数模式，不应扩展成所有货权转移规则。
- 本原子是特批非标增值，实际执行必须经过业务审核、报价和客户确认。

## 相关链接

- [货权转移（改数模式）](value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md)
- [包裹串仓异常调拨](value-added-service-item-inbound-cross-warehouse-package-transfer.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
