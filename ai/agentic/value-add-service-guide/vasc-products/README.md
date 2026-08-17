---
title: VASC 产品知识
type: reference
entity_type: overview
tags: [value-added-service, vasc-product, overview]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# VASC 产品知识

本目录沉淀被入库异常链路引用的 VASC 增值产品。当前核心口径来自 normalized 数据中的 18 个 VASC，而不是系统全量 VASC 主数据。

## 分类口径

VASC 产品按客户处理意图和解决方案分类，PSCG 作为 frontmatter 和索引字段保留，不作为主目录分类。

## 子目录

- `putaway-services/`：原单上架、新单上架、直接上架等上架处理产品。
- `photographing-and-video-services/`：拍照、开箱拍照、视频或监控调查类产品。
- `destruction-services/`：上架前销毁、库内销毁等产品。
- `self-pickup-services/`：上架前自提等产品。
- `labeling-and-packaging-services/`：以贴标、换标、包装处理为主要能力的产品或轻加工产品。
- `nonstandard-and-other-services/`：非标增值、特批、免审核、其他服务需求类产品。

## 当前已生成产品页

| 分类 | VASC 产品 | 文件 |
|---|---|---|
| 上架处理类 | 原单上架 | [vasc-product-original-order-putaway.md](putaway-services/vasc-product-original-order-putaway.md) |
| 上架处理类 | 新单上架（客户创建入库单） | [vasc-product-new-order-putaway-customer-created-inbound-order.md](putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md) |
| 上架处理类 | 新单上架（WINIT创建入库单） | [vasc-product-new-order-putaway-winit-created-inbound-order.md](putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md) |
| 上架处理类 | 新单上架（客户提供预报单） | [vasc-product-new-order-putaway-customer-provided-forecast-order.md](putaway-services/vasc-product-new-order-putaway-customer-provided-forecast-order.md) |
| 上架处理类 | 原单上架（直接上架） | [vasc-product-original-order-direct-putaway.md](putaway-services/vasc-product-original-order-direct-putaway.md) |
| 上架处理类 | 新单上架（直接上架） | [vasc-product-new-order-direct-putaway.md](putaway-services/vasc-product-new-order-direct-putaway.md) |
| 拍照与视频类 | 入库商品拍照 | [vasc-product-inbound-product-photo.md](photographing-and-video-services/vasc-product-inbound-product-photo.md) |
| 拍照与视频类 | 库内商品拍照 | [vasc-product-in-warehouse-product-photo.md](photographing-and-video-services/vasc-product-in-warehouse-product-photo.md) |
| 拍照与视频类 | 入库非标拍照或提供视频 | [vasc-product-inbound-nonstandard-photo-or-video.md](photographing-and-video-services/vasc-product-inbound-nonstandard-photo-or-video.md) |
| 贴标包装类 | 库内轻加工 | [vasc-product-in-warehouse-light-processing.md](labeling-and-packaging-services/vasc-product-in-warehouse-light-processing.md) |
| 销毁类 | 上架前销毁 | [vasc-product-pre-putaway-destruction.md](destruction-services/vasc-product-pre-putaway-destruction.md) |
| 销毁类 | 库内销毁 | [vasc-product-in-warehouse-destruction.md](destruction-services/vasc-product-in-warehouse-destruction.md) |
| 自提类 | 上架前自提 | [vasc-product-pre-putaway-self-pickup.md](self-pickup-services/vasc-product-pre-putaway-self-pickup.md) |
| 非标及其他类 | 入库非标增值（特批） | [vasc-product-inbound-nonstandard-special-approval.md](nonstandard-and-other-services/vasc-product-inbound-nonstandard-special-approval.md) |
| 非标及其他类 | 库内非标增值（免审核） | [vasc-product-in-warehouse-nonstandard-no-review.md](nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-no-review.md) |
| 非标及其他类 | 库内非标增值（需审核） | [vasc-product-in-warehouse-nonstandard-review-required.md](nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-review-required.md) |
| 非标及其他类 | 库内非标增值（特批） | [vasc-product-in-warehouse-nonstandard-special-approval.md](nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-special-approval.md) |
| 非标及其他类 | 出库非标增值（特批） | [vasc-product-outbound-nonstandard-special-approval.md](nonstandard-and-other-services/vasc-product-outbound-nonstandard-special-approval.md) |

## 产品页边界

- VASC 产品页用于回答“某个 VASC 是什么、适用哪些异常、下面有哪些候选原子、原子如何按场景动态选择”。
- VASC 产品页需要记录“使用本 VASC 后的实物流与信息流去向”，但只写本产品的执行结果；完整状态机仍链接到 `../inbound-exception-value-added-process/`。
- VASC 产品页不定版原子字段、模板、附件、枚举、上传内容和费用；这些内容属于 `../value-added-service-items/`。
- 产品到原子的编排来自关系映射和 normalized 数据，但“某场景下原子是否可选”必须结合异常对象、客户处理意图、业务 SOP、互斥组和字段证据状态判断。
- 若 normalized 只证明存在候选编排、但业务快照没有独立场景证据，产品页只能标为候选或证据不足，不能作为确定推荐。
