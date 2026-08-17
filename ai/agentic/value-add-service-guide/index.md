# 入库异常与增值服务知识库索引

> AI 检索导航索引。
> 当前按 AI 协同维护：新增、移动、删除或改名文件时，需要同步更新相关 README、根索引和日志。
> Last updated: 2026-06-25 | Business knowledge files: 144 | Business directories: 31 | Source governance files: 2 | Interface reference files: 13 | Dataset reference packages: 1 | KB source snapshot files: 35

## 根文件

- [AI 使用说明](AGENTS.md)
- [知识库说明](README.md)
- [知识库 Schema](SCHEMA.md)
- [变更日志](log.md)

## 业务目录

当前业务目录按业务主体划分。每个业务目录必须包含 `README.md`，目录 README 用于说明收录口径和子目录，不替代实体页。

### inbound-exception-value-added-process/

- [入库异常与增值流程](inbound-exception-value-added-process/README.md)
- [入库异常到增值服务总流程](inbound-exception-value-added-process/inbound-exception-to-value-added-overall-flow.md)
- [入库业务分支与异常触发地图](inbound-exception-value-added-process/inbound-business-branch-exception-trigger-map.md)
- [客户处理意图到增值选择决策流程](inbound-exception-value-added-process/customer-action-decision-flow.md)
- [入库异常与增值实物流](inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)

### inbound-exceptions/

