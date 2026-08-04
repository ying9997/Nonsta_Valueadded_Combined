---
title: 库内轻加工
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, in-warehouse, relabel, repack, standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/vas-monitoring.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202407031456553
vasc_product_name: 库内轻加工
vasc_product_type: standard
vasc_submission_entry: inbound_order
vasc_handling_method: unknown
vasc_active_status: active
related_pscg: OSF632 库内增值
---

# 库内轻加工

## 摘要

`库内轻加工` 是 `OSF632` 库内增值下的 active 标准 VASC 产品，用于在库商品的包装处理、贴标/换标、错装直接上架、拍照暂存后上架、商品拆分和商品组合等轻加工动作。

本产品不是入库上架前的 `OW01` 上架处理产品。AI 推荐前必须确认实物已经处于库内/在库异常或库存处理链路，并按客户处理意图动态选择原子，不能把 8 个原子机械打包推荐。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202407031456553` |
| VASC 产品名称 | 库内轻加工 |
| PSCG | `OSF632` 库内增值 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 库内包装、贴标、补标、拆分、组合或后续上架等综合轻加工 |
| 是否支持无业务单据 | 否 |
| 关联 PSC 线索 | `OSF632008095` |
| 来源列表线索 | `STOCK_SHELVES` |

## 适用判断

选择本产品前，AI 需要确认：

1. 货物处于库内/在库异常或库存处理链路，不是入库上架前异常。
2. 客户需要的是轻加工处理，而不是单纯拍照、销毁、自提或非标审批类其他服务。
3. 客户意图属于包装、贴标/换标、补标、错装直接上架、拍照后上架、拆分或组合中的一种或少数组合。
4. `贴标/换标` 互斥组内的 `库内-更换新商品条码`、`库内-补贴原商品条码`、`错装商品直接上架` 不能无条件同时选择。
5. 所有 8 个原子当前字段证据均缺失，不能在产品页定版字段、附件模板、标签文件格式或库存调整单字段。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 更换或加固包装 | 库内-更换商品包装 | 在库商品完成包装处理后继续进入可上架/可销售/待后续处理状态，尺寸变化时可能需要新 SKU 承接 | 增值单反馈包装处理完成；若涉及新 SKU，应同步维护商品/库存信息 | 取决于是否还需换标或其他处理。 |
| 补贴原商品条码 | 库内-补贴原商品条码 | 商品贴回原商品标签后留在库内并进入后续上架或库存处理 | 信息流保留原 SKU 方向，增值单记录补标完成 | 可能闭环条码类异常。 |
| 更换新商品条码 | 库内-更换新商品条码 | 商品覆盖为新 SKU 标签后按新 SKU 方向继续库内处理 | 信息流需要承接新 SKU/新标签关系 | 可能闭环换标类异常。 |
| 错装商品直接上架 | 错装商品直接上架 | 错装商品按客户确认的实物条码方向直接上架 | 增值单记录直接上架结果；原异常是否闭环取决于系统状态更新 | 可能闭环错装处理。 |
| 非商品条码贴标 | 库内-商品其他标签（非商品条码） | 商品补贴英代、欧代、尺寸、环保、产地或说明等标签后回到库内可处理状态 | 增值单记录附加标签处理结果 | 取决于后续是否仍有异常。 |
| 拍照后无需其他增值 | 拍照暂存后上架 | 已拍照暂存商品清除辨识码后直接上架 | 增值单从拍照后暂存转向上架完成 | 通常用于拍照后的后续闭环。 |
| 商品拆分 | 库内-商品拆分 | 一个在库单品拆分为多个 SKU，按新 SKU 上架，原商品做 `L007` 盘亏 | 信息流生成新 SKU 库存方向，并记录原商品盘亏 | 取决于拆分和新 SKU 信息是否完整。 |
| 商品组合 | 库内-商品组合 | 多个 SKU 组合为 1 个新 SKU 后上架，原商品做 `L007` 盘亏 | 信息流承接组合关系、新 SKU 和原商品盘亏；箱/套产品需额外库存调整单 | 取决于组合关系和库存形态。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 库内轻加工` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E08` | 商品包装异常 | `IN_WAREHOUSE` |
| `B05E012` | 单品外包装破损 | `IN_WAREHOUSE` |
| `B05E013` | 包裹内商品错装 | `IN_WAREHOUSE` |
| `B05E014` | 单品质量异常 | `IN_WAREHOUSE` |
| `B05E1382` | 库存批次号错误 | `IN_WAREHOUSE` |
| `B05E1383` | 计划外批次 | `IN_WAREHOUSE` |
| `B05E1586` | 单品条码无法扫描(需客户处理） | `IN_WAREHOUSE` |
| `B06E1369` | 2B箱内商品条码异常 | `IN_WAREHOUSE` |
| `B06E1370` | 2B箱内多单品 | `IN_WAREHOUSE` |
| `B06E1371` | 2B箱内少单品 | `IN_WAREHOUSE` |
| `B06E1613` | A+包裹条码无法扫描 | `IN_WAREHOUSE` |
| `B06E1628` | DG商品包装不符合标准 | `IN_WAREHOUSE` |
| `B12E1784` | SN码缺失无法采集 | `OUT_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OSF6V1566` | 库内-更换商品包装 | N | 库内-更换商品包装 | missing_field_evidence |
| 2 | `OSF6V1565` | 库内-更换新商品条码 | N | 贴标/换标 | missing_field_evidence |
| 3 | `OSF6V1564` | 库内-补贴原商品条码 | N | 贴标/换标 | missing_field_evidence |
| 4 | `OSF6V1681` | 错装商品直接上架 | N | 贴标/换标 | missing_field_evidence |
| 5 | `OSF6V1574` | 库内-商品其他标签（非商品条码） | N | 库内-商品附加标签 | missing_field_evidence |
| 6 | `OSF6V1591` | 拍照暂存后上架 | N | 拍照暂存后上架 | missing_field_evidence |
| 7 | `OSF6V1576` | 库内-商品拆分 | N | 无 | missing_field_evidence |
| 8 | `OSF6V1804` | 库内-商品组合 | N | 无 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 不应选择的场景 | 证据状态 |
|---|---|---|---|
| 库内-更换商品包装 | 在库商品包装异常、破损、受潮、未封口、DG 包装不符合标准，客户需要增加、更换或加固包装。 | 入库上架前包装处理；客户仅需拍照或销毁。 | normalized、原子页和业务快照有证据；字段配置缺失。 |
| 库内-更换新商品条码 | 在库商品需要覆盖为新 SKU 标签，或错装/条码异常后客户确认换成新商品条码。 | 只补原标签；商品不在库内链路。 | normalized 和原子页有证据；字段配置缺失。 |
| 库内-补贴原商品条码 | 商品标签缺失/损坏但仍按原 SKU 处理，客户需要补贴原商品标签。 | 要更换为新 SKU；要贴非商品条码标签。 | normalized 和原子页有证据；字段配置缺失。 |
| 错装商品直接上架 | 包裹内商品错装，客户确认按实物条码方向直接上架。 | 客户要求换标后上架；入库 `OW01` 直接上架。 | 证据较薄，原子页置信度 low；字段配置缺失。 |
| 库内-商品其他标签（非商品条码） | 在库商品需贴英代、欧代、尺寸、环保、产地、使用说明等非商品条码标签。 | 商品条码/SKU 标签/FNSKU 等商品识别标签。 | normalized 和原子页有证据；字段配置缺失。 |
| 拍照暂存后上架 | 库内拍照增值已完成，客户确认无需其他处理，要求直接上架。 | 客户还需要换标、包装、拆分、组合；客户需要先拍照。 | normalized 和原子页有证据；字段配置缺失。 |
| 库内-商品拆分 | 在库一个单品需要拆分为多个 SKU，拆分后贴新 SKU 并上架。 | 多个 SKU 组合为一个 SKU；非标拆分后上架特殊流程。 | normalized 和原子页有证据；字段配置缺失。 |
| 库内-商品组合 | 在库多个 SKU 需要组合为 1 个新 SKU 上架售卖。 | 一个单品拆分为多个 SKU；箱/套产品未同步库存调整要求。 | normalized 和原子页有证据；字段配置缺失。 |

## 证据边界

- 本页不定版任何原子字段、附件模板、标签文件格式、包材规格、SKU 注册字段、库存调整单字段、费用金额和国家仓库差异。
- normalized 将 `B12E1784` 标为 `OUT_BOUND` 节点并关联本产品；AI 回答入库/库内异常时应标注该节点差异，不要强行改写为入库异常。
- `库内轻加工` 是库内 `OSF632` 产品，不得与入库 `OW01` 原单上架、新单上架、直接上架下的同名或相近原子混用。
- 业务快照对部分异常有备注限制，例如箱/套产品、A+ 包裹、库内商品拍照支持性等，AI 推荐时需回查异常页和映射表，而不是只看产品名称。

## 相关链接

- [库内-更换商品包装](../../value-added-service-items/packaging-items/value-added-service-item-in-warehouse-replace-product-packaging.md)
- [库内-更换新商品条码](../../value-added-service-items/labeling-items/value-added-service-item-in-warehouse-new-product-barcode-labeling.md)
- [库内-补贴原商品条码](../../value-added-service-items/labeling-items/value-added-service-item-in-warehouse-original-product-barcode-labeling.md)
- [错装商品直接上架](../../value-added-service-items/putaway-items/value-added-service-item-in-warehouse-mispacked-product-direct-putaway.md)
- [库内-商品其他标签（非商品条码）](../../value-added-service-items/labeling-items/value-added-service-item-in-warehouse-product-other-label-non-barcode.md)
- [拍照暂存后上架](../../value-added-service-items/putaway-items/value-added-service-item-in-warehouse-putaway-after-photo-temporary-storage.md)
- [库内-商品拆分](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-product-splitting.md)
- [库内-商品组合](../../value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-product-combination.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
