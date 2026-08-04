---
title: DG商品销毁
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, product-level, destroy, config-field]
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
service_item_code: OSF6V1644
service_item_name: DG商品销毁
service_item_aliases: [增值原子, 增值事件, DG销毁, 危险品销毁, 销毁证明]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: DG商品销毁
charge_required: conditional
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# DG商品销毁

## 摘要

`DG商品销毁` 是库内非标增值（特批）VASC 下的 DG 商品销毁原子，用于客户要求万邑通协助处理 DG 商品销毁的场景。normalized 主数据记录了两类场景：需要提供销毁证明，或无需提供销毁证明、仅销毁货物。

本原子与标准 `库内-异常商品销毁` 不同：DG 商品销毁可能涉及专业销毁机构、销毁证明和特殊合规处理，不能直接用普通库内销毁原子承诺。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1644` |
| 服务项名称 | DG商品销毁 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202411192250069` 库内非标增值（特批） |
| VASC 顺序 | 3 |
| 互斥组 | DG商品销毁 |
| 是否收费 | conditional，需审核报价后确认 |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 确认客户要求销毁的 DG 商品范围。 |
| 2 | 根据是否需要销毁证明判断处理方案。 |
| 3 | 经非标特批、报价和客户确认后执行销毁或协调专业销毁资源。 |
| 4 | 按确认方案反馈销毁结果；如方案包含销毁证明，则按业务确认结果处理证明交付。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| DG 商品客户要求销毁且需要销毁证明 | 是 | normalized 主数据明确场景 1 为需要提供销毁证明。 |
| DG 商品客户要求销毁但无需销毁证明 | 是 | normalized 主数据明确场景 2 为无需证明、仅销毁货物。 |
| 客户要求万邑通寻找有资质销毁供应商并出具证明 | 可考虑 | 业务快照说明 DG 商品销毁区别于标准出库销毁，可能需要专业销毁机构和销毁证明。 |
| 普通库内异常商品销毁，且无需 DG/证明处理 | 不应优先选 | 应查 `库内-异常商品销毁`。 |
| 上架前入库异常商品销毁 | 不应直接套用 | 应查上架前商品销毁或上架前包裹销毁。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1644` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的 DG 品类、销毁证明、专业机构、商品范围、附件、报价或合规材料字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| DG 商品范围 | 定位待销毁商品 | 主数据操作对象为商品。 |
| 是否需要销毁证明 | 判断处理方案 | normalized 明确分为需要证明和无需证明两类。 |
| DG 商品说明或合规资料 | 特殊销毁判断 | 业务上必要，但字段未定版。 |
| 销毁原因和客户确认 | 特批非标执行 | 非标流程要求需求清晰并经报价确认。 |
| 专业机构或证明要求 | 需要证明场景 | 业务快照提到有资质销毁供应商和证明，但字段未定版。 |

## 证据边界

- 本页不定版配置字段、销毁证明格式、专业机构名单、DG 分类规则、费用金额和国家仓库差异。
- 本原子是特批非标增值，不代表所有 DG 商品都可销毁或都能提供证明。
- 需要销毁证明时，不能用普通库内异常商品销毁替代。

## 相关链接

- [库内-异常商品销毁](value-added-service-item-in-warehouse-exception-product-destruction.md)
- [上架前商品销毁](value-added-service-item-pre-putaway-product-destruction.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
