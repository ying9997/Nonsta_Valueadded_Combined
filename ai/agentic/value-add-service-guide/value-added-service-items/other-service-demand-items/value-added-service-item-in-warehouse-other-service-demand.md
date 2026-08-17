---
title: 库内其他服务需求
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
  - source-references/kb-business-source-snapshots/nonstandard-vas-rejection-scenarios.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1603
service_item_name: 库内其他服务需求
service_item_aliases: [增值原子, 增值事件, 库内其他服务需求, 库内非标兜底]
service_item_object_level: order
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 库内其他服务需求
charge_required: conditional
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# 库内其他服务需求

## 摘要

`库内其他服务需求` 是库内非标增值（特批）VASC 下的兜底原子，用于万邑通基本库内增值服务无法直接承接的特殊定制需求。客户提交需求后，万邑通根据需求内容进行定制化报价，客户确认后再提交和执行增值服务。

本原子不是“所有不确定库内需求的默认答案”。AI 必须先排查是否已有明确原子，例如库内轻加工、库内商品拍照、库内销毁、盘点、货权转移、代采购包材、DG 销毁等；只有标准或已归类非标原子无法覆盖时，才考虑本兜底入口。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1603` |
| 服务项名称 | 库内其他服务需求 |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 订单/需求范围 |
| 所属 VASC | `VASC202411192250069` 库内非标增值（特批） |
| VASC 顺序 | 6 |
| 互斥组 | 库内其他服务需求 |
| 是否收费 | conditional，需审核报价后确认 |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库动作不固定，由客户提交的库内特殊需求、万邑通审核结果、报价确认和仓库可执行能力共同决定。它可以承接基本库内增值服务之外的定制化需求，但必须经过特批、报价和客户确认。

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 基本库内增值服务无法覆盖的特殊定制需求 | 是 | normalized 主数据定义为基本库内增值服务外的特殊定制服务。 |
| 客户需求经过 CEO/业务审批并需 PD 报价 | 是 | 非标流程说明其他服务需求进入审批和报价流程。 |
| 已有明确库内原子可承接 | 不应优先选 | 应优先选择具体原子，避免兜底滥用。 |
| 需求描述不清、缺少 SOP 或无法判断可执行性 | 不应直接承诺 | 需补充操作说明、对象范围和附件。 |
| 明确拒接、合规不支持或仓库能力不支持 | 不应选 | 非标拒接规则优先。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1603` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的需求描述、对象范围、SOP、附件、报价确认或审批字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 具体服务需求描述 | 所有非标兜底场景 | 主数据说明根据客户需求内容定制化报价。 |
| 库内货物、订单、SKU 或账号范围 | 定位仓库执行对象 | 业务上必要，但字段未定版。 |
| 操作 SOP、图片、视频或文件 | 复杂非标需求 | 非标流程要求需求清晰、可执行。 |
| 申请原因和背景 | 审核报价 | 非标流程的询价申请输入标准包含申请原因。 |
| 客户报价确认 | 收费执行前 | 非标流程要求客户同意报价后再提交增值单。 |

## 证据边界

- 本页不生成确定字段清单、附件格式、SOP 模板、报价字段、审批字段、费用金额和仓库国家差异。
- 本原子是兜底入口，不代表所有库内特殊需求都能被接受。
- AI 推荐本原子前，必须先排除已有更具体的库内原子。

## 相关链接

- [入库其他服务需求](value-added-service-item-inbound-other-service-demand.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
