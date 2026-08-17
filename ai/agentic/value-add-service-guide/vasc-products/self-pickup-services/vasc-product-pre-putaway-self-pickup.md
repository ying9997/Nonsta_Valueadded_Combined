---
title: 上架前自提
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, self-pickup, non-standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/inbound-exception-putaway-self-pickup.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202411192240522
vasc_product_name: 上架前自提
vasc_product_type: non_standard
vasc_submission_entry: exception_order
vasc_handling_method: self_pickup
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 上架前自提

## 摘要

`上架前自提` 是入库异常链路中的非标 VASC 产品，用于海外仓登记入库异常后，客户不再要求上架，而是安排货代到海外仓提走货物的场景。

本产品下有两个原子，动态判断点是提货形态：包裹自提选择 `上架前自提（无需WINIT打托）`，托盘自提或需要 Winit 打托后提货选择 `上架前自提（需WINIT打托）`。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202411192240522` |
| VASC 产品名称 | 上架前自提 |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 非标增值 |
| 提交主体 | 客户 / 客服 |
| 执行主体 | 仓库 |
| 处理方式 | 自提 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PS`、`PEWC`、`SHD`、`EWC`、`TS` |

## 适用判断

选择 `上架前自提` 前，AI 需要确认：

1. 已存在入库异常或上架前待处理货物。
2. 客户处理意图是由客户或货代提走，不再进入原单/新单上架。
3. 提交入口应来自海外仓异常单处理链路。
4. 客户明确提货形态是包裹自提还是托盘自提/需 Winit 打托。
5. 如客户需要 Winit 协助补贴快递面单，只能作为 SOP 操作提示，不定版为字段清单。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 包裹自提，无需 Winit 打托 | 上架前自提（无需WINIT打托） | 异常暂存或上架前包裹准备为客户货代自提，货物离开仓库后退出入库上架链路 | 异常单入口提交自提增值；增值完成后，异常以自提处理闭环 | 通常为终态。 |
| 托盘自提或需要 Winit 打托 | 上架前自提（需WINIT打托） | 仓库先打托，再由客户货代提走，实物退出入库上架链路 | 增值单记录打托自提动作；完成后异常以自提处理闭环 | 通常为终态。 |
| 客户改为销毁 | 本产品不适用 | 实物不再等待提货，转销毁链路 | 信息流应改选上架前销毁或库内销毁 | 非本产品闭环。 |
| 客户改为上架 | 本产品不适用 | 实物回到原单、新单或预报单上架链路 | 信息流应改选对应上架 VASC | 非本产品闭环。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 上架前自提` 的关联。是否实际推荐，还需结合客户处理意图和提货形态。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B01E01` | 入库单状态异常 | `IN_BOUND` |
| `B01E49` | 客户直发包裹串仓 | `IN_BOUND` |
| `B0102E21` | 包裹条码异常(需客户处理) | `IN_BOUND` |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` |
| `B0102E27` | 商品裸装 | `IN_BOUND` |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` |
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` |
| `B01E1470` | 订单状态被终止无法上架 | `IN_BOUND` |
| `B01E1514` | 订单状态已上架需拦截 | `IN_BOUND` |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `IN_BOUND` |
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1594` | 上架前自提（无需WINIT打托） | N | 上架前自提（无需WINIT打托） | missing_field_evidence |
| 2 | `OW01V1604` | 上架前自提（需WINIT打托） | N | 上架前自提-托盘 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 上架前自提（无需WINIT打托） | 包裹自提，客户或货代按包裹提走，不需要 Winit 打托。 | 自提 SOP 明确。 |
| 上架前自提（需WINIT打托） | 托盘自提，或客户要求 Winit 打托后由货代提走。 | 自提 SOP 明确。 |

## 互斥与组合规则

- 两个自提原子的选择依据是是否需要 Winit 打托。
- 包裹自提不要选择需打托原子；托盘自提不要选择无需打托原子。
- 自提与销毁、上架属于不同处理方向，不应在同一异常处理意图下混用。

## 证据边界

- 本页不生成字段配置、面单附件字段、预约字段、提货时段字段、费用金额和最低收费金额。
- SOP 中提到快递面单上传，只能作为操作提示；字段级配置仍以原子页和后续配置字段模块为准。
- normalized 数据证明异常与本 VASC 有关联，但最终是否选择自提取决于客户处理意图。

## 相关链接

- [上架前自提（无需WINIT打托）](../../value-added-service-items/self-pickup-items/value-added-service-item-pre-putaway-self-pickup-without-winit-palletizing.md)
- [上架前自提（需WINIT打托）](../../value-added-service-items/self-pickup-items/value-added-service-item-pre-putaway-self-pickup-with-winit-palletizing.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
