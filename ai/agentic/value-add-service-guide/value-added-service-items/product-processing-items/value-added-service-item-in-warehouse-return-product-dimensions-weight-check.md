---
title: 检查商品尺重（退货商品）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, in-warehouse, product-level, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/nonstandard-vas-application-process.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OSF6V1625
service_item_name: 检查商品尺重（退货商品）
service_item_aliases: [增值原子, 增值事件, 退货商品尺重复测, 检查商品尺重]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 检查商品尺重（退货商品）
charge_required: conditional
cost_generated: unknown
effective: unknown
field_evidence_status: missing
---

# 检查商品尺重（退货商品）

## 摘要

`检查商品尺重（退货商品）` 是库内非标增值（需审核）VASC 下的商品尺重复测原子，用于客户指定 SKU 和复测单品数量后，仓库随机抽取在库退货商品外包装进行尺寸重量测量并拍照，并根据测量结果更新系统商品尺重。

本原子与 `测量商品内部配件尺重` 不同：本页针对退货已上架商品的外包装尺重复测，且主数据明确会根据测量结果更新系统商品尺重。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OSF6V1625` |
| 服务项名称 | 检查商品尺重（退货商品） |
| PSCG | `OSF632` 库内增值 |
| 操作对象 | 商品 |
| 所属 VASC | `VASC202412111836315` 库内非标增值（需审核） |
| VASC 顺序 | 2 |
| 互斥组 | 检查商品尺重（退货商品） |
| 是否收费 | conditional，需审核报价后确认 |
| 是否产生成本 | unknown |
| 是否有效 | unknown |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

| 顺序 | 动作 |
|---:|---|
| 1 | 根据客户指定 SKU 和复测单品数量定位在库退货商品。 |
| 2 | 仓库随机抽取在库商品外包装进行尺寸重量测量。 |
| 3 | 对测量过程或结果拍照反馈。 |
| 4 | 根据测量结果更新系统商品尺重。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 退货已上架商品需要重新测量尺重 | 是 | 业务快照明确本服务仅针对退货已上架商品。 |
| 客户能指定 SKU 和复测单品数量 | 是 | normalized 主数据明确客户指定 SKU 及复测单品数量。 |
| 需要测量后更新系统商品尺重 | 是 | normalized 主数据明确根据测量结果更新系统商品尺重。 |
| 只测量内部配件尺重且不更新系统尺重 | 不应选 | 应查 `测量商品内部配件尺重`。 |
| 普通包材装箱测试 | 不应选 | 应查柔性打包装箱/装袋测量尺重。 |

## 配置字段

当前字段覆盖映射显示 `OSF6V1625` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的 SKU、复测数量、抽样规则、尺重字段、照片字段或更新系统尺重字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 需要复测的 SKU | 定位退货商品 | 主数据明确客户指定 SKU。 |
| 复测单品数量 | 仓库随机抽样 | 主数据明确客户指定复测单品数量。 |
| 退货商品范围 | 确认适用对象 | 业务快照限定退货已上架商品。 |
| 拍照或反馈要求 | 尺重测量结果反馈 | 主数据明确测量并拍照。 |
| 审核报价所需背景 | 需审核非标增值 | 非标流程要求需求清晰、可执行，并经过审核报价。 |

## 证据边界

- 本页不定版配置字段、抽样比例、尺重模板、照片数量、系统尺重字段、费用金额和仓库国家差异。
- 本原子所属 VASC 为需审核非标增值，不能绕过审核报价承诺可执行。
- 不得把退货商品尺重复测扩展为普通商品查验、配件测量或包材装箱测试。

## 相关链接

- [测量商品内部配件尺重](value-added-service-item-in-warehouse-measure-internal-accessory-dimensions-weight.md)
- [柔性打包装箱/装袋测量尺重](../packaging-items/value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
