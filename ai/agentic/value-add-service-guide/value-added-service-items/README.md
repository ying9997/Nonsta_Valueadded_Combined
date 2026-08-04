---
title: 增值服务项知识
type: reference
entity_type: overview
tags: [value-added-service, value-added-service-item, overview]
source_refs:
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 增值服务项知识

本目录沉淀增值服务项，即增值原子/增值事件。每个服务项页应说明仓库动作、所属 VASC、适用范围、配置字段、上传内容和字段证据状态。

当前 normalized 数据识别到 52 个唯一增值服务项，其中字段级证据仍不完整。

## 当前已生成服务项页

| 分类 | 服务项 | 文件 | 字段证据 |
|---|---|---|---|
| 上架类 | 直接上架 | [value-added-service-item-direct-putaway.md](putaway-items/value-added-service-item-direct-putaway.md) | partial |
| 上架类 | 入库-提供无箱单预报单上架 | [value-added-service-item-inbound-no-box-list-forecast-putaway.md](putaway-items/value-added-service-item-inbound-no-box-list-forecast-putaway.md) | missing |
| 上架类 | 错装商品直接上架 | [value-added-service-item-in-warehouse-mispacked-product-direct-putaway.md](putaway-items/value-added-service-item-in-warehouse-mispacked-product-direct-putaway.md) | missing |
| 上架类 | 拍照暂存后上架 | [value-added-service-item-in-warehouse-putaway-after-photo-temporary-storage.md](putaway-items/value-added-service-item-in-warehouse-putaway-after-photo-temporary-storage.md) | missing |
| 贴标换标类 | 入库-补贴包裹条码 | [value-added-service-item-inbound-package-barcode-labeling.md](labeling-items/value-added-service-item-inbound-package-barcode-labeling.md) | partial |
| 贴标换标类 | 入库-更换新商品条码 | [value-added-service-item-inbound-new-product-barcode-labeling.md](labeling-items/value-added-service-item-inbound-new-product-barcode-labeling.md) | partial |
| 贴标换标类 | 入库-补贴原商品条码 | [value-added-service-item-inbound-original-product-barcode-labeling.md](labeling-items/value-added-service-item-inbound-original-product-barcode-labeling.md) | partial |
| 贴标换标类 | 入库-补贴原商品条码（带示例图） | [value-added-service-item-inbound-original-product-barcode-labeling-with-sample-image.md](labeling-items/value-added-service-item-inbound-original-product-barcode-labeling-with-sample-image.md) | partial |
| 贴标换标类 | 入库-第三方商品条码关联 | [value-added-service-item-inbound-third-party-product-barcode-association.md](labeling-items/value-added-service-item-inbound-third-party-product-barcode-association.md) | partial |
| 贴标换标类 | 入库-覆盖包裹标签 | [value-added-service-item-inbound-cover-package-label.md](labeling-items/value-added-service-item-inbound-cover-package-label.md) | partial |
| 贴标换标类 | 入库-商品其他标签（非商品条码） | [value-added-service-item-inbound-product-other-label-non-barcode.md](labeling-items/value-added-service-item-inbound-product-other-label-non-barcode.md) | partial |
| 贴标换标类 | 库内-补贴原商品条码 | [value-added-service-item-in-warehouse-original-product-barcode-labeling.md](labeling-items/value-added-service-item-in-warehouse-original-product-barcode-labeling.md) | missing |
| 贴标换标类 | 库内-更换新商品条码 | [value-added-service-item-in-warehouse-new-product-barcode-labeling.md](labeling-items/value-added-service-item-in-warehouse-new-product-barcode-labeling.md) | missing |
| 贴标换标类 | 库内-商品其他标签（非商品条码） | [value-added-service-item-in-warehouse-product-other-label-non-barcode.md](labeling-items/value-added-service-item-in-warehouse-product-other-label-non-barcode.md) | missing |
| 贴标换标类 | 库内-清除商品标签 | [value-added-service-item-in-warehouse-clear-product-label.md](labeling-items/value-added-service-item-in-warehouse-clear-product-label.md) | missing |
| 包装处理类 | 入库-更换商品包装 | [value-added-service-item-inbound-replace-product-packaging.md](packaging-items/value-added-service-item-inbound-replace-product-packaging.md) | partial |
| 包装处理类 | 库内-更换商品包装 | [value-added-service-item-in-warehouse-replace-product-packaging.md](packaging-items/value-added-service-item-in-warehouse-replace-product-packaging.md) | missing |
| 包装处理类 | 柔性打包装箱/装袋测量尺重 | [value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md](packaging-items/value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md) | missing |
| 包装处理类 | 代采购包材物料 | [value-added-service-item-in-warehouse-procure-packaging-materials.md](packaging-items/value-added-service-item-in-warehouse-procure-packaging-materials.md) | missing |
| 拍照视频类 | 入库-商品开箱拍照 | [value-added-service-item-inbound-product-unboxing-photo.md](photographing-and-video-items/value-added-service-item-inbound-product-unboxing-photo.md) | partial |
| 拍照视频类 | 提供海外仓监控视频-少包裹调查 | [value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md](photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md) | missing |
| 拍照视频类 | 提供海外仓监控视频-少单品调查 | [value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md](photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md) | missing |
| 拍照视频类 | 入库-单品指定位置开箱拍照 | [value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md](photographing-and-video-items/value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md) | missing |
| 拍照视频类 | 入库-异常包裹开箱拍照 | [value-added-service-item-inbound-exception-package-unboxing-photo.md](photographing-and-video-items/value-added-service-item-inbound-exception-package-unboxing-photo.md) | missing |
| 拍照视频类 | 库内-商品外观拍照 | [value-added-service-item-in-warehouse-product-appearance-photo.md](photographing-and-video-items/value-added-service-item-in-warehouse-product-appearance-photo.md) | missing |
| 拍照视频类 | 库内-商品开箱拍照 | [value-added-service-item-in-warehouse-product-unboxing-photo.md](photographing-and-video-items/value-added-service-item-in-warehouse-product-unboxing-photo.md) | missing |
| 拍照视频类 | 单品指定位置开箱拍照 | [value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md](photographing-and-video-items/value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md) | missing |
| 拍照视频类 | 库内商品拍摄视频 | [value-added-service-item-in-warehouse-product-video-shooting.md](photographing-and-video-items/value-added-service-item-in-warehouse-product-video-shooting.md) | missing |
| 拍照视频类 | 退货商品补拍细节照 | [value-added-service-item-in-warehouse-return-product-detail-reshoot-photo.md](photographing-and-video-items/value-added-service-item-in-warehouse-return-product-detail-reshoot-photo.md) | missing |
| 销毁类 | 上架前包裹销毁 | [value-added-service-item-pre-putaway-package-destruction.md](destruction-items/value-added-service-item-pre-putaway-package-destruction.md) | partial |
| 销毁类 | 上架前商品销毁 | [value-added-service-item-pre-putaway-product-destruction.md](destruction-items/value-added-service-item-pre-putaway-product-destruction.md) | partial |
| 销毁类 | 辨识单品配件后销毁 | [value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md](destruction-items/value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md) | missing |
| 销毁类 | DG商品销毁 | [value-added-service-item-in-warehouse-dg-product-destruction.md](destruction-items/value-added-service-item-in-warehouse-dg-product-destruction.md) | missing |
| 销毁类 | 库内-异常商品销毁 | [value-added-service-item-in-warehouse-exception-product-destruction.md](destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md) | missing |
| 自提类 | 上架前自提（无需WINIT打托） | [value-added-service-item-pre-putaway-self-pickup-without-winit-palletizing.md](self-pickup-items/value-added-service-item-pre-putaway-self-pickup-without-winit-palletizing.md) | missing |
| 自提类 | 上架前自提（需WINIT打托） | [value-added-service-item-pre-putaway-self-pickup-with-winit-palletizing.md](self-pickup-items/value-added-service-item-pre-putaway-self-pickup-with-winit-palletizing.md) | missing |
| 调拨与货权类 | 包裹串仓异常调拨 | [value-added-service-item-inbound-cross-warehouse-package-transfer.md](transfer-and-ownership-items/value-added-service-item-inbound-cross-warehouse-package-transfer.md) | missing |
| 调拨与货权类 | 货权转移（换标模式） | [value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md](transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md) | missing |
| 调拨与货权类 | 货权转移（改数模式） | [value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md](transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md) | missing |
| 商品处理类 | 库内-商品拆分 | [value-added-service-item-in-warehouse-product-splitting.md](product-processing-items/value-added-service-item-in-warehouse-product-splitting.md) | missing |
| 商品处理类 | 库内-商品组合 | [value-added-service-item-in-warehouse-product-combination.md](product-processing-items/value-added-service-item-in-warehouse-product-combination.md) | missing |
| 商品处理类 | 单品拆分后上架（拆分为一个SKU） | [value-added-service-item-in-warehouse-single-item-split-putaway-one-sku.md](product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-one-sku.md) | missing |
| 商品处理类 | 单品拆分后上架（拆分为多个SKU） | [value-added-service-item-in-warehouse-single-item-split-putaway-multiple-skus.md](product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-multiple-skus.md) | missing |
| 商品处理类 | 单品辨识（不开箱） | [value-added-service-item-in-warehouse-single-item-identification-without-unboxing.md](product-processing-items/value-added-service-item-in-warehouse-single-item-identification-without-unboxing.md) | missing |
| 商品处理类 | 辨识单品配件后更换 | [value-added-service-item-in-warehouse-replace-identified-single-item-accessory.md](product-processing-items/value-added-service-item-in-warehouse-replace-identified-single-item-accessory.md) | missing |
| 商品处理类 | 测量商品内部配件尺重 | [value-added-service-item-in-warehouse-measure-internal-accessory-dimensions-weight.md](product-processing-items/value-added-service-item-in-warehouse-measure-internal-accessory-dimensions-weight.md) | missing |
| 商品处理类 | 检查商品尺重（退货商品） | [value-added-service-item-in-warehouse-return-product-dimensions-weight-check.md](product-processing-items/value-added-service-item-in-warehouse-return-product-dimensions-weight-check.md) | missing |
| 商品处理类 | 指定商品盘点 | [value-added-service-item-in-warehouse-specified-product-inventory-count.md](product-processing-items/value-added-service-item-in-warehouse-specified-product-inventory-count.md) | missing |
| 商品处理类 | 审计盘点 | [value-added-service-item-in-warehouse-audit-inventory-count.md](product-processing-items/value-added-service-item-in-warehouse-audit-inventory-count.md) | missing |
| 其他服务需求类 | 入库其他服务需求 | [value-added-service-item-inbound-other-service-demand.md](other-service-demand-items/value-added-service-item-inbound-other-service-demand.md) | missing |
| 其他服务需求类 | 库内其他服务需求 | [value-added-service-item-in-warehouse-other-service-demand.md](other-service-demand-items/value-added-service-item-in-warehouse-other-service-demand.md) | missing |
| 其他服务需求类 | 出库其他服务需求 | [value-added-service-item-outbound-other-service-demand.md](other-service-demand-items/value-added-service-item-outbound-other-service-demand.md) | missing |

## 子目录

- `putaway-items/`：直接上架、暂存后上架、提供预报单上架等。
- `labeling-items/`：商品条码、包裹条码、第三方条码、覆盖标签、清除标签等。
- `packaging-items/`：更换包装、增加包装、柔性打包、包材物料等。
- `photographing-and-video-items/`：商品拍照、开箱拍照、视频、监控调查等。
- `destruction-items/`：包裹销毁、商品销毁、DG 商品销毁等。
- `self-pickup-items/`：上架前自提及托盘相关动作。
- `transfer-and-ownership-items/`：串仓调拨、货权转移等。
- `product-processing-items/`：商品拆分、组合、辨识、盘点、尺重测量等。
- `other-service-demand-items/`：其他服务需求、非标兜底类原子。

## 配置字段维护边界

- 服务项页可以记录已由 `attrSpec` 覆盖的原子属性字段。
- 上传文件、模板列和附件格式只有业务截图或接口结构证据时，必须标为部分证据，不得写成完整字段清单。
- 多个服务项复用同一字段且字段证据稳定后，再考虑拆分独立 `config_field` 页面。
