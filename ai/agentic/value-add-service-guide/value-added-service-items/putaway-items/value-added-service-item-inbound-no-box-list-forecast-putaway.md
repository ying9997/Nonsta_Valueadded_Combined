---
title: 入库-提供无箱单预报单上架
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/no-box-list-forecast-faq.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1622
service_item_name: 入库-提供无箱单预报单上架
service_item_aliases: [增值原子, 增值事件, 无箱单预报单上架, 客户提供预报单上架]
service_item_object_level: package
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 入库-提供无箱单预报单上架
charge_required: false
cost_generated: unknown
effective: true
field_evidence_status: missing
---

# 入库-提供无箱单预报单上架

## 摘要

`入库-提供无箱单预报单上架` 用于客户使用无箱单预报单入库，但货物到仓后无箱单识别标识丢失，导致仓库无法正常上架的场景。客户需提供原始无箱单信息，以便仓库正确处理货物并完成上架。

本原子不是普通新单上架，也不是补贴包裹条码。它的核心是“无箱单预报单信息丢失或无法识别后，客户补充原始无箱单信息”。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1622` |
| 服务项名称 | 入库-提供无箱单预报单上架 |
| 别名 | 增值原子 / 增值事件 / 无箱单预报单上架 / 客户提供预报单上架 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 默认 SLA | 2 天 |
| 是否收费 | N |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库根据客户补充的原始无箱单信息，识别到仓包裹与预报单之间的关系，并完成上架处理。

使用本原子后，实物流从异常暂存或待识别状态回到入库上架链路；信息流由客户提供的无箱单预报信息承接，而不是普通原单或新单条码承接。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 新单上架（客户提供预报单） | `VASC202412111831129` | 1 | N | 入库-提供无箱单预报单上架 | 非标免审核口径，客户提供无箱单预报信息。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户使用无箱单预报单入库，货物到仓后无箱单识别标识丢失 | 是 | 主数据定义明确该场景。 |
| 实物商品条码正确，客户要求使用无箱单预报单上架 | 是 | 异常解决方案目录将该场景指向新单上架（客户提供预报单）/本原子。 |
| 入库单状态异常后，客户更新状态并要求用预报单上架 | 可考虑 | 业务目录存在该方向，但需确认无箱单预报信息。 |
| 普通新入库单上架，客户有标准新单号 | 不应选 | 应查新单上架（客户创建入库单）或补贴包裹条码。 |
| 需要补贴包裹条码后上架 | 不应直接选 | 应查 `入库-补贴包裹条码`。 |
| 原单上架或直接上架即可 | 不应选 | 本原子是无箱单预报信息承接。 |

## 配置字段

当前字段覆盖映射显示 `OW01V1622` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的具体必填字段、附件字段或模板字段。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交处理 | 接口结构支持异常来源与增值单关联。 |
| 原始无箱单信息 | 所有场景 | 主数据明确客户需提供原始无箱单信息。 |
| 包裹或入库单识别信息 | 货物到仓但无法正常识别时 | 业务方向需要关联到仓包裹和预报单。 |
| 预报单承接意图 | 所有场景 | 本原子核心是客户提供预报单上架。 |

## 上传文件要求

当前没有字段级证据证明必须上传附件或模板。

AI 可以说明客户需要提供原始无箱单信息，但不能定版为某个具体附件字段、模板列或文件格式。

## 校验规则

- 必须确认客户使用的是无箱单预报单入库。
- 必须确认问题是无箱单识别标识丢失或预报信息无法被仓库正常识别。
- 必须确认客户能提供原始无箱单信息。
- 不得把普通新单上架、原单上架、补包裹条码和本原子混用。
- 字段证据缺失时不得生成字段清单。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 直接上架 | 无额外处理直接上架；本页需要客户提供无箱单预报信息。 |
| 入库-补贴包裹条码 | 补贴包裹条码承接入库单；本页是无箱单预报信息承接。 |
| 新单上架（客户创建入库单）相关原子 | 客户创建普通新入库单；本页是客户提供无箱单预报单。 |
| 入库其他服务需求 | 兜底非标；本页已有明确无箱单预报场景。 |

## 证据边界

- 本页不生成确定字段清单、附件格式、模板列、预报单字段和上传方式。
- 本页不定版费用金额、国家仓库差异和系统入口限制。
- 若客户无法提供原始无箱单信息，不能直接承诺本原子可处理。

## 相关链接

- [直接上架](value-added-service-item-direct-putaway.md)
- [入库-补贴包裹条码](../labeling-items/value-added-service-item-inbound-package-barcode-labeling.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)

