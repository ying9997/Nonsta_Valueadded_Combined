---
title: 库内非标增值（免审核）
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, in-warehouse, non-standard-vasc, active-vasc]
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
vasc_product_code: VASC202411192229072
vasc_product_name: 库内非标增值（免审核）
vasc_product_type: non_standard
vasc_submission_entry: unknown
vasc_handling_method: unknown
vasc_active_status: active
related_pscg: OSF632 库内增值
---

# 库内非标增值（免审核）

## 摘要

`库内非标增值（免审核）` 是 `OSF632` 库内增值下的 active 非标 VASC 产品。normalized 数据显示，本产品无需审核，客户发起，仓库执行，编排 11 个候选原子，覆盖清除标签、拆分上架、拍照/视频辨识、配件更换/销毁、尺重测量和指定商品盘点。

“免审核”只说明该产品属性中 `VASC_REQUIRE_REVIEW = N`，不代表所有原子都可随意选择，也不代表字段、附件、费用或仓库可执行性已经定版。AI 必须按异常对象、客户意图、互斥组和原子页边界动态判断。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202411192229072` |
| VASC 产品名称 | 库内非标增值（免审核） |
| PSCG | `OSF632` 库内增值 |
| 启用状态 | active |
| 产品类型 | 非标增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 是否需要审核 | N |
| 是否支持无业务单据 | 否 |
| 关联 PSC 线索 | `OSF632008274` |
| 来源列表线索 | `STOCK_SHELVES`、`STORAGE`、`DESTRUCTION` |

## 适用判断

选择本产品前，AI 需要确认：

1. 需求发生在库内/在库异常链路，不是入库上架前异常。
2. 客户需求属于已归纳的库内非标免审核场景，而不是需要特批、需审核或标准库内轻加工即可承接的场景。
3. 11 个原子均为候选项，产品级非必选，不能全部默认推荐。
4. `商品拍照辨识` 互斥组下的拍照、视频、辨识、配件更换/销毁等动作要按客户目的择一或谨慎组合。
5. 字段证据均缺失，不能生成确定字段清单、附件模板、SOP 模板或费用口径。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 清除指定标签 | 库内-清除商品标签 | 在库商品清除客户指定标签后回到库内可处理状态 | 增值单记录清除结果；是否闭环取决于标签问题是否解决 | 可能闭环标签类需求。 |
| 拆分后上架 | 单品拆分后上架（拆分为一个SKU） | 单一产品拆分后按同一 SKU 使用新入库单上架，原商品做 `L007` 盘亏 | 信息流承接新入库单、拆分结果和原商品盘亏 | 取决于拆分/上架完成度。 |
| 拍照/视频/辨识 | 单品指定位置开箱拍照、单品辨识、库内商品拍摄视频、退货商品补拍细节照 | 商品通常仍在库内或暂存位置，完成证据采集后等待后续处理 | 增值单反馈照片、视频或辨识结果 | 通常非终态。 |
| 配件处理 | 辨识单品配件后更换 / 销毁 | 辨识出的配件被更换或销毁，商品主体继续库内处理 | 增值单记录配件处理结果，必要时衔接后续上架/库存状态 | 取决于 SOP。 |
| 尺重测量 | 测量商品内部配件尺重 / 柔性打包装箱/装袋测量尺重 | 商品或包材完成测量/装箱测试后继续库内处理 | 增值单反馈尺重、照片或测试结果；不自动改写所有商品注册数据 | 通常非终态。 |
| 指定商品盘点 | 指定商品盘点 | 仓库按 SKU 清点在库商品，必要时根据盘点结果调整系统库存 | 信息流记录盘点结果并触发库存调整 | 可能闭环数量差异。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 库内非标增值（免审核）` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E08` | 商品包装异常 | `IN_WAREHOUSE` |
| `B05E012` | 单品外包装破损 | `IN_WAREHOUSE` |
| `B05E014` | 单品质量异常 | `IN_WAREHOUSE` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OSF6V1643` | 库内-清除商品标签 | N | 标签类 | missing_field_evidence |
| 2 | `OSF6V1596` | 单品拆分后上架（拆分为一个SKU） | N | 商品组合/拆分 | missing_field_evidence |
| 3 | `OSF6V1595` | 单品指定位置开箱拍照 | N | 商品拍照辨识 | missing_field_evidence |
| 4 | `OSF6V1650` | 辨识单品配件后更换 | N | 商品拍照辨识 | missing_field_evidence |
| 5 | `OSF6V1649` | 辨识单品配件后销毁 | N | 商品拍照辨识 | missing_field_evidence |
| 6 | `OSF6V1627` | 单品辨识（不开箱） | N | 商品拍照辨识 | missing_field_evidence |
| 7 | `OSF6V1651` | 库内商品拍摄视频 | N | 商品拍照辨识 | missing_field_evidence |
| 8 | `OSF6V1677` | 退货商品补拍细节照 | N | 商品拍照辨识 | missing_field_evidence |
| 9 | `OSF6V1639` | 测量商品内部配件尺重 | N | 商品尺重测量 | missing_field_evidence |
| 10 | `OSF6V1640` | 柔性打包装箱/装袋测量尺重 | N | 商品尺重测量 | missing_field_evidence |
| 11 | `OSF6V1626` | 指定商品盘点 | N | 盘点 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 不应选择的场景 | 证据状态 |
|---|---|---|---|
| 库内-清除商品标签 | 客户提供示例图片，要求清除指定标签，尤其是库内清除 DG 标签等已归纳场景。 | 需要补贴/更换标签，而不是清除标签。 | normalized 和原子页有证据；字段配置缺失。 |
| 单品拆分后上架（拆分为一个SKU） | 单一产品拆分成同一个 SKU 并使用新入库单上架。 | 拆分为多个 SKU；多个 SKU 组合为一个 SKU。 | normalized 和原子页有证据；字段配置缺失。 |
| 单品指定位置开箱拍照 | 在库单品需要开箱后拍指定位置并反馈辨识结果。 | 普通库内商品拍照；不开箱辨识；入库 `OW01` 指定位置拍照。 | normalized 和原子页有证据；字段配置缺失。 |
| 辨识单品配件后更换 | 需要先辨识配件，再按客户 SOP 更换配件。 | 只需销毁配件；只需辨识不处理。 | normalized 和原子页有证据；字段配置缺失。 |
| 辨识单品配件后销毁 | 需要先辨识配件，再销毁辨识出的配件。 | 整件商品销毁；配件更换。 | normalized 和原子页有证据；字段配置缺失。 |
| 单品辨识（不开箱） | 不拆单品外包装，辨识数量、标签内容或第三方商品标签差异。 | 需要开箱查看内部商品或细节。 | normalized 和原子页有证据；字段配置缺失。 |
| 库内商品拍摄视频 | 客户提供操作 SOP，需要在库视频或模拟商品出库视频。 | 需要监控视频调查；只需要照片。 | normalized 和原子页有证据；字段配置缺失。 |
| 退货商品补拍细节照 | 退货入库商品需要按示例图补拍外箱标签、内部细节、内部商品标签等。 | 普通在库商品拍照。 | normalized 和原子页有证据；字段配置缺失。 |
| 测量商品内部配件尺重 | 客户指定 SKU 并提供测量部位示例图，需要测量内部配件尺重并拍照反馈。 | 普通商品外径尺重或包装测试。 | normalized 和业务快照有证据；字段配置缺失。 |
| 柔性打包装箱/装袋测量尺重 | 客户提供包材型号和需装箱/装袋 M 码信息，仓库装箱测试并反馈装载后尺重。 | 单纯测量商品内部配件。 | normalized 和业务快照有证据；字段配置缺失。 |
| 指定商品盘点 | 指定 SKU 数量核实，盘点后需要根据结果调整系统库存。 | 拍照确认商品状态；换标/包装处理。 | normalized 和原子页有证据；字段配置缺失。 |

