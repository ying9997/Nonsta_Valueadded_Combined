---
title: 货权转移（改数模式）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, product-level, config-field]
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
service_item_code: OSF6V1647
service_item_name: 货权转移（改数模式）
service_item_aliases: [增值原子, 增值事件, 货权转移, 改数模式]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 货权转移（改数模式）
charge_required: conditional
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# 货权转移（改数模式）

## 摘要

`货权转移（改数模式）` 是库内非标增值（特批）VASC 下的货权转移原子，用于指定 SKU 全球库存全部转移且单次转移单品数大于 300 个的场景。

本原子与 `货权转移（换标模式）` 的核心区别是数量口径和处理模式：normalized 数据只明确改数模式适用于指定 SKU 全球库存全部转移且单品数大于 300 个。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1647` |
| 服务项名称 | 货权转移（改数模式） |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192250069` 库内非标增值（特批） |
| VASC 顺序 | 5 |
| 互斥组 | 货权转移（改数模式） |
| 是否收费 | conditional，需审核报价后确认 |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 确认指定 SKU 全球库存全部转移需求。 |
| 2 | 核实本次转移单品数是否大于 300 个。 |
| 3 | 按改数模式处理货权转移相关信息流和库存范围。 |
| 4 | 经特批、报价和客户确认后完成后续执行与反馈。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 指定 SKU 全球库存全部转移，单次转移单品数大于 300 个 | 是 | normalized 主数据明确改数模式场景。 |
| 指定 SKU 全球库存全部转移，单品数不超过 300 个 | 不应优先选 | 应查 `货权转移（换标模式）`。 |
| 指定 SKU 部分库存转移 | 不应优先选 | normalized 将部分库存转移归在换标模式描述中。 |
| 只是库存调拨或仓群移动 | 不应选 | 货权转移和调拨不是同一动作。 |
| 转出/转入主体、SKU 或数量不明确 | 不应直接承诺 | 需补充后进入特批审核。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1647` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的转出主体、转入主体、SKU 清单、单品数量、改数字段、货权证明或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 转出方和转入方 | 货权转移主体确认 | 业务上必要，但字段未定版。 |
| 指定 SKU 清单 | 全球库存全部转移 | normalized 主数据以指定 SKU 判断。 |
| 单品数量 | 判断是否大于 300 个 | normalized 主数据给出大于 300 个口径。 |
| 是否为全球库存全部转移 | 区分改数模式和部分转移 | normalized 主数据限定全部转移。 |
| 特批审核和报价确认材料 | 特批非标执行 | 非标流程要求需求清晰、可执行。 |

## 证据边界

- 本页不定版配置字段、改数模板、主体字段、SKU 模板、费用金额、税务/合规规则和仓库国家差异。
- `大于 300 个` 口径来自 normalized 描述，仅用于当前知识库内区分改数模式和换标模式。
- 本原子是特批非标增值，实际执行必须经过业务审核、报价和客户确认。

## 相关链接

- [货权转移（换标模式）](value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md)
- [包裹串仓异常调拨](value-added-service-item-inbound-cross-warehouse-package-transfer.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
