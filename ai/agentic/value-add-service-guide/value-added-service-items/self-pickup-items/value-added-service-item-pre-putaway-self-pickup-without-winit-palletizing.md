---
title: 上架前自提（无需WINIT打托）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, self-pickup, package-level, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/inbound-exception-putaway-self-pickup.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1594
service_item_name: 上架前自提（无需WINIT打托）
service_item_aliases: [增值原子, 增值事件, 上架前自提, 包裹自提, 无需打托自提]
service_item_object_level: package
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 上架前自提（无需WINIT打托）
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 上架前自提（无需WINIT打托）

## 摘要

`上架前自提（无需WINIT打托）` 是入库异常链路中的自提原子，用于异常货物到海外仓后，客户安排货代到海外仓按包裹提走，且不需要 Winit 额外打托的场景。

本原子和 `上架前自提（需WINIT打托）` 的区别不是“都叫自提”，而是提货形态：包裹自提选择无需打托；托盘自提或客户要求 Winit 打托后再提走，应选择需 Winit 打托的原子。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1594` |
| 服务项名称 | 上架前自提（无需WINIT打托） |
| 别名 | 增值原子 / 增值事件 / 包裹自提 / 无需打托自提 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | Y |
| 默认 SLA | 2 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库动作是将异常暂存或上架前的包裹准备为客户货代自提状态，不进行 Winit 打托。客户或货代后续到仓提走货物，实物退出入库上架链路。

若客户需要 Winit 协助补贴快递面单，业务 SOP 提示可同时上传快递面单到增值文件；但当前字段证据未展开附件字段，因此本页不能定版上传字段名、文件格式或必填条件。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 上架前自提 | `VASC202411192240522` | 1 | N | 上架前自提（无需WINIT打托） | 包裹自提时选择，无需 Winit 打托。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 异常货物到仓后，客户安排货代按包裹提走 | 是 | 主数据定义为异常货物到海外仓后客户要求按照包裹提货。 |
| 客户明确不需要 Winit 打托 | 是 | SOP 明确包裹自提请选择无需打托。 |
| 客户需要托盘自提或 Winit 打托后提货 | 不应选 | 应选择 `上架前自提（需WINIT打托）`。 |
| 客户要求销毁 | 不应选 | 应查上架前销毁原子。 |
| 客户要求继续上架 | 不应选 | 应查原单/新单/直接上架原子。 |

## 配置字段

当前字段覆盖映射显示 `OW01V1594` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的具体必填字段、附件字段或模板字段。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交上架前自提 | SOP 证明入口来自海外仓异常单。 |
| 提货方式为包裹自提 | 所有场景 | SOP 明确包裹自提选择无需打托。 |
| 货代提货安排 | 需要客户货代到仓提走 | SOP 说明客户反馈安排货代过去海外仓提走。 |
| 快递面单 | 需要 Winit 协助补贴面单时 | SOP 提到可上传快递面单，但字段证据不足。 |

## 上传文件要求

当前没有可定版字段证明必须上传附件。

业务 SOP 提到：如需要 Winit 协助补贴快递面单，可同时上传快递面单到增值文件。AI 回答时应将其表述为业务操作提示，而不是字段级必填结论。

## 费用与计费边界

业务 SOP 说明上架前自提按包裹数量收取，如不足最低收费会按增值最低收费收取。本页不沉淀具体金额、币种或国家仓库差异；报价应以系统价格表或正式报价为准。

## 校验规则

- 必须确认客户处理意图是不再上架、由货代自提。
- 必须确认提货形态为包裹自提且无需 Winit 打托。
- 如需要 Winit 打托，应选择 `上架前自提（需WINIT打托）`。
- 如客户需要面单协助，只能提示可按 SOP 上传快递面单，不能定版字段。
- 不得把自提和销毁、上架混为同一处理方向。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 上架前自提（需WINIT打托） | 托盘自提或需要 Winit 打托；本页是无需打托的包裹自提。 |
| 上架前包裹销毁 | 实物由仓库销毁；本页是客户货代提走。 |
| 直接上架 | 实物继续入库上架；本页实物退出上架链路。 |

## 证据边界

- 本页不生成确定字段清单、附件格式、面单模板、预约字段和提货时段字段。
- 本页不定版具体费用金额、最低收费金额、国家仓库差异。
- 面单上传只作为 SOP 操作提示，不作为 `attrSpec` 字段证据。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)