## 证据边界

- 本页不定版字段、附件、SOP、照片/视频数量、测量模板、盘点模板、费用金额和国家仓库差异。
- `免审核` 仅来自产品属性 `VASC_REQUIRE_REVIEW = N`，不代表无需客户提供清晰对象、SOP、示例图或必要业务信息。
- 本产品只在 normalized 中关联 3 个库内异常；不能因为原子多就扩展到所有库内异常。
- 若客户诉求属于库内非标特批或需审核产品的原子，应切换到对应产品页，不要用免审核产品兜底。

## 相关链接

- [库内-清除商品标签](../../value-added-service-items/labeling-items/value-added-service-item-in-warehouse-clear-product-label.md)
- [单品拆分后上架（拆分为一个SKU）](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-one-sku.md)
- [单品指定位置开箱拍照](../../value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md)
- [辨识单品配件后更换](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-replace-identified-single-item-accessory.md)
- [辨识单品配件后销毁](../../value-added-service-items/destruction-items/value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md)
- [单品辨识（不开箱）](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-identification-without-unboxing.md)
- [库内商品拍摄视频](../../value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-video-shooting.md)
- [退货商品补拍细节照](../../value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-return-product-detail-reshoot-photo.md)
- [测量商品内部配件尺重](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-measure-internal-accessory-dimensions-weight.md)
- [柔性打包装箱/装袋测量尺重](../../value-added-service-items/packaging-items/value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md)
- [指定商品盘点](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-specified-product-inventory-count.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
