---
title: 入库异常知识
type: reference
entity_type: overview
tags: [inbound, exception, overview]
source_refs: ["source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json"]
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
---

# 入库异常知识

本目录按异常类型沉淀入库异常知识。异常页只解释异常本身、客户处理方向和可选 VASC 产品索引；VASC 产品的详细解释放入 `vasc-products/`。

## 分类口径

分类依据当前 normalized 数据中的异常名称、异常节点、异常对象和可关联 VASC。后续新增异常时，AI 必须按相同口径归类，并同步维护关系映射。

## 子目录

- `order-status-exceptions/`：入库单、出库单或业务单据状态导致的异常。
- `package-barcode-exceptions/`：包裹条码、子包裹条码、包裹条码批量异常。
- `product-barcode-exceptions/`：商品条码、单品条码、第三方条码识别或关联异常。
- `quantity-difference-exceptions/`：多货、少货、验货数量差异。
- `quality-and-packaging-exceptions/`：质量异常、包装异常、商品裸装、包装破损。
- `wrong-item-and-mispack-exceptions/`：错装、订单外商品、商品与包裹关系不一致。
- `batch-sn-and-attribute-exceptions/`：批次、SN、属性或采集信息缺失。
- `warehouse-mismatch-exceptions/`：串仓、错仓或仓库不匹配。
- `self-pickup-and-outbound-related-exceptions/`：与自提、取消出库、出库相关但被入库异常增值链路引用的异常。
- `other-inbound-exceptions/`：暂未归入以上类型的入库异常。

## 当前已生成实体页

- [入库单状态异常](order-status-exceptions/exception-b01e01-inbound-order-status-abnormal.md)
- [客户直发包裹串仓](warehouse-mismatch-exceptions/exception-b01e49-customer-direct-ship-package-wrong-warehouse.md)
- [包裹内出现订单外商品](wrong-item-and-mispack-exceptions/exception-b03e03-out-of-order-product-in-package.md)
- [订单状态被终止无法上架](order-status-exceptions/exception-b01e1470-order-terminated-unable-to-putaway.md)
- [订单状态已上架需拦截](order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md)
- [ABC类包裹或子包裹内商品错装暂存](wrong-item-and-mispack-exceptions/exception-b01e1516-abc-package-subpackage-product-mispacked-temporary-storage.md)
- [到仓包裹商品数量大于验货数量](quantity-difference-exceptions/exception-b01e1517-arrived-package-product-quantity-greater-than-inspection-quantity.md)
- [A+包商品条码和包裹条码对应关系校验不一致](package-barcode-exceptions/exception-b01e1579-a-plus-product-barcode-package-barcode-mismatch.md)
- [包裹条码批量异常（需客户处理）](package-barcode-exceptions/exception-b01e1615-package-barcode-batch-abnormal-customer-action-required.md)
- [单品条码无法扫描（需客户处理）](product-barcode-exceptions/exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md)
- [2B箱内商品条码异常](product-barcode-exceptions/exception-b06e1369-2b-box-product-barcode-abnormal.md)
- [A+包裹条码无法扫描](package-barcode-exceptions/exception-b06e1613-a-plus-package-barcode-unscannable.md)
- [商品包装异常](quality-and-packaging-exceptions/exception-b0102e08-product-packaging-abnormal.md)
- [A+包裹质量异常](quality-and-packaging-exceptions/exception-b0102e23-a-plus-package-quality-abnormal.md)
- [商品裸装](quality-and-packaging-exceptions/exception-b0102e27-product-without-logistics-packaging.md)
- [商品质量异常（影响销售）](quality-and-packaging-exceptions/exception-b01e1314-product-quality-abnormal-affects-sales.md)
- [A+包裹或箱产品无批次信息或批次信息不全](batch-sn-and-attribute-exceptions/exception-b01e1378-a-plus-package-box-product-batch-info-missing-or-incomplete.md)
- [商品实物无批次信息或批次信息不全](batch-sn-and-attribute-exceptions/exception-b01e1381-product-physical-batch-info-missing-or-incomplete.md)
- [单品外包装破损](quality-and-packaging-exceptions/exception-b05e012-single-item-outer-packaging-damaged.md)
- [包裹内商品错装](wrong-item-and-mispack-exceptions/exception-b05e013-product-mispacked-in-package.md)
- [单品质量异常](quality-and-packaging-exceptions/exception-b05e014-single-item-quality-abnormal.md)
- [库存批次号错误](batch-sn-and-attribute-exceptions/exception-b05e1382-inventory-batch-number-wrong.md)
- [计划外批次](batch-sn-and-attribute-exceptions/exception-b05e1383-unplanned-batch.md)
- [2B箱内多单品](quantity-difference-exceptions/exception-b06e1370-2b-box-extra-single-items.md)
- [2B箱内少单品](quantity-difference-exceptions/exception-b06e1371-2b-box-missing-single-items.md)
- [DG商品包装不符合标准](quality-and-packaging-exceptions/exception-b06e1628-dg-product-packaging-noncompliant.md)
- [打包完成后作废出库单（有商品增值）](self-pickup-and-outbound-related-exceptions/exception-b06e1735-outbound-order-voided-after-packing-with-product-vas.md)
- [自提单取消出库（需要客户下入库单）](self-pickup-and-outbound-related-exceptions/exception-b07e1339-self-pickup-order-cancelled-need-customer-inbound-order.md)
- [自提出库单分批提货](self-pickup-and-outbound-related-exceptions/exception-b07e1616-self-pickup-outbound-order-batch-pickup.md)
- [库内商品包装破损](quality-and-packaging-exceptions/exception-b0809e03-in-warehouse-product-packaging-damaged.md)
- [库内单品条码异常（人工不可识别）](product-barcode-exceptions/exception-b0809e05-in-warehouse-single-item-barcode-abnormal-manually-unrecognizable.md)
- [SN码缺失无法采集](batch-sn-and-attribute-exceptions/exception-b12e1784-sn-code-missing-unable-to-collect.md)
- [商品条码异常（需客户处理）](product-barcode-exceptions/exception-b01e1315-product-barcode-abnormal-customer-action-required.md)
- [商品有条码但系统无法识别](product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md)
- [包裹条码异常（需客户处理）](package-barcode-exceptions/exception-b0102e21-package-barcode-abnormal-customer-action-required.md)

## 维护边界

- 异常页只做异常解释、客户处理方向和 VASC 索引。
- 异常页需要记录“异常发生时的实物流与信息流状态”，但只写本异常的状态摘要；完整流程仍链接到 `../inbound-exception-value-added-process/`。
- VASC 产品和增值服务项细节不得在异常页内展开成完整产品说明。
- 字段、模板、附件和费用要求必须等待对应服务项页或字段证据补齐。
