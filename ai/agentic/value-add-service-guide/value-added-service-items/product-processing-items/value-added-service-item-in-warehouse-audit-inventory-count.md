---
title: 审计盘点
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, order-level, config-field]
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
service_item_code: OSF6V1660
service_item_name: 审计盘点
service_item_aliases: [增值原子, 增值事件, 审计盘点, 全盘, 抽盘]
service_item_object_level: other
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 审计盘点
charge_required: conditional
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# 审计盘点

## 摘要

`审计盘点` 是库内非标增值（特批）VASC 下的盘点类原子，用于支持客户对当前名下所有账号、关联账号、主子账号或指定账号在 WINIT 仓库内的库存进行盘点，支持在库全盘或指定 SKU 抽盘。

本原子与 `指定商品盘点` 不同：本页强调账号范围、关联账号范围和审计口径；指定商品盘点更偏向指定 SKU 的数量清点和库存调整。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1660` |
| 服务项名称 | 审计盘点 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 账号/库存范围 |
| 所属 VASC | `VASC202411192250069` 库内非标增值（特批） |
| VASC 顺序 | 2 |
| 互斥组 | 审计盘点 |
| 是否收费 | conditional，需审核报价后确认 |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 按客户确认的账号范围、仓库范围或 SKU 范围确定盘点对象。 |
| 2 | 对 WINIT 仓库内库存执行在库全盘或指定 SKU 抽盘。 |
| 3 | 反馈盘点结果，并按实际业务规则处理后续差异。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户需要对名下所有账号库存做盘点 | 是 | normalized 主数据明确支持当前名下所有账号。 |
| 客户需要覆盖关联账号或主子账号库存 | 是 | normalized 主数据明确包含关联账号与主子账号。 |
| 客户只需要指定账号、指定 SKU 抽盘 | 是 | normalized 主数据明确支持指定账号、指定 SKU 抽盘。 |
| 只需要某个 SKU 的普通库存数量核实 | 不应优先选 | 应先查 `指定商品盘点`。 |
| 缺少账号范围、仓库范围或 SKU 范围 | 不应直接承诺 | 审计盘点对象不明确，需补充后审核。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1660` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的账号范围、关联账号、仓库范围、全盘/抽盘类型、SKU 清单、盘点报告或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 账号范围 | 全账号、指定账号、关联账号盘点 | 主数据明确支持账号范围盘点。 |
| 仓库范围 | 多仓或指定仓盘点 | 业务上必要，但字段未定版。 |
| 盘点类型 | 在库全盘或指定 SKU 抽盘 | 主数据明确支持两类盘点。 |
| SKU 清单 | 指定 SKU 抽盘 | 主数据明确支持指定 SKU 抽盘。 |
| 审计目的或差异处理要求 | 盘点后解释和后续处理 | 业务上必要，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、盘点报告模板、账号字段、仓库字段、SKU 模板、库存差异处理字段、费用金额和仓库国家差异。
- 审计盘点是特批非标增值，不能绕过审核、报价和客户确认。
- 不得将审计盘点泛化为所有库存问题的默认处理方式。

## 相关链接

- [指定商品盘点](value-added-service-item-in-warehouse-specified-product-inventory-count.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
