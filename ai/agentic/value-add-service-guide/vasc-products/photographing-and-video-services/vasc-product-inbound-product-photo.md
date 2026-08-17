---
title: 入库商品拍照
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, photograph, standard-vasc, inactive-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/inbound-exception-photo-vas.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202407031507376
vasc_product_name: 入库商品拍照
vasc_product_type: standard
vasc_submission_entry: exception_order
vasc_handling_method: photograph_then_hold
vasc_active_status: inactive
related_pscg: OW01 海外仓入库
---

# 入库商品拍照

## 摘要

`入库商品拍照` 是入库异常链路中的历史/未启用标准 VASC 产品。normalized 数据显示其启用状态为 `N`，只编排了 `入库-商品开箱拍照` 一个原子。

AI 使用本页时必须保留 inactive 边界：本产品可用于理解历史映射和异常拍照方向，但不能直接推荐为当前可用入口。当前入库异常拍照需求应优先查 `入库非标拍照或提供视频` 及其原子。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202407031507376` |
| VASC 产品名称 | 入库商品拍照 |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | inactive |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 拍照后暂存/等待客户下一步指令 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PEWC`、`TS` |

## 适用判断

选择本产品前，AI 需要确认：

1. 本产品当前为 inactive，不能直接作为当前推荐入口。
2. 客户处理意图是拍照确认，而不是直接上架、销毁、自提或换单。
3. 若当前系统需提交拍照，应优先查入库非标拍照或提供视频产品。
4. 拍照后实物通常继续暂存，等待客户下一步处理指令，不等同异常闭环终态。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 历史入库商品拍照 | 入库-商品开箱拍照 | 异常商品开箱拍照后继续暂存，等待客户下一步处理 | 增值单记录拍照结果；异常通常未因拍照本身终态闭环 | 通常非终态。 |
| 当前拍照需求 | 应查非标拍照产品 | 实物按非标拍照流程处理 | 信息流转入入库非标拍照或提供视频产品 | 取决于后续客户指令。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在历史 `exception -> 入库商品拍照` 关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B03E03` | 包裹内出现订单外商品 | `IN_BOUND` |
| `B0102E23` | A+包裹质量异常 | `IN_BOUND` |
| `B01E1314` | 商品质量异常(影响销售) | `IN_BOUND` |
| `B01E1315` | 商品条码异常(需客户处理) | `IN_BOUND` |
| `B01E1316` | 商品有条码但系统无法识别 | `IN_BOUND` |
| `B01E1378` | A+包裹/箱产品无批次信息或批次信息不全 | `IN_BOUND` |
| `B01E1516` | ABC类包裹/子包裹内商品错装暂存（需客户处理） | `IN_BOUND` |
| `B01E1517` | 到仓包裹商品数量大于验货数量（需客户处理） | `IN_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1562` | 入库-商品开箱拍照 | N | 商品拍照辨识 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 入库-商品开箱拍照 | 历史标准拍照产品下，用于入库异常商品开箱拍照后暂存。 | normalized 和原子页有证据；产品 inactive。 |

## 证据边界

- 本页不作为当前可用 VASC 推荐结论。
- 本页不定版拍照字段、图片数量、附件模板、费用和时效。
- 拍照通常只是获取信息，不能替代上架、销毁、自提等最终处理动作。

## 相关链接

- [入库-商品开箱拍照](../../value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-product-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
