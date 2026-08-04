---
title: 入库异常到 VASC 产品映射
type: mapping
entity_type: relationship_mapping
tags: [inbound, exception, value-added-service, vasc-product, relationship-mapping, normalized-data]
source_refs: ["source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json"]
updated: 2026-06-23
confidence: high
fidelity: summary
status: draft
---

# 入库异常到 VASC 产品映射

本文件由 normalized 数据抽取，用于记录入库异常与 VASC 产品之间的已知关联。

## 口径

- 一行表示一个 `exception_code -> vasc_product_code` 关系。
- 已按 `exception_code + vasc_product_code` 去重；`raw_ref_count` 记录 normalized 数据中该关系出现次数。
- 本映射只能说明 normalized 数据中存在该异常与 VASC 的关联，不能单独解释客户为什么要选该 VASC。
- normalized 数据未提供独立的客户处理动作字段，因此客户动作映射暂不在本文件中推断。

## 覆盖统计

- VASC 产品数：18
- 唯一异常编码数：35
- 去重后的异常到 VASC 关系数：168

## 映射表

| exception_code | exception_name | exception_node | sg_code | vasc_product_code | vasc_product_name | vasc_pscg | vasc_active_status | raw_ref_count | source_refs |
|---|---|---|---|---|---|---|---|---:|---|
| B0102E08 | 商品包装异常 | IN_WAREHOUSE | B04,B05,B06 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E08 | 商品包装异常 | IN_WAREHOUSE | B04,B05,B06 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E08 | 商品包装异常 | IN_WAREHOUSE | B04,B05,B06 | VASC202411192229072 | 库内非标增值（免审核） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E08 | 商品包装异常 | IN_WAREHOUSE | B04,B05,B06 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E08 | 商品包装异常 | IN_WAREHOUSE | B04,B05,B06 | VASC202412111836315 | 库内非标增值（需审核） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E08 | 商品包装异常 | IN_WAREHOUSE | B04,B05,B06 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E21 | 包裹条码异常(需客户处理) | IN_BOUND | B01 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E21 | 包裹条码异常(需客户处理) | IN_BOUND | B01 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E21 | 包裹条码异常(需客户处理) | IN_BOUND | B01 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E21 | 包裹条码异常(需客户处理) | IN_BOUND | B01 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E21 | 包裹条码异常(需客户处理) | IN_BOUND | B01 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E21 | 包裹条码异常(需客户处理) | IN_BOUND | B01 | VASC202411271721537 | 入库非标拍照或提供视频 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E21 | 包裹条码异常(需客户处理) | IN_BOUND | B01 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202504251617529 | 原单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E23 | A+包裹质量异常 | IN_BOUND | B01,B04 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E27 | 商品裸装 | IN_BOUND | B01,B04 | VASC202407012141008 | 新单上架（WINIT创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E27 | 商品裸装 | IN_BOUND | B01,B04 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E27 | 商品裸装 | IN_BOUND | B01,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E27 | 商品裸装 | IN_BOUND | B01,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E27 | 商品裸装 | IN_BOUND | B01,B04 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E27 | 商品裸装 | IN_BOUND | B01,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0102E27 | 商品裸装 | IN_BOUND | B01,B04 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E01 | 入库单状态异常 | IN_BOUND | B01 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 2 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E01 | 入库单状态异常 | IN_BOUND | B01 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 2 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E01 | 入库单状态异常 | IN_BOUND | B01 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 2 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E01 | 入库单状态异常 | IN_BOUND | B01 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 2 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E01 | 入库单状态异常 | IN_BOUND | B01 | VASC202411271721537 | 入库非标拍照或提供视频 | OW01 海外仓入库 | active | 2 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E01 | 入库单状态异常 | IN_BOUND | B01 | VASC202504251617529 | 原单上架（直接上架） | OW01 海外仓入库 | active | 2 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E01 | 入库单状态异常 | IN_BOUND | B01 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 2 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202407012141008 | 新单上架（WINIT创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202504251617529 | 原单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1314 | 商品质量异常(影响销售) | IN_BOUND | B01,B04 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202407012141008 | 新单上架（WINIT创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1315 | 商品条码异常(需客户处理) | IN_BOUND | B01,B04 | VASC202412111831129 | 新单上架（客户提供预报单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202407012141008 | 新单上架（WINIT创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1316 | 商品有条码但系统无法识别 | IN_BOUND | B01,B04 | VASC202412111831129 | 新单上架（客户提供预报单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1378 | A+包裹/箱产品无批次信息或批次信息不全 | IN_BOUND | B01,B02,B04 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1378 | A+包裹/箱产品无批次信息或批次信息不全 | IN_BOUND | B01,B02,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1378 | A+包裹/箱产品无批次信息或批次信息不全 | IN_BOUND | B01,B02,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1378 | A+包裹/箱产品无批次信息或批次信息不全 | IN_BOUND | B01,B02,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1381 | 商品实物无批次信息或批次信息不全 | IN_BOUND | B01,B02,B04,B05,B08 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1381 | 商品实物无批次信息或批次信息不全 | IN_BOUND | B01,B02,B04,B05,B08 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1470 | 订单状态被终止无法上架 | IN_BOUND | B01 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1470 | 订单状态被终止无法上架 | IN_BOUND | B01 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1470 | 订单状态被终止无法上架 | IN_BOUND | B01 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1470 | 订单状态被终止无法上架 | IN_BOUND | B01 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1470 | 订单状态被终止无法上架 | IN_BOUND | B01 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1514 | 订单状态已上架需拦截 | IN_BOUND | B01,B02,B03,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1514 | 订单状态已上架需拦截 | IN_BOUND | B01,B02,B03,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1514 | 订单状态已上架需拦截 | IN_BOUND | B01,B02,B03,B04 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1514 | 订单状态已上架需拦截 | IN_BOUND | B01,B02,B03,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1514 | 订单状态已上架需拦截 | IN_BOUND | B01,B02,B03,B04 | VASC202411271721537 | 入库非标拍照或提供视频 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1514 | 订单状态已上架需拦截 | IN_BOUND | B01,B02,B03,B04 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1516 | ABC类包裹/子包裹内商品错装暂存（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1516 | ABC类包裹/子包裹内商品错装暂存（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1516 | ABC类包裹/子包裹内商品错装暂存（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1516 | ABC类包裹/子包裹内商品错装暂存（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1516 | ABC类包裹/子包裹内商品错装暂存（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202504251617529 | 原单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1516 | ABC类包裹/子包裹内商品错装暂存（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1517 | 到仓包裹商品数量大于验货数量（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1517 | 到仓包裹商品数量大于验货数量（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1517 | 到仓包裹商品数量大于验货数量（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1517 | 到仓包裹商品数量大于验货数量（需客户处理） | IN_BOUND | B01,B02,B03,B04 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1579 | A+包商品条码和包裹条码对应关系校验不一致 | IN_BOUND | B01 | VASC202407012141008 | 新单上架（WINIT创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1579 | A+包商品条码和包裹条码对应关系校验不一致 | IN_BOUND | B01 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1579 | A+包商品条码和包裹条码对应关系校验不一致 | IN_BOUND | B01 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1579 | A+包商品条码和包裹条码对应关系校验不一致 | IN_BOUND | B01 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1579 | A+包商品条码和包裹条码对应关系校验不一致 | IN_BOUND | B01 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1615 | 包裹条码批量异常（需客户处理） | IN_BOUND | B01 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1615 | 包裹条码批量异常（需客户处理） | IN_BOUND | B01 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1615 | 包裹条码批量异常（需客户处理） | IN_BOUND | B01 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1615 | 包裹条码批量异常（需客户处理） | IN_BOUND | B01 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1615 | 包裹条码批量异常（需客户处理） | IN_BOUND | B01 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1615 | 包裹条码批量异常（需客户处理） | IN_BOUND | B01 | VASC202411271721537 | 入库非标拍照或提供视频 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E1615 | 包裹条码批量异常（需客户处理） | IN_BOUND | B01 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E49 | 客户直发包裹串仓 | IN_BOUND | B01 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E49 | 客户直发包裹串仓 | IN_BOUND | B01 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E49 | 客户直发包裹串仓 | IN_BOUND | B01 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E49 | 客户直发包裹串仓 | IN_BOUND | B01 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E49 | 客户直发包裹串仓 | IN_BOUND | B01 | VASC202411271721537 | 入库非标拍照或提供视频 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E49 | 客户直发包裹串仓 | IN_BOUND | B01 | VASC202504251617529 | 原单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B01E49 | 客户直发包裹串仓 | IN_BOUND | B01 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202407012141008 | 新单上架（WINIT创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202407031503503 | 原单上架 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202407031507376 | 入库商品拍照 | OW01 海外仓入库 | inactive | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202407161056217 | 新单上架（客户创建入库单） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202409121753076 | 上架前销毁 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202411192240522 | 上架前自提 | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202411192246131 | 入库非标增值（特批） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B03E03 | 包裹内出现订单外商品 | IN_BOUND | B03 | VASC202505282347101 | 新单上架（直接上架） | OW01 海外仓入库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E012 | 单品外包装破损 | IN_WAREHOUSE | B05 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E012 | 单品外包装破损 | IN_WAREHOUSE | B05 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E012 | 单品外包装破损 | IN_WAREHOUSE | B05 | VASC202411192229072 | 库内非标增值（免审核） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E012 | 单品外包装破损 | IN_WAREHOUSE | B05 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E012 | 单品外包装破损 | IN_WAREHOUSE | B05 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E013 | 包裹内商品错装 | IN_WAREHOUSE | B05 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E013 | 包裹内商品错装 | IN_WAREHOUSE | B05 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E013 | 包裹内商品错装 | IN_WAREHOUSE | B05 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E013 | 包裹内商品错装 | IN_WAREHOUSE | B05 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E014 | 单品质量异常 | IN_WAREHOUSE | B05 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E014 | 单品质量异常 | IN_WAREHOUSE | B05 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E014 | 单品质量异常 | IN_WAREHOUSE | B05 | VASC202411192229072 | 库内非标增值（免审核） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E014 | 单品质量异常 | IN_WAREHOUSE | B05 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E014 | 单品质量异常 | IN_WAREHOUSE | B05 | VASC202412111836315 | 库内非标增值（需审核） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E014 | 单品质量异常 | IN_WAREHOUSE | B05 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1382 | 库存批次号错误 | IN_WAREHOUSE | B05,B06,B08 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1382 | 库存批次号错误 | IN_WAREHOUSE | B05,B06,B08 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1382 | 库存批次号错误 | IN_WAREHOUSE | B05,B06,B08 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1382 | 库存批次号错误 | IN_WAREHOUSE | B05,B06,B08 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1383 | 计划外批次 | IN_WAREHOUSE | B05,B06,B08 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1383 | 计划外批次 | IN_WAREHOUSE | B05,B06,B08 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1383 | 计划外批次 | IN_WAREHOUSE | B05,B06,B08 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1383 | 计划外批次 | IN_WAREHOUSE | B05,B06,B08 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1586 | 单品条码无法扫描(需客户处理） | IN_WAREHOUSE | B05 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1586 | 单品条码无法扫描(需客户处理） | IN_WAREHOUSE | B05 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1586 | 单品条码无法扫描(需客户处理） | IN_WAREHOUSE | B05 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B05E1586 | 单品条码无法扫描(需客户处理） | IN_WAREHOUSE | B05 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1369 | 2B箱内商品条码异常 | IN_WAREHOUSE | B06 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1369 | 2B箱内商品条码异常 | IN_WAREHOUSE | B06 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1369 | 2B箱内商品条码异常 | IN_WAREHOUSE | B06 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1369 | 2B箱内商品条码异常 | IN_WAREHOUSE | B06 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1370 | 2B箱内多单品 | IN_WAREHOUSE | B06 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1370 | 2B箱内多单品 | IN_WAREHOUSE | B06 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1370 | 2B箱内多单品 | IN_WAREHOUSE | B06 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1370 | 2B箱内多单品 | IN_WAREHOUSE | B06 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1371 | 2B箱内少单品 | IN_WAREHOUSE | B06 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1371 | 2B箱内少单品 | IN_WAREHOUSE | B06 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1371 | 2B箱内少单品 | IN_WAREHOUSE | B06 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1371 | 2B箱内少单品 | IN_WAREHOUSE | B06 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1613 | A+包裹条码无法扫描 | IN_WAREHOUSE | B06,B12 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1613 | A+包裹条码无法扫描 | IN_WAREHOUSE | B06,B12 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1613 | A+包裹条码无法扫描 | IN_WAREHOUSE | B06,B12 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1613 | A+包裹条码无法扫描 | IN_WAREHOUSE | B06,B12 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1628 | DG商品包装不符合标准 | IN_WAREHOUSE | B06 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1628 | DG商品包装不符合标准 | IN_WAREHOUSE | B06 | VASC202407031511413 | 库内商品拍照 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1628 | DG商品包装不符合标准 | IN_WAREHOUSE | B06 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1628 | DG商品包装不符合标准 | IN_WAREHOUSE | B06 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B06E1735 | 打包完成后作废出库单（有商品增值） | IN_WAREHOUSE | B06 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B07E1339 | 自提单取消出库（需要客户下入库单） | IN_WAREHOUSE | B07 | VASC202411192250069 | 库内非标增值（特批） | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B07E1616 | 自提出库单分批提货 | OUT_BOUND | B07 | VASC202411192253186 | 出库非标增值（特批） | OSF8 海外仓出库 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0809E03 | 库内商品包装破损 | IN_WAREHOUSE | B08 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B0809E05 | 库内单品条码异常--人工不可识别 | IN_WAREHOUSE | B08 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B12E1784 | SN码缺失无法采集 | OUT_BOUND | B12 | VASC202407031456553 | 库内轻加工 | OSF632 库内增值 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |
| B12E1784 | SN码缺失无法采集 | OUT_BOUND | B12 | VASC202504171850278 | 库内销毁 | OSF6 库内 | active | 1 | source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json |

