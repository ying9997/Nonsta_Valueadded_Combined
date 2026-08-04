---
title: 库内销毁
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, in-warehouse, destroy, standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202504171850278
vasc_product_name: 库内销毁
vasc_product_type: standard
vasc_submission_entry: unknown
vasc_handling_method: destroy
vasc_active_status: active
related_pscg: OSF6 库内
---

# 库内销毁

## 摘要

`库内销毁` 是库内环节的标准 VASC 产品，用于库内异常商品需要销毁的场景。normalized 数据显示，本产品只编排了一个原子：`库内-异常商品销毁`。

本产品不是入库上架前销毁。若货物仍处于入库异常暂存或上架前阶段，应优先查 `上架前销毁`；若客户要求 DG 商品销毁或销毁证明，应查 `DG商品销毁` 或业务确认。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202504171850278` |
| VASC 产品名称 | 库内销毁 |
| PSCG | `OSF6` 库内 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 销毁 |
| 是否支持无业务单据 | 是 |
| 来源列表线索 | `DESTRUCTION` |

## 适用判断

选择 `库内销毁` 前，AI 需要确认：

1. 货物已进入库内或库内异常处理链路，不是上架前入库异常暂存。
2. 客户处理意图是销毁，不是拍照、换标、包装、盘点、货权转移或自提。
3. 销毁对象是库内异常商品。
4. 客户不要求销毁证明；对应原子主数据明确“此销毁服务无法提供销毁证明”。
5. 若涉及 DG 商品、专业销毁机构或销毁证明，应转向特批非标判断。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 库内异常商品销毁 | 库内-异常商品销毁 | 指定库内异常商品被销毁，退出可销售库存或后续库内处理链路 | 增值单记录库内销毁处理结果；相关异常或库存处理按系统结果闭环 | 通常为终态。 |
| 客户要求销毁证明 | 本产品不应直接承诺 | 实物继续待业务确认或转 DG/特批销毁方案 | 信息流应转非标、特批或业务确认；不能用本产品承诺证明 | 条件闭环。 |
| 货物仍在上架前异常暂存 | 不应进入本产品 | 实物仍按入库异常暂存处理 | 信息流应转 `上架前销毁` 或其他入库异常处理 VASC | 非本产品闭环。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 库内销毁` 的关联。是否推荐仍需结合异常对象、客户销毁意图和证明需求判断。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E08` | 商品包装异常 | `IN_WAREHOUSE` |
| `B0809E03` | 库内商品包装破损 | `IN_WAREHOUSE` |
| `B0809E05` | 库内单品条码异常--人工不可识别 | `IN_WAREHOUSE` |
| `B05E012` | 单品外包装破损 | `IN_WAREHOUSE` |
| `B05E013` | 包裹内商品错装 | `IN_WAREHOUSE` |
| `B05E014` | 单品质量异常 | `IN_WAREHOUSE` |
| `B06E1369` | 2B箱内商品条码异常 | `IN_WAREHOUSE` |
| `B06E1370` | 2B箱内多单品 | `IN_WAREHOUSE` |
| `B06E1371` | 2B箱内少单品 | `IN_WAREHOUSE` |
| `B05E1382` | 库存批次号错误 | `IN_WAREHOUSE` |
| `B05E1383` | 计划外批次 | `IN_WAREHOUSE` |
| `B05E1586` | 单品条码无法扫描(需客户处理） | `IN_WAREHOUSE` |
| `B06E1613` | A+包裹条码无法扫描 | `IN_WAREHOUSE` |
| `B06E1628` | DG商品包装不符合标准 | `IN_WAREHOUSE` |
| `B12E1784` | SN码缺失无法采集 | `OUT_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OSF6V1704` | 库内-异常商品销毁 | N | 库内-异常商品销毁 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 库内-异常商品销毁 | 库内异常商品需要销毁，且客户不要求销毁证明。 | normalized 和原子页均有证据；字段配置缺失。 |

## 与其他销毁产品的区别

| 产品/原子 | 区别 |
|---|---|
| 上架前销毁 | 面向入库异常暂存或上架前货物；本页面向库内异常商品。 |
| DG商品销毁 | 面向 DG 商品及可能需要销毁证明、专业供应商的特批场景；本页原子明确无法提供销毁证明。 |
| 辨识单品配件后销毁 | 只销毁辨识出的配件，不等同整件商品销毁。 |

## 证据边界

- 本页不生成字段配置、模板、附件、枚举、费用和销毁证明结论。
- normalized 数据证明产品与异常、原子存在关联，但不证明所有仓库、国家和特殊品类都可执行。
- `B06E1628` 涉及 DG 商品包装不符合标准，不能仅凭本产品关联就承诺普通库内销毁可处理 DG 证明需求。

## 相关链接

- [库内-异常商品销毁](../../value-added-service-items/destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md)
- [DG商品销毁](../../value-added-service-items/destruction-items/value-added-service-item-in-warehouse-dg-product-destruction.md)
- [上架前销毁](vasc-product-pre-putaway-destruction.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
