---
title: 库内商品拍照
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, in-warehouse, photograph, standard-vasc, active-vasc]
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
vasc_product_code: VASC202407031511413
vasc_product_name: 库内商品拍照
vasc_product_type: standard
vasc_submission_entry: unknown
vasc_handling_method: photograph_then_hold
vasc_active_status: active
related_pscg: OSF632 库内增值
---

# 库内商品拍照

## 摘要

`库内商品拍照` 是库内增值环节的标准 VASC 产品，用于客户需要仓库对在库商品拍照确认的场景。normalized 数据显示，本产品编排两个原子：`库内-商品外观拍照` 和 `库内-商品开箱拍照`。

本产品通常用于获取商品状态、包装状态、条码状态或异常实物证据。拍照本身通常不是异常最终处理动作，后续可能还需要客户选择上架、销毁、换标、包装或其他增值。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202407031511413` |
| VASC 产品名称 | 库内商品拍照 |
| PSCG | `OSF632` 库内增值 |
| 启用状态 | active |
| 产品类型 | 标准增值 |
| 提交主体 | 客户 |
| 执行主体 | 仓库 |
| 处理方式 | 拍照后反馈/暂存 |
| 是否支持无业务单据 | 否 |
| 来源列表线索 | `STOCK_SHELVES`、`STORAGE` |

## 适用判断

选择本产品前，AI 需要确认：

1. 需求发生在库内或库内异常链路，不是入库上架前拍照。
2. 客户需要照片确认，而不是直接处理货物。
3. 需要判断拍摄范围：只拍商品外观，还是需要开箱拍照。
4. 两个原子同属 `拍照` 互斥组，不能机械同时选择。
5. 字段证据缺失，不能在产品页生成拍照字段、图片数量或附件模板。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 只需确认商品外观 | 库内-商品外观拍照 | 商品留在库内库位或暂存位置，完成外观拍照后等待后续指令 | 增值单反馈外观照片；异常或需求是否闭环取决于客户后续处理 | 通常非终态。 |
| 需要开箱确认内部商品 | 库内-商品开箱拍照 | 商品开箱拍照后仍留在库内，等待客户后续处理 | 增值单反馈开箱照片；后续可能转换标、包装、销毁等处理 | 通常非终态。 |
| 客户已有明确处理动作 | 不应只停留拍照 | 实物应进入对应处理链路 | 信息流应改选轻加工、销毁、非标或其他产品 | 非本产品闭环。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 库内商品拍照` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E08` | 商品包装异常 | `IN_WAREHOUSE` |
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

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OSF6V1569` | 库内-商品外观拍照 | N | 拍照 | missing_field_evidence |
| 2 | `OSF6V1570` | 库内-商品开箱拍照 | N | 拍照 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 证据状态 |
|---|---|---|
| 库内-商品外观拍照 | 只需要确认商品外包装、外观、标签或外部异常状态。 | normalized 和原子页有证据；字段配置缺失。 |
| 库内-商品开箱拍照 | 需要打开包装确认内部商品、配件、条码或内部状态。 | normalized 和原子页有证据；字段配置缺失。 |

## 证据边界

- 本页不生成拍照字段、照片数量、拍摄角度、附件格式和费用。
- 拍照只是信息获取动作，是否异常闭环取决于客户后续选择。
- 若业务快照备注某异常“实际不支持库内商品拍照”，AI 回答时必须优先保留该限制。

## 相关链接

- [库内-商品外观拍照](../../value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-appearance-photo.md)
- [库内-商品开箱拍照](../../value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