- [入库异常知识](inbound-exceptions/README.md)
- [订单状态类入库异常](inbound-exceptions/order-status-exceptions/README.md)
- [入库单状态异常](inbound-exceptions/order-status-exceptions/exception-b01e01-inbound-order-status-abnormal.md)
- [订单状态被终止无法上架](inbound-exceptions/order-status-exceptions/exception-b01e1470-order-terminated-unable-to-putaway.md)
- [订单状态已上架需拦截](inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md)
- [包裹条码类入库异常](inbound-exceptions/package-barcode-exceptions/README.md)
- [包裹条码异常（需客户处理）](inbound-exceptions/package-barcode-exceptions/exception-b0102e21-package-barcode-abnormal-customer-action-required.md)
- [A+包商品条码和包裹条码对应关系校验不一致](inbound-exceptions/package-barcode-exceptions/exception-b01e1579-a-plus-product-barcode-package-barcode-mismatch.md)
- [包裹条码批量异常（需客户处理）](inbound-exceptions/package-barcode-exceptions/exception-b01e1615-package-barcode-batch-abnormal-customer-action-required.md)
- [A+包裹条码无法扫描](inbound-exceptions/package-barcode-exceptions/exception-b06e1613-a-plus-package-barcode-unscannable.md)
- [商品条码类入库异常](inbound-exceptions/product-barcode-exceptions/README.md)
- [商品条码异常（需客户处理）](inbound-exceptions/product-barcode-exceptions/exception-b01e1315-product-barcode-abnormal-customer-action-required.md)
- [商品有条码但系统无法识别](inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md)
- [单品条码无法扫描（需客户处理）](inbound-exceptions/product-barcode-exceptions/exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md)
- [2B箱内商品条码异常](inbound-exceptions/product-barcode-exceptions/exception-b06e1369-2b-box-product-barcode-abnormal.md)
- [库内单品条码异常（人工不可识别）](inbound-exceptions/product-barcode-exceptions/exception-b0809e05-in-warehouse-single-item-barcode-abnormal-manually-unrecognizable.md)
- [数量差异类入库异常](inbound-exceptions/quantity-difference-exceptions/README.md)
- [到仓包裹商品数量大于验货数量](inbound-exceptions/quantity-difference-exceptions/exception-b01e1517-arrived-package-product-quantity-greater-than-inspection-quantity.md)
- [2B箱内多单品](inbound-exceptions/quantity-difference-exceptions/exception-b06e1370-2b-box-extra-single-items.md)
- [2B箱内少单品](inbound-exceptions/quantity-difference-exceptions/exception-b06e1371-2b-box-missing-single-items.md)
- [质量与包装类入库异常](inbound-exceptions/quality-and-packaging-exceptions/README.md)
- [商品包装异常](inbound-exceptions/quality-and-packaging-exceptions/exception-b0102e08-product-packaging-abnormal.md)
- [A+包裹质量异常](inbound-exceptions/quality-and-packaging-exceptions/exception-b0102e23-a-plus-package-quality-abnormal.md)
- [商品裸装](inbound-exceptions/quality-and-packaging-exceptions/exception-b0102e27-product-without-logistics-packaging.md)
- [商品质量异常（影响销售）](inbound-exceptions/quality-and-packaging-exceptions/exception-b01e1314-product-quality-abnormal-affects-sales.md)
- [单品外包装破损](inbound-exceptions/quality-and-packaging-exceptions/exception-b05e012-single-item-outer-packaging-damaged.md)
- [单品质量异常](inbound-exceptions/quality-and-packaging-exceptions/exception-b05e014-single-item-quality-abnormal.md)
- [DG商品包装不符合标准](inbound-exceptions/quality-and-packaging-exceptions/exception-b06e1628-dg-product-packaging-noncompliant.md)
- [库内商品包装破损](inbound-exceptions/quality-and-packaging-exceptions/exception-b0809e03-in-warehouse-product-packaging-damaged.md)
- [错装与订单外商品类入库异常](inbound-exceptions/wrong-item-and-mispack-exceptions/README.md)
- [包裹内出现订单外商品](inbound-exceptions/wrong-item-and-mispack-exceptions/exception-b03e03-out-of-order-product-in-package.md)
- [ABC类包裹或子包裹内商品错装暂存](inbound-exceptions/wrong-item-and-mispack-exceptions/exception-b01e1516-abc-package-subpackage-product-mispacked-temporary-storage.md)
- [包裹内商品错装](inbound-exceptions/wrong-item-and-mispack-exceptions/exception-b05e013-product-mispacked-in-package.md)
- [批次 SN 与属性类入库异常](inbound-exceptions/batch-sn-and-attribute-exceptions/README.md)
- [A+包裹或箱产品无批次信息或批次信息不全](inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b01e1378-a-plus-package-box-product-batch-info-missing-or-incomplete.md)
- [商品实物无批次信息或批次信息不全](inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b01e1381-product-physical-batch-info-missing-or-incomplete.md)
- [库存批次号错误](inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b05e1382-inventory-batch-number-wrong.md)
- [计划外批次](inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b05e1383-unplanned-batch.md)
- [SN码缺失无法采集](inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b12e1784-sn-code-missing-unable-to-collect.md)
- [串仓与仓库不匹配类入库异常](inbound-exceptions/warehouse-mismatch-exceptions/README.md)
- [客户直发包裹串仓](inbound-exceptions/warehouse-mismatch-exceptions/exception-b01e49-customer-direct-ship-package-wrong-warehouse.md)
- [自提与出库关联类异常](inbound-exceptions/self-pickup-and-outbound-related-exceptions/README.md)
- [打包完成后作废出库单（有商品增值）](inbound-exceptions/self-pickup-and-outbound-related-exceptions/exception-b06e1735-outbound-order-voided-after-packing-with-product-vas.md)
- [自提单取消出库（需要客户下入库单）](inbound-exceptions/self-pickup-and-outbound-related-exceptions/exception-b07e1339-self-pickup-order-cancelled-need-customer-inbound-order.md)
- [自提出库单分批提货](inbound-exceptions/self-pickup-and-outbound-related-exceptions/exception-b07e1616-self-pickup-outbound-order-batch-pickup.md)
- [其他入库异常](inbound-exceptions/other-inbound-exceptions/README.md)

### vasc-products/

