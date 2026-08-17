---
title: 包裹串仓异常调拨
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, package-level, config-field]
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
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1654
service_item_name: 包裹串仓异常调拨
service_item_aliases: [增值原子, 增值事件, 串仓调拨, 入库串仓调拨]
service_item_object_level: package
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 包裹串仓异常调拨
charge_required: false
cost_generated: unknown
effective: true
field_evidence_status: missing
---

# 包裹串仓异常调拨

## 摘要

`包裹串仓异常调拨` 是入库非标增值特批下的包裹级调拨原子，用于包裹直发串仓异常，客户要求将异常包裹在指定仓群内调拨到目的仓库。

本原子的适用范围很窄：当前证据只支持 `DE/DEBR2`、`USWC/USWC2` 仓群内调拨。AI 不得把它泛化为任意国家、任意仓库之间的跨仓调拨。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1654` |
| 服务项名称 | 包裹串仓异常调拨 |
| 别名 | 增值原子 / 增值事件 / 串仓调拨 / 入库串仓调拨 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 默认 SLA | 2 天 |
| 是否收费 | N |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库动作是根据客户指定，将串仓异常包裹调拨到支持的目的仓库。执行完成后，实物流从错误到仓/实际所在仓转向正确或客户指定的上架承接仓；信息流需要与新的上架方向或后续入库单处理保持一致。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 入库非标增值（特批） | `VASC202411192246131` | 1 | N | 包裹串仓异常调拨 | 需要审核/特批的入库非标方向。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户直发包裹串仓，客户要求仓群内调拨 | 是 | 主数据定义明确为包裹直发串仓异常调拨。 |
| 实物在实际所在仓，客户希望调拨到目的仓处理 | 可考虑 | 业务目录将客户直发包裹串仓关联到调拨/非标方向。 |
| `DE/DEBR2` 仓群内调拨 | 是 | 主数据明确仅支持该仓群。 |
| `USWC/USWC2` 仓群内调拨 | 是 | 主数据明确仅支持该仓群。 |
| 其他仓库、跨国家或未列明仓群调拨 | 不能默认支持 | 当前证据只支持上述仓群。 |
| 客户选择在实际所在仓上架 | 不一定需要本原子 | 可查新单上架、补贴包裹条码等上架方向。 |

## 配置字段

当前字段覆盖映射显示 `OW01V1654` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的具体起始仓、目的仓、包裹号、调拨单据或附件字段。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交串仓处理 | 接口结构支持异常来源与增值单关联。 |
| 实际所在仓 | 所有串仓调拨场景 | 调拨必须知道当前实物所在仓。 |
| 目的仓库 | 所有串仓调拨场景 | 主数据要求调拨到目的仓库。 |
| 仓群是否为 DE/DEBR2 或 USWC/USWC2 | 所有场景 | 主数据限定支持范围。 |
| 包裹识别信息 | 调拨指定包裹时 | 当前字段证据未定版，但业务上需要定位异常包裹。 |

## 上传文件要求

当前没有字段级证据证明必须上传附件、调拨模板或审批材料。

如果业务要求客户提供包裹清单、目的仓确认或调拨说明，应以系统页面和特批审核要求为准，不能从当前数据中定版字段。

## 校验规则

- 必须确认异常为包裹直发串仓。
- 必须确认操作对象为包裹。
- 必须确认调拨仓群在 `DE/DEBR2` 或 `USWC/USWC2` 范围内。
- 其他仓群不得直接承诺支持。
- 若客户选择在实际所在仓上架，应优先查上架类原子，而不是默认调拨。
- 字段证据缺失时不得生成字段清单。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 入库-补贴包裹条码 | 用于包裹条码或新单承接上架；本页是仓群内调拨。 |
| 直接上架 | 货物在当前仓继续上架；本页改变实物流向。 |
| 入库其他服务需求 | 泛化非标兜底；本页已有明确串仓调拨场景。 |

## 证据边界

- 本页不生成确定字段清单、调拨模板、附件格式、审批字段和费用金额。
- 本页不支持泛化到任意仓库调拨。
- 当前收费字段显示不收费，但费用、成本和特批规则仍应以系统和正式报价为准。

## 相关链接

- [入库-补贴包裹条码](../labeling-items/value-added-service-item-inbound-package-barcode-labeling.md)
- [直接上架](../putaway-items/value-added-service-item-direct-putaway.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)

