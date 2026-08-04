---
title: 入库非标增值（特批）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, non-standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/nonstandard-vas-application-process.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202411192246131
vasc_product_name: 入库非标增值（特批）
vasc_product_type: non_standard
vasc_submission_entry: both
vasc_handling_method: unknown
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 入库非标增值（特批）

## 摘要

`入库非标增值（特批）` 是 `OW01` 入库场景下的 active 非标 VASC 产品，用于标准入库增值、上架、自提、销毁、拍照等常规路径无法直接承接的特殊处理场景。normalized 数据显示，本产品编排两个候选原子：`包裹串仓异常调拨` 和 `入库其他服务需求`。

本产品需要审核和客户确认。产品属性显示审核部门为 `PD`，要求审核 `Y`，要求客户确认 `Y`，并允许审核中修改。AI 不能把它当成普通标准增值推荐，必须先判断是否已有明确标准产品或原子可承接。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202411192246131` |
| VASC 产品名称 | 入库非标增值（特批） |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 非标增值 |
| 提交主体 | 客户 / 客服 |
| 执行主体 | 仓库 |
| 审核部门 | `PD` |
| 是否需要审核 | Y |
| 是否允许审核中修改 | Y |
| 是否需要客户确认 | Y |
| 是否支持无业务单据 | 否 |
| 来源列表线索 | `STORAGE`、`USE_ORIGIN_INBOUND_ORDER`、`DESTRUCTION`、`SELF_PICKUP`、`INBOUND_ORDER_OF_CUSTOMER` |

## 适用判断

选择本产品前，AI 需要确认：

1. 需求属于入库异常或入库处理链路中的特殊场景。
2. 标准上架、直接上架、销毁、自提、拍照、补标、换标、无箱单预报上架等明确产品不能直接承接。
3. 如果是客户直发包裹串仓并要求仓群内调拨，应优先判断 `包裹串仓异常调拨`。
4. 如果是无法归入标准产品的特殊需求，才考虑 `入库其他服务需求`。
5. 特批并不等于必然可执行，仍需 PD 审核、报价/确认和仓库 SOP 支撑。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 包裹串仓异常调拨 | 包裹串仓异常调拨 | 包裹从错误到仓/实际所在仓调拨到支持的目的仓或客户指定承接仓；当前证据仅支持 `DE/DEBR2`、`USWC/USWC2` 仓群 | 增值单记录调拨结果；后续仍需与正确入库单、目的仓上架或异常闭环状态衔接 | 取决于调拨后是否完成上架/状态更新。 |
| 特殊入库处理需求 | 入库其他服务需求 | 实物按 PD 审核后的 SOP 执行，可能继续暂存、转上架、换单、调拨或其他处理 | 信息流进入非标审核、报价、客户确认和仓库执行链路；完成后需更新异常/增值单状态 | 取决于特批 SOP 和执行结果。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 入库非标增值（特批）` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E21` | 包裹条码异常(需客户处理) | `IN_BOUND` |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` |
| `B0102E27` | 商品裸装 | `IN_BOUND` |
| `B01E01` | 入库单状态异常 | `IN_BOUND` |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` |
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` |
| `B01E1378` | A+包裹/箱产品无批次信息或批次信息不全 | `IN_BOUND` |
| `B01E1381` | 商品实物无批次信息或批次信息不全 | `IN_BOUND` |
| `B01E1470` | 订单状态被终止无法上架 | `IN_BOUND` |
| `B01E1514` | 订单状态已上架需拦截 | `IN_BOUND` |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | `IN_BOUND` |
| `B01E1517` | 到仓包裹商品数量大于验货数量（需客户处理） | `IN_BOUND` |
| `B01E1579` | A+包商品条码和包裹条码对应关系校验不一致 | `IN_BOUND` |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `IN_BOUND` |
| `B01E49` | 客户直发包裹串仓 | `IN_BOUND` |
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1654` | 包裹串仓异常调拨 | N | 包裹串仓异常调拨 | missing_field_evidence |
| 2 | `OW01V1602` | 入库其他服务需求 | N | 入库其他服务需求 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 不应选择的场景 | 证据状态 |
|---|---|---|---|
| 包裹串仓异常调拨 | 客户直发包裹串仓，客户要求在支持仓群内调拨到目的仓；当前证据支持 `DE/DEBR2`、`USWC/USWC2`。 | 非串仓异常；任意跨国/跨仓调拨；客户选择在实际所在仓上架。 | normalized 和原子页有证据；字段配置缺失。 |
| 入库其他服务需求 | 标准产品无法覆盖的特殊入库处理需求，需要 PD 审核、报价、客户确认和仓库 SOP 执行。 | 已有标准 VASC/原子可承接；需求不清楚、不可执行或合规不支持。 | normalized、原子页和非标流程快照有证据；字段配置缺失。 |

## 特批与审核边界

| 判断点 | 口径 |
|---|---|
| 历史审批过的非标场景 | 可进入产品报价环节；若服务项选错，可能被更新为其他服务需求并重新流转 CEO 审批。 |
| 其他服务需求 | 进入 CEO 审批流程，审批通过后再由相关角色提交非标增值，PD 报价并等待客户确认。 |
| 无箱单预报入库单 | 业务快照提示不支持通过入库单创建标准增值及非标增值；具体异常链路需回查当前系统入口。 |
| 异常单创建限制 | 业务快照存在“异常单创建的增值不支持”的注意事项；但 normalized 也存在异常到本产品映射，AI 回答入口时必须以具体场景和当前系统为准。 |

## 证据边界

- 本页不定版非标字段、审批字段、报价字段、附件模板、SOP 模板、费用金额和时效。
- 本产品存在特批/审核属性，不能作为普通客户自助标准产品直接推荐。
- `入库其他服务需求` 是兜底原子，不能替代已有明确产品；AI 应先查标准和非标已归纳原子。
- 若业务快照、异常页或系统入口对某异常有“关闭非标增值下单入口”“仅支持某类上架”等限制，应优先保留该限制。

## 相关链接

- [包裹串仓异常调拨](../../value-added-service-items/transfer-and-ownership-items/value-added-service-item-inbound-cross-warehouse-package-transfer.md)
- [入库其他服务需求](../../value-added-service-items/other-service-demand-items/value-added-service-item-inbound-other-service-demand.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