- [VASC 产品知识](vasc-products/README.md)
- [上架处理类 VASC 产品](vasc-products/putaway-services/README.md)
- [原单上架](vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [新单上架（客户创建入库单）](vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [新单上架（WINIT创建入库单）](vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md)
- [新单上架（客户提供预报单）](vasc-products/putaway-services/vasc-product-new-order-putaway-customer-provided-forecast-order.md)
- [原单上架（直接上架）](vasc-products/putaway-services/vasc-product-original-order-direct-putaway.md)
- [新单上架（直接上架）](vasc-products/putaway-services/vasc-product-new-order-direct-putaway.md)
- [拍照与视频类 VASC 产品](vasc-products/photographing-and-video-services/README.md)
- [入库商品拍照](vasc-products/photographing-and-video-services/vasc-product-inbound-product-photo.md)
- [库内商品拍照](vasc-products/photographing-and-video-services/vasc-product-in-warehouse-product-photo.md)
- [入库非标拍照或提供视频](vasc-products/photographing-and-video-services/vasc-product-inbound-nonstandard-photo-or-video.md)
- [销毁类 VASC 产品](vasc-products/destruction-services/README.md)
- [上架前销毁](vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md)
- [库内销毁](vasc-products/destruction-services/vasc-product-in-warehouse-destruction.md)
- [自提类 VASC 产品](vasc-products/self-pickup-services/README.md)
- [上架前自提](vasc-products/self-pickup-services/vasc-product-pre-putaway-self-pickup.md)
- [贴标包装类 VASC 产品](vasc-products/labeling-and-packaging-services/README.md)
- [库内轻加工](vasc-products/labeling-and-packaging-services/vasc-product-in-warehouse-light-processing.md)
- [非标及其他类 VASC 产品](vasc-products/nonstandard-and-other-services/README.md)
- [入库非标增值（特批）](vasc-products/nonstandard-and-other-services/vasc-product-inbound-nonstandard-special-approval.md)
- [库内非标增值（免审核）](vasc-products/nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-no-review.md)
- [库内非标增值（需审核）](vasc-products/nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-review-required.md)
- [库内非标增值（特批）](vasc-products/nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-special-approval.md)
- [出库非标增值（特批）](vasc-products/nonstandard-and-other-services/vasc-product-outbound-nonstandard-special-approval.md)

### value-added-service-items/

- [增值服务项知识](value-added-service-items/README.md)
- [上架类增值服务项](value-added-service-items/putaway-items/README.md)
- [直接上架](value-added-service-items/putaway-items/value-added-service-item-direct-putaway.md)
- [入库-提供无箱单预报单上架](value-added-service-items/putaway-items/value-added-service-item-inbound-no-box-list-forecast-putaway.md)
- [错装商品直接上架](value-added-service-items/putaway-items/value-added-service-item-in-warehouse-mispacked-product-direct-putaway.md)
- [拍照暂存后上架](value-added-service-items/putaway-items/value-added-service-item-in-warehouse-putaway-after-photo-temporary-storage.md)
- [贴标换标类增值服务项](value-added-service-items/labeling-items/README.md)
- [入库-补贴包裹条码](value-added-service-items/labeling-items/value-added-service-item-inbound-package-barcode-labeling.md)
- [入库-更换新商品条码](value-added-service-items/labeling-items/value-added-service-item-inbound-new-product-barcode-labeling.md)
- [入库-补贴原商品条码](value-added-service-items/labeling-items/value-added-service-item-inbound-original-product-barcode-labeling.md)
- [入库-补贴原商品条码（带示例图）](value-added-service-items/labeling-items/value-added-service-item-inbound-original-product-barcode-labeling-with-sample-image.md)
- [入库-第三方商品条码关联](value-added-service-items/labeling-items/value-added-service-item-inbound-third-party-product-barcode-association.md)
- [入库-覆盖包裹标签](value-added-service-items/labeling-items/value-added-service-item-inbound-cover-package-label.md)
- [入库-商品其他标签（非商品条码）](value-added-service-items/labeling-items/value-added-service-item-inbound-product-other-label-non-barcode.md)
- [库内-补贴原商品条码](value-added-service-items/labeling-items/value-added-service-item-in-warehouse-original-product-barcode-labeling.md)
- [库内-更换新商品条码](value-added-service-items/labeling-items/value-added-service-item-in-warehouse-new-product-barcode-labeling.md)
- [库内-商品其他标签（非商品条码）](value-added-service-items/labeling-items/value-added-service-item-in-warehouse-product-other-label-non-barcode.md)
- [库内-清除商品标签](value-added-service-items/labeling-items/value-added-service-item-in-warehouse-clear-product-label.md)
- [包装处理类增值服务项](value-added-service-items/packaging-items/README.md)
- [入库-更换商品包装](value-added-service-items/packaging-items/value-added-service-item-inbound-replace-product-packaging.md)
- [库内-更换商品包装](value-added-service-items/packaging-items/value-added-service-item-in-warehouse-replace-product-packaging.md)
- [柔性打包装箱/装袋测量尺重](value-added-service-items/packaging-items/value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md)
- [代采购包材物料](value-added-service-items/packaging-items/value-added-service-item-in-warehouse-procure-packaging-materials.md)
- [拍照视频类增值服务项](value-added-service-items/photographing-and-video-items/README.md)
- [入库-商品开箱拍照](value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-product-unboxing-photo.md)
- [提供海外仓监控视频-少包裹调查](value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md)
- [提供海外仓监控视频-少单品调查](value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md)
- [入库-单品指定位置开箱拍照](value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md)
- [入库-异常包裹开箱拍照](value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-exception-package-unboxing-photo.md)
- [库内-商品外观拍照](value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-appearance-photo.md)
- [库内-商品开箱拍照](value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-unboxing-photo.md)
- [单品指定位置开箱拍照](value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md)
- [库内商品拍摄视频](value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-video-shooting.md)
- [退货商品补拍细节照](value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-return-product-detail-reshoot-photo.md)
- [销毁类增值服务项](value-added-service-items/destruction-items/README.md)
- [上架前包裹销毁](value-added-service-items/destruction-items/value-added-service-item-pre-putaway-package-destruction.md)
- [上架前商品销毁](value-added-service-items/destruction-items/value-added-service-item-pre-putaway-product-destruction.md)
- [辨识单品配件后销毁](value-added-service-items/destruction-items/value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md)
- [DG商品销毁](value-added-service-items/destruction-items/value-added-service-item-in-warehouse-dg-product-destruction.md)
- [库内-异常商品销毁](value-added-service-items/destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md)
- [自提类增值服务项](value-added-service-items/self-pickup-items/README.md)
- [上架前自提（无需WINIT打托）](value-added-service-items/self-pickup-items/value-added-service-item-pre-putaway-self-pickup-without-winit-palletizing.md)
- [上架前自提（需WINIT打托）](value-added-service-items/self-pickup-items/value-added-service-item-pre-putaway-self-pickup-with-winit-palletizing.md)
- [调拨与货权类增值服务项](value-added-service-items/transfer-and-ownership-items/README.md)
- [包裹串仓异常调拨](value-added-service-items/transfer-and-ownership-items/value-added-service-item-inbound-cross-warehouse-package-transfer.md)
- [货权转移（换标模式）](value-added-service-items/transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md)
- [货权转移（改数模式）](value-added-service-items/transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md)
- [商品处理类增值服务项](value-added-service-items/product-processing-items/README.md)
- [库内-商品拆分](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-product-splitting.md)
- [库内-商品组合](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-product-combination.md)
- [单品拆分后上架（拆分为一个SKU）](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-one-sku.md)
- [单品拆分后上架（拆分为多个SKU）](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-multiple-skus.md)
- [单品辨识（不开箱）](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-identification-without-unboxing.md)
- [辨识单品配件后更换](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-replace-identified-single-item-accessory.md)
- [测量商品内部配件尺重](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-measure-internal-accessory-dimensions-weight.md)
- [检查商品尺重（退货商品）](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-return-product-dimensions-weight-check.md)
- [指定商品盘点](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-specified-product-inventory-count.md)
- [审计盘点](value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-audit-inventory-count.md)
- [其他服务需求类增值服务项](value-added-service-items/other-service-demand-items/README.md)
- [入库其他服务需求](value-added-service-items/other-service-demand-items/value-added-service-item-inbound-other-service-demand.md)
- [库内其他服务需求](value-added-service-items/other-service-demand-items/value-added-service-item-in-warehouse-other-service-demand.md)
- [出库其他服务需求](value-added-service-items/other-service-demand-items/value-added-service-item-outbound-other-service-demand.md)

### relationship-mappings/

- [关系映射](relationship-mappings/README.md)
- [入库异常到 VASC 产品映射](relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](relationship-mappings/service-item-config-field-evidence-coverage.md)

### glossary/

- [术语与编码字典](glossary/README.md)

## 来源参考

### interface-verification-temp/

- [接口验证临时目录](interface-verification-temp/README.md)
- 用途：临时存放 `.env`、接口响应和差异输出；不作为正式业务来源，确认后再沉淀到 `source-references/`。

### source-references/

- [来源参考总览](source-references/README.md)
- [数据源台账](source-references/data-source-registry.md)
- [数据源审计与更新规划](source-references/data-source-audit-and-update-plan.md)

### source-references/interface-documents/

- [接口来源参考目录](source-references/interface-documents/README.md)
- 异常单查询与详情接口：`oms-unusual-event-order-*`
- VASC 产品与规则接口：`pms-vasc-*`
- 规划事件接口：`pms-plan-event-service-query-plan-event-page-api.md`
- 增值服务项属性配置接口：`pms-base-attr-rel-service-find-base-attr-rel-page-api.md`
- 收入费用项接口：`pms-revenue-event-charge-item-service-find-charge-item-page-api.md`
- 增值单与服务项接口：`wh-va-order-*`

### source-references/exception-vas-data-package/

- [异常与 VASC 数据证据包](source-references/exception-vas-data-package/README.md)
- 原始快照：`data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json`
- 静态来源快照：`source-snapshots/plan-event-standard-exception.json`、`source-snapshots/plan-event-vas.json`、`source-snapshots/vasc-master.json`、`source-snapshots/vas-event-attrs-slim.json`
- 规范化数据：`data/normalized/exception-vasc-orchestration-2026-06-22.json`
- 覆盖率报告：`data/reports/coverage-summary-2026-06-22.md`
- 字段覆盖明细：`data/reports/atom-attr-coverage-2026-06-22.csv`
- 来源规则：`sources/source-priority.md`、`sources/field-origin-map.md`、`sources/data-coverage.md`

### source-references/kb-business-source-snapshots/

- [KB 业务知识来源快照](source-references/kb-business-source-snapshots/README.md)
- 入库产品、规则和异常总览：`inbound-product-details.md`、`inbound-faq.md`、`inbound-rules.md`、`inbound-exception-handling.md`、`a-plus-parcel-no-barcode-inbound-solution.md`
- 增值服务和非标来源：`vas-product-details.md`、`vas-exception-solution-catalog.md`、`vas-exception-handling.md`、`vas-monitoring.md`、`nonstandard-vas-application-process.md`、`nonstandard-vas-rejection-scenarios.md`
- 直发、串仓、无主货、卸货和少件调查：`direct-ship-parcel-sop.md`、`direct-ship-order-overseas-warehouse.md`、`direct-ship-exception-parcel-vas.md`、`direct-ship-parcel-winit.md`、`putaway-unit-sop.md`、`putaway-parcel-unit.md`、`putaway-parcel-unit-sop.md`、`overseas-warehouse-inbound-unloading-exception.md`、`customer-direct-ship-inbound.md`
- 异常处理专项 SOP：`customer-putaway-exception-sop.md`、`parcel-barcode-exception-subsidy-putaway.md`、`parcel-order-product-putaway.md`、`product-barcode-third-party-putaway.md`、`inbound-exception-putaway-destroy.md`、`inbound-exception-putaway-self-pickup.md`、`inbound-exception-photo-vas.md`、`exception-inbound.md`、`inbound-vas.md`、`no-box-list-forecast-faq.md`
- 入库单作废、终止和查询：`void-standard-inbound-order-sop.md`、`void-inbound-sop.md`、`inbound-void-sop.md`、`query-inbound.md`、`winit-unit-barcode.md`

## 当前根目录规划结论

- 所有目录名和文件名必须使用英文，并尽量具体。
- 本知识库主要服务 AI 检索和回答生成。
- 不设固定推理顺序，AI 可以从异常、VASC 产品、增值服务项、字段、流程或术语任意入口开始。
- 正式来源、索引和 `source_refs` 只能引用 `value-add-service-guide/` 内文件；目录外资料可以阅读参考，但必须先沉淀到项目内再作为来源标记。
- 关系映射表将作为适用性和选择逻辑的权威来源；当前已生成异常到 VASC、VASC 到增值服务项编排、增值服务项字段证据覆盖三份映射。
- 实体详情页用于解释定义、限制、字段和来源说明。
- 接口来源参考用于确认系统字段、编码、状态、查询链路和可校验数据来源，不直接作为业务适用性结论。
- 数据证据包用于支撑后续映射表和实体页生成；raw 保留证据，normalized 支撑映射，reports 标注覆盖率和缺口。
- 每个业务目录都必须保留 `README.md`，后续新增、移动、删除文件时由 AI 按维护闭环规则同步更新目录 README、根索引和日志。
